import express from 'express'
import cors from 'cors'
import dbConnect from './config/db.js'
import routes from './routes/index.js'
import { errorHandler, notFound } from './middleware/error-handler.js';


const app = express();

// Middleware globales
app.use(cors())
app.use(express.json())
app.use(express.urlencoded({extended: true}))

app.use('/uploads', express.static('storage'));

// Health chech
app.get('/health', (req, res) => {
    res.json( {
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Routes API (index.routes.js)
app.use('/api', routes)

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