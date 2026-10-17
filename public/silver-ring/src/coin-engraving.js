// Extract ink from the existing cup mark; its photographic paper never reaches metal.
export function engravingPixels(data){
 for(let i=0;i<data.length;i+=4){const luminance=.2126*data[i]+.7152*data[i+1]+.0722*data[i+2];const ink=Math.max(0,Math.min(1,(180-luminance)/120));data[i]=100;data[i+1]=66;data[i+2]=15;data[i+3]=Math.round(data[i+3]*ink);}
 return data;
}
