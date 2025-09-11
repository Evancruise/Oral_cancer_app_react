import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import Header from '../components/Header.jsx';
import FormModal from '../components/FormModal.jsx'
import Modal from "../components/showModal.jsx";
import ReportResult from "../components/ReportResult.jsx";
import InnerHeader from '../components/InnerHeader.jsx';
import '../css/Table.css'

const USER_PRIORITY = 1;

export default function HistoryPage() {
  
    const [records, setRecords] = useState({});
    const [showForm, setShowForm] = useState(false);
    const [formConfig, setFormConfig] = useState("");
    const [showResult, setShowResult] = useState(false);
    const [patientId, setPatientId] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: "", message: "" });
    
    useEffect(() => {
    fetch("/record") // 確保 session cookie 帶上
        .then((res) => res.json())
        .then((data) => {
            setRecords(data.grouped_records || {});
            setPatientId(data.new_patient_id);
        })
        .catch((err) => {
            console.error("Fetch /record 失敗:", err);
        });
    }, []);

    const onCheckResult = (e, patient_id) => {
        e.preventDefault();
        setPatientId(patient_id);
        setShowForm(false);   // 關閉 FormModal
        setShowResult(true);  // 開啟 ReportResult
    };

    const handleSubmitForm = async (data) => {
        console.log("收到新紀錄:", data);
        console.log("records:", records);

        try {
          const res = await fetch(`/modify_record`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify(data),
          });

          const result = await res.json();
          console.log(result);

          if (result.status === "ok") {
            setModalConfig({
                title: `${result.action}紀錄`,
                message: `${result.action}記錄成功！`
            });
            setShowModal(true);

            fetch("/record") // 確保 session cookie 帶上
            .then((res) => res.json())
            .then((data) => {
                console.log("retrieved grouped dict:", data.grouped_records);
                setRecords(data.grouped_records || {});
            })
            .catch((err) => {
                console.error("Fetch /record 失敗:", err);
            });
          }
        }
        catch (error) {
            setModalConfig({
                title: `錯誤訊息`,
                message: `操作過程錯誤，請再試一次`
            });
            setShowModal(true);
        }
    };

    console.log("records:", records);

    return (
    <>
      <div className="app-container">
        <Sidebar priority={USER_PRIORITY} />
        <div className="app-layout">
          <Header title="歷史紀錄"/>
          <div className="main-content">
            <InnerHeader/>
            {!showResult && !showForm && Object.entries(records).flatMap(([date, recList]) =>
              recList.map((rec, idx) => (
                <div className="record-link"
                    key={`${date}-${rec.patient_id}-${idx}`}
                    onClick={(e) => {e.preventDefault(); setShowForm(true); setFormConfig(rec); console.log(formConfig);}}>
                    <div className={`record-card ${date}-${idx}`}>
                        <div className="icon" id={`icon-${rec.patient_id}`}>
                            <i className={`fas fa-camera`}></i>
                        </div>
                        <div className="record-info">
                            <div className="patient_id">{ rec.patient_id }</div>
                            <div className="date">{ date }</div>
                        </div>
                    </div>
                </div>
            )))}

            {showForm && <FormModal
                show={showForm}
                onClose={() => {setShowForm(false); setFormConfig("");}}
                onCheckResult={onCheckResult}
                recordContent={formConfig}
                newPatiendId={patientId}
                onSubmit={handleSubmitForm}
            />}

            <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
            {!showForm && !showResult && <button className="btn btn-success mb-3" onClick={() => setShowForm(true)}>
                + 新增紀錄
            </button>}
            </div>

            {showResult && <ReportResult 
                show={showResult}
                patient_id={patientId || ""}
                onClose={() => {console.log("ShowForm activated");setShowResult(false);setShowForm(true);}}
            />}
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