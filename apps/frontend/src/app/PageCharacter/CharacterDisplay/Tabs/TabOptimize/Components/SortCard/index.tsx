import { Replay } from '@mui/icons-material'
import { Button, CardContent, Grid, Typography } from '@mui/material'
import { useTranslation } from 'react-i18next'
import BootstrapTooltip from '../../../../../../Components/BootstrapTooltip'
import CardLight from '../../../../../../Components/Card/CardLight'
import SortIcon from '@mui/icons-material/Sort'
import OptimizationTargetSelector from '../OptimizationTargetSelector'

type SortCardProps = {
  sortOptions: { sortBase: string[]; ascending: boolean }
  setSortOptions: (
    prevOptions: (prev: { sortBase: string[]; ascending: boolean }) => {
      sortBase: string[]
      ascending: boolean
    }
  ) => void
  optimizationTarget?: string[]
}

export default function SortCard({
  sortOptions,
  setSortOptions,
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
                optimizationTarget={sortOptions.sortBase}
                setTarget={(target) => {
                  setSortOptions((prevOptions) => ({
                    ...prevOptions,
                    sortBase: target,
                  }))
                }}
                defaultText={'Select a Sort Target'}
                disabled={false}
              />
            </span>
          </Grid>
          <Grid item>
            <Button
              onClick={() => {
                setSortOptions((prevOptions) => ({
                  ...prevOptions,
                  ascending: !prevOptions.ascending,
                }))
              }}
              startIcon={
                <SortIcon
                  sx={{
                    transform: sortOptions.ascending
                      ? 'scale(1, -1)'
                      : 'scale(1)',
                  }}
                />
              }
            >
              {sortOptions.ascending ? t('ui:Ascending') : t('ui:Descending')}
            </Button>
          </Grid>
          <Grid item>
            <BootstrapTooltip
              title={!sortOptions.sortBase ? '' : t('ui:reset')}
              placement="top"
            >
              <span>
                <Button
                  color="error"
                  onClick={() => {
                    localStorage.removeItem('sortValues')
                    setSortOptions((prevOptions) => ({
                      ...prevOptions,
                      sortBase: optimizationTarget,
                      ascending: false,
                    }))
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
