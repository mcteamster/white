// HTML Canvas
//@ts-ignore
import Atrament from 'atrament';
const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0)
const vh = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0)
const canvas = document.querySelector('#sketchpad');
export const sketchpad = new Atrament(canvas, {
  width: Math.min(vw*0.9, vh*0.7),
  height: Math.min(vw*0.9, vh*0.7),
  resolution: 1,
  color: 'black',
  smoothing: 0,
});