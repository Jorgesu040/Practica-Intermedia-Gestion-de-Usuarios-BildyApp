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


// POST /api/user/register
export const registerUser = async (req, res, next) => {

    const { email, password } = req.body

    try {
        const existingUser = await User.findOne({ email: email });

        if (existingUser) {
            return next(AppError.conflict('EMAIL_ALREADY_EXISTS', 'EMAIL_ALREADY_EXISTS'))
        }

        const encryptedPassword = await encrypt(password)

        const verificationCode = Math.floor(Math.random() * 1000000)

        const body = { ...req.body, password: encryptedPassword, verificationCode }
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
        const user = req.user;
        // TODO: Si intentos es igual a 0, borrar registro
        const verificationAttempts = await User.findById(user._id).select('verificationAttempts')

        if (verificationAttempts === 0) {
            // TODO throw error 'TOO_MANY_REQUESTS 429'
        }

        if (user.verificationCode != verificationCode) {
            await User.findAndUpdateOne(user._id, { $inc: { verificationAttempts: -1 } })
            // TODO: throw error 'INCORRECT_VALIDATION_CODE' 401
        }

        // A partir de aquí el usuario ha introducido un valor correcto
        await User.findAndUpdateOne(user._id, { status: 'verified' })

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
            // TODO: thow error 'USER_NOT_FOUND' 401
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

    try {
        const retrievedUser = await User.findById(user._id)

        if (!retrievedUser || !retrievedUser.company) {
            // El usuario debe tener una compañía antes de poder subirle un logo
            return next(AppError.notFound('COMPANY_NOT_FOUND', 'COMPANY_NOT_FOUND'))
        }

        // Multer debería haber añadiddo el campo a la request
        if (!req.file) {
            return next(AppError.badRequest('NO_FILE_UPLOADED', 'NO_FILE_UPLOADED'))
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

    const user = storedToken.user

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

