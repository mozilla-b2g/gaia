Keyboards['en-Colemak'] = {
  label: 'English - Colemak',
  shortLabel: 'En',
  menuLabel: 'Colemak',
  imEngine: 'latin',
  types: ['text', 'url', 'email', 'password'],
  autoCorrectLanguage: 'en_us',
  alt: {
    a: 'áàâäåãāæ',
    c: 'çćč',
    e: 'éèêëēę€ɛ',
    i: 'ïíìîīį',
    o: 'öóòôōőœøɵ',
    u: 'üúùûűū',
    s: 'ßśš$',
    S: 'ŚŠ$',
    n: 'ñń',
    l: 'ł£',
    y: 'ÿ¥',
    z: 'žźż',
    '.': ',?!:)(…'
  },
  keys: [
    [
      { value: 'q' }, { value: 'w' }, { value: 'f' } , { value: 'p' },
      { value: 'g' } , { value: 'j' }, { value: 'l' } , { value: 'u' },
      { value: 'y' }, { value: ';' }
    ], [
      { value: 'a' }, { value: 'r' }, { value: 's' }, { value: 't' },
      { value: 'd' } , { value: 'h' }, { value: 'n' }, { value: 'e' },
      { value: 'i' },
      { value: 'o',}
    ], [
      { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'z' }, { value: 'x' }, { value: 'c' }, { value: 'v' },
      { value: 'b' }, { value: 'k' }, { value: 'm' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
