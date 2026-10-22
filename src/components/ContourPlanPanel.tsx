import React, { useState } from 'react';
import { useMorphStore } from '../store/morphStore';
import type { ContourMode, ContourPlanEntry, SlideDirection } from '../utils/contourPairing';
import { SLIDE_DIRECTIONS } from '../utils/contourSlide';
import {
  MAX_NODE_COUNT,
  MIN_NODE_COUNT,
  pairNodes,
} from '../utils/contourInterpolation';
import {
  clearAnchors,
  contourLabel,
  nodeCountOfEntry,
  pairNodePoints,
  removeAnchor,
  setAnchor,
  unpairEntry,
  updateEntry,
} from '../utils/contourPlanEditing';
import { Button } from './ui/Button';
import { CheckRow, Field, Select, Slider } from './ui/Fields';
import { Panel } from './ui/Panel';
import { Segmented } from './ui/Segmented';
import { ContourMap, type NodePicking } from './ContourMap';
import { CONTOUR_SWATCH, colorSlot } from './contourColors';

const MODE_LABELS: Record<ContourMode, string> = {
  morph: 'Morph',
  swap: 'Swap',
  static: 'Fixed',
};

const SLIDE_LABELS: Record<SlideDirection, string> = {
  left: 'Left',
  right: 'Right',
  up: 'Up',
  down: 'Down',
  'up-left': 'Up and left',
  'up-right': 'Up and right',
  'down-left': 'Down and left',
  'down-right': 'Down and right',
};

// Fade length offered when the user turns the cross-fade on, as a fraction of the animation.
const DEFAULT_FADE_ON = 0.2;

const percent = (fraction: number): string => `${Math.round(fraction * 100)}%`;

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
    contourHover: hoveredEntry,
    contourSelection: selection,
    showContourNodes: showNodes,
    setContourHover: setHoveredEntry,
    selectContour,
    setShowContourNodes: setShowNodes,
  } = useMorphStore();
  // The pair whose points are being matched by hand (by its contours, not its position: editing the
  // plan from the preview renumbers entries), and the node waiting on each side for a partner
  const [matchingKey, setMatchingKey] = useState<string | null>(null);
  const [pendingSource, setPendingSource] = useState<number | null>(null);
  const [pendingTarget, setPendingTarget] = useState<number | null>(null);
  const [pointsMessage, setPointsMessage] = useState<string | null>(null);

  if (!sourceSVGData || !targetSVGData || !contourPlan) return null;

  const keyOf = (entry: ContourPlanEntry): string => `${entry.sourceId}|${entry.targetId}`;
  const matchingIndex = matchingKey === null ? -1 : contourPlan.findIndex((entry) => keyOf(entry) === matchingKey);
  const matchingEntry = matchingIndex >= 0 ? matchingIndex : null;

  // Nodes only exist for morphing pairs; both sides of a pair share the same count.
  const nodeCountOf = (entry: ContourPlanEntry): number | null =>
    nodeCountOfEntry(entry, sourceContours, targetContours);
  // The pair being matched stays shown, nodes switch or not, so its nodes can be picked.
  const shownNodes = pairNodePoints(showNodes ? contourPlan : [], sourceContours, targetContours);
  const matchingNodes = matchingEntry === null
    ? null
    : pairNodePoints(contourPlan, sourceContours, targetContours, (index) => index === matchingEntry);
  const sourceNodes = new Map([...shownNodes.source, ...(matchingNodes?.source ?? [])]);
  const targetNodes = new Map([...shownNodes.target, ...(matchingNodes?.target ?? [])]);

  const sourceLabel = (id: string) => contourLabel(id, sourceContours);
  const targetLabel = (id: string) => contourLabel(id, targetContours);
  const entryTitle = (entry: ContourPlanEntry): string =>
    `${entry.sourceId ? sourceLabel(entry.sourceId) : 'nothing'} → ${
      entry.targetId ? targetLabel(entry.targetId) : 'nothing'
    }`;

  // Changing the plan renumbers its entries, so the point matching of one of them ends with it,
  // except when the change is a matched point of that very pair.
  const apply = (plan: ContourPlanEntry[], keepMatching = false) => {
    if (!keepMatching) stopMatching();
    void setContourPlan(plan);
  };

  function stopMatching() {
    setMatchingKey(null);
    setPendingSource(null);
    setPendingTarget(null);
    setPointsMessage(null);
  }

  const matching = matchingEntry === null ? undefined : contourPlan[matchingEntry];
  const matchingCount = matching ? nodeCountOf(matching) : null;
  const matchingContours =
    matching && matchingCount !== null
      ? {
          from: sourceContours.find((c) => c.id === matching.sourceId),
          to: targetContours.find((c) => c.id === matching.targetId),
        }
      : null;
  // Nodes a person can pick: a closed contour ends on the node it starts from
  const pickableNodes = matchingContours?.from && matchingContours.to && matchingCount !== null
    ? {
        source: matchingContours.from.closed ? matchingCount : matchingCount + 1,
        target: matchingContours.to.closed ? matchingCount : matchingCount + 1,
      }
    : null;

  const matchPoints = (sourceNode: number, targetNode: number) => {
    if (matchingEntry === null || !matching || !matchingContours?.from || !matchingContours.to || matchingCount === null) {
      return;
    }
    const nodes = pairNodes(matchingContours.from, matchingContours.to, matchingCount, matching.anchors);
    try {
      apply(
        setAnchor(
          contourPlan,
          matchingEntry,
          { source: sourceNode / matchingCount, target: nodes.targetAt[targetNode] },
          sourceContours,
          targetContours,
        ),
        true,
      );
      setPointsMessage(null);
    } catch (error) {
      setPointsMessage(error instanceof Error ? error.message : 'Those points cannot be matched');
    }
    setPendingSource(null);
    setPendingTarget(null);
  };

  const pickNode = (side: 'source' | 'target', nodeIndex: number) => {
    const sourceNode = side === 'source' ? (pendingSource === nodeIndex ? null : nodeIndex) : pendingSource;
    const targetNode = side === 'target' ? (pendingTarget === nodeIndex ? null : nodeIndex) : pendingTarget;
    if (sourceNode !== null && targetNode !== null) {
      matchPoints(sourceNode, targetNode);
      return;
    }
    setPendingSource(sourceNode);
    setPendingTarget(targetNode);
  };

  const picking = (side: 'source' | 'target'): NodePicking | null => {
    if (!matching || matchingCount === null) return null;
    const contourId = side === 'source' ? matching.sourceId : matching.targetId;
    if (contourId === null) return null;
    return {
      contourId,
      matched: (matching.anchors ?? []).map((a) => Math.round(a.source * matchingCount)),
      selected: side === 'source' ? pendingSource : pendingTarget,
      onPick: (nodeIndex) => pickNode(side, nodeIndex),
    };
  };

  const handleSelect = (side: 'source' | 'target', id: string) => {
    // a second pick pairs two contours, which renumbers the plan: the point matching of a pair ends
    if (selection && selection.side !== side) stopMatching();
    void selectContour(side, id);
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
            picking={picking('source')}
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
            picking={picking('target')}
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

                {entry.mode === 'morph' && (
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        variant={matchingEntry === index ? 'primary' : 'secondary'}
                        aria-pressed={matchingEntry === index}
                        aria-label={`Match points of ${title}`}
                        onClick={() => {
                          const open = matchingEntry === index;
                          stopMatching();
                          if (!open) setMatchingKey(keyOf(entry));
                        }}
                      >
                        Match points
                      </Button>
                      <p className="text-sm text-muted">
                        {entry.anchors?.length
                          ? `${entry.anchors.length} matched ${entry.anchors.length === 1 ? 'point' : 'points'}`
                          : 'Points are matched automatically'}
                      </p>
                    </div>

                    {matchingEntry === index && pickableNodes && (
                      <div className="space-y-3 bg-surface p-4">
                        <p className="max-w-[70ch] text-sm text-muted">
                          Pick a node on the source map and then one on the target map, or type their
                          numbers. The nodes in between are spread evenly. Matched points are ringed.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                          <Field label="Source node">
                            <input
                              type="number"
                              min={1}
                              max={pickableNodes.source}
                              value={pendingSource === null ? '' : pendingSource + 1}
                              onChange={(event) => {
                                const value = Math.round(Number(event.target.value));
                                setPendingSource(
                                  event.target.value === '' || value < 1 || value > pickableNodes.source
                                    ? null
                                    : value - 1,
                                );
                              }}
                              className="h-11 w-full bg-raised px-3 text-content"
                            />
                          </Field>
                          <Field label="Target node">
                            <input
                              type="number"
                              min={1}
                              max={pickableNodes.target}
                              value={pendingTarget === null ? '' : pendingTarget + 1}
                              onChange={(event) => {
                                const value = Math.round(Number(event.target.value));
                                setPendingTarget(
                                  event.target.value === '' || value < 1 || value > pickableNodes.target
                                    ? null
                                    : value - 1,
                                );
                              }}
                              className="h-11 w-full bg-raised px-3 text-content"
                            />
                          </Field>
                          <Button
                            disabled={pendingSource === null || pendingTarget === null}
                            onClick={() => {
                              if (pendingSource !== null && pendingTarget !== null) {
                                matchPoints(pendingSource, pendingTarget);
                              }
                            }}
                          >
                            Match these points
                          </Button>
                        </div>
                        {pointsMessage && (
                          <p role="alert" className="text-sm font-medium text-danger">
                            {pointsMessage}
                          </p>
                        )}
                        {entry.anchors && entry.anchors.length > 0 && (
                          <ul className="space-y-2">
                            {entry.anchors.map((anchor, anchorIndex) => (
                              <li key={`${anchor.source}-${anchor.target}`} className="flex flex-wrap items-center gap-3 text-sm">
                                <span>
                                  Source {percent(anchor.source)} ↔ target {percent(anchor.target)} along the outline
                                </span>
                                <Button
                                  aria-label={`Remove matched point ${anchorIndex + 1} of ${title}`}
                                  onClick={() => apply(removeAnchor(contourPlan, index, anchorIndex), true)}
                                >
                                  Remove
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                        {entry.anchors && entry.anchors.length > 0 && (
                          <Button onClick={() => apply(clearAnchors(contourPlan, index), true)}>
                            Back to automatic
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {entry.mode === 'swap' && (
                  <div className="space-y-4">
                    <Segmented
                      label={`How ${title} changes over`}
                      value={entry.transition ? 'slide' : 'fade'}
                      options={[
                        { id: 'fade', label: 'Fade' },
                        { id: 'slide', label: 'Slide' },
                      ]}
                      onChange={(choice) =>
                        apply(
                          choice === 'fade'
                            ? updateEntry(contourPlan, index, { transition: null })
                            : updateEntry(contourPlan, index, {
                                transition: { type: 'slide', direction: 'left', fade: false },
                                // a slide moves over the transition length, so it needs one
                                fadeWindow: entry.fadeWindow > 0 ? entry.fadeWindow : DEFAULT_FADE_ON,
                              }),
                        )
                      }
                    />
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
                      {entry.transition ? (
                        <div className="space-y-3">
                          <Field label="Slide toward (the new one comes in from the opposite side)">
                            <Select
                              value={entry.transition.direction}
                              onChange={(event) =>
                                apply(
                                  updateEntry(contourPlan, index, {
                                    transition: {
                                      ...(entry.transition as NonNullable<typeof entry.transition>),
                                      direction: event.target.value as SlideDirection,
                                    },
                                  }),
                                )
                              }
                            >
                              {SLIDE_DIRECTIONS.map((direction) => (
                                <option key={direction} value={direction}>
                                  {SLIDE_LABELS[direction]}
                                </option>
                              ))}
                            </Select>
                          </Field>
                          <CheckRow
                            label="Fade while sliding"
                            checked={entry.transition.fade}
                            onChange={(event) =>
                              apply(
                                updateEntry(contourPlan, index, {
                                  transition: {
                                    ...(entry.transition as NonNullable<typeof entry.transition>),
                                    fade: event.target.checked,
                                  },
                                }),
                              )
                            }
                          />
                          <Field label={`Slide length ${percent(entry.fadeWindow)}`}>
                            <Slider
                              min={0.05}
                              max={0.5}
                              step={0.05}
                              value={Math.max(0.05, entry.fadeWindow)}
                              onChange={(event) =>
                                apply(
                                  updateEntry(contourPlan, index, { fadeWindow: Number(event.target.value) }),
                                )
                              }
                            />
                          </Field>
                        </div>
                      ) : (
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
