const TARGET_CHARS = 650

// Groups document blocks into reading "cards" — a heading always starts a
// new card, and paragraphs accumulate until roughly TARGET_CHARS of text.
export function buildCards(blocks) {
  const cards = []
  let current = []
  let currentLen = 0

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const weight = block.type === 'image' ? 420 : block.text.length
    if (block.type === 'heading' && current.length) {
      cards.push(current)
      current = []
      currentLen = 0
    }
    current.push({ ...block, blockIndex: i })
    currentLen += weight
    if (block.type !== 'heading' && currentLen >= TARGET_CHARS) {
      cards.push(current)
      current = []
      currentLen = 0
    }
  }
  if (current.length) cards.push(current)
  return cards
}
