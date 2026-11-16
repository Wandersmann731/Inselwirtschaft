// What a house of a town stands on. A cottage stands on trodden earth; from the citizens on a house has laid stone
// flags around itself or keeps a garden behind a clipped hedge or a low wall. Which of these follows from the plan
// of the house, so the picture of the house (which brings hedge, wall and beds along) and the ground under it
// (which the map paints: flags or grass) always agree.

/** The ground of a plot: trodden earth, stone flags, or the grass of a garden. */
export type PlotGround = 'earth' | 'flags' | 'garden'

export interface Plot {
  ground: PlotGround
  /** What stands along the two sides of the plot one sees, if anything. */
  enclosure: 'hedge' | 'wall' | null
}

const EARTH: Plot = { ground: 'earth', enclosure: null }
const FLAGS: Plot = { ground: 'flags', enclosure: null }
const HEDGED: Plot = { ground: 'garden', enclosure: 'hedge' }
const WALLED: Plot = { ground: 'garden', enclosure: 'wall' }

/** The plots of the six plans of a tier: a town is mostly stone, with a garden here and there; the villas keep gardens. */
const PLOTS: Record<string, Plot[]> = {
  citizens: [FLAGS, HEDGED, FLAGS, FLAGS, WALLED, FLAGS],
  merchants: [FLAGS, FLAGS, HEDGED, WALLED, FLAGS, FLAGS],
  aristocrats: [HEDGED, WALLED, HEDGED, WALLED, FLAGS, HEDGED],
}

/** The plot of the house of a tier built to a plan (0 to 5). Pure. */
export function plotOf(tier: string, variant: number): Plot {
  return PLOTS[tier]?.[variant] ?? EARTH
}
