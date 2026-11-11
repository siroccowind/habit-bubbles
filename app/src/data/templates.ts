// 模板与选项数据
// 模板自带预设图标与颜色：点一下即创建，不需要用户选

export interface ColorOpt {
  name: string
  value: string
}

/** 习惯色：苹果 iOS 系统色 + 补充色，共 18 个（v1.38 扩充；前 10 个保持原顺序与色值） */
export const COLORS: ColorOpt[] = [
  { name: '红', value: '#FF3B30' },
  { name: '橙', value: '#FF9500' },
  { name: '黄', value: '#FFCC00' },
  { name: '绿', value: '#34C759' },
  { name: '青', value: '#30B0C7' },
  { name: '蓝', value: '#007AFF' },
  { name: '靛', value: '#5856D6' },
  { name: '紫', value: '#AF52DE' },
  { name: '粉', value: '#FF2D55' },
  { name: '灰', value: '#8E8E93' },
  { name: '薄荷', value: '#00C7BE' },
  { name: '天蓝', value: '#32ADE6' },
  { name: '亮黄', value: '#FFD60A' },
  { name: '亮绿', value: '#30D158' },
  { name: '深蓝', value: '#0A4D8F' },
  { name: '珊瑚', value: '#FF6482' },
  { name: '棕', value: '#A2845E' },
  { name: '石墨', value: '#636366' },
]

export interface Template {
  name: string
  icon: string
  color: string
}

/** 好习惯模板（12 个）：自带预设图标与颜色，点一下即创建 */
export const GOOD_TEMPLATES: Template[] = [
  { name: '早起', icon: '☀️', color: '#FF9500' },
  { name: '读书', icon: '📖', color: '#007AFF' },
  { name: '冥想', icon: '🧘', color: '#AF52DE' },
  { name: '写作', icon: '✍️', color: '#5856D6' },
  { name: '跑步', icon: '🏃', color: '#34C759' },
  { name: '英语', icon: '🔤', color: '#30B0C7' },
  { name: '早睡', icon: '🌙', color: '#5856D6' },
  { name: '健身', icon: '💪', color: '#FF3B30' },
  { name: '复盘', icon: '📝', color: '#FF9500' },
  { name: '行善', icon: '❤️', color: '#FF2D55' },
  { name: '泡脚', icon: '🦶', color: '#FFCC00' },
  { name: '微笑', icon: '😊', color: '#FFCC00' },
]

/** 坏习惯模板（8 个）：暗影区记录用 */
export const BAD_TEMPLATES: Template[] = [
  { name: '手机', icon: '📱', color: '#8E8E93' },
  { name: '熬夜', icon: '🌙', color: '#5856D6' },
  { name: '波动', icon: '🌊', color: '#30B0C7' },
  { name: '负面情绪', icon: '🌧️', color: '#007AFF' },
  { name: '拖延', icon: '⏳', color: '#FF9500' },
  { name: '久坐', icon: '🪑', color: '#8E8E93' },
  { name: '吃零食', icon: '🍿', color: '#FF2D55' },
  { name: '冲动消费', icon: '💸', color: '#FF3B30' },
]

/**
 * 自定义时的图标候选：40 个常用图标 + 首项「无」（共 41 个按钮）。
 * v1.38 扩充：保留原有 16 个（已创建习惯里的图标仍能重新选中），新增 24 个，
 * 其中包含钱袋 / 钞票 / 硬币 / 红包等金钱类。
 */
export const ICONS = [
  '',
  // 原有 16 个，顺序不变
  '☀️', '🧘', '🏃', '📖', '💧', '🛏️', '🏋️', '📝',
  '✏️', '📵', '🍚', '⭐', '🌙', '🛒', '🍪', '⏳',
  // 金钱 / 财务
  '💰', '💵', '🪙', '💳', '💲', '🧧', '🏦', '📈',
  // 自然 / 心情
  '🌱', '🌸', '🌈', '✨', '🔥', '❤️', '😊', '🙏',
  // 运动 / 学习 / 生活
  '🚶', '💪', '🚴', '🏊', '🎯', '⏰', '📚', '🥗',
]
