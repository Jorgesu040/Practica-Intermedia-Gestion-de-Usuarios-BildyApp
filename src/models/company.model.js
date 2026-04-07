import mongoose from 'mongoose'
import address from './address.model.js';
import { checkFormatCIF, checkFormatNIF } from '../utils/validatorUtils.js';
import { softDeletePlugin } from '../plugins/softDelete.plugin.js';

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
            required: [true, 'El identificador fiscal es requerido'],
            unique: true,
            trim: true,
            uppercase: true,
            minlength: [9, 'El identificador fiscal debe tener exactamente 9 caracteres'],
            maxlength: [9, 'El identificador fiscal debe tener exactamente 9 caracteres'],
            validate: {
                validator: function(value) {
                    if (this.isFreelance) {
                        return checkFormatNIF(value);
                    }

                    return checkFormatCIF(value);
                },
                message: 'El identificador fiscal no es válido para el tipo de compañía'
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
    },
    {
        timestamps: true,
        id: false,
        versionKey: false
    }

);


companySchema.set('toJSON', { virtuals: true });
companySchema.set('toObject', { virtuals: true });

companySchema.plugin(softDeletePlugin);

const Company = mongoose.model('Company', companySchema)

export default Company;