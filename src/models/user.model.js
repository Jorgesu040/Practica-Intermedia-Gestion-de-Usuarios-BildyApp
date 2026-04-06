import mongoose from 'mongoose'
import address from './address.model.js';
import { checkFormatNIF } from '../utils/validatorUtils.js';

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
            required: [true, 'Nombre es un campo obligatorio'],
        },
        lastName: {
            type: String,
            required: [true, 'El/los apellido(s) es un campo obligatorio'],
        },
        nif: {
            type: String,
            required: [true, "El campo NIF/DNI/NIE es obligatorio"],
            unique: true,
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
            match: [/^[0-9]{6}$/, 'El código de verificación debe contener 6 dígitos']
        },
        verificationAttempts: {
            type: Number,  // Intentos restantes (máximo 3)
            default: 3,
            min: 0,
            max: 3
        }, 
        company: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Company'
        },
        address 
        
        // TODO: Soft delete 
    }, 
    {
        timestamps: true,
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
    return `${this.name} ${this.lastName}`.trim();
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

export default User;