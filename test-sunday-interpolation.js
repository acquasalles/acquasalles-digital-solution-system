/**
 * Teste Unitário - Interpolação de Volumes para Domingo
 *
 * Este arquivo contém testes para validar a função interpolateSundayVolumes
 */

/**
 * Implementação da função para teste isolado
 */
function interpolateSundayVolumes(volumeData, dateLabels) {
  const interpolatedData = [...volumeData];

  for (let i = 0; i < dateLabels.length; i++) {
    const date = dateLabels[i];
    const [day, month, year] = date.split('/').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();

    // Check if current day is Monday (1) and has volume > 0
    if (dayOfWeek === 1 && interpolatedData[i] > 0) {
      // Check if previous day is Sunday (0) with volume = 0
      if (i > 0) {
        const prevDate = dateLabels[i - 1];
        const [prevDay, prevMonth, prevYear] = prevDate.split('/').map(Number);
        const prevDateObj = new Date(prevYear, prevMonth - 1, prevDay);
        const prevDayOfWeek = prevDateObj.getDay();

        if (prevDayOfWeek === 0 && interpolatedData[i - 1] === 0) {
          // Split Monday's volume equally between Sunday and Monday
          const mondayVolume = interpolatedData[i];
          const redistributedVolume = Number((mondayVolume / 2).toFixed(2));

          interpolatedData[i - 1] = redistributedVolume; // Sunday
          interpolatedData[i] = redistributedVolume;     // Monday

          console.log(`✓ Interpolated Sunday ${prevDate}: ${redistributedVolume}m³ (from Monday ${date}: ${mondayVolume}m³)`);
        }
      }
    }
  }

  return interpolatedData;
}

/**
 * Função auxiliar para formatar resultados
 */
function formatTestResult(testName, input, expected, actual) {
  const passed = JSON.stringify(expected) === JSON.stringify(actual);
  const symbol = passed ? '✅' : '❌';

  console.log(`\n${symbol} ${testName}`);
  console.log(`   Input:    [${input.join(', ')}]`);
  console.log(`   Expected: [${expected.join(', ')}]`);
  console.log(`   Actual:   [${actual.join(', ')}]`);

  return passed;
}

/**
 * Teste 1: Caso básico - Domingo com 0 seguido de Segunda com volume
 */
function test1_BasicCase() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('TESTE 1: Caso Básico - Domingo → Segunda-feira');
  console.log('═══════════════════════════════════════════════════════');

  const dates = [
    '22/10/2024', // Terça
    '23/10/2024', // Quarta
    '24/10/2024', // Quinta
    '25/10/2024', // Sexta
    '26/10/2024', // Sábado
    '27/10/2024', // Domingo
    '28/10/2024', // Segunda
  ];

  const volumeData = [0, 20, 18, 22, 20, 0, 50]; // Domingo = 0, Segunda = 50
  const expected = [0, 20, 18, 22, 20, 25, 25];  // Redistribuído

  const result = interpolateSundayVolumes(volumeData, dates);

  return formatTestResult(
    'Redistribuição 50/50 entre Domingo e Segunda',
    volumeData,
    expected,
    result
  );
}

/**
 * Teste 2: Múltiplos domingos no período
 */
function test2_MultipleSundays() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('TESTE 2: Múltiplos Domingos');
  console.log('═══════════════════════════════════════════════════════');

  const dates = [
    '20/10/2024', // Domingo
    '21/10/2024', // Segunda
    '22/10/2024', // Terça
    '23/10/2024', // Quarta
    '24/10/2024', // Quinta
    '25/10/2024', // Sexta
    '26/10/2024', // Sábado
    '27/10/2024', // Domingo
    '28/10/2024', // Segunda
  ];

  const volumeData = [0, 60, 20, 18, 22, 20, 15, 0, 48];
  const expected = [30, 30, 20, 18, 22, 20, 15, 24, 24];

  const result = interpolateSundayVolumes(volumeData, dates);

  return formatTestResult(
    'Dois domingos redistribuídos corretamente',
    volumeData,
    expected,
    result
  );
}

/**
 * Teste 3: Domingo com volume (não deve alterar)
 */
function test3_SundayWithVolume() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('TESTE 3: Domingo com Volume Existente');
  console.log('═══════════════════════════════════════════════════════');

  const dates = [
    '26/10/2024', // Sábado
    '27/10/2024', // Domingo (com volume)
    '28/10/2024', // Segunda
  ];

  const volumeData = [20, 25, 30]; // Domingo já tem volume
  const expected = [20, 25, 30];   // Não deve alterar

  const result = interpolateSundayVolumes(volumeData, dates);

  return formatTestResult(
    'Não deve alterar quando domingo já tem volume',
    volumeData,
    expected,
    result
  );
}

/**
 * Teste 4: Segunda-feira com volume 0 (não deve alterar)
 */
function test4_MondayWithZeroVolume() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('TESTE 4: Segunda-feira com Volume Zero');
  console.log('═══════════════════════════════════════════════════════');

  const dates = [
    '26/10/2024', // Sábado
    '27/10/2024', // Domingo
    '28/10/2024', // Segunda (sem volume)
  ];

  const volumeData = [20, 0, 0]; // Segunda também sem volume
  const expected = [20, 0, 0];   // Não deve alterar

  const result = interpolateSundayVolumes(volumeData, dates);

  return formatTestResult(
    'Não deve alterar quando segunda tem volume zero',
    volumeData,
    expected,
    result
  );
}

/**
 * Teste 5: Exemplo real fornecido pelo usuário
 */
function test5_RealWorldExample() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('TESTE 5: Exemplo Real - Dados do Usuário');
  console.log('═══════════════════════════════════════════════════════');

  console.log('\nDados no Banco:');
  console.log('  Quinta 24/10: 23380 m³ (acumulado)');
  console.log('  Sexta  25/10: 23400 m³ (acumulado) → diferença: 20 m³');
  console.log('  Sábado 26/10: [sem registro]       → diferença: 0 m³ (ou mantém valor)');
  console.log('  Domingo 27/10: [sem registro]      → diferença: 0 m³');
  console.log('  Segunda 28/10: 23450 m³ (acumulado) → diferença: 50 m³');
  console.log('  Terça   29/10: 23475 m³ (acumulado) → diferença: 25 m³');

  const dates = [
    '24/10/2024', // Quinta (primeiro dia, diferença = 0)
    '25/10/2024', // Sexta
    '26/10/2024', // Sábado
    '27/10/2024', // Domingo
    '28/10/2024', // Segunda
    '29/10/2024', // Terça
  ];

  const volumeData = [0, 20, 20, 0, 50, 25];   // Diferenças diárias antes da interpolação
  const expected = [0, 20, 20, 25, 25, 25];    // Domingo e Segunda redistribuídos

  const result = interpolateSundayVolumes(volumeData, dates);

  console.log('\nResultado Final no Gráfico:');
  dates.forEach((date, i) => {
    const [day, month] = date.split('/');
    const dateObj = new Date(2024, parseInt(month) - 1, parseInt(day));
    const dayName = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][dateObj.getDay()];
    console.log(`  ${dayName} ${day}/${month}: ${result[i]} m³`);
  });

  return formatTestResult(
    'Exemplo real do usuário',
    volumeData,
    expected,
    result
  );
}

/**
 * Teste 6: Precisão numérica com valores decimais
 */
function test6_DecimalPrecision() {
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('TESTE 6: Precisão Numérica (Valores Decimais)');
  console.log('═══════════════════════════════════════════════════════');

  const dates = [
    '26/10/2024', // Sábado
    '27/10/2024', // Domingo
    '28/10/2024', // Segunda
  ];

  const volumeData = [20.5, 0, 47.37]; // Volume ímpar que não divide igualmente

  // A função arredonda: 47.37 / 2 = 23.685 → 23.68 (toFixed(2) arredonda para baixo)
  const expected = [20.5, 23.68, 23.68];

  const result = interpolateSundayVolumes(volumeData, dates);

  return formatTestResult(
    'Arredondamento correto para 2 casas decimais',
    volumeData,
    expected,
    result
  );
}

/**
 * Executar todos os testes
 */
function runAllTests() {
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║   TESTES DE INTERPOLAÇÃO DE VOLUMES PARA DOMINGO     ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  const results = [
    test1_BasicCase(),
    test2_MultipleSundays(),
    test3_SundayWithVolume(),
    test4_MondayWithZeroVolume(),
    test5_RealWorldExample(),
    test6_DecimalPrecision()
  ];

  const passed = results.filter(r => r).length;
  const total = results.length;

  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log(`║                  RESULTADO FINAL                      ║`);
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log(`\nTestes Passados: ${passed}/${total}`);

  if (passed === total) {
    console.log('✅ TODOS OS TESTES PASSARAM!\n');
  } else {
    console.log(`❌ ${total - passed} teste(s) falharam\n`);
  }
}

// Executar os testes
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { interpolateSundayVolumes, runAllTests };
} else {
  runAllTests();
}
