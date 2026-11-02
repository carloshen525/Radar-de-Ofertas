// Utilitário central de filtros e regras de exclusão de produtos
// Garante que o Radar Shopee nunca busque, processe ou poste itens indesejados (ex: roupas femininas)

function normalizeText(str: string): string {
  return (str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Termos e palavras-chave que identificam direta e inequivocamente roupas e peças de vestuário femininas
 */
const DIRECT_FEMALE_CLOTHING_KEYWORDS = [
  'vestido',
  'vestidos',
  'vestidinho',
  'vestidinhos',
  'saia',
  'saias',
  'saiote',
  'minissaia',
  'short saia',
  'shorts saia',
  'cropped',
  'cropted',
  'croped',
  'top cropped',
  'blusinha',
  'blusinhas',
  'sutia',
  'sutias',
  'sutiã',
  'sutiãs',
  'calcinha',
  'calcinhas',
  'lingerie',
  'lingeries',
  'biquini',
  'biquinis',
  'biquíni',
  'biquínis',
  'maio',
  'maios',
  'maiô',
  'maiôs',
  'babydoll',
  'baby doll',
  'camisola',
  'camisolas',
  'macaquinho',
  'macaquinhos',
  'tomara que caia',
  'ciganinha',
  'mula manca',
  'ombro a ombro',
  'espartilho',
  'corpete',
  'fio dental',
  'meia calca',
  'meia-calca',
  'meia calça',
  'meia-calça',
  'cinta modeladora',
  'cinta feminina',
  'moda feminina',
  'roupa feminina',
  'roupas femininas',
  'vestuario feminino',
  'vestuário feminino',
  'look feminino',
  'linha feminina de roupas',
];

/**
 * Peças de vestuário que, combinadas com marcadores femininos ("feminina", "mulher", "menina"),
 * configuram roupa feminina
 */
const CLOTHING_PIECES = [
  'blusa',
  'blusas',
  'camisa',
  'camisas',
  'camiseta',
  'camisetas',
  't-shirt',
  'tshirt',
  'short',
  'shorts',
  'bermuda',
  'bermudas',
  'calca',
  'calcas',
  'calça',
  'calças',
  'jaqueta',
  'jaquetas',
  'casaco',
  'casacos',
  'conjunto',
  'conjuntos',
  'conjuntinho',
  'conjuntinhos',
  'pijama',
  'pijamas',
  'body',
  'bodies',
  'regata',
  'regatas',
  'colete',
  'coletes',
  'cardigan',
  'cardigans',
  'kimono',
  'kimonos',
  'blazer',
  'blazers',
  'moletom',
  'moletons',
  'macacao',
  'macacoes',
  'macacão',
  'macacões',
  'pantacourt',
  'legging',
  'leggings',
  'top',
  'cropped',
  'saida de praia',
  'saída de praia',
  'canga',
];

const FEMALE_MARKERS = [
  'feminina',
  'femininas',
  'feminino',
  'femininos',
  'mulher',
  'mulheres',
  'menina',
  'meninas',
  'moca',
  'moça',
  'garota',
  'garotas',
  'fem',
];

/**
 * Avalia se um título ou categoria corresponde a roupas ou vestuário feminino
 */
export function isRoupaFeminina(titulo: string, categoria: string = ''): boolean {
  if (!titulo) return false;

  const normTitle = normalizeText(titulo);
  const normCat = normalizeText(categoria);

  // 1. Categoria explicitamente feminina de vestuário
  if (
    normCat.includes('moda feminina') ||
    normCat.includes('roupa feminina') ||
    normCat.includes('vestuario feminino') ||
    normCat.includes('lingerie')
  ) {
    return true;
  }

  // 2. Palavras-chave diretas inquestionáveis (vestidos, sutiãs, calcinhas, cropped, etc.)
  for (const kw of DIRECT_FEMALE_CLOTHING_KEYWORDS) {
    const normKw = normalizeText(kw);
    const regex = new RegExp(`\\b${normKw}\\b`, 'i');
    if (regex.test(normTitle)) {
      return true;
    }
  }

  // 3. Combinação de peça de vestuário + marcador feminino
  // Ex: "Calça Jeans Feminina", "Conjunto Feminino", "Camiseta Mulher", "Top Feminino Academia"
  const hasFemaleMarker = FEMALE_MARKERS.some((marker) => {
    const reg = new RegExp(`\\b${marker}\\b`, 'i');
    return reg.test(normTitle);
  });

  if (hasFemaleMarker) {
    const isPiece = CLOTHING_PIECES.some((piece) => {
      const reg = new RegExp(`\\b${normalizeText(piece)}\\b`, 'i');
      return reg.test(normTitle);
    });

    if (isPiece) {
      return true;
    }
  }

  return false;
}

