import React, { useState, useEffect } from 'react';
import '../css/SystemModal.css';

const USER_PRIORITY = 1;

export default function SystemSettingModal({show, onClose, onReset, handleSave}) {

    if (!show) return null;

    const [formData, setFormData] = useState({
        expireTime: "",
    });

    useEffect(() => {
        fetch("/system_settings")
        .then((res) => res.json())
        .then((data) => {
            console.log("data:", data);
            setFormData((prev) => ({
                ...prev,
                ["expireTime"]: data.expire_time
            }));
        })
        .catch(err => console.error("Fetch /system_settings 失敗:", err));
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };

    return (
        <div className="modal-dialog modal-dialog-centered">
            <div className="modal-body">
                <div className="section-toggle styled-toggle" data-bs-toggle="collapse" data-bs-target="#systemSettingCollapse"
                    role="button" aria-expanded="true" aria-controls="systemSettingCollapse">
                    <h5 className="toggle-title">
                        <i className="fas fa-chevron-down me-2 rotate-icon" data-target="#systemSettingCollapse"></i> 系統設定
                    </h5>
                </div>

                <div id="systemSettingCollapse" className="collapse show">
                    <div className="modal-body">
                        {/* 折疊區塊 */}
                        <div className="config-section">
                            <h5 className="toggle-title">
                                <i className="fas fa-chevron-down me-2 rotate-icon"></i>
                                工作站設定
                            </h5>
                            <div className="config-subitems">
                                <div className="mb-3">
                                    <label className="form-label">超時秒數 &nbsp;&nbsp;&nbsp;
                                    <input
                                        type="text"
                                        id="expireTime"
                                        name="expireTime"
                                        value={formData.expireTime}
                                        onChange={handleChange}
                                        className="form-control w-auto"
                                        style={{ width: "50%" }}
                                    />
                                    <span className="me-2">秒</span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div className="config-section">
                            <h5 className="toggle-title">
                                <i className="fas fa-chevron-down me-2 rotate-icon"></i>
                                AI模型配置
                            </h5>

                            <div className="config-subitems">
                                <div className="mb-3">
                                    <label className="form-label">模型版本</label>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">檢測閾值</label>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">模型準確度</label>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">模型更新通知</label>
                                </div>
                            </div>
                        </div>

                        <div className="config-section">
                            <h5 className="toggle-title">
                                <i className="fas fa-chevron-down me-2 rotate-icon"></i>
                                追蹤與提醒設定
                            </h5>
                        </div>

                        <div className="config-section">
                            <h5 className="toggle-title">
                                <i className="fas fa-chevron-down me-2 rotate-icon"></i>
                                遠程醫療設定
                            </h5>
                        </div>

                        <div className="config-section">
                            <h5 className="toggle-title">
                                <i className="fas fa-chevron-down me-2 rotate-icon"></i>
                                醫學資料庫管理
                            </h5>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        回上一頁
                    </button>
                    <button type="button" className="btn btn-primary" onClick={onReset}>
                        系統重設
                    </button>
                    <button type="button" className="btn btn-primary" onClick={(e) => handleSave(e, formData)}>
                        儲存設定
                    </button>
                </div>
            </div>
        </div>
    );
}