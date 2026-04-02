import { checkFormatNIF, checkFormatCIF } from "../utils/validatorUtils";

// Reusable field schemas
const emailField = z.string().email("El dato recibido no tiene forma de correo").toLowerCase().trim();
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

export const companyDataSchema = z.object({
    body: z.object({
        name: z.string()
            .min(2, 'Mínimo 3 caracteres')
            .max(99, 'Máximo 99 caracteres')
            .trim(),
        isFreelance: z.boolean(),
        cif: z.string()
            .length(9, 'El NIF/CIF debe tener exactamente 9 caracteres')
            .toUpperCase(),
        address: addressSchema

    }).superRefine((data, ctx) => {
        if (data.isFreelance) {
            // Validación NIF (Freelance)
            if (!/^[0-9]{8}[A-Z]$/.test(data.cif)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "El NIF debe tener 8 dígitos y una letra",
                    path: ['cif']
                });
            } else if (!checkFormatNIF(data.cif)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "La letra del NIF no es correcta",
                    path: ['cif']
                });
            }
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
    })
})

const imageFileSchema = z.object({
    body: z.object({
        fieldName: z.string(),
        originalName: z.string(),
        mimetype: z.enum(
            ["image/jpeg", "image/png", "image/gif", "image/webp"],
            { error: () => "Solo imágenes (jpeg, png, gif, webp)" }),
        size: z.number().max(5 * 1024 * 1024, 'Máximo 5MB')

    })
})

const newPasswordSchema = z.object({
    body: z.object({
        oldPassord: passwordField,
        newPassord: passwordField,
    }).refine((data) => data.oldPassord != data.newPassord, {
        error: "Las contraseñas han de ser distintas",
        path: ["newPassord"],
    }),
})


