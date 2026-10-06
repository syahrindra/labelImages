import { useState, type FormEvent, type MouseEvent, type KeyboardEvent } from 'react';
import { useAnnotationStore } from '../store/annotationStore.js';
import { saveClasses } from '../services/api.js';
import {
  CLASS_COLOR_PALETTE,
  getNextClassColor,
  withValidHexColorOrFallback,
} from './../utils/colors.js';
import './Sidebar.css';

export function SidebarRight() {
  const datasetDir = useAnnotationStore((state) => state.datasetDir);
  const classes = useAnnotationStore((state) => state.classes);
  const activeClassId = useAnnotationStore((state) => state.activeClassId);
  const setActiveClassId = useAnnotationStore((state) => state.setActiveClassId);
  const setClasses = useAnnotationStore((state) => state.setClasses);
  const addClass = useAnnotationStore((state) => state.addClass);
  const renameClass = useAnnotationStore((state) => state.renameClass);
  const deleteClass = useAnnotationStore((state) => state.deleteClass);
  const updateClassColor = useAnnotationStore((state) => state.updateClassColor);

  const boxes = useAnnotationStore((state) => state.boxes);
  const selectedBoxId = useAnnotationStore((state) => state.selectedBoxId);
  const selectBox = useAnnotationStore((state) => state.selectBox);
  const deleteSelectedBox = useAnnotationStore((state) => state.deleteSelectedBox);
  const updateBox = useAnnotationStore((state) => state.updateBox);

  const [isAddingClass, setIsAddingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [addError, setAddError] = useState('');
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [renameError, setRenameError] = useState('');
  const [newClassColor, setNewClassColor] = useState(() => {
    return getNextClassColor(classes.length);
  });

  const persistClassNames = (classNames: string[], previousClasses: typeof classes) => {
    if (!datasetDir) {
      return;
    }

    saveClasses(datasetDir, classNames).catch((err) => {
      console.error('Failed to save classes.txt:', err);
      setClasses(previousClasses);
      alert('Failed to save classes.txt. Please try again.');
    });
  };

  const openAddClassForm = () => {
    setNewClassColor(getNextClassColor(classes.length));
    setNewClassName('');
    setAddError('');
    setIsAddingClass(true);
  };

  const closeAddClassForm = () => {
    setNewClassName('');
    setAddError('');
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

    const previousClasses = [...classes];
    const wasAdded = addClass(trimmed, finalColor);

    if (!wasAdded) {
      setAddError(`Class "${trimmed}" already exists.`);
      return;
    }

    const updatedNames = useAnnotationStore.getState().classes.map((classLabel) => {
      return classLabel.name;
    });

    persistClassNames(updatedNames, previousClasses);
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

  const startRenaming = (classId: number, currentName: string) => {
    setEditingClassId(classId);
    setEditName(currentName);
    setRenameError('');
  };

  const cancelRenaming = () => {
    setEditingClassId(null);
    setEditName('');
    setRenameError('');
  };

  const commitRenaming = (classId: number) => {
    const trimmed = editName.trim();

    if (trimmed.length === 0) {
      cancelRenaming();
      return;
    }

    const current = classes.find((classLabel) => {
      return classLabel.id === classId;
    });

    if (current && current.name === trimmed) {
      cancelRenaming();
      return;
    }

    const wasRenamed = renameClass(classId, trimmed);

    if (!wasRenamed) {
      setRenameError(`Class "${trimmed}" already exists.`);
      return;
    }

    const updatedNames = useAnnotationStore.getState().classes.map((classLabel) => {
      return classLabel.name;
    });

    persistClassNames(updatedNames, classes);
    cancelRenaming();
  };

  const handleRenameKeyDown = (e: KeyboardEvent, classId: number) => {
    if (e.key === 'Enter') {
      commitRenaming(classId);
    }

    if (e.key === 'Escape') {
      cancelRenaming();
    }
  };

  const handleDeleteClass = (classId: number, className: string) => {
    const usageCount = boxes.filter((box) => {
      return box.classId === classId;
    }).length;

    const confirmed = window.confirm(
      `Delete class "${className}"? This removes it from classes.txt. ${usageCount} box(es) on this image use it and will show as "Class ${classId}".`
    );

    if (!confirmed) {
      return;
    }

    const previousClasses = [...classes];
    deleteClass(classId);

    const updatedNames = useAnnotationStore.getState().classes.map((classLabel) => {
      return classLabel.name;
    });

    persistClassNames(updatedNames, previousClasses);

    if (editingClassId === classId) {
      cancelRenaming();
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
            {addError && (
              <div className="sidebar-form-error">{addError}</div>
            )}
          </form>
        )}

        <ul className="sidebar-list">
          {classes.length === 0 ? (
            <div className="sidebar-empty">No classes defined</div>
          ) : (
            classes.map((c) => {
              const isActive = c.id === activeClassId;
              const isEditing = editingClassId === c.id;

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
                    {isEditing ? (
                      <input
                        autoFocus
                        type="text"
                        value={editName}
                        aria-label={`Rename class ${c.name}`}
                        className="sidebar-rename-input"
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => commitRenaming(c.id)}
                        onKeyDown={(e) => handleRenameKeyDown(e, c.id)}
                      />
                    ) : (
                      <span
                        className="sidebar-item-label"
                        title="Double-click to rename"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          startRenaming(c.id, c.name);
                        }}
                      >
                        {c.name}
                      </span>
                    )}
                  </div>
                  <div className="sidebar-item-right">
                    {isActive && !isEditing && (
                      <span className="sidebar-active-dot">●</span>
                    )}
                    {!isEditing && (
                      <button
                        className="sidebar-box-delete sidebar-class-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClass(c.id, c.name);
                        }}
                        title={`Delete class ${c.name}`}
                        aria-label={`Delete class ${c.name}`}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </li>
              );
            })
          )}
        </ul>
        {renameError && (
          <div className="sidebar-form-error">{renameError}</div>
        )}
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
