/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

// These are special keyboard layouts.
// Language-specific layouts are in individual js files in layouts/
const Keyboards = {
  alternateLayout: {
    alt: {
      '0': 'º',
      '$': '€ £ ¥ R$',
      '?': '¿',
      '!': '¡'
    },
    keys: [
      [
        { value: '1' }, { value: '2' }, { value: '3' } , { value: '4' },
        { value: '5' } , { value: '6' }, { value: '7' } , { value: '8' },
        { value: '9' }, { value: '0' }
      ], [
        { value: '@', hidden: ['email'] }, { value: '#' }, { value: '$' },
        { value: '%' },
        { value: '&' } , { value: '*' }, { value: '-' }, { value: '+' },
        { value: '(' }, { value: ')' }, { value: '_', visible: ['email']}
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
  },
  symbolLayout: {
    keys: [
      [
        { value: '`' }, { value: '~' }, { value: '_' }, { value: '^' },
        { value: '±' }, { value: '|' }, { value: '[' }, { value: ']' },
        { value: '{' }, { value: '}' }
      ], [
        { value: '°' }, { value: '²' }, { value: '³' }, { value: '©' },
        { value: '®' }, { value: '§' }, { value: '<' }, { value: '>' },
        { value: '«' }, { value: '»' }
      ],
      [
        { value: 'ALT', ratio: 1.5, keyCode: KeyEvent.DOM_VK_ALT },
        { value: '¥' }, { value: '€' }, { value: '£' }, { value: '$' },
        { value: '¢' }, { value: '\\' }, { value: '=' },
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  },
  numberLayout: {
    width: 9,
    keyClassName: 'big-key special-key',
    keys: [
      [{ value: '1', ratio: 3},{ value: '2', ratio: 3},{ value: '3', ratio: 3}],
      [{ value: '4', ratio: 3},{ value: '5', ratio: 3},{ value: '6', ratio: 3}],
      [{ value: '7', ratio: 3},{ value: '8', ratio: 3},{ value: '9', ratio: 3}],
      [
        { value: '.', ratio: 3, altNote: ','},
        { value: '0', ratio: 3, altNote: '-'},
        { value: '⌫', ratio: 3, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ]
    ],
    alt: {
      '.' : ',',
      '0' : '-'
    }
  },
  pinLayout: {
    width: 9,
    keyClassName: 'big-key special-key',
    keys: [
      [{ value: '1', ratio: 3},{ value: '2', ratio: 3},{ value: '3', ratio: 3}],
      [{ value: '4', ratio: 3},{ value: '5', ratio: 3},{ value: '6', ratio: 3}],
      [{ value: '7', ratio: 3},{ value: '8', ratio: 3},{ value: '9', ratio: 3}],
      [
        { value: '', ratio: 3},
        { value: '0', ratio: 3},
        { value: '⌫', ratio: 3, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ]
    ]
  },
  telLayout: {
    width: 9,
    keyClassName: 'big-key special-key',
    keys: [
      [{ value: '1', ratio: 3},{ value: '2', ratio: 3},{ value: '3', ratio: 3}],
      [{ value: '4', ratio: 3},{ value: '5', ratio: 3},{ value: '6', ratio: 3}],
      [{ value: '7', ratio: 3, altNote: '#'},
       { value: '8', ratio: 3, altNote: '-'},
       { value: '9', ratio: 3, altNote: '*'}],
      [{ value: '(', ratio: 3, altNote: ')'},
       { value: '0', ratio: 3, altNote: '+'},
       { value: '⌫', ratio: 3, keyCode: KeyEvent.DOM_VK_BACK_SPACE }]
    ],
    alt: {
      '7' : '#',
      '8' : '-',
      '9' : '*',
      '(' : ')',
      '0' : '+'
    }
  }
};
