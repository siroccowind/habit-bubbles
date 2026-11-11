// 年份位图：每个习惯一年的打卡记录压缩为 366 bit = 46 字节
// 第 dayOfYear 位 = 1 表示当天完成（好习惯）/ 当天发生（坏习惯）

export const BITMAP_BYTES = 46 // ceil(366 / 8)

export class YearBitmap {
  readonly year: number
  private bits: Uint8Array

  constructor(year: number, from?: Uint8Array) {
    this.year = year
    this.bits = from ? new Uint8Array(from) : new Uint8Array(BITMAP_BYTES)
  }

  /** day 为 1..366（一年中的第几天） */
  set(day: number, v: boolean): void {
    const i = day >> 3
    const mask = 1 << (day & 7)
    if (v) this.bits[i] |= mask
    else this.bits[i] &= ~mask
  }

  get(day: number): boolean {
    return (this.bits[day >> 3] & (1 << (day & 7))) !== 0
  }

  /** POPCNT：置位数总和 */
  count(): number {
    let n = 0
    for (let i = 0; i < this.bits.length; i++) {
      let b = this.bits[i]
      while (b) {
        n += b & 1
        b >>= 1
      }
    }
    return n
  }

  raw(): Uint8Array {
    return this.bits
  }
}
