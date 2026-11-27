# Estudo — os recursos do Google Apps Script e o que faz sentido para o Prisma (27/11/2026)

**Pedido do PO:** "procura em documentos do Google Apps Script todas as ferramentas e capacidades que
ele possui para ver se faz algum sentido". Só estudo: **nada foi mudado no sistema.**

**Fonte:** as páginas oficiais de developers.google.com (cotas, gatilhos instaláveis, eventos,
serviços avançados, MailApp, clasp). A leitura direta das páginas foi bloqueada pela rede do ambiente
de trabalho; os dados vieram dos trechos dessas páginas trazidos pela busca restrita ao site oficial.
Os números de cota mudam sem aviso: conferir na página antes de depender deles.

## 1. O que o Prisma já usa

| Recurso | Para quê no Prisma |
|---|---|
| SpreadsheetApp (+ localizador `createTextFinder`) | Ler e gravar as abas; achar o caso pelo Id |
| HtmlService + `google.script.run` | As telas do sistema |
| CacheService | A configuração guardada por 5 minutos |
| PropertiesService | Filas da auditoria e da ERROS, rascunho do Cadastrar, marcas |
| LockService | A trava das gravações (B1) |
| Session | Quem está usando (e-mail) e o fuso |
| Utilities | Datas, código de envio, impressão digital da versão |
| Gatilho de horário (criado à mão no editor) | `atualizarAnalisesAgendadas` |
| Registro de erros no Google Cloud (`exceptionLogging: STACKDRIVER`) e aba ERROS | Erros e medições |

**Não usa:** e-mail (MailApp/GmailApp), Agenda (CalendarApp), Drive (DriveApp), gatilho de mudança de
estrutura (`onChange`), proteção de intervalos, serviços avançados (API do Sheets, BigQuery, Drive) e
publicação por linha de comando (`clasp`).

## 2. Os limites que importam (página de cotas)

| Limite | Conta comum (gmail) | Google Workspace |
|---|---|---|
| Tempo de uma execução | 6 min | 6 min |
| Execuções ao mesmo tempo | 30 por usuário, 1.000 por script | igual |
| Gatilhos por usuário e script | 20 | 20 |
| Tempo total de gatilhos por dia | 90 min | 6 h |
| Destinatários de e-mail por dia | 100 | 1.500 (2.000 dentro do domínio) |
| PropertiesService | 9 KB por valor, 500 KB por depósito; 50 mil leituras/gravações por dia | 500 mil por dia |
| CacheService | 100 KB por valor, chave até 250 caracteres, até 1.000 itens | igual |
| Gatilho simples (`onEdit` simples) | até 30 s | igual |

## 3. O que existe e se faz sentido

| Recurso do Apps Script | Ideia para o Prisma | Faz sentido? |
|---|---|---|
| **DriveApp + gatilho de horário** | **Cópia de segurança automática** da planilha (uma por dia/semana, numa pasta, com as N mais recentes) | **Sim, a mais forte.** A planilha é o banco de dados; hoje uma exclusão em massa ou uma colagem errada não tem volta além do histórico de versões do Google |
| **`clasp` + GitHub** | **Publicar o código direto do repositório**, sem colar abas do Excel | **Sim, se a TI deixar.** Acaba com o risco de arquivo esquecido ou colado pela metade. Depende de ligar a "API do Apps Script" na conta e guardar credenciais; em conta corporativa pode ser bloqueado |
| **Proteção de intervalos (`protect`)** | Proteger o cabeçalho das bases e as colunas de carimbo (datas de status, "quem mudou") contra edição à mão | **Sim, com cuidado.** Protege a produtividade e os prazos; mexe em permissão da planilha, por isso precisa de aprovação e de lista de quem edita |
| **Gatilho instalável `onChange`** | Avisar o administrador quando alguém insere/remove coluna ou aba (o evento traz `INSERT_COLUMN`, `REMOVE_COLUMN`, `INSERT_GRID`…) | **Sim, como alarme.** O diagnóstico já confere a estrutura; o gatilho avisaria na hora. Precisa testar na planilha real se a inserção de coluna dispara o evento |
| **CalendarApp** | A Agenda da Mesa (reuniões com corretores) criando o evento na agenda do analista | **Talvez.** Útil se a Mesa já usa o Google Agenda |
| **MailApp** | Resumo diário por e-mail dos casos perto de vencer, para a coordenação | **Talvez.** Cabe na cota (100 ou 1.500/dia); o aviso na tela já existe |
| **API do Sheets (serviço avançado, `batchGet`)** | Ler várias faixas numa ida só | Existe; é melhoria de velocidade, que o PO decidiu deixar como está |
| **BigQuery / Looker Studio** | Levar o histórico para um banco de análise e painéis | **Futuro.** Faz sentido quando a planilha crescer ou para análises maiores; é o caminho da área de dados |
| Chat (via UrlFetchApp), Forms, Docs, Slides | Alertas em espaço do Chat, formulários, relatórios em documento | Sem necessidade hoje |

## 4. Recomendação do estudo

1. **Cópia de segurança automática** (DriveApp + gatilho de horário).
2. **Publicar com `clasp`** a partir do GitHub, se a TI da operação permitir.
3. **Proteger as colunas de carimbo e o cabeçalho** das bases, com o **alarme `onChange`**.

Nada disso foi implementado: depende da aprovação do PO.
