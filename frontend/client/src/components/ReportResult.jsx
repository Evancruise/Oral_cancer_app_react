import React, { useState, useEffect } from 'react'
import '../css/App.css'

export default function ReportResult({show, patient_id, onClose}) {

    if (!show) return null;

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

    const [previews, setPreviews] = useState({url: {}, color: {}});

    console.log("patient_id:", patient_id);

    useEffect(() => {
        fetch(`/retrieve_result_imgs/${patient_id}`)
        .then(res => res.json())
        .then(data => {
            console.log(data);

            if (data.exist === "yes") {
                const newPreviews = {"url": {}, "color": {}};
                for (let i = 0; i < data.url.length; i++) {
                    const code = String(i + 1);   // 確保和 parts 的 code ("1" ~ "8") 一致
                    newPreviews.url[code] = data.url[i];
                    newPreviews.color[code] = data.color[i];
                }
                setPreviews(newPreviews);  // ✅ 正確更新
            }

            console.log("previews:", previews);
        })
        .catch(err => console.error(`Fetch /retrieve_result_imgs/${patient_id} 失敗:`, err));
    }, []);

    function chunkArray(array, size) {
        const result = [];
        for (let i = 0; i < array.length; i += size) {
            result.push(array.slice(i, i + size));
        }
        return result;
    }

    return (
        <>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-body">
                    <div className="section-toggle styled-toggle" data-bs-toggle="collapse" data-bs-target="#visualResultCollapse"
                        role="button" aria-expanded="true" aria-controls="visualResultCollapse">
                        <h5 className="toggle-title">
                            <i className="fas fa-chevron-down me-2 rotate-icon"></i> 結果圖
                        </h5>
                    </div>

                    <div id="visualResultCollapse" className="collapse show">
                        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                            {chunkArray(parts, 2).map((row, rowIndex) => (
                            <div 
                                key={rowIndex} 
                                style={{ display: "flex", justifyContent: "center" }}>
                                {
                                    row.map(([code, label]) => (
                                        <div key={code} style={{ width: "140px", textAlign: "center" }}>
                                            <img 
                                                src={previews.url[code] || `/assets/guide/${code}.png`}
                                                alt={label}
                                                style={{ width: "100%", borderRadius: "6px", marginBottom: "5px", border: previews.color[code] ? `2px solid ${previews.color[code]}` : "2px solid transparent" }}
                                                id={`preview_${code}`}
                                            />
                                            <div style={{ fontSize: "14px", fontWeight: 500 }}>{label}</div>
                                        </div>
                                    ))
                                }
                            </div>
                            ))}
                        </div>
                    </div>

                    <div className="section-toggle styled-toggle" data-bs-toggle="collapse" data-bs-target="#descResultCollapse"
                        role="button" aria-expanded="true" aria-controls="descResultCollapse">
                        <h5 className="toggle-title">
                            <i className="fas fa-chevron-down me-2 rotate-icon"></i> 診斷報告
                        </h5>
                    </div>

                    <div id="descResultCollapse" className="collapse show">
                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="form-label"> 診斷說明 </label>
                                <textarea name="results" className="form-control"></textarea>
                            </div>
                            <div className="mb-3">
                                <label className="form-label"> 建議 </label>
                                <textarea name="suggestion" className="form-control"></textarea>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn btn-secondary" onClick={onClose}>
                    回上一頁
                    </button>
                </div>
            </div>
        </>
    );
}