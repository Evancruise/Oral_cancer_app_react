import React, { useState, useEffect } from 'react'
import Modal from '../components/showModal';
import FormModal from '../components/FormModal';
import ReportResult from '../components/ReportResult';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import InnerHeader from '../components/InnerHeader';

const USER_PRIORITY = 1;

export default function HistoryDiscardPage() {

    const [discardRecord, setDiscardRecord] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [formData, setFormData] = useState({
        patient_id: "",
        name: "",
        gender: "",
        age: "",
        notes: "",
        file: "",
        code: "",
        all_imgs: ""
    });
    const [showResult, setShowResult] = useState(false);
    const [patientId, setPatientId] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: "", message: "" });

    const handleRevertDelete = async(formData, action) => {
        const payload = { ...formData, action };

        console.log("formData:", payload);

        const res = await fetch("/revert_delete_record", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
        
        const result = await res.json();
        console.log(result);

        if (result.status === "ok") {
            console.log(`${result.action}記錄成功`);
            setModalConfig({
                title: `${result.action}訊息`,
                message: `${result.action}記錄成功`
            });
            setShowModal(true);
            setShowForm(false);
            setDiscardRecord(false);
        } else {
            setModalConfig({
                title: `${result.action}訊息`,
                message: `${result.action}記錄失敗，請再試一次`
            });
            setShowModal(true);
        }
    }

    const onCheckResult = (e, patient_id) => {
        e.preventDefault();
        setPatientId(patient_id);
        setShowForm(false);   // 關閉 FormModal
        setShowResult(true);  // 開啟 ReportResult
    };

    useEffect(() => {
        fetch("/all_discard_record")
        .then((res) => res.json())
        .then((data) => {
            console.log("retrieved grouped dict:", data.discard_grouped_records);
            setDiscardRecord(data.discard_grouped_records || {});
        })
        .catch((err) => {
            console.error("Fetch /all_discard_record 失敗:", err);
        });
    }, []);

    return (
    <>
        <div className="app-container">
            {/* Sidebar Rendering */}
            <Sidebar priority={USER_PRIORITY} />

            <div className="main-layout">
                <Header title="垃圾桶"/>
                <div className="main-content">
                <InnerHeader/>
                    {!showForm && !showResult && Object.entries(discardRecord).flatMap(([date, recList]) =>
                        recList.map((rec, idx) => (
                            <div className="record-link"
                                key={`${date}-${rec.patient_id}-${idx}`}
                                onClick={(e) => {e.preventDefault(); setShowForm(true); setFormData(rec); setPatientId(rec.patient_id); console.log(formData);}}>
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
                        )))
                    }

                    {showForm && !showResult && <FormModal
                        show={showForm}
                        onClose={() => {setShowForm(false); setFormConfig("");}}
                        onCheckResult={onCheckResult}
                        recordContent={formData}
                        newPatiendId={patientId}
                        onSubmit={null}
                        discardPage={true}
                        handleRevertDelete={handleRevertDelete}
                    />}

                    {!showForm && showResult && <ReportResult 
                        show={showResult}
                        patient_id={patientId || ""}
                        onClose={() => {console.log("ShowForm activated");setShowResult(false);setShowForm(true);}}
                        export_enable={false}
                    />}
                </div>
                <div className="footer">
                    <a href="#" style={{ textDecoration: "none", fontWeight: "800", color: "#3aa3d1" }}>Mi-tech</a> Copyright © 2019
                </div>  
            </div>

            <Modal
                show={showModal}
                title={modalConfig.title}
                message={modalConfig.message}
                onClose={() => {setShowModal(false);}}
                />
        </div>
    </>);
}