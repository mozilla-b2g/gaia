Keyboards['jp-kanji'] = {
  label: 'Japanese - Kanji',
  menuLabel: 'Japanese - Kanji',
  imEngine: 'jskanji',
  types: ['text', 'url', 'email'],
  needsCandidatePanel: true,
  disableAlternateLayout: true,
  hidesSwitchKey: true,
  width: 10,
  keys: [
    [
      { value: '戻す', keyCode: -10, ratio: 2 },
      { value: 'あ', ratio: 2 },
      { value: 'か', ratio: 2 },
      { value: 'さ', ratio: 2 },
      { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE, ratio: 2 }
    ], [
      { value: '←', keyCode: -11, ratio: 2 },
      { value: 'た', ratio: 2 },
      { value: 'な', ratio: 2 },
      { value: 'は', ratio: 2 },
      { value: '→', keyCode: -12, ratio: 2 }
    ], [
      { value: '記号', keyCode: -13, ratio: 1 },
      { value: 'カナ', keyCode: -18, ratio: 1 },
      { value: 'ま', ratio: 2 },
      { value: 'や', ratio: 2 },
      { value: 'ら', ratio: 2 },
      { value: '└─┘', keyCode: -14, ratio: 2 }
    ], [
      { value: '&#x1f310;', keyCode: -3},
      { value: 'あ', keyCode: -20 },
      { value: '小゛゜', keyCode: -16, ratio: 2 },
      { value: 'わ', ratio: 2 },
      { value: '、', ratio: 2},
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};

Keyboards['jp-kanji-en'] = {
  needsCandidatePanel: true,
  disableAlternateLayout: true,
  hidesSwitchKey: true,
  keys: [
    [
      { value: 'q' }, { value: 'w' }, { value: 'e' } , { value: 'r' },
      { value: 't' } , { value: 'y' }, { value: 'u' } , { value: 'i' },
      { value: 'o' }, { value: 'p' }
    ], [
      { value: '⇪', keyCode: -19 }, { value: 'a' }, { value: 's' },
      { value: 'd' }, { value: 'f' }, { value: 'g' }, { value: 'h' },
      { value: 'j' }, { value: 'k' }, { value: 'l' }
    ], [
      { value: '記号', keyCode: -13, ratio: 1.5 },
      { value: 'z' }, { value: 'x' }, { value: 'c' }, { value: 'v' },
      { value: 'b' }, { value: 'n' }, { value: 'm' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&#x1f310;', keyCode: -3}, { value: 'A', keyCode: -21 },
      { value: '&nbsp', keyCode: KeyEvent.DOM_VK_SPACE, ratio: 6},
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};

Keyboards['jp-kanji-en-caps'] = {
  needsCandidatePanel: true,
  disableAlternateLayout: true,
  hidesSwitchKey: true,
  keys: [
    [
      { value: 'Q' }, { value: 'W' }, { value: 'E' } , { value: 'R' },
      { value: 'T' } , { value: 'Y' }, { value: 'U' } , { value: 'I' },
      { value: 'O' }, { value: 'P' }
    ], [
      { value: '⇪', keyCode: -19 }, { value: 'A' }, { value: 'S' },
      { value: 'D' }, { value: 'F' }, { value: 'G' }, { value: 'H' },
      { value: 'J' }, { value: 'K' }, { value: 'L' }
    ], [
      { value: '記号', keyCode: -13, ratio: 1.5 },
      { value: 'Z' }, { value: 'X' }, { value: 'C' }, { value: 'V' },
      { value: 'B' }, { value: 'N' }, { value: 'M' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&#x1f310;', keyCode: -3}, { value: 'A', keyCode: -21 },
      { value: '&nbsp', keyCode: KeyEvent.DOM_VK_SPACE, ratio: 6},
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};

Keyboards['jp-kanji-number'] = {
  needsCandidatePanel: true,
  disableAlternateLayout: true,
  hidesSwitchKey: true,
  typeInsensitive: true,
  keys: [
    [
      { value: '戻す', keyCode: -10, ratio: 2 },
      { value: '1', ratio: 2 }, { value: '2', ratio: 2 },
      { value: '3', ratio: 2 },
      { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE, ratio: 2 }
    ], [
      { value: '←', keyCode: -11, ratio: 2 }, { value: '4', ratio: 2 },
      { value: '5', ratio: 2 }, { value: '6', ratio: 2 },
      { value: '→', keyCode: -12, ratio: 2 }
    ], [
      { value: '記号', keyCode: -13, ratio: 2 },
      { value: '7', ratio: 2 }, { value: '8', ratio: 2 },
      { value: '9', ratio: 2 }, { value: '└─┘', keyCode: -14, ratio: 2 }
    ], [
      { value: '&#x1f310;', keyCode: -3},
      { value: '1', keyCode: -22, ratio: 1 }, { value: '*', ratio: 2 },
      { value: '0', ratio: 2 }, { value: '#', ratio: 2},
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
