// 掉落规则（纯函数）：玩具（普通完成）与收藏品（完美一天）分离
//
// 设计（v1.7 确立，v1.38 调整稀有度权重）：
//  · 普通完成好习惯 → 掉「玩具」：不进收藏室、不落库，当天在屏幕上玩，次日收起
//  · 完美一天（当天全部好习惯完成）的最后一戳 → 掉「收藏品」：落库、进收藏室
//  · 概率均为「提升」而非「保底」，不承诺必得
//  · v1.38：完美一天不再提升稀有 / 史诗概率，只让「普通收藏」更容易出现；
//    只有连续天数的阶段性里程碑才提升稀有与史诗概率

import { ITEMS, TOYS, type DropItem, type Rarity, type Toy } from '../data/items'

export type DropSource = 'perfect'

/** 普通完成：随机一个玩具 */
export function rollToy(): Toy {
  return TOYS[Math.floor(Math.random() * TOYS.length)]
}

/** 里程碑：连续 7/14/21/30/40/50/60 天，之后每 30 天 */
export function isMilestone(streak: number): boolean {
  if (streak < 7) return false
  if ([7, 14, 21, 30, 40, 50, 60].includes(streak)) return true
  return streak > 60 && streak % 30 === 0
}

export interface DropResult {
  item: DropItem
  source: DropSource
}

export interface RarityOdds {
  N: number
  R: number
  SSR: number
}

/**
 * 收藏品稀有度权重（v1.38）：
 *  · 普通完美一天：N 70% / R 25% / SSR 5%
 *    与 PRD「完成 70 / 25 / 5」一致——达成完美一天只更容易拿到普通收藏，
 *    不再增加稀有或史诗的概率。
 *  · 阶段性里程碑日：N 15% / R 55% / SSR 30%
 *    只有连续 7/14/21/30/40/50/60… 天这类节点，才提升稀有与史诗。
 */
export function collectibleOdds(milestone = false): RarityOdds {
  return milestone
    ? { N: 0.15, R: 0.55, SSR: 0.3 }
    : { N: 0.7, R: 0.25, SSR: 0.05 }
}

/** 完美一天的收藏品；rng 可注入，便于对概率边界做断言 */
export function rollCollectible(milestone = false, rng: () => number = Math.random): DropResult {
  const odds = collectibleOdds(milestone)
  const r = rng()
  const rarity: Rarity = r < odds.SSR
    ? 'SSR'
    : r < odds.SSR + odds.R
      ? 'R'
      : 'N'
  const pool = ITEMS.filter((i) => i.rarity === rarity)
  return { item: pool[Math.floor(Math.random() * pool.length)], source: 'perfect' }
}
