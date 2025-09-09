import React, { useState } from 'react'

export default function InnerHeader() {
    return (
    <>
        <div className="header">
              <div className="logo"></div>
              <div className="title">
              <h1>醫快拍</h1>
              <small>病歷影像記錄系統</small>
              </div>
        </div>
    </>
    );
}