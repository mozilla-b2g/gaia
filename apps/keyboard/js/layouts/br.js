Keyboards.br = {
  label: 'Breton', 
  shortLabel: 'Br', 
  menuLabel: 'Brezhoneg', 
  imEngine: 'latin', 
  types: ['text', 'url', 'email', 'password'],
  autoCorrectLanguage: 'br', 
  autoCorrectPunctuation: false,
  alt: {  
    e:'éè',
	n: 'ñ',
    u:'ù',
   '.':',?!;:…'
  },
  keys: [
     [
      { value: 'C\'H', compositeKey: 'c\'h', uppervalue: 'C\'H'}, { value: 'w' }, { value: 'e' } , { value: 'r' },
      { value: 't' } , { value: 'y' }, { value: 'u' } , { value: 'i' },
      { value: 'o' }, { value: 'p' }
     ], [
      { value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' },
      { value: 'g' } , { value: 'h' }, { value: 'j' }, { value: 'k' },
      { value: 'l' },{ value: 'm' }
    ], [
      { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'z' }, { value: 'ñ' }, { value: 'CH', compositeKey: 'ch', uppervalue: 'CH'}, { value: 'v' },
      { value: 'b' }, { value: 'n' }, { value: "'", keyCode: 39 },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
