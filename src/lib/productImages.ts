import imgChavesAllen from "@/assets/products/chaves-allen.jpg";
import imgFuradeira from "@/assets/products/furadeira.jpg";
import imgParafusos from "@/assets/products/parafusos-kit.jpg";
import imgSerraCircular from "@/assets/products/serra-circular.jpg";
import imgNivelLaser from "@/assets/products/nivel-laser.jpg";
import imgAlicate from "@/assets/products/alicate.jpg";
import imgParafusadeira from "@/assets/products/parafusadeira.jpg";
import imgTrena from "@/assets/products/trena.jpg";

export const productImages: Record<string, string> = {
  "Jogo de Chaves Allen": imgChavesAllen,
  "Jogo de Chaves Allen 9pcs": imgChavesAllen,
  "Furadeira de Impacto": imgFuradeira,
  "Furadeira de Impacto 750W": imgFuradeira,
  "Kit Parafusos Sextavados": imgParafusos,
  "Kit Parafusos Sextavados 200pcs": imgParafusos,
  "Serra Circular 7¼\"": imgSerraCircular,
  "Serra Circular 7¼\" 1400W": imgSerraCircular,
  "Nível a Laser": imgNivelLaser,
  "Nível a Laser 15m": imgNivelLaser,
  "Alicate Universal 8\"": imgAlicate,
  "Alicate Universal": imgAlicate,
  "Parafusadeira 12V": imgParafusadeira,
  "Parafusadeira 12V Bivolt": imgParafusadeira,
  "Trena Magnética 5m": imgTrena,
};

export const getProductImage = (name: string): string | undefined => {
  if (productImages[name]) return productImages[name];
  const key = Object.keys(productImages).find((k) => name.includes(k) || k.includes(name));
  return key ? productImages[key] : undefined;
};
