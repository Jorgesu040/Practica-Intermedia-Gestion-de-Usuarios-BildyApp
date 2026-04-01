import mongoose, { mongo } from 'mongoose'
import address from './address.model.js';

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
            unique: true
            // TODO: longitud y formato de CIF?
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