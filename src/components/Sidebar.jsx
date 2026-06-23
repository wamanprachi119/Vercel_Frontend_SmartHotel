import React from "react";
import {
  Home, ShoppingCart, FileText, MessageCircle, ChefHat, Utensils, Package,
} from "lucide-react";
import { useTranslation } from "../hooks/useTranslation";
import "./Sidebar.css";

export default function Sidebar({ currentView, setCurrentView, language }) {
  const t = useTranslation(language);

  const navItems = [
    { id: "menu",     label: t("menu"),           icon: Home          },
    { id: "cart",     label: t("cart"),           icon: ShoppingCart  },
    { id: "orders",   label: t("previousOrders"), icon: Package       },
    { id: "tracking", label: t("myOrders"),       icon: FileText      },
    { id: "feedback", label: t("feedback"),       icon: MessageCircle },
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Utensils className="brand-icon" />
        <span className="brand-name">Smart Hotel</span>
      </div>

      <nav className="sidebar-nav">
        <p className="nav-section-label">{t("menuSection")}</p>
        <ul className="sidebar-list">
          {navItems.map(({ id, label, icon: Icon }) => (
            <li
              key={id}
              className={`sidebar-item ${currentView === id ? "active" : ""}`}
              onClick={() => setCurrentView(id)}
            >
              <Icon className="sidebar-icon" />
              <span className="sidebar-label">{label}</span>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar-kitchen-section">
        <p className="nav-section-label">{t("staffSection")}</p>
        <ul className="sidebar-list">
          <li
            className={`sidebar-item ${currentView === "kitchen" ? "active" : ""}`}
            onClick={() => setCurrentView("kitchen")}
          >
            <ChefHat className="sidebar-icon" />
            <span className="sidebar-label">{t("kitchen")}</span>
          </li>
        </ul>
      </div>

      <div className="sidebar-footer-info">
        <p className="sidebar-footer-text">© 2025 Smart Hotel</p>
      </div>
    </aside>
  );
}
