Keyboards.ta = {
  label: 'Tamil',
  shortLabel: 'த',
  imEngine: 'india',
  menuLabel: 'தமிழ்',
  secondLayout: true,
  basicLayoutKey: 'த',
  types: ['text', 'url', 'email'],
  keyClassName: 'tamil',
width: 11,

upperCase:  {
'ஆ' : '௧',
'ஈ' : '௨',
'ஊ' : '௩', 
'ஏ' : '௪',
'ள' : '௫',
'ற' : '௬',
'ன' : '௭',
'ட' : '௮',
'ண' : '௯',
'ச' : '௦',
'ஞ' : '௰',
   
'அ' : 'ஃ',
'இ' : 'ஸ',
'உ' : 'ஷ',
'ஐ' : 'ஜ',
'எ' : 'ஹ',
'க' : 'க்ஷ',
'ப' : 'ஸ்ரீ',
'ம' : 'ஶ',
'த' : 'ௐ',
'ந' : '௱',
'ய' : '௲',
    
'ஔ' : '௳',
'ஓ' : '௴',
'ஒ' : '௵',
'வ' : '௶',
'ங' : '௷',
'ல' : '௸',
'ர' : '௹',
'ழ' : '௺'
  },
  alt: {
'ஆ' : '௧',
'ஈ' : '௨',
'ஊ' : '௩', 
'ஏ' : '௪',
'ள' : '௫',
'ற' : '௬',
'ன' : '௭',
'ட' : '௮',
'ண' : '௯',
'ச' : '௦',
'ஞ' : '௰',
   
'அ' : 'ஃ',
'இ' : 'ஸ',
'உ' : 'ஷ',
'ஐ' : 'ஜ',
'எ' : 'ஹ',
'க' : 'க்ஷ',
'ப' : 'ஸ்ரீ',
'ம' : 'ஶ',
'த' : 'ௐ',
'ந' : '௱',
'ய' : '௲',
    
'ஔ' : '௳',
'ஓ' : '௴',
'ஒ' : '௵',
'வ' : '௶',
'ங' : '௷',
'ல' : '௸',
'ர' : '௹',
'ழ' : '௺'
  },
  keys: [
    [
      { value: 'ஆ' }, { value: 'ஈ' }, { value: 'ஊ' }, 
      { value: 'ஏ' }, { value: 'ள' }, { value: 'ற' }, { value: 'ன' },
      { value: 'ட' }, { value: 'ண' }, { value: 'ச' },{ value: 'ஞ' }
    ], [
      { value: 'அ' }, { value: 'இ' }, { value: 'உ' }, { value: 'ஐ' },
      { value: 'எ' }, { value: 'க' }, { value: 'ப' }, { value: 'ம' },
      { value: 'த' }, { value: 'ந' }, { value: 'ய' }
    ], [
      { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'ஔ' }, { value: 'ஓ' }, { value: 'ஒ' }, { value: 'வ' },
      { value: 'ங' }, { value: 'ல' }, { value: 'ர' },{ value: 'ழ' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 7, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '்' },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]


};
