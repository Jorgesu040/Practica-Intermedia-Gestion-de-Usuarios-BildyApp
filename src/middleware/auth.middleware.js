import User from "../models/user.model.js";
import { verifyAccessToken } from "../utils/handleJwt.js";

const authMiddleware = async (req, res, next) => {

    try {
        // Verificar que existe la cabecera del Bearer Token
        if (!req.headers.authorization) {
            return next(AppError.unauthorized('No se proporcionó token de autenticación', 'NOT_SESSION'));
        }
        
        const token = req.headers.authorization.split(' ').pop()

        const dataToken = verifyAccessToken(token)

        if (!dataToken ||  !dataToken._id) {
            return next(AppError.unauthorized('Token de autenticación inválido', 'NOT_SESSION'));
        }

        const user = User.findById(dataToken._id);

        if (!user) {
            return next(AppError.unauthorized('Usuario no encontrado', 'USER_NOT_FOUND'));
        }

        req.user = user;

        next()

    } catch (err) {
        return next(AppError.unauthorized('Error verificando token de autenticación', 'NOT_SESSION'));
    }
    
}

export default authMiddleware;