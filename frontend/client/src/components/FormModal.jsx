import React, { useState, useEffect, useLocation } from "react";
import Modal from "./showModal.jsx";
import ProgessModal from './progressModal.jsx';
import { useNavigate } from "react-router-dom";
import '../css/App.css'

export default function FormModal({ show, onClose, onCheckResult, recordContent, newPatiendId, onSubmit=null, discardPage=false, handleRevertDelete=null }) {

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

    const action = recordContent ? "edit" : "add";

    const [preview, setPreviews] = useState({});
    const [previewsUrl, setPreviewsUrl] = useState({});
    const [showModal, setShowModal] = useState(false);
    const [showProgressModal, setShowProgressModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: "", message: "" });  
    const [formData, setFormData] = useState({
        patient_id: "" || recordContent.patient_id || newPatiendId,
        name: "" || recordContent.name,
        gender: "" || recordContent.gender,
        age: "" || recordContent.age,
        notes: "" || recordContent.notes,
        file: "",
        code: "",
        all_imgs: ""
    });

    const navigate = useNavigate();

    if (!show) return null; // 不顯示就不渲染

    useEffect(() => {
        fetch(`/upload_imgs/${recordContent.patient_id}`)
        .then(res => res.json())
        .then(data => {
            console.log("data.url:", data.url);

            if (data.exist === "yes") {
                if (action == "edit") {
                  const newPreviews = {};
                  for (let i = 0; i < data.url.length; i++) {
                      const code = String(i + 1);   // 確保和 parts 的 code ("1" ~ "8") 一致
                      newPreviews[`img${code}`] = data.url[i];
                  }
                  console.log("newPreviews:", newPreviews);
                  setPreviewsUrl(newPreviews);  // ✅ 正確更新
                }
            }

            console.log("previewsUrl:", previewsUrl);
        })
        .catch(err => console.error("Fetch /upload_imgs 失敗:", err));
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const uploadImg = async (e, code) => {
        console.log("e.target:", e.target);
        const file = e.target.files[0];

        console.log(file);

        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setPreviews((prev) => ({
                    ...prev,
                    [`img${code}`]: ev.target.result, // 存成 base64
                }));
            };
            reader.readAsDataURL(file);
        }
        
        const formData_upload = new FormData();
        formData_upload.append("code", code);
        formData_upload.append("file", file);
        formData_upload.append("patient_id", formData.patient_id);
        console.log("code:", code);

        try {
            const res = await fetch("/upload", {
                method: "POST",
                body: formData_upload,
            });

            const data = await res.json();
            
            if (data.url) {
                setPreviewsUrl((prev) => ({
                    ...prev,
                    [`img${code}`]: data.url,
                }));
            } else {
                setModalConfig({
                    title: "錯誤訊息",
                    message: "上傳影像失敗，請再試一次"
                });
                setShowModal(true);
            }
        } catch (err) {
            setModalConfig({
                title: "錯誤訊息",
                message: "上傳影像發生錯誤，請再試一次"
            });
            setShowModal(true);
        }

        document.getElementById(`upload_${code}_2`).innerText = "已上傳";
    };

    const startInference = (e, formData) => {
        e.preventDefault();

        setShowProgressModal(true);

        setModalConfig({
            title: "進行辨識訊息",
            message: "正在進行辨識，請稍後"
        })
    }

    function chunkArray(array, size) {
        const result = [];
        for (let i = 0; i < array.length; i += size) {
            result.push(array.slice(i, i + size));
        }
        return result;
    }

    const handleSave = (action, e) => {
        e.preventDefault();

        console.log("previewsUrl:", previewsUrl);
        if (!formData.patient_id || !formData.name || !formData.gender || !formData.age) {
            setModalConfig({
                title: "錯誤訊息",
                message: "填寫記錄失敗！請確認填妥每個欄位"
            });
            setShowModal(true);
            return;
        }

        console.log("action:", action);
        formData["action"] = action;
        formData["all_imgs"] = previewsUrl;
        console.log(formData);
        onSubmit(formData);
        onClose(); // 關閉
        setFormData({ patient_id: "", name: "", gender: "", age: "", notes: "" });
        navigate("/record"); // 切到 /record 頁面
    };

    return (
      <>
        {/* Modal 主體 */}
        <div className="modal-dialog modal-dialog-centered">
            <div className="modal-body">
              <div className="section-toggle styled-toggle" data-bs-toggle="collapse" data-bs-target="#basicInfoCollapse"
                  role="button" aria-expanded="true" aria-controls="basicInfoCollapse">
                  <h5 className="toggle-title">
                      <i className="fas fa-chevron-down me-2 rotate-icon" data-target="#basicInfoCollapse"></i> 基本資料
                  </h5>
              </div>

              <div id="basicInfoCollapse" className="collapse show">
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">病歷號
                    <input
                      type="text"
                      name="patient_id"
                      className="form-control"
                      placeholder="請輸入病歷號 (ex: 00001)"
                      value={formData.patient_id ?? newPatiendId}
                      onChange={handleChange}
                    />
                    </label>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">姓名
                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      placeholder="請輸入姓名"
                      value={formData.name ?? ""}
                      onChange={handleChange}
                    />
                    </label>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">性別
                    <input
                      type="text"
                      name="gender"
                      className="form-control"
                      placeholder="請輸入性別"
                      value={formData.gender ?? ""}
                      onChange={handleChange}
                    />
                    </label>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">年齡
                    <input
                      type="number"
                      name="age"
                      className="form-control"
                      placeholder="請輸入年齡"
                      value={formData.age ?? ""}
                      onChange={handleChange}
                    />
                    </label>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">備註
                    <textarea
                      name="notes"
                      className="form-control"
                      placeholder="可選填"
                      value={formData.notes ?? ""}
                      onChange={handleChange}
                    />
                    </label>
                  </div>
                </div>
              </div>

              <div className="section-toggle styled-toggle" data-bs-toggle="collapse" data-bs-target="#imageCollapse"
                  role="button" aria-expanded="true" aria-controls="imageCollapse">
                  <h5 className="toggle-title">
                      <i className="fas fa-chevron-down me-2 rotate-icon" data-target="#imageCollapse"></i> 口腔照片
                  </h5>
              </div>

              <div id="imageCollapse" className="collapse show">
                  <div className="image-upload">
                      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
                          {chunkArray(parts, 2).map((row, rowIndex) => (
                              <div 
                                  key={rowIndex} 
                                  style={{ display: "flex", justifyContent: "center" }}>
                                  {
                                      row.map(([code, label]) => (
                                          <div key={code} style={{ width: "140px", textAlign: "center" }}>
                                              <img 
                                                  src={previewsUrl[`img${code}`] || `/assets/guide/${code}.png`}
                                                  alt={label}
                                                  style={{ width: "100%", borderRadius: "6px", marginBottom: "5px", border: previewsUrl[`img${code}`] ? "2px solid #198754" : "2px solid transparent" }}
                                                  id={`preview_${code}`}
                                              />
                                              <input 
                                                type="file" 
                                                name={`pic${code}`} 
                                                id={`upload_${code}`}
                                                onChange={(e) => uploadImg(e, code)} 
                                                hidden 
                                              />
                                              <button
                                                type="button"
                                                name={`pic${code}_2`} 
                                                id={`upload_${code}_2`}
                                                onClick={() => document.getElementById(`upload_${code}`).click()}
                                              >
                                                選擇圖片
                                              </button>

                                              <div style={{ fontSize: "14px", fontWeight: 500 }}>{label}</div>
                                          </div>
                                      ))
                                  }
                              </div>
                          ))}

                      </div>
                  </div>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                  {!discardPage && <button type="button" id="infer" className="btn btn-secondary btn-lg" style={{ width: "48%" }} onClick={ (e) => startInference(e, formData) }>
                      <i className="fas fa-camera-retro"></i>開始辨識
                  </button>}
                  <button 
                      type="button" 
                      id="check_result" 
                      className="btn btn-secondary btn-lg" 
                      onClick={(e) => onCheckResult(e, formData.patient_id)} 
                      style={{ width: discardPage == false ? "48%" : "100%" }}
                  >
                      <i className="far fa-file-alt"></i>查看辨識結果
                  </button>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={onClose}>
                  回上一頁
                </button>
                {!discardPage && action == "edit" && <button className="btn btn-primary" onClick={(e) => handleSave("edit", e)}>
                  儲存
                </button>}
                {!discardPage && action == "edit" && <button className="btn btn-primary" onClick={(e) => handleSave("remove", e)}>
                  刪除
                </button>}
                {!discardPage && action == "add" && <button className="btn btn-primary" onClick={(e) => handleSave("add", e)}>
                  新增
                </button>}
                {discardPage && <button className="btn btn-primary" onClick={() => handleRevertDelete(formData, "revert")}>
                  回復
                </button>}
                {discardPage && <button className="btn btn-primary" onClick={() => handleRevertDelete(formData, "delete_confirm")}>
                  確認刪除
                </button>}
              </div>
          </div>
        </div>
        
        {/* 背景遮罩 */}
        <div className="modal-backdrop fade show"></div>

        <Modal
              show={showModal}
              title={modalConfig.title}
              message={modalConfig.message}
              onClose={() => {setShowModal(false);}}
            />

        {showProgressModal && <ProgessModal
              show={showProgressModal}
              title={modalConfig.title}
              message={modalConfig.message}
              onClose={() => {setShowProgressModal(false);}}
            />}
        </>
    );
}
