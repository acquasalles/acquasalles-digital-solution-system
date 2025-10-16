# Correção das Quebras de Página - PDF Multi-página

## Problema Identificado

O PDF gerado estava com 5 páginas incorretas ao invés de 3 páginas corretas:
- **Esperado**: 3 páginas (Resumo + Volume + Tabela)
- **Obtido**: 5 páginas com quebras incorretas

## Causa Raiz

O CSS para quebras de página não estava sendo respeitado corretamente pelo Puppeteer devido a:
1. Falta de dimensões fixas (`height`) na classe `.report-page`
2. Ausência de `overflow: hidden` para evitar vazamento de conteúdo
3. CSS não estava utilizando reset adequado
4. Puppeteer precisava de tempo adicional para renderização

## Correções Aplicadas

### 1. Frontend - `src/lib/extractFirstPageHTML.ts`

**Mudanças no CSS**:

```css
/* Antes */
.report-page {
  width: 297mm;
  min-height: 210mm;  /* Problema: min-height permite crescimento */
  padding: 10mm;
  /* ... */
  page-break-after: always;
}

/* Depois */
.report-page {
  width: 297mm;
  height: 210mm;  /* Fixo: força dimensão exata A4 paisagem */
  padding: 10mm;
  /* ... */
  page-break-after: always;
  page-break-before: auto;
  page-break-inside: avoid;
  overflow: hidden;  /* Crítico: evita vazamento de conteúdo */
  display: block;
  position: relative;
}
```

**Adições importantes**:
- Reset CSS global (`* { margin: 0; padding: 0; box-sizing: border-box; }`)
- Dimensão fixa de altura (`height: 210mm` ao invés de `min-height`)
- `overflow: hidden` para garantir que conteúdo não vaze entre páginas
- `display: block` e `position: relative` para controle de layout
- Media query `@media print` com dimensões explícitas

### 2. Lambda Function - `lambda-report-enhanced.mjs`

**Mudanças**:

```javascript
// Antes
await page.setContent(html, { waitUntil: "networkidle0" });
const pdfBuffer = await page.pdf({
  format: "A4",
  landscape: true,
  printBackground: true,
  preferCSSPageSize: true,
  margin: { top: 0, right: 0, bottom: 0, left: 0 }
});

// Depois
await page.setContent(html, { waitUntil: "networkidle0" });
await page.waitForTimeout(500);  // Espera renderização completa
const pdfBuffer = await page.pdf({
  format: "A4",
  landscape: true,
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: false,  // Desabilita cabeçalho/rodapé automático
  margin: { top: 0, right: 0, bottom: 0, left: 0 }
});
```

**Adições**:
- `await page.waitForTimeout(500)` - Aguarda 500ms para renderização completa
- `displayHeaderFooter: false` - Evita cabeçalhos/rodapés automáticos do Puppeteer

## Como Implementar as Correções

### Passo 1: Atualizar o Frontend (Já feito automaticamente)

O código TypeScript já foi atualizado em:
- `/src/lib/extractFirstPageHTML.ts`

### Passo 2: Atualizar a Lambda Function

Substitua o conteúdo do arquivo `lambda-report.mjs` na AWS Lambda pelo conteúdo do arquivo:
- `lambda-report-enhanced.mjs` (localizado na raiz do projeto)

**Via AWS Console**:
1. Abra AWS Lambda Console
2. Selecione sua função Lambda
3. Na aba "Code", substitua todo o código por `lambda-report-enhanced.mjs`
4. Clique em "Deploy"

**Via AWS CLI**:
```bash
zip function.zip lambda-report-enhanced.mjs node_modules/
aws lambda update-function-code --function-name SUA_FUNCAO --zip-file fileb://function.zip
```

### Passo 3: Testar

1. Abra a aplicação
2. Navegue até o relatório
3. Clique em "Download PDF"
4. Verifique que o PDF tem exatamente 3 páginas:
   - Página 1: Resumo executivo
   - Página 2: Análise de volume (primeira página de volume)
   - Página 3: Análise de volume (segunda página) OU Tabela de dados

## Resultado Esperado

### Estrutura do PDF Corrigido:

**Página 1 - Resumo Executivo**
- Cabeçalho com título do relatório
- Informações do cliente (4 colunas)
- Resumo executivo (estatísticas)
- Não conformidades
- Rodapé

**Página 2 - Volume (se houver dados)**
- Cabeçalho "Relatório de Consumo de Volume"
- 4 pontos de coleta em grade 2x2
- Gráficos de barras para cada ponto
- Estatísticas de consumo
- Informações de outorga

**Página 3 - Volume continuação OU Tabela**
- Se houver mais pontos de volume: mostra próximos 4 pontos
- Se não: mostra tabela de dados detalhados

## Verificação de Sucesso

✅ PDF tem exatamente 3 páginas (ou 2 se não houver dados de volume)
✅ Cada página tem dimensões A4 paisagem (297mm x 210mm)
✅ Não há conteúdo cortado entre páginas
✅ Não há páginas em branco extras
✅ Todo o conteúdo está visível e bem formatado
✅ Quebras de página ocorrem nos locais corretos

## Troubleshooting

### Se ainda houver páginas extras:

1. **Verifique o CSS**: Confirme que `height: 210mm` está sendo usado (não `min-height`)
2. **Verifique overflow**: Confirme que `overflow: hidden` está presente
3. **Aumente o timeout**: Na Lambda, aumente `waitForTimeout(500)` para `waitForTimeout(1000)`
4. **Verifique o HTML**: Use `console.log(htmlContent)` no frontend para ver o HTML gerado

### Se conteúdo estiver cortado:

1. **Reduza o padding**: Altere `padding: 10mm` para `padding: 8mm` no CSS
2. **Reduza font-size**: Altere `font-size: 9px` para `font-size: 8px`
3. **Ajuste line-height**: Altere `line-height: 1.2` para `line-height: 1.1`

### Se tabelas não aparecerem:

1. Verifique se `reportData` existe e tem dados
2. Confirme que `totalPages` está calculado corretamente
3. Verifique logs do console no navegador

## Pontos Críticos

🔴 **CRÍTICO**: A altura DEVE ser fixa (`height: 210mm`), não `min-height`
🔴 **CRÍTICO**: O `overflow: hidden` é essencial para evitar vazamento
🔴 **CRÍTICO**: Lambda precisa do `waitForTimeout()` para renderização completa
🟡 **IMPORTANTE**: `preferCSSPageSize: true` deve estar habilitado
🟡 **IMPORTANTE**: Margins devem ser zero no PDF config

## Diferenças Chave Entre Versões

| Aspecto | Versão Antiga | Versão Corrigida |
|---------|---------------|------------------|
| Altura da página | `min-height: 210mm` | `height: 210mm` |
| Overflow | Não definido | `overflow: hidden` |
| Reset CSS | Básico | Completo com `*` |
| Lambda timeout | Nenhum | 500ms após setContent |
| Display header | Não especificado | `displayHeaderFooter: false` |
| Page breaks | Básico | Completo com before/after/inside |

## Contato para Suporte

Se as correções não funcionarem, forneça:
1. Número de páginas gerado vs. esperado
2. Screenshot do PDF problemático
3. Logs do console do navegador
4. Logs da função Lambda (CloudWatch)
5. Número de pontos de coleta e se há dados de tabela
