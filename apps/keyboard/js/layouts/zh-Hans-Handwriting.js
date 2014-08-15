Keyboards['zh-Hans-Handwriting'] = {
  label: 'Chinese - Simplified - Handwriting',
  shortLabel: '写',
  menuLabel: '手写简体',
  needsCandidatePanel: true,
  needsCommaKey: true,
  imEngine: 'handwriting',
  types: ['text'],
  width: 10,
  textLayoutOverwrite: {
    ',': '，',
    '.': '。'
  },
  alt: {
    '.': '.,?!;:',
    '。': '。，？！；：'
  },
  handwriting: {
    width: 8.5,
    rowspan: 3
  },
  keys: [
    [
      { value: '！', ratio: 1.5 }
    ], [
      { value: '？', ratio: 1.5 }
    ], [
      { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE, ratio: 1.5 }
    ], [
      { value: '', keyCode: KeyEvent.DOM_VK_SPACE, ratio: 8 },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ],
  alternateLayout: {
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
        { value: 'Alt', keyCode: KeyEvent.DOM_VK_ALT },
        { value: '<div class="zh-encode-switcher \
                              zh-encode-switcher-half">半</div> \
                  <div class="zh-encode-switcher \
                              zh-encode-switcher-selected">全</div>',
          keyCode: -31
        },
        { value: '、' }, { value: '＠' }, { value: '＆' }, { value: '＾' },
        { value: '＃' }, { value: '％' }, { value: '／' },
        { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  },
  symbolLayout: {   // Chinese symbol 2
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
        { value: 'Alt', keyCode: KeyEvent.DOM_VK_ALT },
        { value: '<div class="zh-encode-switcher \
                              zh-encode-switcher-half">半</div> \
                  <div class="zh-encode-switcher \
                              zh-encode-switcher-selected">全</div>',
          keyCode: -32
        },
        { value: '【' }, { value: '】' }, { value: '「' }, { value: '」' },
        { value: '＊' }, { value: '·' }, { value: '｜' },
        { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  }
};

Keyboards['zh-Hans-Handwriting-Symbol-En-1'] = {
  needsCandidatePanel: true,
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
        keyCode: -2
      },
      { value: '\\' }, { value: '@' }, { value: '&' }, { value: '^' },
      { value: '#' }, { value: '%' }, { value: '/' },
      { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};

Keyboards['zh-Hans-Handwriting-Symbol-En-2'] = {
  needsCandidatePanel: true,
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
        keyCode: -5
      },
      { value: '[' }, { value: ']' }, { value: '「' }, { value: '」' },
      { value: '*' }, { value: '`' }, { value: '|' },
      { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
