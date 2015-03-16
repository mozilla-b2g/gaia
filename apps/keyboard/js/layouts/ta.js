Keyboards.ta = {
  label: 'Tamil',
  shortLabel: 'Ta',
  imEngine: 'india',
  menuLabel: 'தமிழ்',
  secondLayout: true,
  basicLayoutKey: 'அஆஇ',
  types: ['text', 'url', 'email'],
  keyClassName: 'tamil',
  lang: 'ta',
  upperCase: {
    'ஒ':'ொ',
    'ஔ':'ௌ',
    'ஐ':'ை',
    'ஶ':'ா',
    'ஆ':'ீ',
    'ஈ':'ூ',
    'ப':'ஊ',
    'ஹ':'ங',
    'ஜ':'ஂ',
    'ஞ':'ௗ',

    'ஓ':'ோ',
    'ஏ':'ே',
    'அ':'்',
    'இ':'ி',
    'உ':'ு',
    'ர':'ற',
    'க':'&',
    'த':'ஃ',
    'ச':'?',
    'ட':'!',

    'எ':'ெ',
    'ம':'ண',
    'ந':'ன',
    'வ':'ழ',
    'ல':'ள',
    'ஸ':'ஷ',
    'ய':'₹'
  },
  alt: {
    '₹': '$ € £ ¥ ৳'
  },
  keys: [
    [
      { value: 'ஒ' }, { value: 'ஔ' }, { value: 'ஐ' }, { value: 'ஶ' },
      { value: 'ஆ' }, { value: 'ஈ' }, { value: 'ப' }, { value: 'ஹ' },
      { value: 'ஜ' }, { value: 'ஞ' }
    ], [
      { value: 'ஓ' }, { value: 'ஏ' }, { value: 'அ' }, { value: 'இ' },
      { value: 'உ' }, { value: 'ர' }, { value: 'க' }, { value: 'த' },
      { value: 'ச' }, { value: 'ட' }
    ], [
      { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'எ' }, { value: 'ம' }, { value: 'ந' }, { value: 'வ' },
      { value: 'ல' }, { value: 'ஸ' }, { value: 'ய' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
