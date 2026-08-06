export type Codec = {
  encode(bytes: Uint8Array): Uint8Array | Promise<Uint8Array>;
  decode(bytes: Uint8Array): Uint8Array | Promise<Uint8Array>;
};

export const identityCodec: Codec = {
  encode: (bytes) => bytes,
  decode: (bytes) => bytes,
};
