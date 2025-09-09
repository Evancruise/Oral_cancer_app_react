import React, { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import InnerHeader from '../components/InnerHeader';
import '../css/Table2.css'

const USER_PRIORITY = 1;

export default function HistoryManagePage() {
    const [uploader, setUploader] = useState("all");
    const [status, setStatus] = useState("all");
    const [category, setCategory] = useState("all");
    const [dateRange, setDateRange] = useState(""); // ✅ 預設空，顯示全部
    const [allRecord, setAllRecord] = useState([]);
    const [filtered, setFiltered] = useState([]);
    const [displayed, setDisplayed] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [checkRecord, setCheckRecord] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState(null);
    const [previews, setPreviews] = useState({url: {}, color: {}});
    const pageSize = 5;

    const parts = [
        ["1", "上牙齦"],
        ["2", "上顎"],
        ["3", "右頰"],
        ["4", "舌右"],
        ["5", "舌左"],
        ["6", "左頰"],
        ["7", "舌下"],
        ["8", "下牙齦"],
    ];

    function export_data(e) {
        e.preventDefault();

        const exportRows = filtered.length > 0 ? filtered : allRecord;
        console.log("exportRows:", exportRows);

        fetch("/export_data", {
            method: "POST",
            headers: {   // ✅ 修正 header → headers
                "Content-Type": "application/json",
            },
            body: JSON.stringify(exportRows),
        })
        .then((res) => {
            if (!res.ok) throw new Error("Export failed");
            return res.blob();
        })
        .then((blob) => {
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "record.xlsx";
            document.body.appendChild(a);
            a.click();
            a.remove();
        })
        .catch((err) => {
            console.error("Export error:", err);
        });
    }

    function isWithinDateRange(dateStr, rangeStr) {
        if (!rangeStr) return true;
        // ✅ 支援 "-" 或 "~"
        const [startStr, endStr] = rangeStr.split(/[-~]/).map(s => s.trim().replace(/\//g, "-"));
        if (!startStr || !endStr) return true;

        const date = new Date(dateStr);
        const start = new Date(startStr);
        const end = new Date(endStr);

        return date >= start && date <= end;
    }

    function chunkArray(array, size) {
        const result = [];
        for (let i = 0; i < array.length; i += size) {
            result.push(array.slice(i, i + size));
        }
        return result;
    }

    function renderTable(page = 1) {
        console.log("allRecord:", allRecord);
        console.log("dateRange:", dateRange);

        const data = allRecord.filter(r =>
            (dateRange ? isWithinDateRange(r.uploaded.split(" ")[0], dateRange) : true) &&
            (uploader !== "all" ? r.user === uploader : true) &&
            (status !== "all" ? r.status === status : true) &&
            (category !== "all" ? r.category === category : true) // ✅ 修正拼字
        );
        console.log("過濾後 data:", data);

        setFiltered(data);
        setCurrentPage(page);

        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        setDisplayed(data.slice(start, end));
    }

    // ✅ 監聽 displayed，避免 setState 非同步 debug 不到
    useEffect(() => {
        console.log("最新的 displayed:", displayed);
    }, [displayed]);

    // 當 filter 條件變動時重新 render
    //useEffect(() => {
    //    renderTable(1);
    //}, [allRecord, uploader, status, category, dateRange]);

    useEffect(() => {
        fetch("/all_record")
        .then((res) => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
        })
        .then((data) => {
            const recordsArray = Object.entries(data.grouped_records).map(([key, value]) => ({
                id: key,
                ...value
            }));

            console.log("recordsArray:", recordsArray);

            setAllRecord(recordsArray);
            renderTable(1); // ✅ 初始化顯示第一頁
        })
        .catch((err) => {
            console.error("Fetch /all_record 失敗:", err);
        });
    }, []);

    return (
    <>
        <div className="app-container">
            {/* Sidebar Rendering */}
            <Sidebar priority={USER_PRIORITY} />

            <div className="main-layout">
                <Header title="病歷紀錄管理"/>
                <div className="main-content">
                <InnerHeader/>
                    {!checkRecord && 
                        <>
                            <div className="filters">
                                <div className="field">
                                    <label>上傳日期</label>
                                    <input className="input" type="text" id="dateRange" placeholder="2024/06/24-2024/09/24" onChange={(e) => setDateRange(e.target.value)} />
                                </div>
                                <div className="field">
                                    <label>上傳帳號</label>
                                    <select id="uploader" value={uploader} onChange={(e) => setUploader(e.target.value)}>
                                        <option value="all">全部</option>
                                        {allRecord.length > 0 ? (
                                            allRecord.map((r, idx) => (
                                                <option key={idx} value={ r.user }> { r.user } </option>
                                            ))) : (<option value="none"> 無 </option>)
                                        }
                                    </select>
                                </div>
                                <div className="field">
                                    <label>分析狀態</label>
                                    <select id="status" value={status} onChange={(e) => setStatus(e.target.value)}>
                                        <option value="all">全部</option>
                                        <option value="done">已完成</option>
                                        <option value="pending">未完成</option>
                                        <option value="not_started">未開始</option>
                                    </select>
                                </div>
                                <div className="field">
                                    <label>辨識分類結果標籤</label>
                                    <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
                                        <option value="all">全部</option>
                                        <option value="none"> 健康無病灶</option>
                                        <option value="green">綠燈 (輕微等級)</option>
                                        <option value="yellow">黃燈 (疑似嚴重等級)</option>
                                        <option value="red">紅燈 (嚴重等級)</option>
                                    </select>
                                </div>
                                <div className="btn-row">
                                    <button type="button" className="btn btn-warning"> 匯入 </button>
                                    <button type="button" className="btn btn-primary" id="btn-search" onClick={() => renderTable(1)}>查詢</button>
                                    <button type="submit" id="export_data" name="action" value="export" className="btn btn-danger" onClick={ export_data }> 匯出 </button>
                                </div>
                            </div>
                            <div className="table-record-wrap">
                                <table id="dataTable" aria-label="上傳紀錄表格">
                                    <thead>
                                        <tr>
                                            <th style={{ width: "16%" }}>影像案例編號</th>
                                            <th style={{ width: "16%" }}>建立日期</th>
                                            <th style={{ width: "17%" }}>上傳日期</th>
                                            <th style={{ width: "12%" }}>上傳人員</th>
                                            <th style={{ width: "12%" }}>分析狀態</th>
                                            <th>備註</th>
                                            <th></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {displayed.length > 0 ? (
                                            displayed.map((r, idx) => (
                                                <tr key={idx}>
                                                    <td>{r.case}</td>
                                                    <td>{r.created}</td>
                                                    <td>{r.uploaded}</td>
                                                    <td>{r.user}</td>
                                                    <td>
                                                        {r.status === "done" ? (
                                                            <span className="badge green">已完成</span>
                                                        ) : r.status === "not_started" ? (
                                                            <span className="badge yellow">未開始</span>
                                                        ) : (
                                                            <span className="badge gray">未完成</span>
                                                        )}
                                                    </td>
                                                    <td>{r.notes || "-"}</td>
                                                    <td>
                                                        <button
                                                            type="button"
                                                            className="view_btn btn btn-sm btn-primary"
                                                            data-bs-toggle="modal"
                                                            data-bs-target="#viewAllRecordModal"
                                                            data-f-createtime={r.created ?? ""}
                                                            data-f-case={r.case ?? ""}
                                                            data-f-uploadtime={r.uploaded ?? ""}
                                                            data-f-user={r.user ?? ""}
                                                            data-f-status={r.status ?? ""}
                                                            data-f-notes={r.notes ?? ""}
                                                            onClick={() => { setSelectedRecord(r); setCheckRecord(true); } }
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
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="pagination">
                                <button type="button" disabled={currentPage === 1} onClick={() => renderTable(currentPage - 1)}>Prev</button>
                                    {Array.from({ length: Math.max(1, Math.ceil(filtered.length / pageSize)) }, (_, i) => i + 1).map(page => (
                                        <button type="button" key={page} className={page === currentPage ? "active" : ""} onClick={() => renderTable(page)}>
                                            {page}
                                        </button>
                                    ))}
                                <button type="button" disabled={currentPage === Math.ceil(filtered.length / pageSize)} onClick={() => renderTable(currentPage + 1)}>Next</button>
                            </div>
                        </>
                    }

                    {checkRecord && <div
                        className="modal fade"
                        id="viewAllRecordModal"
                        tabIndex="-1"
                        aria-labelledby="viewAllRecordModalLabel"
                        aria-hidden="true"
                        >
                        <div className="modal-dialog modal-lg">

                            <div className="section-toggle styled-toggle" data-bs-toggle="collapse" data-bs-target="#viewAllRecordCollapse"
                                role="button" aria-expanded="true" aria-controls="viewAllRecordCollapse">
                                <h5 className="toggle-title" id="viewAllRecordModalLabel">
                                    <i className="fas fa-chevron-down me-2 rotate-icon" data-target="#viewAllRecordCollapse"></i> 紀錄內容
                                </h5>
                            </div>

                            <div id="viewAllRecordCollapse" className="collapse show">
                                <div className="modal-body">
                                {selectedRecord ? (
                                <table className="table table-bordered">
                                    <tbody>
                                    <tr>
                                        <th>影像案例編號</th>
                                        <td>{selectedRecord.case}</td>
                                    </tr>
                                    <tr>
                                        <th>建立日期</th>
                                        <td>{selectedRecord.created}</td>
                                    </tr>
                                    <tr>
                                        <th>上傳日期</th>
                                        <td>{selectedRecord.uploaded}</td>
                                    </tr>
                                    <tr>
                                        <th>上傳人員</th>
                                        <td>{selectedRecord.user}</td>
                                    </tr>
                                    <tr>
                                        <th>分析狀態</th>
                                        <td>
                                        {selectedRecord.status === "done" ? (
                                            <span className="badge green">已完成</span>
                                        ) : selectedRecord.status === "not_started" ? (
                                            <span className="badge yellow">未開始</span>
                                        ) : (
                                            <span className="badge gray">未完成</span>
                                        )}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th>影像結果</th>
                                        <td>
                                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                                            {chunkArray(parts, 2).map((row, rowIndex) => (
                                            <div 
                                                key={rowIndex} 
                                                style={{ display: "flex", justifyContent: "center" }}>
                                                {
                                                    row.map(([code, label]) => (
                                                        <div key={code} style={{ width: "140px", textAlign: "center" }}>
                                                            <img 
                                                                src={selectedRecord.img_names[code-1] || `/assets/guide/${code}.png`}
                                                                alt={label}
                                                                style={{ width: "100%", borderRadius: "6px", marginBottom: "5px", border: selectedRecord.img_names[code] ? `2px solid ${selectedRecord.img_names[code]}` : "2px solid transparent" }}
                                                                id={`select_${code}`}
                                                            />
                                                            <div style={{ fontSize: "14px", fontWeight: 500 }}>{label}</div>
                                                        </div>
                                                    ))
                                                }
                                            </div>
                                            ))}
                                        </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <th>備註</th>
                                        <td>
                                        <textarea
                                            className="form-control"
                                            value={selectedRecord.notes || "-"}
                                            readOnly
                                            rows={3}
                                        />
                                        </td>
                                    </tr>
                                    </tbody>
                                </table>
                                ) : (
                                <p>尚未選擇紀錄</p>
                                )}
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" onClick={() => setCheckRecord(false)}>
                            關閉
                            </button>
                        </div>
                    </div>
                    </div>
                    }
                </div>

                <div className="footer">
                    <a href="#" style={{ textDecoration: "none", fontWeight: "800", color: "#3aa3d1" }}>Mi-tech</a> Copyright © 2019
                </div>
            </div>
        </div>
    </>);
}