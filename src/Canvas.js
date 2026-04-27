// HTML Canvas: https://github.com/jakubfiala/atrament
import Atrament, { MODE_DRAW, MODE_ERASE, MODE_DISABLED } from 'atrament';

// Re-export atrament mode constants plus our logical dots mode
export { MODE_DRAW, MODE_ERASE };
export const MODE_DOTS = 'dots';

const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
const canvas = document.querySelector('#sketchpad');
const canvasSize = Math.min(vw * 0.9, vh * 0.7);

// Set CSS size to control display size
canvas.style.width = `${canvasSize}px`;
canvas.style.height = `${canvasSize}px`;

export const sketchpad = new Atrament(canvas, {
  width: canvasSize,
  height: canvasSize,
  color: 'black',
  smoothing: 0.1,
  adaptiveStroke: true,
  weight: 4,
});

// Stroke History and Undo: https://github.com/jakubfiala/atrament/issues/71#issuecomment-1214261577
export const strokes = [];
export const redoStack = [];
let isUndoRedoInProgress = false;

// Drawing mode state machine (managed across Canvas.js + ActionSpace.tsx):
//
//   SOLID  + Erase → ERASE   (activate erase)
//   ERASE  + Erase → SOLID   (deactivate erase)
//   SOLID  + Dots  → DOTS    (activate stipple)
//   DOTS   + Dots  → SOLID   (deactivate stipple)
//   DOTS   + Erase → ERASE   (setMode clears stipple state before activating erase)
//   ERASE  + Dots  → DOTS    (setMode clears erase before activating stipple)
//
// setMode/getMode translate between the logical modes (MODE_DRAW/ERASE/DOTS) and the
// atrament internal state (MODE_DRAW/ERASE/MODE_DISABLED + stippleDensity).
// React components mirror the logical mode in a single drawMode state variable.

// Stipple mode — plots dots at varying density to simulate shading within the 1-bit constraint.
// NOTE: segmentdrawn only fires inside Atrament's draw(), which is skipped in MODE_DISABLED.
// We track pointer events directly and use distance-based dot spacing instead.
const STIPPLE_PRESETS = {
  light: { spacing: 12 },
};
const STIPPLE_DENSITIES = [null, 'light'];
let stippleDensity = null;

// Live stipple stroke state
let stippleActive = false;
let stippleSegments = [];
let stippleLastPoint = null;
let stippleDistSinceDot = 0;

function plotDot(x, y) {
  const ctx = canvas.getContext('2d');
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'black';
  ctx.beginPath();
  ctx.arc(x, y, sketchpad.weight / 2, 0, Math.PI * 2);
  ctx.fill();
}

canvas.addEventListener('pointerdown', (e) => {
  if (!stippleDensity || !e.isPrimary || e.button !== 0) return;
  stippleActive = true;
  stippleSegments = [{ point: { x: e.offsetX, y: e.offsetY }, time: performance.now() }];
  stippleLastPoint = { x: e.offsetX, y: e.offsetY };
  stippleDistSinceDot = 0;
  plotDot(e.offsetX, e.offsetY);
});

canvas.addEventListener('pointermove', (e) => {
  if (!stippleDensity || !stippleActive || !e.isPrimary) return;
  const { offsetX: x, offsetY: y } = e;
  const dx = x - stippleLastPoint.x;
  const dy = y - stippleLastPoint.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return;
  stippleSegments.push({ point: { x, y }, time: performance.now() });
  stippleDistSinceDot += dist;
  if (stippleDistSinceDot >= STIPPLE_PRESETS[stippleDensity].spacing) {
    plotDot(x, y);
    stippleDistSinceDot = 0;
  }
  stippleLastPoint = { x, y };
});

function endStippleStroke() {
  if (!stippleActive) return;
  stippleActive = false;
  if (!sketchpad.recordPaused && stippleSegments.length > 0) {
    strokes.push({ type: 'stroke', segments: stippleSegments, isStipple: true, stippleDensity, weight: sketchpad.weight });
    redoStack.length = 0;
  }
  stippleSegments = [];
  stippleLastPoint = null;
  stippleDistSinceDot = 0;
}

canvas.addEventListener('pointerup', (e) => { if (e.isPrimary) endStippleStroke(); });
canvas.addEventListener('pointercancel', (e) => { if (e.isPrimary) endStippleStroke(); });

sketchpad.recordStrokes = true;

sketchpad.addEventListener('strokerecorded', (obj) => {
  if (!sketchpad.recordPaused) {
    // Stipple strokes are recorded by our pointerup handler above — skip Atrament's recording
    if (stippleDensity) return;
    obj.stroke.type = "stroke";
    obj.stroke.segments = obj.stroke.segments.filter((segment) => !Number.isNaN(segment?.time))
    strokes.push(obj.stroke);
    // Clear redo stack when new stroke is added
    redoStack.length = 0;
  }
});

// Compensate for Dots
canvas.addEventListener('click', (e) => {
  // Stipple clicks are already handled by pointerdown/pointerup — skip
  if (stippleDensity) return;
  if (strokes.length === 0) return;
  const bounds = sketchpad.canvas.getBoundingClientRect();
  const clickPoint = { x: e.clientX, y: e.clientY }
  if (strokes[strokes.length - 1].segments.length < 3) {
    const strokePoints = [
      { point: { x: Math.floor(clickPoint.x - bounds.x), y: Math.floor(clickPoint.y - bounds.y) }, time: 1 },
      { point: { x: Math.floor(clickPoint.x - bounds.x), y: Math.floor(clickPoint.y - bounds.y + 1) }, time: 2 },
    ]
    sketchpad.draw(strokePoints[0].point.x, strokePoints[0].point.y, strokePoints[1].point.x, strokePoints[1].point.y);
    strokes[strokes.length - 1].segments = strokePoints;
  }
})

function replayStippleStroke(stroke) {
  const ctx = document.getElementById("sketchpad")?.getContext('2d');
  if (!ctx) return;
  const radius = (stroke.weight ?? 4) / 2;
  const { spacing } = STIPPLE_PRESETS[stroke.stippleDensity];
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = 'black';
  let lastPoint = null;
  let distSinceDot = 0;
  stroke.segments.forEach((seg, i) => {
    const { x, y } = seg.point;
    if (i === 0) {
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
      lastPoint = { x, y };
      return;
    }
    const dx = x - lastPoint.x, dy = y - lastPoint.y;
    distSinceDot += Math.sqrt(dx * dx + dy * dy);
    if (distSinceDot >= spacing) {
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
      distSinceDot = 0;
    }
    lastPoint = { x, y };
  });
}

export const undo = (baseImage = null) => {
  // Prevent concurrent undo/redo operations
  if (isUndoRedoInProgress) return;

  // Don't undo if there are no strokes
  if (strokes.length === 0) return;

  isUndoRedoInProgress = true;

  // Store original brush settings
  const original = {
    mode: getMode(),
    weight: sketchpad.weight,
    smoothing: sketchpad.smoothing,
    color: sketchpad.color,
    adaptiveStroke: sketchpad.adaptiveStroke,
  };

  sketchpad.clear();
  sketchpad.recordPaused = true;
  const removedStroke = strokes.pop();
  if (removedStroke) {
    redoStack.push(removedStroke);
  }

  // Draw base image first if provided
  if (baseImage) {
    const replayCanvas = document.getElementById("sketchpad");
    const ctx = replayCanvas?.getContext('2d');
    ctx?.drawImage(baseImage, 0, 0, replayCanvas.width, replayCanvas.height);
  }

  // Replay all remaining strokes
  for (let i = 0; i <= strokes.length; i++) {
    const stroke = strokes[i];
    if (!stroke?.segments?.length) continue;

    // Handle fill operations
    if (stroke.isFill) {
      const replayCanvas = document.getElementById("sketchpad");
      const ctx = replayCanvas?.getContext('2d');
      if (ctx && replayCanvas) {
        ctx.fillStyle = stroke.color;
        ctx.fillRect(0, 0, replayCanvas.width, replayCanvas.height);
      }
      continue;
    }

    // Handle stipple operations
    if (stroke.isStipple) {
      replayStippleStroke(stroke);
      continue;
    }

    // Set stroke properties
    sketchpad.mode = stroke.mode;
    sketchpad.weight = stroke.weight;
    sketchpad.smoothing = stroke.smoothing;
    sketchpad.color = stroke.color;
    sketchpad.adaptiveStroke = stroke.adaptiveStroke;

    // Create a copy of segments to avoid modifying original data
    const segments = [...stroke.segments];
    const firstSegment = segments.shift();
    const firstPoint = firstSegment.point;
    sketchpad.beginStroke(firstPoint.x, firstPoint.y);

    let prevPoint = firstPoint;
    while (segments.length > 0) {
      const segment = segments.shift();
      const point = segment.point;
      const pressure = segment.pressure !== undefined ? segment.pressure : 0.5;
      const { x, y } = sketchpad.draw(
        point.x,
        point.y,
        prevPoint.x,
        prevPoint.y,
        pressure
      );
      prevPoint = { x, y };
    }

    sketchpad.endStroke(prevPoint.x, prevPoint.y);
  }

  sketchpad.recordPaused = false;

  // Restore original brush settings
  // timeout because it breaks without?!
  setTimeout(() => {
    setMode(original.mode);
    isUndoRedoInProgress = false;
  }, 100);
  sketchpad.weight = original.weight;
  sketchpad.smoothing = original.smoothing;
  sketchpad.color = original.color;
  sketchpad.adaptiveStroke = original.adaptiveStroke;
}

export const redo = (baseImage = null) => {
  // Prevent concurrent undo/redo operations
  if (isUndoRedoInProgress) return;

  if (redoStack.length === 0) return;

  isUndoRedoInProgress = true;

  // Store original brush settings
  const original = {
    mode: getMode(),
    weight: sketchpad.weight,
    smoothing: sketchpad.smoothing,
    color: sketchpad.color,
    adaptiveStroke: sketchpad.adaptiveStroke,
  };

  sketchpad.recordPaused = true;
  const restoredStroke = redoStack.pop();
  strokes.push(restoredStroke);

  // If base image provided, redraw everything
  if (baseImage) {
    const replayCanvas = document.getElementById("sketchpad");
    const ctx = replayCanvas?.getContext('2d');
    ctx?.clearRect(0, 0, replayCanvas.width, replayCanvas.height);
    ctx?.drawImage(baseImage, 0, 0, replayCanvas.width, replayCanvas.height);

    // Replay all strokes
    for (let i = 0; i < strokes.length; i++) {
      const stroke = strokes[i];
      if (!stroke?.segments?.length) continue;

      // Handle fill operations
      if (stroke.isFill) {
        ctx.fillStyle = stroke.color;
        ctx.fillRect(0, 0, replayCanvas.width, replayCanvas.height);
        continue;
      }

      // Handle stipple operations
      if (stroke.isStipple) {
        replayStippleStroke(stroke);
        continue;
      }

      sketchpad.mode = stroke.mode;
      sketchpad.weight = stroke.weight;
      sketchpad.smoothing = stroke.smoothing;
      sketchpad.color = stroke.color;
      sketchpad.adaptiveStroke = stroke.adaptiveStroke;

      const segments = [...stroke.segments];
      const firstPoint = segments.shift().point;
      sketchpad.beginStroke(firstPoint.x, firstPoint.y);

      let prevPoint = firstPoint;
      while (segments.length > 0) {
        const point = segments.shift().point;
        const { x, y } = sketchpad.draw(point.x, point.y, prevPoint.x, prevPoint.y);
        prevPoint = { x, y };
      }

      sketchpad.endStroke(prevPoint.x, prevPoint.y);
    }
  } else {
    // Just replay the restored stroke
    const stroke = restoredStroke;
    if (stroke?.segments?.length) {
      if (stroke.isStipple) {
        replayStippleStroke(stroke);
      } else if (stroke.isFill) {
        const replayCanvas = document.getElementById("sketchpad");
        const ctx = replayCanvas?.getContext('2d');
        if (ctx) {
          ctx.fillStyle = stroke.color;
          ctx.fillRect(0, 0, replayCanvas.width, replayCanvas.height);
        }
      } else {
        sketchpad.mode = stroke.mode;
        sketchpad.weight = stroke.weight;
        sketchpad.smoothing = stroke.smoothing;
        sketchpad.color = stroke.color;
        sketchpad.adaptiveStroke = stroke.adaptiveStroke;

        const segments = [...stroke.segments];
        const firstSegment = segments.shift();
        const firstPoint = firstSegment.point;
        sketchpad.beginStroke(firstPoint.x, firstPoint.y);

        let prevPoint = firstPoint;
        while (segments.length > 0) {
          const segment = segments.shift();
          const point = segment.point;
          const pressure = segment.pressure !== undefined ? segment.pressure : 0.5;
          const { x, y } = sketchpad.draw(
            point.x,
            point.y,
            prevPoint.x,
            prevPoint.y,
            pressure
          );
          prevPoint = { x, y };
        }

        sketchpad.endStroke(prevPoint.x, prevPoint.y);
      }
    }
  }

  sketchpad.recordPaused = false;

  // Restore original brush settings
  setTimeout(() => {
    setMode(original.mode);
    isUndoRedoInProgress = false;
  }, 100);
  sketchpad.weight = original.weight;
  sketchpad.smoothing = original.smoothing;
  sketchpad.color = original.color;
  sketchpad.adaptiveStroke = original.adaptiveStroke;
}

export const setMode = (mode) => {
  if (mode === MODE_DOTS) {
    stippleDensity = 'light';
    sketchpad.mode = MODE_DISABLED;
  } else {
    stippleDensity = null;
    stippleActive = false;
    stippleSegments = [];
    stippleLastPoint = null;
    stippleDistSinceDot = 0;
    sketchpad.mode = mode;
  }
};

export const getMode = () => {
  return stippleDensity ? MODE_DOTS : sketchpad.mode;
};

export const fillWhite = () => {
  const fillCanvas = document.getElementById("sketchpad");
  if (!fillCanvas) return;

  const ctx = fillCanvas.getContext('2d');
  if (!ctx) return;

  // Save current settings
  const originalColor = sketchpad.color;
  const originalWeight = sketchpad.weight;

  // Fill canvas with white using native canvas API
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, fillCanvas.width, fillCanvas.height);

  // Record as a stroke for undo functionality
  strokes.push({
    segments: [{
      point: { x: 0, y: 0 },
      time: 0,
      pressure: 1
    }],
    color: 'white',
    weight: fillCanvas.width,
    smoothing: sketchpad.smoothing,
    adaptiveStroke: false,
    mode: MODE_DRAW,
    isFill: true // Mark as fill operation
  });
  redoStack.length = 0;

  // Preserve MODE_DISABLED (stipple) but reset erase mode
  if (sketchpad.mode !== MODE_DISABLED) {
    sketchpad.mode = MODE_DRAW;
  }
  sketchpad.color = originalColor;
  sketchpad.weight = originalWeight;
}

const brushSizes = [2, 4, 8];
const brushSizeLabels = ['Small', 'Medium', 'Large'];
let currentSizeIndex = 1; // Start at medium (4)

export const cycleBrushSize = () => {
  currentSizeIndex = (currentSizeIndex + 1) % brushSizes.length;
  sketchpad.weight = brushSizes[currentSizeIndex];
  return brushSizeLabels[currentSizeIndex];
}

export const getCurrentBrushSize = () => {
  return brushSizeLabels[currentSizeIndex];
}

