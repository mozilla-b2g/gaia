'use strict';

const Keyboards = {
  alternateLayout: {
    type: 'keyboard',
    keys: [
      [{ value: '1' }, { value: '2' }, { value: '3' } , { value: '4' }, { value: '5' } , { value: '6' }, { value: '7' } , { value: '8' }, { value: '9' }, { value: '0' }],
      [{ value: '@' }, { value: '#' }, { value: '$' }, { value: '%' }, { value: '&' } , { value: '*' }, { value: '-' }, { value: '+' }, { value: '(' }, { value: ')' }],
      [{ value: 'ALT', ratio: 1.5, keyCode: KeyEvent.DOM_VK_ALT }, { value: '!' }, { value: '\"' }, { value: "'" }, { value: ':' }, { value: ';' }, { value: '/' }, { value: '?' }, { value: '⇍', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
      [{ value: ' ', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE }, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  },
  symbolLayout: {
    type: 'keyboard',
    keys: [
      [{ value: '`' }, { value: '~' }, { value: '_' }, { value: '^' }, { value: '±' }, { value: '|' }, { value: '[' }, { value: ']' }, { value: '{' }, { value: '}' }],
      [{ value: '°' }, { value: '²' }, { value: '³' }, { value: '©' }, { value: '®' }, { value: '§' }, { value: '<' }, { value: '>' }, { value: '«' }, { value: '»' }],
      [{ value: 'ALT', ratio: 1.5, keyCode: KeyEvent.DOM_VK_ALT }, { value: '¥' }, { value: '€' }, { value: '£' }, { value: '$' }, { value: '¢' }, { value: '\\' }, { value: '=' }, { value: '⇍', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
      [{ value: ' ', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE }, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  },
  numberLayout: {
    type: 'keyboard',
    width: 9,
    keys: [
      [{ value: '1', ratio: 3},{ value: '2', ratio: 3},{ value: '3', ratio: 3}],
      [{ value: '4', ratio: 3},{ value: '5', ratio: 3},{ value: '6', ratio: 3}],
      [{ value: '7', ratio: 3},{ value: '8', ratio: 3},{ value: '9', ratio: 3}],
      [{ value: '.', ratio: 3},{ value: '0', ratio: 3},{ value: '⇍', ratio: 3, keyCode: KeyEvent.DOM_VK_BACK_SPACE }]
    ]
  },
  telLayout: {
    type: 'keyboard',
    width: 9,
    keys: [
      [{ value: '1', ratio: 3},{ value: '2', ratio: 3},{ value: '3', ratio: 3}],
      [{ value: '4', ratio: 3},{ value: '5', ratio: 3},{ value: '6', ratio: 3}],
      [{ value: '7', ratio: 3},{ value: '8', ratio: 3},{ value: '9', ratio: 3}],
      [{ value: '*', ratio: 3},{ value: '0', ratio: 3},{ value: '#', ratio: 3}],
      [{ value: '+', ratio: 3},{ value: ',', ratio: 3},{ value: '⇍', ratio: 3, keyCode: KeyEvent.DOM_VK_BACK_SPACE }]
    ]
  },
  en: {
    type: 'keyboard',
    label: 'English',
    menuLabel: 'English',
    alt: {
      a: 'àáâãäåāæ',
      c: 'çćč',
      e: 'èéêëē€',
      i: 'ìíîïī',
      o: 'òóôõöōœø',
      u: 'ùúûüū',
      s: 'śšşß',
      S: 'ŚŠŞ',
      n: 'ńñň'
    },
    keys: [
      [{ value: 'q' }, { value: 'w' }, { value: 'e' } , { value: 'r' }, { value: 't' } , { value: 'y' }, { value: 'u' } , { value: 'i' }, { value: 'o' }, { value: 'p' }],
      [{ value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' }, { value: 'g' } , { value: 'h' }, { value: 'j' }, { value: 'k' }, { value: 'l' }, { value: "'", keyCode: 39 }],
      [{ value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: 'z' }, { value: 'x' }, { value: 'c' }, { value: 'v' }, { value: 'b' }, { value: 'n' }, { value: 'm' }, { value: '⇍', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
      [{ value: ' ', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE }, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  },
  fr: {
    type: 'keyboard',
    label: 'French',
    menuLabel: 'français',
    alt: {
      a: 'àâæáãäåā',
      c: 'çćč',
      e: 'éèêë€ē',
      i: 'îïìíī',
      o: 'ôœòóõöōø',
      u: 'ùûüúū',
      s: 'śšşß',
      S: 'ŚŠŞ',
      n: 'ńñň'
    },
    keys: [
      [{ value: 'a' }, { value: 'z' }, { value: 'e' } , { value: 'r' }, { value: 't' } , { value: 'y' }, { value: 'u' } , { value: 'i' }, { value: 'o' }, { value: 'p' }],
      [{ value: 'q' }, { value: 's' }, { value: 'd' }, { value: 'f' }, { value: 'g' } , { value: 'h' }, { value: 'j' }, { value: 'k' }, { value: 'l' }, { value: 'm' }],
      [{ value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: 'w' }, { value: 'x' }, { value: 'c' }, { value: 'v' }, { value: 'b' }, { value: 'n' }, { value: "'", keyCode: 39 }, { value: '⇍', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
      [{ value: ' ', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE }, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  },
  de: {
    type: 'keyboard',
    label: 'German',
    menuLabel: 'Deutsch',
    alt: {
      a: 'äàáâãåāæ',
      c: 'çćč',
      e: 'èéêëē€',
      i: 'ìíîïī',
      o: 'öòóôõōœø',
      u: 'üùúûū',
      s: 'śšşß',
      S: 'ŚŠŞ',
      n: 'ńñň'
    },
    keys: [
      [{ value: 'q' }, { value: 'w' }, { value: 'e' } , { value: 'r' }, { value: 't' } , { value: 'z' }, { value: 'u' } , { value: 'i' }, { value: 'o' }, { value: 'p' }],
      [{ value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' }, { value: 'g' } , { value: 'h' }, { value: 'j' }, { value: 'k' }, { value: 'l' }, { value: "'", keyCode: 39 }],
      [{ value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: 'y' }, { value: 'x' }, { value: 'c' }, { value: 'v' }, { value: 'b' }, { value: 'n' }, { value: 'm' }, { value: '⇍', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
      [{ value: ' ', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE }, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  },
  he: {
    type: 'keyboard',
    label: 'Hebrew',
    menuLabel: 'עִבְרִית',
    alt: {
      // incomplete
    },
    keys: [
      [{ value: 'ק' }, { value: 'ר' }, { value: 'א' }, { value: 'ט' }, { value: 'ו' }, { value: 'ו' }, { value: 'ם' }, { value: 'פ' }, { value: '⇍', ratio: 2, keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
      [{ value: 'ש' }, { value: 'ד' }, { value: 'ג' }, { value: 'כ' }, { value: 'ע' }, { value: 'י' }, { value: 'ח' }, { value: 'ל' }, { value: 'ך' }, { value: 'ף' }],
      [{ value: 'ז' }, { value: 'ס' }, { value: 'ב' }, { value: 'ה' }, { value: 'נ' }, { value: 'מ' }, { value: 'צ' }, { value: 'ת' }, { value: 'ץ' }, { value: '?' }],
      [{ value: ' ', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE }, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  },
  nb: {
    type: 'keyboard',
    label: 'Norwegian Bokmal',
    menuLabel: 'Norsk',
    alt: {
      a: 'äáàâąã',
      e: 'éèêëę€',
      i: 'íìîï',
      o: 'öóòôõ',
      u: 'üúùûū',
      s: 'śšşß',
      S: 'ŚŠŞ',
      n: 'ńñň',
      c: 'çćč',
      d: 'ðď',
      r: 'ř',
      t: 'ťþ',
      z: 'źžż',
      l: 'ł',
      v: 'w',
      'æ': 'œ'
    },
    width: 11,
    keys: [
        [{ value: 'q' },{ value: 'w' },{ value: 'e' },{ value: 'r' },{ value: 't' },{ value: 'y' },{ value: 'u' },{ value: 'i' },{ value: 'o' },{ value: 'p' },{ value: 'å' }],
        [{ value: 'a' },{ value: 's' },{ value: 'd' },{ value: 'f' },{ value: 'g' },{ value: 'h' },{ value: 'j' },{ value: 'k' },{ value: 'l' },{ value: 'ø' },{ value: 'æ' }],
        [{ value: '⇪', ratio: 2, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: 'z' },{ value: 'x' },{ value: 'c' },{ value: 'v' },{ value: 'b' },{ value: 'n' },{ value: 'm' }, { value: '⇍', ratio: 2, keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
        [{ value: ' ', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE }, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  },
  ru: {
    type: 'keyboard',
    label: 'Russian',
    menuLabel: 'русский',
    alt: {
      // incomplete
    },
    width: 11,
    keys: [
        [{ value: 'й' }, { value: 'ц' }, { value: 'у' }, { value: 'к' }, { value: 'е' }, { value: 'н' }, { value: 'г' }, { value: 'ш' }, { value: 'щ' }, { value: 'з' }, { value: 'х' }],
        [{ value: 'ф' }, { value: 'ы' }, { value: 'в' }, { value: 'а' }, { value: 'п' }, { value: 'р' }, { value: 'о' }, { value: 'л' }, { value: 'д' }, { value: 'ж' }, { value: 'э' }],
        [{ value: '⇪', keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: 'я' }, { value: 'ч' }, { value: 'с' }, { value: 'м' }, { value: 'и' }, { value: 'т' }, { value: 'ь' }, { value: 'б' }, { value: 'ю' }, { value: '⇍', keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
        [{ value: ' ', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE }, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  },
  'sr-Cyrl': {
    type: 'keyboard',
    label: 'Serbian (Cyrillic)',
    menuLabel: 'српска ћирилица',
    alt: {
      // incomplete
    },
    width: 11,
    keys: [
        [{ value: 'љ' }, { value: 'њ' }, { value: 'е' }, { value: 'р' }, { value: 'т' }, { value: 'з' }, { value: 'у' }, { value: 'и' }, { value: 'о' }, { value: 'п' }, { value: 'ш' }],
        [{ value: 'а' }, { value: 'с' }, { value: 'д' }, { value: 'ф' }, { value: 'г' }, { value: 'х' }, { value: 'ј' }, { value: 'к' }, { value: 'л' }, { value: 'ч' }, { value: 'ћ' }],
        [{ value: '⇪', keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: 's' }, { value: 'џ' }, { value: 'ц' }, { value: 'в' }, { value: 'б' }, { value: 'н' }, { value: 'м' }, { value: 'ђ' }, { value: 'ж' }, { value: '⇍', keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
        [{ value: ' ', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE }, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  },
  sk: {
    type: 'keyboard',
    label: 'Slovak',
    menuLabel: 'Slovenčina',
    alt: {
      a: 'áàâąãäæ',
      e: 'éèêëę€',
      o: 'óòôõöøœ',
      s: 'śšşß',
      S: 'ŚŠŞ',
      n: 'ńñň',
      c: 'çćč',
      y: 'ýÿü',
      d: 'ðď',
      r: 'ř',
      t: 'ťþ',
      z: 'źžż',
      l: 'ł'
    },
    keys: [
      [{ value: 'q' }, { value: 'w' }, { value: 'e' } , { value: 'r' }, { value: 't' } , { value: 'y' }, { value: 'u' } , { value: 'i' }, { value: 'o' }, { value: 'p' }],
      [{ value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' }, { value: 'g' } , { value: 'h' }, { value: 'j' }, { value: 'k' }, { value: 'l' }, { value: "'", keyCode: 39 }],
      [{ value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: 'z' }, { value: 'x' }, { value: 'c' }, { value: 'v' }, { value: 'b' }, { value: 'n' }, { value: 'm' }, { value: '⇍', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
      [{ value: ' ', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE }, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  },
  tr: {
    type: 'keyboard',
    label: 'Turkish',
    menuLabel: 'Türkçe',
    upperCase: {
      'i': 'İ'
    },
    alt: {
      a: 'â',
      c: 'çćč',
      g: 'ğ',
      i: 'īįıìíîï',
      'İ': 'ĪĮIÌÍÎÏ',
      s: 'śšşß',
      S: 'ŚŠŞ',
      o: 'òóôõöōœø',
      u: 'ùúûüū'
    },
    keys: [
      [{ value: 'q' }, { value: 'w' }, { value: 'e' } , { value: 'r' }, { value: 't' } , { value: 'y' }, { value: 'u' } , { value: 'i' }, { value: 'o' }, { value: 'p' }],
      [{ value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' }, { value: 'g' } , { value: 'h' }, { value: 'j' }, { value: 'k' }, { value: 'l' }, { value: "'", keyCode: 39 }],
      [{ value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: 'z' }, { value: 'x' }, { value: 'c' }, { value: 'v' }, { value: 'b' }, { value: 'n' }, { value: 'm' }, { value: '⇍', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
      [{ value: ' ', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE }, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  },
  'en-Dvorak': {
    type: 'keyboard',
    label: 'English - Dvorak',
    menuLabel: 'Dvorak',
    alt: {
      a: 'àáâãäåāæ',
      c: 'çćč',
      e: 'èéêëē€',
      i: 'ìíîïī',
      o: 'òóôõöōœø',
      u: 'ùúûüū',
      s: 'śšşß',
      S: 'ŚŠŞ',
      n: 'ńñň'
    },
    textLayoutOverwrite: {
      ',': "'",
      '.': false
    },
    keys: [
      [{ value: ',' }, { value: '.' } , { value: 'p' }, { value: 'y' } , { value: 'f' }, { value: 'g' } , { value: 'c' }, { value: 'r' }, { value: 'l' }, { value: '⇍', keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
      [{ value: 'a' }, { value: 'o' }, { value: 'e' }, { value: 'u' }, { value: 'i' } , { value: 'd' }, { value: 'h' }, { value: 't' }, { value: 'n' }, { value: 's' }],
      [{ value: '⇪', ratio: 1, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: 'q' }, { value: 'j' }, { value: 'k' }, { value: 'x' }, { value: 'b' }, { value: 'm' }, { value: 'w' }, { value: 'v' }, { value: 'z' }],
      [{ value: ' ', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE }, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  },
  'zh-Hant-Zhuyin': {
    type: 'ime',
    label: 'Chinese - Traditional - Zhuyin',
    menuLabel: '繁體注音輸入',
    needsCandidatePanel: true,
    imEngine: 'jszhuyin',
    width: 11,
    textLayoutOverwrite: {
      ',': '，',
      '.': '。'
    },
    keys: [
      [{ value: 'ㄅ'},{ value: 'ㄉ'},{ value: 'ˇ'},{ value: 'ˋ'},{ value: 'ㄓ'},{ value: 'ˊ'},{ value: '˙'},{ value: 'ㄚ'},{ value: 'ㄞ'},{ value: 'ㄢ'}, { value: 'ㄦ'}],
      [{ value: 'ㄆ'},{ value: 'ㄊ'},{ value: 'ㄍ'},{ value: 'ㄐ'},{ value: 'ㄔ'},{ value: 'ㄗ'},{ value: 'ㄧ'},{ value: 'ㄛ'},{ value: 'ㄟ'},{ value: 'ㄣ'}, { value: '？'}],
      [{ value: 'ㄇ'},{ value: 'ㄋ'},{ value: 'ㄎ'},{ value: 'ㄑ'},{ value: 'ㄕ'},{ value: 'ㄘ'},{ value: 'ㄨ'},{ value: 'ㄜ'},{ value: 'ㄠ'},{ value: 'ㄤ'}, { value: '…'}],
      [{ value: 'ㄈ'},{ value: 'ㄌ'},{ value: 'ㄏ'},{ value: 'ㄒ'},{ value: 'ㄖ'},{ value: 'ㄙ'},{ value: 'ㄩ'},{ value: 'ㄝ'},{ value: 'ㄡ'},{ value: 'ㄥ'}, { value: '⇍', keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
      [{ value: ' ', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE }, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  },
  'zh-Hans-Pinyin': {
    type: 'ime',
    label: 'Chinese - Simplified & Traditional - Pinyin',
    menuLabel: '拼音输入',
    needsCandidatePanel: true,
    disableAlternateLayout: true,
    hidesSwitchKey: true,
    imEngine: 'jspinyin',
    width: 10,
    textLayoutOverwrite: {
      ',': '，',
      '.': '。'
    },
    keys: [
      [{ value: 'q' }, { value: 'w' }, { value: 'e' } , { value: 'r' }, { value: 't' } , { value: 'y' }, { value: 'u' } , { value: 'i' }, { value: 'o' }, { value: 'p' }],
      [{ value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' }, { value: 'g' } , { value: 'h' }, { value: 'j' }, { value: 'k' }, { value: 'l' }, { value: "'" }],
      [{ value: '简', ratio: 1.5, keyCode: -10 }, { value: 'z' }, { value: 'x' }, { value: 'c' }, { value: 'v' }, { value: 'b' }, { value: 'n' }, { value: 'm' }, { value: '⇍', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
      [{ value: '&#x1f310;', keyCode: -3}, { value: '符', keyCode: -13, ratio: 1.5}, { value: '123', keyCode: -12, ratio: 1.5}, { value: '空格', keyCode: KeyEvent.DOM_VK_SPACE, ratio: 4}, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  },
  'zh-Hans-Pinyin-tr': {
    type: 'keyboard',
    width: 10,
    needsCandidatePanel: true,
    disableAlternateLayout: true,
    hidesSwitchKey: true,
    textLayoutOverwrite: {
      ',': '，',
      '.': '。'
    },
    keys: [
      [{ value: 'q' }, { value: 'w' }, { value: 'e' } , { value: 'r' }, { value: 't' } , { value: 'y' }, { value: 'u' } , { value: 'i' }, { value: 'o' }, { value: 'p' }],
      [{ value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' }, { value: 'g' } , { value: 'h' }, { value: 'j' }, { value: 'k' }, { value: 'l' }, { value: "'" }],
      [{ value: '繁', ratio: 1.5, keyCode: -11 }, { value: 'z' }, { value: 'x' }, { value: 'c' }, { value: 'v' }, { value: 'b' }, { value: 'n' }, { value: 'm' }, { value: '⇍', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
      [{ value: '&#x1f310;', keyCode: -3}, { value: '符', keyCode: -13, ratio: 1.5}, { value: '123', keyCode: -12, ratio: 1.5}, { value: '空格', keyCode: KeyEvent.DOM_VK_SPACE, ratio: 4}, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  },
  'zh-Hans-Pinyin-number': {
    type: 'keyboard',
    disableAlternateLayout: true,
    hidesSwitchKey: true,
    typeInsensitive: true,
    keys: [
      [{ value: '-', ratio: 2 }, { value: '1', ratio: 2 }, { value: '2', ratio: 2 }, { value: '3', ratio: 2 }, { value: '⇍', keyCode: KeyEvent.DOM_VK_BACK_SPACE, ratio: 2 }],
      [{ value: '+', ratio: 2 }, { value: '4', ratio: 2 }, { value: '5', ratio: 2 }, { value: '6', ratio: 2 }, { value: '拼', keyCode: -20, ratio: 2 }],
      [{ value: '.', ratio: 2 }, { value: '7', ratio: 2 }, { value: '8', ratio: 2 }, { value: '9', ratio: 2 }, { value: '符', keyCode: -13, ratio: 2 }],
      [{ value: ':', ratio: 2 }, { value: '?', ratio: 2 }, { value: '0', ratio: 2 }, { value: '空格', keyCode: KeyboardEvent.DOM_VK_SPACE, ratio: 2}, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  },
  'zh-Hans-Pinyin-symbol0': {
    type: 'keyboard',
    disableAlternateLayout: true,
    hidesSwitchKey: true,
    typeInsensitive: true,
    keys: [
      [{ value: '，', ratio: 2 }, { value: '。', ratio: 2 }, { value: ',', ratio: 2 }, { value: '.', ratio: 2 }, { value: '⇍', ratio: 2, keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
      [{ value: '？', ratio: 2 }, { value: '！', ratio: 2 }, { value: '：', ratio: 2 }, { value: '；', ratio: 2 }, { value: '拼', keyCode: -20, ratio: 2 }],
      [{ value: '“', ratio: 2 }, { value: '~', ratio: 2 }, { value: '@', ratio: 2 }, { value: '/', ratio: 2 }, { value: '123', keyCode: -12, ratio: 2 }],
      [{ value: '⇧', ratio: 3, keyCode: -15}, { value: '⇩', ratio: 3, keyCode: -14}, { value: '空格', ratio: 2, keyCode: KeyboardEvent.DOM_VK_SPACE }, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  },
  'zh-Hans-Pinyin-symbol1': {
    type: 'keyboard',
    disableAlternateLayout: true,
    hidesSwitchKey: true,
    typeInsensitive: true,
    keys: [
      [{ value: '%', ratio: 2 }, { value: '&', ratio: 2 }, { value: '*', ratio: 2 }, { value: '-', ratio: 2 }, { value: '⇍', ratio: 2, keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
      [{ value: '_', ratio: 2 }, { value: '`', ratio: 2 }, { value: '[', ratio: 2 }, { value: ']', ratio: 2 }, { value: '拼', keyCode: -20, ratio: 2 }],
      [{ value: '（', ratio: 2 }, { value: '）', ratio: 2 }, { value: '$', ratio: 2 }, { value: '￥', ratio: 2 }, { value: '123', keyCode: -12, ratio: 2 }],
      [{ value: '⇧', ratio: 3, keyCode: -13}, { value: '⇩', ratio: 3, keyCode: -15}, { value: '空格', ratio: 2, keyCode: KeyboardEvent.DOM_VK_SPACE }, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  },
  'zh-Hans-Pinyin-symbol2': {
    type: 'keyboard',
    disableAlternateLayout: true,
    hidesSwitchKey: true,
    typeInsensitive: true,
    keys: [
      [{ value: '+', ratio: 2 }, { value: '#', ratio: 2 }, { value: '^', ratio: 2 }, { value: '\\', ratio: 2 }, { value: '⇍', ratio: 2, keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
      [{ value: '|', ratio: 2 }, { value: '{', ratio: 2 }, { value: '}', ratio: 2 }, { value: '÷', ratio: 2 }, { value: '拼', keyCode: -20, ratio: 2 }],
      [{ value: '=', ratio: 2 }, { value: '<', ratio: 2 }, { value: '>', ratio: 2 }, { value: '℃', ratio: 2 }, { value: '123', keyCode: -12, ratio: 2 }],
      [{ value: '⇧', ratio: 3, keyCode: -14}, { value: '⇩', ratio: 3, keyCode: -13}, { value: '空格', ratio: 2, keyCode: KeyboardEvent.DOM_VK_SPACE }, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  },
  ar: {
    type: 'keyboard',
    label: 'Arabic',
    menuLabel: 'العربية',
    alternateLayoutKey: '123',
    basicLayoutKey: 'أ ب ج',
    width: 11,
    keys: [
      [{ value: 'ض' }, { value: 'ص' }, { value: 'ث' }, { value: 'ق' } , { value: 'ف' }, { value: 'غ' } , { value: 'ع' }, { value: 'ه' } , { value: 'خ' }, { value: 'ح' }, { value: 'ج' }],
      [{ value: 'ش' }, { value: 'س' }, { value: 'ي' }, { value: 'ب' }, { value: 'ل' } , { value: 'ا' }, { value: 'ت' }, { value: 'ن' }, { value: 'م' }, { value: 'ك' }, { value: 'ة' }],
      [{ value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: 'ء' }, { value: 'ظ' }, { value: 'ط' }, { value: 'ذ' }, { value: 'د' }, { value: 'ز' }, { value: 'ر' }, { value: 'و' }, { value: '⇍', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
      [{ value: ' ', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE }, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ],
    upperCase: {
      ض: 'َ',
      ص: 'ً',
      ث: 'ُ',
      ق: 'ٌ',
      ف: 'ْ',
      غ: 'ّ',
      ع: 'ِ',
      ه: 'ٍ',
      خ: '’',
      ح: ',',
      ج: '؛',
      ش: '\\',
      س: ']',
      ي: '[',
      ب: 'ـ',
      ل: 'إ',
      ا: 'أ',
      ت: 'آ',
      ن: '،',
      م: '/',
      ك: ':',
      ة: '\"',
      ء: 'ئ',
      ظ: 'ؤ',
      ط: '؟',
      ذ: '=',
      د: '-',
      ز: '×',
      ر: '÷',
      و: '+'
    },
    textLayoutOverwrite: {
      ',': '،'
    },
    alternateLayoutOverwrite: {
      '?': '؟'
    }
  },
  el: {
    type: 'keyboard',
    label: 'Greek',
    menuLabel: 'Greek',
    alt: {
      α: 'ά',
      ε: 'έ€',
      ω: 'ώ',
      ο: 'ό',
      Υ: 'ΎΫ',
      υ: 'ύϋΰ',
      Ι: 'ΊΪ',
      ι: 'ίϊΐ',
      η: 'ή',
      σ: 'ς'
    },
    keys: [
      [{ value: ';' }, { value: 'ς' }, { value: 'ε' } , { value: 'ρ' }, { value: 'τ' } , { value: 'υ' }, { value: 'θ' } , { value: 'ι' }, { value: 'ο' }, { value: 'π' }],
      [{ value: 'α' }, { value: 'σ' }, { value: 'δ' }, { value: 'φ' }, { value: 'γ' } , { value: 'η' }, { value: 'ξ' }, { value: 'κ' }, { value: 'λ' }, { value: "'", keyCode: 39 }],
      [{ value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: 'ζ' }, { value: 'χ' }, { value: 'ψ' }, { value: 'ω' }, { value: 'β' }, { value: 'ν' }, { value: 'μ' }, { value: '⇍', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
      [{ value: ' ', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE }, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }]
    ]
  }
};
