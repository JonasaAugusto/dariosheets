import { paraCentavos, centavosParaTela, mascaraDinheiro, paraTela, paraPlanilha } from './src/lib/planilha.js';

console.log("=== TESTE: paraCentavos ===\n");

// Números problemáticos com ponto flutuante
console.log("1. Ponto flutuante:");
console.log("0.07 * 100 =", 0.07 * 100, "(esperado 7)");
console.log("paraCentavos(0.07) =", paraCentavos(0.07), "(esperado 7)");
console.log("paraCentavos(1.005) =", paraCentavos(1.005), "(esperado 101 ou 100?)");
console.log("paraCentavos(8.115) =", paraCentavos(8.115), "(esperado 812 ou 811?)");

// Strings com vírgula (pt-BR)
console.log("\n2. Strings pt-BR:");
console.log("paraCentavos('1.234,56') =", paraCentavos('1.234,56'), "(esperado 123456)");
console.log("paraCentavos('2,50') =", paraCentavos('2,50'), "(esperado 250)");
console.log("paraCentavos('1,005') =", paraCentavos('1,005'), "(esperado 1005)");

// Strings com ponto (en-US)
console.log("\n3. Strings en-US:");
console.log("paraCentavos('1234.56') =", paraCentavos('1234.56'), "(esperado 123456)");
console.log("paraCentavos('2.5') =", paraCentavos('2.5'), "(esperado 250 ou 25?)");
console.log("paraCentavos('2.50') =", paraCentavos('2.50'), "(esperado 250)");

// Sem vírgula e sem ponto
console.log("\n4. Sem formatação:");
console.log("paraCentavos('250') =", paraCentavos('250'), "(esperado 250)");
console.log("paraCentavos('2500') =", paraCentavos('2500'), "(esperado 2500)");

// Valores negativos
console.log("\n5. Negativos:");
console.log("paraCentavos('-250') =", paraCentavos('-250'), "(esperado -250?)");
console.log("paraCentavos('-2.50') =", paraCentavos('-2.50'), "(esperado -250?)");

// Muito grande
console.log("\n6. Muito grande:");
console.log("paraCentavos('1000000000000') =", paraCentavos('1000000000000'), "(1 trilhão centavos)");
console.log("paraCentavos('1e10') =", paraCentavos('1e10'));

// Com símbolo R$
console.log("\n7. Com R$:");
console.log("paraCentavos('R$ 2.500') =", paraCentavos('R$ 2.500'));
console.log("paraCentavos('R$ 2,50') =", paraCentavos('R$ 2,50'), "(esperado 250)");

// Inválidos
console.log("\n8. Inválidos:");
console.log("paraCentavos('abc') =", paraCentavos('abc'));
console.log("paraCentavos('') =", paraCentavos(''));
console.log("paraCentavos(null) =", paraCentavos(null));

// Idempotência: paraCentavos(paraTela(...)) deve voltar ao original?
console.log("\n=== TESTE: Idempotência ===\n");
const valores_teste = [250, 123456, 1, 0, 100000];
valores_teste.forEach(c => {
  const tela = centavosParaTela(c);
  const volta = paraCentavos(tela);
  const ok = volta === c ? "✓" : "✗";
  console.log(`${ok} ${c} → "${tela}" → ${volta}`);
});

// paraPlanilha deve devolver número
console.log("\n=== TESTE: paraPlanilha ===\n");
console.log("Tipo dinheiro:");
console.log("paraPlanilha(250, 'dinheiro') =", paraPlanilha(250, 'dinheiro'), "(tipo:", typeof paraPlanilha(250, 'dinheiro'), ", esperado number 2.5)");
console.log("paraPlanilha('2,50', 'dinheiro') =", paraPlanilha('2,50', 'dinheiro'), "(tipo:", typeof paraPlanilha('2,50', 'dinheiro'), ")");
console.log("paraPlanilha('2.5', 'dinheiro') =", paraPlanilha('2.5', 'dinheiro'), "(tipo:", typeof paraPlanilha('2.5', 'dinheiro'), ")");
console.log("paraPlanilha(null, 'dinheiro') =", paraPlanilha(null, 'dinheiro'));
console.log("paraPlanilha('', 'dinheiro') =", paraPlanilha('', 'dinheiro'));

// mascaraDinheiro
console.log("\n=== TESTE: mascaraDinheiro ===\n");
console.log("mascaraDinheiro('2') =", mascaraDinheiro('2'), "(esperado 2 centavos? ou 0,02?)");
console.log("mascaraDinheiro('25') =", mascaraDinheiro('25'), "(esperado 25 centavos? ou 0,25?)");
console.log("mascaraDinheiro('250') =", mascaraDinheiro('250'), "(esperado 2,50)");
console.log("mascaraDinheiro('2500') =", mascaraDinheiro('2500'), "(esperado 25,00)");
console.log("mascaraDinheiro('0') =", mascaraDinheiro('0'));
console.log("mascaraDinheiro('00') =", mascaraDinheiro('00'));
console.log("mascaraDinheiro('') =", mascaraDinheiro(''));

// Round vs ponto flutuante
console.log("\n=== TESTE: Math.round e ponto flutuante ===\n");
const casos_float = [0.07, 1.005, 8.115, 0.14, 0.145, 0.155];
casos_float.forEach(n => {
  const resultado = Math.round(n * 100);
  const esperado = Math.round(n * 100);
  console.log(`${n} * 100 = ${n * 100} → Math.round = ${resultado}`);
});
