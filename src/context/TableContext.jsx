import { createContext, useContext, useState, useCallback } from "react";

const TABLE_KEY = "smartHotelTableNumber";

const TableContext = createContext(null);

export function TableProvider({ children }) {
  const [tableNumber, setTableNumberState] = useState(
    () => localStorage.getItem(TABLE_KEY) || null
  );

  const setTableNumber = useCallback((num) => {
    if (num) {
      localStorage.setItem(TABLE_KEY, num);
    } else {
      localStorage.removeItem(TABLE_KEY);
    }
    setTableNumberState(num || null);
  }, []);

  const clearTable = useCallback(() => {
    localStorage.removeItem(TABLE_KEY);
    setTableNumberState(null);
  }, []);

  return (
    <TableContext.Provider value={{ tableNumber, setTableNumber, clearTable }}>
      {children}
    </TableContext.Provider>
  );
}

export function useTable() {
  const ctx = useContext(TableContext);
  if (!ctx) throw new Error("useTable must be used inside TableProvider");
  return ctx;
}
