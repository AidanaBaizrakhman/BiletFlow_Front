import React, { createContext, useCallback, useContext, useState } from 'react';

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  tone: ToastTone;
  message: string;
}

const Ctx = createContext<(message: string, tone?: ToastTone) => void>(() => {});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, tone: ToastTone = 'success') => {
    const id = Date.now() + Math.random();
    setItems((p) => [...p, { id, tone, message }]);
    setTimeout(() => setItems((p) => p.filter((x) => x.id !== id)), 4500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="bf-toasts" aria-live="polite" aria-atomic="false">
        {items.map((i) => (
          <div key={i.id} className={`bf-toast bf-toast--${i.tone}`} role={i.tone === 'error' ? 'alert' : 'status'}>
            {i.message}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
};

export const useToast = () => useContext(Ctx);
