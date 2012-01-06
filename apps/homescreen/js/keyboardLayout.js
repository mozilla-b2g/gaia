
const Keyboards = {
  alternateLayout: {
    type: 'keyboard',
    keys: [
      [ { value: "1" }, { value: "2" }, { value: "3" } , { value: "4" }, { value: "5" } , { value: "6" }, { value: "7" } , { value: "8" }, { value: "9" }, { value: "0" } ],
      [ { value: "@" }, { value: "#" }, { value: "$" }, { value: "%" }, { value: "&" } , { value: "*" }, { value: "-" }, { value: "+" }, { value: "(" }, { value: ")" } ],
      [ { value: "ALT", ratio: 1.5, keyCode: KeyEvent.DOM_VK_ALT }, { value: "!" }, { value: "\"" }, { value: "'" }, { value: ":" }, { value: ";" }, { value:"/" }, { value: "?" }, { value: "⌫", ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE } ],
      [ { value: "?#", keyCode: -3 }, { value: "ABC", ratio: 2, keyCode: -1 }, { value: ",", keyCode: 44 }, { value: "⎵", ratio: 3, keyCode: 32 }, { value: ".", keyCode: 46 }, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
    ]
  },
  symbolLayout: {
    type: 'keyboard',
    keys: [
      [ { value: "`" }, { value: "~" }, { value: "_" }, { value: "^" }, { value: "∙" } , { value: "|" }, { value: "[" }, { value: "]" }, { value: "{" }, { value: "}" } ],
      [ { value: "℃" }, { value: "℉" }, { value: "№" } , { value: "℠" }, { value: "™" } , { value: "℗" }, { value: "©" } , { value: "®" }, { value: "(" }, { value: ")" } ],
      [ { value: "ALT", ratio: 1.5, keyCode: KeyEvent.DOM_VK_ALT }, { value: "¥" }, { value: "€" }, { value: "£" }, { value: "$" }, { value: "¢" }, { value:"\\" }, { value: "=" }, { value: "⌫", ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE } ],
      [ { value: "?#", keyCode: -3 }, { value: "ABC", ratio: 2, keyCode: -1 }, { value: ",", keyCode: 44 }, { value: "⎵", ratio: 3, keyCode: 32 }, { value: ".", keyCode: 46 }, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
    ]
  },
  qwertyLayout: {
    type: 'keyboard',
    keys: [
      [ { value: "q" }, { value: "w" }, { value: "e" } , { value: "r" }, { value: "t" } , { value: "y" }, { value: "u" } , { value: "i" }, { value: "o" }, { value: "p" } ],
      [ { value: "a" }, { value: "s" }, { value: "d" }, { value: "f" }, { value: "g" } , { value: "h" }, { value: "j" }, { value: "k" }, { value: "l" }, { value: "'", keyCode: 39 } ],
      [ { value: "⇪", ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: "z" }, { value: "x" }, { value: "c" }, { value: "v" }, { value: "b" }, { value:"n" }, { value: "m" }, { value: "⌫", ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE } ],
      [ { value: "En", keyCode: -3 }, { value: "?123", ratio: 2, keyCode: -2 }, { value: ",", keyCode: 44 }, { value: "⎵", ratio: 3, keyCode: 32 }, { value: ".", keyCode: 46 }, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
    ],
  },
  azertyLayout: {
    type: 'keyboard',
    keys: [
      [ { value: "a" }, { value: "z" }, { value: "e" } , { value: "r" }, { value: "t" } , { value: "y" }, { value: "u" } , { value: "i" }, { value: "o" }, { value: "p" } ],
      [ { value: "q" }, { value: "s" }, { value: "d" }, { value: "f" }, { value: "g" } , { value: "h" }, { value: "j" }, { value: "k" }, { value: "l" }, { value: "m" } ],
      [ { value: "⇪", ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: "w" }, { value: "x" }, { value: "c" }, { value: "v" }, { value: "b" }, { value:"n" }, { value: "'", keyCode: 39 }, { value: "⌫", ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE } ],
      [ { value: "Fr", keyCode: -3 }, { value: "?123", ratio: 2, keyCode: -2 }, { value: ",", keyCode: 44 }, { value: "⎵", ratio: 3, keyCode: 32 }, { value: ".", keyCode: 46 }, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
    ]
  },
  qwertzLayout: {
    type: 'keyboard',
    keys: [
      [ { value: "q" }, { value: "w" }, { value: "e" } , { value: "r" }, { value: "t" } , { value: "z" }, { value: "u" } , { value: "i" }, { value: "o" }, { value: "p" } ],
      [ { value: "a" }, { value: "s" }, { value: "d" }, { value: "f" }, { value: "g" } , { value: "h" }, { value: "j" }, { value: "k" }, { value: "l" }, { value: "'", keyCode: 39 } ],
      [ { value: "⇪", ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: "y" }, { value: "x" }, { value: "c" }, { value: "v" }, { value: "b" }, { value:"n" }, { value: "m" }, { value: "⌫", ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE } ],
      [ { value: "De", keyCode: -3 }, { value: "?123", ratio: 2, keyCode: -2 }, { value: ",", keyCode: 44 }, { value: "⎵", ratio: 3, keyCode: 32 }, { value: ".", keyCode: 46 }, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
    ]
  },
  hebrewLayout: {
    type: 'keyboard',
    keys: [
      [ { value: "ק" }, { value: "ר" }, { value: "א" }, { value: "ט" }, { value: "ו" }, { value: "ו" }, { value: "ם" }, { value: "פ" }, { value: "⌫", ratio: 2, keyCode: KeyEvent.DOM_VK_BACK_SPACE } ],
      [ { value: "ש" }, { value: "ד" }, { value: "ג" }, { value: "כ" }, { value: "ע" }, { value: "י" }, { value: "ח" }, { value: "ל" }, { value: "ך" }, { value: "ף" }],
      [ { value: "ז" }, { value: "ס" }, { value: "ב" }, { value: "ה" }, { value: "נ" }, { value: "מ" }, { value: "צ" }, { value: "ת" }, { value: "ץ" }, { value: '?' }],
      [ { value: "He", keyCode: -3 }, { value: "?123", ratio: 2, keyCode: -2 }, { value: ",", keyCode: 44 }, { value: "⎵", ratio: 3, keyCode: 32 }, { value: ".", keyCode: 46 }, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
    ]
  },
  jcukenLayout: {
    type: 'keyboard',
    width: 11,
    keys: [
        [ { value: "й" }, { value: "ц" }, { value: "у" }, { value: "к" }, { value: "е" }, { value: "н" }, { value: "г" }, { value: "ш" }, { value: "щ" }, { value: "з" }, { value: "х" }],
        [ { value: "ф" }, { value: "ы" }, { value: "в" }, { value: "а" }, { value: "п" }, { value: "р" }, { value: "о" }, { value: "л" }, { value: "д" }, { value: "ж" }, { value: "э" }],
        [ { value: "⇪", keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: "я" }, { value: "ч" }, { value: "с" }, { value: "м" }, { value: "и" }, { value: "т" }, { value: "ь" }, { value: "б" }, { value: "ю" }, { value: "⌫", keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
        [ { value: "Ru", keyCode: -3 }, { value: "?123", ratio: 2, keyCode: -2 }, { value: ",", keyCode: 44 }, { value: "⎵", ratio: 4, keyCode: 32 }, { value: ".", keyCode: 46 }, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
    ]
  },
  serbianCyrillicLayout: {
    type: 'keyboard',
    width: 11,
    keys: [
        [ { value: "љ" }, { value: "њ" }, { value: "е" }, { value: "р" }, { value: "т" }, { value: "з" }, { value: "у" }, { value: "и" }, { value: "о" }, { value: "п" }, { value: "ш" }],
        [ { value: "а" }, { value: "с" }, { value: "д" }, { value: "ф" }, { value: "г" }, { value: "х" }, { value: "ј" }, { value: "к" }, { value: "л" }, { value: "ч" }, { value: "ћ" }],
        [ { value: "⇪", keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: "s" }, { value: "џ" }, { value: "ц" }, { value: "в" }, { value: "б" }, { value: "н" }, { value: "м" }, { value: "ђ" }, { value: "ж" }, { value: "⌫", keyCode: KeyEvent.DOM_VK_BACK_SPACE }],
        [ { value: "Sr", keyCode: -3 }, { value: "?123", ratio: 2, keyCode: -2 }, { value: ",", keyCode: 44 }, { value: "⎵", ratio: 4, keyCode: 32 }, { value: ".", keyCode: 46 }, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
    ]
  },
  turkishQLayout: {
    type: 'keyboard',
    upperCase: {
      'i':'İ'
    },
    keys: [
      [ { value: "q" }, { value: "w" }, { value: "e" } , { value: "r" }, { value: "t" } , { value: "y" }, { value: "u" } , { value: "i" }, { value: "o" }, { value: "p" } ],
      [ { value: "a" }, { value: "s" }, { value: "d" }, { value: "f" }, { value: "g" } , { value: "h" }, { value: "j" }, { value: "k" }, { value: "l" }, { value: "'", keyCode: 39 } ],
      [ { value: "⇪", ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: "z" }, { value: "x" }, { value: "c" }, { value: "v" }, { value: "b" }, { value:"n" }, { value: "m" }, { value: "⌫", ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE } ],
      [ { value: "Tr", keyCode: -3 }, { value: "?123", ratio: 2, keyCode: -2 }, { value: ",", keyCode: 44 }, { value: "⎵", ratio: 3, keyCode: 32 }, { value: ".", keyCode: 46 }, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
    ],
  },
  dvorakLayout: {
    type: 'keyboard',
    keys: [
      [ { value: "," }, { value: "." } , { value: "p" }, { value: "y" } , { value: "f" }, { value: "g" } , { value: "c" }, { value: "r" }, { value: "l" }, { value: "⌫", keyCode: KeyEvent.DOM_VK_BACK_SPACE } ],
      [ { value: "a" }, { value: "o" }, { value: "e" }, { value: "u" }, { value: "i" } , { value: "d" }, { value: "h" }, { value: "t" }, { value: "n" }, { value: "s" } ],
      [ { value: "⇪", ratio: 1, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: "q" }, { value: "j" }, { value: "k" }, { value: "x" }, { value: "b" }, { value:"m" }, { value:"w" }, { value:"v" }, { value:"z" } ],
      [ { value: "Dv", keyCode: -3 }, { value: "?123", ratio: 2, keyCode: -2 }, { value: "'" }, { value: "⎵", ratio: 4, keyCode: 32 }, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
    ]
  },
  zhuyingGeneralLayout: {
    type: 'ime',
    needsCandidatePanel: true,
    imEngine: 'jszhuying',
    width: 11,
    keys: [
      [ { value: "ㄅ"},{ value: "ㄉ"},{ value: "ˇ"},{ value: "ˋ"},{ value: "ㄓ"},{ value: "ˊ"},{ value: "˙"},{ value: "ㄚ"},{ value: "ㄞ"},{ value: "ㄢ"}, { value: "ㄦ"} ],
      [ { value: "ㄆ"},{ value: "ㄊ"},{ value: "ㄍ"},{ value: "ㄐ"},{ value: "ㄔ"},{ value: "ㄗ"},{ value: "ㄧ"},{ value: "ㄛ"},{ value: "ㄟ"},{ value: "ㄣ"}, { value: "？"} ],
      [ { value: "ㄇ"},{ value: "ㄋ"},{ value: "ㄎ"},{ value: "ㄑ"},{ value: "ㄕ"},{ value: "ㄘ"},{ value: "ㄨ"},{ value: "ㄜ"},{ value: "ㄠ"},{ value: "ㄤ"}, { value: "…"} ],
      [ { value: "ㄈ"},{ value: "ㄌ"},{ value: "ㄏ"},{ value: "ㄒ"},{ value: "ㄖ"},{ value: "ㄙ"},{ value: "ㄩ"},{ value: "ㄝ"},{ value: "ㄡ"},{ value: "ㄥ"}, { value: "⌫", keyCode: KeyEvent.DOM_VK_BACK_SPACE } ],
      [ { value: "注", keyCode: -3 }, { value: "?123", ratio: 2, keyCode: -2 }, { value: "⎵", ratio: 4, keyCode: 32 }, { value: "，"}, { value: "。"}, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
    ]
  }
};
