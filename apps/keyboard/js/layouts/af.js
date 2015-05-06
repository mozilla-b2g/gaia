Keyboards.af = {
  label: 'Afrikaans',
  shortLabel: 'Afr.',
  imEngine: 'latin',
  types: ['text', 'url', 'email', 'password'],
  autoCorrectLanguage: 'af',
  menuLabel: 'Afrikaans',
  pages: [ {   // default page
    alt: {
      a: 'áàäâåãæ',
      c: 'ç',
      e: 'ëêéè€',
      i: 'ïíî',
      o: 'ôóòöõø',
      u: 'üûú',
      s: 'ßš$',
      S: 'Š$',
      n: ['\'n', 'ñ'],
      l: '£',
      y: 'ýÿ¥',
      '.': ',?!\'-;:…'
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
    ]
  }, {  // symbol page 1
    alt: {
      '1': ['1ste'],
      '2': ['2de'],
      '3': ['3de'],
      '4': ['4de'],
      '5': ['5de'],
      '6': ['6de'],
      '7': ['7de'],
      '8': ['8ste'],
      '9': ['9de'],
      '$': ['€', '£', '¢', '¥'],
      '"': ['“', '”', '„'],
      '\'': ['‘', '’', '’n'],
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
        { value: '$', className: 'alternate-indicator' }, { value: '&' },
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
  }]
};
