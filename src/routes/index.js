// src/routes/index.js
import { Router } from 'express';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const router = Router();

/* 
Nota 1:
ES Modules (import/export nativos) en Windows, 
la función import() espera una URL (como file:///...) 
o una ruta relativa.
*/
const __dirname = import.meta.dirname;


router.get('/', (req, res) => {
  res.json({
    nombre: 'Bildy API',
    version: '1.0.0',
  });
});


const routeFiles = readdirSync(__dirname).filter(
    (file) => file.endsWith('.routes.js')
);

for (const file of routeFiles) {
    const routeName = file.replace('.routes.js', '')
    const routeModule = await import(pathToFileURL(join(__dirname, file)).href);
    router.use(`/${routeName}`, routeModule.default)
    console.log(`Ruta cargada: /api/${routeName}, del fichero ${file}`);
}

export default router