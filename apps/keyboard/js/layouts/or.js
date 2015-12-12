Keyboards.or = {
  label: 'Oriya',
  shortLabel: 'Or',
  imEngine: 'india',
  menuLabel: 'ଓଡ଼ିଆ',
  secondLayout: true,
  specificCssRule: true,
  alternateLayoutKey: '?୧୨୩',
  basicLayoutKey: 'କଖଗ',
  types: ['text', 'url', 'email'],
  width: 11,
  lang: 'or',
  alt: {
    'ର': 'ଋ',
    'ମ': 'ଓଁ',
    'ନ': 'ଙ',
    'ଯ': 'ୟ',
    'ଓ': 'ଔ',
    'ଏ': 'ଐ'
  },
  upperCase: {
    'ୌ':'ଔ',
    'ୈ':'ଐ',
    'ା':'ଆ',
    'ୀ':'ଈ',
    'ୂ':'ଊ',
    'ब':'ଭ',
    'ହ':'ଃ',
    'ଗ':'ଘ',
    'ଦ':'ଧ',
    'ଜ':'ଝ',
    'ଡ':'ଢ',

    'ୋ':'ଓ',
    'େ':'େ',
    '୍':'ଅ',
    'ି':'ଇ',
    'ୁ':'ଉ',
    'ପ':'ଫ',
    'କ':'ଖ',
    'ତ':'ଥ',
    'ଚ':'ଛ',
    'ଟ':'ଠ',

    'ଂ':'ଁ',
    'ମ':'ଣ',
    'ୱ':'ଳ',
    'ଲ':'ଶ',
    'ସ':'ଷ',
    'ୟ':' ୃ',
    '଼':'ଜ୍ଞ'
  },
  keys: [
    [
      { value: 'ୌ' }, { value: 'ୈ' }, { value: 'ା' }, { value: 'ୀ' },
      { value: 'ୂ' }, { value: 'ବ' }, { value: 'ହ' }, { value: 'ଗ' },
      { value: 'ଦ' }, { value: 'ଜ' }, { value: 'ଡ' }
    ], [
      { value: 'ୋ' }, { value: 'େ' }, { value: '୍' }, { value: 'ୀ' },
      { value: 'ୁ' }, { value: 'ପ' }, { value: 'ର' }, { value: 'କ' },
      { value: 'ତ' }, { value: 'ଚ' }, { value: 'ଟ' }
    ], [
      { value: '⇪', keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'ଂ' }, { value: 'ମ' }, { value: 'ନ' },
      { value: 'ୱ' }, { value: 'ଲ' }, { value: 'ସ' }, { value: 'ୟ' },
      { value: '଼' }, { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ],
  pages: [undefined, {
    alt: {
      '୧': ['1'],
      '୨': ['2'],
      '୩': ['3'],
      '୪': ['4'],
      '୫': ['5'],
      '୬': ['6'],
      '୭': ['7'],
      '୮': ['8'],
      '୯': ['9'],
      '୦': ['0'],
      '₹': ['$', '€', '£', '¢', '¥', '৳'],
      '"': ['“', '”'],
      '\'':['‘', '’'],
      '?': ['¿'],
      '!': ['¡'],
      '+': ['-', '×', '÷', '±']
    },
    // These are based on the en layout, with top row modifed and $ localized.
    keys: [
      [
        { value: '୧' }, { value: '୨' }, { value: '୩' }, { value: '୪' },
        { value: '୫' }, { value: '୬' }, { value: '୭' }, { value: '୮' },
        { value: '୯' }, { value: '୦' }
      ], [
        { value: '@' }, { value: '#' },
        { value: '₹', className: 'alternate-indicator' }, { value: '&' },
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
        { value: '\'' }, { value: '!' }, { value: '?'},
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  } ]
};