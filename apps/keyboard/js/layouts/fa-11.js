Keyboards['fa-11'] = {
  label: 'Persian 11',
  shortLabel: 'Fa',
  menuLabel: '11 فارسی',
  secondLayout: true,
  specificCssRule: true,
  types: ['text', 'url', 'email'],
  alternateLayoutKey: '123',
  basicLayoutKey: 'آ ب پ',
  lang: 'fa',
  alt : {
    'ع': 'غ',
    'ا': 'آ',
    'گ': 'ئ',
    '.' :',?!-;:…'
    },
    keys: [
    [
      { value: 'ض' }, { value: 'ص' }, { value: 'ث' }, { value: 'ق' },
      { value: 'ف' }, { value: 'ع' }, { value: 'ه' },
      { value: 'خ' }, { value: 'ح' }, { value: 'ج' }, { value: 'چ' }
    ], [
      { value: 'ظ' }, { value: 'ش' }, { value: 'س' }, { value: 'ی' },
      { value: 'ب' }, { value: 'ل' } , { value: 'ا' }, { value: 'ت' },
      { value: 'ن' },{ value: 'م' }, { value: 'پ' }
    ], [
      { value: 'ط'}, { value: 'ژ' },
      { value: 'ز' }, { value: 'ر' }, { value: 'ذ' }, { value: 'د' },
      { value: 'و' }, { value: 'ک' }, { value: 'گ',ratio: 1.5 },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ],
};
