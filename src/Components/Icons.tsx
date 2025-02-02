import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import CollectionsOutlinedIcon from '@mui/icons-material/CollectionsOutlined';
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined';
import CreateOutlinedIcon from '@mui/icons-material/CreateOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import DoneOutlinedIcon from '@mui/icons-material/DoneOutlined';
import ForwardOutlinedIcon from '@mui/icons-material/ForwardOutlined';
import KeyboardBackspaceOutlinedIcon from '@mui/icons-material/KeyboardBackspaceOutlined';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import PlayCircleFilledWhiteOutlinedIcon from '@mui/icons-material/PlayCircleFilledWhiteOutlined';
import PresentToAllOutlinedIcon from '@mui/icons-material/PresentToAllOutlined';
import RecyclingIcon from '@mui/icons-material/Recycling';
import SaveAltOutlinedIcon from '@mui/icons-material/SaveAltOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import UndoOutlinedIcon from '@mui/icons-material/UndoOutlined';
import { Properties } from 'csstype';

type IconName = 
  'back' |
  'copy' |
  'create' |
  'discard' | 
  'display' |
  'done' |
  'exit' |
  'menu' |
  'multi' |
  'play' |
  'pile' |
  'settings' |
  'send' |
  'shuffle' | 
  'single' |
  'take' |
  'undo';

export function Icon(props: { name: IconName }) {
  const icons = {
    back: <KeyboardBackspaceOutlinedIcon></KeyboardBackspaceOutlinedIcon>,
    copy: <ContentCopyOutlinedIcon></ContentCopyOutlinedIcon>,
    create: <CreateOutlinedIcon></CreateOutlinedIcon>,
    discard: <DeleteForeverOutlinedIcon></DeleteForeverOutlinedIcon>,
    display: <PresentToAllOutlinedIcon></PresentToAllOutlinedIcon>,
    done: <DoneOutlinedIcon></DoneOutlinedIcon>,
    exit: <CloseOutlinedIcon></CloseOutlinedIcon>,
    menu: <MenuOutlinedIcon></MenuOutlinedIcon>,
    multi: <PeopleIcon></PeopleIcon>,
    play: <PlayCircleFilledWhiteOutlinedIcon></PlayCircleFilledWhiteOutlinedIcon>,
    pile: <CollectionsOutlinedIcon></CollectionsOutlinedIcon>,
    settings: <SettingsOutlinedIcon></SettingsOutlinedIcon>,
    send: <ForwardOutlinedIcon></ForwardOutlinedIcon>,
    shuffle: <RecyclingIcon></RecyclingIcon>,
    single: <PersonIcon></PersonIcon>,
    take: <SaveAltOutlinedIcon></SaveAltOutlinedIcon>,
    undo: <UndoOutlinedIcon></UndoOutlinedIcon>,
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