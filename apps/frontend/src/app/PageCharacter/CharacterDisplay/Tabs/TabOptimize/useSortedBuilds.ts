import { useState, useMemo, useContext } from 'react'
import { CharacterContext } from '../../../../Context/CharacterContext'
import type { ArtCharDatabase } from '../../../../Database/Database'
import { DatabaseContext } from '../../../../Database/Database'
import useBuildSetting from './useBuildSetting'
import useBuildResult from './useBuildResult'
import type { ICachedArtifact } from '../../../../Types/artifact'
import type { CharacterKey } from '@genshin-optimizer/consts'
import useTeamData from '../../../../ReactHooks/useTeamData'
import { getDisplaySections } from '../../../../Formula/DisplayUtil'
import type { UIData } from '../../../../Formula/uiData'

function BuildDataWrapper(
  characterKey: CharacterKey,
  build: string[],
  database: ArtCharDatabase,
  mainStatAssumptionLevel: number
) {
  const buildsArts = build
    .map((i) => database.arts.get(i))
    .filter((a) => a) as ICachedArtifact[]

  const teamData = useTeamData(
    characterKey,
    mainStatAssumptionLevel,
    buildsArts
  )
  const tdc = teamData?.[characterKey]
  return tdc.target
}

function GetSortBaseValue(
  buildData: UIData,
  sortBase: string[]
): number | undefined {
  const values = getDisplaySections(buildData).filter(([, ns]) =>
    Object.values(ns).some((n) => !n.isEmpty)
  )

  for (const [sectionKey, displayNs] of values) {
    for (const [nodeKey, n] of Object.entries(displayNs)) {
      if (JSON.stringify(sortBase) === JSON.stringify([sectionKey, nodeKey])) {
        return n.value
      }
    }
  }

  return undefined
}

export default function useSortedBuilds(sortOptions: {
  sortBase: string[]
  ascending: boolean
}) {
  const {
    character: { key: characterKey },
  } = useContext(CharacterContext)
  const { database } = useContext(DatabaseContext)
  const { buildSetting } = useBuildSetting(characterKey)
  const { mainStatAssumptionLevel } = buildSetting
  const {
    buildResult: { builds },
  } = useBuildResult(characterKey)

  const sortedBuildsWithValues = builds?.map((build) => {
    const buildData = BuildDataWrapper(
      characterKey,
      build,
      database,
      mainStatAssumptionLevel
    )
    const sortBaseValue = GetSortBaseValue(buildData, sortOptions.sortBase)
    return { build, sortBaseValue }
  })

  sortedBuildsWithValues.sort((a, b) => {
    const valueA = a.sortBaseValue || 0
    const valueB = b.sortBaseValue || 0
    return sortOptions.ascending ? valueA - valueB : valueB - valueA
  })

  return sortedBuildsWithValues.map((item) => item.build)
}
