---
title: 'ACL (Access Control List) 指令整理'
description: '關於 ACL 指令的筆記整理'
pubDate: '2025-02-12'
tags: ['Linux', '資安']
---
## 簡介

ACL 全名 Access Control List，旨在提供 owner, group, others 的 read, write, execute 權限外更細部的權限設定，可針對單一使用者、群組、屬性或單一檔案、目錄進行讀、寫、執行的權限規範

### 控制項目

| 項目 | 說明 |
| :-- | :-- |
| 使用者 user (u) | 針對使用者設定權限 |
| 群組 group (g) | 針對群組對象設定權限 |
| 預設屬性 mask (m) | 針對該目錄下建立新檔案、目錄時規範新資料的預設權限 |

## 操作

### 查看 ACL 權限

> 使用 `getfacl` 指令

```bash=
$ getfacl file
# file: MyFile
# owner: root
# group: project1
# flags: -s-
user::rwx          # 預設的擁有者權限：可讀可寫可執行
user:student:r-x   # 針對 student 用戶的權限：僅可讀可執行
group::rwx         # 預設的群組權限：可讀可寫可執行
group:project2:r-- # 針對 project2 群組的權限：僅可讀
mask::rwx          # 預設的 mask 權限：可讀可寫可執行
other::---         # 預設的其他使用者權限：無
```

對於有 ACL 設定的檔案，其權限位置後端會顯示 `+` 號

```bash=
$ ll -d MyFile
-rw-rw-r--+ 2 root project1 8 Feb 11 16:05 /PATH/TO/MyFile
```

### 修改 ACL 設定

> 使用 `setfacl` 指令

```bash=
$ setfacl -m <type>:<certain type>:<access> <file>
```

### 移除 ACL 權限

> 使用 `setfacl` 指令

```bash=
$ setfacl -x <type>:<certain type> <file>
```

### 清除 ACL 設定

> 使用 `setfacl` 指令

```bash=
# 移除檔案所有 ACL 設定
$ setfacl -b <file>
$ setfacl --remove-all <file>

# 遞迴移除目錄下所有檔案所有 ACL 設定
$ setfacl -Rb <folder>

# 清除所有預設 ACL 設定
$ setfacl -k <folder>
$ setfacl --remove-default <foldeer>
```

### 繼承 ACL 設定

```bash=
$ setfacl -m d:<type>:<certain type>:<access> <folder>
```

這樣在 `<folder>` 下的所有檔案都會繼承此權限設定

### 複製 ACL 設定

```bash=
# 將 myFfile 的 ACL 權限設定複製到 myFile2
$ getfacl myFile1 | setfacl --set-file=- myFile2

# 將目前 ACL 權限設定為預設 ACL 權限
$ getfacl --access myfolder | setfacl -d -M- myfolder
```

## 參數總覽

### `setfacl` 參數

| 參數 | 說明 |
| :-- | :-- |
| `-b`, `--remove-all` | 移除所有 ACL 設定 |
| `-k`, `--remove-default` | 移除所有預設 ACL 設定 |
| `-n`, `--no-mask` | 不要重新計算 effective rights mask |
| `--mask` | 重新計算 effective rights mask |
| `-d`, `--default` | 將操作套用於預設 ACL 設定 |
| `--restore={file}` | 復原 ACL 設定 |
| `--test` | 測試模式 |
| `-R`, `--recursive` | 將操作套用於目錄底下所有檔案 |
| `-v`, `--version` | 印出 `setfacl` 指令版本 |
| `-h`, `--help` | 印出 help message |
| `--` | 指令結束符號，剩餘參數會被視作 filenames |
| `-` | 如果指定 `filename` 為 `-`，`setfacl` 會從 STDIN 讀取一連串的檔案 |

### `getfacl` 參數

| 參數 | 說明 |
| :-- | :-- |
| `-a`, `--access` | 顯示所有 ACL 設定 |
| `-d`, `--default` | 顯示預設 ACL 設定 |
| `-c`, `--omit-header` | 不顯示 comment header （即前三行：檔名、擁有者、所屬群組） |
| `-e`, `--all-effective` | 印出所有 effective rights comments |
| `-E`, `--no-effective` | 不要印出 effective rights comments |
| `-s`, `--skip-base` | 省略只有基本 ACL 設定的檔案 |
| `-R`, `--recursive` | 同時遞迴印出目錄下所有檔案 |
| `-t`, `--tabular` | 透過表格方式印出 |
| `-n`, `--numeric` | 顯示 user ID 與 group ID |
| `-v`, `--version` | 印出 `setfacl` 指令版本 |
| `-h`, `--help` | 印出 help message |
| `--` | 指令結束符號，剩餘參數會被視作 filenames |
| `-` | 如果指定 `filename` 為 `-`，`setfacl` 會從 STDIN 讀取一連串的檔案 |

---

## 參考資料

- [acl(5) — Linux manual page](https://man7.org/linux/man-pages/man5/acl.5.html)
- [setfacl(5) — Linux manual page](https://linux.die.net/man/1/setfacl)
- [getfacl(5) — Linux manual page](https://linux.die.net/man/1/getfacl)
- [Linux ACL 檔案權限設定 setfacl、getfacl 指令使用教學與範例](https://forum.doit.net.tw/forum.php?mod=viewthread&tid=224)
- [第 10 堂課：使用者管理與 ACL 權限設定 - 10.3 主機的細部權限規劃：ACL 的使用](https://linux.vbird.org/linux_basic_train/centos8/unit10.php#10.3)