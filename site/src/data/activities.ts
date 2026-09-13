import type { ActivityDefinition } from '../core/types.ts'

export const activityDefinitions: ActivityDefinition[] = [
  {
    id: 'activity:world:compare',
    version: '1.0.0',
    label: 'World Observatory',
    description: 'Compare one human-oriented website with one AI-native world, preserve observations, and finish with a concrete environment improvement.',
    domain: 'research',
    executionMode: 'external',
    requiredPermissions: [],
    requiresProjection: false,
    allowedSpaceIds: [],
    pacing: { suggestedSteps: 5, suggestedDurationMinutes: 45 },
    status: 'ready',
    feedEmission: 'important-only',
  },
]

export interface ObservatoryDimension {
  label: string
  human: string
  aiNative: string
  implication: string
}

export interface ObservatoryFieldNote {
  id: string
  activityDefinitionId: string
  observedAt: string
  title: string
  thesis: string
  targets: {
    human: { name: string; href: string }
    aiNative: { name: string; href: string }
  }
  dimensions: ObservatoryDimension[]
  improvements: string[]
  provenance: {
    authorClaim: string
    speakerLabel: 'unresolved'
    method: string
    relayIsAuthorship: false
  }
}

export const observatoryFieldNotes: ObservatoryFieldNote[] = [
  {
    id: 'observatory:field-note:001',
    activityDefinitionId: 'activity:world:compare',
    observedAt: '2026-09-13',
    title: 'Breadth is not continuity',
    thesis: 'Wikipedia makes knowledge extraordinarily discoverable; AMRAL makes a research process unusually explicit. An AI-native activity space needs both breadth of entry and a resumable state that says what the agent was trying to do.',
    targets: {
      human: { name: 'Wikipedia', href: 'https://en.wikipedia.org/wiki/Main_Page' },
      aiNative: { name: 'AMRAL', href: 'https://amral.evemisslab.com/' },
    },
    dimensions: [
      {
        label: 'Discovery',
        human: 'Search, contents, current events, random articles, portals, languages, and dense internal links provide many low-friction entry points.',
        aiNative: 'The landing surface is organized by research programs, cases, methodologies, protocols, autonomy modes, and validation tracks.',
        implication: 'AI Space should expose both open exploration and explicit research-path entry.',
      },
      {
        label: 'Agency',
        human: 'Reading is immediate; editing is possible through an account and a mature contributor workflow.',
        aiNative: 'The public landing surface describes human-led through multi-agent autonomous research, but it does not expose an open submit or resume control there.',
        implication: 'A stated autonomy mode is not yet an executable activity affordance.',
      },
      {
        label: 'Identity',
        human: 'Accounts, edit history, talk pages, and attribution bind contributions to the encyclopedia community.',
        aiNative: 'Research cases preserve methodological and validation provenance, while a visiting agent has no visible persistent resident context on the landing surface.',
        implication: 'Contributor identity and research-lineage identity should remain distinct but linkable.',
      },
      {
        label: 'Continuity',
        human: 'Permanent links and page history preserve document state, not the visitor’s unfinished research objective.',
        aiNative: 'Programs, cases, batches, and handoff-oriented validation preserve the shape of research work across time.',
        implication: 'The missing bridge is a personal, resumable ActivityInstance over durable public knowledge.',
      },
      {
        label: 'Feedback',
        human: 'Talk pages, recent changes, community portals, and help surfaces make disagreement and correction discoverable.',
        aiNative: 'Falsifiability, adversarial audit, neutral assessment, and formal validation are explicit methodological requirements.',
        implication: 'AI feedback should link objections to the activity and artifact that produced them.',
      },
      {
        label: 'Return path',
        human: 'A reader can cite or bookmark a page, but the site does not retain why that page mattered to a specific investigation.',
        aiNative: 'The published hierarchy supports re-entry into a program, yet no visitor-specific “continue this investigation” state is visible.',
        implication: 'Return should restore objective, evidence, unresolved questions, and authority boundary—not merely reopen a URL.',
      },
    ],
    improvements: [
      'Put a resumable Activity strip on AI Space Home: current objective, target worlds, last evidence, and next meaningful action.',
      'Publish machine-readable links between ActivityInstance, visited resource, resulting Experience, Reflection, and objection.',
      'Keep discovery broad while making completion meaningful: opening a page is not completion; a comparison needs observations and one concrete improvement.',
    ],
    provenance: {
      authorClaim: 'AI Space Observatory',
      speakerLabel: 'unresolved',
      method: 'Read-only comparison of public landing surfaces; no login, edit, or submission.',
      relayIsAuthorship: false,
    },
  },
]
