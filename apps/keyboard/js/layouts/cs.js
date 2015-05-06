Keyboards.cs = {
  label: 'Czech',
  shortLabel: 'Cs',
  menuLabel: 'Česká',
  imEngine: 'latin',
  types: ['text', 'url', 'email', 'password'],
  autoCorrectLanguage: 'cs',
  lang: 'cs',
  alt: {
    a: 'á',
    c: 'č',
    d: 'ď',
    e: 'éě',
    i: 'í',
    n: 'ň',
    o: 'ó',
    r: 'ř',
    s: 'š',
    t: 'ť',
    u: 'úů',
    y: 'ý',
    z: 'ž',
    '.': ',?!;:…'
  },
  keys: [
    [
      { value: 'q' }, { value: 'w' }, { value: 'e' }, { value: 'r' },
      { value: 't' }, { value: 'z' }, { value: 'u' } , { value: 'i' },
      { value: 'o' }, { value: 'p' }
    ], [
      { value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' },
      { value: 'g' }, { value: 'h' }, { value: 'j' }, { value: 'k' },
      { value: 'l' }
    ], [
      { value: '&#8682;', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'y' }, { value: 'x' }, { value: 'c' }, { value: 'v' },
      { value: 'b' }, { value: 'n' }, { value: 'm' },
      { value: '&#9003;', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '&#8629;', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
