Keyboards.ga = {
  label: 'Irish',
  shortLabel: 'Ga',
  imEngine: 'latin',
  types: ['text', 'url', 'email', 'password'],
  autoCorrectLanguage: 'ga',
  menuLabel: 'Gaeilge',
  alt: {
    a: 'áàâäåãāæ',
    b: 'ḃ',
    c: 'ċçćč',
    d: 'ḋ',
    e: 'éèêëēęɛ€',
    f: 'ḟ',
    g: 'ġ',
    i: 'íìïîīį',
    m: 'ṁ',
    o: 'óòöôōœøɵ',
    p: 'ṗ',
    u: 'úùüûū',
    s: 'ṡßśš$',
    S: 'ṠŚŠ$',
    t: 'ṫ',
    n: 'ñń',
    l: '£ł',
    w: 'ŵ',
    y: 'ŷÿ¥',
    z: 'žźż',
    '.': '-\',?!;:…'
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
      { value: 'z' }, { value: 'x' }, { value: 'c' }, { value: 'v' },
      { value: 'b' }, { value: 'n' }, { value: 'm' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ],
  pages: [undefined, {
    alt: {
      '0': ['º'],
      '1': ['1ú'],
      '2': ['2ú'],
      '3': ['3ú'],
      '4': ['4ú'],
      '5': ['5ú'],
      '6': ['6ú'],
      '7': ['7ú'],
      '8': ['8ú'],
      '9': ['9ú'],
      '€': ['£', '$', '¢', '¥'],
      '"': ['“', '”'],
      '\'':['‘', '’'],
      '?': ['¿'],
      '!': ['¡'],
      '+': ['-', '×', '÷', '±']
    },
    keys: [
      [
        { value: '1' }, { value: '2' }, { value: '3' }, { value: '4' },
        { value: '5' }, { value: '6' }, { value: '7' }, { value: '8' },
        { value: '9' }, { value: '0' }
      ], [
        { value: '@' }, { value: '#' },
        { value: '€', className: 'alternate-indicator' }, { value: '&' },
        { value: '*' }, { value: '-' }, { value: '_' }, { value: '/' },
        { value: '(' }, { value: ')' }
      ], [
        { value: 'Alt', ratio: 1.5,
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'page-switch-key',
          targetPage: 2
        },
        { value: '+',
          supportsSwitching: {
            value: ','
          }
        }, { value: ':' }, { value: ';' }, { value: '"' },
        { value: '\'' }, { value: '!' }, { value: '?' },
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  } ]
};
