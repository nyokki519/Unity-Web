import {createRenderer as createSI} from './si-renderer.js';
import {createRenderer as createPrevious2} from './si-v2/si-renderer.js';
import {createRenderer as createPrevious} from './si-v1/si-renderer.js';
import {createRenderer as createLegacy} from './legacy/renderer.js';
export function createRenderer(canvas,board){return board.physicsVersion==='si-3'?createSI(canvas,board):board.physicsVersion==='si-2'?createPrevious2(canvas,board):board.physicsVersion==='si-1'?createPrevious(canvas,board):createLegacy(canvas,board);}
