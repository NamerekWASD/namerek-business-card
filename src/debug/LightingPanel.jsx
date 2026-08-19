import { useState } from 'react';
import { LAYERS } from '../scene/layers.js';
import {
  GROUP_TITLES, LIGHT_DEFAULTS, LIGHT_GROUPS, LIGHT_KNOBS, knobDiff, resetKnobs, setKnob,
  setupSource, useLightTuning,
} from '../scene/renderers/r3f/tuning.js';
import { btnStyle } from './btnStyle.js';

// The bench's front panel. Every control on it is generated from `LIGHT_KNOBS`,
// so there is no list here to fall out of step with the one the scene reads —
// adding a knob is one entry in that file and nothing at all in this one.
//
// It only appears on a debug build, and only under the WebGL backend: the CSS
// scene computes its shading arithmetically from `model/lighting.js` and none of
// these knobs reach it, so offering them there would be a panel that lies.

const row = {
  display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
};

/** One control, dispatched on the knob's kind. */
function Knob({ knob, value }) {
  const changed = value !== LIGHT_DEFAULTS[knob.key];
  const set = (v) => setKnob(knob.key, v);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }} title={knob.note ?? ''}>
      <div style={row}>
        <span style={{ color: changed ? '#ffd08a' : 'rgba(255,255,255,0.72)' }}>
          {knob.label}
        </span>
        <span style={{ color: 'rgba(255,255,255,0.5)' }}>
          {knob.kind === 'number' ? Number(value).toFixed(knob.step < 0.05 ? 3 : 2) : String(value)}
        </span>
      </div>

      {knob.kind === 'enum' && (
        <select
          value={value}
          onChange={(e) => set(e.target.value)}
          style={{
            ...btnStyle, background: '#111', width: '100%', padding: '3px 4px', cursor: 'pointer',
          }}
        >
          {knob.options.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )}

      {knob.kind === 'color' && (
        <input
          type="color"
          value={value}
          onChange={(e) => set(e.target.value)}
          style={{
            width: '100%', height: 20, padding: 0, border: '1px solid rgba(255,255,255,0.2)',
            background: 'transparent', cursor: 'pointer',
          }}
        />
      )}

      {(knob.kind === 'number' || knob.kind === 'int') && (
        <input
          type="range"
          min={knob.min}
          max={knob.max}
          step={knob.step}
          value={value}
          onChange={(e) => set(Number(e.target.value))}
          style={{ width: '100%' }}
        />
      )}
    </div>
  );
}

function LightingPanel() {
  const tuning = useLightTuning();
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const diff = knobDiff();
  const moved = Object.keys(diff).length;

  // The whole setup, ready to be pasted over `renderers/r3f/lightSetup.js`.
  // That file is the one place a shipped value lives, so "save this" is one
  // paste and one commit — and until it is done, a session's dialling exists
  // only in this browser's localStorage and will never be deployed.
  const copy = () => {
    const text = setupSource();
    navigator.clipboard?.writeText(text);
    // and to the console as well: the clipboard is refused on an insecure
    // origin, and a button that silently does nothing there is a bad button
    console.info('[lighting] paste over src/scene/renderers/r3f/lightSetup.js:');
    console.info(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div
      style={{
        position: 'fixed',
        right: 12,
        top: 12,
        maxHeight: 'calc(100vh - 24px)',
        overflowY: 'auto',
        zIndex: LAYERS.debug,
        background: 'rgba(0,0,0,0.8)',
        border: '1px solid rgba(255,255,255,0.2)',
        borderRadius: 8,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        width: 244,
        fontFamily: "'Space Mono', monospace",
        fontSize: 11,
        color: '#fff',
      }}
    >
      <div style={row}>
        <strong style={{ letterSpacing: 1 }}>light</strong>
        <span style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => setOpen(!open)} style={btnStyle}>{open ? '▾' : '▸'}</button>
        </span>
      </div>

      {open && LIGHT_GROUPS.map((group) => (
        <div key={group} style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div style={{ color: 'rgba(255,255,255,0.38)', fontSize: 9, lineHeight: 1.3 }}>
            {GROUP_TITLES[group]}
          </div>
          {LIGHT_KNOBS.filter((k) => k.group === group).map((knob) => (
            <Knob key={knob.key} knob={knob} value={tuning[knob.key]} />
          ))}
        </div>
      ))}

      {open && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <button onClick={resetKnobs} style={btnStyle} disabled={!moved}>reset</button>
          {/* Never disabled. The setup is copyable whether or not this session
              moved anything — "give me the file as it stands" is a reasonable
              thing to ask of a bench, and the count below says what is at
              stake rather than gating the button. */}
          <button onClick={copy} style={btnStyle}>
            {copied ? 'copied → lightSetup.js' : 'copy setup'}
          </button>
          {moved > 0 && <span style={{ color: '#ffd08a' }}>{moved} unsaved</span>}
        </div>
      )}
    </div>
  );
}

export default LightingPanel;
