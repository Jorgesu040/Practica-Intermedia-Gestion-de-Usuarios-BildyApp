import mongoose from 'mongoose';

const dbConnect = async () => {
    const DB_URI = process.env.DB_URI;

    if (!DB_URI) {
        console.error("La URI del fichero .env (DB_URI) no está configurada");
        process.exit(1);
    }

    try {
        await mongoose.connect(DB_URI);
        console.log('[*] Conectado a MongoDB')
    } catch (error) {
        console.error('[-] Error conectándose a la BD de mongo: ', error.message);
        process.exit(1)
    }
};


mongoose.connection.on('disconnected', () => {
    console.warn('[:(] Desconectado de MongoDB');
    
});

process.on('SIGINT', async () => {
    await mongoose.connection.close();
    console.log('[*] Cerrada conexion a BD y apagando');
    process.exit(0);
})


export default dbConnect;


