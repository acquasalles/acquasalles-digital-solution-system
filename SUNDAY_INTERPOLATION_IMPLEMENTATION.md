# Implementação de Interpolação de Volumes para Domingo

## 📋 Resumo da Implementação

Foi implementada uma solução para corrigir o problema de cálculo de volumes em domingos, redistribuindo adequadamente o volume acumulado de segunda-feira.

## 🎯 Problema Resolvido

### Situação Anterior
- **Domingo**: volume = 0 m³ (sem registro no banco)
- **Segunda-feira**: volume = 50 m³ (acumulado domingo + segunda)
- **Resultado no gráfico**: visualização distorcida do consumo real

### Situação Após Correção
- **Domingo**: volume = 25 m³ (interpolado)
- **Segunda-feira**: volume = 25 m³ (redistribuído)
- **Resultado no gráfico**: visualização realista do consumo

## 🔧 Arquivos Modificados

### `/src/hooks/useAdminData.ts`

**1. Nova Função Auxiliar** (linhas 10-58)
```typescript
function interpolateSundayVolumes(volumeData: number[], dateLabels: string[]): number[]
```

**Características:**
- Identifica dias de segunda-feira com volume > 0
- Verifica se o dia anterior é domingo com volume = 0
- Divide o volume de segunda-feira igualmente (50/50)
- Retorna array com volumes interpolados

**2. Integração no Fluxo Principal** (linhas 278-281)
```typescript
// Apply Sunday interpolation
typeData = interpolateSundayVolumes(typeData, allDates);
```

## 📊 Exemplo de Funcionamento

### Dados de Entrada (Banco de Dados)
```
Sexta    23/10: 23380 m³ (acumulado)
Sábado   24/10: 23400 m³ (acumulado) → diferença: 20 m³
Domingo  25/10: [sem registro]        → diferença: 0 m³
Segunda  26/10: 23450 m³ (acumulado) → diferença: 50 m³
Terça    27/10: 23475 m³ (acumulado) → diferença: 25 m³
```

### Processamento

**Passo 1: Cálculo de diferenças diárias**
```javascript
[0, 20, 0, 50, 25]
```

**Passo 2: Aplicação da interpolação**
```javascript
// Detecta: Segunda (índice 3) com volume 50 e Domingo anterior (índice 2) com volume 0
// Redistribui: 50 / 2 = 25 para cada dia

[0, 20, 25, 25, 25]  ← Domingo agora tem 25m³
```

### Resultado no Gráfico
```
Sexta:   0 m³   (primeiro dia, sem diferença)
Sábado:  20 m³  ✓
Domingo: 25 m³  ✓ (interpolado)
Segunda: 25 m³  ✓ (redistribuído)
Terça:   25 m³  ✓
```

## 🧪 Como Testar

### 1. Teste Visual no Gráfico
1. Acesse a página de Admin
2. Selecione um cliente com dados históricos
3. Configure período que inclua domingo e segunda-feira
4. Verifique no gráfico que:
   - Domingo não aparece mais com 0 m³
   - Segunda-feira não mostra mais volume dobrado
   - Os volumes estão distribuídos proporcionalmente

### 2. Teste via Console do Navegador
Abra o console do navegador e observe os logs:
```
Daily differences calculated (before interpolation): [0, 20, 0, 50, 25]
Interpolated Sunday 25/10/2024: 25m³ (from Monday 26/10/2024: 50m³)
Daily differences calculated (after Sunday interpolation): [0, 20, 25, 25, 25]
```

### 3. Verificação de Dados
```javascript
// No console do navegador, após carregar o gráfico:
console.log('Collection Points Data:', collectionPointsData);
```

## 🔍 Algoritmo Detalhado

```typescript
Para cada dia no período:
  1. Verificar se é segunda-feira (dayOfWeek === 1)
  2. Verificar se tem volume > 0
  3. Verificar se dia anterior é domingo (dayOfWeek === 0)
  4. Verificar se domingo tem volume = 0
  5. Se todas as condições forem verdadeiras:
     a. Obter volume de segunda-feira
     b. Calcular: volume_redistribuído = volume_segunda / 2
     c. Atribuir volume_redistribuído ao domingo
     d. Atribuir volume_redistribuído à segunda
     e. Registrar no console para auditoria
```

## ⚙️ Configuração e Parâmetros

### Método de Redistribuição
- **Atual**: Divisão igualitária (50/50)
- **Justificativa**: Aproximação razoável assumindo consumo constante
- **Possível melhoria futura**: Usar médias históricas para pesos proporcionais

### Considerações de Performance
- Complexidade: O(n) onde n = número de dias no período
- Overhead: Mínimo, apenas um loop adicional
- Impacto: Imperceptível mesmo para grandes volumes de dados

## 📝 Validações Implementadas

✅ Verifica dia da semana corretamente (domingo = 0, segunda = 1)
✅ Valida que segunda-feira tem volume > 0
✅ Valida que domingo tem volume = 0
✅ Mantém precisão numérica com 2 casas decimais
✅ Preserva dados originais (cria cópia do array)
✅ Log detalhado para auditoria

## 🚀 Próximos Passos (Opcional)

### Melhorias Possíveis
1. **Redistribuição baseada em histórico**
   - Analisar padrão de consumo domingo vs. segunda
   - Aplicar pesos proporcionais baseados em dados históricos

2. **Configuração por cliente**
   - Permitir que cada cliente configure o método de redistribuição
   - Opções: 50/50, baseado em histórico, percentual customizado

3. **Alertas e validações**
   - Alertar quando redistribuição resulta em anomalias
   - Validar consistência dos dados interpolados

## 📊 Impacto nos Relatórios

### Gráficos
- ✅ Visualização mais realista do consumo
- ✅ Elimina picos artificiais em segundas-feiras
- ✅ Domingos agora mostram consumo estimado

### Estatísticas
- ✅ Total de volume permanece inalterado
- ✅ Média diária mais precisa
- ✅ Identificação de padrões de consumo melhorada

### Análise de Outorga
- ✅ Comparação com limites mais precisa
- ✅ Projeções de consumo mais confiáveis

## 🔒 Segurança e Integridade

- ✅ Não modifica dados no banco de dados
- ✅ Interpolação ocorre apenas no frontend
- ✅ Dados originais preservados para auditoria
- ✅ Logs detalhados de todas as interpolações

## 📞 Suporte e Manutenção

### Localização do Código
- **Arquivo**: `/src/hooks/useAdminData.ts`
- **Função auxiliar**: `interpolateSundayVolumes` (linhas 10-58)
- **Integração**: linha 279

### Debug
Para desabilitar temporariamente a interpolação (para teste):
```typescript
// Comentar a linha 279:
// typeData = interpolateSundayVolumes(typeData, allDates);
```

## ✅ Status

- [x] Função auxiliar implementada
- [x] Integração com fluxo principal
- [x] Validação TypeScript
- [x] Logs de debug adicionados
- [x] Documentação completa
- [x] Pronto para testes em produção

---

**Data de Implementação**: 22/10/2025
**Desenvolvedor**: Claude Code Assistant
**Versão**: 1.0.0
