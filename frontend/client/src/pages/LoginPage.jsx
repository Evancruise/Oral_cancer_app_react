import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "../components/showModal.jsx";

function LoginPage() {
    const [qr, setQr] = useState("");             // 存 QR code
    const [sessionId, setSessionId] = useState(""); // 存 session id
    const [name, setName] = useState("");
    const [username, setUserName] = useState("");
    const [password, setPassword] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [modalConfig, setModalConfig] = useState({ title: "", message: "" });

    const navigate = useNavigate();

    async function login_redirect(e) {
        e.preventDefault();

        const res = await fetch("/login_redirect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, username, password })
        });

        const data = await res.json();
        console.log("後端回應:", data);

        if (data.status === "success") {
            // window.location.href = "/" + data.redirect;
            navigate("/" + data.redirect);
        } else {
            setModalConfig({
                title: "登入失敗",
                message: "帳號或密碼錯誤，請再試一次！"
            });
            setShowModal(true);
        }
    }

    useEffect(() => {
    fetch("/login")
      .then(res => res.json())
      .then(data => {
        setQr(data.qr);
        setSessionId(data.session_id);
      })
      .catch(err => console.error("Fetch /login 失敗:", err));
  }, []);

    return (
    <div>
      <div className="login-container">
          <h2>帳號密碼登入</h2>

          <label htmlFor="name">使用者姓名：</label>
          <input type="text" id="name" name="name" autoComplete="name" onChange={(e) => setName(e.target.value)} required />

          <label htmlFor="username">帳號：</label>
          <input type="text" id="username" name="username" autoComplete="username" onChange={(e) => setUserName(e.target.value)} required />

          <label htmlFor="password">密碼：</label>
          <input type="password" id="password" name="password" autoComplete="current-password" onChange={(e) => setPassword(e.target.value)} required />

          <button type="submit" onClick={login_redirect}>登入</button>
          <br/>
          <a href="/reset_password"> 忘記密碼? </a>

          <div className="footer">
              <a href="#" style={{ textDecoration: "none", fontWeight: "800", color: "#3aa3d1" }}>Mi-tech</a> Copyright © 2019
          </div>
      </div>

      <Modal
        show={showModal}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={() => setShowModal(false)}
      />
    </div>
    );
}

export default LoginPage;