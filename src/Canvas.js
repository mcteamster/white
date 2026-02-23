// HTML Canvas: https://github.com/jakubfiala/atrament
import Atrament from 'atrament';
const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
const canvas = document.querySelector('#sketchpad');
export const sketchpad = new Atrament(canvas, {
  width: Math.min(vw * 0.9, vh * 0.7),
  height: Math.min(vw * 0.9, vh * 0.7),
  resolution: 1,
  color: 'black',
  smoothing: 0.1,
  adaptiveStroke: true,
  weight: 4,
});

// Stroke History and Undo: https://github.com/jakubfiala/atrament/issues/71#issuecomment-1214261577
export const strokes = [];
export const redoStack = [];
let isUndoRedoInProgress = false;

sketchpad.recordStrokes = true;
sketchpad.addEventListener('strokerecorded', (obj) => { 
  if (!sketchpad.recordPaused) {
    obj.stroke.type = "stroke";
    obj.stroke.segments = obj.stroke.segments.filter((segment) => !Number.isNaN(segment?.time))
    strokes.push(obj.stroke);
    // Clear redo stack when new stroke is added
    redoStack.length = 0;
  }
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
    sketchpad.draw(strokePoints[0].point.x, strokePoints[0].point.y, strokePoints[1].point.x, strokePoints[1].point.y);
    strokes[strokes.length - 1].segments = (strokePoints);
  }
})

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
    const canvas = document.getElementById("sketchpad");
    const ctx = canvas?.getContext('2d');
    ctx?.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
  }

  // Replay all remaining strokes
  for (let i = 0; i <= strokes.length; i++) {
    const stroke = strokes[i];
    if (!stroke?.segments?.length) continue;

    // Set stroke properties
    sketchpad.mode = stroke.mode;
    sketchpad.weight = stroke.weight;
    sketchpad.smoothing = stroke.smoothing;
    sketchpad.color = stroke.color;
    sketchpad.adaptiveStroke = stroke.adaptiveStroke;

    // Create a copy of segments to avoid modifying original data
    const segments = [...stroke.segments];
    const firstPoint = segments.shift().point;
    sketchpad.beginStroke(firstPoint.x, firstPoint.y);

    let prevPoint = firstPoint;
    while (segments.length > 0) {
      const point = segments.shift().point;
      const { x, y } = sketchpad.draw(
        point.x,
        point.y,
        prevPoint.x,
        prevPoint.y
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
    const canvas = document.getElementById("sketchpad");
    const ctx = canvas?.getContext('2d');
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    ctx?.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

    // Replay all strokes
    for (let i = 0; i < strokes.length; i++) {
      const stroke = strokes[i];
      if (!stroke?.segments?.length) continue;

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
        const { x, y } = sketchpad.draw(
          point.x,
          point.y,
          prevPoint.x,
          prevPoint.y
        );
        prevPoint = { x, y };
      }

      sketchpad.endStroke(prevPoint.x, prevPoint.y);
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