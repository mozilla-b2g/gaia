Keyboards['en-GB'] = {
  label: 'English (UK)',
  shortLabel: 'En',
  imEngine: 'latin',
  types: ['text', 'url', 'email', 'password'],
  autoCorrectLanguage: 'en_gb',
  menuLabel: 'English (UK)',
  lang: 'en-GB',
  pages: [ {
    alt: {
      a: 'áàâäåãāæ',
      c: 'çćč',
      e: 'éèêëēę€ɛ',
      i: 'ïíìîīį',
      o: 'öõóòôōœøɵ',
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
    }, {
      alt: {
        '1': ['¹', '1st'],
        '2': ['²', '2nd'],
        '3': ['³', '3rd'],
        '4': ['⁴', '4th'],
        '5': ['⁵', '5th'],
        '6': ['⁶', '6th'],
        '7': ['⁷', '7th'],
        '8': ['⁸', '8th'],
        '9': ['⁹', '9th'],
        '0': ['⁰', 'º'],
        '£': [ '€', '$', '¢', '¥'],
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
          { value: '£', className: 'alternate-indicator' }, { value: '&' },
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
