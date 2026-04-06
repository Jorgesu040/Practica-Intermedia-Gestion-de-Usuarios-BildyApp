import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { rateLimit } from 'express-rate-limit'
import mongoSanitize from 'express-mongo-sanitize'
import dbConnect from './config/db.js'
import routes from './routes/index.js'
import { errorHandler, notFound } from './middleware/error-handler.js';


const app = express();

const apiRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: true,
        code: 'TOO_MANY_REQUESTS',
        message: 'Demasiadas peticiones, inténtalo más tarde'
    }
});

// Middleware globales
app.use(cors())
app.use(helmet())
app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(mongoSanitize())

app.use('/uploads', express.static('uploads'));

// Health chech
app.get('/health', (req, res) => {
    res.json( {
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Routes API (index.routes.js)
app.use('/api', apiRateLimit, routes)

// Middleware de errores (noFound y errorHandler)
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    await dbConnect();
    app.listen(PORT, () => {
        console.log(`Servidor lanzado correctamente sobre el puerto ${PORT}`)
    })
}

startServer();