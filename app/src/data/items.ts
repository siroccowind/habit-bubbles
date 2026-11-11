// 掉落物库（数据驱动，后续版本可扩充与加节日限定）
// 分两类：
//  · 收藏品 ITEMS —— 仅「完美一天」掉落，永久记录，进收藏室
//  · 玩具   TOYS  —— 普通完成即掉，不进收藏室，当天可玩，次日收起

export type Rarity = 'N' | 'R' | 'SSR'

export interface DropItem {
  id: string
  name: string
  rarity: Rarity
  /** 节日限定标识（预留，如 'sakura'） */
  limited?: string
}

export interface Toy {
  id: string
  name: string
}

export const RARITY_LABEL: Record<Rarity, string> = {
  N: '普通',
  R: '稀有',
  SSR: '史诗',
}

/** 收藏品：完美一天掉落，共 19 种 */
export const ITEMS: DropItem[] = [
  { id: 'star', name: '星星', rarity: 'N' },
  { id: 'candy', name: '糖果', rarity: 'N' },
  { id: 'sakura', name: '樱花', rarity: 'N' },
  { id: 'bubble', name: '泡泡', rarity: 'N' },
  { id: 'mochi', name: '饭团', rarity: 'N' },
  { id: 'balloon', name: '热气球', rarity: 'N' },
  { id: 'leaf', name: '树叶', rarity: 'N' },
  { id: 'cactus', name: '仙人掌', rarity: 'N' },

  { id: 'clover', name: '四叶草', rarity: 'R' },
  { id: 'plane', name: '纸飞机', rarity: 'R' },
  { id: 'cake', name: '小蛋糕', rarity: 'R' },
  { id: 'moon', name: '月亮', rarity: 'R' },
  { id: 'pinwheel', name: '风车', rarity: 'R' },
  { id: 'key', name: '钥匙', rarity: 'R' },
  { id: 'umbrella', name: '雨伞', rarity: 'R' },

  { id: 'fish', name: '金色小鱼', rarity: 'SSR' },
  { id: 'rainbow', name: '彩虹', rarity: 'SSR' },
  { id: 'meteor', name: '流星', rarity: 'SSR' },
  { id: 'crown', name: '皇冠', rarity: 'SSR' },
]

/** 玩具：普通完成即掉，不进收藏室，共 16 种 */
export const TOYS: Toy[] = [
  { id: 't-banana', name: '香蕉' },
  { id: 't-cherry', name: '樱桃' },
  { id: 't-donut', name: '甜甜圈' },
  { id: 't-egg', name: '煎蛋' },
  { id: 't-icecream', name: '冰淇淋' },
  { id: 't-lollipop', name: '棒棒糖' },
  { id: 't-ball', name: '皮球' },
  { id: 't-duck', name: '小黄鸭' },
  { id: 't-cat', name: '小猫' },
  { id: 't-frog', name: '小青蛙' },
  { id: 't-rocket', name: '小火箭' },
  { id: 't-cloud', name: '云朵' },
  { id: 't-umbrella', name: '小阳伞' },
  { id: 't-mushroom', name: '蘑菇' },
  { id: 't-gift', name: '礼盒' },
  { id: 't-bell', name: '铃铛' },
]

export function getItem(id: string): DropItem {
  return ITEMS.find((i) => i.id === id) ?? ITEMS[0]
}

export function getToy(id: string): Toy {
  return TOYS.find((t) => t.id === id) ?? TOYS[0]
}
