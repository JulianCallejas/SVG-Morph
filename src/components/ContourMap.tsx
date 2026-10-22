import React from 'react';
import type { ContourPlanEntry } from '../utils/contourPairing';
import type { StyledContour } from '../utils/contourSvg';
import { colorIndexByContour, contourLabel, pathBoxes } from '../utils/contourPlanEditing';
import type { Point } from '../utils/contourInterpolation';
import { CONTOUR_FILL, CONTOUR_SOFT_FILL, CONTOUR_STROKE, colorSlot } from './contourColors';

const STROKE = CONTOUR_STROKE;
const SOFT_FILL = CONTOUR_SOFT_FILL;
const FILL = CONTOUR_FILL;

const parseViewBox = (viewBox: string, width: number, height: number): [number, number, number, number] => {
  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  return parts.length === 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0
    ? [parts[0], parts[1], parts[2], parts[3]]
    : [0, 0, width || 100, height || 100];
};

/** Nodes of one contour that can be clicked to match them with a node of the other side. */
export interface NodePicking {
  contourId: string;
  /** Indexes of the nodes that already belong to a matched pair of points. */
  matched: number[];
  /** The node picked on this side, waiting for a partner on the other side. */
  selected: number | null;
  onPick: (nodeIndex: number) => void;
}

interface ContourMapProps {
  side: 'source' | 'target';
  viewBox: string;
  width: number;
  height: number;
  contours: StyledContour[];
  /** Contours of the opposite SVG, only used to name a contour's partner. */
  otherContours: StyledContour[];
  plan: ContourPlanEntry[];
  /** Nodes to draw per contour id (only morphing contours have any). Empty draws none. */
  nodePoints: ReadonlyMap<string, Point[]>;
  /** Index of the plan entry under the pointer or focus, shared by both maps and the list. */
  hoveredEntry: number | null;
  /** The contour picked on this side, waiting for a partner on the other side. */
  selectedId: string | null;
  /** When set, the nodes of that contour are clickable. Pointer only: the panel offers number fields too. */
  picking?: NodePicking | null;
  onHover: (entryIndex: number | null) => void;
  onSelect: (contourId: string) => void;
}

/**
 * The contours of one SVG drawn as a map: every contour gets a labelled box and the color of its
 * plan entry, so pairs can be told apart and picked. Paths with several subpaths also get a
 * thin box for the whole path. Rendered with React (not innerHTML), so no SVG markup is injected.
 */
export const ContourMap: React.FC<ContourMapProps> = ({
  side,
  viewBox,
  width,
  height,
  contours,
  otherContours,
  plan,
  nodePoints,
  hoveredEntry,
  selectedId,
  picking = null,
  onHover,
  onSelect,
}) => {
  const [minX, minY, vbWidth, vbHeight] = parseViewBox(viewBox, width, height);
  // Sizes are relative to the drawing so labels and padding look the same for any viewBox.
  const unit = Math.max(vbWidth, vbHeight) / 100;
  const pad = unit * 1.5;
  const fontSize = unit * 5;

  const entryOf = colorIndexByContour(plan);
  const describe = (contour: StyledContour): string => {
    const index = entryOf.get(contour.id);
    const entry = index === undefined ? undefined : plan[index];
    const otherId = entry ? (side === 'source' ? entry.targetId : entry.sourceId) : null;
    const otherLabel = otherId ? `, paired with ${contourLabel(otherId, otherContours)}` : ', not paired';
    return `${contourLabel(contour.id, contours)}, ${side} contour${otherLabel}${entry ? `, mode ${entry.mode}` : ''}`;
  };

  return (
    <svg
      viewBox={`${minX} ${minY} ${vbWidth} ${vbHeight}`}
      className="aspect-square w-full bg-canvas"
      role="group"
      aria-label={`${side} contours`}
    >
      {pathBoxes(contours)
        .filter((box) => contours.filter((c) => c.pathIndex === box.pathIndex).length > 1)
        .map((box) => (
          <g key={`path-${box.pathIndex}`} aria-hidden="true">
            <rect
              x={box.bbox.x - pad * 2}
              y={box.bbox.y - pad * 2}
              width={box.bbox.width + pad * 4}
              height={box.bbox.height + pad * 4}
              fill="none"
              className="stroke-muted"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <text
              x={box.bbox.x - pad * 2 + unit}
              y={box.bbox.y + box.bbox.height + pad * 2 - unit}
              fontSize={fontSize}
              className="fill-muted"
            >
              {box.label}
            </text>
          </g>
        ))}

      {contours.map((contour) => {
        const entryIndex = entryOf.get(contour.id);
        const slot = colorSlot(entryIndex ?? 0);
        const selected = selectedId === contour.id;
        const active = selected || (entryIndex !== undefined && hoveredEntry === entryIndex);
        const several = contours.filter((c) => c.pathIndex === contour.pathIndex).length > 1;
        const { x, y, width: w, height: h } = contour.bbox;

        return (
          <g
            key={contour.id}
            role="button"
            tabIndex={0}
            aria-pressed={selected}
            aria-label={describe(contour)}
            className="cursor-pointer outline-none"
            onClick={() => onSelect(contour.id)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(contour.id);
              }
            }}
            onMouseEnter={() => entryIndex !== undefined && onHover(entryIndex)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => entryIndex !== undefined && onHover(entryIndex)}
            onBlur={() => onHover(null)}
          >
            <rect
              x={x - pad}
              y={y - pad}
              width={w + pad * 2}
              height={h + pad * 2}
              className={`${STROKE[slot]} ${active ? SOFT_FILL[slot] : 'fill-transparent'}`}
              strokeWidth={active ? 3 : 1.5}
              strokeDasharray={several ? '5 3' : undefined}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={contour.d}
              fill="none"
              className={STROKE[slot]}
              strokeWidth={active ? 3.5 : 2.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {nodePoints.has(contour.id) && (
              <g className={FILL[slot]} aria-hidden="true">
                {(nodePoints.get(contour.id) as Point[]).map((point, i) => (
                  // the first node is where the contour starts: drawn larger so the direction reads
                  <circle key={i} cx={point.x} cy={point.y} r={i === 0 ? unit * 1.6 : unit * 0.7} />
                ))}
              </g>
            )}
            {picking?.contourId === contour.id && nodePoints.has(contour.id) && (
              <g aria-hidden="true">
                {(nodePoints.get(contour.id) as Point[])
                  // a closed contour ends on the node it starts from: one node, not two
                  .slice(0, contour.closed ? -1 : undefined)
                  .map((point, i) => {
                    const matched = picking.matched.includes(i);
                    const chosen = picking.selected === i;
                    return (
                      <circle
                        key={i}
                        cx={point.x}
                        cy={point.y}
                        r={unit * (chosen || matched ? 2.2 : 1.8)}
                        className={`cursor-pointer ${STROKE[slot]} ${chosen ? FILL[slot] : 'fill-transparent'}`}
                        strokeWidth={chosen ? 3 : matched ? 2.5 : 0}
                        vectorEffect="non-scaling-stroke"
                        onClick={(event) => {
                          // picking a node must not also pick the contour underneath
                          event.stopPropagation();
                          picking.onPick(i);
                        }}
                      />
                    );
                  })}
              </g>
            )}
            <text
              // keep the label inside the drawing when a contour touches its edge
              x={Math.min(Math.max(minX, x - pad + unit), minX + vbWidth - fontSize * 3)}
              y={Math.max(minY + fontSize, y - pad - unit * 0.8)}
              fontSize={fontSize}
              fontWeight={600}
              className="fill-content stroke-canvas"
              strokeWidth={unit * 1.2}
              paintOrder="stroke"
            >
              {contourLabel(contour.id, contours)}
            </text>
          </g>
        );
      })}
    </svg>
  );
};
