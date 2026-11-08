Crie um protótipo navegável de alta fidelidade para o aplicativo de saúde "Saúde Recife".

O objetivo é criar um MVP visual para apresentação acadêmica, priorizando a experiência do paciente.

NÃO crie uma landing page.

NÃO crie um dashboard corporativo.

Crie um aplicativo mobile de saúde realista, simples, acessível e navegável.

## CONCEITO

O aplicativo ajuda o paciente a encontrar um possível caminho para seu atendimento.

O fluxo principal é:

Paciente → pré-triagem → recomendação de especialidade → clínica → profissional → data → horário → confirmação do agendamento.

A pré-triagem utiliza IA como ferramenta de orientação.

IMPORTANTE: a IA NÃO deve diagnosticar doenças.

Utilize linguagem como:

"Com base nas suas respostas, essa pode ser uma especialidade adequada para o seu atendimento."

E nunca:

"Você tem X."

---

# IDENTIDADE VISUAL

Crie uma identidade moderna, humana e confiável.

Sensação desejada:

* saúde;
* segurança;
* acolhimento;
* tranquilidade;
* simplicidade;
* tecnologia discreta.

Utilize uma paleta baseada em azul/azul-petróleo, teal/verde e neutros claros.

Use verde para sucesso, âmbar para alertas e vermelho para erros.

Não dependa somente das cores para comunicar informações.

Utilize uma fonte sans-serif altamente legível, preferencialmente Inter ou Atkinson Hyperlegible.

Utilize aproximadamente 16–18 px para textos principais.

Utilize botões grandes, espaçamento confortável e contraste adequado.

A experiência deve funcionar bem para pessoas idosas e usuários com pouca familiaridade digital, sem infantilizar o usuário.

---

# TELAS

Crie as seguintes telas.

## 1. SPLASH

Logo/nome:

"Saúde Recife"

Interface simples.

## 2. BOAS-VINDAS

Título:

"Cuide do seu próximo passo."

Texto:

"Encontre o atendimento que você precisa de forma simples e segura."

Botões:

"Começar"

"Já tenho uma conta"

## 3. LOGIN

Título:

"Entrar"

Campos:

"E-mail"

"Senha"

Botões:

"Entrar"

"Esqueci minha senha"

"Não tenho uma conta"

## 4. HOME

Título:

"Olá!"

Texto:

"Como podemos ajudar você hoje?"

Ação principal:

"Preciso de atendimento"

Descrição:

"Responda algumas perguntas e descubra qual atendimento pode ser mais adequado para você."

Ação secundária:

"Já sei o que preciso"

Descrição:

"Encontre uma especialidade, clínica ou profissional."

Seção:

"Próximo atendimento"

Navegação inferior:

* Início
* Agendamentos
* Histórico
* Perfil

A Home deve ser limpa e não parecer um dashboard.

---

# FLUXO DE TRIAGEM

## 5. INTRODUÇÃO

Título:

"Vamos entender o que você precisa"

Texto:

"Responda algumas perguntas para encontrarmos um possível caminho para o seu atendimento."

Aviso:

"Esta orientação não substitui a avaliação de um profissional de saúde."

Botão:

"Começar"

## 6. PERGUNTA — SINTOMA

Título:

"O que você está sentindo?"

Opções:

* Dor
* Febre
* Tosse
* Cansaço
* Alteração na pele
* Outro

Mostrar progresso:

"1 de 5"

## 7. PERGUNTA — LOCALIZAÇÃO

Título:

"Em qual parte do corpo você sente o problema?"

Mostrar opções simples.

Progresso:

"2 de 5"

## 8. PERGUNTA — DURAÇÃO

Título:

"Há quanto tempo você está sentindo isso?"

Opções:

* Hoje
* Há alguns dias
* Há algumas semanas
* Há alguns meses
* Não tenho certeza

Progresso:

"3 de 5"

## 9. PERGUNTA — INTENSIDADE

Título:

"Como você classificaria o desconforto?"

Criar escala visual acessível.

Progresso:

"4 de 5"

## 10. INFORMAÇÕES ADICIONAIS

Título:

"Gostaria de contar mais alguma coisa?"

Campo opcional.

Placeholder:

"Digite uma informação que possa ajudar..."

Progresso:

"5 de 5"

Botão:

"Continuar"

---

# IA

## 11. PROCESSAMENTO

Título:

"Estamos analisando suas respostas"

Texto:

"Isso pode levar alguns segundos."

Criar indicador de carregamento.

## 12. RESULTADO

Título:

"Encontramos um possível caminho para você"

Especialidade em destaque:

"Ortopedia"

Texto:

"Com base nas respostas fornecidas, essa pode ser uma especialidade adequada para o seu atendimento."

Aviso:

"Esta orientação não substitui a avaliação de um profissional de saúde."

Botão principal:

"Ver opções de atendimento"

Botão secundário:

"Escolher outra especialidade"

---

# AGENDAMENTO

## 13. ESPECIALIDADE

Título:

"Qual atendimento você procura?"

Campo:

"Buscar especialidade"

Exemplos:

* Clínica geral
* Cardiologia
* Dermatologia
* Ortopedia
* Pediatria

## 14. CLÍNICAS

Título:

"Escolha onde você quer ser atendido"

Criar cards com:

* nome;
* localização;
* especialidade;
* próxima disponibilidade.

Exemplo:

"Clínica Boa Saúde"

"Boa Viagem"

"Ortopedia"

"Próximo horário: amanhã, 09:30"

Botão:

"Ver horários"

## 15. PROFISSIONAL

Título:

"Escolha o profissional"

Mostrar profissionais relacionados à especialidade.

## 16. DATA

Título:

"Escolha a data"

Criar seleção simples de datas.

## 17. HORÁRIO

Título:

"Escolha o horário"

Criar botões grandes:

09:00
09:30
10:00
10:30
14:00
14:30

Diferenciar claramente horários disponíveis, selecionados e indisponíveis.

## 18. REVISÃO

Título:

"Confira seu agendamento"

Mostrar:

Especialidade
Ortopedia

Profissional
Dra. Nome

Clínica
Clínica Boa Saúde

Data
16 de outubro

Horário
09:30

Botão:

"Confirmar agendamento"

## 19. SUCESSO

Título:

"Agendamento realizado!"

Texto:

"Sua consulta foi agendada com sucesso."

Mostrar resumo da consulta.

Botões:

"Ver agendamento"

"Voltar para o início"

---

# OUTRAS ÁREAS

## 20. MEUS AGENDAMENTOS

Mostrar próximos atendimentos.

Cada card deve apresentar:

* especialidade;
* profissional;
* clínica;
* data;
* horário;
* status.

Botão:

"Ver detalhes"

## 21. DETALHES DO AGENDAMENTO

Mostrar informações completas.

Botões:

"Reagendar"

"Cancelar agendamento"

## 22. HISTÓRICO

Mostrar consultas anteriores.

## 23. NOTIFICAÇÕES

Exemplos:

"Sua consulta está marcada para amanhã às 09:30."

"Seu agendamento foi confirmado."

## 24. PERFIL

Mostrar:

* nome;
* e-mail;
* telefone;
* editar dados;
* privacidade;
* acessibilidade;
* configurações;
* sair.

---

# NAVEGAÇÃO

Conecte o protótipo.

O fluxo principal deve ser totalmente navegável:

Home
→ Preciso de atendimento
→ Triagem
→ Perguntas
→ Processamento
→ Resultado
→ Especialidade
→ Clínica
→ Profissional
→ Data
→ Horário
→ Revisão
→ Confirmação
→ Meus agendamentos

Também permita:

Home
→ Já sei o que preciso
→ Especialidade
→ Clínica
→ Profissional
→ Data
→ Horário
→ Revisão
→ Confirmação

E:

Home
→ Meus agendamentos
→ Detalhes
→ Reagendar/Cancelar

Os botões de voltar devem retornar à etapa anterior correta.

---

# ACESSIBILIDADE

Priorize:

* contraste adequado;
* texto legível;
* botões grandes;
* espaçamento confortável;
* linguagem simples;
* hierarquia visual clara;
* não utilizar somente cores para indicar estados;
* navegação previsível;
* mensagens de erro compreensíveis.

Não infantilize o usuário idoso.

---

# ESTADOS

Crie pelo menos alguns exemplos de:

* loading;
* erro;
* vazio;
* sucesso;
* sem resultados.

Exemplo:

"Não conseguimos carregar os horários."

Botão:

"Tentar novamente"

---

# RESULTADO FINAL

O protótipo deve parecer um produto real em estágio de MVP.

Priorize:

1. fluxo navegável;
2. clareza;
3. acessibilidade;
4. consistência visual;
5. boa experiência de triagem;
6. boa experiência de agendamento.

Não adicione funcionalidades desnecessárias.

Não complique a interface.

O principal objetivo é demonstrar claramente a jornada:

"Preciso de atendimento" → "Entendi meu possível caminho" → "Encontrei atendimento" → "Agendei minha consulta".
