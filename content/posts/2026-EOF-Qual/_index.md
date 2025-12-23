---
title: '2026 EOF Qual Writeup'
date: 2025-12-23
description: 'EOF，也是程式安全期末考'
layout: "single"
tags: ['writeup']
---

# 前言

今年的 AIS3 EOF Qual 被迫參加，因為剛好是程安期末考，就和室友 and 兩個臺大同學一起組隊參加了，這次解了三題 reverse 和最難的 Welcome，貢獻剛好 1/4 吧！

不知道怎麼搞的，以前明明怕 reverse 怕得要死，經過一學期的訓練，現在居然比較喜歡 reverse，看到 Web 反而避之唯恐不及

# bored

###### Flag: `EOF{ExP3d14i0N_33_15_4he_G0AT}`
###### Category: `rev`

## 題目說明

IoT 逆向，有提供目標機器是 Luminary Micro Stellaris LM3S6965EVB

題目提供兩個檔案，一個是數位訊號波形檔 `signal.vcd`，一個是韌體檔 `firmware.bin`

## 解題流程與思路

`signal.vcd` 應該會有隱藏資訊，我直接使用 [PulseView](https://sigrok.org/wiki/Downloads) 觀察，使用 UART decode 後可以看到 `"b4r3MEt41"` 字串

{{< figure
    src="bored-signal.png"
    alt="bored-signal"
    caption="`signal.vcd` 訊號檔使用 UART 解碼"
    >}}

接著我使用 QEMU 把韌體跑起來，它叫我輸入一個字串，很直覺就把剛剛的得到的字串輸進去，成功得到 flag

{{< figure
    src="bored-bin.png"
    alt="bored-bin"
    caption="`firmware.bin` 執行結果"
    >}}

# Structured - Small

###### Flag: `EOF{5TRuCTuR3D_r3V3R53_3ng1N3eR1Ng_906fac919504945f98}`
###### Category: `rev`

## 題目說明

題目提供一個 `.7z` 檔案，解壓縮後裡面有 11 個 ELF 執行檔 `small-flag_{0-10}`

## 解題流程與思路

用 IDA 開 `small-flag_0` 和 `small-flag_1` 就發現程式是 flag checker，只要把裡面比對的數值抓出來就可以拼湊出完整的 flag

這題最初解法確實是把 11 個檔案一個一個打開，組合後發現 flag 是 `TRuEOF{5CTuR3D_r3V3R53_3ng1N3eR1faNg_906c9195049\n}89f54`，這個結果滿怪的，因為 flag 格式是 `EOF{...}`，就算撇除 flag 前後還有一些字串沒被包到，中間有換行符也不太正常，因此又回去仔細看了每一個檔案，發現其中 `small-flag_4` 和 `small-flag_8` 有做 rotate，而 `small-flag_10` 有做 byteswap，不能直接把數值抓出來就拿來用，調整過後就成功解出 flag 了

### 解題腳本

```python
import subprocess
import struct
import re
import sys
import os

BASE_DIR = "."
FILE_PREFIX = "small-flag_"
TOTAL_FILES = 10

def ror64(val, r_bits):
    r_bits %= 64
    return ((val >> r_bits) | (val << (64 - r_bits))) & 0xFFFFFFFFFFFFFFFF

def rol64(val, r_bits):
    r_bits %= 64
    return ((val << r_bits) | (val >> (64 - r_bits))) & 0xFFFFFFFFFFFFFFFF

def bswap64(val):
    try:
        return struct.unpack("<Q", struct.pack(">Q", val & 0xFFFFFFFFFFFFFFFF))[0]
    except:
        return val

full_flag_bytes = b""

for index in range(TOTAL_FILES + 1):
    filename = os.path.join(BASE_DIR, f"{FILE_PREFIX}{index}")
    
    cmd = f"objdump -d {filename} | grep -A 1 'imm ='"
    
    try:
        output = subprocess.check_output(cmd, shell=True, text=True).strip()
        lines = output.splitlines()
        
        if len(lines) < 2:
            lines.append("NOP") 

    except subprocess.CalledProcessError:
        print(f"[-] Error or no match in {filename}")
        continue

    line1 = lines[0]
    match_imm = re.search(r'imm = (0x[0-9a-fA-F]+)', line1)
    
    if not match_imm:
        print(f"[-] Parse error (no imm) in {filename}")
        continue
        
    constant_val = int(match_imm.group(1), 16)
    
    line2 = lines[1]
    
    final_val = constant_val
    
    op_match = re.search(r'(rolq|rorq|bswapq|cmpq)', line2)
    
    if op_match:
        opcode = op_match.group(1)
        
        imm_operand_match = re.search(r'\$0x([0-9a-fA-F]+)', line2)
        shift_amount = int(imm_operand_match.group(1), 16) if imm_operand_match else 0
        
        if opcode == 'rolq':
            final_val = ror64(constant_val, shift_amount)
        elif opcode == 'rorq':
            final_val = rol64(constant_val, shift_amount)
        elif opcode == 'bswapq':
            final_val = bswap64(constant_val)
        elif opcode == 'cmpq':
            final_val = constant_val
    else:
        final_val = constant_val

    try:
        chunk = struct.pack('>Q', final_val).lstrip(b'\x00')
        full_flag_bytes += chunk
    except Exception as e:
        print(f"\n[Error @ index {index}]: {e}")

try:
    print(f"Flag: {full_flag_bytes.decode('utf-8')}")
except UnicodeDecodeError:
    print("[!] Decode Error (Outputting Hex):")
    print(full_flag_bytes.hex())
    print("\n[!] Raw Bytes (Python repr):")
    print(full_flag_bytes)
```

因為下一題 `Structured - Large` 再用手動看 flag 不可能做到，所以在解 `Structured - Large` 時我也把這題撰寫了一份腳本

腳本主要會去執行 `objdump` 指令萃取需要的資訊，包含要抓取的 flag 片段以及指令，因為這題只有 rotate 和 byteswap，且 flag 片段都有 `imm = ` 字串標注，所以很好解

{{< alert >}}
這份腳本跑在 Mac M4 上，每台電腦下 `objdump` 指令得到的結果不一樣，因此有可能沒辦法完美復現
{{< /alert >}}

執行方式：`python exploit.py`
執行結果如下圖

{{< figure
    src="structured-small-flag.png"
    alt="structured-small"
    caption="`exploit.py` 執行結果"
    >}}

# Structured - Large

###### Flag: `EOF{w31l_d0N3_b0t}`
###### Category: `rev`

## 題目說明

題目提供一個 `.7z` 檔案，解壓縮後裡面有 21537 個 ELF 執行檔 `small-flag_{0-21536}`

## 解題流程與思路

如同上一題 `Structure - small`，但這題給了很多執行檔，必須靠自動化腳本破解

我採用一樣的策略，但這次的情況稍嫌複雜，在判斷 OP code 與 flag 片段時有些小細節需要注意：同樣是包含直接判斷的 flag 片段（指令：`movabsq`）、rotate（指令：`rorq`, `rolq`）以及 byte swap（指令：`bswapq`）三種，但在一些指令上因為 `objdump` 後結果有些不一樣，需要特別處理

腳本處理邏輯依序以下述清單呈現，設計流程根據較稀有的特徵優先進行處理，並把重複掃描所有執行檔直到把所有未能處理的特徵都處理完

1. Byte swap (`bswapq`)
    第一個比對的是當 `objdump` 執行結果有 `bswapq`，則 flag 片段會出現在附近幾行，同時我需要對這組數字做 byte swap
2. Rotate left (`rolq`)
    第二個比對的是當 `objdump` 執行結果有 `rolq`，則 flag 片段會出現在附近幾行，同時我需要對這組數字做逆操作，也就是 rotate right
3. Rotate right (`rorq`)
    第三個比對的是當 `objdump` 執行結果有 `rorq`，則 flag 片段會出現在附近幾行，同時我需要對這組數字做逆操作，也就是 rotate left，只是這部分有幾個細節需要注意
    * 這個情境下 flag 片段出現的位置有 4 種，包含以 `cmpq` 呈現、可以 `imm` parse 出來、或直接使用 `testq` 表示該執行檔攜帶的 flag 片段為 0（因為 0 旋轉後還是 0） 
    * 這個情境下 offset 會接在 `rorq` 指令後方，但有時候接的不是常數而是暫存器時則表示 rotate but 為 1（在 Kali Linux 上實測會是以 `$1` 的方式表示，在 Mac M4 上則是以 `%rdx` 表示）
4. Large value (`movabsq`)
    第四個比對的是當 `objdump` 執行結果有 `movabsq`，則 flag 片段可以直接 parse 出來，不需要做修正，這種情況下後方一樣會有 `imm = ` 方便我 parse flag 片段。在前面幾種情況下有可能也會 parse 出 `movabsq` 指令，因此必須將這個情境放到第四次比對
5. Small value (`cmpq`, `movq`)
    第五個比對是延續第四個比對，但當 flag 片段攜帶的是一個比較小的數字時，會以 `cmpq` 或 `movq` 指令直接表示，這時候也可以直接 parse 後拿來使用。在 Mac M4 中因為這些數值後面還是有 `imm = ` 字串方便我辨識，因此我將其獨立出一個區塊處理。一樣因為前面幾種情況下會 parse 出 `cmpq` 或 `movq` 指令，因此必須將這個情境放到第五次比對
6. Others
    最後的比對是處理一些細節，有點透過 heuristic 的方式處理了，雖然不太確定其正確性，但確實是觀察到的一項特徵，因此列入處理
    1. 0 (`testq`)
        表示攜帶的數值為 0。其實這部分比較難判斷，算是沒有其他特徵了，所以看看 `testq` 相較其他執行檔有沒有多一個，有的話我就當作這份執行檔攜帶的數值為 0
    2. Others (`cmpq`)
        攜帶的數值以 `cmpq` 呈現，但後面沒有 `imm = ` 供我 parse，這個情境和第五次必對不一樣的差異就是會面的 `imm = ` 字串，但在最後發現還是沒能找到可行解時就會去找這種情境，如果發現 `cmpq` 的指令相較其他執行檔多一個，就嘗試從這些 `cmpq` 指令中找到攜帶的數值

其實還有一個執行檔沒處理到，最後一份 `small-flag_21536` 的格式也稍微不一樣，因為他是直接判斷 argv 帶入的參數是否為 82，既然被我用 IDA 看到了又只有這一個執行檔用到，所以就作弊一下直接獨立出來處理

第一次執行完解題腳本發現產生的資訊應該是一張 PNG 圖檔，但打開後肉眼不可辨識出 flag，使用 exiftool 看起來卻是正常的 header（因為看到 comment 寫 `Good job` 認為自己應該是走在對的道路上），在使用 pngchecker 發現中間有些 chunk 是損毀的狀態，因此花了大半時間在研究 recover png 和隱寫術的技巧

不過第三天中午開 ticket 詢問後得知應該是解出圖片就能拿到 flag，又重新審視了一次腳本，發現是我在遇到 rotate 的時候對應的處理反了，比如看到 `rorq` 應該對數據做左旋，修改完這部分就成功拿到 flag 了

### 解題腳本

```python
import os
import struct
import re

def _rorq(val, r_bits):
    val = int(val, 16)
    r_bits %= 64
    return hex( ((val >> r_bits) | (val << (64 - r_bits))) & 0xFFFFFFFFFFFFFFFF )[2:]

def _rolq(val, r_bits):
    val = int(val, 16)
    r_bits %= 64
    return hex( ((val << r_bits) | (val >> (64 - r_bits))) & 0xFFFFFFFFFFFFFFFF )[2:]

def _bswapq(val):
    val = int(val, 16)
    return hex( struct.unpack("<Q", struct.pack(">Q", val & 0xFFFFFFFFFFFFFFFF))[0] )[2:]

def bswapq(file):
    cmd = f'objdump -d {file} | grep bswapq -A 1'
    output = os.popen(cmd).read()

    if output:
        lines = output.split('\n')
        if len(lines) == 3:
            val = lines[1].split('cmpq')[1].split(',')[0].strip()[3:]
            # print(val)
            return _bswapq(val)
        else:
            print(f'{file}: bswapq found but not in the known pattern???')
            input()

def rolq(file):
    cmd = f'objdump -d {file} | grep rolq -A 2'
    output = os.popen(cmd).read()

    if output:
        lines = output.split('\n')
        if len(lines) == 4:
            val = lines[2].split('cmpq')[1].split(',')[0].strip()[3:]
            offset = lines[0].split('rolq')[1].split(',')[0].strip()[3:]
            # print(f'{val}, {offset}')
            return _rorq(val, int(offset, 16))
        else:
            print(f'{file}: rolq found but not in the known pattern???')
            input()

def movabsq(file):
    cmd = f'objdump -d {file} | grep movabsq'
    output = os.popen(cmd).read()

    if output:
        lines = output.split('\n')
        if len(lines) == 2:
            val = output.split('=')[1].strip()[2:]
            # print(f'{val}')
            return val
        else:
            print(f'{file}: movabsq found but not in the known pattern???')
            input()

def rorq(file):
    cmd = f'objdump -d {file} | grep rorq -C 2'
    output = os.popen(cmd).read()

    if output:
        lines = output.split('\n')
        if len(lines) == 6:
            val = 0
            if 'imm' in lines[1]:
                val = lines[1].split('=')[1].strip()[2:]
            elif 'imm' in lines[4]:
                val = lines[4].split('=')[1].strip()[2:]
            elif 'testq' in lines[4]:
                val = '0'
            elif 'cmpq' in lines[4]:
                val = lines[4].split('cmpq')[1].split(',')[0].strip()[3:]
            else:
                print(f"{file}: rorq found but cannot found val???")
                input()
            offset = lines[2].split('rorq')[1].split(',')[0].strip()
            if offset.startswith('%'):
                offset = '1'
            elif offset.startswith('$'):
                offset = offset[3:]
            else:
                print(f"{file}: rorq found but cannot found offset???")
                input()
            # print(f'{val}, {offset}')
            return _rolq(val, int(offset, 16))
        else:
            print(f'{file}: rorq found but not in the known pattern???')
            input()

def imm(file):
    cmd = f'objdump -d {file} | grep imm'
    output = os.popen(cmd).read()

    if output:
        lines = output.split('\n')
        if len(lines) == 2:
            val = 0
            if 'cmpq' in lines[0]:
                val = lines[0].split('=')[1].strip()[2:]
                # print(f'{val}')
                return val
            elif 'movl' in lines[0]:
                val = lines[0].split('=')[1].strip()[2:]
                # print(f'{val}')
                return val
            else:
                print(f'{file}: imm found but not cannout found val')
                input()
        else:
            print(f'{file}: imm found but not in the known pattern???')
            input()

# Heuristics
def testq(file):
    cmd = f'objdump -d {file} | grep testq'
    output = os.popen(cmd).read()

    if output:
        lines = output.split('\n')
        if len(lines) == 5:
            val = '0'
            # print(f'{val}')
            return val
    return -1

def cmpq(file):
    cmd = f'objdump -d {file} | grep cmpq'
    output = os.popen(cmd).read()

    if output:
        lines = output.split('\n')
        if len(lines) == 5:
            val = lines[1].split('cmpq')[1].split(',')[0].strip()
            if val.startswith('$0x'):
                val = val[3:]
            # print(f'{val}')
            return val
    return -1

f = open('output.png', 'wb')
for count in range(0, 25137):
    if count % 2000 == 0:
        print(f"progress: {count}/25136")
    file = f'./bins/large-flag_{count}'

    # Cheat
    if count == 25136:
        f.write(struct.pack('>Q', 82))
        continue

    val = bswapq(file)
    if val:
        if len( re.findall("[^A-Fa-f0-9]", val) ) != 0:
            print(f'{file}: {val}: regex match fail')
        f.write(struct.pack('>Q', int(val, 16)))
        continue
    val = rolq(file)
    if val:
        if len( re.findall("[^A-Fa-f0-9]", val) ) != 0:
            print(f'{file}: {val}: regex match fail')
        f.write(struct.pack('>Q', int(val, 16)))
        continue
    val = rorq(file)
    if val:
        if len( re.findall("[^A-Fa-f0-9]", val) ) != 0:
            print(f'{file}: {val}: regex match fail')
        f.write(struct.pack('>Q', int(val, 16)))
        continue
    val = movabsq(file)
    if val:
        if len( re.findall("[^A-Fa-f0-9]", val) ) != 0:
            print(f'{file}: {val}: regex match fail')
        f.write(struct.pack('>Q', int(val, 16)))
        continue
    val = imm(file)
    if val:
        if len( re.findall("[^A-Fa-f0-9]", val) ) != 0:
            print(f'{file}: {val}: regex match fail')
        f.write(struct.pack('>Q', int(val, 16)))
        continue
    else:
        val = testq(file)
        if val != -1:
            if len( re.findall("[^A-Fa-f0-9]", val) ) != 0:
                print(f'{file}: {val}: regex match fail')
            f.write(struct.pack('>Q', int(val, 16)))
            continue
        val = cmpq(file)
        if val != -1:
            if len( re.findall("[^A-Fa-f0-9]", val) ) != 0:
                print(f'{file}: {val}: regex match fail')
            f.write(struct.pack('>Q', int(val, 16)))
            continue
        else:
            print(f"{file}: target opcodes not found")
            input()

f.close()
```

{{< alert >}}
這份腳本跑在 Mac M4 上，每台電腦下 `objdump` 指令得到的結果不一樣，因此有可能沒辦法完美復現
{{< /alert >}}

執行方式：`python exploit.py`
因為要掃 25137 份執行檔，會花稍微久一點的時間，我沒開平行處理，在 Mac M4 上跑約需要 20 分鐘

{{< figure
    src="structured-large-flag.png"
    alt="structured-large"
    caption="`exploit.py` 執行結果"
    >}}

# 競賽結果

* 名次：27/82
* 分數：1300

{{< figure
    src="EOF-rank.png"
    alt="EOF-rank"
    caption="排名"
    >}}

| 題目類別 | 解題數 |
| :-- | :-- |
| Misc | 3 |
| Web | 3 |
| Crypto | 3 |
| Reverse | 3 |
| Pwn | 0 |

{{< figure
    src="EOF-solve.png"
    alt="EOF-solve"
    caption="解題狀況"
    >}}

