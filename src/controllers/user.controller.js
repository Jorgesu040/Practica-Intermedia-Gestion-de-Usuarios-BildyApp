import User from "../models/user.model.js"
import Company from "../models/company.model.js"
import RefreshToken from "../models/refreshToken.model.js"

import {
    generateAccessToken,
    generatRefreshToken,
    getRefreshTokenExpiry
} from "../utils/handleJwt.js"

import { compare, encrypt } from "../utils/handlePassword.js"
import { AppError } from "../utils/AppError.js"
import notificationEmitter from "../services/notification.service.js"
import fs from 'fs/promises';
import path from 'path';


// POST /api/user/register
export const registerUser = async (req, res, next) => {

    const { email, password } = req.body

    try {
        const existingUser = await User.findOne({ email: email });

        if (existingUser) {
            return next(AppError.conflict('EMAIL_ALREADY_EXISTS', 'EMAIL_ALREADY_EXISTS'))
        }

        const encryptedPassword = await encrypt(password)

        const verificationCode = String(Math.floor(100000 + Math.random() * 900000))

        const body = {
            ...req.body,
            password: encryptedPassword,
            verificationCode,
            verificationAttempts: 3
        }
        const dataUser = await User.create(body)

        const accessToken = generateAccessToken(dataUser)
        const refreshToken = generatRefreshToken(dataUser)

        // Guardamos el Refresh Token en la base de datos
        await RefreshToken.create({
            user: dataUser._id,
            token: refreshToken,
            expiresAt: getRefreshTokenExpiry(),
            createdByIp: req.ip
        })

        dataUser.set('password', undefined, { strict: false })

        const responseData = {
            token: accessToken,
            refreshToken: refreshToken,
            user: dataUser
        }

        notificationEmitter.emit('user:registered', {
            id: dataUser._id,
            email: dataUser.email
        })

        res.status(201).json(responseData)

    } catch (err) {
        console.log(err)
        next(AppError.internal('ERR_REGISTERING_USER', 'ERR_REGISTERING_USER'))
    }

}


// Esta ruta ya devuelve un token de 
// POST /api/user/validation
export const validateEmail = async (req, res, next) => {

    try {
        const { verificationCode } = req.body;
        const authenticatedUser = req.user;
        const retrievedUser = await User.findById(authenticatedUser._id).select('verificationCode verificationAttempts email')

        if (!retrievedUser) {
            return next(AppError.notFound('USER_NOT_FOUND', 'USER_NOT_FOUND'))
        }

        if (retrievedUser.verificationAttempts <= 0) {
            // Si intentos es igual a 0, crear un nuevo código de verificación
            const newVerificationCode = String(Math.floor(100000 + Math.random() * 900000));
            await User.findByIdAndUpdate(authenticatedUser._id, {
                verificationCode: newVerificationCode,
                verificationAttempts: 3
            })
            return next(AppError.tooManyRequests('Demasiados intentos fallidos. Se ha generado un nuevo código de verificación.', 'TOO_MANY_ATTEMPTS'))
        }

        if (String(retrievedUser.verificationCode) !== String(verificationCode)) {
            await User.findByIdAndUpdate(authenticatedUser._id, { $inc: { verificationAttempts: -1 } })
            return next(AppError.unauthorized('Código de verificación incorrecto', 'INVALID_VERIFICATION_CODE'))
        }

        // A partir de aquí el usuario ha introducido un valor correcto
        await User.findByIdAndUpdate(authenticatedUser._id, { status: 'verified' })

        notificationEmitter.emit('user:verified', {
            id: retrievedUser._id,
            email: retrievedUser.email
        })

        return res.status(200).json({ message: 'Email validado correctamente' })

    } catch (err) {
        console.log(err)
        next(AppError.internal('ERR_VALIDATING_USER', 'ERR_VALIDATING_USER'))
    }

}


// POST /api/user/login
export const loginUser = async (req, res, next) => {

    const { email, password } = req.body

    try {
        const user = await User.findOne({ email: email })

        if (!user) {
            return next(AppError.notFound('USER_NOT_FOUND', 'USER_NOT_FOUND'))
        }

        const check = compare(password, user.password)

        if (!check) {
            return next(AppError.unauthorized('INVALID_PASSWORD', 'INVALID_PASSWORD'))
        }

        const accessToken = generateAccessToken(user)
        const refreshToken = generatRefreshToken(user)

        await RefreshToken.create({
            user: user._id,
            token: refreshToken,
            expiresAt: getRefreshTokenExpiry(),
            createdByIp: req.ip
        })

        user.set('password', undefined, { strict: false })

        const responseData = {
            token: accessToken,
            refreshToken: refreshToken,
            user: user
        }

        res.status(201).send(responseData)
    } catch (err) {
        console.log(err)
        next(AppError.internal('ERR_REGISTERING_USER', 'ERR_REGISTERING_USER'))
    }

}


// PUT /api/user/register

export const userOnboarding = async (req, res, next) => {

    const { name, lastName, nif } = req.body
    const authenticatedUser = req.user;

    try {
        const user = await User.findById(authenticatedUser._id)

        if (!user) {
            return next(AppError.notFound('USER_NOT_FOUND', 'USER_NOT_FOUND'))
        }

        user.set({ name, lastName, nif })

        await user.save()

        user.set('password', undefined, { strict: false })

        res.status(201).send(user)

    } catch (err) {
        console.log(err)
        next(AppError.internal('ERR_ONBOARDING_USER', 'ERR_ONBOARDING_USER'))
    }

}


// PUT /api/user/register
export const companyOnboarding = async (req, res, next) => {
    const {
        isFreelance,
        cif,
        name,
        address
    } = req.body

    const user = req.user;

    try {
        const retrievedUser = await User.findById(user._id)

        if (!retrievedUser) {
            return next(AppError.notFound('USER_NOT_FOUND', 'USER_NOT_FOUND'))
        }

        // Garantizamos consistencia de datos: los autónomos usan su NIF y datos personales obligatoriamente
        const companyPayload = isFreelance
            ? {
                cif: retrievedUser.nif,
                name: retrievedUser.fullName,
                address: retrievedUser.address,
                isFreelance: true
            }
            : {
                cif: cif,
                name: name,
                address: address,
                isFreelance: false
            }

        let company = await Company.findOne({ cif: companyPayload.cif })

        if (!company) {
            // Si la empresa no existe, se crea y el usuario queda como dueño y admin independientemente del tipo
            company = await Company.create({
                ...companyPayload,
                owner: retrievedUser._id
            })

            retrievedUser.set({
                company: company._id,
                role: 'admin'
            })
        } else {
            if (isFreelance) {
                // Como el NIF es único y NIF/CIF tienen formatos excluyentes, 
                // si la empresa existe, este usuario es obligatoriamente su owner.
                company.set({
                    name: retrievedUser.fullName,
                    address: retrievedUser.address,
                    isFreelance: true
                })

                await company.save()

                retrievedUser.set({
                    company: company._id,
                    role: 'admin'
                })
            } else {
                // Ya existe empresa con ese CIF: el usuario se une y pasa a guest
                retrievedUser.set({
                    company: company._id,
                    role: 'guest'
                })
            }
        }

        await retrievedUser.save()

        // Devolvemos datos actualizados del usuario, incluyendo el nuevo campo 'company' poblado sin la contraseña
        await retrievedUser.populate('company')
        retrievedUser.set('password', undefined, { strict: false })

        return res.status(200).json({ user: retrievedUser })
    } catch (err) {
        console.log(err)
        return next(AppError.internal('ERR_COMPANY_ONBOARDING', 'ERR_COMPANY_ONBOARDING'))
    }
}


// PATCH /api/user/logo
export const uploadCompanyLogo = async (req, res, next) => {

    const user = req.user;

    // Multer debería haber añadiddo el campo a la request
    if (!req.file) {
        return next(AppError.badRequest('NO_FILE_UPLOADED', 'NO_FILE_UPLOADED'))
    }

    try {
        const retrievedUser = await User.findById(user._id)

        if (!retrievedUser || !retrievedUser.company) {
            // Si hay un error, borramos el archivo que Multer acaba de subir para no dejar basura
            await fs.unlink(req.file.path).catch(console.error);

            // El usuario debe tener una compañía antes de poder subirle un logo
            return next(AppError.notFound('COMPANY_NOT_FOUND', 'COMPANY_NOT_FOUND'))
        }

        // Comprobar y borrar el logo anterior si existiera
        const company = await Company.findById(retrievedUser.company);
        if (company.logo) {
            // logoPath guardado es '/uploads/filename.ext', hay que sacar la ruta local
            const oldFilename = path.basename(company.logo);
            const oldFilePath = path.join(path.dirname(req.file.path), oldFilename);
            await fs.unlink(oldFilePath).catch(() => { }); // Ignoramos si el archivo viejo ya no existe
        }

        // Multer dejó los metadatos en req.file
        // Guardamos la ruta estática o URL pública en el campo logo del modelo Company existente
        const logoPath = `/uploads/${req.file.filename}`;

        const updatedCompany = await Company.findByIdAndUpdate(
            retrievedUser.company,
            { logo: logoPath },
            { returnDocument: 'after' }
        )

        res.status(200).json({
            message: `Logo subido correctamente en http://${req.headers.host}${logoPath}`,
            company: updatedCompany
        })
    } catch (err) {
        // En caso de fallo crítico en BBDD, limpiamos el archivo recién subido
        if (req.file) {
            await fs.unlink(req.file.path).catch(() => { });
        }
        console.log(err)
        return next(AppError.internal('ERR_UPLOADING_LOGO', 'ERR_UPLOADING_LOGO'))
    }
}


// GET /api/user/
export const getUserData = async (req, res, next) => {

    const user = req.user;

    try {
        const retrievedUser = await User.findById(user._id).populate('company')

        retrievedUser.set('password', undefined, { strict: false })

        return res.status(200).json({ user: retrievedUser })
    } catch (err) {
        console.log(err)
        return next(AppError.internal('ERR_GETTING_USER_DATA', 'ERR_GETTING_USER_DATA'))
    }
}


// POST /api/user/refresh
export const refreshAccessToken = async (req, res, next) => {

    const { refreshToken } = req.body

    if (!refreshToken) {
        return next(AppError.badRequest('REFRESH_TOKEN_REQUIRED', 'REFRESH_TOKEN_REQUIRED'))
    }

    // Verificar que el refresh token existe en la base de datos
    const storedToken = await RefreshToken.findOne({ token: refreshToken }).populate('user')

    if (!storedToken || !storedToken.isActive()) {
        return next(AppError.unauthorized('INVALID_REFRESH_TOKEN', 'INVALID_REFRESH_TOKEN'))
    }

    const user = storedToken.userRef;

    // Generar un nuevo access token
    const newAccessToken = generateAccessToken(user)

    return res.status(200).json({
        token: newAccessToken,
    })
}

// POST /api/user/logout
export const logoutUser = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        const userId = req.user._id;

        if (!refreshToken) {
            return next(AppError.badRequest('REFRESH_TOKEN_REQUIRED', 'REFRESH_TOKEN_REQUIRED'))
        }

        // Buscamos y eliminamos el token asegurándonos de que
        // pertenezca al usuario que está haciendo la petición
        const deletedToken = await RefreshToken.findOneAndDelete({
            token: refreshToken,
            user: userId
        });

        if (!deletedToken) {
            // El token no existe o no le pertenece a este usuario
            return next(AppError.unauthorized('INVALID_REFRESH_TOKEN', 'INVALID_REFRESH_TOKEN'))
        }

        res.status(200).json({ message: 'Logout exitoso' });

    } catch (err) {
        console.log(err);
        next(AppError.internal('ERR_LOGOUT_USER', 'ERR_LOGOUT_USER'))
    }
}


// DELETE /api/user
export const deleteUser = async (req, res, next) => {
    const user = req.user;

    try {


        await User.findByIdAndDelete(user._id)

        await RefreshToken.deleteMany({ user: user._id })

        notificationEmitter.emit('user:deleted', {
            id: user._id,
            email: user.email
        })

        res.status(200).json({ message: 'User deleted successfully' })
    } catch (err) {
        console.log(err)
        return next(AppError.internal('ERR_DELETING_USER', 'ERR_DELETING_USER'))
    }

}


// PUT /api/user/password
export const changePassword = async (req, res, next) => {
    const user = req.user;
    const { currentPassword, newPassword } = req.body;

    try {
        const retrievedUser = await User.findById(user._id)

        if (!retrievedUser) {
            return next(AppError.notFound('USER_NOT_FOUND', 'USER_NOT_FOUND'))
        }

        const check = compare(currentPassword, retrievedUser.password)

        if (!check) {
            return next(AppError.unauthorized('INVALID_CURRENT_PASSWORD', 'INVALID_CURRENT_PASSWORD'))
        }

        const encryptedNewPassword = await encrypt(newPassword)

        retrievedUser.set({ password: encryptedNewPassword })

        await retrievedUser.save()

        retrievedUser.set('password', undefined, { strict: false })

        res.status(200).json({ message: 'Password changed successfully' })

    } catch (err) {
        console.log(err)
        return next(AppError.internal('ERR_CHANGING_PASSWORD', 'ERR_CHANGING_PASSWORD'))
    }

}


// POST /api/user/invite
export const inviteUser = async (req, res, next) => {
    // 1. Extraemos los datos del administrador y los campos a crear para el invitado
    const adminUser = req.user;
    // Como los usarios invitados se saltan el proceso de onboarding, el invitador debe proporcionar los datos mínimos necesarios para crear la cuenta, incluido un password temporal que luego el invitado podría   cambiar.
    const { email, password, name, lastName, nif } = req.body;

    try {
        // 2. Nos aseguramos de que quien invita está validado y pertenece a una compañía
        const retrievedAdmin = await User.findById(adminUser._id);

        if (!retrievedAdmin || !retrievedAdmin.company) {
            return next(AppError.forbidden('El usuario debe pertenecer a una compañía para poder invitar', 'COMPANY_REQUIRED'));
        }

        // 3. Verificamos que el email del invitado no está registrado
        // Se asume que Zod ha normalizado a minúsculas, pero como buena práctica:
        const existingUser = await User.findOne({ email: email });

        if (existingUser) {
            return next(AppError.conflict('El email a invitar ya está registrado', 'EMAIL_ALREADY_EXISTS'));
        }

        // 4. Preparamos los datos base del invitado
        const encryptedPassword = await encrypt(password);
        const verificationCode = String(Math.floor(100000 + Math.random() * 900000));

        // 5. Creamos el usuario en base de datos.
        // Se autoasigna el companyObjectId y el rol guest
        const guestUser = await User.create({
            email: email,
            password: encryptedPassword,
            name,
            lastName,
            nif,
            role: 'guest',
            company: retrievedAdmin.company,
            verificationCode,
            verificationAttempts: 3,
            status: 'pending' // Seguirá pendiente hasta que valide su correo
        });

        // 6. Emitimos el evento requerido mediante el NotificationService de Node
        notificationEmitter.emit('user:invited', {
            guestEmail: guestUser.email,
            companyId: retrievedAdmin.company
        });

        // 7. Retiramos la contraseña antes de mandarlo en la respuesta
        guestUser.set('password', undefined, { strict: false });

        res.status(201).json({
            message: 'Compañero/a invitado con éxito',
            user: guestUser
        });

    } catch (err) {
        console.log(err);
        return next(AppError.internal('Error invitando al compañero', 'ERR_INVITING_USER'));
    }
}


