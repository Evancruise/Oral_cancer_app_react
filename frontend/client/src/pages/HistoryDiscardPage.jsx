import React, { useState } from 'react'
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import InnerHeader from '../components/InnerHeader';

const USER_PRIORITY = 1;

export default function HistoryDiscardPage() {
    return (
    <>
        <div className="app-container">
            {/* Sidebar Rendering */}
            <Sidebar priority={USER_PRIORITY} />

            <div className="main-layout">
                <Header title="垃圾桶"/>
                <main className="main-content">
                <InnerHeader/>
                <p></p>
                </main>
            </div>
        </div>
    </>);
}