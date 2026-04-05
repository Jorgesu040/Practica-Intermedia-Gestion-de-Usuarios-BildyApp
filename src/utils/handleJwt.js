import jwt from 'jsonwebtoken'
import crypto from 'node:crypto'

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const JWT_REFRESH_TOKEN_EXPIRES_IN = process.env.JWT_REFRESH_TOKEN_EXPIRES_IN || 7 // Formato días



export const generateAccessToken = (user) => {
    const payload = {
        _id: user._id,
        role: user.role
    }

    const options = {expriresIn: JWT_EXPIRES_IN}

    return jwt.sign(payload, JWT_SECRET, options)
}

export const generatRefreshToken = () => {
    return crypto.randomBytes(64).toString('hex')
}
export const getRefreshTokenExpiry = () => {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + JWT_REFRESH_TOKEN_EXPIRES_IN)
    return expiry
}


export const verifyAccessToken = (tokenJwt) => {
    try {
        return jwt.verify(tokenJwt, JWT_SECRET)
    } catch (err) {
        // TODO: throw error to handler
        console.log("Error verificando token:", err.message)
        return null;
    }
}