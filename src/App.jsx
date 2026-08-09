import { useState } from 'react';
import Blueprint from './variants/Blueprint';
import Dieselpunk from './variants/Dieselpunk';

const variants = {
  blueprint: { label: 'V6 · чертёж' },
  dieselpunk: { label: 'V7 · дизельпанк' },
};

function Switcher({ current, onChange }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 12,
        right: 12,
        zIndex: 50,
        display: 'flex',
        gap: 6,
        background: 'rgba(0,0,0,0.55)',
        padding: 6,
        borderRadius: 8,
        backdropFilter: 'blur(4px)',
      }}
    >
      {Object.entries(variants).map(([key, v]) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          style={{
            fontSize: 11,
            padding: '6px 10px',
            borderRadius: 6,
            border: '1px solid rgba(255,255,255,0.25)',
            background: current === key ? '#fff' : 'transparent',
            color: current === key ? '#111' : '#fff',
            cursor: 'pointer',
          }}
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}

function App() {
  const [variant, setVariant] = useState('dieselpunk');

  return (
    <>
      <Switcher current={variant} onChange={setVariant} />
      {variant === 'blueprint' && <Blueprint />}
      {variant === 'dieselpunk' && <Dieselpunk />}
    </>
  );
}

export default App;
