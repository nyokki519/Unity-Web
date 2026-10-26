// Gameplay, rendering and configuration use metres, kg and seconds.
// The small rigid bodies are solved in centimetres to condition geometric tests.
// Time and angular velocity are never scaled.
export const toSolverVector=(v,units)=>({x:v.x*units,y:v.y*units,z:v.z*units});
export const fromSolverVector=(v,units)=>toSolverVector(v,1/units);

export class BodyInMetres{
 constructor(raw,units){this.raw=raw;this.units=units;}
 get handle(){return this.raw.handle;}
 translation(){return fromSolverVector(this.raw.translation(),this.units);}
 linvel(){return fromSolverVector(this.raw.linvel(),this.units);}
 rotation(){return this.raw.rotation();}
 angvel(){return this.raw.angvel();}
 mass(){return this.raw.mass();}
 principalInertia(){return fromSolverVector(this.raw.principalInertia(),this.units**2);}
 setTranslation(v,wake){this.raw.setTranslation(toSolverVector(v,this.units),wake);}
 setLinvel(v,wake){this.raw.setLinvel(toSolverVector(v,this.units),wake);}
 setRotation(q,wake){this.raw.setRotation(q,wake);}
 setAngvel(v,wake){this.raw.setAngvel(v,wake);}
 isFixed(){return this.raw.isFixed();}
 enableCcd(v){this.raw.enableCcd(v);}
 isCcdEnabled(){return this.raw.isCcdEnabled();}
 setSoftCcdPrediction(metres){this.raw.setSoftCcdPrediction(metres*this.units);}
 softCcdPrediction(){return this.raw.softCcdPrediction()/this.units;}
}
