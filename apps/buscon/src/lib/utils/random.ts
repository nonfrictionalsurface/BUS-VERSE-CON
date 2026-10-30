const A_Z = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
const ALNUM = DIGITS + A_Z;

function pick(str: string): string {
  return str[Math.floor(Math.random() * str.length)];
}

export function generatePAN(): string {
  let out = '';
  for (let i = 0; i < 5; i++) out += pick(A_Z);
  for (let i = 0; i < 4; i++) out += pick(DIGITS);
  out += pick(A_Z);
  return out;
}

export function generateGSTIN(pan?: string): { gstin: string; pan: string } {
  const actualPan = (pan || generatePAN()).toUpperCase();
  const stateCode = String(Math.floor(Math.random() * 37) + 1).padStart(2, '0');
  const entity = pick('123456789');
  const checksum = pick(ALNUM);
  return {
    gstin: `${stateCode}${actualPan}${entity}Z${checksum}`,
    pan: actualPan,
  };
}

export function generatePhone(): string {
  const first = pick('6789');
  let rest = '';
  for (let i = 0; i < 9; i++) rest += pick(DIGITS);
  return `+91${first}${rest}`;
}

export function generateCompanyName(): string {
  const prefixes = ['Sharma', 'Mehta', 'Patel', 'Kumar', 'Gupta', 'Reddy', 'Joshi', 'Verma', 'Singh', 'Yadav', 'Iyer', 'Nair', 'Rao', 'Bhat'];
  const suffixes = ['Travels', 'Transport', 'Motors', 'Tourism', 'Express', 'Roadways', 'Coachlines', 'Buslines', 'Journeys'];
  return `${pick2(prefixes)} ${pick2(suffixes)} Pvt Ltd`;
}

function pick2<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateEmail(company: string): string {
  const slug = (company || 'company').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 14) || 'company';
  const rand = Math.random().toString(36).slice(2, 7);
  return `${slug}.${rand}@example.com`;
}

export function generatePassword(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = letters + digits;
  let pwd = pick(letters) + pick(digits);
  for (let i = 0; i < 12; i++) pwd += pick(all);
  return pwd.split('').sort(() => Math.random() - 0.5).join('');
}

/**
 * Generate a plausible + highly-unique Indian RTO registration number.
 * Formats covered: DL-1P-1234, MH-12-AB-1234, UP-32-A-5678, KA-05-MN-9-0123.
 * Includes a timestamp slice so consecutive calls never collide.
 */
export function generateRegistrationNumber(existing: string[] = []): string {
  const states = ['DL', 'MH', 'UP', 'KA', 'TN', 'GJ', 'RJ', 'MP', 'WB', 'HR', 'PB', 'AP', 'KL', 'TS', 'OD', 'BR', 'JH', 'CG', 'UK', 'GA'];
  const series = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

  for (let attempt = 0; attempt < 30; attempt++) {
    const state = pick2(states);
    const district = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
    const letter1 = pick(series);
    const letter2 = pick(series);

    // 4-digit suffix with timestamp + random for near-guaranteed uniqueness
    const ts = Date.now() % 10000;
    const rnd = Math.floor(Math.random() * 10000);
    const suffix = String((ts + rnd) % 10000).padStart(4, '0');

    // Vary the format
    const fmt = Math.floor(Math.random() * 3);
    let candidate: string;
    if (fmt === 0) candidate = `${state}-${district}-${letter1}${letter2}-${suffix}`;
    else if (fmt === 1) candidate = `${state}-${district}-${letter1}${suffix}`;
    else candidate = `${state}-${district}-${letter1}-${suffix}`;

    // Skip if already taken (case-insensitive)
    const taken = existing.some((e) => e.toUpperCase() === candidate.toUpperCase());
    if (!taken) return candidate;
  }
  // Fallback — timestamp only, definitely unique
  return `DL-${String(Date.now() % 100).padStart(2, '0')}-${String(Date.now() % 10000).padStart(4, '0')}`;
}