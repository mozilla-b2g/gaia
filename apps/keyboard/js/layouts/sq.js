Keyboards.sq = {
  label: 'Albanian',
  shortLabel: 'Sq',
  imEngine: 'latin',
  types: ['text', 'url', 'email', 'password'],
  menuLabel: 'Shqip',
  width: 11,
  alt: {
    a: 'áàâäåãāæ',
    c: 'ćč',
    e: '€éèêēęɛ',
    i: 'ïíìîīį',
    o: 'öóòôōœøɵ',
    u: 'üúùûū',
    s: 'ßśš$',
    S: '$ŚŠ',
    n: 'ñń',
    l: 'ł£',
    y: 'ÿ¥',
    z: 'žźż',
    '.': ',?!;:…'
  },
  keys: [
    [
      { value: 'q' }, { value: 'w' }, { value: 'e' }, { value: 'r' },
      { value: 't' }, { value: 'z' }, { value: 'u' }, { value: 'i' },
      { value: 'o' }, { value: 'p' }, { value: 'ç' }
    ], [
      { value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' },
      { value: 'g' }, { value: 'h' }, { value: 'j' }, { value: 'k' },
      { value: 'l' }, { value: 'ë' }
    ], [
      { value: '⇪', ratio: 2, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'y' }, { value: 'x' }, { value: 'c' },
      { value: 'v' }, { value: 'b' }, { value: 'n' }, { value: 'm' },
      { value: '⌫', ratio: 2, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
