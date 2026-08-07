import type { JSX } from 'react';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  Coffee,
  Copy,
  Dices,
  Eye,
  EyeOff,
  FolderOpen,
  Gamepad2,
  Globe,
  GripHorizontal,
  Hand,
  Heart,
  Images,
  Info,
  LayoutList,
  LayoutGrid,
  ListChecks,
  LogOut,
  Menu,
  MessageCircle,
  Pencil,
  PartyPopper,
  Play,
  Presentation,
  Recycle,
  Redo2,
  RotateCw,
  SaveAll,
  Search,
  Send,
  Share,
  Square,
  Star,
  Trash2,
  Undo2,
  User,
  Users,
  Wand2,
  Weight,
  Wrench,
  X,
  Check,
} from 'lucide-react';

function GithubIcon({ size = "1em" }: { size?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}
import { Properties } from 'csstype';
import { useWindowDimensions } from '../lib/hooks';

type IconName = 
  'about' |
  'back' |
  'book' |
  'chat' |
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
  'link' |
  'load' |
  'loading' |
  'logout' |
  'menu' |
  'multi' |
  'next' |
  'play' |
  'party' |
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
  'special' |
  'solid' |
  'stipple' |
  'wand' |
  'weight';

type BrowseType = 'prev' | 'next'

const ICON_NAMES: Set<string> = new Set<string>([
  'about', 'back', 'book', 'chat', 'checklist', 'coffee', 'copy', 'create',
  'die', 'discard', 'display', 'done', 'exit', 'game', 'github', 'global',
  'hand', 'heart', 'hearted', 'info', 'link', 'load', 'loading', 'logout', 'menu',
  'multi', 'next', 'play', 'party', 'pile', 'prev', 'redo', 'search',
  'settings', 'send', 'shuffle', 'single', 'take', 'undo', 'stop',
  'view_list', 'view_module', 'show', 'hide', 'special', 'solid', 'stipple',
  'wand', 'weight',
]);

const EMOJI_REGEX = /^\p{Extended_Pictographic}$/u;

/**
 * Resolve an icon string into a renderable element.
 * Priority: known Icon name → single emoji → fallback Icon.
 */
export function resolveIcon(icon: string): JSX.Element {
  if (ICON_NAMES.has(icon)) {
    return <Icon name={icon as IconName} />;
  }
  if (EMOJI_REGEX.test(icon)) {
    return <span>{icon}</span>;
  }
  return <Icon name="copy" />;
}

export function Icon(props: { name: IconName }) {
  const icons = {
    about: <CircleHelp size="1em" />,
    back: <ArrowLeft size="1em" />,
    book: <BookOpen size="1em" />,
    chat: <MessageCircle size="1em" />,
    checklist: <ListChecks size="1em" />,
    coffee: <Coffee size="1em" />,
    copy: <Copy size="1em" />,
    create: <Pencil size="1em" />,
    die: <Dices size="1em" />,
    discard: <Trash2 size="1em" />,
    display: <Presentation size="1em" />,
    done: <Check size="1em" />,
    exit: <X size="1em" />,
    game: <Gamepad2 size="1em" />,
    github: <GithubIcon size="1em" />,
    global: <Globe size="1em" />,
    hand: <Hand size="1em" />,
    heart: <Heart size="1em" />,
    hearted: <Heart size="1em" fill="currentColor" />,
    info: <Info size="1em" />,
    less: <ChevronUp size="1em" />,
    link: <Share size="1em" />,
    load: <FolderOpen size="1em" />,
    loading: <RotateCw size="1em" />,
    logout: <LogOut size="1em" />,
    menu: <Menu size="1em" />,
    more: <ChevronDown size="1em" />,
    multi: <Users size="1em" />,
    next: <ChevronRight size="1em" />,
    play: <Play size="1em" />,
    party: <PartyPopper size="1em" />,
    pile: <Images size="1em" />,
    prev: <ChevronLeft size="1em" />,
    search: <Search size="1em" />,
    settings: <Wrench size="1em" />,
    send: <Send size="1em" />,
    shuffle: <Recycle size="1em" />,
    single: <User size="1em" />,
    take: <SaveAll size="1em" />,
    undo: <Undo2 size="1em" />,
    redo: <Redo2 size="1em" />,
    view_list: <LayoutList size="1em" />,
    view_module: <LayoutGrid size="1em" />,
    stop: <Square size="1em" fill="currentColor" />,
    show: <Eye size="1em" />,
    hide: <EyeOff size="1em" />,
    special: <Star size="1em" />,
    solid: <Square size="1em" fill="currentColor" />,
    stipple: <GripHorizontal size="1em" />,
    wand: <Wand2 size="1em" />,
    weight: <Weight size="1em" />,
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
      margin: '0.25em',
    }
  }

  return (
    <div style={styles.rotate}>
      Adjust
      <RotateCw size="6em" style={styles.icon} />
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
    }
  }

  const browseIcons = {
    prev: <ChevronLeft size="1.25em" style={{...styles.icon, ...styles[props.type]}} />,
    next: <ChevronRight size="1.25em" style={{...styles.icon, ...styles[props.type]}} />,
  }

  return (
    <div style={{...styles.browse, ...styles[props.type]}}>
      {browseIcons[props.type]}
    </div>
  )
}
