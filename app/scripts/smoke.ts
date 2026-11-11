/**
 * 核心逻辑冒烟测试：位图 / streak / 可视化纯函数
 * 运行：npm run smoke
 */
import { dayOfYear } from '../src/core/date'
import { YearBitmap } from '../src/core/bitmap'
import { currentCleanStreak, currentStreak, longestRun } from '../src/core/stats'
import {
  countOn,
  dailySeries,
  expectedOn,
  heatCells,
  monthView,
  statsFor,
  type VizHabit,
} from '../src/core/viz'
import { collectibleOdds, isMilestone, rollCollectible } from '../src/core/drops'
import { COLORS, ICONS } from '../src/data/templates'

let failed = 0

function eq(actual: unknown, expected: unknown, label: string): void {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) {
    failed++
    console.error(`✗ ${label}：期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`)
  } else {
    console.log(`✓ ${label}`)
  }
}

const TODAY = '2026-10-23'
const d = (day: number) => `2026-10-${String(day).padStart(2, '0')}`

// ---- 好习惯：10月1日创建，10/11/20/21/22/23 完成 ----
const good: VizHabit = { id: 'g1', name: '早起', type: 'good', createdAt: '2026-10-01' }
const bmp = new YearBitmap(2026)
for (const day of [10, 11, 20, 21, 22, 23]) bmp.set(dayOfYear(d(day)), true)
const bmps = new Map([[good.id, bmp]])

eq(bmp.count(), 6, '位图 popcount = 6')
eq(currentStreak(bmp, TODAY), 4, '当前连续 = 4')
eq(longestRun(bmp, true, dayOfYear(TODAY)), 4, '历史最长 = 4')

const daily = dailySeries([good], bmps, TODAY, 30)
eq(daily.length, 30, '30 天序列长度')
eq(daily[daily.length - 1].count, 1, '今天 = 1')
eq(daily[daily.length - 4].count, 1, '10月20日 = 1')
eq(daily[daily.length - 5].count, 0, '10月19日 = 0')
eq(daily[daily.length - 13].count, 1, '10月11日 = 1')

const mv = monthView([good], bmps, 2026, 10, TODAY, false)
eq(mv.done, 6, '10月完成 6 天')
eq(mv.total, 23, '10月应完成 23 天')
eq(mv.max, 1, '单习惯月历 max = 1')
eq(mv.cells.filter((c) => c.state === 'na' && c.day > 0 && c.date > TODAY).length, 8, '未来 8 天（灰色）')
eq(mv.cells.find((c) => c.date === TODAY)?.state, 'done', '今天 = 完成（绿）')
eq(mv.cells.find((c) => c.date === d(19))?.state, 'miss', '10月19日 = 未完成（原始色）')
eq(mv.cells.find((c) => c.date === d(19))?.count, 0, '10月19日 count = 0')

const heat = heatCells([good], bmps, 2026, TODAY)
eq(heat.length, 365, '热力图 365 格')
eq(heat.find((c) => c.date === '2026-09-30')?.na, true, '热力图：创建前 = na（灰）')
eq(heat.find((c) => c.date === d(1))?.na, false, '热力图：创建日起非 na')
eq(heat.find((c) => c.date === TODAY)?.na, false, '热力图：今天非 na')

const stats = statsFor([good], bmps, TODAY, false)
eq(stats[0].value, '4 天', '统计：当前最长连续')
eq(stats[1].value, '4 天', '统计：历史最长连续')
eq(stats[2].value, '6 天', '统计：累计打卡')

// ---- 坏习惯：10月20日发生一次 ----
const bad: VizHabit = { id: 'b1', name: '熬夜', type: 'bad', createdAt: '2026-10-01' }
const bbmp = new YearBitmap(2026)
bbmp.set(dayOfYear(d(20)), true)
const bbmps = new Map([[bad.id, bbmp]])

eq(currentCleanStreak(bbmp, TODAY, dayOfYear(d(1))), 3, '坏习惯：当前连续未发生 = 3（10/20 发生过，挡住）')
eq(longestRun(bbmp, false, dayOfYear(TODAY), dayOfYear(d(1))), 19, '坏习惯：历史最长未发生 = 19（创建日起算，不是 292）')

// 新建后零发生：不能把创建前的空白算进连续段（曾经的 bug）
const fresh: VizHabit = { id: 'b2', name: '赖床', type: 'bad', createdAt: '2026-10-01' }
const freshBmp = new YearBitmap(2026)
const freshMap = new Map([[fresh.id, freshBmp]])
eq(currentCleanStreak(freshBmp, TODAY, dayOfYear(d(1))), 23, '坏习惯：新建后零发生 = 23（不是全年 296）')
eq(statsFor([fresh], freshMap, TODAY, true)[0].value, '23 天', '坏习惯统计：新建后零发生 = 23 天')

const badStats = statsFor([bad], bbmps, TODAY, true)
eq(badStats[0].value, '3 天', '坏习惯统计：当前连续未发生')
eq(badStats[1].value, '19 天', '坏习惯统计：历史最长未发生')
eq(badStats[2].value, '1 天', '坏习惯统计：累计发生')

const badMonth = monthView([bad], bbmps, 2026, 10, TODAY, true)
eq(badMonth.done, 22, '坏习惯月历：未发生 22 天')
eq(badMonth.cells.find((c) => c.date === d(20))?.state, 'miss', '坏习惯 10月20日 = 发生（灰）')
eq(badMonth.cells.find((c) => c.date === d(19))?.state, 'done', '坏习惯 10月19日 = 未发生（绿）')

// ---- 全局聚合：两个好习惯 ----
const g2: VizHabit = { id: 'g2', name: '跑步', type: 'good', createdAt: '2026-10-01' }
const bmp2 = new YearBitmap(2026)
bmp2.set(dayOfYear(TODAY), true)
const both = new Map([
  [good.id, bmp],
  [g2.id, bmp2],
])
eq(countOn([good, g2], both, TODAY), 2, '全局：10月23日完成 2 个')
eq(countOn([good, g2], both, d(22)), 1, '全局：10月22日完成 1 个')

// ---- 暂停区间（v1.21）：暂停当天仍计入，区间内不计，恢复后重新计入 ----
const paused: VizHabit = {
  id: 'p1',
  name: '泡脚',
  type: 'good',
  createdAt: '2026-10-01',
  archivedAt: '2026-10-23',
  suspensions: [{ start: '2026-10-24' }],
}
eq(expectedOn([paused], '2026-10-23'), 1, '暂停当天仍计入期望（当天完成要保留）')
eq(expectedOn([paused], '2026-10-24'), 0, '暂停次日起不计入期望')
const pausedMonth = monthView([paused], new Map([[paused.id, new YearBitmap(2026)]]), 2026, 10, '2026-10-28', false)
eq(pausedMonth.cells.find((c) => c.date === '2026-10-24')?.state, 'na', '暂停后的日子在月历为 na（灰）')

const resumed: VizHabit = {
  id: 'p2',
  name: '英语',
  type: 'good',
  createdAt: '2026-10-01',
  suspensions: [{ start: '2026-10-10', end: '2026-10-15' }],
}
eq(expectedOn([resumed], '2026-10-09'), 1, '暂停前仍计入期望')
eq(expectedOn([resumed], '2026-10-12'), 0, '暂停中不计入期望')
eq(expectedOn([resumed], '2026-10-16'), 1, '恢复后重新计入期望')

// ---- v1.38：颜色 / 图标选项与收藏品稀有度规则 ----
eq(COLORS.length, 18, '颜色选项 = 18 个')
eq(new Set(COLORS.map((c) => c.value)).size, 18, '颜色值无重复')
eq(ICONS.filter(Boolean).length, 40, '图标选项 = 40 个')
eq(new Set(ICONS.filter(Boolean)).size, 40, '图标无重复')
eq(ICONS.includes('💰') && ICONS.includes('💵') && ICONS.includes('🪙'), true, '含钱袋 / 钞票 / 硬币图标')
eq(collectibleOdds(false), { N: 0.7, R: 0.25, SSR: 0.05 }, '普通完美一天：普通 70% / 稀有 25% / 史诗 5%')
eq(collectibleOdds(true), { N: 0.15, R: 0.55, SSR: 0.3 }, '里程碑日：稀有与史诗概率提升')
eq(collectibleOdds(false).N > collectibleOdds(true).N, true, '完美一天只提升普通收藏概率')
eq(collectibleOdds(false).SSR < collectibleOdds(true).SSR, true, '史诗概率只在里程碑提升')
eq(rollCollectible(false, () => 0.5).item.rarity, 'N', '普通完美一天 r=0.5 → 普通收藏')
eq(rollCollectible(false, () => 0.01).item.rarity, 'SSR', '普通完美一天 r=0.01 → 史诗（小概率仍在）')
eq(rollCollectible(true, () => 0.01).item.rarity, 'SSR', '里程碑 r=0.01 → 史诗')
eq(isMilestone(7), true, '连续 7 天是阶段性日期')
eq(isMilestone(8), false, '连续 8 天不是阶段性日期')

if (failed > 0) {
  console.error(`\n${failed} 项断言失败`)
  process.exit(1)
}
console.log('\n全部断言通过')
