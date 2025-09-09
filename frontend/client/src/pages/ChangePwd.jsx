import React, { useState } from 'react'
import { useNavigate } from "react-router-dom";
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import Modal from '../components/showModal';
import '../css/App.css'
import InnerHeader from '../components/InnerHeader';

const USER_PRIORITY = 1;

export default function ChangePwd() {

    const [oldPwd, setOldPwd] = useState("");
    const [newPwd, setNewPwd] = useState("");
    const [newSamePwd, setNewSamePwd] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: "", message: "" });

    const navigate = useNavigate();

    const apply_change_pwd = async (e) => {
        e.preventDefault();

        try {
            const res = await fetch("/apply_change_password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    old_password: oldPwd,
                    new_password: newPwd,
                    new_same_password: newSamePwd,
                }),
            });

            const data = await res.json();
            
            if (data.status === "ok") {
                setModalConfig({
                    title: "成功訊息",
                    message: "更改密碼成功，請重新登入"
                });
                setShowModal(true);
            } else {
                setModalConfig({
                    title: "失敗訊息",
                    message: data.message
                });
                setShowModal(true);
            }
        } catch(err) {
            console.error("Fetch /apply_change_password 失敗:", err)
        }
    };

    return (
        <>
        <div className="app-container">
            <Sidebar priority={USER_PRIORITY} />
            <div className="app-layout">
                <Header title="歷史紀錄"/>
                <div className="main-content">
                    <InnerHeader/>
                    <div className="change-pwd-container">
                        <form onSubmit={apply_change_pwd}>
                            <div className="form-group">
                                <label className="form-label">舊密碼</label>
                                <input type="password" id="old_password" className="form-control" value={oldPwd} onChange={(e) => setOldPwd(e.target.value)} required />

                                <label className="form-label">新密碼</label>
                                <input type="password" id="new_password" className="form-control" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required />

                                <label className="form-label">再次輸入新密碼</label>
                                <input type="password" id="new_same_password" className="form-control" value={newSamePwd} onChange={(e) => setNewSamePwd(e.target.value)} required />

                                <button type="submit" className="btn-submit" onClick={apply_change_pwd}>變更密碼</button>
                            </div>
                        </form>
                    </div>
                </div>
                <div className="footer">
                    <a href="#" style={{ textDecoration: "none", fontWeight: "800", color: "#3aa3d1" }}>Mi-tech</a> Copyright © 2019
                </div>
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