// AUX functions
export const checkFormatNIF = (nif) => {
    if (typeof nif !== 'string') {
        return false;
    }

    const normalizedNif = nif.trim().toUpperCase();
    if (!/^[0-9]{8}[A-Z]$/.test(normalizedNif)) {
        return false;
    }

    const numberPart = parseInt(normalizedNif.slice(0, 8), 10);
    const letterPart = normalizedNif.charAt(8);
    const validLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const expectedLetter = validLetters[numberPart % 23];
    return letterPart === expectedLetter;
};
export const checkFormatCIF = (cif) => {
    if (typeof cif !== 'string') {
        return false;
    }

    const normalizedCif = cif.trim().toUpperCase();
    if (!/^[ABCDEFGHJNPQRSUVW]\d{7}[0-9A-J]$/.test(normalizedCif)) {
        return false;
    }

    const firstChar = normalizedCif.charAt(0);
    const digits = normalizedCif.substring(1, 8);
    const controlDigit = normalizedCif.charAt(8);

    let sumaPares = 0;
    let sumaImpares = 0;

    for (let i = 0; i < digits.length; i++) {
        const n = parseInt(digits[i], 10);
        if (i % 2 !== 0) {
            sumaPares += n;
        } else {
            let t = n * 2;
            sumaImpares += (t > 9) ? (t - 9) : t;
        }
    }

    const sumaTotal = sumaPares + sumaImpares;
    const unidad = sumaTotal % 10;
    const numControl = (10 - unidad) % 10;
    const letrasControl = 'JABCDEFGHI';
    const letraControl = letrasControl[numControl];

    // Lógica de validación según el tipo de entidad
    // A, B, E y H requieren dígito de control numérico.
    // K, P, Q, S, N y W requieren letra de control.
    if ('ABEH'.includes(firstChar)) {
        return controlDigit === numControl.toString();
    } else if ('KPQSNW'.includes(firstChar)) {
        return controlDigit === letraControl;
    } else {
        return controlDigit === numControl.toString() || controlDigit === letraControl;
    }
};
