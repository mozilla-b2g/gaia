Keyboards.hsb = {
  label: 'Sorbian (Upper)',
  shortLabel: 'hsb',
  menuLabel: 'Hornjoserbšćina',
  imEngine: 'latin',
  types: ['text', 'url', 'email', 'password'],
  autoCorrectLanguage: 'hsb',
  alt: {
    a: 'áąäàâãåāæ',
    c: 'çčć',
	d: 'ď',
    e: 'ěéęèêëē€',
    i: 'íìîïī',
    o: 'óôöòõōœø',
    u: 'úůüùûū',
	l: 'łľĺ',
    n: 'ńňñ',
	r: 'řŕ',
    s: 'šśßş',
    S: 'ŠŚŞ',
	t: 'ť',
	y: 'ý',
	z: 'žźż',
    '.': ',?!;:'
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
