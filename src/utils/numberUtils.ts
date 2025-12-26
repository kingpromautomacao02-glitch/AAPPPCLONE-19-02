export const safeParseFloat = (val: any): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        // Troca vírgula por ponto e remove símbolos de moeda ou caracteres não numéricos (exceto ponto e traço)
        const clean = val.replace(',', '.').replace(/[^0-9.-]/g, '');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    }
    return 0;
};
