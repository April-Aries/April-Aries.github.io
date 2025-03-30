---
title: 'KMP Algorithm'
date: 2025-01-07
summary: 'Note and complaint of 2025-01-07 leetcode daily challenge'
---

## Everything started from leetcode daily challenge

I've restarted my leetcode daily challenge journey since the first day of 2025. It's not only for algorithm improving, but also a mandatory approach for me to learn C++. It was just the seventh day today that I faced a so-called easy problem, [String Matching in an Array](https://leetcode.com/problems/string-matching-in-an-array).

### Problem Description

The problem description is as follows.

Given an array of string `words`, return all strings in `words` that is a **substring** of another word. You can return the answer in **any order**.

A **substring** is a contiguous sequence of characters within a string

Here are three example testcases.

| Testcase 1
```text
- Input: words = ["mass","as","hero","superhero"]
- Output: ["as","hero"]
```
| Testcase 2
```text
- Input: words = ["leetcode", "et", "code"]
- Output: ["et", "code"]
```
| Testcase 3
```text
- Input: words = ["blue","green","bu"]
- Output: []
```

Four constraints are applied in this problem.
1. `1 <= words.length <= 100`
2. `1 <= words[i].length <= 30`
3. `words[i]` contains only lowercase English letters.
4. All the strings of `words` are **unique**.

To solve this problem, it's straight-forward to compare each pair of word in `words` to check if one is a substring of the other. Namely, I have a piece of pseudo code below.

```cpp
class Solution {
public:
    vector<string> stringMatching(vector<string>& words)
    {
        vector<string> answer;

        for(string pattern : words)
        {
            for(string word : words)
            {
                if(word == pattern) continue;
                if(isSubstring(word, pattern) == true)
                {
                    answer.push_back(pattern);
                    break;
                }
            }
        }
        return answer;
    }
};
```

Now my major mission is to build the `isSubstring` function.

The easiest approach to build `isSubstring` function is brute-force without hesitation. However, the brute-force approach spends too much time comparing substring that has been compared.

Take `word = "abcaeabcaca"` and `pattern = "abcac"` as example. The brute-force approach will run the following 7 (`word.length() - pattern.length() + 1`) comparison.

| rounds | a | b | c | a | e | a | b | c | a | b | a |
| :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- | :-- |
| 1 | `a` | `b` | `c` | `a` | b |   |   |   |   |   |   |
| 2 |   | a | b | c | a | b |   |   |   |   |   |
| 3 |   |   | a | b | c | a | b |   |   |   |   |
| 4 |   |   |   | `a` | b | c | a | b |   |   |   |
| 5 |   |   |   |   | a | b | c | a | b |   |   |
| 6 |   |   |   |   |   | `a` | `b` | `c` | `a` | `b` |   |
| 7 |   |   |   |   |   |   | a | b | c | a | b |

Let's spend some time discussing the complexity of such method. Let `N` is the array `words` size and `M` is the longest word size in `words`. In brute-force approach, it spends O(N<sup>2</sup>) to compare each pair of word in `words`. It also spends O(M<sup>2</sup>) to compare two words. Hence the time complexity is O(M<sup>2</sup>N<sup>2</sup>). As for space complexity, it is O(1) because no extra space is declared.

However, comparisons in round 2 and 3 are unnecessary since I know that the second character of `word` is `b` and is not able to be matched with `pattern`. To be more specific, a question raised with the phenomenon observed in brute-force approach: *"Can I use the result of comparison in the previous round and skip some of rounds to make the algorithm more efficient?"*

The answer is definitely yes. This time, I follow the hint and learn a new algorithm (for me), **"KMP algorithm"**

## KMP Algorithm

The full name of KMP algorithm is *Knuth–Morris–Pratt algorithm*. It was published by Knuth, Morris, and Pratt in 1977. KMP is here to solve the resundant comparisons of prefix for different starting points. The mindset is, **Remember the prefix that is already match and shift to the next available position instead one by one**. This can be achieved by **LPS (Longest Prefix Suffix) table**.

### LPS Table

The LPS table stores the maximum length of the substring that is a prefix and a suffix in a string. Take a new pattern "ababaca" as example. I can have the LPS table of it as `[0,0,1,2,3,0,1]`. Here is the detail explanation.

| Index | Substring | LPS Value | Note |
| :--: | :-- | :--: | :-- |
| 0 | "a" | 0 |  |
| 1 | "ab" | 0 |  |
| 2 | "aba" | 1 | "a" |
| 3 | "abab" | 2 | "ab" |
| 4 | "ababa" | 3 | "aba" |
| 5 | "ababac" | 0 |  |
| 6 | "ababaca" | 1 | "a" |

Now, let's discuss how to get the LPS table. I will use a function `vector<int> GetLPS(string &pattern)` to implement it.

An LPS table is an integer array (`LPS`) with size equals to the pattern length. Initially, the value is 0 as supposing no substring is a prefix and a suffix at the same time. The  first element in LPS array is always 0.

There are two variable used in this function. `currIndex` is an index pointing to the position that is comparing at the moment. `len` stands for the length of the current longest prefix.

There are totally three cases that may happen.
1. `pattern[currIndex] == pattern[len]`<br/>
    This shows that the current character is matched. In this case, the `len` should be added one then stored in `LPS` array. `currIndex` is also increased to check the next character.
2. `pattern[currIndex] != pattern[len] && len > 0`<br/>
    This indicates that the current character is not matched but there is a prefix found. This part is the most important idea in`GetLPS()`. Since the current character is not matched, the LPS value should be less than current `len`. Namely, `pattern[currIndex-len:currIndex] != pattern[0:len]` due to `pattern[currIndex] != pattern[len]`. However, `pattern[currIndex-len:currIndex-1] == pattern[0:len-1]` is true. Note that the LPS value for `currIndex` is not zero because I may probably figure out another prefix if reducing the `len`. Note that I should set the `len` to `LPS[len-1]` since `LPS[len-1]` indicates the longest prefix-suffix substring length for substring `pattern[0:len-1]` and tells how far to shift. This is the improvements compared with the brute-force approach.<br/>
    An example is helpful to understand the complicated condition. In the previous example with `currIndex = 4`, I have substring `"ababa"` and `len = 3`.<br/>
    As `currIndex` increases one and become `5`, the substring is `"ababac"`. The comparison is fail since `pattern[currIndex] == currIndex[5] == 'c' != pattern[len] == pattern[3] == b`. This tells us the prefix doesn't exist with length 4 (`"abab"`).<br/>
    The comparison is also fail in the next round. `pattern[currIndex] == currIndex[5] == 'c' != pattern[LPS[len-1]] == pattern[1] == 'b'` tells the prefix `"ab"` doesn't exist with length 2.
    The comparison is fail again. `pattern[currIndex] == currIndex[5] == 'c' != pattern[LPS[len-1]] == pattern[0] == 'a'` tells the prefix `"a"` doesn't exist with length 1. Now I know that there is no matched prefix-suffix for substring `"ababac"`.
3. `pattern[currIndex] != pattern[len] && len <= 0`<br/>
    This means the current character is not matched while there is no prefix matched as well. In this situation, simply move the currIndex pointer one step. You may consider this step as a normal brute-force approach which is required.

Refer to the following code snippet for implementation.

```cpp
vector<int> GetLPS(string &pattern)
{
    vector<int> LPS(pattern.length(), 0);
    int currIndex = 1;
    int len = 0;
    while(currIndex < pattern.length())
    {
        if(pattern[currIndex] == pattern[len])
        {
            len++;
            LPS[currIndex] = len;
            currIndex++;
        }
        else
        {
            if(len > 0) len = LPS[len-1];
            else        currIndex++;
        }
    }
    return LPS;
}
```

### `KMP()` function

In `KMP()` function, I loop through each character in `word` checking if there is a match between itself and `pattern`. The difference is that I set the pointer points to `pattern` (`pIndex`) with LPS table once the match fail. Again, the LPS table assist me to find out how far I should shift if a fail match takes place.

```cpp
bool KMP(string &word, string &pattern, vector<int> &LPS)
{
    int wIndex = 0, pIndex = 0;
    while(wIndex < word.length())
    {
        if(word[wIndex] == pattern[pIndex])
        {
            wIndex++;
            pIndex++;
            if(pIndex == pattern.length())  return true;
        }
        else
        {
            if(pIndex > 0)  pIndex = LPS[pIndex-1];
            else            wIndex++;
        }
    }
    return false;
}
```

## Solution

Combining the mindset above, the C++ code is shown as below. The main function `StringMatching()` is similar as I mentioned above. There are two private functions `GetLPS()` and `KMP()`, respectively. The `GetLPS()` function takes a string `pattern` as input and return its corresponding LPS table. The `KMP()` function takes three inputs, `word`, `pattern`, and `LPS` and output `true` if `pattern` is a substring of `word`. It outputs `false` otherwise.

```cpp
class Solution {
public:
    vector<string> stringMatching(vector<string>& words)
    {
        vector<string> answer;

        for(string pattern : words)
        {
            vector<int> LPS = GetLPS(pattern);
            for(string word : words)
            {
                if(word == pattern) continue;
                if(KMP(word, pattern, LPS) == true)
                {
                    answer.push_back(pattern);
                    break;
                }
            }
        }
        return answer;
    }
private:
    vector<int> GetLPS(string &pattern)
    {
        vector<int> LPS(pattern.length(), 0);
        int currIndex = 1;
        int len = 0;
        while(currIndex < pattern.length())
        {
            if(pattern[currIndex] == pattern[len])
            {
                len++;
                LPS[currIndex] = len;
                currIndex++;
            }
            else
            {
                if(len > 0) len = LPS[len-1];
                else        currIndex++;
            }
        }
        return LPS;
    }

    bool KMP(string &word, string &pattern, vector<int> &LPS)
    {
        int wIndex = 0, pIndex = 0;
        while(wIndex < word.length())
        {
            if(word[wIndex] == pattern[pIndex])
            {
                wIndex++;
                pIndex++;
                if(pIndex == pattern.length())  return true;
            }
            else
            {
                if(pIndex > 0)  pIndex = LPS[pIndex-1];
                else            wIndex++;
            }
        }
        return false;
    }
};
```

## Complexity

Let `N` is the array `words` size and `M` is the longest word size in `words`.

Time complexity is O(M×N<sup>2</sup>)
- It takes O(N×N) in the main loop
- It takes O(M) in `GetLPS`
- It takes O(M) in `KPM` algorithm
Total time complexity should be O(N×N×(M+M)) = O(M×N<sup>2</sup>)

Space complexity is O(M×N), as space used for `LPS` arrays

---

## Reference

1. [Leetcode editorial](https://leetcode.com/problems/string-matching-in-an-array/editorial/)
2. [Wikpedia: Knuth–Morris–Pratt algorithm](https://en.wikipedia.org/wiki/Knuth%E2%80%93Morris%E2%80%93Pratt_algorithm)
3. [HackMD: KMP algorithm](https://hackmd.io/@Misuki7435/H1G-IvUjO)