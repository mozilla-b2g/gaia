Keyboards.ca = {
  label: 'Catalan',
  menuLabel: 'Català',
  imEngine: 'latin',
  types: ['text', 'url', 'email'],
  autoCorrectLanguage: 'ca',
  alt: {
    a: 'àáâäåãāæª@',
    c: 'çćč',
    e: 'èéêëēę€ɛ',
    i: 'íïìîīį',
    o: 'òóöôōœøɵº',
    u: 'úüùûū',
    s: 'ßśš$',
    S: 'ŚŠŞ',
    n: 'ñń',
    l: 'l·l ł £',
    y: 'ÿ¥',
    z: 'žźż',
    r: 'R$ ',
    '?': '!¿¡',
    '.': ',;:·…',
    "'": '"«»',
    '-': '—_'
  },
  width: 11,
  keys: [
    [
      { value: 'q' }, { value: 'w' }, { value: 'e' } , { value: 'r' },
      { value: 't' } , { value: 'y' }, { value: 'u' } , { value: 'i' },
      { value: 'o' }, { value: 'p' }, { value: '?' }
    ], [
      { value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' },
      { value: 'g' } , { value: 'h' }, { value: 'j' }, { value: 'k' },
      { value: 'l' }, { value: 'ç' },
      { value: "'", keyCode: 39, hidden: ['email', 'url'] },
      { value: ':', visible: ['url']}, { value: '_', visible: ['email']}
    ], [
      { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'z' }, { value: 'x' }, { value: 'c' }, { value: 'v' },
      { value: 'b' }, { value: 'n' }, { value: 'm' }, { value: '-' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ],
  alternateLayout: {
    alt: {
      '0': 'º',
      '1': '1r 1a',
      '2': '2n 2a',
      '3': '3r 3a',
      '4': '4t 4a',
      '5': '5è 5a 5é',
      '6': '6è 6a 6é',
      '7': '7è 7a 7é',
      '8': '8è 8a 8é',
      '9': '9è 9a 9é',
      '€': '$ £ ¥ R$',
      '-': '—_',
      '?': '¿',
      '"': '«»',
      '.': ',;:·…',
      '!': '¡'
    },
    keys: [
      [
        { value: '1' }, { value: '2' }, { value: '3' } , { value: '4' },
        { value: '5' } , { value: '6' }, { value: '7' } , { value: '8' },
        { value: '9' }, { value: '0' }
      ], [
        { value: '@', hidden: ['email'] }, { value: '#' }, { value: '€' },
        { value: '%' }, { value: '&' } , { value: '*' }, { value: '-' },
        { value: '+' }, { value: '(' }, { value: ')' },
        { value: '_', visible: ['email'] }
      ], [
        { value: 'ALT', ratio: 1.5, keyCode: KeyEvent.DOM_VK_ALT },
        { value: '!' }, { value: '\"' }, { value: "'" }, { value: ':' },
        { value: ';' }, { value: '/' }, { value: '?' },
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  }
};
