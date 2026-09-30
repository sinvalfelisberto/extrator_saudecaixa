# 📄 Extrator de Extratos do Saúde CAIXA

Este programa **entra sozinho** no site do Saúde CAIXA e **baixa os extratos** de todos os
beneficiários, de todos os meses e de todos os anos. Cada extrato vira um arquivo que abre no Excel.

Você não precisa saber programar. É só seguir os passos abaixo, **um de cada vez**. 🙂

---

## O que você precisa ter

1. Um computador com internet.
2. O **Google Chrome** instalado. ([baixar aqui](https://www.google.com/chrome/))
3. O **Python** instalado (o passo 1 ensina).
4. Seu **CPF** e sua **senha** do Saúde CAIXA (você vai digitar direto no site, o programa **não guarda** nada).

---

## Passo 1 — Instalar o Python (só na primeira vez)

Se você já tem o Python, pule para o Passo 2. Se não sabe, faça mesmo assim: não estraga nada.

1. Entre em **https://www.python.org/downloads/** e clique no botão amarelo **Download Python**.
2. Abra o arquivo que baixou.
3. ⚠️ **MUITO IMPORTANTE:** na primeira tela da instalação, **marque a caixinha
   "Add python.exe to PATH"** (fica embaixo). Depois clique em **Install Now**.
4. Quando terminar, clique em **Close**.

---

## Passo 2 — Abrir o terminal dentro da pasta

**No Windows:**
1. Abra a pasta `extrator_saudecaixa` no Explorador de Arquivos.
2. Clique na **barra de endereço** (onde aparece o caminho da pasta, lá em cima).
3. Apague tudo o que estiver escrito, digite **`cmd`** e aperte **Enter**.
4. Vai abrir uma janela preta. É o terminal. 👍

**No Mac ou Linux:** abra o Terminal, digite `cd ` (com um espaço), arraste a pasta
`extrator_saudecaixa` para dentro da janela e aperte **Enter**.

---

## Passo 3 — Rodar o programa ▶️

Na janela preta, digite o comando abaixo e aperte **Enter**:

```
python main.py
```

> No Mac ou Linux, se der erro, use `python3 main.py`.

### O que vai acontecer

1. **Na primeira vez**, o programa vai **instalar coisas sozinho**. Aparecem muitas letrinhas e
   barras de progresso. Isso é normal e pode levar alguns minutos. **Espere.**
2. Uma janela do **navegador** vai abrir sozinha, na página de entrada do Saúde CAIXA.
3. **É a sua vez:** faça o **login normalmente** nessa janela (CPF, senha e o que mais o site pedir,
   como código por SMS ou a caixinha "não sou um robô").
4. Depois de entrar, abra a página do extrato: no menu, **Meus Dados → Financeiro → Extrato
   Financeiro**. Você vai ver a lista de meses (Setembro, Agosto...) do lado esquerdo.
   Assim que essa lista aparecer, o programa **percebe sozinho** (não precisa apertar nada) e começa a
   trabalhar: vai trocando de mês, de ano e de pessoa. **Não feche e não mexa na janela a partir daí.**
5. Na janela preta vão aparecer linhas como:

   ```
   SINVAL_AMARAL_FELISBERTO_2026_09.csv: 27 linha(s)
   ```

   Cada linha dessas é **um extrato salvo**. ✅
6. Quando terminar, aparece **`Concluído.`** e o navegador fecha sozinho.

⏳ Pode demorar bastante (são muitos meses e pessoas). Deixe o computador ligado e não feche nenhuma janela.

---

## Passo 4 — Pegar seus extratos 🎉

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
| `evento_coparticipacao`, `Recebido pelo Prestador` | Quanto você pagou e quanto o prestador recebeu |
| `observacao` | Avisos do site (ex.: "lançamento não foi debitado") |

---

## Quer só testar antes? (um mês só)

Para baixar **apenas o mês mais recente** (todas as pessoas, mas só um mês), use:

```
python main.py --teste
```

Para escolher um mês específico, por exemplo setembro de 2026:

```
python main.py --ano 2026 --mes 9
```

---

## Quantos anos ele baixa?

Por padrão, os **2 anos mais recentes** (hoje: 2026 e 2025). Para mudar:

```
python main.py --anos 3       (os 3 anos mais recentes)
python main.py --todos        (todos os anos disponíveis, de 2022 até hoje)
```

---

## Rodar de novo outro dia

Repita só o **Passo 2** e o **Passo 3**. O programa **pula os arquivos que já existem**, então é
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
| "Estamos detectando comportamento malicioso" | É a proteção da Caixa. Espere alguns minutos e tente de novo. Se continuar, tente por outra rede de internet. |
| O login não termina / o programa não continua | Confira se você realmente entrou no site (deve aparecer o menu *Meus Dados*). O programa espera até 10 minutos; depois disso, rode de novo. |
| A pasta `extratos` ficou vazia | Rode de novo e leia as mensagens na janela preta. Se aparecer um erro em vermelho, mande uma foto dele para quem te passou o programa. |

---

## Perguntas rápidas

**Isso é seguro?** O programa só *lê* os extratos. Ele não altera nada na sua conta. O programa **não
sabe nem guarda sua senha**: quem digita é você, direto no site.

**Posso usar o computador enquanto roda?** Pode, mas **não feche nem mexa** na janela do navegador
que ele abriu.

**Onde ficam os arquivos?** Na pasta `extratos`, dentro da pasta do programa.
