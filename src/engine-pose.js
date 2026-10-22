/** Presentation only: rigid offset slider/crank, in the measured cylinder frame. */
export function enginePose(phase,rig){
  const [cx,cy,cz]=rig.crank_center,r=rig.throw,L=rig.rod_length;
  const x=cx+r*Math.cos(phase),y=cy+r*Math.sin(phase);
  const rise=Math.sqrt(L*L-x*x),wristY=y+rise;
  return {crankPin:[x,y,cz],wrist:[0,wristY,cz],pistonY:wristY-rig.wrist[1],rodAngle:Math.atan2(x,rise)};
}
