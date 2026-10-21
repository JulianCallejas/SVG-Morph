import React, { useState } from 'react';
import { useMorphStore } from '../store/morphStore';
import type { ContourMode, ContourPlanEntry } from '../utils/contourPairing';
import {
  MAX_NODE_COUNT,
  MIN_NODE_COUNT,
  pairNodes,
  resolveNodeCount,
  type Point,
} from '../utils/contourInterpolation';
import { contourLabel, pairManually, unpairEntry, updateEntry } from '../utils/contourPlanEditing';
import { Button } from './ui/Button';
import { CheckRow, Field, Slider } from './ui/Fields';
import { Panel } from './ui/Panel';
import { Segmented } from './ui/Segmented';
import { ContourMap } from './ContourMap';
import { CONTOUR_SWATCH, colorSlot } from './contourColors';

const MODE_LABELS: Record<ContourMode, string> = {
  morph: 'Morph',
  swap: 'Swap',
  static: 'Fixed',
};

// Fade length offered when the user turns the cross-fade on, as a fraction of the animation.
const DEFAULT_FADE_ON = 0.2;

const percent = (fraction: number): string => `${Math.round(fraction * 100)}%`;

type Selection = { side: 'source' | 'target'; id: string } | null;

/**
 * Lets the user decide, per contour, what happens during the animation: morph into a partner,
 * swap at a chosen point (hard cut or cross-fade), or stay fixed. Works on the plan in the store.
 */
export const ContourPlanPanel: React.FC = () => {
  const {
    sourceSVGData,
    targetSVGData,
    sourceContours,
    targetContours,
    contourPlan,
    contourPlanCustomized,
    setContourPlan,
    resetContourPlan,
  } = useMorphStore();

  const [hoveredEntry, setHoveredEntry] = useState<number | null>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [showNodes, setShowNodes] = useState(true);

  if (!sourceSVGData || !targetSVGData || !contourPlan) return null;

  // Nodes only exist for morphing pairs; both sides of a pair share the same count.
  const nodeCountOf = (entry: ContourPlanEntry): number | null => {
    if (entry.mode !== 'morph' || entry.sourceId === null || entry.targetId === null) return null;
    const from = sourceContours.find((c) => c.id === entry.sourceId);
    const to = targetContours.find((c) => c.id === entry.targetId);
    return from && to ? resolveNodeCount(entry, from, to) : null;
  };
  // The target nodes are the aligned ones, so the larger start node shows where each pair really meets.
  const sourceNodes = new Map<string, Point[]>();
  const targetNodes = new Map<string, Point[]>();
  if (showNodes) {
    for (const entry of contourPlan) {
      const count = nodeCountOf(entry);
      const from = sourceContours.find((c) => c.id === entry.sourceId);
      const to = targetContours.find((c) => c.id === entry.targetId);
      if (count !== null && from && to) {
        const nodes = pairNodes(from, to, count);
        sourceNodes.set(from.id, nodes.from);
        targetNodes.set(to.id, nodes.to);
      }
    }
  }

  const sourceLabel = (id: string) => contourLabel(id, sourceContours);
  const targetLabel = (id: string) => contourLabel(id, targetContours);
  const entryTitle = (entry: ContourPlanEntry): string =>
    `${entry.sourceId ? sourceLabel(entry.sourceId) : 'nothing'} → ${
      entry.targetId ? targetLabel(entry.targetId) : 'nothing'
    }`;

  const apply = (plan: ContourPlanEntry[]) => {
    void setContourPlan(plan);
  };

  const handleSelect = (side: 'source' | 'target', id: string) => {
    if (selection && selection.side !== side) {
      const [sourceId, targetId] = side === 'source' ? [id, selection.id] : [selection.id, id];
      apply(pairManually(contourPlan, sourceId, targetId, sourceContours, targetContours));
      setSelection(null);
      return;
    }
    setSelection(selection?.id === id ? null : { side, id });
  };

  const status = selection
    ? `Selected ${
        selection.side === 'source' ? sourceLabel(selection.id) : targetLabel(selection.id)
      } in the ${selection.side}. Now choose a contour in the ${
        selection.side === 'source' ? 'target' : 'source'
      } to pair them.`
    : 'Select a contour in one SVG, then one in the other, to pair them.';

  return (
    <Panel
      title="Contours"
      actions={
        <Button onClick={() => void resetContourPlan()} disabled={!contourPlanCustomized}>
          Reset suggestion
        </Button>
      }
    >
      <p className="max-w-[70ch] text-muted">
        Each outline of your SVGs is a contour. Paired contours morph into each other; the rest can
        change at a chosen point of the animation, with an optional fade, or stay fixed.
      </p>
      <p role="status" className="mt-3 text-sm font-medium">
        {status}
      </p>
      <div className="mt-4 max-w-sm">
        <CheckRow
          label="Show nodes on the maps"
          checked={showNodes}
          onChange={(event) => setShowNodes(event.target.checked)}
        />
      </div>

      <div className="mt-5 grid gap-6 sm:grid-cols-2">
        <figure>
          <figcaption className="mb-2 text-sm text-muted">Source</figcaption>
          <ContourMap
            side="source"
            viewBox={sourceSVGData.viewBox}
            width={sourceSVGData.width}
            height={sourceSVGData.height}
            contours={sourceContours}
            otherContours={targetContours}
            plan={contourPlan}
            nodePoints={sourceNodes}
            hoveredEntry={hoveredEntry}
            selectedId={selection?.side === 'source' ? selection.id : null}
            onHover={setHoveredEntry}
            onSelect={(id) => handleSelect('source', id)}
          />
        </figure>
        <figure>
          <figcaption className="mb-2 text-sm text-muted">Target</figcaption>
          <ContourMap
            side="target"
            viewBox={targetSVGData.viewBox}
            width={targetSVGData.width}
            height={targetSVGData.height}
            contours={targetContours}
            otherContours={sourceContours}
            plan={contourPlan}
            nodePoints={targetNodes}
            hoveredEntry={hoveredEntry}
            selectedId={selection?.side === 'target' ? selection.id : null}
            onHover={setHoveredEntry}
            onSelect={(id) => handleSelect('target', id)}
          />
        </figure>
      </div>

      <ul className="mt-6 space-y-3">
        {contourPlan.map((entry, index) => {
          const paired = entry.sourceId !== null && entry.targetId !== null;
          const title = entryTitle(entry);
          const modes = (paired ? ['morph', 'swap', 'static'] : ['swap', 'static']) as ContourMode[];

          return (
            <li
              key={`${entry.sourceId}-${entry.targetId}`}
              className={`grid gap-4 p-4 md:grid-cols-[minmax(0,14rem)_1fr] ${
                hoveredEntry === index ? 'bg-line/30' : 'bg-raised'
              }`}
              onMouseEnter={() => setHoveredEntry(index)}
              onMouseLeave={() => setHoveredEntry(null)}
            >
              <div className="flex items-start justify-between gap-3 md:flex-col md:justify-start">
                <p className="flex items-center gap-3 font-medium">
                  <span
                    aria-hidden="true"
                    className={`inline-block h-4 w-4 shrink-0 ${CONTOUR_SWATCH[colorSlot(index)]}`}
                  />
                  {title}
                </p>
                {paired && (
                  <Button
                    onClick={() => apply(unpairEntry(contourPlan, index, sourceContours, targetContours))}
                    aria-label={`Unpair ${title}`}
                  >
                    Unpair
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                <Segmented
                  label={`What happens to ${title}`}
                  value={entry.mode}
                  options={modes.map((mode) => ({ id: mode, label: MODE_LABELS[mode] }))}
                  onChange={(mode) => apply(updateEntry(contourPlan, index, { mode }))}
                />

                {entry.mode === 'morph' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Segmented
                      label={`Nodes for ${title}`}
                      value={entry.nodeCount === undefined ? 'auto' : 'manual'}
                      options={[
                        { id: 'auto', label: 'Auto' },
                        { id: 'manual', label: 'Manual' },
                      ]}
                      onChange={(choice) =>
                        apply(
                          updateEntry(contourPlan, index, {
                            nodeCount: choice === 'auto' ? null : (nodeCountOf(entry) ?? MIN_NODE_COUNT),
                          }),
                        )
                      }
                    />
                    {entry.nodeCount === undefined ? (
                      <p className="self-end text-sm text-muted">Automatic: {nodeCountOf(entry)} nodes</p>
                    ) : (
                      <Field label={`${entry.nodeCount} nodes`}>
                        <Slider
                          min={MIN_NODE_COUNT}
                          max={MAX_NODE_COUNT}
                          step={1}
                          value={entry.nodeCount}
                          onChange={(event) =>
                            apply(updateEntry(contourPlan, index, { nodeCount: Number(event.target.value) }))
                          }
                        />
                      </Field>
                    )}
                  </div>
                )}

                {entry.mode === 'swap' && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={`Change at ${percent(entry.swapAt)}`}>
                      <Slider
                        min={0}
                        max={1}
                        step={0.01}
                        value={entry.swapAt}
                        onChange={(event) =>
                          apply(updateEntry(contourPlan, index, { swapAt: Number(event.target.value) }))
                        }
                      />
                    </Field>
                    <div className="space-y-3">
                      <CheckRow
                        label="Fade between the two"
                        checked={entry.fadeWindow > 0}
                        onChange={(event) =>
                          apply(
                            updateEntry(contourPlan, index, {
                              fadeWindow: event.target.checked ? DEFAULT_FADE_ON : 0,
                            }),
                          )
                        }
                      />
                      {entry.fadeWindow > 0 && (
                        <Field label={`Fade length ${percent(entry.fadeWindow)}`}>
                          <Slider
                            min={0.05}
                            max={0.5}
                            step={0.05}
                            value={entry.fadeWindow}
                            onChange={(event) =>
                              apply(
                                updateEntry(contourPlan, index, { fadeWindow: Number(event.target.value) }),
                              )
                            }
                          />
                        </Field>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
};
