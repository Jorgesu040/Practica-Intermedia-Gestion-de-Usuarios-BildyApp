import { AppError } from '../utils/AppError.js';

const checkRole = (allowedRoles) => (req, res, next) => {
    try {
        if (!req.user?.role) {
            return next(AppError.unauthorized('No hay usuario autenticado o no tiene rol definido', 'ERROR_PERMISSIONS'));
        }

        const userRole = req.user.role;

        if (!allowedRoles.includes(userRole)) {
            return next(AppError.forbidden('Acceso denegado, rol insuficiente', 'NOT_ALLOWED'));
        }

        next();
    } catch (err) {
        next(AppError.forbidden('Error verificando permisos', 'ERROR_PERMISSIONS'));
    }
};

export default checkRole;

