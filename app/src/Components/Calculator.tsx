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
      .replace(/\b0+(\d)/g, '$1'); // strip leading zeros from number literals
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${js})`)();
    return typeof result === 'number' && isFinite(result) ? result : null;
  } catch {
    return null;
  }
};

export function Calculator({ initialValue, onConfirm, onCancel, label }: CalculatorProps) {
  const [expr, setExpr] = useState(String(initialValue));

  const ops = new Set(['+', '-', '*', '/', '×', '÷', '−', '^']);
  const append = (s: string) => setExpr(prev => {
    // Replace trailing operator with new one
    if (ops.has(s) && prev.length > 0 && ops.has(prev.slice(-1))) {
      return prev.slice(0, -1) + s;
    }
    // Replace lone '0' with digit
    if (!ops.has(s) && prev === '0') {
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
  const numBtn: CSSProperties = { ...base, backgroundColor: '#e8e8e8' };
  const opBtn: CSSProperties = { ...base, backgroundColor: '#e8e8e8' };
  const funcBtn: CSSProperties = { ...base, backgroundColor: '#e8e8e8' };
  const confirmBtn: CSSProperties = { ...base, backgroundColor: '#ccc' };
  const cancelBtn: CSSProperties = { ...base, backgroundColor: '#ccc', color: '#c00' };

  return (
    <wired-dialog open onClick={sp}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '0.5em 0.75em 0.75em' }}>
        {/* Display */}
        <wired-card style={{ width: '100%', marginBottom: '0.1em', cursor: 'default' } as CSSProperties}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', alignItems: 'center', fontFamily: 'monospace', gap: '0.4em', minHeight: '1em', padding: '0.1em 0.2em' }}>
            {label && <span style={{ color: '#888', flexShrink: 0, fontSize: '0.8em' }}>{label}</span>}
            <span style={{ flex: 1, textAlign: 'right', overflowX: 'auto', whiteSpace: 'nowrap' }}>{expr}</span>
          </div>
        </wired-card>
        {/* Row 1: ⌫ | C | ^ | ÷ */}
        <div style={{ display: 'flex' }}>
          <wired-card style={funcBtn} onClick={() => backspace()}>⌫</wired-card>
          <wired-card style={funcBtn} onClick={() => clear()}>C</wired-card>
          <wired-card style={opBtn} onClick={() => append('^')}>^</wired-card>
          <wired-card style={opBtn} onClick={() => append('÷')}>÷</wired-card>
        </div>
        {/* Row 2: 7 8 9 × */}
        <div style={{ display: 'flex' }}>
          {['7','8','9'].map(k => <wired-card key={k} style={numBtn} onClick={() => append(k)}>{k}</wired-card>)}
          <wired-card style={opBtn} onClick={() => append('×')}>×</wired-card>
        </div>
        {/* Row 3: 4 5 6 − */}
        <div style={{ display: 'flex' }}>
          {['4','5','6'].map(k => <wired-card key={k} style={numBtn} onClick={() => append(k)}>{k}</wired-card>)}
          <wired-card style={opBtn} onClick={() => append('−')}>−</wired-card>
        </div>
        {/* Row 4: 1 2 3 + */}
        <div style={{ display: 'flex' }}>
          {['1','2','3'].map(k => <wired-card key={k} style={numBtn} onClick={() => append(k)}>{k}</wired-card>)}
          <wired-card style={opBtn} onClick={() => append('+')}>+</wired-card>
        </div>
        {/* Row 5: . | 0 | = (wide) */}
        <div style={{ display: 'flex', width: '100%' }}>
          <wired-card style={numBtn} onClick={() => append('.')}>.</wired-card>
          <wired-card style={numBtn} onClick={() => append('0')}>0</wired-card>
          <wired-card style={{ ...opBtn, flex: 1 }} onClick={() => evaluate()}>=</wired-card>
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
