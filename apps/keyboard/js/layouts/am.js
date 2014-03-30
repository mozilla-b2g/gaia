Keyboards.am = {
  label: 'Armenian',
  imEngine: 'Հայերեն',
  types: ['text', 'url', 'email'],
  autoCorrectLanguage: 'am',


  width: 11,
  keys: [
    [
      { value: 'է' }, { value: 'թ' }, { value: 'փ' }, { value: 'ձ' },
      { value: 'ջ }, { value: 'ւ' }, { value: 'և' }, { value: 'ր' },
      { value: 'չ' }, { value: 'ճ' }, { value: '֊' }, { value: 'ժ' },
    ], 
    [
      { value: 'ք' }, { value: 'ո' }, { value: 'ե' }, { value: 'ռ' },
      { value: 'տ' }, { value: 'ը' }, { value: 'ւ' }, { value: 'ի' },
      { value: 'օ' }, { value: 'պ' }, { value: 'խ' }, { value: 'ծ' },
    ], [
      { value: 'ա' }, { value: 'ս' }, { value: 'դ' }, { value: 'ֆ' },
      { value: 'գ' }, { value: 'հ' }, { value: 'յ' }, { value: 'կ' },
      { value: 'լ' }, { value: 'շ' }, 
    ], [
      { value: '⇪', keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'զ' }, { value: 'ղ }, { value: 'ց' }, { value: 'վ' },
      { value: 'բ' }, { value: 'ն' }, { value: 'մ' }, 
      { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
