Keyboards['dz-BT'] = {
  label: 'Dzongkha',
  shortLabel: 'Dz',
  menuLabel: 'རྫོང་ཁ',
  alternateLayoutKey: '༡༢༣',
  basicLayoutKey: 'ཀཁག',
  types: ['text', 'url', 'email'],
  width: 12,
  keys: [
    [
      { value: 'ཀ' }, { value: 'ཁ' }, { value: 'ག' } , { value: 'ང' },
      { value: 'ི' } , { value: 'ུ' }, { value: 'ེ' } , { value: 'ོ' },
      { value: 'ཅ' }, { value: 'ཆ' }, { value: 'ཇ' }, { value: 'ཉ' }
    ], [
      { value: 'ཏ' }, { value: 'ཐ' }, { value: 'ད' }, { value: 'ན' },
      { value: 'པ' } , { value: 'ཕ' }, { value: 'བ' }, { value: 'མ' },
      { value: 'ཙ' }, { value: 'ཚ'}, { value: 'ཛ' }, { value: 'ཝ' },
    ], [
      { value: 'ཞ' }, { value: 'ཟ' }, { value: 'འ' }, { value: 'ཡ' }, { value: 'ར' },
      { value: 'ལ' }, { value: 'ཤ' }, { value: 'ས' }, { value: 'ཧ' }, { value: 'ཨ' },
      { value: '⌫', ratio: 2, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 6, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '་', ratio: 2 }, { value: '།' },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ],
  alt: {
    'ཀ': 'ྐ',
    'ཁ': 'ྑ',
    'ག': 'ྒ',
    'ང': 'ྔ',
    'ི': 'ྀ',
    'ུ': '྄',
    'ེ': 'ཻ',
    'ོ': 'ཽ',
    'ཅ': 'ྕ',
    'ཆ': 'ྖ',
    'ཇ': 'ྗ',
    'ཉ': 'ྙ ཨ྅',

    'ཏ': 'ྟ ཊ ྚ',
    'ཐ': 'ྠ ཋ ྛ',
    'ད': 'ྡ ཌ ྜ',
    'ན': 'ྣ ཎ ྞ',
    'པ': 'ྤ',
    'ཕ': 'ྥ',
    'བ': 'ྦ',
    'མ': 'ྨ ཨཾ ཨྃ ༷ ༵',
    'ཙ': 'ྩ ༹',
    'ཚ': 'ྪ',
    'ཛ': 'ྫ',
    'ཝ': 'ྭ ྺ',

    'ཞ': 'ྮ',
    'ཟ': 'ྯ',
    'འ': 'ཱ',
    'ཡ': 'ྱ',
    'ར': 'ྲ ཪ',
    'ལ': 'ླ',
    'ཤ': 'ྴ ཥ',
    'ས': 'ྶ',
    'ཧ': 'ྷ',
    'ཨ': 'ྸ ༁',

    '་': '࿒',
    '།': '༎'
  },
  pages: [undefined, {
    needsCommaKey: true,
    alt: {
      '༡': ['1'],
      '༢': ['2'],
      '༣': ['3'],
      '༤': ['4'],
      '༥': ['5'],
      '༦': ['6'],
      '༧': ['7'],
      '༨': ['8'],
      '༩': ['9'],
      '༠': ['0'],

      '༆': ['༄ ', '༅', '@'],
      '༉': ['࿑', '༊', '࿐', '#'],
      '༈': ['-', '_'],
      '₨': ['$', '€', '£', '¢', '¥'],
      '༴': ['྾', '%'],
      'ཿ': ['&'],
      '༷': [ '༵', '*'],
      '༔': ['+'],
      '༼': ['('],
      '༽': [')'],

      '༃': ['༂ ', '!'],
      '༑': ['༏', '༐', '\''],
      '྅': ['ྊ', 'ྋ', '"'],
      'ྈ': [':'],
      'ྉ': [';'],
      '࿙': ['/'],
      '྿': ['?']
    },
    keys: [
      [
        { value: '༡' }, { value: '༢' }, { value: '༣' }, { value: '༤' },
        { value: '༥' }, { value: '༦' }, { value: '༧' }, { value: '༨' },
        { value: '༩' }, { value: '༠' }
      ], [
        { value: '༆'}, { value: '༉' }, { value: '༈' },
        { value: '₨', className: 'alternate-indicator' }, { value: '༴' },
        { value: 'ཿ' }, { value: '༷' },
        { value: '༔' }, { value: '༼' }, { value: '༽' }
      ], [
        { value: 'Alt', ratio: 1.5,
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'page-switch-key',
          targetPage: 2
        },
        { value: '༃' }, { value: '༑' }, { value: '྅' }, { value: 'ྈ' },
        { value: 'ྉ' }, { value: '࿙' }, { value: '྿' },
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  } ]
};
