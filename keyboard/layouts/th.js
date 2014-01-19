Keyboards.th = {
  label: 'Thai',
  imEngine: 'latin',
  secondLayout: true,
  width: 12,
  types: ['text', 'url', 'email'],
  menuLabel: 'ไทย',
  alt: {
    '.': ',?!;:'
  },
  keys: [
 [
        { value: 'ๅ' }, { value: '/' },{ value: '-' }, { value: 'ภ' }, { value: 'ถ' }, { value: 'ุ' },
         , { value: 'ึ' }, { value: 'ค' } , { value: 'ต' },
        { value: 'จ' }, { value: 'ข' }, { value: 'ช' }
      ], [
        { value: 'ๆ' },{ value: 'ไ' }, { value: 'ำ' }, { value: 'พ' }, { value: 'ะ' },
        { value: 'ั' } , { value: 'ี' }, { value: 'ร' }, { value: 'น' },
        { value: 'ย' }, { value: 'บ' }, { value: 'ล' }
      ], [
        { value: 'ฟ' }, { value: 'ห' }, { value: 'ก' }, { value: 'ด' },
        { value: 'เ' } , { value: '้' }, { value: '่' }, { value: 'า' },
        { value: 'ส' }, { value: 'ว' }, { value: 'ง' }, { value: 'ฃ' }
      ], [
        { value: '⇪', keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
        { value: 'ผ' },{ value: 'ป' }, { value: 'แ' }, { value: 'อ' }, { value: 'ิ' },
        { value: 'ื' }, { value: 'ท' }, { value: 'ม' },
        { value: 'ใ' }, { value: 'ฝ' },
        { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
  ],
upperCase: {
      'ๆ': '๐',
      'ๅ': '+',
      '/': '๑',
      '-': '๒',
      'ภ': '๓',
      'ถ': '๔',
      'ุ' : 'ู',
      'ึ': '฿',
      'ค': '๕',
      'ต': '๖',
      'จ': '๗',
      'ข': '๘',
      'ช': '๙',
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
      'ล': ',',
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
      'ง': '.',
      'ฃ': 'ฅ',
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
      '$': '€ £ ¥',
      '?': '¿',
      '!': '¡'
    },
    keys: [
      [
        { value: '1' }, { value: '2' }, { value: '3' } , { value: '4' },
        { value: '5' } , { value: '6' }, { value: '7' } , { value: '8' },
        { value: '9' }, { value: '0' }
      ], [
        { value: '@', hidden: ['email'] }, { value: '#' }, { value: '$' },
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
