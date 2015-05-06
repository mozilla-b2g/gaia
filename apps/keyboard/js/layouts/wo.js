Keyboards.wo = {
  label: 'Wolof',
  shortLabel: 'Wo',
  menuLabel: 'Wolof',
  imEngine: 'latin',
  types: ['text', 'url', 'email', 'password'],
  lang: 'wo',
  pages: [ {
    alt: {
      a: 'àâæáãäåā',
      c: 'çćč',
      e: 'éèêë€ē',
      i: 'îïìíī',
      o: 'óôœòõöōø',
      u: 'ùûüúū',
      s: 'śšşß',
      S: 'ŚŠŞ',
      n: 'ñńň',
      é: 'z',
      ë: 'h',
      ŋ: 'v',
      '.': ',?!-;:',
    },
    keys: [
      [
        { value: 'a' }, { value: 'é' }, { value: 'e' }, { value: 'r' },
        { value: 't' }, { value: 'y' }, { value: 'u' }, { value: 'i' },
        { value: 'o' }, { value: 'p' }
      ], [
        { value: 'q' }, { value: 's' }, { value: 'd' }, { value: 'f' },
        { value: 'g' }, { value: 'ë' }, { value: 'j' }, { value: 'k' },
        { value: 'l' }, { value: 'm' }
      ], [
        { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
        { value: 'w' }, { value: 'x' }, { value: 'c' }, { value: 'ŋ' },
        { value: 'b' }, { value: 'n' }, { value: '\''},
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  } ]
};
