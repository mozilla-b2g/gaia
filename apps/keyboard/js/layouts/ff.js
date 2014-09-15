Keyboards.ff = {
  label: 'Fulah',
  shortLabel: 'Ff',
  menuLabel: 'Pulaar-Fulfulde',
  imEngine: 'latin',
  types: ['text', 'url', 'email', 'password'],
  alt: {
    a: 'àâæáãäåā',
    c: 'çćč',
    e: 'éèêë€ē',
    i: 'îïìíī',
    o: 'ôœòóõöōø',
    u: 'ùûüúū',
    s: 'śšşß',
    S: 'ŚŠŞ',
    n: 'ñńň',
    ɗ: 'z',
    ƴ: 'x',
    ŋ: 'q',
    ɓ: 'v',
    '.': ',?!-;:'
  },
  keys: [
    [
      { value: 'a' }, { value: 'ɗ' }, { value: 'e' }, { value: 'r' },
      { value: 't' } , { value: 'y' }, { value: 'u' }, { value: 'i' },
      { value: 'o' }, { value: 'p' }
    ], [
      { value: 'ŋ' }, { value: 's' }, { value: 'd' }, { value: 'f' },
      { value: 'g' } , { value: 'h' }, { value: 'j' }, { value: 'k' },
      { value: 'l' }, { value: 'm' }
    ], [
      { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'w' }, { value: 'ƴ' }, { value: 'c' }, { value: 'ɓ' },
      { value: 'b' }, { value: 'n' }, { value: "'", keyCode: 39 },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
