import { useRef } from 'react'
import PageOverlay from './PageOverlay'

/** iOS 体感授权说明：短步骤，放在小弹层里，不在设置行里铺长文 */
export default function MotionHelpSheet({ onClose }: { onClose: () => void }) {
  const overlayClose = useRef<(() => void) | null>(null)
  const doClose = () => (overlayClose.current ? overlayClose.current() : onClose())

  return (
    <PageOverlay from="bottom" onBack={onClose} closeRef={overlayClose}>
      <div className="sheet">
        <div className="grab" />
        <div className="sheet-head">
          <span className="sheet-title">开启体感</span>
          <button className="sheet-close" onClick={doClose} aria-label="关闭">
            ×
          </button>
        </div>

        <p className="guide-note">iPhone 需要允许一次「动作与方向」权限，体感才会生效。</p>

        <ol className="guide-steps">
          <li>
            <span className="gs-n">1</span>
            <span className="gs-t">点一下屏幕，弹窗里选「允许」。</span>
          </li>
          <li>
            <span className="gs-n">2</span>
            <span className="gs-t">没看到弹窗？把「体感」开关关掉再打开一次。</span>
          </li>
          <li>
            <span className="gs-n">3</span>
            <span className="gs-t">如果之前拒绝过：设置 → Safari → 运动与方向访问 → 打开。</span>
          </li>
        </ol>

        <p className="guide-tip">苹果不提供持久授权，重新打开应用时要再允许一次；这是系统限制，不是设置丢了。</p>
      </div>
    </PageOverlay>
  )
}
