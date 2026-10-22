export const SECTORS = ['spark', 'piston', 'blank', 'spark', 'piston', 'blank', 'spark', 'piston', 'blank', 'gift'];
export const RESULTS = {
  spark: { name: '点火', first: '突、突突……噗。差一点。', second: '突、突突——这回，真的着了。' },
  piston: { name: '卡活塞', copy: '咯噔。卡了一下，没坏。再来。' },
  blank: { name: '空转', copy: '咕……噗。发动机没有意见，也没有动静。' },
  gift: { name: '意外的启动辅助' },
};
export const HELPERS = {
  gold: { name: '金色活塞', copy: '贵得不合群。卡住了也能“啵”地挣脱。' },
  mechanic: { name: '原厂小师傅', copy: '已就位。负责摇曲柄，以及甩锅。' },
  oil: { name: '师傅的小油壶', copy: '一滴机油，十分认真。' },
};
export function createRun() { return { phase: 'ready', kicks: 0, ignitions: 0, helpers: [], last: null, running: false }; }
export function beginKick(run, power, random = Math.random) {
  if (run.phase !== 'ready') return null;
  const slot = Math.min(9, Math.max(0, Math.floor(random() * SECTORS.length)));
  const result = { slot, kind: SECTORS[slot], power: Math.min(1, Math.max(.08, power)) };
  run.phase = 'spinning'; run.kicks++; run.last = result;
  return result;
}
export function settleResult(run, random = Math.random) {
  if (run.phase !== 'spinning' || !run.last) return null;
  const result = { ...run.last, helper: null, success: false };
  if (result.kind === 'spark') {
    run.ignitions = Math.min(2, run.ignitions + 1);
    result.success = run.ignitions === 2;
    run.running = result.success;
  }
  if (result.kind === 'gift') {
    const remaining = ['gold', 'mechanic'].filter(id => !run.helpers.includes(id));
    result.helper = remaining.length ? remaining[Math.min(remaining.length - 1, Math.floor(random() * remaining.length))] : 'oil';
    if (result.helper !== 'oil') run.helpers.push(result.helper);
  }
  run.last = result; run.phase = 'reacting';
  return result;
}
export function finishReaction(run) {
  if (run.phase !== 'reacting') return;
  run.phase = run.running ? 'running' : 'ready';
}

export const TAU = Math.PI * 2;
export const SECTOR_ANGLE = TAU / SECTORS.length;
export function planSpin(from, slot, power) {
  // Texture angles grow clockwise from twelve o'clock; stop the middle of the chosen sector at the pointer.
  const phase = TAU - (slot + .5) * SECTOR_ANGLE;
  const end = (Math.ceil(from / TAU) + 3 + Math.round(power * 2)) * TAU + phase;
  return { from, end, tailStart: end - 2.55 * SECTOR_ANGLE, fastDuration: .95 + power * .5, tailDuration: 1.75, holdDuration: .52 };
}
export function sampleSpin(plan, elapsed) {
  const { from, end, tailStart, fastDuration, tailDuration } = plan;
  if (elapsed < fastDuration) {
    const t = Math.max(0, elapsed / fastDuration), t2 = t*t, t3 = t2*t;
    const distance = tailStart - from;
    const initialTangent = distance * 1.55;
    const finalTangent = 2 * (end - tailStart) / tailDuration * fastDuration;
    return from + (-2*t3+3*t2)*distance + (t3-2*t2+t)*initialTangent + (t3-t2)*finalTangent;
  }
  const t = Math.min(1, (elapsed-fastDuration)/tailDuration);
  return tailStart + (end-tailStart)*(1-(1-t)*(1-t));
}
export function spinDuration(plan) { return plan.fastDuration + plan.tailDuration + plan.holdDuration; }
