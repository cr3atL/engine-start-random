const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const PEDAL_TRAVEL = 140;
export const IGNITION_STROKE = .68;
export const MIN_KICK_DISTANCE = Math.ceil(PEDAL_TRAVEL * IGNITION_STROKE);

// Samples are pointer positions in CSS pixels and monotonic time in milliseconds.
// A rolling velocity window makes a quick stroke count even after holding the pedal still.
export function measureKick(samples) {
  if (samples.length < 2) return { valid: false, power: 0, speed: 0, distance: 0 };
  const first = samples[0], last = samples.at(-1), distance = last.y - first.y;
  if (distance < MIN_KICK_DISTANCE) return { valid: false, power: 0, speed: 0, distance };
  let peak = 0;
  for (let i = 1; i < samples.length; i++) {
    let j = i - 1;
    while (j > 0 && samples[i].t - samples[j - 1].t <= 100) j--;
    const delta = samples[i].y - samples[j].y, elapsed = samples[i].t - samples[j].t;
    if (elapsed >= 8 && delta >= 8) peak = Math.max(peak, delta / elapsed * 1000);
  }
  const average = distance / Math.max(16, last.t - first.t) * 1000;
  const speed = Math.min(3000, Math.max(peak, average));
  return { valid: true, power: clamp(speed / 1500, .08, 1), speed, distance };
}
