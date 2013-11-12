Keyboards['zh-Hans-Pinyin'] = {
  label: 'Chinese - Simplified - Pinyin',
  menuLabel: '拼音输入',
  needsCandidatePanel: true,
  disableAlternateLayout: true,
  imEngine: 'jspinyin',
  types: ['text', 'url', 'email'],
  width: 10,
  textLayoutOverwrite: {
    ',': false,
    '.': false
  },
  keys: [
    [
      { value: 'q' }, { value: 'w' }, { value: 'e' } , { value: 'r' },
      { value: 't' } , { value: 'y' }, { value: 'u' } , { value: 'i' },
      { value: 'o' }, { value: 'p' }
    ], [
      { value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' },
      { value: 'g' } , { value: 'h' }, { value: 'j' }, { value: 'k' },
      { value: 'l' }, { value: "'" }
    ], [
      { value: '，', ratio: 1.5 }, { value: 'z' },
      { value: 'x' }, { value: 'c' }, { value: 'v' }, { value: 'b' },
      { value: 'n' }, { value: 'm' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '?123', keyCode: -21, ratio: 1.5 },
      { value: '空格', keyCode: KeyEvent.DOM_VK_SPACE, ratio: 5 },
      { value: '。', ratio: 1.5 },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};

Keyboards['zh-Hans-Pinyin-Symbol-Ch-1'] = {
  hidesSwitchKey: true,
  needsCandidatePanel: true,
  disableAlternateLayout: true,
  width: 10,
  textLayoutOverwrite: {
    ',': false,
    '.': false
  },
  keys: [
    [
      { value: '1' }, { value: '2' }, { value: '3' } , { value: '4' },
      { value: '5' }, { value: '6' }, { value: '7' } , { value: '8' },
      { value: '9' }, { value: '0' }
    ], [
      { value: '？' }, { value: '！' }, { value: '：' }, { value: '；' },
      { value: '……', compositeKey: '……', className: 'pinyin-ch-ellipsis' },
      { value: '～' }, { value: '（' }, { value: '）' },
      { value: '“' }, { value: '”' }
    ], [
      { value: '1/2', ratio: 1.5, keyCode: -22 },
      { value: '、' }, { value: '@' }, { value: '&' }, { value: '^' },
      { value: '#' }, { value: '%' }, { value: '/' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '返回', ratio: 1.5, keyCode: -11 },
      { value: '中/<span class="pinyin-toggle-button-small">英</span>',
        ratio: 1.5, keyCode: -30 },
      { value: '，' },
      { value: '空格', ratio: 3, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '。' },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};

Keyboards['zh-Hans-Pinyin-Symbol-Ch-2'] = {
  hidesSwitchKey: true,
  needsCandidatePanel: true,
  disableAlternateLayout: true,
  width: 10,
  textLayoutOverwrite: {
    ',': false,
    '.': false
  },
  keys: [
    [
      { value: '1' }, { value: '2' }, { value: '3' } , { value: '4' },
      { value: '5' }, { value: '6' }, { value: '7' } , { value: '8' },
      { value: '9' }, { value: '0' }
    ], [
      { value: '+' }, { value: '-' }, { value: '_' }, { value: '=' },
      { value: '$' }, { value: '￥' }, { value: '《' }, { value: '》' },
      { value: '{' }, { value: '}' }
    ], [
      { value: '2/2', ratio: 1.5, keyCode: -21 },
      { value: '【' }, { value: '】' }, { value: '「' }, { value: '」' },
      { value: '＊' }, { value: '·' }, { value: '|' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '返回', ratio: 1.5, keyCode: -11 },
      { value: '中/<span class="pinyin-toggle-button-small">英</span>',
        ratio: 1.5, keyCode: -30 },
      { value: '，' },
      { value: '空格', ratio: 3, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '。' },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};

Keyboards['zh-Hans-Pinyin-Symbol-En-1'] = {
  hidesSwitchKey: true,
  needsCandidatePanel: true,
  disableAlternateLayout: true,
  width: 10,
  textLayoutOverwrite: {
    ',': false,
    '.': false
  },
  keys: [
    [
      { value: '1' }, { value: '2' }, { value: '3' } , { value: '4' },
      { value: '5' }, { value: '6' }, { value: '7' } , { value: '8' },
      { value: '9' }, { value: '0' }
    ], [
      { value: '?' }, { value: '!' }, { value: ':' }, { value: ';' },
      { value: '…' }, { value: '~' }, { value: '(' }, { value: ')' },
      { value: '\'' }, { value: '"' }
    ], [
      { value: '1/2', ratio: 1.5, keyCode: -32 },
      { value: '\\' }, { value: '@' }, { value: '&' }, { value: '^' },
      { value: '#' }, { value: '%' }, { value: '/' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '返回', ratio: 1.5, keyCode: -11 },
      { value: '<span class="pinyin-toggle-button-small">中</span>/英',
        ratio: 1.5, keyCode: -20 },
      { value: ',' },
      { value: '空格', ratio: 3, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '.' },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};

Keyboards['zh-Hans-Pinyin-Symbol-En-2'] = {
  hidesSwitchKey: true,
  needsCandidatePanel: true,
  disableAlternateLayout: true,
  width: 10,
  textLayoutOverwrite: {
    ',': false,
    '.': false
  },
  keys: [
    [
      { value: '1' }, { value: '2' }, { value: '3' } , { value: '4' },
      { value: '5' }, { value: '6' }, { value: '7' } , { value: '8' },
      { value: '9' }, { value: '0' }
    ], [
      { value: '+' }, { value: '-' }, { value: '_' }, { value: '=' },
      { value: '$' }, { value: '￥' }, { value: '<' }, { value: '>' },
      { value: '{' }, { value: '}' }
    ], [
      { value: '2/2', ratio: 1.5, keyCode: -31 },
      { value: '[' }, { value: ']' }, { value: '「' }, { value: '」' },
      { value: '*' }, { value: '`' }, { value: '|' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '返回', ratio: 1.5, keyCode: -11 },
      { value: '<span class="pinyin-toggle-button-small">中</span>/英',
        ratio: 1.5, keyCode: -20 },
      { value: ',' },
      { value: '空格', ratio: 3, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '.' },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
