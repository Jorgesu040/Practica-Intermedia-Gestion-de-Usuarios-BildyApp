import User from "../models/user.model.js"
import { tokenSign } from "../utils/handleJwt.js"
import { compare, encrypt } from "../utils/handlePassword.js"
import { handleHttpError } from "../utils/handleError.js"
import Company from "../models/company.model.js"


// POST /api/user/register
export const registerUser = async (req, res) => {

    const { email, password } = req.body

    try {
        const existingUser = await User.findOne({ email: email });

        if (existingUser) {
            handleHttpError(res, 'EMAIL_ALREADY_EXISTS', 409)
        }

        const encryptedPassword = encrypt(password)

        const verificationCode = Math.floor(Math.random() * 1000000)

        const body = { ...req.body, encryptedPassword, verificationCode }
        const dataUser = await User.create(body)

        dataUser.set('password', undefined, { strict: false })

        const responseData = {
            token: tokenSign(dataUser),
            user: dataUser
        }

        res.status(201).json(responseData)

    } catch (err) {
        console.log(err)
        handleHttpError(res, 'ERR_REGISTERING_USER')
    }

}


// POST /api/user/validation
export const validateEmail = async (req, res) => {

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
        handleHttpError(res, 'ERR_VALIDATING_USER')
    }

}


// POST /api/user/login
export const loginUser = async (req, res) => {

    const { email, password } = req.body

    try {
        const user = await User.find({ email: email })

        if (!user) {
            // TODO: thow error 'EMAIL_NOT_FOUND' 401
        }

        const check = compare(password, user.password)

        const responseData = {
            token: tokenSign(user),
            user: user
        }


        user.set('password', undefined, { strict: false })

        res.status(201).send(responseData)
    } catch (err) {
        console.log(err)
        handleHttpError(res, 'ERR_REGISTERING_USER')
    }

}


// PUT /api/user/register

export const userOnboarding = async (req, res) => {

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
        handleHttpError(res, 'ERR_ONBOARDING_USER')
    }

}


// PUT /api/user/register
export const companyOnboarding = async (req, res) => {
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
            return handleHttpError(res, 'USER_NOT_FOUND', 404)
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
        return handleHttpError(res, 'ERR_COMPANY_ONBOARDING')
    }
}


// PATCH /api/user/logo
export const uploadCompanyLogo = async (req, res) => {

    const user = req.user;

    try {
        const retrievedUser = await User.findById(user._id)

        if (!retrievedUser || !retrievedUser.company) {
            // El usuario debe tener una compañía antes de poder subirle un logo
            return handleHttpError(res, 'COMPANY_NOT_FOUND', 404);
        }

        // Multer debería haber añadiddo el campo a la request
        if (!req.file) {
            return handleHttpError(res, 'NO_FILE_UPLOADED', 400);
        }

        // Multer dejó los metadatos en req.file
        // Guardamos la ruta estática o URL pública en el campo logo del modelo Company existente
        const logoPath = `/uploads/${req.file.filename}`;

        const updatedCompany = await Company.findByIdAndUpdate(
            retrievedUser.company,
            { logo: logoPath},
            { returnDocument: 'after' }
        )

        res.status(200).json({
            message: `Logo subido correctamente en http://${req.headers.host}${logoPath}`,
            company: updatedCompany
        })
    } catch (err) {
        console.log(err)
        return handleHttpError(res, 'ERR_UPLOADING_LOGO')
    }
}



// GET /api/user/

export const getUserData = async (req, res) => {

    const user = req.user;

    try {
        const retrievedUser = await User.findById(user._id).populate('company')

        retrievedUser.set('password', undefined, { strict: false })

        return res.status(200).json({ user: retrievedUser })
    } catch (err) {
        console.log(err)
        return handleHttpError(res, 'ERR_GETTING_USER_DATA')
    }
}



