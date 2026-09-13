import { useState, useEffect } from 'react';
import './Footer.css';

export function Footer() {
  const [showHelp, setShowHelp] = useState(false);

  // Pressing '?' toggles the shortcut help modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        e.preventDefault();
        setShowHelp((prev) => !prev);
      } else if (e.key === 'Escape' && showHelp) {
        setShowHelp(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showHelp]);

  return (
    <>
      <footer className="app-footer">
        <div className="footer-shortcuts">
          <span className="footer-shortcut-item">
            <kbd className="footer-key">w</kbd> draw
          </span>
          <span className="footer-shortcut-item">
            <kbd className="footer-key">enter</kbd> confirm
          </span>
          <span className="footer-shortcut-item">
            <kbd className="footer-key">d</kbd> next
          </span>
          <span className="footer-shortcut-item">
            <kbd className="footer-key">a</kbd> prev
          </span>
          <span className="footer-shortcut-item">
            <kbd className="footer-key">del</kbd> delete
          </span>
          <span className="footer-shortcut-item">
            <kbd className="footer-key">Ctrl+Z</kbd> undo
          </span>
        </div>

        <div>
          <button className="footer-btn-help" onClick={() => setShowHelp(true)}>
            ? Shortcuts
          </button>
        </div>
      </footer>

      {/* Shortcuts Help Modal */}
      {showHelp && (
        <div className="shortcuts-modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="shortcuts-modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              Keyboard Shortcuts
              <button
                onClick={() => setShowHelp(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  cursor: 'pointer',
                  fontSize: '16px',
                }}
              >
                ✕
              </button>
            </h3>

            <table className="shortcuts-table">
              <tbody>
                <tr>
                  <td><kbd className="footer-key">w</kbd></td>
                  <td>Toggle box drawing mode</td>
                </tr>
                <tr>
                  <td><kbd className="footer-key">Enter</kbd></td>
                  <td>Confirm class selection</td>
                </tr>
                <tr>
                  <td><kbd className="footer-key">d</kbd> / <kbd className="footer-key">a</kbd></td>
                  <td>Next / Previous image (autosaves)</td>
                </tr>
                <tr>
                  <td><kbd className="footer-key">Del</kbd> / <kbd className="footer-key">Backspace</kbd></td>
                  <td>Delete selected box</td>
                </tr>
                <tr>
                  <td><kbd className="footer-key">Ctrl+Z</kbd></td>
                  <td>Undo</td>
                </tr>
                <tr>
                  <td><kbd className="footer-key">Ctrl+Shift+Z</kbd></td>
                  <td>Redo</td>
                </tr>
                <tr>
                  <td><kbd className="footer-key">Space + Drag</kbd></td>
                  <td>Pan image canvas</td>
                </tr>
                <tr>
                  <td><kbd className="footer-key">0</kbd></td>
                  <td>Reset zoom (fit to screen)</td>
                </tr>
                <tr>
                  <td><kbd className="footer-key">Esc</kbd></td>
                  <td>Deselect box / cancel drawing</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
