export interface PlotViewProps {
  svg: string;
}

export function PlotView({ svg }: PlotViewProps) {
  const src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return <img src={src} alt="plot output" className="max-h-80 max-w-full" />;
}
