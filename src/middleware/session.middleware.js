import User from "../models/user.model.js";
import { verifyAccessToken } from "../utils/handleJwt.js";

const authMiddleware = async (req, res, next) => {

    try {
        // Verificar que existe la cabecera del Bearer Token
        if (!req.headers.authorization) {
            // TODO: throw error 'NO_TOKEN' 401
            return;
        }
        
        const token = req.headers.authorization.split(' ').pop()

        const dataToken = verifyAccessToken(token)

        if (!dataToken ||  !dataToken._id) {
            // TODO: throw error 'TOKEN_ID_ERROR' 401
            return;
        }

        const user = User.findById(dataToken._id);

        if (!user) {
            // TODO: throw error 'USER_NOT_FOUND' 401 
        }

        req.user = user;

        next()

    } catch (err) {
        // TODO: throw error 'NOT_SESSION' 401
    }
    
}

export default authMiddleware;