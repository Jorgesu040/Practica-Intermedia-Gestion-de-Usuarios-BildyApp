import mongoose from 'mongoose'

const address = new mongoose.Schema(
    {
        street: {
            type: String,
            required: true,
            trim: true,
            minlength: [1, 'La calle es obligatoria']
        },
        number: {
            type: String,
            required: true,
            trim: true,
            minlength: [1, 'El número es obligatorio']
        },
        postal: {
            type: String,
            required: true,
            trim: true,
            minlength: [1, 'El código postal es obligatorio']
        },
        city: {
            type: String,
            required: true,
            trim: true,
            minlength: [1, 'La ciudad es obligatoria']
        },
        province: {
            type: String,
            required: true,
            trim: true,
            minlength: [1, 'La provincia es obligatoria']
        }
    },
    {
        timestamps: true,
        versionKey: false
    }

);

export default address;