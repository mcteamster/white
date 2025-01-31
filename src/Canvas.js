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
});

// Stroke History and Undo: https://github.com/jakubfiala/atrament/issues/71#issuecomment-1214261577
export const strokes = [];
sketchpad.recordStrokes = true;
sketchpad.addEventListener('strokerecorded', (obj) => {
  if (!sketchpad.recordPaused) {
    obj.stroke.type = "stroke";

    // Compensate for dots
    if (obj.stroke.segments.length === 1) {
      const pseudoSegment = {
        point: {
          x: obj.stroke.segments[0].point.x,
          y: obj.stroke.segments[0].point.y + 1,
        },
        time: obj.stroke.segments[0].time
      }
      obj.stroke.segments.push(pseudoSegment);

      sketchpad.draw(
        pseudoSegment.point.x,
        pseudoSegment.point.y,
        pseudoSegment.point.x,
        pseudoSegment.point.y - 1,
      );
    }
    strokes.push(obj.stroke);
  }
});
sketchpad.addEventListener('fillstart', ({ x, y }) => {
  var obj = {};
  obj.type = "fill";
  obj.fillColor = sketchpad.color;
  obj.x = x;
  obj.y = y;
  strokes.push(obj);
});
export const undo = () => {
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
  strokes.pop()

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
  }, 100);
  sketchpad.weight = original.weight;
  sketchpad.smoothing = original.smoothing;
  sketchpad.color = original.color;
  sketchpad.adaptiveStroke = original.adaptiveStroke;
}