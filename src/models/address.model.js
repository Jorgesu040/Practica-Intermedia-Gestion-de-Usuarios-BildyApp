import mongoose from 'mongoose'

const address = new mongoose.Schema(
    {
        street: {
            type: String,
            required: true,
        },
        number: {
            type: String,
            required: true,
        },
        postal: {
            type: String,
            required: true,
        },
        city: {
            type: String,
            required: true,
        },
        province: {
            type: String,
            required: true,
        }
    },
    {
        timestamps: true,
        versionKey: false
    }

);

export default address;