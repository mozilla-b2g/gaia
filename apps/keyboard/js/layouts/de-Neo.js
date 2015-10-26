Keyboards['de-Neo'] = {
  label: 'German - Neo',
  shortLabel: 'De',
  menuLabel: 'Deutsch - Neo',
  imEngine: 'latin',
  types: ['text', 'url', 'email', 'password'],
  autoCorrectLanguage: 'de',
  lang: 'de',
  alt: {
    a: 'äáàâåãāæ',
    c: 'çćč',
    e: 'éèêëēę€ɛ',
    i: 'ïíìîīį',
    o: 'öóòôōœøɵ',
    u: 'üúùûū',
    s: 'ßśš$',
    S: 'ŚŠ$',
    n: 'ñń',
    l: 'ł£',
    y: 'ÿ¥',
    z: 'žźż',
    '.': ',?!;:…'
  },
  keys: [
    [
      { value: 'x' }, { value: 'v' }, { value: 'l' } , { value: 'c' },
      { value: 'w' }, { value: 'k' }, { value: 'h' } , { value: 'g' },
      { value: 'f' }, { value: 'q' }
    ], [
      { value: 'u' }, { value: 'i', }, { value: 'a' }, { value: 'e' },
      { value: 'o' }, { value: 's', }, { value: 'n' }, { value: 'r' },
      { value: 't' }, { value: 'd', }
    ], [
      { value: '⇪', ratio: 2, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'p' }, { value: 'z' }, { value: 'b' },
      { value: 'm' }, { value: 'j' }, { value: 'y' },
      { value: '⌫', ratio: 2, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ],
  pages: [undefined, {
    needsCommaKey: true,
    alt: {
      '1': ['¹', '1.'],
      '2': ['²', '2.'],
      '3': ['³', '3.'],
      '4': ['⁴', '4.'],
      '5': ['⁵', '5.'],
      '6': ['⁶', '6.'],
      '7': ['⁷', '7.'],
      '8': ['⁸', '8.'],
      '9': ['⁹', '9.'],
      '0': ['⁰', 'º'],
      '$': [ '€', '£', '¢', '¥'],
      '"': ['“', '”'],
      '\'':['‘', '’'],
      '?': ['¿'],
      '!': ['¡'],
      '+': ['-', '×', '÷', '±'],
      '/': '\\'
    },
    keys: [
      [
        { value: ':' }, { value: '&' },
        { value: '#' }, { value: '$' }, { value: '!' },
        { value: '7' }, { value: '8' }, { value: '9' },
        { value: '/' }, { value: '*' }
      ], [
        { value: ';' }, { value: '@' },
        { value: '(' }, { value: ')' }, { value: '?' },
        { value: '4' }, { value: '5' }, { value: '6' },
        { value: '+' }, { value: '-' }
      ], [
        { value: 'Alt', ratio: 2,
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'page-switch-key',
          targetPage: 2
        },
        { value: '%' }, { value: '"' }, { value: "'" },
        { value: '1' }, { value: '2' }, { value: '3' },
        { value: '⌫', ratio: 2, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  }, {
    alt: {
      '®': ['™']
    },
    needsCommaKey: true,
    keys: [
      [
        { value: '§' }, { value: '_' }, { value: '[' }, { value: ']' },
        { value: '^' }, { value: '<' }, { value: '>' }, { value: '=' },
        { value: '¥' }, { value: '€' }
      ], [
        { value: '©' }, { value: '®' }, { value: '{' }, { value: '}' },
        { value: '`' }, { value: '«' }, { value: '»' }, { value: '±' },
        { value: '£' }, { value: '$' }
      ],
      [
        { value: 'Alt', ratio: 2,
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'page-switch-key',
          targetPage: 1
        },
        { value: '|' }, { value: '~' }, { value: 'º' },
        { value: '¹' }, { value: '²' }, { value: '³' },
        { value: '⌫', ratio: 2, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  } ]
};
