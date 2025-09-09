import React, { useState } from 'react'
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import InnerHeader from '../components/InnerHeader';

const USER_PRIORITY = 1;

export default function HistoryManagePage() {
    return (
    <>
        <div className="app-container">
            {/* Sidebar Rendering */}
            <Sidebar priority={USER_PRIORITY} />

            <div className="main-layout">
                <Header title="病歷紀錄管理"/>
                <main className="main-content">
                <InnerHeader/>
                <p></p>
                </main>
            </div>
        </div>
    </>);
}