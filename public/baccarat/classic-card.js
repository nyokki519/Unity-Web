// Preserve the community artwork; match the source's white stock,
// one144px-atlas-pixel black edge and rounded physical outline.
export function classicCardFace(svg){
 const original='<rect x="2" y="2" width="496" height="696" rx="27" fill="url(#paper)" stroke="#d5c9ac" stroke-width="4"/>';
 if(!svg.includes(original))throw Error('CARD_ART');
 return svg.replace(original,'<rect x="1.74" y="1.75" width="496.52" height="696.5" rx="14" fill="#fff" stroke="#000" stroke-width="3.47"/>');
}
export function classicCardBack(svg){
 const original='<rect x="2" y="2" width="496" height="696" rx="27" fill="#13332f" stroke="#cfbc8e" stroke-width="4"/>';
 if(!svg.includes(original))throw Error('CARD_ART');
 return svg.replace(original,'<rect x="1.74" y="1.75" width="496.52" height="696.5" rx="14" fill="#13332f" stroke="#000" stroke-width="3.47"/>');
}
