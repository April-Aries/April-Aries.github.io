---
title: '透過 Reinforcement Learning 產生弦藝術'
date: 2025-06-14
description: '在類神經網路第三次 project，我和 David 使用了 RL 模型嘗試產生弦藝術圖片'
layout: "simple"
---

## 緣起

如果對於這份計劃感興趣，可以參考[透過 Autoencoder 產生弦藝術](./string-art-generation-using-autoencoder.md)這篇文章，裡面有提及較多弦藝術的基礎想法，當時產生的結果並不好，因此在類神經網路第三次專題時，我和 David 提出了 string art revenge 的計畫，打算再花一段時間研究，提交出更好的結果，加上這堂課的指導老師人非常好，從 project 2 開始過程中不斷與我們討論，也想要在期末給他看到成功的案例

如果你也想看到成功的 string art image，那很抱歉，我先說明結論，這份專題並未讓我們找到成功的解法，但嘗試了不同方式，也提出了許多可調整的地方

## 方法的選擇

在 project 2 我使用了 autoencoder 模型，因為整體架構和 string art generation 有異曲同工之妙，但在實驗後才逐漸發現我好像一直把 decoder 忽視，所產生的 loss 也只是為了做 back propagation 而存在，這讓我在這次專題中想要將 decoder 直接從架構中移除，我想單純訓練一個 decoder，這個 decoder 就是一個神經網路，輸入一張圖片，可以輸出一段 pin pair connections

這就是 project 3 的起始想法，簡單訓練一個 CNN 模型，調整它的參數看能不能真的產生弦藝術圖片，但實作後才發現在類神經網路的架構中，幾乎都是靠著反向傳遞 (back propagation) 做到，想做到 back propagation，loss 的計算中就必須要有 gradient 存在，以弦藝術專題為例，loss 的計算是透過兩張圖片，一張 target image 和一張 string art image，如果產生的 string art image 具有 gradient，那就可以簡單地進行 loss 計算並反向傳遞調整神經網路的參數，但因為在設計上，string art image 並不是由神經網路產生，圖片並不包含 gradient 資訊，導致這種設計沒辦法進行 back propagation，也沒辦法拿來訓練神經網路

上述提到這種問題在和老師討論後才打開類神經網路課題中異世界的大門：reinforcement learning，中文翻作增強式學習，正是解決上述問題的好方法

所謂增強式學習由兩個角色構成：actor 和 environment，actor 的行為 action 會對 environment 造成影響，environment 會根據 action 給予回饋 reward，actor 會透過觀察 observation 和獲得的回饋 reward 決定下一輪行為 action，最終目標是在回合結束前（達到終止條件前）獲得最高的 return，也就是 total reward。RL 的概念很常聽到，但一直沒有深入了解，這次也算是半強迫我搞懂 RL 的基礎了，有興趣完全推薦[臺大李宏毅老師的 YT 影片](https://youtu.be/XWukX-ayIrs?si=3y_1nxAIyURRLa__)，總共有五部曲，會透過很淺顯易懂的方法了解基本 RL 知識

## Reinforcement Learning 的方法

這個章節簡單介紹整個 project 的設計，會分成參數設計、資料集、environment、actor 以及 training loop 進行說明

### 參數設計

這邊想要提及的是 string art 本身的設計，我們使用 250 條線段在  500 * 500 的 canvas 上進行繪製，canvas 周圍還是放置了 288 個 pins 作為線段起終點

一樣的問題是 string art 本身的設計還是在解析度非常小的情況下進行實驗，500 * 500 的解析度是礙於 Google Colab 的記憶體限制，而之前透過線上工具慧智賢藝術圖片發現採用約 3000 - 4000 的線條下可以比較完整的呈現目標圖片的結構與細節，但在 500 * 500 的解析度下繪製這麼多條線幾乎會讓整張 canvas 被直線覆蓋，完全無法呈現目標圖片的長相，實驗下差不多 250 條直線才有機會在 canva 產生變化性的圖片，因此這次專題使用了 250 條直線進行繪製

### 資料集

資料集使用 Kaggle 上的 [Human Face Dataset](https://www.kaggle.com/datasets/ashwingupta3012/human-faces/data)，裡面約有 7000 多張人臉，使用前我們都會將其轉換為 500 * 500 大小的灰階人臉才餵進去訓練模型

預期上是希望可以將每張圖片都看過一次作為完整的 training loop，不過礙於時間成本，這次專題的 training loop 只有看過前面 1000 張圖片而已

### environment

環境設計包含幾個要素：state space, actor space, reward function 以及 episode termination

* State space：當前狀態的 canvas。以一個連續陣列表示，每個元素的值在 0-255 之間表示 RGB 顏色，不過實際上用到的只有 0 或 255 而已
* Action space：可以選擇的行為。每次行為皆會從所有 288 個 pins 中選擇兩個 pins 表示要連接畫線的端點，pin 的值介於 0-287
* Reward function：獎勵回饋機我們我們設計了三個獎勵機制，至於如何使用會在實驗章節說明
    * Initial improvement：計算空白 canvas 與 target image 的 MSE loss 與當前 canvas 與 target image 的 MSE loss，兩個 loss 相減即為 initial improvement
    * Latest improvement：計算前一輪 canvas 與 target image 的 MSE loss 與當前 canvas 與 target image 的 MSE loss，兩個 loss 相減即為 latest improvement
    * Penalty：當 actor 選擇到相同直線時就給予 -0.1 分的處罰，希望藉由小處罰讓 actor 知道不要重複選擇相同的線段
* Episode termination：我們定義完成一張 string art image 即為完成一個 episode，也就是當 actor 採取 250 次 action、canvas 上畫過 250 次直線時，就讓 training loop 進到下一個 episode

環境是採用 OpenAI 的 Gym environment，不過因為我們的並不是內建存的遊戲或已經有人設計過的環境，所以需要進行客製化設計，在 OpenAI 的定義裡會需要四個 functions：`init`, `reset`, `step`, `render`

* `init`：初始化需要的東西，包含參數、畫布等等
* `reset`：進入新的 episode 之前的重置步驟，包含清空畫布與參數的重設
* `step`：每一次 action 後的更新，例如根據 actor 畫線、計算 reward、更新畫布等等
* `render`：在有需要的時候將畫布渲染出來

### actor

Actor 是個三層的多層感知器 (MLP)，input 是一個 500 * 500 的 canvas，actor 會根據 canvas、target image 與 reward 進行調整並 output 選擇到每個 pins 的 probability，我們會從中選擇最高分的 10 個 pins 作為候選人，在新增 Gaussian noise 之後 sample 出兩個 pins 作為 action 繪製下一條線

### training loop



## 實驗

### 實驗 1. 


### 實驗 2. 

### 實驗 3. 

## 結論

### Contribution


### 未來研究方向

## 心得

說實話 RL 對我而言是個全新的東西，為了口頭發表甚至在一天內把李宏毅老師的 RL 影片肝完理解了最基礎的概念後套到這個專題，到現在或許我也沒有理解的很透徹，比如說 PPO 那一塊到現在就是一知半解，這次專題有用到但卻不是這麼的了解，感覺就是下次可以花時間研究的方向了

還是推薦歡迎對這個專題有興趣的讀者來跟我一起討論，未來應該會在有時間有硬體設備的情況下繼續摸這個專題，我是真的想弄出成果的，畢竟耗費了類神經網路兩次專題的時間在這上面都沒成效，有點對不起老師，對我來說也超級可惜的

最後，Claude 真的很讚，100 分推薦！