import { AppError } from '../utils/AppError.js';

const checkVerified = (req, res, next) => {
    if (!req.user) {
        return next(AppError.unauthorized('No hay usuario autenticado', 'NOT_SESSION'));
    }

    if (req.user.status !== 'verified') {
        return next(AppError.forbidden('Debes verificar tu email para acceder a esta ruta', 'EMAIL_NOT_VERIFIED'));
    }

    next();
};

export default checkVerified;
