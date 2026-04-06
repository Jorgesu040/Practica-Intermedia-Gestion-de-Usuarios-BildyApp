import mongoose from 'mongoose'
import address from './address.model.js';

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
            // TODO: normalizar al llegar la letra a mayuscula
            // TODO: cuanto tiene un DNI de longitud
            type: String,
            required: [true, "El campo NIF/DNI/NIE es obligatorio"],
            unique: true
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
            type: String
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

userSchema.index({ email: 1 });
// TODO: que es index unique ? que es indez negativo o juntos?

// Virtual: fullName: name + ' ' + lastName
userSchema.virtual('fullName').get(function() {
    return `${this.name} ${this.lastName}`.trim();
});

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

const User = mongoose.model('User', userSchema);

export default User;