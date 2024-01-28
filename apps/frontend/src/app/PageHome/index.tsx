import {
  Box,
  CardContent,
  Grid,
  Link,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import ReactGA from 'react-ga4'
import CardDark from '../Components/Card/CardDark'
import InventoryCard from './InventoryCard'

export default function PageHome() {
  const theme = useTheme()
  const lg = useMediaQuery(theme.breakpoints.up('lg'))
  ReactGA.send({ hitType: 'pageview', page: '/home' })
  if (lg)
    return (
      <Grid
        container
        spacing={2}
        direction={'row-reverse'}
        sx={{ my: 2 }}
        justifyContent="center"
        alignItems="center"
      >
        <Grid
          item
          xs={12}
          lg={7}
          xl={8}
          sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
        >
          <IntroCard />
          <InventoryCard />
        </Grid>
      </Grid>
    )
  return (
    <Box my={1} display="flex" flexDirection="column" gap={1}>
      <IntroCard />
      <InventoryCard />
    </Box>
  )
}

function IntroCard() {
  return (
    <CardDark>
      <CardContent>
        <Typography variant="subtitle1">
          The ultimate Genshin Impact calculator, GO will keep track of your
          artifact/weapon/character inventory, and help you create the best
          build based on how you play, with what you have.
        </Typography>
        <Typography variant="subtitle1" sx={{ marginTop: 2 }}>
          This was forked from{' '}
          <Link
            href="https://github.com/frzyc/genshin-optimizer"
            target="_blank"
            rel="noreferrer"
          >
            frzyc's Genshin Optimizer
          </Link>
        </Typography>
      </CardContent>
    </CardDark>
  )
}
