Keyboards['zh-Hans-Pinyin'] = {
  label: 'Chinese - Simplified - Pinyin',
  shortLabel: '拼',
  menuLabel: '拼音',
  needsCandidatePanel: true,
  imEngine: 'jspinyin',
  types: ['text', 'url', 'email'],
  pages: [ { // basic page for pinyin alphabets
    needsCommaKey: true,
    width: 10,
    textLayoutOverwrite: {
      ',': '，',
      '.': '。'
    },
    alt: {
      '.': ',?!;:',
      '。': '，？！；：…'
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
        /*use 'A' keycode for this special symbol, so that it won't conflict with "'" in symbol page */
        { value: "'", ratio: 1.5, keyCode: 65 },
        { value: 'z' },
        { value: 'x' }, { value: 'c' }, { value: 'v' }, { value: 'b' },
        { value: 'n' }, { value: 'm' },
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', keyCode: KeyEvent.DOM_VK_SPACE, ratio: 8 },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  }, { // Chinese symbol 1
    needsCommaKey: true,
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
        { value: 'Alt',
          keyCode: KeyEvent.DOM_VK_ALT,
          className: 'page-switch-key',
          targetPage: 2
        },
        { value: '<div class="zh-encode-switcher \
                              zh-encode-switcher-half">半</div> \
                  <div class="zh-encode-switcher \
                              zh-encode-switcher-selected">全</div>',
          keyCode: KeyEvent.DOM_VK_ALT,
          targetPage: 3
        },
        { value: '、' }, { value: '＠' }, { value: '＆' }, { value: '＾' },
        { value: '＃' }, { value: '％' }, { value: '／' },
        { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  }, {   // Chinese symbol 2
    needsCommaKey: true,
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
        { value: 'Alt',
          keyCode: KeyEvent.DOM_VK_ALT,
          className: 'page-switch-key',
          targetPage: 1
        },
        { value: '<div class="zh-encode-switcher \
                              zh-encode-switcher-half">半</div> \
                  <div class="zh-encode-switcher \
                              zh-encode-switcher-selected">全</div>',
          keyCode: KeyEvent.DOM_VK_ALT,
          targetPage: 4
        },
        { value: '【' }, { value: '】' }, { value: '「' }, { value: '」' },
        { value: '＊' }, { value: '·' }, { value: '｜' },
        { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ],
  }, {
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
        { value: 'Alt',
          keyCode: KeyEvent.DOM_VK_ALT,
          className: 'page-switch-key',
          targetPage: 4
        },
        { value: '<div class="zh-encode-switcher \
                              zh-encode-switcher-half \
                              zh-encode-switcher-selected">半</div> \
                  <div class="zh-encode-switcher">全</div>',
          keyCode: KeyEvent.DOM_VK_ALT,
          targetPage: 1
        },
        { value: '\\' }, { value: '@' }, { value: '&' }, { value: '^' },
        { value: '#' }, { value: '%' }, { value: '/' },
        { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  }, {
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
        { value: 'Alt',
          keyCode: KeyEvent.DOM_VK_ALT,
          className: 'page-switch-key',
          targetPage: 3
        },
        { value: '<div class="zh-encode-switcher \
                              zh-encode-switcher-half \
                              zh-encode-switcher-selected">半</div> \
                  <div class="zh-encode-switcher">全</div>',
          keyCode: KeyEvent.DOM_VK_ALT,
          targetPage: 2
        },
        { value: '[' }, { value: ']' }, { value: '「' }, { value: '」' },
        { value: '*' }, { value: '`' }, { value: '|' },
        { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  } ]
};
