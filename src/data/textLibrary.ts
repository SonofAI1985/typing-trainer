export interface TextEntry {
  id: string
  title: string
  content: string
  mode: 'chinese' | 'english'
}

// ─── Chinese sentence pool (50 sentences) ──────────────────────────────────
const ZH_POOL: string[] = [
  '今天天气不错我们出去走走吧',
  '你好请问附近有没有地铁站',
  '这份报告需要今天下午提交',
  '春风吹来花香四溢河边柳树随风摇曳',
  '做任何事情都要认真负责不能半途而废',
  '生活就像一面镜子你对它笑它也对你笑',
  '坚持不懈才能实现自己的梦想',
  '今天的学习是明天成功的基础',
  '只要功夫深铁杵磨成针',
  '书山有路勤为径学海无涯苦作舟',
  '一年之计在于春一日之计在于晨',
  '三人行必有我师焉择其善者而从之',
  '人无远虑必有近忧',
  '海内存知己天涯若比邻',
  '我们需要在周末开一个团队会议',
  '这个项目的截止日期是下周五',
  '我喜欢在早上喝一杯热咖啡',
  '他每天坚持跑步保持身体健康',
  '孩子们在公园里快乐地玩耍',
  '冬天的雪景让人心旷神怡',
  '秋天的枫叶红得像火一样燃烧',
  '夏天的夜晚可以在院子里乘凉聊天',
  '这本书写得非常好我一口气读完了',
  '科技改变了我们的生活方式',
  '互联网让世界变得越来越小',
  '人工智能正在快速发展影响各个行业',
  '学习一门新语言需要持续的努力和耐心',
  '早睡早起身体好',
  '知足者常乐',
  '路遥知马力日久见人心',
  '百闻不如一见',
  '失败是成功之母',
  '机会总是留给有准备的人',
  '时间就是金钱效率就是生命',
  '团结就是力量',
  '今晚去哪里吃饭你有什么建议',
  '他的普通话说得很标准',
  '图书馆里要保持安静不能大声说话',
  '他考上了重点大学全家人都非常高兴',
  '这座城市的夜景太漂亮了尤其是江边',
  '努力工作是为了让家人过上更好的生活',
  '保护环境人人有责从小事做起',
  '床前明月光疑是地上霜举头望明月低头思故乡',
  '春眠不觉晓处处闻啼鸟夜来风雨声花落知多少',
  '独在异乡为异客每逢佳节倍思亲',
  '会当凌绝顶一览众山小',
  '不识庐山真面目只缘身在此山中',
  '欲穷千里目更上一层楼',
  '横看成岭侧成峰远近高低各不同',
  '桃花潭水深千尺不及汪伦送我情',
]

// ─── English sentence pool (30 sentences) ──────────────────────────────────
const EN_POOL: string[] = [
  'the quick brown fox jumps over the lazy dog',
  'ask dad for a flag he shall add a glass flask',
  'practice makes perfect keep your fingers on the home row',
  'she sells seashells by the seashore',
  'the five boxing wizards jump quickly',
  'pack my box with five dozen liquor jugs',
  'a good typist can type over eighty words per minute',
  'keep your wrists flat and fingers curved when you type',
  'the more you practice the faster your fingers will move',
  'learning touch typing will save you hours every day',
  'always look at the screen not at the keyboard',
  'good posture will prevent fatigue during long typing sessions',
  'home row keys are the foundation of touch typing',
  'use your thumbs only for the space bar',
  'speed will come naturally once accuracy is mastered',
  'focus on correct finger placement before worrying about speed',
  'consistent practice every day builds muscle memory fast',
  'break bad habits early by using the correct finger for each key',
  'a programmer who types fast can translate ideas into code quickly',
  'the shift key is pressed with the opposite hand from the letter',
  'extend your pinky finger to reach the semicolon and enter keys',
  'strong pinky fingers are essential for efficient touch typing',
  'never look down at the keyboard keep your eyes on the text',
  'reach for the top row with your index fingers',
  'the bottom row requires you to curl your fingers down',
  'typing is a skill that improves with regular deliberate practice',
  'accuracy matters more than speed when you are just starting out',
  'your fingers should rest on a s d f and j k l semicolon',
  'the index fingers rest on f and j which have small bumps',
  'try to type whole words not letter by letter for better flow',
]

// ─── Random entry generator ─────────────────────────────────────────────────
function pickRandom<T>(pool: T[], n: number): T[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, n)
}

export function generateDynamicEntry(mode: 'chinese' | 'english'): TextEntry {
  const pool = mode === 'chinese' ? ZH_POOL : EN_POOL
  // Pick 3 random sentences; Chinese joins directly, English joins with space
  const sentences = pickRandom(pool, 3)
  const content = mode === 'chinese' ? sentences.join('') : sentences.join(' ')
  return {
    id: `dynamic-${mode}-${Date.now()}`,
    title: mode === 'chinese' ? '随机中文' : 'Random English',
    content,
    mode,
  }
}

// ─── Curated fixed entries (shown in the selector grid) ────────────────────
export const TEXT_LIBRARY: TextEntry[] = [
  {
    id: 'zh-poem',
    title: '古诗词',
    mode: 'chinese',
    content: '床前明月光疑是地上霜举头望明月低头思故乡',
  },
  {
    id: 'zh-proverb',
    title: '成语名言',
    mode: 'chinese',
    content: '只要功夫深铁杵磨成针书山有路勤为径学海无涯苦作舟',
  },
  {
    id: 'zh-life',
    title: '日常对话',
    mode: 'chinese',
    content: '你好请问附近有没有地铁站今晚去哪里吃饭你有什么建议',
  },
  {
    id: 'zh-work',
    title: '工作场景',
    mode: 'chinese',
    content: '这份报告需要今天下午提交给项目经理科技改变了我们的生活方式',
  },
  {
    id: 'zh-nature',
    title: '自然描写',
    mode: 'chinese',
    content: '春风吹来花香四溢河边柳树随风摇曳冬天的雪景让人心旷神怡',
  },
  {
    id: 'zh-wisdom',
    title: '人生智慧',
    mode: 'chinese',
    content: '失败是成功之母机会总是留给有准备的人坚持不懈才能实现梦想',
  },
  {
    id: 'en-pangram',
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
    id: 'en-tips',
    title: 'Typing Tips',
    mode: 'english',
    content: 'keep your wrists flat and fingers curved when you type never look down at the keyboard',
  },
  {
    id: 'en-common',
    title: 'Common Words',
    mode: 'english',
    content: 'practice makes perfect keep your fingers on the home row speed comes after accuracy',
  },
]
