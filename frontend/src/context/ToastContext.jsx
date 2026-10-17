import React, { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 5);
    setToasts(prev => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div
        className="toast-container position-fixed bottom-0 end-0 p-3"
        style={{ zIndex: 9999 }}
      >
        {toasts.map((toast) => {
          let bgClass = 'bg-dark text-white border-secondary';
          let iconClass = 'fa-info-circle text-info';
          if (toast.type === 'success') {
            bgClass = 'bg-dark text-white border-success';
            iconClass = 'fa-check-circle text-success';
          } else if (toast.type === 'error') {
            bgClass = 'bg-dark text-white border-danger';
            iconClass = 'fa-exclamation-triangle text-danger';
          } else if (toast.type === 'warning') {
            bgClass = 'bg-dark text-white border-warning';
            iconClass = 'fa-exclamation-circle text-warning';
          }

          return (
            <div
              key={toast.id}
              className={`toast show align-items-center ${bgClass} border shadow-lg mb-2`}
              role="alert"
              aria-live="assertive"
              aria-atomic="true"
              style={{ borderRadius: '10px' }}
            >
              <div className="d-flex">
                <div className="toast-body d-flex align-items-center gap-2 small">
                  <i className={`fas ${iconClass}`}></i>
                  <span>{toast.message}</span>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white me-2 m-auto"
                  onClick={() => removeToast(toast.id)}
                  aria-label="Close"
                ></button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
