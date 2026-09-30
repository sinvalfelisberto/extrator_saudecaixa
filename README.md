# 📄 Extrator de Extratos do Saúde CAIXA

Esta é uma ferramenta de **uso particular**: ela serve para que **cada beneficiário baixe os seus
próprios extratos** do Saúde CAIXA, para **guardar e usar como quiser** (conferir gastos, organizar
documentos, declarar imposto de renda, fazer planilhas...).

Ela **baixa os extratos** do site: de **cada beneficiário** da sua conta, de **cada mês**, dos
**2 anos mais recentes** (dá para mudar, veja mais abaixo). Cada extrato vira um arquivo que abre
no Excel.

Você faz o login no site com os **seus** dados (o programa **não** sabe a sua senha) e ele faz todo o
resto, sozinho. Os arquivos ficam **só no seu computador**.

🔗 **Site do Saúde CAIXA:** [https://atendimentosaude.caixa.gov.br/](https://atendimentosaude.caixa.gov.br/)

Você não precisa saber programar. É só seguir os passos abaixo, **um de cada vez**. 🙂

---

## O que você precisa ter

1. Um computador com internet.
2. O **Google Chrome** instalado. ([baixar aqui](https://www.google.com/chrome/))
3. O **Python** instalado (o Passo 1 ensina).
4. Seu **CPF** e sua **senha** de acesso ao [site do Saúde CAIXA](https://atendimentosaude.caixa.gov.br/). Você digita direto no site; o programa **não guarda** nada.

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

O que vai acontecer agora:

1. **Na primeira vez**, o programa vai **instalar coisas sozinho**. Aparecem muitas letrinhas e
   barras de progresso. Isso é normal e pode levar alguns minutos. **Espere.**
2. Uma janela do **navegador** (Chrome) vai abrir sozinha, já na página de entrada do **Saúde CAIXA**.
3. Na janela preta vai aparecer um aviso assim:

   ```
   >>> 1) Faça o login na janela do navegador que abriu.
   >>> 2) Depois, abra a página do Extrato Financeiro (Meus Dados > Financeiro > Extrato).
   ```

   O programa agora está **esperando por você**. Ele só começa a trabalhar depois do Passo 4.

---

## Passo 4 — Entrar no site e abrir o Extrato Financeiro 🔑 (é você quem faz)

Faça isto **na janela do navegador** que o programa abriu (não precisa abrir outro navegador).
Se a janela não estiver na página do site, cole este endereço na barra de cima dela:

👉 **https://atendimentosaude.caixa.gov.br/** ([abrir o site](https://atendimentosaude.caixa.gov.br/))

Depois:

1. **Faça o login no site do Saúde CAIXA**: digite seu **CPF**, clique em *Próximo*, digite sua
   **senha** e entre. Se o site pedir algo a mais (código por SMS, a caixinha "não sou um robô"),
   faça normalmente.
2. Com o login feito, no menu lá em cima, clique em **Meus Dados**.
3. Depois clique em **Financeiro**.
4. Depois clique em **Extrato Financeiro**.
5. Espere a página carregar até aparecer, **do lado esquerdo**, a lista de meses
   (*Setembro, Agosto, Julho...*) com os valores.

> 💡 **Atalho (opcional):** em vez de clicar nos menus, você pode colar este endereço na barra da janela
> do programa depois de fazer o login. Ele costuma levar direto ao Extrato Financeiro:
> `https://atendimentosaude.caixa.gov.br/#/meus-dados/financeiro/extrato/reeembolso`

✅ **Pronto!** Assim que essa lista de meses aparecer, o programa **percebe sozinho** e **começa a
extração**. Você não precisa apertar nenhum botão nem voltar na janela preta.

> ⏱️ O programa espera até **10 minutos** por você. Se passar disso, ele avisa e fecha: é só rodar o
> Passo 3 de novo.
>
> 🔒 Sua senha **só é digitada no site**. O programa não sabe nem guarda a senha.

---

## Passo 5 — Acompanhar a extração ⏳

A partir daqui o programa trabalha sozinho: vai trocando de **ano**, de **mês** e de **pessoa**.

- **Não feche e não mexa na janela do navegador.** Se você clicar em algo lá, pode atrapalhar.
- Na janela preta vão aparecer linhas como:

  ```
  Extraindo os 2 ano(s) mais recente(s): 2026, 2025
  SINVAL_AMARAL_FELISBERTO_2026_09.csv: 27 linha(s)
  ```

  Cada linha com `.csv` é **um extrato salvo**. ✅
- Quando terminar, aparece **`Concluído.`** e o navegador fecha sozinho.

⏳ Pode demorar bastante (são muitos meses e pessoas). Deixe o computador ligado e não feche nenhuma janela.

---

## Passo 6 — Pegar seus extratos 🎉

Abra a pasta **`extratos`** (dentro de `extrator_saudecaixa`). Lá estão todos os arquivos, com o nome
no formato:

```
NOME_ANO_MES.csv
```

Exemplo: `SINVAL_AMARAL_FELISBERTO_2026_09.csv` é o extrato de **setembro de 2026** do Sinval.
(O mês aparece com dois números: `01` = janeiro, `09` = setembro, `12` = dezembro.)

Dê dois cliques em qualquer arquivo para abrir no **Excel**.

### O que tem dentro de cada arquivo

Cada linha é **um procedimento** (um exame, uma consulta, uma sessão...). Se um atendimento teve
vários procedimentos, cada um ganha a sua própria linha, repetindo as informações do atendimento.

| Coluna | O que é |
|---|---|
| `beneficiario`, `ano`, `mes` | De quem é e de qual mês |
| `mensalidade`, `coparticipacao_mes`, `total_mes` | Os valores do mês |
| `prestador`, `cnpj` | Onde foi o atendimento (clínica, hospital, laboratório…) |
| `data_atendimento`, `valor_lancamento` | Dia do atendimento e a coparticipação total dele |
| `evento_data`, `evento_descricao` | Quando foi e o que foi feito (ex.: "Creatinina - pesquisa e/ou dosagem") |
| `evento_coparticipacao` | Quanto foi cobrado de coparticipação nesse procedimento |
| `Recebido pelo Prestador` | Quanto o prestador recebeu por esse procedimento |

Exemplo de uma linha (só as últimas colunas):

| evento_data | evento_descricao | evento_coparticipacao | Recebido pelo Prestador |
|---|---|---|---|
| 04 jul. 2026 | Creatinina - pesquisa e/ou dosagem | R$ 0,00 | R$ 6,58 |

---

## Opções (só se você quiser mudar o padrão)

Por padrão, `python main.py` baixa os **2 anos mais recentes**, todos os meses e todas as pessoas.
Para mudar, acrescente uma destas opções depois de `python main.py`:

| Quero... | Comando |
|---|---|
| Só **testar**, baixando apenas o **mês mais recente** | `python main.py --teste` |
| Um **mês específico** (ex.: setembro de 2026) | `python main.py --ano 2026 --mes 9` |
| Um **ano inteiro** (ex.: 2025) | `python main.py --ano 2025` |
| Os **3 anos** mais recentes | `python main.py --anos 3` |
| **Todos** os anos disponíveis (2022 até hoje) | `python main.py --todos` |
| **Baixar de novo**, sobrescrevendo arquivos que já existem | `python main.py --refazer` |

Dá para juntar opções. Exemplo: `python main.py --teste --refazer`.

**Quer mudar o padrão de vez?** Abra o arquivo **`.env`** (na pasta do programa) com o Bloco de Notas e
troque o número em `ULTIMOS_ANOS=2`. Esse arquivo é opcional: sem ele, o programa usa 2 anos.
(Se ele não existir, copie o `.env.example` e renomeie a cópia para `.env`.)
**Não coloque CPF nem senha nele**: o login é sempre feito por você, no site.

---

## Rodar de novo outro dia

Repita do **Passo 2** ao **Passo 4** (abrir o terminal, rodar, entrar no site e abrir o Extrato Financeiro). O Passo 5 é só acompanhar.

O programa **pula os arquivos que já existem**, então a segunda vez é bem mais rápida. Por isso, se um
mês ainda estava em andamento quando você baixou (e o site depois atualizou os valores), use
`--refazer` para baixar de novo e pegar os dados novos.

Se a execução for interrompida no meio (acabou a internet, fechou sem querer…), é só rodar de novo:
ele continua de onde parou.

---

## Deu problema? 🆘

| O que apareceu | O que fazer |
|---|---|
| `'python' não é reconhecido...` | O Python não foi instalado direito. Refaça o **Passo 1** e lembre de marcar **Add python.exe to PATH**. |
| "Estamos detectando comportamento malicioso" | É a proteção da Caixa. Espere alguns minutos e tente de novo. Se continuar, tente por outra rede de internet. |
| O programa não começa depois do login | Só o login não basta: você precisa **abrir o Extrato Financeiro** (**Meus Dados → Financeiro → Extrato Financeiro**) e esperar aparecer a lista de meses à esquerda. O programa espera até 10 minutos; depois disso, rode de novo. |
| `Tempo esgotado esperando o login/página do extrato` | Passaram-se 10 minutos sem o extrato abrir. Rode de novo e faça o login mais rápido. |
| `Ano 20XX indisponível` | Você pediu um ano que não existe no site. A mensagem mostra quais existem. |
| A pasta `extratos` ficou vazia | Rode de novo e leia as mensagens na janela preta. Se aparecer um erro, mande uma foto dele para quem te passou o programa. |
| Os arquivos não mudaram mesmo rodando de novo | O programa pula o que já existe. Use `python main.py --refazer`. |

---

## Perguntas rápidas

**Isso é seguro?** O programa só *lê* os extratos. Ele não altera nada na sua conta. Ele **não sabe
nem guarda sua senha**: quem digita é você, direto no site.

**Posso usar o computador enquanto roda?** Pode, mas **não feche nem mexa** na janela do navegador
que ele abriu.

**Onde ficam os arquivos?** Na pasta `extratos`, dentro da pasta do programa.

**Por que o Excel mostra tudo numa coluna só?** Os arquivos usam **ponto e vírgula (`;`)** para separar as
colunas, que é o padrão do Excel em português. Se abrir tudo junto, use *Dados → Texto para Colunas*
e escolha o ponto e vírgula.

---

## Uso e licença

- **Uso particular:** use esta ferramenta apenas com a **sua própria conta** e para acessar os **seus
  próprios dados** (e os de quem é beneficiário na sua conta). Não use para acessar contas de terceiros.
- **Sem vínculo com a Caixa:** este é um projeto independente. **Não é um produto oficial** da Caixa
  Econômica Federal nem tem ligação com ela. Se o site mudar, a ferramenta pode parar de funcionar.
- **Seus dados, sua responsabilidade:** os extratos têm informações pessoais e de saúde. Guarde os
  arquivos com cuidado e **não compartilhe** a pasta `extratos`.
- **Licença MIT:** o código é livre. Você pode usar, copiar, modificar e compartilhar, inclusive para
  outras pessoas da família, desde que mantenha o aviso de direitos autorais. O programa é oferecido
  **"como está"**, sem garantias. O texto completo está no arquivo [LICENSE](LICENSE).
