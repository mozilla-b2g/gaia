Keyboards.sk = {
  label: 'Slovak',
  imEngine: 'latin',
  types: ['text', 'url', 'email'],
  autoCorrectLanguage: 'sk',
  menuLabel: 'Slovenčina',
  alt: {
    a: 'áä',
    c: 'č',
    d: 'ď',
    e: 'é',
    i: 'í',
    l: 'ľĺ',
    n: 'ň',
    o: 'óô',
    r: 'ŕ',
    s: 'š',
    t: 'ť',
    u: 'ú',
    y: 'ý',
    z: 'ž'
  },
  keys: [
    [
      { value: 'q' }, { value: 'w' }, { value: 'e' } , { value: 'r' },
      { value: 't' } , { value: 'y' }, { value: 'u' } , { value: 'i' },
      { value: 'o' }, { value: 'p' }
    ], [
      { value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' },
      { value: 'g' } , { value: 'h' }, { value: 'j' }, { value: 'k' },
      { value: 'l' }, { value: "'", keyCode: 39 }
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
};
