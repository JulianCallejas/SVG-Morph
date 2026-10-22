import React from 'react';
import { useMorphStore } from '../store/morphStore';
import { pairNodePoints } from '../utils/contourPlanEditing';
import { viewBoxAttr } from '../utils/contourSlide';
import { ContourLayer } from './ContourMap';

interface ContourOverlayProps {
  side: 'source' | 'target';
  /**
   * The viewBox of the drawing as it is shown. Absent means the parsed one, which is only a guess
   * for an SVG that has none (the preview frames it with its width and height).
   */
  viewBox?: string | null;
}

/**
 * The contour boxes, labels and nodes of one SVG, drawn over that SVG in the preview: same colors
 * and labels as the Contours panel, and picking a box pairs or selects exactly like there. It fills
 * the box that holds the drawing and frames itself with the drawing's own viewBox, so the two line
 * up. Pointer only: the panel already offers the whole keyboard path, so this adds no tab stops.
 */
export const ContourOverlay: React.FC<ContourOverlayProps> = ({ side, viewBox }) => {
  const {
    sourceSVGData,
    targetSVGData,
    sourceContours,
    targetContours,
    contourPlan,
    contourHover,
    contourSelection,
    showContourNodes,
    setContourHover,
    selectContour,
  } = useMorphStore();

  const data = side === 'source' ? sourceSVGData : targetSVGData;
  if (!data || !contourPlan) return null;

  const frame = viewBox || data.viewBox;
  const nodes = pairNodePoints(showContourNodes ? contourPlan : [], sourceContours, targetContours);

  return (
    <svg
      viewBox={viewBoxAttr(frame, data.width, data.height)}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 h-full w-full"
      aria-hidden="true"
      data-contour-overlay={side}
    >
      <ContourLayer
        side={side}
        viewBox={frame}
        width={data.width}
        height={data.height}
        contours={side === 'source' ? sourceContours : targetContours}
        otherContours={side === 'source' ? targetContours : sourceContours}
        plan={contourPlan}
        nodePoints={side === 'source' ? nodes.source : nodes.target}
        hoveredEntry={contourHover}
        selectedId={contourSelection?.side === side ? contourSelection.id : null}
        keyboard={false}
        showContourStroke={false}
        showPathBoxes={false}
        onHover={setContourHover}
        onSelect={(id) => void selectContour(side, id)}
      />
    </svg>
  );
};
