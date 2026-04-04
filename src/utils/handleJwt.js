import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

export const tokenSign = (user) => {
    const payload = {
        _id: user._id,
        role: user.role
    }

    const options = {expriresIn: JWT_EXPIRES_IN}

    return jwt.sign(payload, JWT_SECRET, options)
}


export const verifyToken = (tokenJwt) => {
    try {
        return jwt.verify(tokenJwt, JWT_SECRET)
    } catch (err) {
        // TODO: throw error to handler
        console.log("Error verificando token:", err.message)
        return null;
    }
}