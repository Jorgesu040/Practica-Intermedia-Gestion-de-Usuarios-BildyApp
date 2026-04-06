import mongoose from 'mongoose'
import address from './address.model.js';
import { checkFormatCIF } from '../utils/validatorUtils.js';

const companySchema = new mongoose.Schema(
    {
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        name: {
            type: String,
            required: [true, 'El nombre es requerido'],
            trim: true,
            maxlength: [100, 'El nombre no puede exceder 100 caracteres']
        },
        cif: {
            type: String,
            required: [true, 'El CIF es requerido'],
            unique: true,
            trim: true,
            uppercase: true,
            minlength: [9, 'El CIF debe tener exactamente 9 caracteres'],
            maxlength: [9, 'El CIF debe tener exactamente 9 caracteres'],
            match: [/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/, 'Formato de CIF inválido'],
            validate: {
                validator: checkFormatCIF,
                message: 'El código de control del CIF no es válido'
            }
        },
        address,
        logo: {
            type: String,
            default: ''
        },
        isFreelance: {
            type: Boolean,
            default: false
        }
        // TODO: soft delete

    },
    {
        timestamps: true,
        versionKey: false
    }

);


companySchema.set('toJSON', { virtuals: true });
companySchema.set('toObject', { virtuals: true });

const Company = mongoose.model('Company', companySchema)

export default Company;