import { describe, expect, it } from 'vitest'
import { buildings, chains, getBuilding } from '../src/data'
import { buildingFlow, chainUsers } from '../src/game/chains'

describe('chain groups of the build menu', () => {
  it('list every production building exactly once', () => {
    const listed = chains.flatMap((chain) => chain.buildings)
    const production = buildings.filter((b) => b.category === 'production').map((b) => b.id)
    expect([...listed].sort()).toEqual([...production].sort())
  })

  it('only name existing buildings, raw material first', () => {
    for (const chain of chains) {
      const defs = chain.buildings.map(getBuilding)
      // A building never comes before one that makes its input within the same chain.
      defs.forEach((def, i) => {
        for (const input of def.inputs ?? []) {
          const makerLater = defs.slice(i + 1).some((d) => d.output?.good === input.good)
          expect(makerLater, `${chain.id}: ${def.id} before its supplier`).toBe(false)
        }
      })
    }
  })

  it('every chain is needed by someone', () => {
    for (const chain of chains) expect(chainUsers(chain).length, chain.id).toBeGreaterThan(0)
  })

  it('tells who needs bread and tools', () => {
    const find = (id: string) => chains.find((c) => c.id === id)!
    expect(chainUsers(find('bread'))).toEqual(['Pioniere'])
    expect(chainUsers(find('tools'))).toEqual(['Bau'])
  })

  it('shows inputs and outputs of a building', () => {
    expect(buildingFlow('butcher')).toEqual({ inputs: ['cattle'], outputs: ['food', 'hides'] })
    expect(buildingFlow('forester')).toEqual({ inputs: [], outputs: ['wood'] })
    expect(buildingFlow('road')).toEqual({ inputs: [], outputs: [] })
  })
})
