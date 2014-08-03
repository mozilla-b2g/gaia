 Keyboards.ta = {
  label: 'Tamil',
  shortLabel: 'த',
  imEngine: 'india',
  menuLabel: 'தமிழ்',
  secondLayout: true,
  basicLayoutKey: 'த',
  types: ['text', 'url', 'email'],
  keyClassName: 'tamil',

  upperCase:  {
    'ற' : 'ஷ',
    'ந' : 'ஸ',
    'ச' : 'ஹ', 
    'வ' : 'ஜ',
    'ர' : 'ல',
    'ை' : 'ஐ',
    'ொ' : 'ோ',
    'ி' : 'ீ',
    'ு' : 'ூ',
    'ா' : 'ழ',
    'த' : 'ம',
    'ட' : 'ங,
    '்' : 'ஃ',
    'இ' : 'ஈ',
    'ஒ' : 'ஓ',
    'உ' : 'ஊ',
    'எ' : 'ஏ',
    'ெ' : 'ே',
    'ஔ' : 'ௌ',
    'அ' : 'ஆ'
  },
  alt: {
    'ற' : 'ஷ',
    'ந' : 'ஸ',
    'ச' : 'ஹ', 
    'வ' : 'ஜ',
    'ர' : 'ல',
    'ை' : 'ஐ',
    'ொ' : 'ோ',
    'ி' : 'ீ',
    'ு' : 'ூ',
    'ா' : 'ழ',
    'த' : 'ம',
    'ட' : 'ங,
    '்' : 'ஃ',
    'இ' : 'ஈ',
    'ஒ' : 'ஓ',
    'உ' : 'ஊ',
    'எ' : 'ஏ',
    'ெ' : 'ே',
    'ஔ' : 'ௌ',
    'அ' : 'ஆ'
  },
  keys: [
    [
      { value: 'ஞ' }, { value: 'ற' }, { value: 'ந' }, 
      { value: 'ச' }, { value: 'வ' }, { value: 'ர' }, { value: 'ை' },
      { value: 'ொ' }, { value: 'ி' }, { value: 'ு' }
    ], [
      { value: 'ய' }, { value: 'ள' }, { value: 'ன' }, { value: 'க' },
      { value: 'ப' }, { value: 'ா' }, { value: 'த' }, { value: 'ட' },
      { value: '்' }, { value: 'இ' }
    ], [
      { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'ண' }, { value: 'ஒ' }, { value: 'உ' }, { value: 'எ' },
      { value: 'ெ' }, { value: 'ஔ' }, { value: 'அ' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
