import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Plus, Check, X, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
}

interface CreatableSelectProps {
  options: (string | SelectOption)[];
  value: string;
  onChange: (value: string) => void;
  onCreate?: (newOption: string) => Promise<string | void> | string | void;
  placeholder?: string;
  searchPlaceholder?: string;
  allowCreate?: boolean;
  createLabelPrefix?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  id?: string;
}

export const CreatableSelect: React.FC<CreatableSelectProps> = ({
  options,
  value,
  onChange,
  onCreate,
  placeholder = 'Select an option...',
  searchPlaceholder = 'Type to search or add new...',
  allowCreate = true,
  createLabelPrefix = 'Add new',
  className = '',
  required = false,
  disabled = false,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Normalize options to SelectOption format
  const normalizedOptions: SelectOption[] = options.map(opt => {
    if (typeof opt === 'string') {
      return { value: opt, label: opt };
    }
    return opt;
  });

  // Current selected option label
  const selectedOption = normalizedOptions.find(o => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : value;

  // Filter options based on typed query
  const filteredOptions = normalizedOptions.filter(opt =>
    opt.label.toLowerCase().includes(query.toLowerCase()) ||
    opt.value.toLowerCase().includes(query.toLowerCase()) ||
    (opt.subLabel && opt.subLabel.toLowerCase().includes(query.toLowerCase()))
  );

  // Check if typed query is an exact match with any existing option
  const exactMatch = normalizedOptions.some(
    opt => opt.label.trim().toLowerCase() === query.trim().toLowerCase() ||
           opt.value.trim().toLowerCase() === query.trim().toLowerCase()
  );

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setQuery('');
  };

  const handleCreateNew = async () => {
    const trimmed = query.trim();
    if (!trimmed) return;

    try {
      setIsCreating(true);
      if (onCreate) {
        const result = await onCreate(trimmed);
        if (typeof result === 'string') {
          onChange(result);
        } else {
          onChange(trimmed);
        }
      } else {
        onChange(trimmed);
      }
      setIsOpen(false);
      setQuery('');
    } catch (err) {
      console.error('Failed to create option', err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredOptions.length === 1) {
        handleSelect(filteredOptions[0].value);
      } else if (filteredOptions.length > 0 && exactMatch) {
        const match = filteredOptions.find(
          o => o.label.toLowerCase() === query.trim().toLowerCase()
        );
        if (match) handleSelect(match.value);
        else handleSelect(filteredOptions[0].value);
      } else if (allowCreate && query.trim()) {
        handleCreateNew();
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Hidden input for HTML form validation if required */}
      {required && (
        <input
          type="text"
          value={value || ''}
          onChange={() => {}}
          required={required}
          className="sr-only"
          tabIndex={-1}
        />
      )}

      {/* Main Select Button / Display Box */}
      <button
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border text-left text-xs flex items-center justify-between transition-all ${
          isOpen
            ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md'
            : 'border-zinc-800 hover:border-zinc-700'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span className={displayLabel ? 'text-zinc-100 font-medium truncate pr-2' : 'text-zinc-500 truncate pr-2'}>
          {displayLabel || placeholder}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 text-zinc-400">
          {value && !disabled && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              className="p-0.5 rounded hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-400' : ''}`}
          />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 mt-1.5 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 backdrop-blur-xl">
          {/* Search / Type Input */}
          <div className="relative mb-2">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-3 pointer-events-none" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-2.5 text-zinc-500 hover:text-zinc-300 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Create Prompt (Type & Add) when query doesn't match an existing option */}
          {allowCreate && query.trim() && !exactMatch && (
            <div className="mb-1.5 pb-1.5 border-b border-zinc-800/80">
              <button
                type="button"
                onClick={handleCreateNew}
                disabled={isCreating}
                className="w-full flex items-center justify-between p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition-all group"
              >
                <div className="flex items-center gap-2 truncate">
                  <div className="w-5 h-5 rounded-lg bg-amber-500 text-zinc-950 flex items-center justify-center shrink-0">
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  </div>
                  <span className="truncate">
                    {createLabelPrefix} <strong className="text-white underline decoration-amber-500/50 underline-offset-2">"{query.trim()}"</strong>
                  </span>
                </div>
                <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded shrink-0">
                  {isCreating ? 'Adding...' : 'Press Enter'}
                </span>
              </button>
            </div>
          )}

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {filteredOptions.length === 0 && !query.trim() && (
              <div className="p-3 text-center text-xs text-zinc-500">
                No options available
              </div>
            )}

            {filteredOptions.length === 0 && query.trim() && exactMatch && (
              <div className="p-3 text-center text-xs text-zinc-500">
                No matches found
              </div>
            )}

            {filteredOptions.map(option => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleSelect(option.value)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs transition-colors ${
                    isSelected
                      ? 'bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30'
                      : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="truncate">{option.label}</span>
                    {option.subLabel && (
                      <span className="text-[10px] text-zinc-500 truncate">{option.subLabel}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {option.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                        {option.badge}
                      </span>
                    )}
                    {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
