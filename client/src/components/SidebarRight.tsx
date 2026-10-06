import { useState, type FormEvent, type MouseEvent } from 'react';
import { useAnnotationStore } from '../store/annotationStore.js';
import {
  CLASS_COLOR_PALETTE,
  getNextClassColor,
  withValidHexColorOrFallback,
} from './../utils/colors.js';
import './Sidebar.css';

export function SidebarRight() {
  const classes = useAnnotationStore((state) => state.classes);
  const activeClassId = useAnnotationStore((state) => state.activeClassId);
  const setActiveClassId = useAnnotationStore((state) => state.setActiveClassId);
  const addClass = useAnnotationStore((state) => state.addClass);
  const updateClassColor = useAnnotationStore((state) => state.updateClassColor);

  const boxes = useAnnotationStore((state) => state.boxes);
  const selectedBoxId = useAnnotationStore((state) => state.selectedBoxId);
  const selectBox = useAnnotationStore((state) => state.selectBox);
  const deleteSelectedBox = useAnnotationStore((state) => state.deleteSelectedBox);
  const updateBox = useAnnotationStore((state) => state.updateBox);

  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [newClassColor, setNewClassColor] = useState(() => {
    return getNextClassColor(classes.length);
  });

  const openAddClassForm = () => {
    setNewClassColor(getNextClassColor(classes.length));
    setNewClassName('');
    setIsAddingClass(true);
  };

  const closeAddClassForm = () => {
    setNewClassName('');
    setIsAddingClass(false);
  };

  const handleAddClassSubmit = (e: FormEvent) => {
    e.preventDefault();

    const trimmed = newClassName.trim();

    if (trimmed.length === 0) {
      return;
    }

    const fallbackColor = getNextClassColor(classes.length);
    const finalColor = withValidHexColorOrFallback(newClassColor, fallbackColor);

    addClass(trimmed, finalColor);
    closeAddClassForm();
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

  const handleExistingColorClick = (e: MouseEvent) => {
    // Don't select the class row when opening the color picker.
    e.stopPropagation();
  };

  const handleExistingColorChange = (classId: number, nextColor: string) => {
    const fallbackColor = getNextClassColor(classId);
    const finalColor = withValidHexColorOrFallback(nextColor, fallbackColor);

    updateClassColor(classId, finalColor);
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
              onClick={openAddClassForm}
              title="Add new class"
            >
              + Add
            </button>
          )}
        </div>

        {isAddingClass && (
          <form
            onSubmit={handleAddClassSubmit}
            className="sidebar-add-class-form"
          >
            <input
              autoFocus
              type="text"
              placeholder="Class name..."
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              onBlur={() => {
                if (newClassName.trim().length === 0) {
                  closeAddClassForm();
                }
              }}
              className="sidebar-add-class-input"
            />

            <div className="sidebar-add-class-colors">
              <div className="sidebar-swatches">
                {CLASS_COLOR_PALETTE.map((paletteColor) => {
                  const isChosen =
                    paletteColor.toLowerCase() === newClassColor.toLowerCase();

                  return (
                    <button
                      key={paletteColor}
                      type="button"
                      title={paletteColor}
                      aria-label={`Use color ${paletteColor}`}
                      className={`sidebar-swatch ${isChosen ? 'selected' : ''}`}
                      style={{ backgroundColor: paletteColor }}
                      onClick={() => setNewClassColor(paletteColor)}
                    />
                  );
                })}
              </div>

              <label className="sidebar-custom-color">
                <input
                  type="color"
                  value={newClassColor}
                  aria-label="Choose custom class color"
                  onChange={(e) => setNewClassColor(e.target.value)}
                />
                <span className="sidebar-custom-hex">{newClassColor}</span>
              </label>
            </div>

            <div className="sidebar-add-class-actions">
              <button
                type="button"
                className="sidebar-btn-cancel"
                onClick={closeAddClassForm}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="sidebar-btn-create"
              >
                Create
              </button>
            </div>
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
                    <label
                      title={`Change color for ${c.name}`}
                      className="sidebar-color-dot"
                      style={{ backgroundColor: c.color }}
                      onClick={handleExistingColorClick}
                    >
                      <input
                        type="color"
                        value={c.color}
                        aria-label={`Change color for ${c.name}`}
                        className="sidebar-color-input"
                        onClick={handleExistingColorClick}
                        onChange={(e) => handleExistingColorChange(c.id, e.target.value)}
                      />
                    </label>
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
