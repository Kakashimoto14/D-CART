import bcrypt from "bcryptjs";

export const hashPassword = async (value) => bcrypt.hash(value, 10);
export const comparePassword = async (value, hash) => bcrypt.compare(value, hash);
