---
title: 'zsteg 指令整理'
description: '關於 zsteg 指令的筆記整理'
pubDate: '2025-02-14'
tags: ['Linux', '資安']
---

## 簡介

zsteg 是一款可以偵測在 PNG 或 BMP 圖檔中隱藏資料的工具，偵測範圍包含如下
* PNG 和 BMP 圖檔中的 LSB 隱寫術
* zlib-compressed data
* OpenStego
* Camouflage 1.2.1
* LSB with The Eratosthenes set

## 安裝

zsteg 是以 Ruby 開發，所以需要先安裝 Ruby，再透過 Ruby 的套件管理工具 gem 下載即可，指令如下

```bash=
$ sudo apt install ruby
$ sudo gem install zsteg
```

## 指令使用說明

* 使用方式：`zsteg [options] filename.png [param_string]`

| 參數 | 說明 |
| :-- | :-- |
| `-a`, `--all` | 嘗試所有已知手段 |
| `-E`, `--extract` `NAME` | 節錄特定 payload，如 `1b,rgb,lsb`<br/>也可以直接加在 filename 後（即 `param_string`） |

### 節錄參數

| 參數 | 說明 |
| :-- | :-- |
| `-o`, `--order X` | pixel iteration order<br/>預設： `ALL`，有效值包含： `ALL`, `xy`, `yx`, `XY`, `YX`, `xY`, `Xy`, `bY`, ... |
| `-c`, `--channels X` | channels (`R`/`G`/`B`/`A`) 或任意組合，組合以逗號 `,` 隔開<br/>有效值包含： `r`, `g`, `b`, `a`, `rg`, `bgr`, `rgba`, `r3g2b3`, ... |
| `-b`, `--bits N` | bits 數量，應是單一整數、逗號隔開的整數如 `1,3,5` 或一段範圍 `1-8`<br/>進階用法：可指定特定 bits 如 `00001110` 或 `0x88` |
| `--lsb` | LSM |
| `--msb` | MSB |
| `-P`, `--prime` | 僅分析 prime bytes/pixels |
| `--shift N` | 前置 M 個 zero bits |
| `--invert` | bits 反轉 (XOR 0xff) |
| `--pixel-align` | pixel-align hidden data |

### 分析參數

| 參數 | 說明 |
| :-- | :-- |
| `-l`, `--limit N` | 限制檢查大小，單位為 byte<br/>預設： 256，0 表示無限制 |
| `--[no-]file` | 檢查 data type，預設會檢查 |
| `--no-strings` | 不進行 ASCII 字串搜尋，效果同 `-s none` |
| `-s`, `--strings X` | 指定 ASCII 字串搜尋模式<br/>搜尋模式包含： `first`, `all`, `longest`, `none`，預設：`first` |
| `-n`, `--min-str-len X` | 指定搜尋的 ASCII 字串最小長度，預設： 8 |

### 其他參數

| 參數 | 說明 |
| :-- | :-- |
| `-h`, `--help` | 印出提示訊息 |
| `-v`, `--verbose` | 印出更多詳細訊息 |
| `-q`, `--quiet` | 不顯示警告訊息 |
| `-C`, `--[no-]color` | 不特別使用彩色輸出，預設彩色輸出 |

---

## 參考資料

- [zsteg](https://github.com/zed-0xff/zsteg)