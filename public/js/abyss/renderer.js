import {createRenderer as createSI} from './si-renderer.js';
import {createRenderer as createLegacy} from './legacy/renderer.js';
export function createRenderer(canvas,board){return board.physicsVersion==='si-1'?createSI(canvas,board):createLegacy(canvas,board);}
