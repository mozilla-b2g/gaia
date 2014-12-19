Keyboards.th = {
  label: 'Thai',
  shortLabel: 'Th',
  menuLabel: 'ไทย', /*ไทย*/
  secondLayout: true,
  basicLayoutKey: '\u1000\u1001\u1002', /*ကခဂ*/
  alternateLayoutKey: 'กขค', /*กขค*/
  imEngine: 'latin',
  types: ['text', 'url', 'email'],
  width: 11,
  keys: [
      [
        { value: 'ๆ' }, { value: 'ภ' }, { value: 'ถ' }, { value: 'ุ' },
        { value: 'ู' } , { value: 'ึ' }, { value: 'ค' } , { value: 'ต' },
        { value: 'จ' }, { value: 'ข' }, { value: 'ช' }
      ], [
        { value: 'ไ' }, { value: 'ำ' }, { value: 'พ' }, { value: 'ะ' },
        { value: 'ั' } , { value: 'ี' }, { value: 'ร' }, { value: 'น' },
        { value: 'ย' }, { value: 'บ' }, { value: 'ล' }
      ], [
        { value: 'ฟ' }, { value: 'ห' }, { value: 'ก' }, { value: 'ด' },
        { value: 'เ' } , { value: '้' }, { value: '่' }, { value: 'า' },
        { value: 'ส' }, { value: 'ว' }, { value: 'ง' }
      ], [
        { value: '⇪', keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
        { value: 'ป' }, { value: 'แ' }, { value: 'อ' }, { value: 'ิ' },
        { value: 'ื' }, { value: 'ท' }, { value: 'ม' },
        { value: 'ใ' }, { value: 'ฝ' },
        { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
  ],
  upperCase: {
      'ๆ': '฿',
      'ภ': '1',
      'ถ': '2',
      'ุ': '3',
      'ู': '4',
      'ึ': '5',
      'ค': '6',
      'ต': '7',
      'จ': '8',
      'ข': '9',
      'ช': '0',
      'ไ': 'ๆ',
      'ำ': 'ฎ',
      'พ': 'ฑ',
      'ะ': 'ธ',
      'ั': 'ํ',
      'ี': '๊',
      'ร': 'ณ',
      'น': 'ฯ',
      'ย': 'ญ',
      'บ': 'ฐ',
      'ล': 'ฅ',
      'ฟ': 'ฤ',
      'ห': 'ฆ',
      'ก': 'ฏ',
      'ด': 'โ',
      'เ': 'ฌ',
      '้': '็',
      '่': '๋',
      'า': 'ษ',
      'ส': 'ศ',
      'ว': 'ซ',
      'ง': 'ข',
      'ป': ')',
      'แ': 'ฉ',
      'อ': 'ฮ',
      'ิ': 'ฺ',
      'ื': '์',
      'ท': '?',
      'ม': 'ฒ',
      'ใ': 'ฬ',
      'ฝ': 'ฦ',
      'ผ': '('
    },
    alternateLayout: {
      alt: {
        '0': 'º',
        '$': '฿ € £ ¥ R$',
        '?': '¿',
        '!': '¡'
      },
      keys: [
        [
          { value: '๑' }, { value: '๒' }, { value: '๓' } , { value: '๔' },
          { value: '๕' } , { value: '๖' }, { value: '๗' } , { value: '๘' },
          { value: '๙' }, { value: '๐' }
        ], [
          { value: '1' }, { value: '2' }, { value: '3' } , { value: '4' },
          { value: '5' } , { value: '6' }, { value: '7' } , { value: '8' },
          { value: '9' }, { value: '0' }
        ], [
          { value: '@' }, { value: '#' }, { value: '$' }, { value: '%' },
          { value: '&' } , { value: '*' }, { value: '-' }, { value: '+' },
          { value: '(' }, { value: ')' }
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
  },
  symbolLayout: {
    alt: {
      '€': '€ ¥'
    },
    keys: [
      [
        { value: '!' }, { value: '@' }, { value: '#' }, { value: '$' },
        { value: '%' }, { value: '^' }, { value: '&' }, { value: '*' },
        { value: '£' }, { value: '€' }
      ], [
        { value: '|' }, { value: '~' }, { value: '\"' }, { value: '`' },
        { value: '{' }, { value: '}' }, { value: '_' }, { value: '-' },
        { value: '+' }, { value: '=' }
      ], [
        { value: 'กขค'/*กขค*/, ratio: 1.5,
          keyCode: KeyEvent.DOM_VK_ALT },
        { value: '\\' }, { value: '\'' }, { value: '[' }, { value: ']' },
        { value: '<' }, { value: '>' }, {value: ';' },
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  }
};
