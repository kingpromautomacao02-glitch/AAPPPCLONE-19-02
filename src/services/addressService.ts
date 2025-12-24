
export interface ViaCEPResponse {
    cep: string;
    logradouro: string;
    complemento: string;
    bairro: string;
    localidade: string;
    uf: string;
    ibge: string;
    gia: string;
    ddd: string;
    siafi: string;
    erro?: boolean;
}

export const fetchAddressByCEP = async (cep: string): Promise<string | null> => {
    // Remove tudo que não é número
    const cleanCep = cep.replace(/\D/g, '');

    // Validação básica de tamanho (CEP tem 8 dígitos)
    if (cleanCep.length !== 8) {
        return null;
    }

    try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        if (!response.ok) {
            throw new Error('Falha na requisição');
        }

        const data: ViaCEPResponse = await response.json();

        if (data.erro) {
            return null; // CEP não encontrado
        }

        // Formata o endereço conforme solicitado: Rua, Bairro - Cidade/UF
        // O usuário completa com o número
        return `${data.logradouro}, ${data.bairro} - ${data.localidade}/${data.uf}`;
    } catch (error) {
        console.error("Erro ao buscar CEP:", error);
        return null;
    }
};
