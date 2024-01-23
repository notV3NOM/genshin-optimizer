import { Replay } from '@mui/icons-material'
import { Button, CardContent, Grid, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import BootstrapTooltip from '../../../../../../Components/BootstrapTooltip'
import CardLight from '../../../../../../Components/Card/CardLight'
import SortIcon from '@mui/icons-material/Sort'
import OptimizationTargetSelector from '../OptimizationTargetSelector'
import { useContext } from 'react'
import { CharacterContext } from '../../../../../../Context/CharacterContext'
import useBuildSetting from '../../useBuildSetting'

export default function SortCard() {
  const { t } = useTranslation(['page_character_optimize', 'ui'])
  const {
    character: { key: characterKey },
  } = useContext(CharacterContext)
  const { buildSetting, buildSettingDispatch } = useBuildSetting(characterKey)
  const { optimizationTarget, sortBase, sortAsc } = buildSetting

  return (
    <CardLight>
      <CardContent>
        <Grid container spacing={1} alignItems="center">
          <Grid item>
            <Typography>{'Sort Builds by'}</Typography>
          </Grid>
          <Grid item>
            <span>
              <OptimizationTargetSelector
                optimizationTarget={sortBase}
                setTarget={(target) => {
                  buildSettingDispatch({ sortBase: target })
                }}
                defaultText={'Select a Sort Target'}
                disabled={false}
              />
            </span>
          </Grid>
          <Grid item>
            <Button
              onClick={() => {
                buildSettingDispatch({ sortAsc: !sortAsc })
              }}
              startIcon={
                <SortIcon
                  sx={{
                    transform: sortAsc ? 'scale(1, -1)' : 'scale(1)',
                  }}
                />
              }
            >
              {sortAsc ? t('ui:Ascending') : t('ui:Descending')}
            </Button>
          </Grid>
          <Grid item>
            <BootstrapTooltip
              title={!sortBase ? '' : t('ui:reset')}
              placement="top"
            >
              <span>
                <Button
                  color="error"
                  onClick={() => {
                    localStorage.removeItem('sortValues')
                    buildSettingDispatch({
                      sortBase: optimizationTarget,
                      sortAsc: false,
                    })
                  }}
                  disabled={false}
                >
                  <Replay />
                </Button>
              </span>
            </BootstrapTooltip>
          </Grid>
        </Grid>
      </CardContent>
    </CardLight>
  )
}
