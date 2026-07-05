import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Icon } from './Icons';

interface CalculatorProps {
  initialValue: number;
  onConfirm: (value: number) => void;
  onCancel: () => void;
  label?: string;
}

// Safe recursive descent parser for math expressions.
// Supports: + - * / ** (^) with correct precedence, unary minus, parentheses, decimals.
// No eval — only numeric literals and the operators above are accepted.
const evalExpr = (expr: string): number | null => {
  const js = expr.replace(/×/g, '*').replace(/÷/g, '/').replace(/\u2212/g, '-').replace(/\^/g, '**');
  let pos = 0;

  const peek = () => js[pos];
  const consume = () => js[pos++];
  const skipWs = () => { while (js[pos] === ' ') pos++; };

  const parseNum = (): number | null => {
    skipWs();
    let s = '';
    if (peek() === '-') { s += consume(); }
    while (/[0-9.]/.test(peek() ?? '')) s += consume();
    if (s === '' || s === '-') return null;
    const n = parseFloat(s);
    return isNaN(n) ? null : n;
  };

  const parseAtom = (): number | null => {
    skipWs();
    if (peek() === '(') {
      consume();
      const v = parseExpr(0);
      skipWs();
      if (peek() === ')') consume();
      return v;
    }
    if (peek() === '-') { consume(); const v = parseAtom(); return v !== null ? -v : null; }
    return parseNum();
  };

  type Op = { prec: number; right: boolean; fn: (a: number, b: number) => number };
  const OPS_MAP: Record<string, Op> = {
    '+': { prec: 1, right: false, fn: (a, b) => a + b },
    '-': { prec: 1, right: false, fn: (a, b) => a - b },
    '*': { prec: 2, right: false, fn: (a, b) => a * b },
    '/': { prec: 2, right: false, fn: (a, b) => a / b },
    '**': { prec: 3, right: true, fn: (a, b) => Math.pow(a, b) },
  };

  const parseExpr = (minPrec: number): number | null => {
    let left = parseAtom();
    if (left === null) return null;
    while (true) {
      skipWs();
      let op = '';
      if (js.startsWith('**', pos)) { op = '**'; }
      else if ('+-*/'.includes(peek() ?? '')) { op = peek()!; }
      if (!op || !OPS_MAP[op]) break;
      const { prec, right, fn } = OPS_MAP[op];
      if (prec < minPrec) break;
      pos += op.length;
      const right_val = parseExpr(right ? prec : prec + 1);
      if (right_val === null) return null;
      left = fn(left, right_val);
    }
    return left;
  };

  try {
    const result = parseExpr(0);
    skipWs();
    if (pos !== js.length || result === null || !isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
};

const OPS = new Set(['+', '-', '*', '/', '×', '÷', '−', '^']);

export const formatScore = (n: number): string => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs < 1e5) {
    if (abs > 0 && abs < 0.01) return n < 0 ? '>-0.01' : '<0.01';
    const s = parseFloat(n.toPrecision(4));
    return String(s);
  }
  const fmt = (val: number, suffix: string) => {
    const floored = Math.floor(val * 100) / 100;
    return `${sign}${floored.toFixed(2).replace(/\.?0+$/, '')}${suffix}`;
  };
  if (abs < 1e6) return fmt(abs / 1e3, 'k');
  if (abs < 1e9) return fmt(abs / 1e6, 'M');
  if (abs < 1e12) return fmt(abs / 1e9, 'G');
  if (abs < 1e15) return fmt(abs / 1e12, 'T');
  return `${sign}${abs.toExponential(3).replace('e+', ' e').replace('e-', ' e-').replace('e', ' e')}`;
};

export function Calculator({ initialValue, onConfirm, onCancel, label }: CalculatorProps) {
  const [expr, setExpr] = useState(String(initialValue));

  const append = (s: string) => setExpr(prev => {
    // Replace trailing operator with new one
    if (OPS.has(s) && prev.length > 0 && OPS.has(prev.slice(-1))) {
      if (s === '−' && prev.slice(-1) !== '−') return prev + s; // allow negation only after non-minus op
      return prev.slice(0, -1) + s;  // replace operator (also handles −→− by replacing)
    }
    // Block double-minus when not following another operator
    if (s === '−' && prev.slice(-1) === '−') return prev;
    // Replace lone '0' with digit
    if (!OPS.has(s) && prev === '0') {
      return s;
    }
    return prev + s;
  });

  const clear = () => setExpr('0');

  const evaluate = () => {
    const result = evalExpr(expr);
    if (result !== null) setExpr(String(result));
  };

  const backspace = () => setExpr(prev => prev.length > 1 ? prev.slice(0, -1) : '0');
  const parsed = evalExpr(expr);
  const valid = parsed !== null;

  // Keyboard input capture
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      e.stopPropagation();
      e.preventDefault();

      const key = e.key;

      if (key >= '0' && key <= '9') {
        append(key);
      } else if (key === '.') {
        append('.');
      } else if (key === '+') {
        append('+');
      } else if (key === '-') {
        append('−');
      } else if (key === '*') {
        append('×');
      } else if (key === '/') {
        append('÷');
      } else if (key === '^') {
        append('^');
      } else if (key === 'Backspace') {
        backspace();
      } else if (key === 'Delete') {
        clear();
      } else if (key === '=' || key === 'Enter') {
        // If expression is already a plain number, confirm; otherwise evaluate
        const result = evalExpr(expr);
        if (result !== null && String(result) === expr) {
          onConfirm(result);
        } else {
          evaluate();
        }
      } else if (key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [expr, onConfirm, onCancel]);

  const sp = (e: { stopPropagation: () => void }) => e.stopPropagation();

  const base: CSSProperties = {
    height: '2em', width: '2em', margin: '0.1em',
    fontWeight: 'bold', fontSize: '1.5em', textAlign: 'center',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    cursor: 'pointer', borderRadius: '0.3em', userSelect: 'none',
  };
  const btn: CSSProperties = { ...base, backgroundColor: '#e8e8e8' };
  const confirmBtn: CSSProperties = { ...base, backgroundColor: '#ccc' };
  const cancelBtn: CSSProperties = { ...base, backgroundColor: '#ccc', color: '#c00' };

  return (
    <wired-dialog open onClick={sp}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '0.5em 0.75em 0.75em' }}>
        {/* Display */}
        <wired-card style={{ width: '17em', margin: '0.5em 0', cursor: 'default', position: 'relative' } as CSSProperties}
          onClick={(e) => e.stopPropagation()}
        >
          {label && <span style={{ position: 'absolute', top: '0em', left: '0.3em', fontSize: '0.8em', color: '#888' }}>{label}</span>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', fontFamily: 'monospace', fontSize: '1.5em', minHeight: '2.25em', padding: '0 0.25em' }}>
            <span style={{ textAlign: 'right', maxWidth: '15em', overflowX: 'hidden' }}>{expr}</span>
          </div>
        </wired-card>
        {/* Row 1: ⌫ | C | ^ | ÷ */}
        <div style={{ display: 'flex' }}>
          <wired-card style={btn} onClick={() => backspace()}>⌫</wired-card>
          <wired-card style={btn} onClick={() => clear()}>C</wired-card>
          <wired-card style={btn} onClick={() => append('^')}>^</wired-card>
          <wired-card style={btn} onClick={() => append('÷')}>÷</wired-card>
        </div>
        {/* Row 2: 7 8 9 × */}
        <div style={{ display: 'flex' }}>
          {['7','8','9'].map(k => <wired-card key={k} style={btn} onClick={() => append(k)}>{k}</wired-card>)}
          <wired-card style={btn} onClick={() => append('×')}>×</wired-card>
        </div>
        {/* Row 3: 4 5 6 − */}
        <div style={{ display: 'flex' }}>
          {['4','5','6'].map(k => <wired-card key={k} style={btn} onClick={() => append(k)}>{k}</wired-card>)}
          <wired-card style={btn} onClick={() => append('−')}>−</wired-card>
        </div>
        {/* Row 4: 1 2 3 + */}
        <div style={{ display: 'flex' }}>
          {['1','2','3'].map(k => <wired-card key={k} style={btn} onClick={() => append(k)}>{k}</wired-card>)}
          <wired-card style={btn} onClick={() => append('+')}>+</wired-card>
        </div>
        {/* Row 5: . | 0 | = (wide) */}
        <div style={{ display: 'flex', width: '100%' }}>
          <wired-card style={btn} onClick={() => append('.')}>.</wired-card>
          <wired-card style={btn} onClick={() => append('0')}>0</wired-card>
          <wired-card style={{ ...btn, flex: 1 }} onClick={() => evaluate()}>=</wired-card>
        </div>
        {/* Row 6: Cancel (half) | Done (half) */}
        <div style={{ display: 'flex', width: '100%', gap: 0 }}>
          <wired-card style={{ ...cancelBtn, flex: 1 }} onClick={() => onCancel()}>
            <Icon name='exit' />
          </wired-card>
          <wired-card style={{ ...confirmBtn, flex: 1 }} onClick={() => { if (valid) onConfirm(parsed!); }}>
            <Icon name='done' />
          </wired-card>
        </div>
      </div>
    </wired-dialog>
  );
}
