import React, { useState, useEffect } from 'react'
import Modal from "./showModal.jsx";
import '../css/Modal.css'

export default function ProgessModal({
  title = "提示", 
  message = "這是一個訊息", 
  onClose, 
  onConfirm, 
  show
}) {
    console.log("progressmodal triggerred!");
    const [progress, setProgress] = useState(0);
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: "", message: "" });

    console.log("progress:", progress);

    useEffect(() => {
        const timer = setInterval(() => {
        setProgress((oldProgress) => {
            if (oldProgress >= 100) {
                clearInterval(timer);
                document.getElementById("modal-progress").style.display="none";
                setModalConfig({
                    title: "辨識完成訊息",
                    message: "辨識完成"
                });
                setShowModal(true);
                return 100;
            } else {
                document.getElementById("modal-progress").style.display="flex";
            }
            return oldProgress + 10;
        });
        }, 500);
        return () => clearInterval(timer);
    }, []);

    return (
        <>
        <div className="modal-overlay" id="modal-progress" style={{ display: "flex" }}>
            <div className="modal">
                <h3>{title}</h3>
                <p>{message}</p>
                <div className="progress-container">
                    <div className="progress-bar" style={{ width: `${progress}%` }}>
                        {progress}%
                    </div>
                </div>
                <div className="modal-actions">
                    <button onClick={onClose}>關閉</button>
                    {onConfirm && <button onClick={onConfirm}>確定</button>}
                </div>
            </div>
        </div>

        <Modal
              show={showModal}
              title={modalConfig.title}
              message={modalConfig.message}
              onClose={() => {setShowModal(false);}}
            />
        </>
    );
}