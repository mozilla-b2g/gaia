Keyboards.de = {
  label: 'German',
  menuLabel: 'Deutsch',
  imEngine: 'latin',
  types: ['text', 'url', 'email'],
  autoCorrectLanguage: 'de',
  alt: {
    a: 'äàáâãåāæ',
    c: 'çćč',
    e: 'èéêëē€',
    i: 'ìíîïī',
    o: 'öòóôõōœø',
    u: 'üùúûū',
    s: 'ßśšş',
    S: 'ŚŠŞ',
    n: 'ńñň'
  },
  keys: [
    [
      { value: 'q' }, { value: 'w' }, { value: 'e' }, { value: 'r' },
      { value: 't' } , { value: 'z' }, { value: 'u' } , { value: 'i' },
      { value: 'o' }, { value: 'p' }
    ], [
      { value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' },
      { value: 'g' } , { value: 'h' }, { value: 'j' }, { value: 'k' },
      { value: 'l' }, { value: "'", keyCode: 39 }
    ], [
      { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'y' }, { value: 'x' }, { value: 'c' }, { value: 'v' },
      { value: 'b' }, { value: 'n' }, { value: 'm' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
