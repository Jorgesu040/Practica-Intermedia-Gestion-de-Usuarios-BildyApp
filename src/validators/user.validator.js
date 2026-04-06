import { checkFormatNIF, checkFormatCIF } from "../utils/validatorUtils";

// Reusable field schemas
const emailField = z.string()
    .email("El dato recibido no tiene forma de correo")
    .max(254, 'El email no puede exceder 254 caracteres')
    .toLowerCase()
    .trim();
const passwordField = z.string().min(8, "La contraseña debe tener al menos 8 caracteres")
    .regex(/[A-Z]/, 'Debe contener mayúscula')
    .regex(/[a-z]/, 'Debe contener minúscula')
    .regex(/[0-9]/, 'Debe contener número');

const addressSchema = z.object({
    street: z.string(),
    number: z.string(),
    postal: z.string(),
    city: z.string(),
    province: z.string()
})

const credentialsBody = z.object({
    email: emailField,
    password: passwordField
});

// Now compose your main schemas
export const registerSchema = z.object({
    body: credentialsBody
});

export const emailValidationSchema = z.object({
    body: z.object({
        verificationCode: z.string().length(6, "El código debe tener exactamente 6 caracteres"),
    })
});

export const loginSchema = z.object({
    body: credentialsBody
});

export const onboardingUserSchema = z.object({
    body: z.object({
        name: z.string()
            .min(2, 'Mínimo 3 caracteres')
            .max(99, 'Máximo 99 caracteres')
            .trim(),
        lastName: z.string()
            .min(2, 'Mínimo 3 caracteres')
            .max(99, 'Máximo 99 caracteres')
            .trim(),
        // ref: https://generardni.com/blog/algoritmo-letra-dni-calculo-control/
        nif: z.string()
            .length(9, 'El NIF debe tener exactamente 9 caracteres')
            .toUpperCase()
            .regex(/^[0-9]{8}[A-Z]$/, 'El NIF debe tener 8 dígitos seguidos de una letra')
            .refine(checkFormatNIF, { error: "El NIF no es válido" })
    })
})

// Esquema para la ruta de invitación, que combina campos de login y onboarding
export const inviteSchema = z.object({
    body: loginSchema.shape.body.extend(onboardingUserSchema.shape.body.shape)
});

export const companyDataSchema = z.object({
    body: z.object({
        isFreelance: z.boolean(),
        name: z.string()
            .min(2, 'Mínimo 3 caracteres')
            .max(99, 'Máximo 99 caracteres')
            .trim()
            .optional(),
        cif: z.string()
            .length(9, 'El NIF/CIF debe tener exactamente 9 caracteres')
            .toUpperCase()
            .optional(),
        address: addressSchema.optional()

    }).superRefine((data, ctx) => {
        if (data.isFreelance) {
            // Un autónomo no debe enviar datos corporativos para evitar inconsistencias con su perfil.
            if (data.cif || data.name || data.address) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Si es autónomo, no debe enviar CIF, nombre ni dirección (se extraen automáticamente)",
                    path: ['isFreelance']
                });
            }
        } else {
            // Una empresa sí requiere obligatoriamente estos datos, verificamos presencia
            if (!data.cif || !data.name || !data.address) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "El CIF, nombre y dirección son obligatorios para una empresa",
                    path: ['isFreelance']
                });
            } else {
                // Validación CIF (Sociedad)
                if (!/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(data.cif)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Formato de CIF inválido",
                        path: ['cif']
                    });
                } else if (!checkFormatCIF(data.cif)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "El código de control del CIF no es válido",
                        path: ['cif']
                    });
                }
            }
        }
    })
})

export const imageFileSchema = z.object({
    body: z.object({
        fieldName: z.string(),
        originalName: z.string(),
        mimetype: z.enum(
            ["image/jpeg", "image/png", "image/gif", "image/webp"],
            { error: () => "Solo imágenes (jpeg, png, gif, webp)" }),
        size: z.number().max(5 * 1024 * 1024, 'Máximo 5MB')

    })
})

export const newPasswordSchema = z.object({
    body: z.object({
        currentPassword: passwordField,
        newPassword: passwordField,
    }).refine((data) => data.currentPassword != data.newPassword, {
        error: "Las contraseñas han de ser distintas",
        path: ["newPassword"],
    }),
})


