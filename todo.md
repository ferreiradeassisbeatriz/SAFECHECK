# SAFECHECK - TODO List

## Autenticação e Usuários
- [x] Criar usuário developer fixo (Beatriz Assis, beaatrizfas@gmail.com, senha 2407)
- [x] Implementar tela de login com opções "Entrar" e "Primeiro Acesso"
- [x] Implementar cadastro de novo operário (nome completo, matrícula, email, setor, gestor imediato, senha 4 dígitos)
- [x] Implementar login com formato primeironome.últimosobrenome + senha 4 dígitos
- [x] Implementar painel developer para gerenciar usuários administradores (criar, editar, inativar, excluir)

## Tela Inicial de Segurança
- [x] Criar tela inicial em tons de azul escuro
- [x] Exibir informações de segurança obrigatórias
- [x] Implementar checklist de validação de EPIs
- [x] Implementar validação de condições do ambiente
- [x] Implementar assinatura digital do operário
- [x] Habilitar botão "Iniciar Atividade" apenas após todas as validações

## Modo Operário - Seleção e Execução de Tarefa
- [x] Implementar seleção de tipo de tarefa
- [x] Exibir automaticamente riscos associados à tarefa
- [x] Exibir EPIs necessários para a tarefa
- [x] Exibir EPCs necessários para a tarefa
- [ ] Criar formulário dinâmico conforme tarefa selecionada
- [ ] Gerar Ordem de Serviço a partir das respostas do formulário
- [ ] Implementar coleta de assinatura digital na OS
- [ ] Implementar exportação de OS em PDF
- [ ] Implementar exportação de OS em PNG

## Modo Admin - Dashboard
- [x] Criar dashboard com métricas: Check-ins hoje, Total de check-ins, OS Pendentes, OS Assinadas, Setores Ativos
- [x] Implementar visualização de setores cadastrados na obra
- [x] Implementar cadastro e edição de tipos de tarefa com grau de risco
- [x] Implementar gestão de requisitos de EPIs/EPCs por tarefa
- [x] Implementar listagem de Ordens de Serviço assinadas
- [x] Implementar listagem de Ordens de Serviço pendentes
- [x] Implementar histórico de check-ins dos últimos 5 dias

## Banco de Dados
- [x] Criar tabela de usuários com roles (developer, admin, operário)
- [x] Criar tabela de setores da obra
- [x] Criar tabela de tipos de tarefa com riscos e EPIs/EPCs
- [x] Criar tabela de check-ins
- [x] Criar tabela de Ordens de Serviço
- [ ] Criar tabela de formulários dinâmicos
- [x] Criar tabela de assinaturas digitais

## UI/UX
- [x] Definir paleta de cores (azul escuro para tela de segurança, cores profissionais para resto)
- [x] Criar componentes reutilizáveis
- [x] Implementar layout responsivo
- [x] Implementar navegação intuitiva

## Testes
- [x] Escrever testes para autenticação
- [ ] Escrever testes para fluxo de check-in
- [ ] Escrever testes para geração de OS
- [ ] Escrever testes para dashboard admin

## Deploy e Finalização
- [ ] Validar todas as funcionalidades
- [ ] Testar em diferentes navegadores
- [ ] Criar checkpoint final
