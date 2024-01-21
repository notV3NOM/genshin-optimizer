import { Replay } from '@mui/icons-material'
import { Button, CardContent, Grid, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import BootstrapTooltip from '../../../../../../Components/BootstrapTooltip'
import CardLight from '../../../../../../Components/Card/CardLight'
import SortIcon from '@mui/icons-material/Sort'
import OptimizationTargetSelector from '../OptimizationTargetSelector'

type SortCardProps = {
  sortBase?: string[]
  setSortBase: (path: string[] | undefined) => void
  ascending: boolean
  setAscending: (ascending: boolean) => void
  optimizationTarget?: string[]
}

export default function SortCard({
  sortBase,
  setSortBase,
  ascending,
  setAscending,
  optimizationTarget,
}: SortCardProps) {
  const { t } = useTranslation(['page_character_optimize', 'ui'])

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
                setTarget={(target) => setSortBase(target)}
                defaultText={'Select a Sort Target'}
                disabled={false}
              />
            </span>
          </Grid>
          <Grid item>
            <Button
              onClick={() => setAscending(!ascending)}
              startIcon={
                <SortIcon
                  sx={{ transform: ascending ? 'scale(1, -1)' : 'scale(1)' }}
                />
              }
            >
              {ascending ? t('ui:Ascending') : t('ui:Descending')}
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
                    setSortBase(optimizationTarget)
                    setAscending(false)
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
