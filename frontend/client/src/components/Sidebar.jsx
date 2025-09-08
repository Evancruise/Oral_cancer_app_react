import React from 'react'

import { NavLink, useLocation } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
    faHome,
    faHistory,
    faTrash,
    faKey,
    faLink,
    faSignInAlt,
    faUser,
    faCalendar
} from '@fortawesome/free-solid-svg-icons';

import { config } from '@fortawesome/fontawesome-svg-core';
import '@fortawesome/fontawesome-svg-core/styles.css';

// const logoUrl = '/display/logo.png';
import logoUrl from '../assets/logo.png';
import '../css/App.css'

config.autoAddCss = false; // 避免重複插入 CSS

const Sidebar = ({ priority }) => {
    const location = useLocation();

    const menuItems = [
        { path: '/homepage', icon: faHome, label: '首頁', exact: true },
        { path: '/record', icon: faUser, label: '個人病歷紀錄' },
        // { path: '/annotate', icon: faHistory, label: '標記平台' },
        { path: '/all_record', icon: faCalendar, label: '所有病歷紀錄', show: priority === 1 },
        { path: '/all_account', icon: faHistory, label: '帳號管理', show: priority === 1 },
        { path: '/discard_record', icon: faTrash, label: '垃圾桶' },
        { path: '/change_password', icon: faKey, label: '快速密碼變更' },
        { path: '/rebindpage', icon: faLink, label: '重新綁定' },
    ];

    return (
        <div className="sidebar">
            <div className="user-info">
                <p>台大醫院影像醫學部</p>
                <img src={logoUrl} alt="icon" className="user-icon" />
            </div>
            <ul className="menu">
                {menuItems.map((item, index) => {
                    if (item.show === false) {
                        return null;
                    }

                    return (
                        <li key={index}>
                            <NavLink to={item.path} className={({ isActive }) => `nav-Link ${isActive ? 'active' : ''}`}>
                                <FontAwesomeIcon icon={item.icon}/> {item.label}
                            </NavLink>
                        </li>
                    );
                })}
            </ul>
            <div className="version">ver 1.0</div>
        </div>
    );
};

export default Sidebar;


