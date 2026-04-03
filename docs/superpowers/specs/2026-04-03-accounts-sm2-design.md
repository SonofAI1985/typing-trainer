# 多账号 + SM-2 强化学习系统设计

**日期**: 2026-04-03  
**项目**: typing-trainer  
**范围**: 本地文件存储的多用户账号系统 + SM-2 间隔重复算法优化练习

---

## 1. 目标

- 支持多个用户（如父亲和儿子）在同一台 Mac 上独立练习，数据互不干扰
- 每个用户有独立的键位难度记录，通过 SM-2 算法自动调整练习内容
- 双击 `.command` 脚本即可启动，无需命令行操作

## 2. 启动方式

新增 `start.command` 脚本（放在项目根目录）：
- 检查 node_modules 是否存在，若无则先 `npm install`
- 启动 Express 后端（`node server.js`）
- 等待服务就绪后自动打开浏览器 `http://localhost:5173`
- 启动 Vite 开发服务器

用户双击即可使用，终端窗口在后台运行（不影响使用）。

## 3. 目录结构

```
typing-trainer/
  server.js              ← Express 后端（新增）
  start.command          ← 双击启动脚本（新增）
  data/
    users/
      <id>.json          ← 每个用户独立数据文件
  src/
    components/
      ProfileSelector.tsx  ← 账号选择页（新增）
    hooks/
      useProfile.ts        ← 账号数据读写 hook（新增）
    utils/
      sm2.ts               ← SM-2 算法（新增）
    types.ts               ← 扩展 UserProfile 类型
```

## 4. 后端 API（server.js）

Express 服务，监听 3001 端口，仅提供本地文件读写：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/users` | 返回所有用户列表（id, name, color, sessionCount） |
| GET | `/api/users/:id` | 返回指定用户完整数据 |
| POST | `/api/users` | 创建新用户 |
| POST | `/api/users/:id/save` | 保存用户练习数据 |

数据存储在 `data/users/<id>.json`，纯文件读写，无数据库依赖。

## 5. 用户数据结构

```typescript
interface UserProfile {
  id: string            // 唯一标识，如 "dad" / "son"
  name: string          // 显示名称
  color: string         // 头像颜色（从预设色板选择）
  createdAt: string     // ISO 日期
  keyStats: Record<string, KeyStat>   // 每个键的 SM-2 数据
  sessions: SessionSummary[]          // 历史练习记录
}

interface KeyStat {
  interval: number      // 下次复习间隔（天）
  repetitions: number   // 连续答对次数
  ef: number            // 难度因子，初始 2.5，范围 1.3-2.5
  nextReview: string    // 下次应复习日期（ISO）
  totalCorrect: number
  totalWrong: number
}

interface SessionSummary {
  date: string
  wpm: number
  accuracy: number
  duration: number
  weakKeys: string[]    // 本次练习中出错 ≥2 次的键
}
```

## 6. SM-2 算法（utils/sm2.ts）

标准 SM-2 实现：

```
输入：当前 KeyStat + 本次按键质量 q（0-5）
  q = 5: 完全正确且极快
  q = 4: 正确，轻微迟疑
  q = 3: 正确但明显迟疑
  q = 2: 错误，答案感觉很近
  q = 1: 错误，记得正确答案
  q = 0: 完全不会

更新规则：
  if q >= 3:
    if repetitions == 0: interval = 1
    if repetitions == 1: interval = 6
    else: interval = round(interval * ef)
    repetitions += 1
  else:
    interval = 1
    repetitions = 0

  ef = ef + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  ef = max(1.3, ef)
  nextReview = today + interval days
```

**质量评分映射**（从按键结果推导）：
- 正确 + 反应时间 < 1s → q=5
- 正确 + 反应时间 1-2s → q=4
- 正确 + 反应时间 > 2s → q=3
- 第一次错，之后对 → q=2
- 错误 → q=1

## 7. 练习内容优化

每次进入练习时，`useAdaptiveLearning` 优先选取 `nextReview <= 今天` 的键所对应的字符生成练习文本。优先级：
1. 今天到期的弱键（nextReview ≤ today）
2. 从未练习过的键（无 KeyStat 记录）
3. 难度因子最低的键（ef 最小）

## 8. 账号选择界面（ProfileSelector）

- 进入 app 首先显示账号选择页（替换现有的 PracticeSelector 之前）
- 每个账号显示：彩色头像圆圈 + 姓名 + 练习次数 + 最近 WPM
- 一个"新建账号"按钮：输入名字，选择头像颜色
- 选择账号后进入现有练习流程，currentUser 存入 React context

## 9. 前端数据流

```
App
 └── ProfileContext (currentUser, setCurrentUser)
      ├── ProfileSelector  ← 选账号（screen='profile'）
      ├── PracticeSelector ← 选练习内容（已有，传入 currentUser）
      ├── Practice         ← 练习中（已有）
      └── Results          ← 练习结束后调用 /api/users/:id/save
```

新增一个 screen 状态值 `'profile'`，作为 app 启动后的第一个页面。

## 10. 不做的事（范围边界）

- 不做密码/PIN（后续可加）
- 不做云同步（localStorage 作为缓存，server 作为主存储）
- 不做数据导出（后续可加）
- 不做头像图片上传（纯色圆圈即可）

---

## 11. 音效系统（升级现有 sounds.ts）

目标：马里奥风格，越打越上头，连击感越来越强烈。

**按键音效（已有，保持）**
- 正确：SMB 金币双音 blip
- 错误：SMB 碰墙下降音
- 开始：SMB 升级 arpeggio
- 完成：SMB 通关号角

**连击升级系统（新增）**
连击数决定音效等级，随着连击越打越燃：

| 连击数 | 音效 |
|--------|------|
| 1-4    | 普通金币音 |
| 5      | 1-Up 6音上行旋律 |
| 10     | 更高音调的 1-Up（+半音阶） |
| 20     | 双速 1-Up（节奏加快） |
| 30     | SMB 无敌星音效（快速扫音） |
| 50+    | 无敌星 + 额外和声叠加 |

连击断掉时：特殊"崩塌"下滑音，提示玩家紧张感。

**视觉联动**：连击 ≥ 20 时，键盘背景出现轻微脉冲光晕，颜色随连击等级变化（绿→黄→橙→红）。

---

## 12. 背景音乐系统（新增 utils/bgMusic.ts）

目标：太空电子乐，强节奏感，有战斗感，用 Web Audio API 程序生成（无需音频文件）。

**风格参考**：Daft Punk《Harder Better Faster Stronger》风格——四四拍，BPM 120-128，合成器 bass line + 电子鼓组 + 太空 pad。

**结构（全部程序生成，零文件依赖）**：

```
鼓组（每小节循环）:
  踢鼓  beat 1, 3         正弦波 60Hz 快速衰减
  军鼓  beat 2, 4         白噪声 + bandpass
  hi-hat 每个 8 分音符    高频正弦 8000Hz 极短

Bass line（4小节一循环）:
  合成器方波，低频 80-160Hz
  音型：C2-C2-G1-A#1（太空感进行）

Pad（背景）:
  锯齿波 + LFO 调制，低增益，营造星际氛围
  和弦：Cm - G# - A# - Fm
```

**状态联动**：
- `ready`（等待开始）：只有 pad，低音量，慢 LFO
- `typing`（练习中）：完整鼓组 + bass + pad，BPM 128
- `complete`（完成）：音乐淡出，播放通关号角

**控制接口**：
```typescript
bgMusic.start()   // 进入练习时调用
bgMusic.stop()    // 完成/退出时调用
bgMusic.setVolume(0-1)
```

音量控制放在练习界面右上角（静音按钮 + 音量滑块）。

---

## 实施顺序

1. `utils/sm2.ts` — 纯函数，无依赖，先写先测
2. `server.js` + `start.command` — 本地后端
3. `types.ts` 扩展 + `useProfile.ts` hook
4. `ProfileSelector.tsx` 界面
5. 接入现有 `App.tsx` 和 `useAdaptiveLearning`
6. `utils/sounds.ts` 连击升级音效
7. `utils/bgMusic.ts` 太空背景音乐 + 界面音量控制
