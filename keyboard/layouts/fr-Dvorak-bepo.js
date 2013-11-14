Keyboards['fr-Dvorak-bepo'] = {
  label: 'French - Bépo',
  menuLabel: 'Bépo',
  imEngine: 'latin',
  types: ['text', 'url', 'email'],
  autoCorrectLanguage: 'fr',
  alt: {
    a: 'àâæáãäåā',
    c: 'çćč',
    e: 'éèêë€ē',
    i: 'îïìíī',
    o: 'ôœòóõöōø',
    u: 'ùûüúū',
    s: 'śšşß',
    S: 'ŚŠŞ',
    n: 'ńñň',
    '.': ',?!-;:'
  },
  keys: [
    [
      { value: 'b' }, { value: 'é' }, { value: 'p' }, { value: 'o' },
      { value: 'v' }, { value: 'd' }, { value: 'l' }, { value: 'j' },
      { value: 'z' }, { value: 'w' }
    ], [
      { value: 'a' }, { value: 'u' }, { value: 'i' }, { value: 'e' },
      { value: 'c' }, { value: 't' }, { value: 's' }, { value: 'r' },
      { value: 'n' }, { value: 'm' }
    ], [
      { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'y' }, { value: 'x' }, { value: 'k' }, { value: 'q' },
      { value: 'g' }, { value: 'h' }, { value: 'f' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
