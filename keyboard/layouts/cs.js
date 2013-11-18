Keyboards.cs = {
  label: 'Czech',
  menuLabel: 'Česká',
  imEngine: 'latin',
  types: ['text', 'url', 'email'],
  autoCorrectLanguage: 'cs',
  alt: {
    a: 'á',
    c: 'čĉ',
    d: 'ď',
    e: 'éě',
    g: 'ĝ',
    h: 'ĥ',
    i: 'í',
    j: 'ĵ',
    n: 'ň',
    o: 'ó',
    r: 'ř',
    s: 'šŝ',
    t: 'ť',
    u: 'úŭů',
    y: 'ý',
    z: 'ž'
  },
  keys: [
    [
      { value: 'q' }, { value: 'w' }, { value: 'e' }, { value: 'r' },
      { value: 't' } , { value: 'y' }, { value: 'u' } , { value: 'i' },
      { value: 'o' }, { value: 'p' }
    ], [
      { value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' },
      { value: 'g' } , { value: 'h' }, { value: 'j' }, { value: 'k' },
      { value: 'l' }, { value: "'", keyCode: 39 }
    ], [
      { value: '&#8682;', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'z' }, { value: 'x' }, { value: 'c' }, { value: 'v' },
      { value: 'b' }, { value: 'n' }, { value: 'm' },
      { value: '&#9003;', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '&#8629;', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
