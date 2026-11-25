// Keyboard and mouse input controller translating browser events into world coordinates and discrete actions.

import { WORLD } from './config.js';

export function createInputController(canvas, onAudioUnlock) {
  const keys = new Set();
  const pendingClicks = [];
  const pendingActions = [];
  const pointer = { x: WORLD.width / 2, y: WORLD.height / 2, inside: false };

  function toWorldPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / WORLD.width, rect.height / WORLD.height);
    const drawW = WORLD.width * scale;
    const drawH = WORLD.height * scale;
    const offsetX = rect.left + (rect.width - drawW) / 2;
    const offsetY = rect.top + (rect.height - drawH) / 2;
    return {
      x: (clientX - offsetX) / scale,
      y: (clientY - offsetY) / scale,
    };
  }

  function handleKeyDown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
    if (onAudioUnlock) onAudioUnlock();
    const wasDown = keys.has(e.code);
    keys.add(e.code);
    if (!wasDown) {
      if (e.code === 'Space' || e.code === 'KeyE') pendingActions.push('interact');
      else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') pendingActions.push('dash');
      else if (e.code === 'KeyQ' || e.code === 'KeyX') pendingActions.push('drop');
      else if (e.code === 'KeyP' || e.code === 'Escape') pendingActions.push('pause');
      else if (e.code === 'KeyM') pendingActions.push('mute');
      else if (e.code === 'Enter') pendingActions.push('confirm');
      else if (e.code.startsWith('Digit')) {
        const num = Number(e.code.slice(5));
        if (num >= 1 && num <= 6) pendingActions.push(`crate_${num}`);
      }
    }
  }

  function handleKeyUp(e) {
    keys.delete(e.code);
  }

  function handlePointerMove(e) {
    const pt = toWorldPoint(e.clientX, e.clientY);
    pointer.x = pt.x;
    pointer.y = pt.y;
    pointer.inside = pt.x >= 0 && pt.x <= WORLD.width && pt.y >= 0 && pt.y <= WORLD.height;
  }

  function handlePointerDown(e) {
    if (onAudioUnlock) onAudioUnlock();
    const pt = toWorldPoint(e.clientX, e.clientY);
    pointer.x = pt.x;
    pointer.y = pt.y;
    pointer.inside = true;
    pendingClicks.push({ x: pt.x, y: pt.y, button: e.button });
  }

  function handleBlur() {
    keys.clear();
  }

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  window.addEventListener('blur', handleBlur);
  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerdown', handlePointerDown);

  return {
    getMoveVector() {
      let mx = 0;
      let my = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
      const len = Math.hypot(mx, my);
      if (len > 1) {
        mx /= len;
        my /= len;
      }
      return { x: mx, y: my };
    },
    isInteractHeld() {
      return keys.has('Space') || keys.has('KeyE');
    },
    takeActions() {
      return pendingActions.splice(0, pendingActions.length);
    },
    takeClicks() {
      return pendingClicks.splice(0, pendingClicks.length);
    },
    getPointer() {
      return pointer;
    },
    destroy() {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerdown', handlePointerDown);
    },
  };
}
