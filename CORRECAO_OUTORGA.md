# Correção do Cadastro de Pontos de Coleta com Outorga

## Problema Identificado

Ao cadastrar um ponto de coleta com medição do tipo "Registro (m3)", ocorria o erro:
```
Could not find the 'outorga_horimetro_max_unit' column of 'ponto_de_coleta' in the schema cache
```

## Causa do Erro

O código estava tentando salvar dados em colunas individuais que não existem:
- `outorga_volume_max_value`
- `outorga_volume_max_unit`
- `outorga_horimetro_max_value`
- `outorga_horimetro_max_unit`

No entanto, o banco de dados possui uma coluna `outorga` do tipo JSONB.

## Solução Implementada

### 1. Atualização da Interface TypeScript

Modificado o arquivo `src/components/PontoDeColetaFormModal.tsx`:

```typescript
interface OutorgaConfig {
  volumeMax?: {
    value: number;
    unit: string;
  };
  horimetroMax?: {
    value: number;
    unit: string;
  };
}

interface PontoDeColeta {
  id: string;
  nome: string;
  descricao?: string;
  localizacao?: any;
  tipos_medicao?: string[];
  outorga?: OutorgaConfig;  // ← Agora usa a estrutura JSON correta
}
```

### 2. Atualização do Carregamento de Dados

Ao editar um ponto de coleta, o código agora lê os dados do JSON:

```typescript
if (pontoData.outorga) {
  setOutorgaVolumeValue(pontoData.outorga.volumeMax?.value?.toString() || '');
  setOutorgaVolumeUnit(pontoData.outorga.volumeMax?.unit || 'm³');
  setOutorgaHorimetroValue(pontoData.outorga.horimetroMax?.value?.toString() || '');
  setOutorgaHorimetroUnit(pontoData.outorga.horimetroMax?.unit || 'horas');
}
```

### 3. Atualização do Salvamento de Dados

Ao salvar um ponto de coleta, o código agora cria o objeto JSON corretamente:

```typescript
// Construir objeto outorga no formato JSON
const outorgaConfig: any = {};

if (outorgaVolumeValue) {
  outorgaConfig.volumeMax = {
    value: parseFloat(outorgaVolumeValue),
    unit: outorgaVolumeUnit
  };
} else {
  outorgaConfig.volumeMax = {};
}

if (outorgaHorimetroValue) {
  outorgaConfig.horimetroMax = {
    value: parseFloat(outorgaHorimetroValue),
    unit: outorgaHorimetroUnit
  };
} else {
  outorgaConfig.horimetroMax = {};
}

let dataToSave: any = {
  nome: nome.trim(),
  descricao: descricao.trim() || null,
  tipos_medicao: selectedTiposMedicao,
  area_de_trabalho_id: areaId,
  cliente_id: parseInt(clienteId),
  outorga: outorgaConfig,  // ← Salva como JSON
};
```

## Formato JSON Esperado

Quando você cadastra um ponto com:
- Limite Máximo de Volume Diário: 20 m³
- Limite Máximo de Horímetro Diário: (vazio)

O JSON salvo será:
```json
{
  "volumeMax": {
    "value": 20,
    "unit": "m³"
  },
  "horimetroMax": {}
}
```

## Status

✅ **Correção Completa**

O código agora está correto e funcionando. Você pode:
1. Cadastrar novos pontos de coleta com medição "Registro (m3)"
2. Definir limites de volume e/ou horímetro
3. Editar pontos existentes
4. Os dados serão salvos corretamente na coluna `outorga` em formato JSON

## Arquivos Modificados

- `src/components/PontoDeColetaFormModal.tsx` - Formulário de cadastro/edição de pontos de coleta

## Observações

- Os outros arquivos do sistema já estavam usando a estrutura JSON correta
- Não é necessário executar nenhuma migração de banco de dados
- A coluna `outorga` já existe no banco e continuará funcionando normalmente
