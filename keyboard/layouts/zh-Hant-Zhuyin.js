Keyboards['zh-Hant-Zhuyin'] = {
  label: 'Chinese - Traditional - Zhuyin',
  menuLabel: '繁體注音輸入',
  needsCandidatePanel: true,
  imEngine: 'jszhuyin',
  types: ['text', 'url', 'email'],
  width: 11,
  textLayoutOverwrite: {
    ',': false,
    '.': false
  },
  keys: [
    [
      { value: 'ㄅ'},{ value: 'ㄉ'},{ value: 'ˇ'},{ value: 'ˋ'},
      { value: 'ㄓ'},{ value: 'ˊ'},{ value: '˙'},{ value: 'ㄚ'},
      { value: 'ㄞ'},{ value: 'ㄢ'}, { value: 'ㄦ'}
    ], [
      { value: 'ㄆ'},{ value: 'ㄊ'},{ value: 'ㄍ'},{ value: 'ㄐ'},
      { value: 'ㄔ'},{ value: 'ㄗ'},{ value: 'ㄧ'},{ value: 'ㄛ'},
      { value: 'ㄟ'},{ value: 'ㄣ'}, { value: '？'}
    ], [
      { value: 'ㄇ'},{ value: 'ㄋ'},{ value: 'ㄎ'},{ value: 'ㄑ'},
      { value: 'ㄕ'},{ value: 'ㄘ'},{ value: 'ㄨ'},{ value: 'ㄜ'},
      { value: 'ㄠ'},{ value: 'ㄤ'}, { value: '…'}
    ], [
      { value: 'ㄈ'},{ value: 'ㄌ'},{ value: 'ㄏ'},{ value: 'ㄒ'},
      { value: 'ㄖ'},{ value: 'ㄙ'},{ value: 'ㄩ'},{ value: 'ㄝ'},
      { value: 'ㄡ'},{ value: 'ㄥ'},
      { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 7, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '，'},
      { value: '。'},
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
