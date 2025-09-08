import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import Modal from '../components/showModal';

export default function ResetPwd() {

    const [newPwd, setNewPwd] = useState("");
    const [newSamePwd, setNewSamePwd] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: "", message: "" });

    const navigate = useNavigate();

    const apply_reset_pwd = async (e) => {
        e.preventDefault();
        
        const res = await fetch("/apply_reset_password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ "new_password": newPwd, "new_same_password": newSamePwd })
        });

        const data = await res.json();
        console.log("後端回應:", data);

        if (data.status == "ok") {
            setModalConfig({
                title: "成功訊息",
                message: "更改密碼成功，請重新登入"
            });
            setShowModal(true);
        } else {
            setModalConfig({
                title: "失敗訊息",
                message: data.message,
            });
            setShowModal(true);
        }
    }

    return (
        <>
            <div>
                <div className="login-container">
                    <label className="form-label">新密碼</label>
                    <input type="password" id="new_password" className="form-control" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required />

                    <label className="form-label">再次輸入新密碼</label>
                    <input type="password" id="new_same_password" className="form-control" value={newSamePwd} onChange={(e) => setNewSamePwd(e.target.value)} required />

                    <button type="submit" className="btn-submit" onClick={(e) => apply_reset_pwd(e)}>變更密碼</button>
                </div>
            </div>

            <Modal
                show={showModal}
                title={modalConfig.title}
                message={modalConfig.message}
                onClose={() => {setShowModal(false); navigate('/');}}
            />
        </>
    );
}