export interface TextEntry {
  id: string
  title: string
  content: string
  mode: 'chinese' | 'english'
}

export const TEXT_LIBRARY: TextEntry[] = [
  // ─── Chinese ────────────────────────────────────────────────
  {
    id: 'zh-daily',
    title: '日常问候',
    mode: 'chinese',
    content: '今天天气不错我们出去走走吧',
  },
  {
    id: 'zh-poem',
    title: '静夜思',
    mode: 'chinese',
    content: '床前明月光疑是地上霜举头望明月低头思故乡',
  },
  {
    id: 'zh-life',
    title: '生活对话',
    mode: 'chinese',
    content: '你好请问附近有没有地铁站我要去市中心',
  },
  {
    id: 'zh-work',
    title: '工作场景',
    mode: 'chinese',
    content: '这份报告需要今天下午提交给项目经理',
  },
  {
    id: 'zh-nature',
    title: '自然描写',
    mode: 'chinese',
    content: '春风吹来花香四溢河边的柳树随风摇曳',
  },
  {
    id: 'zh-proverb',
    title: '生活感悟',
    mode: 'chinese',
    content: '做任何事情都要认真负责不能半途而废',
  },
  // ─── English ────────────────────────────────────────────────
  {
    id: 'en-classic',
    title: 'Classic Pangram',
    mode: 'english',
    content: 'the quick brown fox jumps over the lazy dog',
  },
  {
    id: 'en-home-row',
    title: 'Home Row Focus',
    mode: 'english',
    content: 'ask dad for a flag he shall add a glass flask',
  },
  {
    id: 'en-common',
    title: 'Common Words',
    mode: 'english',
    content: 'practice makes perfect keep your fingers on the home row',
  },
]
