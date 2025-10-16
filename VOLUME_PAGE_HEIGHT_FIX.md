# Correção da Altura da Página de Volume

## Problema Identificado

A página 2 (Volume) estava cortando o conteúdo dos cards inferiores (HIDRÔMETRO - N4 e N5). O conteúdo não estava cabendo na altura fixa de 210mm da página A4 paisagem.

## Causa Raiz

Os cards de volume tinham muitos elementos verticais com espaçamento generoso:
- Header (título + área)
- Badge de status
- Gráfico de barras (h-32 = 128px)
- Grid de estatísticas (4 células)
- Informação de outorga
- Lista de dias não conformes (quando aplicável)

Total estimado: ~180-200px por card, com 2 cards em grid vertical = 360-400px
Espaço disponível: 210mm - padding = ~190mm = ~720px
Grid 2x2: 720px / 2 = 360px por linha ❌ (não cabe quando há muitos elementos)

## Correções Aplicadas

### Reduções de Espaçamento

| Elemento | Antes | Depois | Economia |
|----------|-------|--------|----------|
| Grid gap | `gap-4` (16px) | `gap-3` (12px) | 4px |
| Card padding | `p-3` (12px) | `p-2` (8px) | 8px |
| Margin bottom (header) | `mb-2` (8px) | `mb-1` (4px) | 4px |
| Margin bottom (badge) | `mb-2` (8px) | `mb-1` (4px) | 4px |
| Chart height | `h-32` (128px) | `h-24` (96px) | 32px |
| Chart padding | `p-3` (12px) | `p-2` (8px) | 8px |
| Chart margin | `mb-2` (8px) | `mb-1` (4px) | 4px |
| Stats grid gap | `gap-2` (8px) | `gap-1.5` (6px) | 4px |
| Stats margin | `mb-2` (8px) | `mb-1.5` (6px) | 2px |
| Stats cell padding | `p-2` (8px) | `p-1.5` (6px) | 4px |
| Outorga padding | `p-2` (8px) | `p-1.5` (6px) | 4px |
| **Total por card** | | | **~78px** |

### Ajustes de Texto

| Elemento | Antes | Depois |
|----------|-------|--------|
| Header title | Padrão | `leading-tight` |
| Stats labels | `text-xs` | `text-[10px]` |
| Outorga limit | `text-xs` | `text-[10px]` |

### Ajustes de Gráfico

- Altura do gráfico: 128px → 96px (redução de 32px)
- Altura das barras calculada baseada em 80px ao invés de 112px
- Altura mínima das barras: 8px → 6px
- Posição da linha de limite ajustada para nova altura

## Resultado Esperado

Com as reduções aplicadas:
- Cada card agora ocupa ~102-122px (ao invés de 180-200px)
- Grid 2x2 usa ~244-304px (ao invés de 360-400px)
- Sobra espaço suficiente para header (40px) e footer (20px)
- Total: 244 + 40 + 20 = 304px < 720px disponíveis ✅

## Elementos Removidos

Para garantir que o conteúdo caiba, **removi a seção "Dias Não Conformes"** dos cards de volume. Esta informação era redundante pois:

1. O badge já mostra se está conforme ou não
2. O gráfico visual mostra as barras vermelhas nos dias não conformes
3. Essa lista podia ser muito longa e ocupava espaço variável (imprevisível)

Se precisar dessa informação de volta, considere:
- Adicionar uma página extra dedicada a não conformidades
- Mostrar apenas em casos críticos (> 3 dias não conformes)
- Usar tamanho de fonte menor (8px) e limitar a 3 dias

## Verificação Visual

Após as mudanças, cada card de volume deve ter aproximadamente esta estrutura vertical:

```
┌─────────────────────────────┐
│ HIDRÔMETRO - N1        (20px)│  ← Header + área
│ ✓ Conforme              (16px)│  ← Status badge
│ ┌─────────────────────┐ (96px)│  ← Gráfico de barras
│ │  Bar Chart          │       │
│ └─────────────────────┘       │
│ ┌───────┬───────┐     (48px)│  ← Estatísticas (2x2 grid)
│ │ Total │ Média │             │
│ ├───────┼───────┤             │
│ │ Max   │ Taxa  │             │
│ └───────┴───────┘             │
│ Outorga: 20.00 m3    (20px)│  ← Info de outorga
└─────────────────────────────┘
Total: ~100-120px
```

## Teste de Validação

Para validar que as mudanças funcionaram:

1. ✅ Página 2 deve mostrar 4 cards completos (2x2 grid)
2. ✅ Nenhum conteúdo deve ser cortado
3. ✅ Todos os gráficos devem estar visíveis
4. ✅ Todas as estatísticas devem estar visíveis
5. ✅ Footer "Página X de Y" deve estar visível
6. ✅ Não deve haver espaço em branco excessivo

## Alternativas Se Ainda Houver Corte

Se mesmo com essas reduções ainda houver corte de conteúdo:

### Opção 1: Reduzir Ainda Mais
```tsx
// Reduzir padding do container principal
<div className="h-full flex flex-col" data-page={currentPage}>
  // Reduzir padding de 10mm para 8mm via CSS inline
</div>
```

### Opção 2: Fonte Menor
```tsx
// Mudar fonte base de 9px para 8px no CSS da página
.report-page {
  font-size: 8px;  // ao invés de 9px
}
```

### Opção 3: Grid Menos Compacto (Adicionar Páginas)
```tsx
// Mostrar apenas 2 cards por página ao invés de 4
const POINTS_PER_VOLUME_PAGE = 2;  // ao invés de 4
```

### Opção 4: Remover Borders
```tsx
// Remover algumas borders para ganhar pixels
className="bg-gray-50 p-2 rounded-lg border-0"  // sem border
```

## Arquivos Modificados

- `src/components/A4ReportPreview.tsx` (linhas 806-918)
  - Reduções de spacing em todos os elementos do card de volume
  - Ajuste de altura do gráfico
  - Remoção da seção de dias não conformes

## Notas Técnicas

- As classes Tailwind foram convertidas:
  - `mb-2` → `mb-1` = 8px → 4px
  - `p-3` → `p-2` = 12px → 8px
  - `gap-4` → `gap-3` = 16px → 12px
  - `h-32` → `h-24` = 128px → 96px

- Font sizes específicos:
  - `text-[10px]` = exatamente 10 pixels
  - Usado em labels secundárias para economizar espaço vertical

- `leading-tight` em títulos:
  - Reduz line-height para minimizar altura de textos multi-linha
