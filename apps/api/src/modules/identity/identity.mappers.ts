import type { User } from '@prisma/client';
import type { UserDTO } from './identity.types.js';

export function toUserDTO(user: User): UserDTO {
  return {
    id: user.id,
    phone: user.phone,
    email: user.email,
    emailVerified: user.emailVerified,
    name: user.name,
  };
}