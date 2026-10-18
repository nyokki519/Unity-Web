// Stable profiles: no quality oscillation during a shot.
export function renderProfile({mobile=false,quality=2,deviceRatio=1,maxSamples=4}={}){
 return {pixelRatio:Math.min(deviceRatio,[1,1.5,mobile?2:4][quality]),samples:mobile||quality<2?0:Math.min(4,maxSamples),shadowSize:!mobile&&quality===2?4096:1024};
}
