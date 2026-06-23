import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { TableProvider } from "./context/TableContext.jsx";
import { LanguageProvider } from "./context/LanguageContext.jsx";
import "./styles/LanguageSelector.css";
import "./styles/menu.css";
import "./styles/menuCard.css";
import "./styles/MenuFilters.css";
import "./styles/cart.css";
import "./styles/payment.css";
import "./styles/components.css";
import "./styles/AIRecommended.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <LanguageProvider>
      <TableProvider>
        <App />
      </TableProvider>
    </LanguageProvider>
  </React.StrictMode>
);
