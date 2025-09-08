import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Header from '../components/Header.jsx';

const USER_PRIORITY = 1;

export default function HomePage() {
  return (
    <div className="app-container">
      {/* Sidebar Rendering */}
      <Sidebar priority={USER_PRIORITY} />

      <div className="main-layout">
        <Header title="首頁"/>
        <main className="main-content">
          <p>這裡可以加上 Dashboard 或快速導覽。</p>
        </main>
      </div>
    </div>
  );
}