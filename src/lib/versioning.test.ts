import { describe, expect, it } from 'vitest'
import { diffVersions, getLatestQueryResultForVersion, getOutcomeDeltas } from './versioning'
import type { QueryRecord, QueryResultRecord, WorldVersion } from '../types'

function createVersion(
  input: Partial<WorldVersion> & Pick<WorldVersion, 'id' | 'worldId' | 'createdAt'>,
): WorldVersion {
  return {
    ontology: {
      nodes: [],
      edges: [],
      variables: [],
      actors: [],
      events: [],
      assumptions: [],
    },
    ...input,
  }
}

describe('versioning helpers', () => {
  it('detects added and changed graph entities between versions', () => {
    const previousVersion = createVersion({
      id: 'version-1',
      worldId: 'world-1',
      createdAt: 1,
      ontology: {
        nodes: [
          {
            id: 'actor-1',
            type: 'actor',
            label: 'Actor One',
            position: { x: 0, y: 0 },
            data: { confidence: 0.7 },
          },
        ],
        edges: [],
        variables: [],
        actors: [],
        events: [],
        assumptions: [],
      },
    })
    const currentVersion = createVersion({
      id: 'version-2',
      worldId: 'world-1',
      createdAt: 2,
      parentVersionId: 'version-1',
      ontology: {
        nodes: [
          {
            id: 'actor-1',
            type: 'actor',
            label: 'Actor Prime',
            position: { x: 20, y: 0 },
            data: { confidence: 0.7 },
          },
          {
            id: 'event-1',
            type: 'event',
            label: 'Shock',
            position: { x: 180, y: 40 },
            data: {},
          },
        ],
        edges: [
          {
            id: 'edge-1',
            source: 'actor-1',
            target: 'event-1',
            type: 'causes',
            data: { confidence: 0.8 },
          },
        ],
        variables: [],
        actors: [],
        events: [],
        assumptions: [],
      },
    })

    expect(diffVersions(previousVersion, currentVersion)).toEqual({
      addedNodeIds: ['event-1'],
      changedNodeIds: ['actor-1'],
      removedNodeIds: [],
      addedEdgeIds: ['edge-1'],
      changedEdgeIds: [],
      removedEdgeIds: [],
    })
  })

  it('returns the latest query result for a version', () => {
    const queries: QueryRecord[] = [
      {
        id: 'query-1',
        worldId: 'world-1',
        versionId: 'version-1',
        createdAt: 1,
        query: {
          question: 'Base question',
          targetOutcomes: ['Outcome A'],
        },
      },
      {
        id: 'query-2',
        worldId: 'world-1',
        versionId: 'version-1',
        createdAt: 2,
        query: {
          question: 'Newest question',
          targetOutcomes: ['Outcome A'],
        },
      },
    ]
    const results: QueryResultRecord[] = [
      {
        id: 'result-1',
        queryId: 'query-1',
        createdAt: 1,
        result: {
          outcomes: [{ label: 'Outcome A', probability: 0.4 }],
          keyDrivers: [],
          modelConfidence: 0.7,
        },
      },
      {
        id: 'result-2',
        queryId: 'query-2',
        createdAt: 2,
        result: {
          outcomes: [{ label: 'Outcome A', probability: 0.6 }],
          keyDrivers: [],
          modelConfidence: 0.8,
        },
      },
    ]

    expect(getLatestQueryResultForVersion('version-1', queries, results)?.query.id).toBe('query-2')
    expect(getLatestQueryResultForVersion('version-1', queries, results)?.result.id).toBe('result-2')
  })

  it('computes probability deltas across query results', () => {
    expect(
      getOutcomeDeltas(
        {
          outcomes: [{ label: 'Outcome A', probability: 0.7 }],
          keyDrivers: [],
          modelConfidence: 0.8,
        },
        {
          outcomes: [{ label: 'Outcome A', probability: 0.3 }],
          keyDrivers: [],
          modelConfidence: 0.7,
        },
      ),
    ).toEqual([
      {
        label: 'Outcome A',
        currentProbability: 0.7,
        previousProbability: 0.3,
        delta: expect.closeTo(0.4, 5),
      },
    ])
  })
})
