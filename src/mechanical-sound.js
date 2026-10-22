// Physical-style transients: impacts excite damped, inharmonic metal modes and
// filtered grit. Generated locally; no recordings, musical reward notes or buzz.
export const SOUND_DURATIONS={tooth:.105,lock:.24,kick:.22,return:.20,combustion:.23,cough:.29,die:.30,
  spark:.065,jam:.17,contact:.09,strain:.24,cloth:.15,free:.18,latch:.26,horn:.62,compression:.14};
const TAU=Math.PI*2;
export function synthesizeMechanical(kind,rate=48000,variant=0){
  if(!SOUND_DURATIONS[kind])throw new Error(`Unknown mechanical sound: ${kind}`);
  const duration=SOUND_DURATIONS[kind],samples=new Float32Array(Math.ceil(duration*rate));
  let seed=1729+variant*983+Object.keys(SOUND_DURATIONS).indexOf(kind)*811,low=0,previous=0,dcState=0;
  const tuning=1+(variant-2)*.012;
  const modes={tooth:[[460,.026,.32],[1273,.015,.22],[2791,.009,.11]],lock:[[147,.065,.38],[521,.032,.22],[1397,.018,.12]],
    kick:[[116,.058,.42],[413,.024,.20],[1923,.012,.10]],return:[[281,.038,.21],[973,.024,.16],[2267,.017,.09]],
    jam:[[94,.040,.44],[379,.020,.20]],contact:[[181,.023,.25],[684,.012,.10]],free:[[163,.04,.3],[862,.02,.16]],
    latch:[[371,.062,.23],[1137,.046,.15],[2483,.024,.07]],compression:[[82,.04,.12],[243,.025,.08]]}[kind]||[];
  for(let i=0;i<samples.length;i++){
    const t=i/rate;seed=seed*16807%2147483647;const noise=seed/2147483647*2-1;
    low+=.075*(noise-low);const grit=noise-low,attack=1-Math.exp(-t*2100);let value=0;
    for(const [f,decay,gain]of modes)value+=Math.sin(TAU*f*t*tuning)*Math.exp(-t/decay)*gain;
    if(['combustion','cough','die'].includes(kind)){
      const cough=kind==='cough',die=kind==='die',f0=cough?91:die?61:78,phase=TAU*(f0*t-21*t*t),burn=Math.exp(-t/(cough?.052:.038));
      value=(Math.sin(phase)+.37*Math.sin(phase*2.03)+.12*Math.sin(phase*3.17))*burn*.29+low*burn*1.8+grit*Math.exp(-t/.009)*.16;
      if(cough)value+=low*Math.exp(-Math.pow((t-.065)/.035,2))*.9;
      if(die)value*=Math.max(0,1-t/duration);
    }else if(kind==='spark')value=grit*Math.exp(-t/.007)*.46+Math.sin(TAU*3700*t)*Math.exp(-t/.003)*.13;
    else if(kind==='cloth')value=low*Math.sin(Math.PI*t/duration)**2*.25+grit*Math.exp(-t/.05)*.035;
    else if(kind==='strain')value=low*Math.sin(Math.PI*t/duration)**2*.28+Math.sin(TAU*(103*t-28*t*t))*Math.exp(-t/.08)*.07;
    else if(kind==='horn'){
      const phase=TAU*(243*t-48*t*t),body=Math.sin(phase)+.32*Math.sin(phase*2)+.15*Math.sin(phase*3);
      value=Math.tanh(body*1.6)*Math.sin(Math.PI*t/duration)**.55*.20+low*.045;
    }else{
      value+=grit*Math.exp(-t/(kind==='tooth'?.0035:.006))*.18;
      if(kind==='lock'&&t>.018)value+=Math.sin(TAU*637*(t-.018))*Math.exp(-(t-.018)/.018)*.11;
      if(kind==='return')value+=low*Math.exp(-t/.045)*.2;
    }
    const window=Math.min(1,(duration-t)/.012),input=value*attack*window;
    dcState=input-previous+.993*dcState;previous=input;samples[i]=Math.tanh(dcState*1.25)*.78;
  }
  return samples;
}
