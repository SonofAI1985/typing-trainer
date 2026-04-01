interface ClaudeMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ClaudeResponse {
  content: Array<{ type: string; text: string }>
}

export async function generatePracticeText(
  weakKeys: string[],
  apiKey: string,
): Promise<string> {
  const weakKeyDisplay = weakKeys.join(', ')

  const prompt = `你是一个中文打字练习文本生成器。用户练习拼音输入时，以下键位输入不熟练：${weakKeyDisplay}。

请生成 3-5 个中文句子，这些句子的拼音中应该大量使用上述键位对应的字母。
要求：
- 每个句子 8-15 个字
- 语言自然流畅，生活化
- 直接输出句子，用换行分隔，不要编号，不要解释

只输出句子，不要其他内容。`

  const response = await fetch('/api/claude/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }] satisfies ClaudeMessage[],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Claude API error ${response.status}: ${err}`)
  }

  const data: ClaudeResponse = await response.json()
  const text = data.content[0]?.text ?? ''

  // Take first non-empty line as the practice text
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean)
  return lines.join(' ')
}
