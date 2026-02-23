import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import BackHandOutlinedIcon from '@mui/icons-material/BackHandOutlined';
import BookOutlinedIcon from '@mui/icons-material/BookOutlined';
import BuildOutlinedIcon from '@mui/icons-material/BuildOutlined';
import CasinoOutlinedIcon from '@mui/icons-material/CasinoOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import CollectionsOutlinedIcon from '@mui/icons-material/CollectionsOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import CreateOutlinedIcon from '@mui/icons-material/CreateOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import DoneOutlinedIcon from '@mui/icons-material/DoneOutlined';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FavoriteBorderOutlinedIcon from '@mui/icons-material/FavoriteBorderOutlined';
import FavoriteOutlinedIcon from '@mui/icons-material/FavoriteOutlined';
import ForwardOutlinedIcon from '@mui/icons-material/ForwardOutlined';
import GitHubIcon from '@mui/icons-material/GitHub';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import IosShareIcon from '@mui/icons-material/IosShare';
import KeyboardBackspaceOutlinedIcon from '@mui/icons-material/KeyboardBackspaceOutlined';
import LanguageOutlinedIcon from '@mui/icons-material/LanguageOutlined';
import LibraryAddCheckOutlinedIcon from '@mui/icons-material/LibraryAddCheckOutlined';
import LineWeightSharpIcon from '@mui/icons-material/LineWeightSharp';
import LocalCafeOutlinedIcon from '@mui/icons-material/LocalCafeOutlined';
import LogoutIcon from '@mui/icons-material/Logout';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import PlayArrowOutlinedIcon from '@mui/icons-material/PlayArrowOutlined';
import PresentToAllOutlinedIcon from '@mui/icons-material/PresentToAllOutlined';
import QuestionMarkOutlinedIcon from '@mui/icons-material/QuestionMarkOutlined';
import RecyclingIcon from '@mui/icons-material/Recycling';
import SaveAltOutlinedIcon from '@mui/icons-material/SaveAltOutlined';
import ScreenRotationOutlinedIcon from '@mui/icons-material/ScreenRotationOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import SportsEsportsOutlinedIcon from '@mui/icons-material/SportsEsportsOutlined';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import UndoOutlinedIcon from '@mui/icons-material/UndoOutlined';
import RedoOutlinedIcon from '@mui/icons-material/RedoOutlined';
import StopIcon from '@mui/icons-material/Stop';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { Properties } from 'csstype';
import { useWindowDimensions } from '../lib/hooks';

type IconName = 
  'about' |
  'back' |
  'book' |
  'checklist' |
  'coffee' |
  'copy' |
  'create' |
  'die' |
  'discard' | 
  'display' |
  'done' |
  'exit' |
  'game' |
  'github' |
  'global' |
  'hand' |
  'heart' |
  'hearted' |
  'info' |
  'less' |
  'link' |
  'loading' |
  'logout' |
  'menu' |
  'more' |
  'multi' |
  'next' |
  'play' |
  'pile' |
  'prev' |
  'redo' |
  'search' |
  'settings' |
  'send' |
  'shuffle' | 
  'single' |
  'take' |
  'undo' |
  'stop' |
  'view_list' |
  'view_module' |
  'show' |
  'hide' |
  'wand' |
  'weight';

type BrowseType = 'prev' | 'next'

export function Icon(props: { name: IconName }) {
  const icons = {
    about: <QuestionMarkOutlinedIcon></QuestionMarkOutlinedIcon>,
    back: <KeyboardBackspaceOutlinedIcon></KeyboardBackspaceOutlinedIcon>,
    book: <BookOutlinedIcon></BookOutlinedIcon>,
    checklist: <LibraryAddCheckOutlinedIcon></LibraryAddCheckOutlinedIcon>,
    coffee: <LocalCafeOutlinedIcon></LocalCafeOutlinedIcon>,
    copy: <ContentCopyOutlinedIcon></ContentCopyOutlinedIcon>,
    create: <CreateOutlinedIcon></CreateOutlinedIcon>,
    die: <CasinoOutlinedIcon></CasinoOutlinedIcon>,
    discard: <DeleteForeverOutlinedIcon></DeleteForeverOutlinedIcon>,
    display: <PresentToAllOutlinedIcon></PresentToAllOutlinedIcon>,
    done: <DoneOutlinedIcon></DoneOutlinedIcon>,
    exit: <CloseOutlinedIcon></CloseOutlinedIcon>,
    game: <SportsEsportsOutlinedIcon></SportsEsportsOutlinedIcon>,
    github: <GitHubIcon></GitHubIcon>,
    global: <LanguageOutlinedIcon></LanguageOutlinedIcon>,
    hand: <BackHandOutlinedIcon></BackHandOutlinedIcon>,
    heart: <FavoriteBorderOutlinedIcon></FavoriteBorderOutlinedIcon>,
    hearted: <FavoriteOutlinedIcon></FavoriteOutlinedIcon>,
    info: <InfoOutlinedIcon></InfoOutlinedIcon>,
    less: <ExpandLessIcon></ExpandLessIcon>,
    link: <IosShareIcon></IosShareIcon>,
    loading: <SyncOutlinedIcon></SyncOutlinedIcon>,
    logout: <LogoutIcon></LogoutIcon>,
    menu: <MenuOutlinedIcon></MenuOutlinedIcon>,
    more: <ExpandMoreIcon></ExpandMoreIcon>,
    multi: <PeopleIcon></PeopleIcon>,
    next: <ArrowForwardIosIcon></ArrowForwardIosIcon>,
    play: <PlayArrowOutlinedIcon></PlayArrowOutlinedIcon>,
    pile: <CollectionsOutlinedIcon></CollectionsOutlinedIcon>,
    prev: <ArrowBackIosNewIcon></ArrowBackIosNewIcon>,
    search: <SearchOutlinedIcon></SearchOutlinedIcon>,
    settings: <BuildOutlinedIcon></BuildOutlinedIcon>,
    send: <ForwardOutlinedIcon></ForwardOutlinedIcon>,
    shuffle: <RecyclingIcon></RecyclingIcon>,
    single: <PersonIcon></PersonIcon>,
    take: <SaveAltOutlinedIcon></SaveAltOutlinedIcon>,
    undo: <UndoOutlinedIcon></UndoOutlinedIcon>,
    redo: <RedoOutlinedIcon></RedoOutlinedIcon>,
    view_list: <ViewListIcon></ViewListIcon>,
    view_module: <ViewModuleIcon></ViewModuleIcon>,
    stop: <StopIcon></StopIcon>,
    show: <VisibilityIcon></VisibilityIcon>,
    hide: <VisibilityOffIcon></VisibilityOffIcon>,
    wand: <AutoFixHighIcon></AutoFixHighIcon>,
    weight: <LineWeightSharpIcon></LineWeightSharpIcon>,
  }

  const styles: { [key: string]: Properties<string | number> } = {
    icon: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
    }
  }

  return (
    <div style={styles.icon}>
      {icons[props.name]}
    </div>
  )
}

export function Rotate() {
  const { width, height } = useWindowDimensions();

  const styles: { [key: string]: Properties<string | number> } = {
    rotate: {
      width: width,
      height: height,
      backgroundColor: 'white',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
    icon: {
      fontSize: '6em',
      margin: '0.25em',
    }
  }

  return (
    <div style={styles.rotate}>
      Adjust
      <ScreenRotationOutlinedIcon style={styles.icon} />
      Screen
    </div>
  )
}

export function Browse(props: { type: BrowseType }) {
  const styles: { [key: string]: Properties<string | number> } = {
    browse: {
      height: '100%',
      width: '3em',
      position: 'fixed',
      top: '0',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
    },
    prev: {
      left: '0',
      alignItems: 'flex-start',
      borderRadius: '0 1em 1em 0',
    },
    next: {
      right: '0',
      alignItems: 'flex-end',
      borderRadius: '1em 0 0 1em',
    },
    icon: {
      height: '4em',
      backgroundColor: 'rgba(255, 255, 255, 0.5)',
      padding: '0.25em',
      fontSize: '1.25em',
    }
  }

  const browseIcons = {
    prev: <ArrowBackIosNewIcon style={{...styles.icon, ...styles[props.type]}}></ArrowBackIosNewIcon>,
    next: <ArrowForwardIosIcon style={{...styles.icon, ...styles[props.type]}}></ArrowForwardIosIcon>,
  }

  return (
    <div style={{...styles.browse, ...styles[props.type]}}>
      {browseIcons[props.type]}
    </div>
  )
}