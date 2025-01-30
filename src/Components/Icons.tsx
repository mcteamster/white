import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RecyclingIcon from '@mui/icons-material/Recycling';
import PublishIcon from '@mui/icons-material/Publish';
import DownloadIcon from '@mui/icons-material/Download';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import CreateIcon from '@mui/icons-material/Create';
import { Properties } from 'csstype';

type IconName = 
  'add' | 
  'create' |
  'discard' | 
  'play' | 
  'return' | 
  'take';

export function Icon(props: { name: IconName }) {
  const icons = {
    add: <LibraryAddIcon></LibraryAddIcon>,
    create: <CreateIcon></CreateIcon>,
    discard: <DeleteOutlineIcon></DeleteOutlineIcon>,
    play: <PublishIcon></PublishIcon>,
    return: <RecyclingIcon></RecyclingIcon>,
    take: <DownloadIcon></DownloadIcon>,
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