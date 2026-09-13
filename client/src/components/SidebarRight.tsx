import { useState, type FormEvent } from 'react';
import { useAnnotationStore } from '../store/annotationStore.js';
import { getNextClassColor } from './../utils/colors.js';
import './Sidebar.css';

export function SidebarRight() {
  const classes = useAnnotationStore((state) => state.classes);
  const activeClassId = useAnnotationStore((state) => state.activeClassId);
  const setActiveClassId = useAnnotationStore((state) => state.setActiveClassId);
  const addClass = useAnnotationStore((state) => state.addClass);

  const boxes = useAnnotationStore((state) => state.boxes);
  const selectedBoxId = useAnnotationStore((state) => state.selectedBoxId);
  const selectBox = useAnnotationStore((state) => state.selectBox);
  const deleteSelectedBox = useAnnotationStore((state) => state.deleteSelectedBox);
  const updateBox = useAnnotationStore((state) => state.updateBox);

  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');

  const handleAddClassSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = newClassName.trim();
    if (trimmed.length > 0) {
      const color = getNextClassColor(classes.length);
      addClass(trimmed, color);
      setNewClassName('');
      setIsAddingClass(false);
    }
  };

  const handleClassClick = (classId: number) => {
    setActiveClassId(classId);

    // If a box is currently selected, change its class to the clicked class!
    if (selectedBoxId) {
      const currentBox = boxes.find((b) => b.id === selectedBoxId);
      if (currentBox && currentBox.classId !== classId) {
        updateBox({ ...currentBox, classId: classId });
      }
    }
  };

  return (
    <aside className="sidebar right">
      {/* 1. Classes Section */}
      <div className="sidebar-section">
        <div className="sidebar-header">
          <span>Classes ({classes.length})</span>
          {!isAddingClass && (
            <button
              className="sidebar-btn-add"
              onClick={() => setIsAddingClass(true)}
              title="Add new class"
            >
              + Add
            </button>
          )}
        </div>

        {isAddingClass && (
          <form onSubmit={handleAddClassSubmit} style={{ padding: '8px 10px', borderBottom: '1px solid var(--color-border)' }}>
            <input
              autoFocus
              type="text"
              placeholder="Class name..."
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              onBlur={() => {
                if (newClassName.trim().length === 0) setIsAddingClass(false);
              }}
              style={{
                width: '100%',
                background: 'var(--color-bg)',
                border: '1px solid var(--color-accent)',
                borderRadius: '4px',
                color: 'var(--color-text)',
                padding: '4px 8px',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </form>
        )}

        <ul className="sidebar-list">
          {classes.length === 0 ? (
            <div className="sidebar-empty">No classes defined</div>
          ) : (
            classes.map((c) => {
              const isActive = c.id === activeClassId;
              return (
                <li
                  key={c.id}
                  className={`sidebar-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleClassClick(c.id)}
                >
                  <div className="sidebar-item-left">
                    <span
                      style={{
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: c.color,
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    <span className="sidebar-item-label">{c.name}</span>
                  </div>
                  {isActive && <span style={{ fontSize: '11px', color: 'var(--color-accent)' }}>●</span>}
                </li>
              );
            })
          )}
        </ul>
      </div>

      {/* 2. Bounding Boxes on Active Image Section */}
      <div className="sidebar-section">
        <div className="sidebar-header">
          <span>Boxes ({boxes.length})</span>
          {selectedBoxId && (
            <button
              className="sidebar-btn-add"
              onClick={deleteSelectedBox}
              style={{ color: 'var(--color-danger)' }}
              title="Delete selected box (Del)"
            >
              Delete
            </button>
          )}
        </div>

        <ul className="sidebar-list">
          {boxes.length === 0 ? (
            <div className="sidebar-empty">No boxes drawn yet. Press 'w' to draw.</div>
          ) : (
            boxes.map((box, index) => {
              const isSelected = box.id === selectedBoxId;
              const classMeta = classes.find((c) => c.id === box.classId);
              const label = classMeta ? classMeta.name : `Class ${box.classId}`;
              const color = classMeta ? classMeta.color : '#4f8cff';

              return (
                <li
                  key={box.id}
                  className={`sidebar-item ${isSelected ? 'active' : ''}`}
                  onClick={() => selectBox(box.id)}
                >
                  <div className="sidebar-item-left">
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: color,
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    <span className="sidebar-item-label">
                      #{index + 1} {label}
                    </span>
                  </div>

                  <button
                    className="sidebar-box-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectBox(box.id);
                      deleteSelectedBox();
                    }}
                    title="Delete box"
                  >
                    ✕
                  </button>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </aside>
  );
}
