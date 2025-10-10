export interface PathData {
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: string;
  opacity?: string;
}

export interface SVGData {
  paths: PathData[];
  viewBox: string;
  width: number;
  height: number;
}
