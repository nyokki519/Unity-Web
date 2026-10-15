// Numeric questions keep their real units; qualitative questions retain 0–100.
export function validateScale(scale){
 if(scale===undefined)return undefined;
 const {min,max,step,unit}=scale||{};
 if(![min,max,step].every(Number.isFinite)||min>=max||step<=0||Math.abs(min)>1e6||Math.abs(max)>1e6||(max-min)/step>10000||Math.abs((max-min)/step-Math.round((max-min)/step))>1e-7||typeof unit!=='string'||!unit.trim()||[...unit].length>12||/[\u0000-\u001f\u007f]/.test(unit))throw new Error('INVALID_SCALE');
 return{min,max,step,unit:unit.trim()};
}
export const sliderScale=q=>q.scale||{min:0,max:100,step:1,unit:''};
export function isScaleValue(q,value){const s=sliderScale(q);return typeof value==='number'&&Number.isFinite(value)&&value>=s.min&&value<=s.max&&Math.abs((value-s.min)/s.step-Math.round((value-s.min)/s.step))<1e-7;}
export function positionPercent(q,value){const s=sliderScale(q);return Math.max(0,Math.min(100,(value-s.min)/(s.max-s.min)*100));}
export function formatScaleValue(q,value){return value===null||value===undefined?'—':`${new Intl.NumberFormat('ja-JP',{maximumFractionDigits:10,useGrouping:false}).format(value)}${sliderScale(q).unit}`;}
export function scaleEndpoint(q,index){const s=sliderScale(q),n=formatScaleValue(q,index?s.max:s.min),label=q.choices[index];return label.includes(n)?label:`${n} / ${label}`;}
