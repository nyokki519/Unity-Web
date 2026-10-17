// Keep the existing contact-physics/replay lab available without loading its WASM
// during ordinary play of the authorized high-fidelity adaptation.
const physical=new URLSearchParams(location.search).get('physics')==='1';
const mount=physical?(await import('../abyss/screen.js')).mountAbyss:(await import('../silver-ring/shell.js')).mountSilver;
export function mountBonus(options){return mount(options);}
