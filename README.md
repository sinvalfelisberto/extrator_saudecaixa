# 📄 Extrator de Extratos do Saúde CAIXA

Este programa **entra sozinho** no site do Saúde CAIXA e **baixa os extratos** de todos os
beneficiários, de todos os meses e de todos os anos. Cada extrato vira um arquivo que abre no Excel.

Você não precisa saber programar. É só seguir os passos abaixo, **um de cada vez**. 🙂

---

## O que você precisa ter

1. Um computador com internet.
2. O **Google Chrome** instalado. ([baixar aqui](https://www.google.com/chrome/))
3. O **Python** instalado (o passo 1 ensina).
4. Seu **CPF** e sua **senha** do Saúde CAIXA.

---

## Passo 1 — Instalar o Python (só na primeira vez)

Se você já tem o Python, pule para o Passo 2. Se não sabe, faça mesmo assim: não estraga nada.

1. Entre em **https://www.python.org/downloads/** e clique no botão amarelo **Download Python**.
2. Abra o arquivo que baixou.
3. ⚠️ **MUITO IMPORTANTE:** na primeira tela da instalação, **marque a caixinha
   "Add python.exe to PATH"** (fica embaixo). Depois clique em **Install Now**.
4. Quando terminar, clique em **Close**.

---

## Passo 2 — Colocar seu CPF e senha

1. Abra a pasta do programa (a pasta `extrator_saudecaixa`).
2. Procure o arquivo chamado **`.env.example`**.
   - Se você não vê arquivos que começam com ponto, no Windows abra a aba **Exibir** e marque
     **Itens ocultos**.
3. **Faça uma cópia** desse arquivo e mude o nome da cópia para **`.env`** (só isso: ponto + env).
4. Abra o `.env` com o **Bloco de Notas**. Ele vai estar assim:

   ```
   SITE=https://atendimentosaude.caixa.gov.br/
   CPF=
   SENHA=
   PAGINA_DEMOSTRATIVO=https://atendimentosaude.caixa.gov.br/#/meus-dados/financeiro/extrato/reeembolso
   ```

5. Escreva seu CPF (só números, sem pontos) logo depois de `CPF=` e sua senha depois de `SENHA=`.
   **Sem espaços e sem aspas.** Exemplo:

   ```
   CPF=12345678900
   SENHA=minhasenha123
   ```

6. Salve (**Ctrl + S**) e feche.

> 🔒 Esse arquivo guarda sua senha. **Não mande para ninguém** e não coloque na internet.

---

## Passo 3 — Abrir o terminal dentro da pasta

**No Windows:**
1. Abra a pasta `extrator_saudecaixa` no Explorador de Arquivos.
2. Clique na **barra de endereço** (onde aparece o caminho da pasta, lá em cima).
3. Apague tudo o que estiver escrito, digite **`cmd`** e aperte **Enter**.
4. Vai abrir uma janela preta. É o terminal. 👍

**No Mac ou Linux:** abra o Terminal, digite `cd ` (com um espaço), arraste a pasta
`extrator_saudecaixa` para dentro da janela e aperte **Enter**.

---

## Passo 4 — Rodar o programa ▶️

Na janela preta, digite o comando abaixo e aperte **Enter**:

```
python main.py
```

> No Mac ou Linux, se der erro, use `python3 main.py`.

### O que vai acontecer

1. **Na primeira vez**, o programa vai **instalar coisas sozinho**. Aparecem muitas letrinhas e
   barras de progresso. Isso é normal e pode levar alguns minutos. **Espere.**
2. Uma janela do **navegador** vai abrir sozinha. **Não feche e não mexa nela.** Ela vai entrar no
   site, digitar seu CPF e sua senha e ir trocando de mês, de ano e de pessoa.
3. Na janela preta vão aparecer linhas como:

   ```
   SINVAL_AMARAL_FELISBERTO_2026_09.csv: 27 linha(s)
   ```

   Cada linha dessas é **um extrato salvo**. ✅
4. Quando terminar, aparece **`Concluído.`** e o navegador fecha sozinho.

⏳ Pode demorar bastante (são muitos meses e pessoas). Deixe o computador ligado e não feche nenhuma janela.

### E se o programa pedir para eu fazer alguma coisa?

Às vezes o site da Caixa pede algo que o programa não sabe fazer sozinho, como um **código
enviado por SMS**, uma **"prova de que você não é um robô"** ou avisa "bloqueio". Nesse caso:

1. O programa **para** e escreve na janela preta algo como *"Resolva na janela e tecle ENTER"*.
2. Vá na janela do **navegador** e faça o que o site pede (digite o código, marque a caixinha…).
3. Volte na janela preta e aperte **Enter**. Ele continua sozinho.

---

## Passo 5 — Pegar seus extratos 🎉

Abra a pasta **`extratos`** (dentro de `extrator_saudecaixa`). Lá estão todos os arquivos, com o nome
no formato:

```
NOME_ANO_MES.csv
```

Exemplo: `SINVAL_AMARAL_FELISBERTO_2026_09.csv` é o extrato de **setembro de 2026** do Sinval.

Dê dois cliques em qualquer arquivo para abrir no **Excel**.

### O que tem dentro de cada arquivo

Cada linha é um atendimento. As colunas são:

| Coluna | O que é |
|---|---|
| `beneficiario`, `ano`, `mes` | De quem é e de qual mês |
| `mensalidade`, `coparticipacao_mes`, `total_mes` | Os valores do mês |
| `prestador`, `cnpj` | Onde foi o atendimento (clínica, hospital…) |
| `data_atendimento`, `valor_lancamento` | Dia do atendimento e valor lançado |
| `evento_data`, `evento_descricao` | O que foi feito (ex.: sessão de psicoterapia) |
| `evento_coparticipacao`, `evento_recebido_prestador` | Quanto você pagou e quanto o prestador recebeu |
| `observacao` | Avisos do site (ex.: "lançamento não foi debitado") |

---

## Rodar de novo outro dia

Repita só o **Passo 3** e o **Passo 4**. O programa **pula os arquivos que já existem**, então é
rápido. Se quiser **baixar tudo de novo** (sobrescrever os arquivos), use:

```
python main.py --refazer
```

Se a execução for interrompida no meio (acabou a internet, fechou sem querer…), é só rodar de novo:
ele continua de onde parou.

---

## Deu problema? 🆘

| O que apareceu | O que fazer |
|---|---|
| `'python' não é reconhecido...` | O Python não foi instalado direito. Refaça o **Passo 1** e lembre de marcar **Add python.exe to PATH**. |
| `Variável CPF ausente no .env` | O `.env` não foi preenchido ou está com nome errado. Refaça o **Passo 2**. |
| O arquivo se chama `.env.txt` | O Windows escondeu o `.txt`. Ative **Exibir → Extensões de nomes de arquivos** e tire o `.txt`. |
| Pediu para "resolver na janela" | Veja a parte *"E se o programa pedir para eu fazer alguma coisa?"* acima. |
| "Estamos detectando comportamento malicioso" | É a proteção da Caixa. Espere alguns minutos e tente de novo. Se continuar, tente por outra rede de internet. |
| CPF ou senha não funcionam | Confira o `.env`. Tente entrar no site pelo navegador para ver se a senha está certa. |
| A pasta `extratos` ficou vazia | Rode de novo e leia as mensagens na janela preta. Se aparecer um erro em vermelho, mande uma foto dele para quem te passou o programa. |

---

## Perguntas rápidas

**Isso é seguro?** O programa só *lê* os extratos. Ele não altera nada na sua conta. A senha fica só
no seu computador, no arquivo `.env`.

**Posso usar o computador enquanto roda?** Pode, mas **não feche nem mexa** na janela do navegador
que ele abriu.

**Onde ficam os arquivos?** Na pasta `extratos`, dentro da pasta do programa.
