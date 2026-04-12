/**
 * QrScanner — input abstraction for the check-in flow.
 *
 * Currently renders a plain text input (manual entry).
 * To upgrade to camera scanning, replace this component's internals with
 * a camera-based scanner (e.g. html5-qrcode or react-qr-reader) while
 * keeping the same `onScan(qrCode: string)` prop interface — CheckIn.jsx
 * needs no changes at all.
 *
 * Props:
 *   onScan(qrCode) — called with the scanned/entered QR code string
 *   disabled       — disables input while a check-in is in progress
 */
const QrScanner = ({ onScan, disabled }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    const value = e.target.elements.qrCode.value.trim().toUpperCase();
    if (value) {
      onScan(value);
      e.target.reset();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        name="qrCode"
        type="text"
        placeholder="Enter QR code (e.g. QR-ABC12345)"
        disabled={disabled}
        autoComplete="off"
        autoFocus
        className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm font-mono uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white shadow-sm disabled:opacity-50"
      />
      <button
        type="submit"
        disabled={disabled}
        className="px-6 py-3 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-50"
      >
        Check In
      </button>
    </form>
  );
};

export default QrScanner;
