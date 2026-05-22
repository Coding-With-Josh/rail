import bcrypt from "bcryptjs"

const ROUNDS = 12

export const hashPassword = (plain: string) => bcrypt.hash(plain, ROUNDS)
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash)
// Lower rounds for token hashes — they're random, not user passwords
export const hashToken = (token: string) => bcrypt.hash(token, 10)
export const verifyToken = (token: string, hash: string) => bcrypt.compare(token, hash)
