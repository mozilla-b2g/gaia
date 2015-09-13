Keyboards['fa-10']={
  label: 'Persian 10',
  shortLabel: 'Fa',
  menuLabel: '10 فارسی',
  secondLayout: true,
  specificCssRule: true,
  types: ['text', 'url', 'email'],
  alternateLayoutKey: '123',
  basicLayoutKey: 'آ ب پ',
  lang: 'fa',
  alt : {
    'ص': 'ض',
    'ع': 'غ',
    'ا': 'آ',
    'ط': 'ظ'
    'د': 'ذ',
    'گ': 'ئ',
    '.' :',?!-;:…'
    },
    keys: [
    [
      { value: 'ص' }, { value: 'ث' }, { value: 'ق' },
      { value: 'ف' }, { value: 'ع' }, { value: 'ه' },
      { value: 'خ' }, { value: 'ح' }, { value: 'ج' }, { value: 'چ' }
    ], [
      { value: 'ش' }, { value: 'س' }, { value: 'ی' }, { value: 'ب' },
      { value: 'ل' } , { value: 'ا' }, { value: 'ت' }, { value: 'ن' },
      { value: 'م' }, { value: 'پ' }
    ], [
      { value: 'ط'},
      { value: 'ژ' }, { value: 'ز' }, { value: 'ر' }, { value: 'د' },
      { value: 'و' }, { value: 'ک' }, { value: 'گ' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ],
};
