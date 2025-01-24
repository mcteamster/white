import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RecyclingIcon from '@mui/icons-material/Recycling';
import PublishIcon from '@mui/icons-material/Publish';
import DownloadIcon from '@mui/icons-material/Download';
import LibraryAddIcon from '@mui/icons-material/LibraryAdd';
import { Properties } from 'csstype';

type IconName = 'discard' | 'return' | 'play' | 'take' | 'add';

export function Icon(props: { name: IconName }) {
  const icons = {
    discard: <DeleteOutlineIcon></DeleteOutlineIcon>,
    return: <RecyclingIcon></RecyclingIcon>,
    play: <PublishIcon></PublishIcon>,
    take: <DownloadIcon></DownloadIcon>,
    add: <LibraryAddIcon></LibraryAddIcon>
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