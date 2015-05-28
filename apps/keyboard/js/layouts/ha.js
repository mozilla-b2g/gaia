Keyboards.ha = {
  label: 'Hausa',
  shortLabel: 'Ha',
  imEngine: 'latin',
  types: ['text', 'url', 'email', 'password'],
  menuLabel: 'Hausa',
  lang: 'ha',
  pages: [ {
    alt: {
      k: 'ƙ',
      y: 'ƴ',
      'ɗ': 'x',
      'ɓ': 'v',
      '.': ',?!;:…'
    },
    keys: [
      [
	{ value: 'q' }, { value: 'w' }, { value: 'e' }, { value: 'r' },
	{ value: 't' }, { value: 'y' }, { value: 'u' }, { value: 'i' },
	{ value: 'o' }, { value: 'p' }
      ], [
	{ value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' },
	{ value: 'g' }, { value: 'h' }, { value: 'j' }, { value: 'k' },
	{ value: 'l' }
      ], [
	{ value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
	{ value: 'z' }, { value: 'ɗ' }, { value: 'c' }, { value: 'ɓ' },
	{ value: 'b' }, { value: 'n' }, { value: 'm' },
	{ value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
	{ value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
	{ value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  } ]
};
