Keyboards['bn-Avro'] = {
  label: 'Bangla - Avro',
  imEngine: 'jsavrophonetic',
  menuLabel: 'বাংলা - অভ্র',
  alternateLayoutKey: '?১২৩',
  basicLayoutKey: 'কখগ',
  types: ['text', 'url'],
  alt: {
    a: 'A',
    b: 'B',
    c: 'C',
    d: 'D',
    e: 'E',
    f: 'F',
    g: 'H',
    i: 'I',
    j: 'J',
    k: 'K',
    l: 'L',
    m: 'M',
    n: 'N',
    o: 'O',
    p: 'P',
    q: 'Q',
    r: 'R',
    s: 'S',
    t: 'T',
    u: 'U',
    v: 'V',
    w: 'W',
    x: 'X',
    y: 'Y',
    z: 'Z',
    '.': ',?!;:'
  },
  keys: [
    [
      { value: 'q' }, { value: 'w' }, { value: 'e' } , { value: 'r' },
      { value: 't' } , { value: 'y' }, { value: 'u' } , { value: 'i' },
      { value: 'o' }, { value: 'p' }
    ], [
      { value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' },
      { value: 'g' } , { value: 'h' }, { value: 'j' }, { value: 'k' },
      { value: 'l' }, { value: 'ঁ' }
    ], [
      { value: '⇪', ratio: 1.25, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: '`', ratio: 0.85 }, { value: 'z', ratio: 0.95 }, { value: 'x', ratio: 0.95 },
      { value: 'c', ratio: 0.95 }, { value: 'v', ratio: 0.95 }, { value: 'b', ratio: 0.95 },
      { value: 'n', ratio: 0.95 }, { value: 'm', ratio: 0.95 },
      { value: '⌫', ratio: 1.25, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ],
  alternateLayout: {
    alt: {
      '০': 'º',
      '১': '1 ',
      '২': '2 ',
      '৩': '3 ',
      '৪': '4 ',
      '৫': '5 ',
      '৬': '6 ',
      '৭': '7 ',
      '৮': '8 ',
      '৯': '9 ',
      '৳': '$ € £ ¥ R$',
      '?': '¿',
      '!': '¡'
    },
    keys: [
      [
        { value: '১' }, { value: '২' }, { value: '৩' } , { value: '৪' },
        { value: '৫' } , { value: '৬' }, { value: '৭' } , { value: '৮' },
        { value: '৯' }, { value: '০' }
      ], [
        { value: '@', hidden: ['email'] }, { value: '#' }, { value: '৳' },
        { value: '%' }, { value: '&' } , { value: '*' }, { value: '-' },
        { value: '+' }, { value: '(' }, { value: ')' },
        { value: '_', visible: ['email'] }
      ], [
        { value: 'ALT', ratio: 1.5, keyCode: KeyEvent.DOM_VK_ALT },
        { value: '!' }, { value: '\"' }, { value: "'" }, { value: ':' },
        { value: ';' }, { value: '/' }, { value: '?' },
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  }
};
