Keyboards.ko = {
  label: 'Korean',
  imEngine: 'jshangul',
  types: ['text', 'url', 'email'],
  menuLabel: '한국어',
  upperCase: {
    'ㅂ': 'ㅃ',
    'ㅈ': 'ㅉ',
    'ㄷ': 'ㄸ',
    'ㄱ': 'ㄲ',
    'ㅅ': 'ㅆ'
  },
  keys: [
    [
      { value: 'ㅂ' } , { value: 'ㅈ' } , { value: 'ㄷ' } , { value: 'ㄱ' } ,
      { value: 'ㅅ' } , { value: 'ㅛ' } , { value: 'ㅕ' } , { value: 'ㅑ' } ,
      { value: 'ㅐ' } , { value: 'ㅔ' }
    ], [
      { value: 'ㅁ' } , { value: 'ㄴ' } , { value: 'ㅇ' } , { value: 'ㄹ' } ,
      { value: 'ㅎ' } , { value: 'ㅗ' } , { value: 'ㅓ' } , { value: 'ㅏ' } ,
      { value: 'ㅣ' } ,
      { value: ':', visible: ['url']}, { value: '_', visible: ['email']}
    ], [
      { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'ㅋ' } , { value: 'ㅌ' } , { value: 'ㅊ' } , { value: 'ㅍ' } ,
      { value: 'ㅠ' } , { value: 'ㅜ' } , { value: 'ㅡ' } ,
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
