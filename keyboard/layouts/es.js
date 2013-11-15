Keyboards.es = {
  label: 'Spanish',
  menuLabel: 'Español',
  imEngine: 'latin',
  types: ['text', 'url', 'email'],
  autoCorrectLanguage: 'es',
  alt: {
    a: 'áªàâäåãāæ',
    c: 'ç',
    e: 'é€èêëēęɛ',
    i: 'íïìîīį',
    o: 'óºöòôōœøɵ',
    u: 'úüùûū',
    s: '$ßš',
    l: '£ l·l',
    n: 'ń',
    y: '¥',
    r: 'R$ ',
    '.': ',¿?¡!;:·',
    ':)': ':) :D :( ;D :* :/'
    /* '.com': '.es .org .eu' XXX: commented to avoid overflows for the demo */

  },
  keys: [
    [
      { value: 'q' }, { value: 'w' }, { value: 'e' } , { value: 'r' },
      { value: 't' } , { value: 'y' }, { value: 'u' } , { value: 'i' },
      { value: 'o' }, { value: 'p' }
    ], [
      { value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' },
      { value: 'g' } , { value: 'h' }, { value: 'j' }, { value: 'k' },
      { value: 'l' }, { value: 'ñ', hidden: ['email', 'url'] },
      { value: ':', visible: ['url'] }, { value: '_', visible: ['email'] }
    ], [
      { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'z' }, { value: 'x' }, { value: 'c' }, { value: 'v' },
      { value: 'b' }, { value: 'n' }, { value: 'm' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      //        { value: ':)', compositeKey:':)', ratio: 2 },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ],
  alternateLayout: {
    alt: {
      '€': '$ £ ¥ R$',
      '0': 'º',
      '1': '1º 1ª',
      '2': '2º 2ª',
      '3': '3º 3ª',
      '4': '4º 4ª',
      '5': '5º 5ª',
      '6': '6º 6ª',
      '7': '7º 7ª',
      '8': '8º 8ª',
      '9': '9º 9ª',
      '.': '·'
    },
    keys: [
      [
        { value: '1' }, { value: '2' }, { value: '3' } , { value: '4' },
        { value: '5' } , { value: '6' }, { value: '7' } , { value: '8' },
        { value: '9' }, { value: '0' }
      ], [
        { value: '-' }, { value: '/' }, { value: ':' }, { value: ';' },
        { value: '(' } , { value: ')' }, { value: '€' }, { value: '&' },
        { value: '@', hidden: ['email'] }, { value: '%' },
        { value: '_', visible: ['email']}
      ], [
        { value: '#+=', ratio: 1.5, keyCode: KeyEvent.DOM_VK_ALT },
        { value: '¿' }, { value: '?' }, { value: '¡' }, { value: '!' },
        { value: '\"' }, { value: '\'' }, { value: '*' },
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  },
  symbolLayout: {
    keys: [
      [
        { value: '[' }, { value: ']' }, { value: '{' }, { value: '}' },
        { value: '#' }, { value: '%' }, { value: '^' }, { value: '+' },
        { value: '=' }, { value: '°' }
      ], [
        { value: '_' }, { value: '\\' }, { value: '|' }, { value: '~' },
        { value: '<' }, { value: '>' }, { value: '$' }, { value: '£' },
        { value: '¥' }, { value: '•' }
      ], [
        { value: '123', ratio: 1.5, keyCode: KeyEvent.DOM_VK_ALT },
        { value: '¿' }, { value: '?' }, { value: '¡' }, { value: '!' },
        { value: '\"' }, { value: '\'' }, {value: '*' },
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  }
};
