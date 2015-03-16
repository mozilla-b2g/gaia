Keyboards.hi = {
  label: 'Hindi',
  shortLabel: 'Hi',
  imEngine: 'india',
  menuLabel: 'हिन्दी',
  secondLayout: true,
  alternateLayoutKey: '?१२३',
  basicLayoutKey: 'कखग',
  types: ['text', 'url', 'email'],
  width: 11,
  keyClassName: 'hindi',
  lang: 'hi',
  alt: {
    'र': 'ॠऋ',
    'म': 'ॐ',
    'न': 'ङ',
    'ल': 'ऌॡ',
    'य': 'य़',
    'ओ': 'ऒ',
    'ए': 'ऍऎ',
    'ळ': 'ऴ',
    'ृ': 'ॄ'
  },
  upperCase: {
    'ौ':'औ',
    'ै':'ऐ',
    'ा':'आ',
    'ी':'ई',
    'ू':'ऊ',
    'ब':'भ',
    'ह':'ः',
    'ग':'घ',
    'द':'ध',
    'ज':'झ',
    'ड':'ढ',

    'ो':'ओ',
    'े':'ए',
    '्':'अ',
    'ि':'इ',
    'ु':'उ',
    'प':'फ',
    'र':'ऱ',
    'क':'ख',
    'त':'थ',
    'च':'छ',
    'ट':'ठ',

    'ॉ':'ऑ',
    'ं':'ँ',
    'म':'ण',
    'न':'ऩ',
    'व':'ळ',
    'ल':'श',
    'स':'ष',
    'य':'ृ',
    '़':'ञ'
  },
  keys: [
    [
      { value: 'ौ' }, { value: 'ै' }, { value: 'ा' }, { value: 'ी' },
      { value: 'ू' }, { value: 'ब' }, { value: 'ह' }, { value: 'ग' },
      { value: 'द' }, { value: 'ज' }, { value: 'ड' }
    ], [
      { value: 'ो' }, { value: 'े' }, { value: '्' }, { value: 'ि' },
      { value: 'ु' }, { value: 'प' }, { value: 'र' }, { value: 'क' },
      { value: 'त' }, { value: 'च' }, { value: 'ट' }
    ], [
      { value: '⇪', keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'ॉ' }, { value: 'ं' }, { value: 'म' }, { value: 'न' },
      { value: 'व' }, { value: 'ल' }, { value: 'स' }, { value: 'य' },
      { value: '़' }, { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ],
  pages: [undefined, {
    alt: {
      '१': ['1'],
      '२': ['2'],
      '३': ['3'],
      '४': ['4'],
      '५': ['5'],
      '६': ['6'],
      '७': ['7'],
      '८': ['8'],
      '९': ['9'],
      '०': ['0'],
      '₹': ['$', '€', '£', '¢', '¥', '৳'],
      '"': ['“', '”'],
      '\'':['‘', '’'],
      '?': ['¿'],
      '!': ['¡'],
      '+': ['-', '×', '÷', '±']
    },
    // These are based on the en layout, with top row modifed and $ localized.
    keys: [
      [
        { value: '१' }, { value: '२' }, { value: '३' }, { value: '४' },
        { value: '५' }, { value: '६' }, { value: '७' }, { value: '८' },
        { value: '९' }, { value: '०' }
      ], [
        { value: '@' }, { value: '#' },
        { value: '₹', className: 'alternate-indicator' }, { value: '&' },
        { value: '*' }, { value: '-' }, { value: '_' }, { value: '/' },
        { value: '(' }, { value: ')' }
      ], [
        { value: 'Alt', ratio: 1.5,
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'page-switch-key',
          targetPage: 2
        },
        { value: '+',
          supportsSwitching: {
            value: ','
          }
        }, { value: ':' }, { value: ';' }, { value: '"' },
        { value: '\'' }, { value: '!' }, { value: '?'},
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  } ]
};
