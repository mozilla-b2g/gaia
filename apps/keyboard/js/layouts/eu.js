Keyboards.eu = {
  label: 'Basque',
  shortLabel: 'Eu',
  menuLabel: 'Euskara',
  imEngine: 'latin',
  types: ['text', 'url', 'email', 'number', 'password'],
  autoCorrectLanguage: 'eu',
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
    '.': ',¿?¡!;:·',
    ':)': ':) :D :( ;D :* :/'
    /* '.com': '.eu .eus .es .fr .org' XXX: commented to avoid overflows for the demo */

  },
  keys: [
    [
      { value: 'q' }, { value: 'w' }, { value: 'e' }, { value: 'r' },
      { value: 't' }, { value: 'y' }, { value: 'u' }, { value: 'i' },
      { value: 'o' }, { value: 'p' }
    ], [
      { value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' },
      { value: 'g' }, { value: 'h' }, { value: 'j' }, { value: 'k' },
      { value: 'l' }, { value: 'ñ' }
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
      '€': '$ £ ¥',
      '0': '0ko 0an 0a 0. 0.a',
      '1': '1eko 1ean 1a 1. 1.a',
      '2': '2ko 2an 2a 2. 2.a',
      '3': '3ko 3an 3a 3. 3.a',
      '4': '4ko 4an 4a 4. 4.a',
      '5': '5eko 5ean 5a 5. 5.a',
      '6': '6ko 6an 6a 6. 6.a',
      '7': '7ko 7an 7a 7. 7.a',
      '8': '8ko 8an 8a 8. 8.a',
      '9': '9ko 9an 9a 9. 9.a',
      '.': '·'
    },
    keys: [
      [
        { value: '1' }, { value: '2' }, { value: '3' }, { value: '4' },
        { value: '5' }, { value: '6' }, { value: '7' }, { value: '8' },
        { value: '9' }, { value: '0' }
      ], [
        { value: '-' }, { value: '/' }, { value: ':' }, { value: ';' },
        { value: '(' }, { value: ')' }, { value: '€', className: 'alternate-indicator' },
        { value: '&' }, { value: '@' }, { value: '%' }
      ], [
        { value: 'Alt', ratio: 1.5, keyCode: KeyEvent.DOM_VK_ALT },
        { value: '*',
          supportsSwitching: {
            value: ','
          }
        },
        { value: '¿' }, { value: '?' }, { value: '¡' },
        { value: '!' }, { value: '\"' }, { value: '\'' },
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
        { value: 'Alt', ratio: 1.5, keyCode: KeyEvent.DOM_VK_ALT },
        {value: '*' }, { value: '¿' }, { value: '?' },
        { value: '¡' }, { value: '!' },
        { value: '\"' }, { value: '\'' },
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  }
};
