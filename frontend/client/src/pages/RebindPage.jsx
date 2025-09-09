import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar.jsx";
import Header from "../components/Header.jsx";
import { QrReader } from "react-qr-reader";
import InnerHeader from "../components/InnerHeader.jsx";

const USER_PRIORITY = 1;

export default function RebindPage() {
  const [scanResult, setScanResult] = useState("");
  const [qrSrc, setQrSrc] = useState("/rebind-qr");
  const [countdown, setCountdown] = useState(30); // 倒數秒數
  const [isScannerOpen, setIsScannerOpen] = useState(false); // 控制是否顯示掃描器

  function reloadQR() {
    setQrSrc(`/rebind-qr?${Date.now()}`); // 避免 cache
    setCountdown(30); // 重設倒數
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          reloadQR(); // 倒數到 0 自動刷新 QR
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer); // 離開元件時清除計時器
  }, []);

  // 掃描成功
  const handleScan = (data) => {
    if (data) {
      setScanResult(data);
      window.location.href = data; // 直接跳轉到掃描到的 URL
    }
  };

  // 掃描錯誤
  const handleError = (err) => {
    console.error("QR Scan Error:", err);
  };

  return (
    <div className="app-container">
      <Sidebar priority={USER_PRIORITY} />
      <div className="app-layout">
        <Header title="重新綁定 QR Code" />
        <div className="main-content">
          <InnerHeader/>
          <div className="rebind-pwd-container" style={{ textAlign: "center" }}>
            {/* 電腦版：顯示 QR Code */}
            <div className="form-group">
              <img src={qrSrc} alt="QR Code" style={{ width: "250px" }} />
              <div
                style={{
                  marginTop: "0.5rem",
                  fontSize: "14px",
                  color: "#555",
                }}
              >
                下次刷新倒數：{countdown} 秒
              </div>
              <button onClick={reloadQR} style={{ marginBottom: "1rem" }}>
                🔄 重新生成 QR code
              </button>
            </div>

            {/* 手機版：掃描 QR Code */}
            <button
              onClick={() => setIsScannerOpen(!isScannerOpen)}
              style={{
                marginTop: "1rem",
                padding: "0.5rem 1rem",
                backgroundColor: "#0d6efd",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              {isScannerOpen ? "關閉掃描器" : "打開相機掃描"}
            </button>

            {isScannerOpen && (
              <div style={{ marginTop: "1rem" }}>
                <QrReader
                  delay={300}
                  onError={handleError}
                  onScan={handleScan}
                  style={{ width: "100%" }}
                />
                {scanResult && (
                  <p style={{ marginTop: "0.5rem" }}>掃描到：{scanResult}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
