'use client';

import { useState, useEffect, useCallback } from 'react';
import { LayoutPayload } from '../api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/utils/cn';
import {
  Trash2, Wand2, CheckCircle2, AlertCircle,
  Armchair, BedDouble, Columns, Plus, Minus, Copy } from 'lucide-react';

// 5 distinct cell states. Sleeper + female is now possible.
type CellType = 'SEATER' | 'SLEEPER' | 'SEATER_F' | 'SLEEPER_F' | 'AISLE';
type BrushType = 'SEATER' | 'SLEEPER' | 'AISLE';

const MAX_ROWS = 20;
const MAX_COLS = 5;
const MIN_ROWS = 1;
const MIN_COLS = 1;

interface Props {
  capacity: number;
  initialLayout?: LayoutPayload;
  onSave: (payload: LayoutPayload) => void;
  onCancel: () => void;
  isSaving: boolean;
}

export function SeatLayoutStudio({ capacity, initialLayout, onSave, onCancel, isSaving }: Props) {
  const [rows, setRows] = useState(Math.min(initialLayout?.rowsCount || 10, MAX_ROWS));
  const [cols, setCols] = useState(Math.min(initialLayout?.columnsCount || 4, MAX_COLS));
  const [grid, setGrid] = useState<CellType[][]>([]);

  // Brush: type + female modifier
  const [activeType, setActiveType] = useState<BrushType>('SEATER');
  const [femaleOnly, setFemaleOnly] = useState(false);

  const [isPainting, setIsPainting] = useState(false);
  const [mirrorMode, setMirrorMode] = useState(false);
  const [limitHit, setLimitHit] = useState<string | null>(null);

  // Convert brush + modifier to a cell state
  const getActiveCell = useCallback((): CellType => {
    if (activeType === 'AISLE') return 'AISLE';
    if (activeType === 'SEATER') return femaleOnly ? 'SEATER_F' : 'SEATER';
    return femaleOnly ? 'SLEEPER_F' : 'SLEEPER';
  }, [activeType, femaleOnly]);

  // Load initial layout (handles all 4 seat states)
  useEffect(() => {
    if (grid.length > 0) return;

    const newGrid: CellType[][] = Array(rows).fill(null).map(() => Array(cols).fill('AISLE'));

    if (initialLayout) {
      initialLayout.seats.forEach((s) => {
        const rIdx = s.seatRow.charCodeAt(0) - 65;
        const cIdx = s.seatColumn - 1;
        if (rIdx >= 0 && rIdx < rows && cIdx >= 0 && cIdx < cols) {
          const isSleeper = s.seatType === 'SLEEPER';
          const isFemale = s.isFemaleOnly;
          newGrid[rIdx][cIdx] =
            isSleeper && isFemale ? 'SLEEPER_F' :
            isSleeper ? 'SLEEPER' :
            isFemale ? 'SEATER_F' :
            'SEATER';
        }
      });
    } else {
      // Default 2x2 seater with aisle in middle
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          if (cols >= 3 && c === Math.floor(cols / 2)) continue;
          newGrid[r][c] = 'SEATER';
        }
      }
    }
    setGrid(newGrid);
  }, [rows, cols, initialLayout, grid.length]);

  useEffect(() => {
    if (limitHit) {
      const t = setTimeout(() => setLimitHit(null), 3000);
      return () => clearTimeout(t);
    }
  }, [limitHit]);

  const paintCell = (r: number, c: number) => {
    const brush = getActiveCell();
    const newGrid = grid.map(row => [...row]);
    newGrid[r][c] = brush;

    if (mirrorMode && cols % 2 === 0) {
      const mirrorC = cols - 1 - c;
      if (mirrorC !== c) newGrid[r][mirrorC] = brush;
    }
    setGrid(newGrid);
  };

  const handleMouseDown = (r: number, c: number) => {
    setIsPainting(true);
    paintCell(r, c);
  };
  const handleMouseEnter = (r: number, c: number) => {
    if (isPainting) paintCell(r, c);
  };
  const handleMouseUp = useCallback(() => setIsPainting(false), []);

  useEffect(() => {
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseUp]);

  const addRow = (position: 'top' | 'bottom') => {
    if (rows >= MAX_ROWS) { setLimitHit(`Maximum ${MAX_ROWS} rows allowed.`); return; }
    const newRow = Array(cols).fill('AISLE') as CellType[];
    if (position === 'top') setGrid([newRow, ...grid]);
    else setGrid([...grid, newRow]);
    setRows(rows + 1);
  };

  const removeRow = (position: 'top' | 'bottom') => {
    if (rows <= MIN_ROWS) { setLimitHit(`Minimum ${MIN_ROWS} row required.`); return; }
    if (position === 'top') setGrid(grid.slice(1));
    else setGrid(grid.slice(0, -1));
    setRows(rows - 1);
  };

  const addColumn = (position: 'left' | 'right') => {
    if (cols >= MAX_COLS) { setLimitHit(`Maximum ${MAX_COLS} columns allowed.`); return; }
    setGrid(grid.map(row => position === 'left' ? ['AISLE', ...row] : [...row, 'AISLE']));
    setCols(cols + 1);
  };

  const removeColumn = (position: 'left' | 'right') => {
    if (cols <= MIN_COLS) { setLimitHit(`Minimum ${MIN_COLS} column required.`); return; }
    setGrid(grid.map(row => position === 'left' ? row.slice(1) : row.slice(0, -1)));
    setCols(cols - 1);
  };

  const handleAutoFill = () => {
    const brush = getActiveCell();
    const fillBrush = brush === 'AISLE' ? 'SEATER' : brush;
    const newGrid: CellType[][] = Array(rows).fill(null).map(() => Array(cols).fill('AISLE'));
    let count = 0;
    const leftCols = Math.max(1, Math.floor((cols - 1) / 2));

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < leftCols; c++) {
        if (count < capacity) { newGrid[r][c] = fillBrush; count++; }
      }
      for (let c = leftCols + 1; c < cols; c++) {
        if (count < capacity) { newGrid[r][c] = fillBrush; count++; }
      }
    }
    setGrid(newGrid);
  };

  const handleClear = () => setGrid(Array(rows).fill(null).map(() => Array(cols).fill('AISLE')));

  const handleSave = () => {
    if (rows > MAX_ROWS || cols > MAX_COLS) {
      setLimitHit(`Layout exceeds system limits (max ${MAX_ROWS} rows, ${MAX_COLS} columns).`);
      return;
    }
    const seats: LayoutPayload['seats'] = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const type = grid[r][c];
        if (type === 'AISLE') continue;

        const seatType: 'SEATER' | 'SLEEPER' =
          type === 'SLEEPER' || type === 'SLEEPER_F' ? 'SLEEPER' : 'SEATER';
        const isFemaleOnly = type === 'SEATER_F' || type === 'SLEEPER_F';

        seats.push({
          seatRow: String.fromCharCode(65 + r),
          seatColumn: c + 1,
          seatType,
          isFemaleOnly,
        });
      }
    }
    onSave({ rowsCount: rows, columnsCount: cols, seats });
  };

  const allCells = grid.flat();
  const assignedSeats = allCells.filter(c => c !== 'AISLE').length;
  const femaleSeats = allCells.filter(c => c === 'SEATER_F' || c === 'SLEEPER_F').length;
  const sleeperSeats = allCells.filter(c => c === 'SLEEPER' || c === 'SLEEPER_F').length;
  const isValid = assignedSeats === capacity;

  // Cell styling per state
  const cellClasses = (cell: CellType) => {
    switch (cell) {
      case 'AISLE':
        return 'bg-transparent border-dashed border-transparent hover:border-line-subtle h-11';
      case 'SEATER':
        return 'h-11 bg-emerald-500/10 text-emerald-700 border-emerald-500/30 hover:bg-emerald-500/20';
      case 'SLEEPER':
        return 'h-16 bg-blue-500/10 text-blue-700 border-blue-500/30 hover:bg-blue-500/20';
      case 'SEATER_F':
        return 'h-11 bg-pink-500/15 text-pink-700 border-pink-500/40 hover:bg-pink-500/25';
      case 'SLEEPER_F':
        return 'h-16 bg-purple-500/15 text-purple-700 border-purple-500/40 hover:bg-purple-500/25';
    }
  };

  return (
    <div className="flex gap-8 items-start animate-in fade-in duration-300">
      {/* LEFT: Tools Panel */}
      <div className="w-72 shrink-0 space-y-6 sticky top-24">
        {/* Brush type */}
        <Card className="p-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted border-b border-line-hairline pb-2">
            1. Seat Type
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setActiveType('SEATER')}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-lg border-2 gap-1.5 transition-all',
                activeType === 'SEATER'
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-600'
                  : 'border-line-hairline hover:border-ink-muted text-ink-secondary'
              )}
            >
              <Armchair size={18} />
              <span className="text-[10px] font-bold uppercase">Seater</span>
            </button>
            <button
              onClick={() => setActiveType('SLEEPER')}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-lg border-2 gap-1.5 transition-all',
                activeType === 'SLEEPER'
                  ? 'border-blue-500 bg-blue-500/10 text-blue-600'
                  : 'border-line-hairline hover:border-ink-muted text-ink-secondary'
              )}
            >
              <BedDouble size={18} />
              <span className="text-[10px] font-bold uppercase">Sleeper</span>
            </button>
            <button
              onClick={() => setActiveType('AISLE')}
              className={cn(
                'flex flex-col items-center justify-center p-3 rounded-lg border-2 gap-1.5 transition-all',
                activeType === 'AISLE'
                  ? 'border-gray-500 bg-gray-500/10 text-gray-600'
                  : 'border-line-hairline hover:border-ink-muted text-ink-secondary'
              )}
            >
              <Columns size={18} />
              <span className="text-[10px] font-bold uppercase">Aisle</span>
            </button>
          </div>

          <div className="pt-2 border-t border-line-hairline">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted pb-2">
              2. Female Only
            </h3>
            <button
              onClick={() => setFemaleOnly(!femaleOnly)}
              disabled={activeType === 'AISLE'}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-bold border-2 transition-all',
                activeType === 'AISLE' && 'opacity-40 cursor-not-allowed',
                femaleOnly && activeType !== 'AISLE'
                  ? 'bg-pink-500/10 border-pink-500 text-pink-600'
                  : 'border-line-hairline text-ink-secondary hover:bg-surface-hover'
              )}
            >
              <span className="flex items-center gap-2">
                <span className="text-base leading-none" aria-hidden="true">♀</span> Female Only
              </span>
              <span
                className={cn(
                  'w-10 h-5 rounded-full relative transition-colors',
                  femaleOnly && activeType !== 'AISLE' ? 'bg-pink-500' : 'bg-ink-muted'
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                    femaleOnly ? 'left-[22px]' : 'left-0.5'
                  )}
                />
              </span>
            </button>
            <p className="text-[10px] text-ink-muted mt-2 leading-tight">
              Applies on top of the selected type. You can have
              <strong> Female Seater</strong> AND <strong>Female Sleeper</strong>.
            </p>
          </div>

          {/* Live preview of active brush */}
          <div className="pt-2 border-t border-line-hairline">
            <p className="text-[10px] uppercase font-bold text-ink-muted mb-2">Painting:</p>
            <div className="flex items-center gap-3 p-2 rounded-lg bg-surface-sunken border border-line-hairline">
              <div
                className={cn(
                  'w-10 rounded-md flex items-center justify-center font-bold text-[9px] border-2 shrink-0',
                  cellClasses(getActiveCell())
                )}
              >
                {getActiveCell() !== 'AISLE' ? 'A1' : ''}
              </div>
              <div className="text-xs">
                <p className="font-bold text-ink-bright">
                  {getActiveCell() === 'AISLE'
                    ? 'Aisle (empty)'
                    : getActiveCell() === 'SEATER'
                    ? 'Seater'
                    : getActiveCell() === 'SLEEPER'
                    ? 'Sleeper'
                    : getActiveCell() === 'SEATER_F'
                    ? 'Female Seater'
                    : 'Female Sleeper'}
                </p>
              </div>
            </div>
          </div>
        </Card>

        {/* Grid controls */}
        <Card className="p-4 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-ink-muted border-b border-line-hairline pb-2">
            Grid <span className="text-[9px] font-mono normal-case">({rows}R × {cols}C)</span>
          </h3>

          <div className="space-y-2">
            <span className="text-xs text-ink-secondary font-medium">Columns (max {MAX_COLS})</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1 text-xs" onClick={() => addColumn('left')} disabled={cols >= MAX_COLS}>
                <Plus size={12} className="mr-1" /> Left
              </Button>
              <Button size="sm" variant="secondary" className="flex-1 text-xs" onClick={() => addColumn('right')} disabled={cols >= MAX_COLS}>
                <Plus size={12} className="mr-1" /> Right
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="flex-1 text-xs text-danger-crimson" onClick={() => removeColumn('left')} disabled={cols <= MIN_COLS}>
                <Minus size={12} className="mr-1" /> Left
              </Button>
              <Button size="sm" variant="ghost" className="flex-1 text-xs text-danger-crimson" onClick={() => removeColumn('right')} disabled={cols <= MIN_COLS}>
                <Minus size={12} className="mr-1" /> Right
              </Button>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            <span className="text-xs text-ink-secondary font-medium">Rows (max {MAX_ROWS})</span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" className="flex-1 text-xs" onClick={() => addRow('top')} disabled={rows >= MAX_ROWS}>
                <Plus size={12} className="mr-1" /> Top
              </Button>
              <Button size="sm" variant="secondary" className="flex-1 text-xs" onClick={() => addRow('bottom')} disabled={rows >= MAX_ROWS}>
                <Plus size={12} className="mr-1" /> Bottom
              </Button>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="flex-1 text-xs text-danger-crimson" onClick={() => removeRow('top')} disabled={rows <= MIN_ROWS}>
                <Minus size={12} className="mr-1" /> Top
              </Button>
              <Button size="sm" variant="ghost" className="flex-1 text-xs text-danger-crimson" onClick={() => removeRow('bottom')} disabled={rows <= MIN_ROWS}>
                <Minus size={12} className="mr-1" /> Bottom
              </Button>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setMirrorMode(!mirrorMode)}
              className={cn(
                'w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold border transition-colors',
                mirrorMode
                  ? 'bg-brand/10 border-brand text-brand-text'
                  : 'border-line-hairline text-ink-secondary hover:bg-surface-hover'
              )}
            >
              <span className="flex items-center gap-2"><Copy size={14} /> Mirror Mode</span>
              <span className={cn('w-8 h-4 rounded-full relative transition-colors', mirrorMode ? 'bg-brand' : 'bg-ink-muted')}>
                <span className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all', mirrorMode ? 'left-4' : 'left-0.5')} />
              </span>
            </button>
          </div>
        </Card>

        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1 text-xs" onClick={handleAutoFill}>
            <Wand2 size={14} className="mr-2" /> Auto-fill
          </Button>
          <Button variant="secondary" className="flex-1 text-xs text-danger-crimson" onClick={handleClear}>
            <Trash2 size={14} className="mr-2" /> Clear
          </Button>
        </div>

        {limitHit && (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs font-medium flex items-start gap-2">
            <AlertCircle size={14} className="shrink-0 mt-0.5" />
            {limitHit}
          </div>
        )}
      </div>

      {/* RIGHT: Canvas */}
      <div className="flex-1 space-y-4">
        <Card
          className={cn(
            'p-8 bg-surface-sunken min-h-[600px] flex flex-col items-center justify-center overflow-auto rounded-3xl border-2 transition-colors select-none',
            isValid ? 'border-signal-emerald shadow-[0_0_0_4px_rgba(34,197,94,0.1)]' : 'border-line-hairline'
          )}
        >
          <div className="bg-surface-card p-6 rounded-[2rem] border-4 border-line-subtle shadow-floating flex flex-col items-center relative">
            <div className="w-full flex justify-end mb-6 pb-4 border-b-2 border-dashed border-line-hairline">
              <div className="w-12 h-12 border-4 border-ink-muted rounded-full flex items-center justify-center text-[10px] font-bold text-ink-muted bg-surface-sunken rotate-[-15deg]">
                DRV
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              {grid.map((row, r) => (
                <div key={r} className="flex gap-1.5">
                  {row.map((cell, c) => (
                    <div
                      key={`${r}-${c}`}
                      onMouseDown={() => handleMouseDown(r, c)}
                      onMouseEnter={() => handleMouseEnter(r, c)}
                      className={cn(
                        'w-11 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all cursor-pointer border-2 relative',
                        cellClasses(cell)
                      )}
                    >
                      {cell !== 'AISLE' && `${String.fromCharCode(65 + r)}${c + 1}`}
                      {(cell === 'SEATER_F' || cell === 'SLEEPER_F') && (
                        <span className="absolute top-0.5 right-0.5 text-[8px] leading-none">♀</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Legend */}
        <div className="flex flex-wrap items-center justify-center gap-4 p-3 rounded-lg bg-surface-card border border-line-hairline text-xs">
          <span className="font-bold text-ink-muted uppercase tracking-wider text-[10px]">Legend:</span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-emerald-500/10 border-2 border-emerald-500/30" />
            Seater
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-blue-500/10 border-2 border-blue-500/30" />
            Sleeper
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-pink-500/15 border-2 border-pink-500/40 text-pink-700 flex items-center justify-center text-[9px]">♀</span>
            Female Seater
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded bg-purple-500/15 border-2 border-purple-500/40 text-purple-700 flex items-center justify-center text-[9px]">♀</span>
            Female Sleeper
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded border-2 border-dashed border-line-subtle" />
            Aisle
          </span>
        </div>

        {/* Counter + Actions */}
        <div className="flex items-center justify-between p-5 bg-surface-card border border-line-hairline rounded-xl shadow-sm">
          <div className="flex items-center gap-4">
            <div
              className={cn(
                'flex items-center gap-3 px-4 py-2 rounded-lg border-2',
                isValid ? 'border-signal-emerald bg-signal-emerald/5' : 'border-amber-500 bg-amber-500/5'
              )}
            >
              {isValid ? (
                <CheckCircle2 size={22} className="text-brand-text" />
              ) : (
                <AlertCircle size={22} className="text-amber-500" />
              )}
              <div>
                <p className="text-xs font-bold uppercase text-ink-muted">Seats Assigned</p>
                <p className="text-lg font-bold text-ink-bright leading-none">
                  {assignedSeats} <span className="text-sm text-ink-muted">/ {capacity} capacity</span>
                </p>
              </div>
            </div>
            <div className="hidden md:flex flex-col gap-0.5 text-[11px] text-ink-muted">
              <span>🛏 {sleeperSeats} sleeper · 🪑 {assignedSeats - sleeperSeats} seater</span>
              <span>♀ {femaleSeats} female-only</span>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="ghost" onClick={onCancel}>Cancel</Button>
            <Button onClick={handleSave} disabled={!isValid || isSaving} loading={isSaving} className="w-40">
              Save Layout
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}