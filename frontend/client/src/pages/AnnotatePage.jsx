import Sidebar from '../components/Sidebar.jsx';
import Header from '../components/Header.jsx';

const USER_PRIORITY = 1;

export default function AnnotatePage() {
  
  return (
    <div className="app-container">
      {/* Sidebar Rendering */}
      <Sidebar priority={USER_PRIORITY} />
      <div className="main-layout">
        <Header title="標註頁面" />
        <main className="main-content">
          <canvas id="annotateCanvas" width="600" height="400" style={{border:"1px solid #333"}}></canvas>
        </main>
      </div>
    </div>
  );
}