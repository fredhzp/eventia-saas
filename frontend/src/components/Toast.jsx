import { useEffect } from 'react';

const STYLES = {
  success: 'bg-emerald-600',
  error: 'bg-red-600',
  warning: 'bg-amber-500',
};

const Toast = ({ message, type = 'success', onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-white max-w-sm ${STYLES[type]}`}>
      <span className="text-sm font-semibold flex-1">{message}</span>
      <button onClick={onClose} className="text-white/70 hover:text-white text-xl leading-none font-bold shrink-0">×</button>
    </div>
  );
};

export default Toast;
