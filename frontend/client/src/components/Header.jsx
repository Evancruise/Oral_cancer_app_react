import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "./showModal.jsx";
import '../css/Header.css'

export default function Header({title}) {

  const [name, setName] = useState("");
  const [modalConfig, setModalConfig] = useState({ title: "", message: "" });
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  
  function logoutAction() {
    navigate("/");
  }

  useEffect(() => {
    fetch("/current_username")
      .then(res => res.json())
      .then(data => {
        if (data.cur_state === "deactivated") {
          setModalConfig({
              title: "登入失敗",
              message: "帳號或密碼錯誤，請再試一次！"
          });
          setShowModal(true);
        } else if (data.cur_state === "activated") {
          setName(data.username);
        }
      })
      .catch(err => console.error("Fetch /current_username 失敗:", err));
  }, []);

  return (
    <>
      <header className="app-header d-flex justify-content-end p-2">
        <div className="navbar">
          <div className="nav-left">
            <a href="#">{title}</a>
          </div>
          <div className="nav-right">
            <span className="user">admin</span>
            <a href="/" className="logout">登出</a>
          </div>
        </div>
      </header>

      <Modal
        show={showModal}
        title={modalConfig.title}
        message={modalConfig.message}
        onClose={() => navigate("/")}
      />
    </>
  );
}