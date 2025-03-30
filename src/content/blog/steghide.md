---
title: 'steghide 指令整理'
summary: '關於 steghide 指令的筆記整理'
date: 2025-02-22
---
## 簡介

Steghide 是一款隱寫術工具，可用來隱藏資料與解析檔案，對於隱藏檔案而言，steghide 會將資料嵌入在被嵌入檔的 least significant bits (LSB)

## 常見參數

###  第一個參數必須是下列其中一個

| 參數 | 說明 |
| :-- | :-- |
| `embed`, `--embed` | 嵌入檔案，搭配下方其他指令使用 |
| `extract`, `--extract` | 解析檔案，搭配下方其他指令使用 |
| `info <filename>` | 顯示關於 `<filename>` 檔案的資訊 |
| `encinfo`, `--encinfo` | 顯示支援加密演算法 |
| `version`, `--version` | 顯示版本資訊 |
| `license`, `--license` | 顯示授權資訊 |
| `help`, `--help` | 顯示使用說明 |

### 關於嵌入檔案 (`embed`) 的指令

| 參數 | 說明 |
| :-- | :-- |
| `-ef`, `--embedfile <filename>` | 選擇要嵌入的檔案 |
| `-cf`, `--coverfile <filename>` | 選擇被嵌入的檔案 |
| `-p`, `--passphrase <passphrase>` | 設定密碼 (`passphrase`) 嵌入檔案，需要用 `passphrase` 才能解析出 |
| `-sf`, `--stegofile <filename>` | 將嵌入後的結果寫入 `filename`，而不取代原檔案 |
| `-e`, `--encryption <a> <m>` | 選擇加密參數，包含加密演算法 (`<a>`) 以及模式 (`<m>`) |
| `-e none` | 嵌入前不加密檔案 |
| `-z`, `--compress <level>` |  嵌入前壓縮檔案，預設都會做這件事<br/>可選擇壓縮程度 1 - 9，數字越小速度越快；數字越大壓縮程度越好 |
| `-Z`, `--dontcompress` | 嵌入前不要壓縮檔案 |
| `-K`, `--nochecksum` | 不要嵌入 CRC32 checksum |
| `-N`, `--dontembedname` | 不要嵌入檔名 |
| `-f`, `--force` | 如果產生出的檔案檔名已存在，取代現存的檔案 |
| `-q`, `--quiet` | 不顯示檔案資訊 |
| `-v`, `--verbose` | 顯示更多資訊 |

### 關於解析檔案 (`extract`) 的指令

| 參數 | 說明 |
| :-- | :-- |
| `-sf`, `--stegofile <filename>` | 選擇要解析的檔案 |
| `-p`, `--passphrase <passphrase>` | 使用密碼 (`passphrase`) 解析檔案 |
| `-xf`, `--extractfile <filename>` | 選擇解析出來的檔案名稱 |
| `-f`, `--force` | 如果解析出的檔案檔名已存在，取代現存的檔案 |
| `-q`, `--quiet` | 不顯示檔案資訊 |
| `-v`, `--verbose` | 顯示更多資訊 |

### 關於檔案資訊 (`info`) 的指令

| 參數 | 說明 |
| :-- | :-- |
| `-p`, `--passphrase <passphrase>` | 使用密碼 (`passphrase`) 得到嵌入檔案的資訊 |

---

## 參考資料

- [Kali - Steghide](https://www.kali.org/tools/steghide/)