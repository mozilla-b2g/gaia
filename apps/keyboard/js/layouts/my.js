Keyboards.my = {
  label: 'Myanmar',
  shortLabel: 'My',
  menuLabel: '\u1019\u103C\u1014\u103A\u1019\u102C', /*မြန်မာ*/
  basicLayoutKey: '\u1000\u1001\u1002', /*ကခဂ*/
  alternateLayoutKey: '\u1041\u1042\u1043', /*၁၂၃*/
  imEngine: 'myanmar',
  types: ['text', 'url', 'email'],
  keyClassName: 'myanmar',
  pages: [ {
    secondLayout: true,
    width: 11,
    textLayoutOverwrite: {
      '.': '\u104A'/*၊*/
    },
    upperCase: {
      '\u1006'/*ဆ*/: '\u1008'/*ဈ*/,
      '\u1010'/*တ*/: '\u101D'/*ဝ*/,
      '\u1014'/*န*/: '\u1023'/*ဣ*/,
      '\u1019'/*မ*/: '\u104E'/*၎*/,
      '\u1021'/*အ*/: '\u1024'/*ဤ*/,
      '\u1015'/*ပ*/: '\u104C'/*၌*/,
      '\u1000'/*က*/: '\u1025'/*ဥ*/,
      '\u1004'/*င*/: '\u104D'/*၍*/,
      '\u101E'/*သ*/: '\u100E'/*ဎ*/,
      '\u1005'/*စ*/: '\u100F'/*ဏ*/,
      '\u101F'/*ဟ*/: '\u1027'/*ဧ*/,
      '\u1031'/*ေ*/: '\u1017'/*ဗ*/,
      '\u103B'/*ျ*/: '\u103E'/*ှ*/,
      '\u102D'/*ိ*/: '\u102E'/*ီ*/,
      '\u103A'/*်*/: '\u1039'/*္*/,
      '\u102B'/*ါ*/: '\u103D'/*ွ*/,
      '\u1037'/*့*/: '\u1036'/*ံ*/,
      '\u103C'/*ြ*/: '\u1032'/*ဲ*/,
      '\u102F'/*ု*/: '\u1012'/*ဒ*/,
      '\u1030'/*ူ*/: '\u1013'/*ဓ*/,
      '\u1038'/*း*/: '\u1002'/*ဂ*/,
      '\u1016'/*ဖ*/: '\u1007'/*ဇ*/,
      '\u1011'/*ထ*/: '\u100C'/*ဌ*/,
      '\u1001'/*ခ*/: '\u1003'/*ဃ*/,
      '\u101C'/*လ*/: '\u1020'/*ဠ*/,
      '\u1018'/*ဘ*/: '\u101A'/*ယ*/,
      '\u100A'/*ည*/: '\u1009'/*ဉ*/,
      '\u102C'/*ာ*/: '\u1026'/*ဦ*/,
      '\u101B'/*ရ*/: '\u104F'/*၏*/,
      '\u104A'/*၊*/: '\u104B'/*။*/
    },
    keys: [
      [
        { value: '\u1006'/*ဆ*/ }, { value: '\u1010'/*တ*/ },
        { value: '\u1014'/*န*/ }, { value: '\u1019'/*မ*/ },
        { value: '\u1021'/*အ*/ }, { value: '\u1015'/*ပ*/ },
        { value: '\u1000'/*က*/ }, { value: '\u1004'/*င*/ },
        { value: '\u101E'/*သ*/ }, { value: '\u1005'/*စ*/ },
        { value: '\u101F'/*ဟ*/ }
      ], [
        { value: '\u1031'/*ေ*/ }, { value: '\u103B'/*ျ*/ },
        { value: '\u102D'/*ိ*/ }, { value: '\u103A'/*်*/ },
        { value: '\u102B'/*ါ*/ } , { value: '\u1037'/*့*/ },
        { value: '\u103C'/*ြ*/ }, { value: '\u102F'/*ု*/ },
        { value: '\u1030'/*ူ*/ }, { value: '\u1038'/*း*/ },
      ], [
        { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
        { value: '\u1016'/*ဖ*/ }, { value: '\u1011'/*ထ*/ },
        { value: '\u1001'/*ခ*/ }, { value: '\u101C'/*လ*/ },
        { value: '\u1018'/*ဘ*/ }, { value: '\u100A'/*ည*/ },
        { value: '\u102C'/*ာ*/ }, { value: '\u101B'/*ရ*/},
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  }, {
    textLayoutOverwrite: {
      '.': '\u104A'/*၊*/
    },
    keys: [
      [
        { value: '\u1041'/*၁*/ }, { value: '\u1042'/*၂*/ },
        { value: '\u1043'/*၃*/ }, { value: '\u1044'/*၄*/ },
        { value: '\u1045'/*၅*/ }, { value: '\u1046'/*၆*/ },
        { value: '\u1047'/*၇*/ }, { value: '\u1048'/*၈*/ },
        { value: '\u1049'/*၉*/ }, { value: '\u1040'/*၀*/ }
      ], [
        { value: '\u1050'/*ၐ*/ }, { value: '\u1051'/*ၑ*/ },
        { value: '\u1052'/*ၒ*/ }, { value: '\u1053'/*ၓ*/ },
        { value: '\u1054'/*ၔ*/ }, { value: '\u1055'/*ၕ*/ },
        { value: '\u1056'/*ၖ*/ }, { value: '\u1057'/*ၗ*/ },
        { value: '\u1058'/*ၘ*/ }, { value: '\u1059'/*ၙ*/ }
      ], [
        { value: 'Alt', ratio: 1.5,
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'page-switch-key',
          targetPage: 2
        },
        { value: '\u100D'/*ဍ*/ }, { value: '\u100B'/*ဋ*/ },
        { value: '\u103F'/*ဿ*/, ratio: 1.5},
        { value: '\u1029'/*ဩ*/, ratio: 1.5 },
        { value: '\u102A'/*ဪ*/, ratio: 2 },
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  }, {
    needsCommaKey: true,
    alt: {
      '"': ['“', '”'],
      '\'':['‘', '’'],
      '$': ['€', '£', '¢', '¥'],
      '/': ['\\'],
      '-': ['_'],
      '+': ['-', '×', '÷', '±']
    },
    keys: [
      [
        { value: '!' }, { value: '@' }, { value: '#' }, { value: '$' },
        { value: '%' }, { value: '^' }, { value: '&' }, { value: '*' },
        { value: '(' }, { value: ')' }
      ], [
        { value: '~' }, { value: '|' }, { value: '/' }, { value: '\"' },
        { value: '\'' }, { value: '-' }, { value: '+' }, { value: '=' },
        { value: '{' }, { value: '}' }
      ], [
        { value: '\u1041\u1042\u1043'/*၁၂၃*/, ratio: 1.5,
          keyCode: KeyboardEvent.DOM_VK_ALT, targetPage: 1 },
        { value: '[' }, { value: ']' }, { value: '<' }, { value: '>' },
        { value: '?' }, { value: ':' }, {value: ';' },
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  } ]
};
