import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import authMiddleware from '../middleware/auth.middleware.js';
import {
    registerSchema,
    emailValidationSchema,
    loginSchema,
    onboardingUserSchema,
    companyDataSchema,
    imageFileSchema,
    newPasswordSchema,
} from '../validators/user.validator.js';

import {
    registerUser,
    validateEmail,
    loginUser,
    userOnboarding,
    companyOnboarding,
    uploadCompanyLogo,
    getUserData,
    refreshAccessToken,
    logoutUser,
    deleteUser,
    changePassword,
} from '../controllers/user.controller.js';

const placeholder = (req, res) => {
    console.log("Aviso, se esta llamando a una funcion no implementada")
    res.status(501).json({
        error: "Funcionalidad no implementada"
    })
}

const router = Router();

/** Recibe solo email y passwd **/
/*
* - Valida el email, normalizado a minusculas
* - La contraseña requiere de 8 caracteres
* - Verifica existencia de email y devuelve 409
* - Contraseña se cifra 
* - Genera un codigo de 6 digitos random e inserta un numero de intentos (3)
* - Por defecto se crea con role 'admin' es decir el este dato no ha de estar en el body aún
*
* **Respuesta**:
* - Devuelve email, status y role
* - Devuelve access token de 15 mins y un refresh token de 7 días 
*/
router.post('/register', validate(registerSchema), registerUser)


/** Recibe JWT y codigo **/
/* 
* - Esta ruta representa lo que en si seria el validar el email tras un registro
* - Requiere el JWT en la cabecera 
* - Recibe nuestro codigo de 6 digitos que creamos en '/register' (y valida (zod) que son 6 digitos)
* - Si: JWT existe y el codigo coincide con el generado -> status <= 'verified';
*   - Se devuelve un ACK (un 200?) //TODO: Ack en codigos http
* - Si no: error 4XX (cual?) y se decrementa contador de intentos
*   - Si se agotan los intentos error 429 Too Many Requests.
*/
router.post('/validation', validate(emailValidationSchema), authMiddleware, validateEmail)


/** Recibe email y contraseña**/
/*
* Validar con ZOD passwd y email (ver ruta '/register')
* Si las credenciales son validas, devuelve access token y refresh token 
* Si no son correctas -> 401 Unauthorized
*/
router.post('/login', validate(loginSchema), loginUser)

/** Recibe el resto de datos de 'User' **/
/*
* - Requiere token JWT 
* - Valida con ZOD los datos recibidos (nombre, apellidos, NIF)
*/
router.put('/register', validate(onboardingUserSchema), authMiddleware, userOnboarding)

/** Recibe los datos del esquema 'Company' (menos el logo) **/
/*
* - Requiere token JWT
* - Valida con ZOD name, cif, address (esquema), e isFreelance 
* - Logica de asignar el CIF: 
Ver requisitos: https://www.notion.so/Pr-ctica-Intermedia-Gesti-n-de-Usuarios-BildyApp-32c5e4346f1f80b39de6f659ac9abd3f?source=copy_link#32c5e4346f1f80da9567c970721e699f
*/
// TODO: puede cualquiera unirse a una empresa?
router.patch('/company', validate(companyDataSchema), authMiddleware, companyOnboarding)


/** Recibe una imagen que sera un logo **/
/*
* - Requiere token JWT
* - Usa multer para la subida de archivos
* - Tiene tamaño maximo en disco //TODO: quien verifica multer, zod, el esquema?
* - Ruta de subida: uploads/, almacena el logo en campo 'logo' de 'Company'
*/
router.post('/company/logo', validate(imageFileSchema), authMiddleware, uploadCompanyLogo)


/*
* - Requiere JWT (validacion), devuelve datos de usuario autenticado
* - Devuelve tambien el Objeto 'Company'
* - Devuelve el campo fullName
*/
router.get('/', authMiddleware, getUserData)

/**Ruta de refresco**/
/* 
* - Recibe refresh token y si es valido y no ha expirado devuelve otro access token
* - //TODO: Rotar refresh token??
* - Si es invalido o expirado, 401 Unauthorized
*/
router.post('/refresh', refreshAccessToken)

/** Logout **/
/* 
* - Requiere token JWT
* - Si el token es invalido, 401 Unauthorized
*/
router.post('/logout', authMiddleware, logoutUser)

/** Eliminar usuario **/
/* 
* - Requiere token JWT
* - Soft delete con ?soft=true
*/
router.delete('/', authMiddleware, deleteUser)

/** Cambiar contraseña **/
/*
* - Requiere token JWT
* - Recibe en el cuerpo la nueva y la actual contraseña
* - Valida que la nuyeva contraseña es distinta, cumple con los requisitos de seguridad y que la actual contraseña es correcta
* - Si todo es correcto, actualiza la contraseña cifrada en la base de datos
* - Si no, devuelve un error 4XX (cual?)
*/
router.post('/change-password', validate(newPasswordSchema), authMiddleware, changePassword)

/** Invitar compañeros **/
/*
* - Requiere token JWT y ser admin de 'Company'
* - Se crea un nuevo usuario con los datos proporcionados y se le asigna el mismo `company` (ObjectId) del usuario que invita, con role `guest`.
* - Se emite un **evento** `user:invited` mediante EventEmitter
*/

//TODO: invitar necesita contraseña? o se almacena hasta que hace onboadrding?
router.post('/invite', placeholder)


export default router;