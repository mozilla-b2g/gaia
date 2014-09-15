Keyboards['zh-Hant-Zhuyin'] = {
  label: 'Chinese - Traditional - Zhuyin',
  shortLabel: '注',
  menuLabel: '注音',
  basicLayoutKey: 'ㄅㄆㄇ',
  needsCandidatePanel: true,
  imEngine: 'jszhuyin',
  types: ['text', 'url', 'email'],
  pages: [ { // basic Zhuyin symbols
    needsCommaKey: true,
    width: 11,
    specificCssRule: true,
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
        { value: 'ㄅ'},{ value: 'ㄉ'},{ value: 'ˇ'},{ value: 'ˋ'},
        { value: 'ㄓ'},{ value: 'ˊ'},{ value: '˙'},{ value: 'ㄚ'},
        { value: 'ㄞ'},{ value: 'ㄢ'}, { value: 'ㄦ'}
      ], [
        { value: 'ㄆ'},{ value: 'ㄊ'},{ value: 'ㄍ'},{ value: 'ㄐ'},
        { value: 'ㄔ'},{ value: 'ㄗ'},{ value: 'ㄧ'},{ value: 'ㄛ'},
        { value: 'ㄟ'},{ value: 'ㄣ'}, { value: '？'}
      ], [
        { value: 'ㄇ'},{ value: 'ㄋ'},{ value: 'ㄎ'},{ value: 'ㄑ'},
        { value: 'ㄕ'},{ value: 'ㄘ'},{ value: 'ㄨ'},{ value: 'ㄜ'},
        { value: 'ㄠ'},{ value: 'ㄤ'}, { value: '！'}
      ], [
        { value: 'ㄈ'},{ value: 'ㄌ'},{ value: 'ㄏ'},{ value: 'ㄒ'},
        { value: 'ㄖ'},{ value: 'ㄙ'},{ value: 'ㄩ'},{ value: 'ㄝ'},
        { value: 'ㄡ'},{ value: 'ㄥ'},
        { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  }, { // Chinese symbol 1
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
        { value: '＠' }, { value: '＃' }, { value: '＄' }, { value: '＆' },
        { value: '＊' }, { value: '－' }, { value: '＿' }, { value: '／' },
        { value: '（' }, { value: '）' }
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
        { value: '＋',
          supportsSwitching: {
            value: '，'
          }
        },
        { value: '：' }, { value: '；' }, { value: '「' },
        { value: '」' }, { value: '！' }, { value: '？' },
        { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  }, { // Chinese symbol 2
    width: 10,
    textLayoutOverwrite: {
      ',': '，',
      '.': '。'
    },
    keys: [
      [
        { value: '€' }, { value: '￡' } , { value: '￠' }, { value: '￥' },
        { value: '％' }, { value: '©' } , { value: '®' }, { value: '·' },
        { value: '｜' }, { value: '＼' }
      ], [
        { value: '～' }, { value: '℃' }, { value: '℉' }, { value: '°' },
        { value: '＜' }, { value: '＞' }, { value: '［' }, { value: '］' },
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
        { value: '＋' }, { value: '＝' }, { value: '｀' }, { value: '＾' },
        { value: '§' }, { value: '《' }, { value: '》' },
        { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  }, {
    width: 10,
    keys: [
      [
        { value: '1' }, { value: '2' }, { value: '3' } , { value: '4' },
        { value: '5' }, { value: '6' }, { value: '7' } , { value: '8' },
        { value: '9' }, { value: '0' }
      ], [
        { value: '@' }, { value: '#' }, { value: '$' }, { value: '&' },
        { value: '*' }, { value: '-' }, { value: '_' }, { value: '/' },
        { value: '(' }, { value: ')' }
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
        { value: '+',
          supportsSwitching: {
            value: ','
          }
        },
        { value: ':' }, { value: ';' }, { value: '"' },
        { value: '\'' }, { value: '!' }, { value: '?' },
        { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  }, {
    width: 10,
    keys: [
      [
        { value: '€' }, { value: '£' } , { value: '¢' }, { value: '¥' },
        { value: '%' }, { value: '©' } , { value: '®' }, { value: '·' },
        { value: '|' }, { value: '\\' }
      ], [
        { value: '~' }, { value: '℃' }, { value: '℉' }, { value: '°' },
        { value: '<' }, { value: '>' }, { value: '[' }, { value: ']' },
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
        { value: '+' }, { value: '=' }, { value: '`' }, { value: '^' },
        { value: '§' }, { value: '«' }, { value: '»' },
        { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  } ]
};
