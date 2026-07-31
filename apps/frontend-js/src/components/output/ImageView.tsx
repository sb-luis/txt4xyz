export interface ImageViewProps {
  mime: string;
  dataBase64: string;
}

export function ImageView({ mime, dataBase64 }: ImageViewProps) {
  const src = `data:${mime};base64,${dataBase64}`;
  return <img src={src} alt="image output" className="max-h-80 max-w-full" />;
}
