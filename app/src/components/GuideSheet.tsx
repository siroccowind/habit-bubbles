import { useRef, useState } from 'react'
import PageOverlay from './PageOverlay'
import { detectAddToHome } from './AddToHomeSheet'
import { promptInstall, useInstallState } from '../lib/install'

/**
 * 使用指南：新用户第一次用最需要知道的事——
 * 怎么放到桌面、数据存在哪、什么情况会丢、怎么保护、功能速览。
 * 安装部分：支持原生安装的浏览器（Android Chrome / 桌面 Chrome、Edge）可一键；
 * iOS Safari 无接口，退化为分步引导。
 */
export default function GuideSheet({ onClose }: { onClose: () => void }) {
  const overlayClose = useRef<(() => void) | null>(null)
  const doClose = () => (overlayClose.current ? overlayClose.current() : onClose())
  const { can, standalone } = useInstallState()
  const info = detectAddToHome()
  const [instMsg, setInstMsg] = useState('')

  async function install() {
    const r = await promptInstall()
    if (r === 'accepted') setInstMsg('已添加到桌面，回到桌面点图标就能打开。')
    else if (r === 'dismissed') setInstMsg('已取消。你也可以按下面的步骤手动添加。')
    else setInstMsg('当前浏览器不支持一键安装，请按下面的步骤手动添加。')
  }

  return (
    <PageOverlay from="bottom" onBack={onClose} closeRef={overlayClose}>
      <div className="sheet guide2-sheet">
        <div className="grab" />
        <div className="sheet-head">
          <span className="sheet-title">使用指南</span>
          <button className="sheet-close" onClick={doClose} aria-label="关闭">
            ×
          </button>
        </div>

        <div className="guide2-body">
          <section className="guide2-sec">
            <h3>1 · 放到桌面，像 App 一样用</h3>
            {standalone ? (
              <div className="guide-done">
                <span className="guide-done-ic">✓</span>
                <p>你已经在桌面打开它了，这一步不用再做。</p>
              </div>
            ) : (
              <>
                {can && (
                  <button className="guide-install-btn" onClick={() => void install()}>
                    一键添加到桌面
                  </button>
                )}
                <p className="guide-note">{info.intro}</p>
                <ol className="guide-steps">
                  {info.steps.map((s, i) => (
                    <li key={i}>
                      <span className="gs-n">{i + 1}</span>
                      <span className="gs-t">{s}</span>
                    </li>
                  ))}
                </ol>
                {info.tip && <p className="guide-tip">{info.tip}</p>}
                {instMsg && <p className="guide-tip">{instMsg}</p>}
              </>
            )}
          </section>

          <section className="guide2-sec">
            <h3>2 · 数据存在哪里</h3>
            <p>
              你的习惯和打卡记录只存在<strong>这台设备的这个浏览器里</strong>（本地数据库 + 本地存储），
              不会上传到任何服务器，我们也看不到。
            </p>
            <p>也就是说：它跟着「这个浏览器 + 这台设备」走，不会自动同步到别处，所以备份要靠你自己导出一份文件（下一步会说怎么存最稳）。</p>
          </section>

          <section className="guide2-sec warn">
            <h3>3 · 这些情况会把数据清掉</h3>
            <ul>
              <li>清除浏览器的「缓存 / 网站数据 / Cookie」</li>
              <li>用无痕（隐私）模式打开——关掉窗口就没了</li>
              <li>换浏览器、换手机、重装系统</li>
              <li>删除桌面图标 / 卸载这个「应用」（部分系统会连数据一起清）</li>
              <li>手机存储空间严重不足时，浏览器可能回收数据</li>
            </ul>
          </section>

          <section className="guide2-sec">
            <h3>4 · 怎么保护数据（建议都做）</h3>
            <ul>
              <li>
                <strong>放到桌面</strong>：从桌面打开更稳，不容易被当成临时网页清掉。
              </li>
              <li>
                <strong>定期导出 JSON</strong>：设置 → 数据与备份 → 导出 JSON。每次导出覆盖同一份就行，只占很小空间。
              </li>
              <li>
                <strong>iPhone 用户</strong>：导出后把文件存到「文件」App 里的 <strong>iCloud 云盘</strong>。换新 iPhone 登录同一 Apple ID 就能找到，用「从文件导入」恢复，既安全又方便。
              </li>
              <li>
                <strong>安卓用户</strong>：导出后存到「文件」管理器里一个固定的文件夹，或上传到 Google Drive / 其它网盘；换机后在新设备下载这个文件，再「从文件导入」。同样每次覆盖旧文件即可。
              </li>
              <li>
                <strong>换手机前</strong>：先导出最新的一份并确认已保存，再到新设备导入。
              </li>
            </ul>
          </section>

          <section className="guide2-sec">
            <h3>5 · 功能速览</h3>
            <ul>
              <li>
                <strong>两种打卡形式</strong>：气泡或列表，在设置里切换。
              </li>
              <li>
                <strong>好习惯</strong>：点一下气泡/卡片即完成；<em>每天可撤销一次</em>。
              </li>
              <li>
                <strong>暗影区（坏习惯）</strong>：没发生不用记，本身就是好消息；发生了点一下，每天记一次。
              </li>
              <li>
                <strong>补记过去</strong>：点习惯页左上角日期旁的 ▾，选日期即可补记。
              </li>
              <li>
                <strong>收藏室</strong>：完成好习惯会掉小物件，集邮一样收集。
              </li>
              <li>
                <strong>统计</strong>：左右滑切换好 / 坏习惯，点某一天看当天明细。
              </li>
              <li>
                <strong>暂停习惯</strong>：不再计入、从列表隐藏，历史保留，可在设置里恢复。
              </li>
              <li>
                <strong>数量上限</strong>：好习惯最多 6 个、坏习惯最多 3 个，专注才能养成。
              </li>
            </ul>
          </section>

          <p className="guide2-foot">这份指南随时可以在「设置 → 使用指南」里再打开。</p>
        </div>
      </div>
    </PageOverlay>
  )
}
