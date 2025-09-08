import '../css/Modal.css'

export default function Modal({ 
  title = "提示", 
  message = "這是一個訊息", 
  onClose, 
  onConfirm, 
  show 
}) {
  if (!show) return null; // ✅ 不顯示時直接 return

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="modal-actions">
          <button onClick={onClose}>關閉</button>
          {onConfirm && <button onClick={onConfirm}>確定</button>}
        </div>
      </div>
    </div>
  );
}