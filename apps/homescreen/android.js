
const KeyboardAndroid = {
  basicLayout: [
    [ { value: "a" }, { value: "z" }, { value: "e" } , { value: "r" }, { value: "t" } , { value: "y" }, { value: "u" } , { value: "i" }, { value: "o" }, { value: "p" } ],
    [ { value: "q" }, { value: "s" }, { value: "d" }, { value: "f" }, { value: "g" } , { value: "h" }, { value: "j" }, { value: "k" }, { value: "l" }, { value: "m" } ],
    [ { value: "⇪", ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: "w" }, { value: "x" }, { value: "c" }, { value: "v" }, { value: "b" }, { value:"n" }, { value: "'", keyCode: 39 }, { value: "⌫", ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE } ],
    [ { value: "?123", ratio: 2, keyCode: -2 }, { value: ",", keyCode: 44 }, { value: "⎵", ratio: 4, keyCode: 32 }, { value: ".", keyCode: 46 }, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
  ],

  alternateLayout: [
    [ { value: "1" }, { value: "2" }, { value: "3" } , { value: "4" }, { value: "5" } , { value: "6" }, { value: "7" } , { value: "8" }, { value: "9" }, { value: "0" } ],
    [ { value: "@" }, { value: "#" }, { value: "$" }, { value: "%" }, { value: "&" } , { value: "*" }, { value: "-" }, { value: "+" }, { value: "(" }, { value: ")" } ],
    [ { value: "ALT", ratio: 1.5, keyCode: KeyEvent.DOM_VK_ALT }, { value: "!" }, { value: "\"" }, { value: "'" }, { value: ":" }, { value: ";" }, { value:"/" }, { value: "?", keyCode: 39 }, { value: "⌫", ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE } ],
    [ { value: "ABC", ratio: 2, keyCode: -1 }, { value: ",", keyCode: 44 }, { value: "⎵", ratio: 4, keyCode: 32 }, { value: ".", keyCode: 46 }, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
  ]
};

