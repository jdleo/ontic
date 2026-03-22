import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { OnticApp } from './OnticApp'

describe('OnticApp', () => {
  it('renders the three-region shell copy', () => {
    const markup = renderToStaticMarkup(<OnticApp />)

    expect(markup).toContain('Ontic Workspace')
    expect(markup).toContain('World controls')
    expect(markup).toContain('Ontology graph surface')
    expect(markup).toContain('Query, mutate, inspect, results')
  })
})
