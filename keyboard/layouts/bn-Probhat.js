Keyboards['bn-Probhat'] = {
  label: 'Bangla - Probhat',
  menuLabel: 'বাংলা - প্রভাত',
  alternateLayoutKey: '?১২',
  basicLayoutKey: 'কখগ',
  types: ['text', 'url', 'email'],
  keys: [
    [
      { value: 'দ' }, { value: 'ূ' }, { value: 'ী' } , { value: 'র' },
      { value: 'ট' } , { value: 'এ' }, { value: 'ু' } , { value: 'ি' },
      { value: 'ও' }, { value: 'প' }
    ], [
      { value: 'া' }, { value: 'স' }, { value: 'ড' }, { value: 'ত' },
      { value: 'গ' } , { value: 'হ' }, { value: 'জ' }, { value: 'ক' },
      { value: 'ল' }, { value: 'ে' }
    ], [
      { value: '্' }, { value: 'য়', ratio: 0.9 }, { value: 'শ', ratio: 0.9 }, { value: 'চ', ratio: 0.9 }, { value: 'আ', ratio: 1.1 },
      { value: 'ব', ratio: 0.9 }, { value: 'ন', ratio: 0.9 }, { value: 'ম', ratio: 0.9 }, { value: 'ো', ratio: 1.15 },
      { value: '⌫', ratio: 1.35, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 7, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '।' },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ],
  alt: {
    'দ': 'ধ',
    'ূ': 'ঊ',
    'ী': 'ঈ',
    'র': 'ড়',
    'ট': 'ঠ',
    'এ': 'ঐ',
    'ু': 'উ',
    'ি': 'ই',
    'ও': 'ঔ',
    'প': 'ফ',

    'া': 'অ',
    'স': 'ষ',
    'ড': 'ঢ',
    'ত': 'থ ৎ',
    'গ': 'ঘ',
    'হ': 'ঃ',
    'জ': 'ঝ',
    'ক': 'খ',
    'ল': 'ং ঞ',

    'য়': 'য',
    'শ': 'ঢ়',
    'চ': 'ছ',
    'আ': 'ৃ ঋ',
    'ব': 'ভ',
    'ন': 'ণ',
    'ম': 'ঙ ঞ',
    'ে': 'ৈ',
    'ো': 'ৌ',
    '্': 'ঁ',
    '।': '॥',
    'ঞ': 'ঋ'
  },
  alternateLayout: {
    alt: {
      '০': '0 º',
      '১': '১ম 1',
      '২': '২য় 2',
      '৩': '৩য় 3',
      '৪': '৪র্থ 4',
      '৫': '৫ম 5',
      '৬': '৬ষ্ঠ 6',
      '৭': '৭ম 7',
      '৮': '৮ম 8',
      '৯': '৯ম 9',
      '৳': '$ € £ ¥',
      '?': '¿',
      '!': '¡',
      '-': '_'
    },
    keys: [
      [
        { value: '১' }, { value: '২' }, { value: '৩' } , { value: '৪' },
        { value: '৫' } , { value: '৬' }, { value: '৭' } , { value: '৮' },
        { value: '৯' }, { value: '০' }
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
