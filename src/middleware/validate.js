import { ZodError } from 'zod';

/**
 * Middleware de validación con Zod (Asíncrono)
 */
export const validate = (schema) => async (req, res, next) => {
  try {
    // 1. Usamos parseAsync y GUARDAMOS el resultado
    const validatedData = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params
    });

    // 2. Reasignamos los datos limpios al objeto req de Express.
    // Usamos 'if' porque si tu esquema solo valida 'body', Zod eliminará 'query' y 'params' 
    // del objeto validatedData. Si no usamos 'if', sobrescribiríamos req.query con 'undefined'.
    if (validatedData.body) req.body = validatedData.body;
    if (validatedData.query) req.query = validatedData.query;
    if (validatedData.params) req.params = validatedData.params;

    next();
  } catch (error) {
    // Verificamos que el error sea de Zod
    if (error instanceof ZodError) {
      const issues = error.issues ?? [];
      const errors = issues.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }));
      
      return res.status(400).json({
        error: true,
        message: 'Error de validación',
        details: errors
      });
    }
    
    // Si es otro tipo de error (ej. se cayó la base de datos durante el refine), 
    // lo pasamos al manejador de errores general de Express
    next(error);
  }
};

/**
 * Middleware para validar archivos subidos con Multer usando un schema Zod
 */
export const validateFile = (schema) => (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: true, message: 'Archivo requerido' });
  }

  const result = schema.safeParse(req.file);

  if (!result.success) {
    return res.status(400).json({
      error: true,
      message: result.error.issues[0].message
    });
  }

  next();
};

