import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Header from '../components/Header.jsx';
import InnerHeader from '../components/InnerHeader.jsx';

const USER_PRIORITY = 1;

export default function HomePage() {
  return (
    <div className="app-container">
      {/* Sidebar Rendering */}
      <Sidebar priority={USER_PRIORITY} />

      <div className="main-layout">
        <Header title="首頁"/>
        <main className="main-content">
          <InnerHeader/>
          <p>歡迎使用</p>
        </main>
      </div>
    </div>
  );
}