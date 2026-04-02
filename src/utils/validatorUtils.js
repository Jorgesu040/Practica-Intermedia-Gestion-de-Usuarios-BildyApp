// AUX functions
export const checkFormatNIF = (nif) => {
    const numberPart = parseInt(nif.slice(0, 8), 10);
    const letterPart = nif.charAt(8).toUpperCase();
    const validLetters = 'TRWAGMYFPDXBNJZSQVHLCKE';
    const expectedLetter = validLetters[numberPart % 23];
    return letterPart === expectedLetter;
};
export const checkFormatCIF = (cif) => {
    const firstChar = cif.charAt(0).toUpperCase();
    const digits = cif.substring(1, 8);
    const controlDigit = cif.charAt(8).toUpperCase();

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
    if ('PQSWR'.includes(firstChar)) {
        return controlDigit === numControl.toString();
    } else if ('ABEH'.includes(firstChar)) {
        return controlDigit === letraControl;
    } else {
        return controlDigit === numControl.toString() || controlDigit === letraControl;
    }
};
