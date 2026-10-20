import { compare, hash } from "bcryptjs"

export const BCRYPT_SALT_ROUNDS = 10

export const hashPassword = (plain: string): Promise<string> => hash(plain, BCRYPT_SALT_ROUNDS)
export const verifyPassword = (plain: string, hashed: string): Promise<boolean> => compare(plain, hashed)