import { describe, expect, it } from 'vitest'
import {
  CHAPTERS,
  PREREQUISITES,
  TOTAL_CHAPTERS,
  chaptersByPart,
  nextChapter,
  type ChapterId,
  type PrerequisiteId
} from './chapters'

describe('CHAPTERS SSOT', () => {
  it('TOTAL_CHAPTERS === CHAPTERS.length === 12', () => {
    expect(TOTAL_CHAPTERS).toBe(12)
    expect(CHAPTERS).toHaveLength(12)
  })

  it('每章 id 唯一', () => {
    const ids = CHAPTERS.map(c => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('章 id 與 link 對齊 part-{1,2,3}/chXX-* 模式', () => {
    for (const c of CHAPTERS) {
      expect(c.link).toMatch(new RegExp(`^/part-[123]/${c.id}-`))
      expect([1, 2, 3]).toContain(c.part)
    }
  })

  it('章順序遞增（ch01 → ch12）', () => {
    for (let i = 0; i < CHAPTERS.length; i++) {
      const expected = `ch${String(i + 1).padStart(2, '0')}` as ChapterId
      expect(CHAPTERS[i]?.id).toBe(expected)
    }
  })

  it('每章 readTime 為合理正整數（15-90 分鐘）', () => {
    for (const c of CHAPTERS) {
      expect(c.readTime).toBeGreaterThanOrEqual(15)
      expect(c.readTime).toBeLessThanOrEqual(90)
      expect(Number.isInteger(c.readTime)).toBe(true)
    }
  })
})

describe('PREREQUISITES (Part 0)', () => {
  it('8 章 + 全為 part 0', () => {
    expect(PREREQUISITES).toHaveLength(8)
    for (const c of PREREQUISITES) {
      expect(c.part).toBe(0)
      expect(c.id).toMatch(/^p0-/) as unknown as PrerequisiteId
    }
  })

  it('編號 0.0 → 0.7 連續', () => {
    const nums = PREREQUISITES.map(c => c.num)
    expect(nums).toEqual(['0.0', '0.1', '0.2', '0.3', '0.4', '0.5', '0.6', '0.7'])
  })
})

describe('chaptersByPart()', () => {
  it('part 0 回傳 PREREQUISITES', () => {
    expect(chaptersByPart(0)).toBe(PREREQUISITES)
  })

  it.each([1, 2, 3] as const)('part %d 回傳對應主課程章節', (part) => {
    const result = chaptersByPart(part)
    expect(result.length).toBeGreaterThan(0)
    expect(result.every(c => c.part === part)).toBe(true)
  })

  it('Part I + II + III 章數合計 === TOTAL_CHAPTERS', () => {
    const sum = chaptersByPart(1).length + chaptersByPart(2).length + chaptersByPart(3).length
    expect(sum).toBe(TOTAL_CHAPTERS)
  })
})

describe('nextChapter()', () => {
  it('主課程：ch01 → ch02', () => {
    expect(nextChapter('ch01')?.id).toBe('ch02')
  })

  it('Part 0：p0-basics → p0-intro', () => {
    expect(nextChapter('p0-basics')?.id).toBe('p0-intro')
  })

  it('主課程最後章 ch12 → null', () => {
    expect(nextChapter('ch12')).toBeNull()
  })

  it('Part 0 最後章 p0-concur → null（不接 Ch1、選讀補強性質）', () => {
    expect(nextChapter('p0-concur')).toBeNull()
  })

  it('未知 id → null', () => {
    expect(nextChapter('ch99')).toBeNull()
    expect(nextChapter('')).toBeNull()
  })
})
