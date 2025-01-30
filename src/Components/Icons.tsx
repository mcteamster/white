import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined';
import CollectionsOutlinedIcon from '@mui/icons-material/CollectionsOutlined';
import CreateOutlinedIcon from '@mui/icons-material/CreateOutlined';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import MenuOutlinedIcon from '@mui/icons-material/MenuOutlined';
import PresentToAllOutlinedIcon from '@mui/icons-material/PresentToAllOutlined';
import RecyclingIcon from '@mui/icons-material/Recycling';
import SaveAltOutlinedIcon from '@mui/icons-material/SaveAltOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import { Properties } from 'csstype';

type IconName = 
  'add' | 
  'create' |
  'discard' | 
  'display' |
  'menu' |
  'play' | 
  'return' | 
  'settings' |
  'take';

export function Icon(props: { name: IconName }) {
  const icons = {
    add: <AddPhotoAlternateOutlinedIcon></AddPhotoAlternateOutlinedIcon>,
    create: <CreateOutlinedIcon></CreateOutlinedIcon>,
    discard: <DeleteForeverOutlinedIcon></DeleteForeverOutlinedIcon>,
    display: <PresentToAllOutlinedIcon></PresentToAllOutlinedIcon>,
    menu: <MenuOutlinedIcon></MenuOutlinedIcon>,
    play: <CollectionsOutlinedIcon></CollectionsOutlinedIcon>,
    return: <RecyclingIcon></RecyclingIcon>,
    settings: <SettingsOutlinedIcon></SettingsOutlinedIcon>,
    take: <SaveAltOutlinedIcon></SaveAltOutlinedIcon>,
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