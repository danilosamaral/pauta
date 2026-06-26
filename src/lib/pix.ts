// =============================================================
// PIX "copia e cola" (BR Code estático), seguindo o padrão EMV do Banco
// Central. Monta a string que a pessoa cola no app do banco para pagar.
//
// Cada campo é "ID + tamanho(2 dígitos) + valor". No fim vai um CRC16.
// =============================================================

import { PIX } from "./constants";

// Monta um campo EMV: id (2) + tamanho (2, com zero à esquerda) + valor.
function campo(id: string, valor: string): string {
  const tam = valor.length.toString().padStart(2, "0");
  return `${id}${tam}${valor}`;
}

// CRC16/CCITT-FALSE (polinômio 0x1021, início 0xFFFF) — exigido pelo padrão.
function crc16(texto: string): string {
  let crc = 0xffff;
  for (let i = 0; i < texto.length; i++) {
    crc ^= texto.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Gera o "copia e cola" do PIX com o valor já embutido.
 * Usa os dados de cobrança definidos em constants.ts (PIX).
 */
export function pixCopiaECola(): string {
  // 26 = conta do recebedor: GUI fixo do pix + a chave.
  const contaRecebedor =
    campo("00", "br.gov.bcb.pix") + campo("01", PIX.chave);

  const semCrc =
    campo("00", "01") + // formato
    campo("01", "11") + // estático reutilizável
    campo("26", contaRecebedor) +
    campo("52", "0000") + // categoria
    campo("53", "986") + // moeda BRL
    campo("54", PIX.valor) + // valor
    campo("58", "BR") + // país
    campo("59", PIX.nome) + // nome do recebedor
    campo("60", PIX.cidade) + // cidade
    campo("62", campo("05", "***")) + // txid genérico
    "6304"; // id+tam do CRC, que entra no cálculo

  return semCrc + crc16(semCrc);
}
