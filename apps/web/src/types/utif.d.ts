declare module "utif" {
  interface TiffImage {
    width: number;
    height: number;
    t256?: number[];
    t257?: number[];
  }
  export function decode(buffer: ArrayBuffer): TiffImage[];
  export function decodeImage(buffer: ArrayBuffer, image: TiffImage): void;
  export function toRGBA8(image: TiffImage): Uint8Array;
  const UTIF: { decode: typeof decode; decodeImage: typeof decodeImage; toRGBA8: typeof toRGBA8 };
  export default UTIF;
}
