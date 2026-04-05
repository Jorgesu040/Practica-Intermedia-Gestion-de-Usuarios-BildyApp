import mongoose from "mongoose";

const refreshTokenSchema = new mongoose.Schema({
    token: {
        type: String,
        required: true,
        unique: true
    },
    userRef: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    expiresAt: {
        type: Date,
        required: true,
        // Al definir expires: 0 sobre un tipo Date, Mongoose crea un índice TTL (expireAfterSeconds: 0)
        // MongoDB borrará automáticamente el documento cuando se alcance la fecha de expiresAt.
        expires: 0
    },
    createdByIp: String,
    revokedAt: Date,
    revokedByIp: String
},
    {
        timestamps: true
    }
);

// Método para verificar si está activo
refreshTokenSchema.methods.isActive = function() {
  return !this.revokedAt && this.expiresAt > new Date();
};

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

export default RefreshToken;