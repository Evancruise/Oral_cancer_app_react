import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Modal from "./showModal.jsx";
import '../css/Header.css'

export default function Header({title}) {

    const [name, setName] = useState("");
    const [modalConfig, setModalConfig] = useState({ title: "", message: "" });
    const [showModal, setShowModal] = useState(false);
    const [countdown, setCountdown] = useState(600);
    const navigate = useNavigate();

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

    useEffect(() => {
        // if (!name) return; // name 還沒設定就不要跑
        let localCountdown = 0;
        const fetchCountdown = () => {
        fetch(`/countdown_time`)
          .then((res) => res.json())
          .then((data) => {
            localCountdown = data.remaining_time;
            console.log("localCountdown:", localCountdown);

            if (data.is_expired == true) {
                setModalConfig({
                    title: "提示訊息",
                    message: "操作閒置逾時，請重新登入"
                });
                setShowModal(true);
            } else if (data.is_valid == false) {
                setModalConfig({
                    title: "提示訊息",
                    message: "無效使用者，請重新登入"
                });
                setShowModal(true);
            }

            setCountdown(localCountdown);
          })
          .catch((err) => console.error(err));
      };

      fetchCountdown(); // 初始化抓一次
      const syncTimer = setInterval(fetchCountdown, 10000); // 每 10 秒校正一次
      const localTimer = setInterval(() => {
        if (localCountdown > 0) {
          localCountdown -= 1;
          setCountdown(localCountdown);
        } else {
          setModalConfig({
            title: "提示訊息",
            message: "操作閒置逾時，請重新登入"
          });
          setShowModal(true);
        }
      }, 1000);

      return () => {
        clearInterval(syncTimer);
        clearInterval(localTimer);
      };
    }, []);

    return (
    <>
      <header className="app-header d-flex justify-content-end p-2">
        <div className="navbar">
          <div className="nav-left">
            <a href="#">{title}</a>
          </div>
          <div className="nav-right">
            <span className="user">{name}</span>
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