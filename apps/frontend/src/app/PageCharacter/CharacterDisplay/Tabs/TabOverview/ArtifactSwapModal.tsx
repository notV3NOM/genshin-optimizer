import type { ArtifactSlotKey } from '@genshin-optimizer/consts'
import { imgAssets } from '@genshin-optimizer/gi-assets'
import { useForceUpdate, useMediaQueryUp } from '@genshin-optimizer/react-util'
import { clamp, filterFunction } from '@genshin-optimizer/util'
import {
  Box,
  CardContent,
  Divider,
  Grid,
  Pagination,
  Skeleton,
  Typography,
} from '@mui/material'
import {
  lazy,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { Trans, useTranslation } from 'react-i18next'
import CardDark from '../../../../Components/Card/CardDark'
import CloseButton from '../../../../Components/CloseButton'
import ImgIcon from '../../../../Components/Image/ImgIcon'
import ModalWrapper from '../../../../Components/ModalWrapper'
import { DatabaseContext } from '../../../../Database/Database'
import ArtifactCard from '../../../../PageArtifact/ArtifactCard'
import type { FilterOption } from '../../../../PageArtifact/ArtifactSort'
import {
  artifactFilterConfigs,
  initialFilterOption,
} from '../../../../PageArtifact/ArtifactSort'
import CompareBuildButton from './CompareBuildButton'

const numToShowMap = { xs: 2 * 3, sm: 2 * 3, md: 3 * 3, lg: 4 * 3, xl: 4 * 3 }
const ArtifactFilterDisplay = lazy(
  () => import('../../../../Components/Artifact/ArtifactFilterDisplay')
)

export default function ArtifactSwapModal({
  onChangeId,
  slotKey,
  show,
  onClose,
}: {
  onChangeId: (id: string) => void
  slotKey: ArtifactSlotKey
  show: boolean
  onClose: () => void
}) {
  const { t } = useTranslation('page_character')
  const { t: tk } = useTranslation('artifact')
  const { database } = useContext(DatabaseContext)
  const clickHandler = useCallback(
    (id) => {
      onChangeId(id)
      onClose()
    },
    [onChangeId, onClose]
  )
  const filterOptionReducer = useCallback(
    (state, action) => ({ ...state, ...action, slotKeys: [slotKey] }),
    [slotKey]
  )

  const [filterOption, filterOptionDispatch]: [
    FilterOption,
    (action: any) => void
  ] = useReducer(filterOptionReducer, {
    ...initialFilterOption(),
    slotKeys: [slotKey],
  })

  const [dbDirty, forceUpdate] = useForceUpdate()
  useEffect(() => {
    return database.arts.followAny(forceUpdate)
  }, [database, forceUpdate])

  const brPt = useMediaQueryUp()
  const maxNumArtifactsToDisplay = numToShowMap[brPt]

  const [pageIdex, setpageIdex] = useState(0)
  const invScrollRef = useRef<HTMLDivElement>(null)

  const filterConfigs = useMemo(() => artifactFilterConfigs(), [])
  const totalArtNum = database.arts.values.filter(
    (s) => s.slotKey === filterOption.slotKeys[0]
  ).length
  const artIdList = useMemo(() => {
    const filterFunc = filterFunction(filterOption, filterConfigs)
    return (
      dbDirty && database.arts.values.filter(filterFunc).map((art) => art.id)
    )
  }, [dbDirty, database, filterConfigs, filterOption])

  const { artifactIdsToShow, numPages, currentPageIndex } = useMemo(() => {
    const numPages = Math.ceil(artIdList.length / maxNumArtifactsToDisplay)
    const currentPageIndex = clamp(pageIdex, 0, numPages - 1)
    return {
      artifactIdsToShow: artIdList.slice(
        currentPageIndex * maxNumArtifactsToDisplay,
        (currentPageIndex + 1) * maxNumArtifactsToDisplay
      ),
      numPages,
      currentPageIndex,
    }
  }, [artIdList, pageIdex, maxNumArtifactsToDisplay])

  // for pagination
  const totalShowing =
    artIdList.length !== totalArtNum
      ? `${artIdList.length}/${totalArtNum}`
      : `${totalArtNum}`
  const setPage = useCallback(
    (e, value) => {
      invScrollRef.current?.scrollIntoView({ behavior: 'smooth' })
      setpageIdex(value - 1)
    },
    [setpageIdex, invScrollRef]
  )

  return (
    <ModalWrapper
      open={show}
      onClose={onClose}
      containerProps={{ maxWidth: 'xl' }}
    >
      <CardDark>
        <CardContent
          sx={{
            py: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Typography variant="h6">
            {slotKey ? <ImgIcon src={imgAssets.slot[slotKey]} /> : null}{' '}
            {t`tabEquip.swapArt`}
          </Typography>
          <CloseButton onClick={onClose} />
        </CardContent>
        <Divider />
        <CardContent>
          <Suspense
            fallback={
              <Skeleton variant="rectangular" width="100%" height={200} />
            }
          >
            <ArtifactFilterDisplay
              filterOption={filterOption}
              filterOptionDispatch={filterOptionDispatch}
              filteredIds={artIdList}
              disableSlotFilter
            />
          </Suspense>
        </CardContent>
        <Divider />
        <CardContent>
          <Grid container alignItems="center" sx={{ pb: 1 }}>
            <Grid item flexGrow={1}>
              <Pagination
                count={numPages}
                page={currentPageIndex + 1}
                onChange={setPage}
              />
            </Grid>
            <Grid item flexGrow={1}>
              <ShowingArt
                numShowing={artifactIdsToShow.length}
                total={totalShowing}
                t={tk}
              />
            </Grid>
          </Grid>
          <Box mt={1}>
            <Suspense
              fallback={
                <Skeleton variant="rectangular" width="100%" height={300} />
              }
            >
              <Grid container spacing={1} columns={{ xs: 2, md: 3, lg: 4 }}>
                {artifactIdsToShow.map((id) => (
                  <Grid item key={id} xs={1}>
                    <ArtifactCard
                      artifactId={id}
                      extraButtons={<CompareBuildButton artId={id} />}
                      onClick={clickHandler}
                    />
                  </Grid>
                ))}
              </Grid>
            </Suspense>
          </Box>
          {numPages > 1 && (
            <CardContent>
              <Grid container>
                <Grid item flexGrow={1}>
                  <Pagination
                    count={numPages}
                    page={currentPageIndex + 1}
                    onChange={setPage}
                  />
                </Grid>
                <Grid item>
                  <ShowingArt
                    numShowing={artifactIdsToShow.length}
                    total={totalShowing}
                    t={tk}
                  />
                </Grid>
              </Grid>
            </CardContent>
          )}
        </CardContent>
      </CardDark>
    </ModalWrapper>
  )
}

function ShowingArt({ numShowing, total, t }) {
  return (
    <Typography color="text.secondary">
      <Trans t={t} i18nKey="showingNum" count={numShowing} value={total}>
        Showing <b>{{ count: numShowing } as TransObject}</b> out of{' '}
        {{ value: total } as TransObject} Artifacts
      </Trans>
    </Typography>
  )
}
