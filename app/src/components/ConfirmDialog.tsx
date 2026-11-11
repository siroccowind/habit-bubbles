interface Props {
  title: string
  message?: string
  confirmText?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** 应用内确认弹窗（不依赖 window.confirm，预览容器里也能用） */
export default function ConfirmDialog({
  title,
  message,
  confirmText = '确认',
  danger,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <div className="modal-mask" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-title">{title}</div>
        {message && <div className="modal-msg">{message}</div>}
        <div className="modal-actions">
          <button onClick={onCancel}>取消</button>
          <button className={danger ? 'danger-text' : 'primary-text'} onClick={onConfirm}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
