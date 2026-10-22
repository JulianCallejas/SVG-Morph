import React, { useLayoutEffect, useRef } from 'react';
import { sanitizeSVG } from '../utils/sanitizeSVG';
import { fitSVGs } from '../utils/fitSVG';

interface FittedSVGProps {
  svg: string;
  className?: string;
}

/** An uploaded SVG drawn whole inside the box it is given, sanitized first. Fill the box with `className`. */
export const FittedSVG: React.FC<FittedSVGProps> = ({ svg, className = '' }) => {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (ref.current) fitSVGs(ref.current);
  }, [svg]);

  // The files are untrusted: only sanitized markup reaches innerHTML.
  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: sanitizeSVG(svg) }} />;
};
