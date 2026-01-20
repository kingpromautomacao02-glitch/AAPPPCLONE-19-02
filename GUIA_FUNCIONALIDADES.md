# LogiTrack CRM - Guia Completo de Funcionalidades

Este documento descreve todas as funcionalidades disponíveis no sistema LogiTrack CRM, com passo a passo de uso.

---

## 📋 Índice

1. [Autenticação](#1-autenticação)
2. [Dashboard](#2-dashboard)
3. [Gestão de Clientes](#3-gestão-de-clientes)
4. [Registro de Serviços (Corridas)](#4-registro-de-serviços-corridas)
5. [Histórico e Filtros](#5-histórico-e-filtros)
6. [Relatórios e Exportação](#6-relatórios-e-exportação)
7. [Painel Administrativo](#7-painel-administrativo)
8. [Configurações](#8-configurações)

---

## 1. Autenticação

### Login
1. Acesse a página inicial
2. Digite seu **email** e **senha**
3. Clique em **"Entrar na Plataforma"**

### Cadastro de Novo Usuário
1. Na tela de login, clique em **"Cadastre-se"**
2. Preencha: Nome, Email, Telefone e Senha
3. Aguarde **aprovação do administrador** (status: PENDING)

### Recuperação de Senha
1. Clique em **"Esqueci minha senha"**
2. Digite seu email cadastrado
3. Acesse o link enviado para redefinir a senha

---

## 2. Dashboard

Visão geral do mês atual com:
- **Faturamento Bruto**: Total cobrado dos clientes
- **Faturamento Líquido**: Lucro (cobrado - pago ao motoboy)
- **Custo com Motoboys**: Total pago aos entregadores
- **Total de Corridas**: Quantidade de serviços no mês

### Gráficos
- Faturamento por método de pagamento (PIX, Dinheiro, Cartão)
- Distribuição de corridas por cliente

---

## 3. Gestão de Clientes

### Cadastrar Novo Cliente
1. Vá em **Clientes** no menu lateral
2. Clique em **"+ Novo Cliente"**
3. Preencha os campos:
   - Nome da Empresa
   - CNPJ (opcional)
   - Email e Telefone
   - Endereço Completo
   - Categoria (Restaurante, Escritório, etc.)
   - Responsável Principal
4. Clique em **"Salvar"**

### Editar Cliente
1. Na lista de clientes, clique em **"Ver detalhes"**
2. Clique no ícone de **lápis (✏️)** ao lado do nome
3. Faça as alterações e salve

### Excluir Cliente (Soft Delete)
- Clientes não são excluídos permanentemente
- Vão para a **Lixeira** e podem ser restaurados

---

## 4. Registro de Serviços (Corridas)

### Nova Corrida
1. Acesse os detalhes de um cliente
2. Clique em **"+ Nova Corrida"** (abrirá um modal centralizado)
3. Preencha:
   - **Nº Pedido**: Identificador opcional
   - **Data**: Data da corrida
   - **Endereços de Coleta**: Pode adicionar múltiplos (+ Adicionar Parada)
   - **Endereços de Entrega**: Pode adicionar múltiplos
   - **Valor da Corrida** (cobrado cliente)
   - **Pago ao Motoboy** (custo)
   - **Valor Espera** (tempo extra)
   - **Taxa Extra** (aparece somente no PDF cliente)
   - **Solicitante**: Quem pediu a corrida
   - **Método de Pagamento**: PIX, Dinheiro ou Cartão
   - **Status**: Pago ou Pendente
4. Clique em **"Salvar"**

### Cálculo Automático de Distância
- Se o Mapbox estiver configurado, o sistema calcula a distância total do roteiro automaticamente

### Editar Corrida
1. Na lista de corridas, clique no ícone de **lápis**
2. Faça as alterações
3. Salve

### Duplicar Corrida
- Clique no ícone de **cópia** para repetir uma corrida na data de hoje

### Excluir Corrida
- Clique no ícone de **lixeira** (vai para a lixeira, pode ser restaurada)

---

## 5. Histórico e Filtros

### Filtrar Corridas
- **Por Status**: Todos | Pagos | Pendentes
- **Por Período**: Hoje | Semana | Mês | Período Customizado

### Ações em Massa
1. Selecione múltiplas corridas (checkbox)
2. Clique em **"Marcar PAGO"** ou **"Marcar PENDENTE"**

### Paginação (Carregar Sob Demanda)
- A lista mostra **20 serviços** por vez
- Clique em **"Carregar mais"** para ver mais registros
- Melhora performance com muitos dados

### Histórico de Alterações (Admin)
- Clique no ícone de **relógio** para ver quem editou a corrida

---

## 6. Relatórios e Exportação

### Gerar PDF (Relatório Cliente)
1. Filtre as corridas desejadas
2. Clique em **"Exportar"** → **"PDF"**
3. Gera relatório profissional com:
   - Dados do cliente e prestador
   - Lista detalhada de serviços
   - Total a pagar

### Exportar CSV
- Clique em **"Exportar"** → **"CSV"**
- Abre em Excel para análise

### Comprovante Individual
- Clique no ícone de **documento** em uma corrida
- Gera/compartilha comprovante individual (WhatsApp, Download)

---

## 7. Painel Administrativo

> Acesso apenas para usuários com role: ADMIN

### Gerenciar Usuários
- Ver todos os usuários do sistema
- **Aprovar** usuários pendentes
- **Bloquear/Desbloquear** contas
- **Inativar** (soft delete) usuários

### Impersonar Usuário
- Clique em **"Acessar como"** para ver o sistema como outro usuário
- Útil para suporte

---

## 8. Configurações

### Perfil da Empresa
- Editar: Nome da Empresa, CNPJ, Endereço
- Esses dados aparecem nos PDFs gerados

### Alterar Senha
- Digite a nova senha e confirme

### Tema
- Alternar entre **Modo Claro** e **Modo Escuro**

---

## 🔧 Variáveis de Ambiente

```env
# Banco de dados (SUPABASE ou LOCAL)
VITE_DB_PROVIDER=SUPABASE
VITE_SUPABASE_URL=https://sua-url.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anonima

# Mapbox (cálculo de distância)
VITE_MAPBOX_TOKEN=sua-chave-mapbox
```

---

## 📞 Suporte

Em caso de dúvidas ou problemas, entre em contato com o administrador do sistema.
