Keyboards.th = {
  label: 'Thai',
  shortLabel: 'Th',
  menuLabel: 'ไทย', /*ไทย*/
  basicLayoutKey: 'กขค', /*กขค*/
  types: ['text', 'url', 'email'],
  lang: 'th',
  pages: [ {                    // default page
    width: 11,
    secondLayout: true,
    alt: {
      'ช': ['๏', '๚', '๛']
    },
    keys: [
      [
        { value: 'ๅ' }, { value: 'ฃ' }, { value: 'ภ' }, { value: 'ถ' },
        { value: 'ุ' }, { value: 'ึ' }, { value: 'ค' }, { value: 'ต' },
        { value: 'จ' }, { value: 'ข' },
        { value: 'ช', className: 'alternate-indicator' }
      ], [
        { value: 'ไ' }, { value: 'ำ' }, { value: 'พ' }, { value: 'ะ' },
        { value: 'ั' }, { value: 'ี' }, { value: 'ร' }, { value: 'น' },
        { value: 'ย' }, { value: 'บ' }, { value: 'ล' }
      ], [
        { value: 'ฟ' }, { value: 'ห' }, { value: 'ก' }, { value: 'ด' },
        { value: 'เ' }, { value: '้' }, { value: '่' }, { value: 'า' },
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
      'ๅ': '๑',
      'ฃ': '๒',
      'ภ': '๓',
      'ถ': '๔',
      'ุ': '๕',
      'ึ': 'ู',
      'ค': '๖',
      'ต': '๗',
      'จ': '๘',
      'ข': '๙',
      'ช': '๐',
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
      'ง': ',',
      'ป': '฿',
      'แ': 'ผ',
      'อ': 'ฉ',
      'ิ': 'ฮ',
      'ื': 'ฺ',
      'ท': '์',
      'ม': 'ฒ',
      'ใ': 'ฬ',
      'ฝ': 'ฦ'
      }
    }
  ]
};
