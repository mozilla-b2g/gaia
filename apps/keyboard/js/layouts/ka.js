Keyboards.ka = {
  label: 'Georgian',
  shortLabel: 'Ka',
  types: ['text', 'url', 'email', 'password'],
  autoCorrectLanguage: 'ka',
  menuLabel: 'ქართული',
  lang: 'ka',
  alt: {
    წ: 'ჭ',
    რ: 'ღ',
    ტ: 'თ',
    ს: 'შ',
    ჯ: 'ჟ',
    ზ: 'ძ',
    ც: 'ჩ',
    '.': ',?!;:…'
  },
  keys: [
    [
      { value: 'ქ' }, { value: 'წ' }, { value: 'ე' }, { value: 'რ' },
      { value: 'ტ' }, { value: 'ყ' }, { value: 'უ' }, { value: 'ი' },
      { value: 'ო' }, { value: 'პ' }
    ], [
      { value: 'ა' }, { value: 'ს' }, { value: 'დ' }, { value: 'ფ' },
      { value: 'გ' }, { value: 'ჰ' }, { value: 'ჯ' }, { value: 'კ' },
      { value: 'ლ' }
    ], [
      { value: 'ზ' }, { value: 'ხ' }, { value: 'ც' }, { value: 'ვ' },
      { value: 'ბ' }, { value: 'ნ' }, { value: 'მ' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ],
  pages: [undefined, {
    alt: {
      '1': ['¹'],
      '2': ['²'],
      '3': ['³'],
      '4': ['⁴'],
      '5': ['⁵'],
      '6': ['⁶'],
      '7': ['⁷'],
      '8': ['⁸'],
      '9': ['⁹'],
      '0': ['⁰', 'º'],
      '$': [ '€', '£', '¢', '¥'],
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
  } ]
};
