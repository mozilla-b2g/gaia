Keyboards['tr-F'] = {
  label: 'Turkish F',
  imEngine: 'latin',
  types: ['text', 'url', 'email'],
  autoCorrectLanguage: 'tr',
  menuLabel: 'Türkçe F',
  upperCase: {
    'i': 'İ'
  },
  alt: {
    d: '¥',
    i: 'ß',
    f: '@',
    j: '«',
    ö: '»',
    p: '£',
    s: 'μ',
    v: '¢',
    u: 'æ',
    '.': ',?!;:'
  },
  width: 12,
  keys: [
    [
      { value: 'f' }, { value: 'g' }, { value: 'ğ' }, { value: 'ı' },
      { value: 'o' }, { value: 'd' }, { value: 'r' }, { value: 'n' },
      { value: 'h' }, { value: 'p' }, { value: 'q' }, { value: 'w' }
    ], [
      { value: 'u' }, { value: 'i' }, { value: 'e' }, { value: 'a' },
      { value: 'ü' }, { value: 't' }, { value: 'k' }, { value: 'm' },
      { value: 'l' }, { value: 'y' }, { value: 'ş' }, { value: 'x' }
    ], [
      { value: '⇪', ratio: 2, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'j' }, { value: 'ö' }, { value: 'v' }, { value: 'c' },
      { value: 'ç' }, { value: 'z' }, { value: 's' }, { value: 'b'},
      { value: '⌫', ratio: 2, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 9.5, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2.5, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
