const TARGET_CHARS = 650
const MIN_CARD_CHARS = 220

// Groups document blocks into reading "cards" — paragraphs accumulate until
// roughly TARGET_CHARS of text, and a heading only starts a new card once
// the current one already holds enough to stand on its own. This keeps a
// stray/mis-detected heading from splitting off a near-empty card, and any
// too-small trailing card gets folded back into the one before it.
export function buildCards(blocks) {
  const cards = []
  let current = []
  let currentLen = 0

  const flush = () => {
    if (!current.length) return
    cards.push(current)
    current = []
    currentLen = 0
  }

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    const weight = block.type === 'image' ? 420 : block.text.length

    if (block.type === 'heading' && current.length && currentLen >= MIN_CARD_CHARS) {
      flush()
    }

    current.push({ ...block, blockIndex: i })
    currentLen += weight

    if (block.type !== 'heading' && currentLen >= TARGET_CHARS) {
      flush()
    }
  }
  flush()

  if (cards.length > 1) {
    const last = cards[cards.length - 1]
    const lastLen = last.reduce(
      (sum, b) => sum + (b.type === 'image' ? 420 : b.text.length),
      0,
    )
    if (lastLen < MIN_CARD_CHARS && last[0].type !== 'heading') {
      cards[cards.length - 2] = cards[cards.length - 2].concat(last)
      cards.pop()
    }
  }

  return cards
}
