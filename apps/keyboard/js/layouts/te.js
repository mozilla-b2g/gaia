Keyboards.te = {
  label: 'Telugu',
  shortLabel: 'te',
  imEngine: 'india',
  menuLabel: 'తెలుగు',
  secondLayout: true,
  alternateLayoutKey: '?౧౨౩',
  basicLayoutKey: 'అఆఇ',
  types: ['text', 'url', 'email'],
  width: 11,
  keyClassName: 'telugu',
  lang: 'te',
  upperCase: {
    'ౌ':'ఔ',
    'ై':'ణ',
    'ా':'ఆ',
    'ీ':'ఈ',
    'ూ':'ీఊ',
    'బ':'భ',
    'హ':'ఙ',
    'గ':'ఘ',
    'ద':'ధ',
    'జ':'ఝ',
    'డ':'ఢ',

    'ో':'ఓ',
    'ే':'ఏ',
    '్':'అ',
    'ి':'ఇ',
    'ు':'ఉ',
    'ప':'ఫ',
    'ర':'ఱ',
    'క':'ఖ',
    'త':'థ',
    'చ':'ఛ',
    'ట':'ఠ',

    'ృ':'ఋ',
    'ं':'',
    'మ':'ణ',
    'న':'న',
    'వ':'ళ',
    'ల':'శ',
    'స':'ష',
    'య':'',
    '़':''
  },
  keys: [
    [
      { value: 'ౌ' }, { value: 'ై' }, { value: 'ా' }, { value: 'ీ' },
      { value: 'ూ' }, { value: 'బ' }, { value: 'హ' }, { value: 'గ' },
      { value: 'ద' }, { value: 'జ' }, { value: 'డ' }
    ], [
      { value: 'ో' }, { value: 'ే' }, { value: '్' }, { value: 'ి' },
      { value: 'ు' }, { value: 'ప' }, { value: 'ర' }, { value: 'క' },
      { value: 'త' }, { value: 'చ' }, { value: 'ట' }
    ], [
      { value: '⇪', keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'ృ' }, { value: 'ं' }, { value: 'మ' }, { value: 'న' },
      { value: 'వ' }, { value: 'ల' }, { value: 'స' }, { value: 'య' },
      { value: '़' }, { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ],
 alternateLayout: {
    alt: {
      '౧': '1',
      '౨': '2',
      '౩': '3',
      '౪': '4',
      '౫': '5',
      '౬': '6',
      '౭': '7',
      '౮': '8',
      '౯': '9',
      '౦': '0',
      '?': '¿',
      '!': '¡',
      '₹': '$ € £ ¥ ৳'
    },
   
    keys: [
      [
        { value: '१' }, { value: '२' }, { value: '३' }, { value: '४' },
        { value: '५' }, { value: '६' }, { value: '७' }, { value: '८' },
        { value: '९' }, { value: '०' }
      ], [
        { value : '@' , hidden: ['email'] }, { value : '#' },
        { value: '₹', className: 'alternate-indicator' }, { value: '&' },
        { value: '*' }, { value: '-' }, { value: '_' }, { value: '/' },
        { value: '(' }, { value: ')' }
      ], [
        { value: 'Alt', ratio: 1.5, keyCode: KeyEvent.DOM_VK_ALT },
        { value: '+',
          supportsSwitching: {
            value: ','
          }
        }, { value: ':' }, { value: ';' }, { value: '"' },
        { value: '\'' }, { value: '?' }, { value: '!' },
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  }
};
