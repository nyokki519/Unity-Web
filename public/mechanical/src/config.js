// All dimensions below are a functional reconstruction, not measured H3 CAD.
export const CONFIG={
 version:'fielder-1',physics:{dt:1/240,gravity:9.80665,backTilt:.07,ccd:true,maxBalls:64,captureTolerance:.0003},
 ball:{radius:.0055,density:7800,restitution:.42,friction:.24,rollingDamping:.08},
 play:{initialBalls:250,shotInterval:.6,roundCount:9,roundSeconds:12,betweenRounds:.8},
 board:{width:.50,height:.86,back:.0,front:.21},
 launcher:{x:.236,y:.035,z:.008,minSpeed:4.05,maxSpeed:5.05},
 wing:{pivotX:.104,y:.555,length:.060,width:.035,closed:.62,open:-.38,travel:.07},
 stopper:{period:3.6,closedSeconds:1.8},sway:{period:2.1,angle:.14},
 bat:{period:1.08,stroke:.58,attackSeconds:.055,returnSeconds:.18},
 rotor:{x:0,y:.390,z:.095,radius:.043,width:.10,omega:-1.65,friction:.95},
 magnet:{enabled:true,force:.20,range:.018,releaseY:.030,poleWidth:.016},
 materials:{pin:{friction:.12,restitution:.45},resin:{friction:.22,restitution:.25}},
 assumptions:[
  {parameter:'ball',basis:'11mm steel sphere, density7800kg/m³; machine-specific value unverified',range:[7700,8050]},
  {parameter:'board.backTilt',basis:'reconstruction of near-vertical field; unmeasured',range:[.04,.12]},
  {parameter:'magnet.force',basis:'hypothesized holding force; ball weight≈0.0533N; observation shows upward transport, not magnet layout',range:[.16,.28]},
  {parameter:'rotor.omega',basis:'estimated -1.65rad/s, not calibrated against edited source time',range:[-1.2,-2.2]},
  {parameter:'ball.friction',basis:'effective steel/resin contact, not material coefficient measurement',range:[.16,.32]},
  {parameter:'bat.attackSeconds',basis:'unmeasured motor stroke; verified contact with lower front of rotor, not a guaranteed catch',range:[.04,.065]},
  {parameter:'bat',basis:'estimated motor timing, moving-contact transfer; not observed cycle calibration',range:[.85,1.3]},
 ],
};
export const ballMass=(radius=CONFIG.ball.radius,density=CONFIG.ball.density)=>4*Math.PI*radius**3*density/3;
export const cloneConfig=()=>structuredClone(CONFIG);
