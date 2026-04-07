import mongoose from 'mongoose'
import address from './address.model.js';
import { checkFormatNIF } from '../utils/validatorUtils.js';
import { softDeletePlugin } from '../plugins/softDelete.plugin.js';

const userSchema = new mongoose.Schema(
    {
        email: {
            type: String,
            unique: true,
            required: [true, 'El email es requerido'],
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'Email no válido'],
            maxlength: [254, 'El email no puede exceder 254 caracteres']
        },
        password: {
            type: String,
            required: [true, 'Hace falta una contraseña'],
            minlength: 8,
            select: false
        },
        name: {
            type: String,
            trim: true
        },
        lastName: {
            type: String,
            trim: true
        },
        nif: {
            type: String,
            unique: true,
            sparse: true,
            trim: true,
            uppercase: true,
            minlength: [9, 'El NIF debe tener exactamente 9 caracteres'],
            maxlength: [9, 'El NIF debe tener exactamente 9 caracteres'],
            match: [/^[0-9]{8}[A-Z]$/, 'El NIF debe tener 8 dígitos seguidos de una letra'],
            validate: {
                validator: checkFormatNIF,
                message: 'El NIF no es válido'
            }
        },
        role: {
            type: String,
            enum: {
                values: ['guest', 'admin'],
                message: '{VALUE} no es un rol válido'
            },
            default: 'admin'
        },
        status: {
            type: String,
            enum: {
                values: ['pending', 'verified'],
                message: '{VALUE} no es un valor válido'
            },
            default: 'pending'
        },
        verificationCode: {
            type: String,
            minlength: [6, 'El código de verificación debe tener 6 caracteres'],
            maxlength: [6, 'El código de verificación debe tener 6 caracteres'],
            match: [/^[0-9]{6}$/, 'El código de verificación debe contener 6 dígitos'],
            select: false
        },
        verificationAttempts: {
            type: Number,  // Intentos restantes (máximo 3)
            default: 3,
            min: 0,
            max: 3,
            select: false
        }, 
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company'
        },
        address 
    }, 
    {
        timestamps: true,
        id: false,
        versionKey: false        
    }
        
);

//- Evitar declarar el mismo índice dos veces (ejemplo email con unique en campo + schema.index único), 
// porque Mongoose muestra warning de duplicate schema index.
// userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ company: 1 });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });

// Virtual: fullName: name + ' ' + lastName
userSchema.virtual('fullName').get(function() {
    const name = this.name ?? '';
    const lastName = this.lastName ?? '';
    return `${name} ${lastName}`.trim();
});


userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

userSchema.plugin(softDeletePlugin);

const User = mongoose.model('User', userSchema);

export default User;