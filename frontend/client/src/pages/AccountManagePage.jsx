import React, { useState, useEffect } from 'react';
import Modal from "../components/showModal.jsx";
import Sidebar from "../components/Sidebar.jsx";
import Header from "../components/Header.jsx";
import InnerHeader from "../components/InnerHeader.jsx";
import SystemSettingModal from "../components/SystemSettingModal.jsx";

const USER_PRIORITY = 1;

export default function AccountManagePage() {

    const [showUserForm, setShowUserForm] = useState(false);
    const [allAccounts, setAllAccounts] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [displayed, setDisplayed] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: "", message: "" });
    const [checkAccount, setCheckAccount] = useState(false);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [showsystemSetting, setShowSystemSetting] = useState(false);
    const pageSize = 5;

    const [formData, setFormData] = useState({
        account: "",
        name: "",
        password: "",
        unit: "",
        role: "system manager",
        status: "activated",
        note: "",
        action: ""
    });

    const handleSystemSettingSave = async (e, data) => {
        e.preventDefault();

        console.log("data:", data);

        const res = await fetch("/apply_system_settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data),
        });

        const result = await res.json();
        console.log(result);

        if (result.status == "ok") {
            setModalConfig({
                title: "修改系統設定訊息",
                message: "修改系統設定成功"
            });
            setShowModal(true);
        } else {
            setModalConfig({
                title: "修改系統設定訊息",
                message: "修改系統設定失敗，請再試一次"
            });
            setShowModal(true);
        }
    }

    function handleReset() {
        fetch("/reset")
        .then((res) => res.json())
        .then((data) => {
            if (data.status == "ok") {
                setModalConfig({
                    title: "重設系統訊息",
                    message: "系統重設成功"
                });
                setShowModal(true);
            }
        }).catch(err => {console.error(err);})
    }

    function renderTable(page = 1, input_data = "") {
        
        const data = input_data ?? allAccounts;

        console.log("data:", data);
        /*
        篩選搜尋條件
        */
        setFiltered(data);
        setCurrentPage(page);

        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        console.log("data:", data);
        setDisplayed(data.slice(start, end));
    }

    useEffect(() => {
        console.log("最新的 displayed:", displayed);
    }, [displayed]);

    useEffect(() => {
        fetch("/all_account")
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then((data) => {
            const accountsArray = Object.entries(data.all_account_dict).map(([key, value]) => ({
                id: key,
                ...value
            }));

            setAllAccounts(accountsArray);
            setDisplayed(accountsArray);

            renderTable(1, accountsArray);
        })
        .catch((err) => {
            console.error("Fetch /all_account 失敗:", err);
        });
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({
            ...prev,
            [name.replace("f_", "")]: value
        }));
    };

    const handleSave = async (action, selectedAccount=null) => {
        let res = null;

        if (selectedAccount != null) {
            const payload = { ...selectedAccount, action };
            console.log("payload:", payload);
            console.log("selectedAccount:", selectedAccount);

            res = await fetch("/apply_change_account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
        }
        else {
            const payload = { ...formData, action };

            console.log("payload:", payload);

            res = await fetch("/apply_change_account", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
        }   

        const result = await res.json();
        console.log(result);

        if (result.status === "ok") {
            setModalConfig({
                title: `${result.action}紀錄`,
                message: `${result.action}記錄成功！`
            });
            setShowModal(true);
            setShowUserForm(false);
            setCheckAccount(false);

            fetch("/all_account") // 確保 session cookie 帶上
            .then((res) => res.json())
            .then((data) => {
                    const accountsArray = Object.entries(data.all_account_dict).map(([key, value]) => ({
                    id: key,
                    ...value
                }));

                console.log("accountsArray:", accountsArray);

                setAllAccounts(accountsArray);
                renderTable(1, accountsArray);
            })
            .catch((err) => {
                console.error("Fetch /all_account 失敗:", err);
            });
        } else {
            setModalConfig({
                title: `${result.action}紀錄`,
                message: `${result.action}記錄失敗！請再試一次`
            });
            setShowModal(true);
        }
    };

    return (
        <>
        <div className="app-container">
            {/* Sidebar Rendering */}
            <Sidebar priority={USER_PRIORITY} />

            <div className="main-layout">
            <Header title="帳號管理" />
            <div className="main-content">
                <InnerHeader />

                {!showsystemSetting && !showUserForm && !checkAccount && (
                <>
                    <div className="bar">
                        <div className="group">
                            <button
                            type="button"
                            className="btn btn-chip"
                            id="btn-setting"
                            onClick={() => setShowSystemSetting(true)}
                            >
                            <span className="i">⚙️</span>系統設定
                            </button>
                            <button
                            type="button"
                            className="btn btn-chip"
                            id="btn-account"
                            >
                            <span className="i">🧩</span>帳號管理
                            </button>

                            <button
                            type="button"
                            className="btn btn-blue"
                            id="btn-add"
                            onClick={() => setShowUserForm(true)}
                            >
                            <span className="i">🧑‍💼</span>新增使用者
                            </button>
                        </div>
                    </div>

                    <div className="table-wrap">
                        <table id="userTable" aria-label="使用者清單">
                            <thead>
                            <tr>
                                <th style={{ width: "9%" }}>帳號</th>
                                <th style={{ width: "8%" }}>姓名</th>
                                <th style={{ width: "8%" }}>密碼</th>
                                <th style={{ width: "15%" }}>單位</th>
                                <th style={{ width: "12%" }}>身分</th>
                                <th style={{ width: "6%" }}>狀態</th>
                                <th style={{ width: "20%" }}>備註</th>
                                <th></th>
                            </tr>
                            </thead>
                            <tbody>
                                {displayed.length > 0 ? (
                                    displayed.map((r, idx) => (
                                        <tr key={idx}>
                                            <td>{r.account}</td>
                                            <td>{r.name}</td>
                                            <td>{r.password}</td>
                                            <td>{r.unit}</td>
                                            <td>{r.role === "systen manager" ? (
                                                    <span className="badge green">系統管理者</span>
                                                ) : r.role === "resource manager" ? (
                                                    <span className="badge green">資源管理者</span>
                                                ) : (
                                                    <span className="badge green">試用者</span>
                                                )}
                                            </td>
                                            <td>
                                                {r.status === "done" ? (
                                                    <span className="badge green">已完成</span>
                                                ) : r.status === "not_started" ? (
                                                    <span className="badge yellow">未開始</span>
                                                ) : (
                                                    <span className="badge gray">未完成</span>
                                                )}
                                            </td>
                                            <td>{r.note}</td>
                                            <td>
                                                <button
                                                    type="button"
                                                    className="view_btn btn btn-sm btn-primary"
                                                    data-bs-toggle="modal"
                                                    data-bs-target="#viewAccountModal"
                                                    data-f-account={r.account ?? ""}
                                                    data-f-name={r.name ?? ""}
                                                    data-f-password={r.password ?? ""}
                                                    data-f-unit={r.unit ?? ""}
                                                    data-f-role={r.role ?? ""}
                                                    data-f-note={r.note ?? ""}
                                                    onClick={() => { setSelectedAccount(r); setCheckAccount(true); } }
                                                >
                                                    查看
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="8" style={{ textAlign: "center" }}>目前沒有紀錄</td>
                                    </tr>
                                )
                                }
                            </tbody>
                        </table>

                        <div className="pagination" id="pagination">
                            <button type="button" disabled={currentPage === 1} onClick={() => renderTable(currentPage - 1)}>Prev</button>
                                {Array.from({ length: Math.max(1, Math.ceil(filtered.length / pageSize)) }, (_, i) => i + 1).map(page => (
                                    <button type="button" key={page} className={page === currentPage ? "active" : ""} onClick={() => renderTable(page, displayed)}>
                                        {page}
                                    </button>
                            ))}
                            <button type="button" disabled={currentPage === Math.ceil(filtered.length / pageSize)} onClick={() => renderTable(currentPage + 1)}>Next</button>
                        </div>
                    </div>
                </>
                )}

                {!showsystemSetting && !showUserForm && checkAccount && (<div 
                        className="modal fade"
                        id="viewAccountModal"
                        tabIndex="-1"
                        aria-labelledby="viewAccountModalLabel"
                        aria-hidden="true">
                    <div className="modal-dialog modal-lg">
                        <div className="section-toggle styled-toggle" data-bs-toggle="collapse" data-bs-target="#viewAccountCollapse"
                            role="button" aria-expanded="true" aria-controls="viewAccountCollapse">
                            <h5 className="toggle-title" id="viewAccountModalLabel">
                                <i className="fas fa-chevron-down me-2 rotate-icon" data-target="#viewAccountCollapse"></i> 使用者資訊
                            </h5>
                        </div>

                        <div id="viewAccountCollapse" className="collapse show">
                            <div className="modal-body">
                                {selectedAccount ? (
                                <table className="table table-bordered">
                                    <tbody>
                                        <tr>
                                            <th>帳號</th>
                                            <td>{selectedAccount.account}</td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <th>姓名</th>
                                            <td>{selectedAccount.name}</td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <th>密碼</th>
                                            <td>{selectedAccount.password}</td>
                                            <td> <button type="button"> 重設密碼授權 </button> </td>
                                        </tr>
                                        <tr>
                                            <th>單位</th>
                                            <td>{selectedAccount.unit}</td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <th>身分</th>
                                            <td>{selectedAccount.role === "systen manager" ? (
                                                    <span className="badge green">系統管理者</span>
                                                ) : selectedAccount.role === "resource manager" ? (
                                                    <span className="badge green">資源管理者</span>
                                                ) : (
                                                    <span className="badge green">試用者</span>
                                                )}
                                            </td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <th>狀態</th>
                                            <td>
                                                {selectedAccount.status === "done" ? (
                                                    <span className="badge green">已完成</span>
                                                ) : selectedAccount.status === "not_started" ? (
                                                    <span className="badge yellow">未開始</span>
                                                ) : (
                                                    <span className="badge gray">未完成</span>
                                                )}
                                            </td>
                                            <td></td>
                                        </tr>
                                        <tr>
                                            <th>備註</th>
                                            <td>{selectedAccount.note}</td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                </table>
                                ) : (
                                    <p>尚未選擇紀錄</p>
                                )}
                            </div>
                        </div>
                        
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                data-bs-dismiss="modal"
                                onClick={() => setCheckAccount(false)}
                            >
                                回上一頁
                            </button>

                            <button 
                                type="button" 
                                className="btn btn-secondary" 
                                data-bs-dismiss="modal" 
                                onClick={() => handleSave("delete", selectedAccount)}>
                                刪除
                            </button>
                        </div>
                    </div>
                </div>
                )}

                {!showsystemSetting && !checkAccount && showUserForm && (
                <div className="modal-dialog modal-dialog-centered">
                    <div className="modal-body">
                    <div
                        className="section-toggle styled-toggle"
                        data-bs-toggle="collapse"
                        data-bs-target="#newAccountModalCollapse"
                        role="button"
                        aria-expanded="true"
                        aria-controls="newAccountModalCollapse"
                    >
                        <h5 className="toggle-title" id="newAccountModalLabel">
                        <i
                            className="fas fa-chevron-down me-2 rotate-icon"
                            data-target="#newAccountModalCollapse"
                        ></i>{" "}
                        新增使用者資訊
                        </h5>
                    </div>

                    <div
                        id="newAccountModalCollapse"
                        className="collapse show"
                    >
                        <div className="modal-body">
                        <div className="mb-3">
                            <label className="form-label" htmlFor="f_account">
                            帳號
                            </label>
                            <input
                            type="text"
                            name="account"
                            id="f_account"
                            className="form-control"
                            placeholder="example@gmail.com"
                            value={formData.account ?? ""}
                            onChange={handleChange}
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label" htmlFor="f_name">
                            姓名
                            </label>
                            <input
                            type="text"
                            name="name"
                            id="f_name"
                            className="form-control"
                            value={formData.name ?? ""}
                            onChange={handleChange}
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label" htmlFor="f_password">
                            密碼
                            </label>
                            <input
                            type="password"
                            name="password"
                            id="f_password"
                            className="form-control"
                            value={formData.password ?? ""}
                            onChange={handleChange}
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label" htmlFor="f_unit">
                            單位
                            </label>
                            <input
                            type="text"
                            name="unit"
                            id="f_unit"
                            className="form-control"
                            value={formData.unit ?? ""}
                            onChange={handleChange}
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label" htmlFor="f_role">
                            身分
                            </label>
                            <select 
                            name="role" 
                            id="f_role" 
                            className="form-select" 
                            value={formData.role ?? ""}
                            onChange={handleChange}
                            >
                                <option value="system manager">系統管理者</option>
                                <option value="resource manager">資源管理者</option>
                                <option value="tester">試用者</option>
                            </select>
                        </div>
                        <div className="col-6">
                            <label className="form-label" htmlFor="f_status">
                            狀態
                            </label>
                            <select
                            name="status"
                            id="f_status"
                            className="form-select"
                            value={formData.status ?? ""}
                            onChange={handleChange}
                            >
                                <option value="activated">啟用</option>
                                <option value="deactivated">停用</option>
                            </select>
                        </div>
                        <div className="col-12">
                            <label className="form-label" htmlFor="f_note">
                            備註
                            </label>
                            <textarea
                            name="note"
                            id="f_note"
                            className="form-control"
                            rows="3"
                            value={formData.note ?? ""}
                            onChange={handleChange}
                            ></textarea>
                        </div>
                        </div>
                        <div className="mt-3 d-flex gap-2 justify-content-end">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            data-bs-dismiss="modal"
                            onClick={() => setShowUserForm(false)}
                        >
                            取消
                        </button>
                        <button type="button" className="btn btn-primary" onClick={() => handleSave("add")}>
                            新增
                        </button>
                        </div>
                    </div>
                    </div>
                </div>
                )}

                {showsystemSetting && !checkAccount && !showUserForm && 
                    <SystemSettingModal 
                        show={showsystemSetting}
                        onClose={() => {setShowSystemSetting(false)}}
                        onReset={handleReset}
                        handleSave={handleSystemSettingSave}
                    />
                }
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
          onClose={() => setShowModal(false)}
        />
        </>
    );
}