---
title: 'iptables 指令整理'
summary: '關於 iptables 指令的筆記整理'
date: 2025-02-10
---

## 簡介

> `iptables`/`ip6tables` — administration tool for IPv4/IPv6 packet filtering and NAT

設定 IPv4 以及 IPv6 的封包過濾以及 NAT (Network Address Translation)

## 架構

iptables、ip6tables 等都使用 Xtables 框架。存在 **表 (tables)**、**鏈 (chain)** 以及 **規則 (rules)** 三個層面

- 每個「表」指的是不同類型的封包處理流程，系統按照預訂的規則將封包通過某個內建鏈
- 「鏈」中可以存在若干「規則」，這些規則會被逐一進行過濾，一旦滿足規則可以執行相應的動作
- 當鏈中所有規則都執行完仍然沒有跳轉時，將根據該鏈的預設策略 (policy) 執行對應動作
- 如果也沒有預設動作，則是返回呼叫者鏈

### 表 table

- **filter**：預設的表，如果不指明表則使用此表，通常用於過濾封包
    - 其中的內建鏈包括 INPUT、OUTPUT、FORWARD
- **nat**：用於位址轉換操作
    - 其中的內建鏈包括 PREROUTING、POSTROUTING、OUTPUT
- **mangle**：用於處理封包，和 nat 表的主要區別在於，nat 表側重連接而 mangle 表側重每一個封包
    - 其中內建鏈列表如下其中內建鏈列表如下 PREROUTING、OUTPUT、FORWARD、INPUT、POSTROUTING
- **raw**：用於處理異常
    - 其中內建鏈列表如下 PREROUTING、OUTPUT

### 鏈 chain

| chain | 說明 |
| :-- | :-- |
| INPUT | 輸入鏈，發往本機的封包 |
| OUTPUT | 輸出鏈，類似 PREROUTING，但是處理本機發出的封包 |
| FORWARD | 轉發鏈，本機轉發的封包 |
| PREROUTING | 路由前鏈，在處理路由規則前通過此鏈，通常用於目的位址轉換 (DNAT) |
| POSTROUTING | 路由後鏈，完成路由規則後通過此鏈，通常用於源位址轉換 (SNAT) |

## 常見參數

| 參數 | 說明 |
| :-- | :-- |
| `-A`, `--append` chain rule-specification | 附加一條規則至某條 chain 上 |
| `-C`, `--check` chain rule-specification | 檢查某規則是否存在於某 chain 中 |
| `-D`, `--delete` chain rule-specification<br/>`-D`, `--delete` chain rulenum | 刪除 chain 上的特定規則 |
| `-I`, `--insert` chain (rulenum) rule-specification | 新增規則至特定 chain |
| `-R`, `--replace` chain rulenum rule-specification | 更新 chain 上的某條規則 |
| `-L`, `--list` (chain) | 顯示指定 chain 的所有規則 |
| `-S`, `--list-rules` (chain) | 顯示指定 chain 的所有規則 |
| `-F`, `--flush` (chain) | 刪除指定 chain 的所有規則 |
| `-N`, `--new-chain` chain | 創建新的 chain |
| `-X`, `--delete-chain` (chain) | 刪除指定 chain <br/>內建 chain 僅能透過 `iptables-nft` 刪除 |
| `-P`, `--policy` chain target | 指定內建 chain 的 policy target<br/>target 只能是 ACCEPT 或 DROP，且僅適用於內建 chains |
| `-E`, `--rename-chain` old-chain new-chain | 重新命名 chain |
| `-V`, `--version` | 顯示 `iptables` 版本 |
| `-h` | 顯示 help message |
| `-p`, `--protocol` protocol | 指定 protocol<br/>包含 tcp, udp, udplite, icmp, icmpv6, esp, ah, sctp, mh 或 "all" 或其他於 `/etc/protocols` 紀載的協定<br/>可使用數值指定<br/>`!` 可用來反轉過濾邏輯 |
| `-s`, `--src`, `--source` address | 指定來源，如 `-sport`<br/>`!` 可用來反轉過濾邏輯 |
| `-d`, `--dst`, `--destination` address | 指定目的地，如 `-dport`<br/>`!` 可用來反轉過濾邏輯 |
| `-m`, `--match` match |  |
| `-j`, `--jump` target | 指定當滿足特定 rules 時須執行的 target action<br/>target 包含 ACCEPT、REJECT、DROP、LOG、SNAT、MASQUERADE、DNAT、REDIRECT、RETURN |
| `-g`, `--goto` chain | 跳至指定 chain |
| `-v`, `--verbose` | 顯示更多資訊 |

### `target`

| Target | 說明 | 範例 |
| :-- | :-- | :-- |
| ACCEPT | 放行<br/>結束後跳至下一規則鏈 |  |
| REJECT | 攔截，並通知傳送方<br/>通知選項包含 ICMP port-unreachable、ICMP echo-reply 或是tcp-reset<br/>結束後中斷過濾程序 |  |
| DROP | 丟棄<br/>結束後中斷過濾程序 | `iptables -A FORWARD -p TCP --dport 22 -j REJECT --reject-with tcp-reset` |
| REDIRECT | 導向另一個 port (PNAT)<br/>結束後繼續進行其他規則檢查 | `iptables -t nat -A PREROUTING -p tcp --dport 80 -j REDIRECT --to-ports 8080` |
| MASQUERADE | 改寫封包來源 IP 為防火牆 NIC IP，可指定 port 對應範圍<br/>結束後跳往下一規則 | `iptables -t nat -A POSTROUTING -p TCP -j MASQUERADE --to-ports 1024-31000` |
| SNAT | 改寫封包來源 IP 為某特定 IP 或 IP 範圍<br/>可指定 port 對應範圍<br/>結束後跳往下一規則 | `iptables -t nat -A POSTROUTING -p tcp -o eth0 -j SNAT --to-source?194.236.50.155-194.236.50.160:1024-32000　` |
| DNAT | 改寫封包來源 IP 為某特定 IP 或 IP 範圍，可指定 port 對應範圍<br/>結束後跳往下一規則鏈 | `iptables -t nat -A PREROUTING -p tcp -d 15.45.23.67 --dport 80 -j DNAT --to-destination 192.168.1.1-192.168.1.10:80-100` |
| MIRROR | 鏡射，將來源 IP 與目的地 IP 做對調並送回<br/>結束後中斷過濾程序 |  |
| QUEUE | 中斷過濾程序，放入 queue 中並返回主規則鏈<br/>白話文：提前結束返回主規則鏈 |  |
| RETURN | 結束在目前規則鏈中的過濾程序，返回主規則鏈 |  |
| LOG | 將封包相關訊息紀錄於 `/var/log`<br/>可於 `/etc/syslog.conf` 中設定<br/>結束後繼續進行其他規則檢查 | `iptables -A INPUT -p tcp -j LOG --log-prefix "INPUT packets"` |
| MARK | 將封包標上做標記，供後續使用<br/>結束後繼續進行其他規則檢查 | `iptables -t mangle -A PREROUTING -p tcp --dport 22 -j MARK --set-mark 2` |

---

## 參考資料

- [iptables(8) — Linux manual page](https://man7.org/linux/man-pages/man8/iptables.8.html)
- [`iptables -j target/jump` 常用的處理動作](https://www.cnblogs.com/fanweisheng/p/11130214.html)
- [iptables - wiki](https://zh.wikipedia.org/zh-tw/Iptables)