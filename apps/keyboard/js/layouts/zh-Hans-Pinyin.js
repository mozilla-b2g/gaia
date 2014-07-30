Keyboards['zh-Hans-Pinyin'] = {
  label: 'Chinese - Simplified - Pinyin',
  shortLabel: '拼',
  menuLabel: '拼音',
  needsCandidatePanel: true,
  disableAlternateLayout: true,
  needsCommaKey: true,
  imEngine: 'jspinyin',
  types: ['text', 'url', 'email'],
  width: 10,
  textLayoutOverwrite: {
    ',': '，',
    '.': '。'
  },
  alt: {
    '.': '.,?!;:',
    '。': '。，？！；：'
  },
  keys: [
    [
      { value: 'q' }, { value: 'w' }, { value: 'e' } , { value: 'r' },
      { value: 't' } , { value: 'y' }, { value: 'u' } , { value: 'i' },
      { value: 'o' }, { value: 'p' }
    ], [
      { value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' },
      { value: 'g' } , { value: 'h' }, { value: 'j' }, { value: 'k' },
      { value: 'l' }
    ], [
      { value: "'", ratio: 1.5 }, { value: 'z' },
      { value: 'x' }, { value: 'c' }, { value: 'v' }, { value: 'b' },
      { value: 'n' }, { value: 'm' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '12&', keyCode: -21, ratio: 1.5, className: 'switch-key' },
      { value: '&nbsp', keyCode: KeyEvent.DOM_VK_SPACE, ratio: 6 },
      { value: '↵', ratio: 2.5, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};

Keyboards['zh-Hans-Pinyin-Symbol-Ch-1'] = {
  needsCandidatePanel: true,
  disableAlternateLayout: true,
  needsCommaKey: true,
  width: 10,
  textLayoutOverwrite: {
    ',': '，',
    '.': '。'
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
      { value: 'Alt', keyCode: -22 },
      { value: '<div class="zh-encode-switcher \
                            zh-encode-switcher-half">半</div> \
                <div class="zh-encode-switcher \
                            zh-encode-switcher-selected">全</div>',
        keyCode: -30
      },
      { value: '、' }, { value: '＠' }, { value: '＆' }, { value: '＾' },
      { value: '＃' }, { value: '％' }, { value: '／' },
      { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: 'ABC', ratio: 1.5, keyCode: -11 },
      { value: '&nbsp', ratio: 6, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2.5, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};

Keyboards['zh-Hans-Pinyin-Symbol-Ch-2'] = {
  needsCandidatePanel: true,
  disableAlternateLayout: true,
  needsCommaKey: true,
  width: 10,
  textLayoutOverwrite: {
    ',': '，',
    '.': '。'
  },
  keys: [
    [
      { value: '1' }, { value: '2' }, { value: '3' } , { value: '4' },
      { value: '5' }, { value: '6' }, { value: '7' } , { value: '8' },
      { value: '9' }, { value: '0' }
    ], [
      { value: '＋' }, { value: '－' }, { value: '＿' }, { value: '＝' },
      { value: '＄' }, { value: '￥' }, { value: '《' }, { value: '》' },
      { value: '｛' }, { value: '｝' }
    ], [
      { value: 'Alt', keyCode: -21 },
      { value: '<div class="zh-encode-switcher \
                            zh-encode-switcher-half">半</div> \
                <div class="zh-encode-switcher \
                            zh-encode-switcher-selected">全</div>',
        keyCode: -30
      },
      { value: '【' }, { value: '】' }, { value: '「' }, { value: '」' },
      { value: '＊' }, { value: '·' }, { value: '｜' },
      { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: 'ABC', ratio: 1.5, keyCode: -11 },
      { value: '&nbsp', ratio: 6, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2.5, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};

Keyboards['zh-Hans-Pinyin-Symbol-En-1'] = {
  needsCandidatePanel: true,
  disableAlternateLayout: true,
  needsCommaKey: true,
  width: 10,
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
      { value: 'Alt', keyCode: -32 },
      { value: '<div class="zh-encode-switcher \
                            zh-encode-switcher-half \
                            zh-encode-switcher-selected">半</div> \
                <div class="zh-encode-switcher">全</div>',
        keyCode: -20
      },
      { value: '\\' }, { value: '@' }, { value: '&' }, { value: '^' },
      { value: '#' }, { value: '%' }, { value: '/' },
      { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: 'ABC', ratio: 1.5, keyCode: -11 },
      { value: '&nbsp', ratio: 6, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2.5, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};

Keyboards['zh-Hans-Pinyin-Symbol-En-2'] = {
  needsCandidatePanel: true,
  disableAlternateLayout: true,
  needsCommaKey: true,
  width: 10,
  keys: [
    [
      { value: '1' }, { value: '2' }, { value: '3' } , { value: '4' },
      { value: '5' }, { value: '6' }, { value: '7' } , { value: '8' },
      { value: '9' }, { value: '0' }
    ], [
      { value: '+' }, { value: '-' }, { value: '_' }, { value: '=' },
      { value: '$' }, { value: '¥' }, { value: '<' }, { value: '>' },
      { value: '{' }, { value: '}' }
    ], [
      { value: 'Alt', keyCode: -31 },
      { value: '<div class="zh-encode-switcher \
                            zh-encode-switcher-half \
                            zh-encode-switcher-selected">半</div> \
                <div class="zh-encode-switcher">全</div>',
        keyCode: -20
      },
      { value: '[' }, { value: ']' }, { value: '「' }, { value: '」' },
      { value: '*' }, { value: '`' }, { value: '|' },
      { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: 'ABC', ratio: 1.5, keyCode: -11 },
      { value: '&nbsp', ratio: 6, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2.5, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
