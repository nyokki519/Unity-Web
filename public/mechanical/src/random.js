export class SeededRandom{
 constructor(seed='unity'){let h=2166136261;for(const c of String(seed)){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}this.state=h>>>0;}
 next(){this.state=(this.state+0x6d2b79f5)>>>0;let x=this.state;x=Math.imul(x^(x>>>15),x|1);x^=x+Math.imul(x^(x>>>7),x|61);return ((x^(x>>>14))>>>0)/4294967296;}
}
