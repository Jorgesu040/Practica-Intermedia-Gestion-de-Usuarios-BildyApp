import multer from 'multer'
import { extname, join } from 'node:path'

const __dirname = import.meta.dirname

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // La práctica exige guardar en la carpeta 'uploads/' en la raíz
        const uploadPath = join(__dirname, '../../uploads')
        cb(null, uploadPath)
    }, 
    filename: (req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`
        const ext = extname(file.originalname).toLowerCase()
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`) 
    }
})

// Filtro de tipos de archivo
const fileFilter = (req, file, cb) => {
  // La práctica pide "Recibe una imagen como logo", por tanto quitamos audio y pdf
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp'
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido'), false);
  }
};

// Middleware de upload
const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,  // 5MB
    files: 1                      // Límite máximo de 1 archivo (previene ataques)
  }
});

export default uploadMiddleware;