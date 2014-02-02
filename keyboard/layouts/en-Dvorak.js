Keyboards['en-Dvorak'] = {
  label: 'English - Dvorak',
  menuLabel: 'Dvorak',
  imEngine: 'latin',
  types: ['text', 'url', 'email'],
  autoCorrectLanguage: 'en_us',
  alt: {
    a: 'àáâãäåāæ',
    c: 'çćč',
    e: 'èéêëē€',
    i: 'ìíîïī',
    o: 'òóôõöōœø',
    u: 'ùúûüū',
    s: 'śšşß',
    S: 'ŚŠŞ',
    n: 'ńñň'
  },
  textLayoutOverwrite: {
    ',': "'",
    '.': false
  },
  keys: [
    [
      { value: ',' }, { value: '.' } , { value: 'p' }, { value: 'y' },
      { value: 'f' }, { value: 'g' } , { value: 'c' }, { value: 'r' },
      { value: 'l' }, { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: 'a' }, { value: 'o' }, { value: 'e' }, { value: 'u' },
      { value: 'i' } , { value: 'd' }, { value: 'h' }, { value: 't' },
      { value: 'n' }, { value: 's' }
    ], [
      { value: '⇪', ratio: 1, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'q' }, { value: 'j' }, { value: 'k' }, { value: 'x' },
      { value: 'b' }, { value: 'm' }, { value: 'w' }, { value: 'v' },
      { value: 'z' }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
