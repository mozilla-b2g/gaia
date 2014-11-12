Keyboards.eo = {
  label: 'Esperanto',
  menuLabel: 'Esperanto',
  shortLabel: 'Eo',
  imEngine: 'latin',
  types: ['text', 'url', 'email', 'password'],
  alt: {
    a: 'àáâãäåæāăą',
    c: 'çćċč',
    d: 'ðďđ',
    e: 'èéêëēėęě',
    g: 'ğġģ',
    h: 'ĥħ',
    i: 'ìíîïĩīįıĳ',
    k: 'ķĸ',
    l: 'ĺļľŀł',
    n: 'ñńņňŉŋ',
    o: 'òóôõöøōőœ',
    'ŝ': 'q',
    r: 'ŕŗř',
    s: 'śşšșß',
    S: 'ŚŞŠȘ',
    t: 'þţťŧț',
    u: 'ùúûüũūůűų',
    'ĝ': 'wŵ',
    'ĉ': 'x',
    'ŭ': 'yýÿŷ',
    z: 'źżž',
    '.': ',?!;:…'
  },
  keys: [
    [
      { value: 'ŝ' }, { value: 'ĝ' }, { value: 'e' } , { value: 'r' },
      { value: 't' }, { value: 'ŭ' }, { value: 'u' } , { value: 'i' },
      { value: 'o' }, { value: 'p' }
    ], [
      { value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' },
      { value: 'g' }, { value: 'h' }, { value: 'j' }, { value: 'k' },
      { value: 'l' }, { value: 'ĵ' }
    ], [
      { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'z' }, { value: 'ĉ' }, { value: 'c' }, { value: 'v' },
      { value: 'b' }, { value: 'n' }, { value: 'm' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
