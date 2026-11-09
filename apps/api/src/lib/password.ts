import bcrypt from 'bcryptjs';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(hashStr: string, plain: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hashStr);
  } catch {
    return false;
  }
}
