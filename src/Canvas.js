// HTML Canvas: https://github.com/jakubfiala/atrament
import Atrament, { MODE_DRAW, MODE_ERASE, MODE_DISABLED } from 'atrament';

// Re-export mode constants
export { MODE_DRAW, MODE_ERASE };

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

// Stipple mode — plots dots at varying density to simulate shading within the 1-bit constraint
const STIPPLE_PRESETS = {
  light:  { radius: 1,   spacing: 8 },
  medium: { radius: 1.5, spacing: 4 },
  dark:   { radius: 2,   spacing: 2 },
};
const STIPPLE_DENSITIES = [null, 'light', 'medium', 'dark'];
let stippleDensity = null;
let stippleCounter = 0;

sketchpad.recordStrokes = true;

sketchpad.addEventListener('segmentdrawn', ({ stroke }) => {
  if (!stippleDensity) return;
  const lastSegment = stroke.segments[stroke.segments.length - 1];
  if (!lastSegment || Number.isNaN(lastSegment.time)) return;
  const { x, y } = lastSegment.point;
  const { radius, spacing } = STIPPLE_PRESETS[stippleDensity];
  if (stippleCounter % spacing === 0) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  stippleCounter++;
});

sketchpad.addEventListener('strokerecorded', (obj) => {
  if (!sketchpad.recordPaused) {
    obj.stroke.type = "stroke";
    obj.stroke.segments = obj.stroke.segments.filter((segment) => !Number.isNaN(segment?.time))
    if (stippleDensity) {
      obj.stroke.isStipple = true;
      obj.stroke.stippleDensity = stippleDensity;
    }
    strokes.push(obj.stroke);
    // Clear redo stack when new stroke is added
    redoStack.length = 0;
  }
  stippleCounter = 0;
});

// Compensate for Dots
canvas.addEventListener('click', (e) => {
  const bounds = sketchpad.canvas.getBoundingClientRect();
  const clickPoint = {
    x: e.clientX,
    y: e.clientY,
  }
  if (strokes[strokes.length - 1].segments.length < 3) {
    const strokePoints = [
      {
        point: {
          x: Math.floor(clickPoint.x - bounds.x),
          y: Math.floor(clickPoint.y - bounds.y),
        },
        time: 1,
      },
      {
        point: {
          x: Math.floor(clickPoint.x - bounds.x),
          y: Math.floor(clickPoint.y - bounds.y + 1),
        },
        time: 2,
      },
    ]
    // In stipple mode, Atrament is disabled so sketchpad.draw() would be a no-op;
    // the dot was already rendered by segmentdrawn. Skip to avoid mode confusion.
    if (!stippleDensity) {
      sketchpad.draw(strokePoints[0].point.x, strokePoints[0].point.y, strokePoints[1].point.x, strokePoints[1].point.y);
    }
    strokes[strokes.length - 1].segments = (strokePoints);
  }
})

function replayStippleStroke(stroke) {
  const replayCanvas = document.getElementById("sketchpad");
  const ctx = replayCanvas?.getContext('2d');
  if (!ctx) return;
  const { radius, spacing } = STIPPLE_PRESETS[stroke.stippleDensity];
  stroke.segments.forEach((seg, i) => {
    if (i % spacing === 0) {
      ctx.fillStyle = 'black';
      ctx.beginPath();
      ctx.arc(seg.point.x, seg.point.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
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
    mode: sketchpad.mode,
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
    sketchpad.mode = original.mode;
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
    mode: sketchpad.mode,
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
    sketchpad.mode = original.mode;
    isUndoRedoInProgress = false;
  }, 100);
  sketchpad.weight = original.weight;
  sketchpad.smoothing = original.smoothing;
  sketchpad.color = original.color;
  sketchpad.adaptiveStroke = original.adaptiveStroke;
}

export const setMode = (mode) => {
  sketchpad.mode = mode;
}

export const getMode = () => {
  return sketchpad.mode;
}

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

  // Stay in draw mode
  sketchpad.mode = MODE_DRAW;
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

export const cycleStippleDensity = () => {
  const idx = STIPPLE_DENSITIES.indexOf(stippleDensity);
  stippleDensity = STIPPLE_DENSITIES[(idx + 1) % STIPPLE_DENSITIES.length];
  sketchpad.mode = stippleDensity ? MODE_DISABLED : MODE_DRAW;
  stippleCounter = 0;
  return stippleDensity;
};

export const getStippleDensity = () => stippleDensity;

export const resetStipple = () => {
  if (stippleDensity) {
    sketchpad.mode = MODE_DRAW;
  }
  stippleDensity = null;
  stippleCounter = 0;
};
