import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { 
  IoGridOutline, 
  IoChatbubbleEllipsesOutline, 
  IoMegaphoneOutline, 
  IoShieldCheckmarkOutline, 
  IoPeopleOutline, 
  IoBusinessOutline, 
  IoMapOutline, 
  IoBarChartOutline,
  IoLogOutOutline
} from "react-icons/io5";
import s from "../styles/Sidebar.module.css";

const NAV = [
  { section: "Overview" },
  { path: "/dashboard", icon: <IoGridOutline />, label: "Dashboard" },
  { path: "/concerns", icon: <IoChatbubbleEllipsesOutline />, label: "Concerns" },
  { section: "Management" },
  { path: "/events", icon: <IoMegaphoneOutline />, label: "Events & Announcements" },
  { path: "/verification", icon: <IoShieldCheckmarkOutline />, label: "Verification" },
  { path: "/users", icon: <IoPeopleOutline />, label: "Citizens" },
  { path: "/barangays", icon: <IoBusinessOutline />, label: "Barangays" },
  { section: "Analytics" },
  { path: "/map", icon: <IoMapOutline />, label: "Map View" },
  { path: "/reports", icon: <IoBarChartOutline />, label: "Reports" },
];

export default function Sidebar({ user, onLogout }) {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const initials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "AD";

  return (
    <aside className={`${s.sidebar} ${collapsed ? s.sidebarCollapsed : ""}`}>
      {/* Brand */}
      <div className={s.brand}>
        <div className={s.brandMark}>📢</div>
        {!collapsed && (
          <div className={s.brandText}>
            <div className={s.brandName}>CitiVoice</div>
            <div className={s.brandSub}>Admin Console</div>
          </div>
        )}
        <button
          className={s.collapseBtn}
          onClick={() => setCollapsed((c) => !c)}
        >
          {collapsed ? "›" : "‹"}
        </button>
      </div>

      {/* User */}
      {!collapsed && (
        <div className={s.userCard}>
          <div className={s.avatar}>{initials}</div>
          <div>
            <div className={s.userName}>{user?.name || "Admin"}</div>
            <div className={s.userRole}>● Administrator</div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {NAV.map((item, i) => {
          if (item.section) {
            if (collapsed) return null;
            return (
              <div key={i} className={`${s.navSection} ${s.navLabel}`}>
                {item.section}
              </div>
            );
          }
          return (
            <div
              key={item.path}
              className={s.navSection}
              style={{ padding: "0 10px", marginBottom: 1 }}
            >
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `${s.navItem} ${collapsed ? s.collapsed : ""} ${isActive ? s.navItemActive : ""}`
                }
              >
                <span className={s.navIcon}>{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </div>
          );
        })}
      </nav>

      {/* Logout */}
      <div className={s.navFooter}>
        <button
          className={`${s.logoutBtn} ${collapsed ? s.collapsed : ""}`}
          onClick={() => { onLogout(); navigate("/"); }}
        >
          <span className={s.navIcon}><IoLogOutOutline /></span>
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
