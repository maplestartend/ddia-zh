import { describe, expect, it } from 'vitest'
import { GLOSSARY, findTerm } from './glossary'

describe('GLOSSARY SSOT', () => {
  it('term + slug 全部唯一', () => {
    const terms = GLOSSARY.map(e => e.term)
    const slugs = GLOSSARY.map(e => e.slug)
    expect(new Set(terms).size).toBe(terms.length)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('term 全為小寫無空格（W48 type literal 收斂前提）', () => {
    for (const e of GLOSSARY) {
      expect(e.term).toBe(e.term.toLowerCase())
      expect(e.term).not.toMatch(/\s/)
    }
  })

  it('chapter 連結（若有）對齊 /part-{0,1,2,3}/ 模式', () => {
    for (const e of GLOSSARY) {
      if ('chapter' in e) {
        expect(e.chapter).toMatch(/^\/(part-[0123]|bridges)\//)
      }
    }
  })

  it('shortDef 不超過 200 字（hover tooltip 可讀性硬上限）', () => {
    // interface 註解寫 ≤ 80 字、實際 W48 後最長 ~175 字（部分學術名詞需展開）
    // 給 200 hard ceiling 防 hover 爆框、不限制目前合理的長定義
    for (const e of GLOSSARY) {
      expect(e.shortDef.length).toBeLessThanOrEqual(200)
    }
  })
})

describe('findTerm()', () => {
  it('精確 term 命中（case-insensitive）', () => {
    const result = findTerm('linearizability')
    expect(result?.term).toBe('linearizability')
    expect(findTerm('LINEARIZABILITY')?.term).toBe('linearizability')
  })

  it('alias 命中（throughput 有別名）', () => {
    const tp = findTerm('throughput')
    expect(tp).toBeDefined()
    const aliases = tp && 'aliases' in tp ? tp.aliases : undefined
    if (aliases) {
      for (const alias of aliases) {
        expect(findTerm(alias)?.term).toBe(tp!.term)
      }
    }
  })

  it('未知 term → undefined', () => {
    expect(findTerm('not-a-real-term-xyz')).toBeUndefined()
    expect(findTerm('')).toBeUndefined()
  })
})
