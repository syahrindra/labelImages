import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import { ClassLabel } from '../types/annotation.js';
import './ClassPicker.css';

interface ClassPickerProps {
  isOpen: boolean;
  classes: ClassLabel[];
  activeClassId: number;
  onSelectClass: (classId: number) => void;
  onCreateClass: (name: string) => void;
  onClose: () => void;
}

export function ClassPicker({
  isOpen,
  classes,
  activeClassId,
  onSelectClass,
  onCreateClass,
  onClose,
}: ClassPickerProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Filter classes by query text
  const trimmed = query.trim().toLowerCase();
  const filteredClasses = classes.filter((c) =>
    c.name.toLowerCase().includes(trimmed)
  );

  // Exact match exists?
  const hasExactMatch = classes.some(
    (c) => c.name.toLowerCase() === trimmed
  );
  const canCreate = trimmed.length > 0 && !hasExactMatch;

  // Total selectable items = filtered classes + 1 (if can create)
  const totalOptions = filteredClasses.length + (canCreate ? 1 : 0);

  // Auto-focus input when opened & preselect active class
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      const defaultIndex = filteredClasses.findIndex((c) => c.id === activeClassId);
      setSelectedIndex(defaultIndex >= 0 ? defaultIndex : 0);

      // Delay focus slightly so the DOM node is mounted
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, activeClassId]);

  // Keep selectedIndex in bounds when filtering
  useEffect(() => {
    setSelectedIndex((prev) => {
      if (totalOptions === 0) return 0;
      return Math.min(prev, totalOptions - 1);
    });
  }, [totalOptions]);

  if (!isOpen) return null;

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalOptions));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalOptions) % Math.max(1, totalOptions));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      confirmSelection();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const confirmSelection = () => {
    // If selected item is within filtered classes
    if (selectedIndex < filteredClasses.length) {
      onSelectClass(filteredClasses[selectedIndex].id);
    } else if (canCreate) {
      // User selected "+ Create new class"
      onCreateClass(query.trim());
    }
  };

  return (
    <div className="class-picker-overlay" onClick={onClose}>
      <div className="class-picker-popover" onClick={(e) => e.stopPropagation()}>
        <div className="class-picker-header">Assign Class</div>

        <input
          ref={inputRef}
          type="text"
          className="class-picker-input"
          placeholder="Type or select class..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />

        <ul className="class-picker-list">
          {filteredClasses.map((c, index) => {
            const isSelected = index === selectedIndex;
            return (
              <li
                key={c.id}
                className={`class-picker-item ${isSelected ? 'active' : ''}`}
                onClick={() => onSelectClass(c.id)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <div className="class-picker-item-left">
                  <span
                    className="class-picker-dot"
                    style={{ backgroundColor: c.color }}
                  />
                  <span className="class-picker-name">{c.name}</span>
                </div>
                {isSelected && <span className="class-picker-enter-hint">↵ enter</span>}
              </li>
            );
          })}
        </ul>

        {canCreate && (
          <div
            className={`class-picker-create ${
              selectedIndex === filteredClasses.length ? 'active' : ''
            }`}
            onClick={() => onCreateClass(query.trim())}
            onMouseEnter={() => setSelectedIndex(filteredClasses.length)}
          >
            <span>+ Create "{query.trim()}"</span>
            <span className="class-picker-enter-hint">↵ enter</span>
          </div>
        )}
      </div>
    </div>
  );
}
