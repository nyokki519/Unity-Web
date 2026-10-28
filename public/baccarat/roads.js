export const beads=results=>results.map((winner,i)=>({col:Math.floor(i/6),row:i%6,winner}));
export function bigRoad(results){
 const cells=[],occupied=new Set();let startCol=0,last=null,trailing=false,leadingTies=0;
 for(const winner of results){
  if(winner==='tie'){if(last)last.ties++;else leadingTies++;continue;}
  let col=0,row=0;
  if(last){if(winner!==last.winner){startCol++;col=startCol;while(occupied.has(col+',0'))col++;startCol=col;trailing=false;}
   else{col=last.col;row=last.row+1;if(trailing||row>=6||occupied.has(col+','+row)){row=last.row;col=last.col+1;while(occupied.has(col+','+row))col++;trailing=true;}}}
  const cell={col,row,winner,ties:last?0:leadingTies};leadingTies=0;occupied.add(col+','+row);cells.push(cell);last=cell;
 }
 return{cells,leadingTies};
}
