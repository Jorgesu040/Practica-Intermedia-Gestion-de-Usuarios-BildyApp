import bcryptjs from 'bcryptjs';

export const encrypt = async (clearPassword) => {
    // 1: Contraseña, 2: el longitud salt
    const hash = await bcryptjs.hash(clearPassword,10);
    return hash;
}

export const compare = async (clearPassword, hashedPassword) => {
    const result = await bcryptjs.compare(clearPassword, hashedPassword)
    return result
} 