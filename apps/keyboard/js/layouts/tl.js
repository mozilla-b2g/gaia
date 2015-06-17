Keyboards.tl = {
  label: 'Tagalog',
  shortLabel: 'Tl',
  imEngine: 'latin',
  types: ['text', 'url', 'email', 'password'],
  autoCorrectLanguage: 'tl',
  menuLabel: 'Tagalog',
  lang: 'tl',
  pages: [ {
    alt: {
      a: ['á', 'à', 'ä', 'â', 'ã', 'å', 'ą', 'æ', 'ā', 'ª'],
      o: ['ó', 'ò', 'ö', 'ô', 'õ', 'ø', 'œ', 'ō', 'º'],
      u: ['ú', 'ü', 'ù', 'û', 'ū'],
      e: ['é', 'è', 'ë', 'ê', 'ę', 'ė', 'ē'],
      i: ['í', 'ï', 'ì', 'î', 'į', 'ī'],
      c: ['ç', 'ć', 'č'],
      n: ['ñ', 'ń'],
      '.': ['\'', ',', '?', '!', ';', ':', '…']
    },
    keys: [
      [
	{ value: 'q' }, { value: 'w' }, { value: 'e' }, { value: 'r' },
	{ value: 't' }, { value: 'y' }, { value: 'u' }, { value: 'i' },
	{ value: 'o' }, { value: 'p' }
      ], [
	{ value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' },
	{ value: 'g' }, { value: 'h' }, { value: 'j' }, { value: 'k' },
	{ value: 'l' }, { value: 'ñ' }
      ], [
	{ value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
	{ value: 'z' }, { value: 'x' }, { value: 'c' }, { value: 'v' },
	{ value: 'b' }, { value: 'n' }, { value: 'm' },
	{ value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
	{ value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
	{ value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ] 
  } ]  
};
