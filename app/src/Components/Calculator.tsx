import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Icon } from './Icons';

interface CalculatorProps {
  initialValue: number;
  onConfirm: (value: number) => void;
  onCancel: () => void;
  label?: string;
}

// Safely evaluate a math expression string
const evalExpr = (expr: string): number | null => {
  try {
    // Replace display chars with JS operators, and strip leading zeros that cause octal
    const js = expr
      .replace(/×/g, '*').replace(/÷/g, '/').replace(/\u2212/g, '-')
      .replace(/\^/g, '**') // exponentiation
      .replace(/\b0+(?=[1-9])/g, ''); // strip leading zeros (not before decimal point)
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${js})`)();
    return typeof result === 'number' && isFinite(result) ? result : null;
  } catch {
    return null;
  }
};

const OPS = new Set(['+', '-', '*', '/', '×', '÷', '−', '^']);

export const formatScore = (n: number): string => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs < 1e5) return String(n);
  const fmt = (val: number, suffix: string) => {
    const floored = Math.floor(val * 100) / 100;
    return `${sign}${floored.toFixed(2).replace(/\.?0+$/, '')}${suffix}`;
  };
  if (abs < 1e6) return `${sign}${Math.floor(abs / 1e3)}k`;
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
        <wired-card style={{ width: '17em', margin: '0.5em 0', cursor: 'default' } as CSSProperties}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'monospace', fontSize: '1.5em', minHeight: '2.25em', padding: '0 0.25em' }}>
            {label && <span style={{ color: '#888', fontSize: '0.8em' }}>{label}</span>}
            <span style={{ textAlign: 'right', maxWidth: '9.5em', overflowX: 'hidden' }}>{expr}</span>
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
          <wired-card style={{ ...confirmBtn, flex: 1 }} onClick={() => { if (valid && parsed !== null) onConfirm(parsed); }}>
            <Icon name='done' />
          </wired-card>
        </div>
      </div>
    </wired-dialog>
  );
}
