import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Gera hash de uma senha
 */
export const hashPassword = async (password: string): Promise<string> => {
    return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Verifica se a senha corresponde ao hash
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
    // Se o hash não começa com $2 (formato bcrypt), é senha legada em texto puro
    if (!hash.startsWith('$2')) {
        return password === hash;
    }
    return bcrypt.compare(password, hash);
};

/**
 * Verifica se uma string é um hash bcrypt válido
 */
export const isHashedPassword = (password: string): boolean => {
    return password.startsWith('$2');
};
