Keyboards['ko-heh'] = {
  label: 'Korean',
  imEngine: 'jshangul_heh',
  types: ['text', 'url', 'email'],
  menuLabel: '한국어(천지인)',
  disableAlternateLayout: true,
  hidesSwitchKey: true,
  typeInsensitive: true,
  keys: [
    [
      {value: 'ㅣ', ratio: 2.5}, {value: 'ㆍ', ratio: 2.5},
      {value: 'ㅡ', ratio: 2.5},
      {value: '⌫', ratio: 2.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE}
    ], [
      {value: 'ㄱㄲ', ratio: 2.5}, {value: 'ㄴㄹ', ratio: 2.5},
      {value: 'ㄷㅌ', ratio: 2.5},
      {value: '↵', ratio: 2.5, keyCode: KeyEvent.DOM_VK_RETURN}
    ], [
      {value: 'ㅂㅍ', ratio: 2.5}, {value: 'ㅅㅎ', ratio: 2.5},
      {value: 'ㅈㅊ', ratio: 2.5}, {value: '?123', ratio: 2.5, keyCode: -2}
    ], [
      {value: '.~?!', ratio: 2.5, keyCode: 257},
      {value: 'ㅇㅁ', ratio: 2.5},
      {value: '&nbsp;', ratio: 2.5, keyCode: KeyEvent.DOM_VK_SPACE},
      {value: '&#x1f310;', ratio: 2.5, keyCode: -3}
    ]
  ]
};
