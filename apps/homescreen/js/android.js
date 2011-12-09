
const KeyboardAndroid = {
  alternateLayout: [
    [ { value: "1" }, { value: "2" }, { value: "3" } , { value: "4" }, { value: "5" } , { value: "6" }, { value: "7" } , { value: "8" }, { value: "9" }, { value: "0" } ],
    [ { value: "@" }, { value: "#" }, { value: "$" }, { value: "%" }, { value: "&" } , { value: "*" }, { value: "-" }, { value: "+" }, { value: "(" }, { value: ")" } ],
    [ { value: "ALT", ratio: 1.5, keyCode: KeyEvent.DOM_VK_ALT }, { value: "!" }, { value: "\"" }, { value: "'" }, { value: ":" }, { value: ";" }, { value:"/" }, { value: "?", keyCode: 39 }, { value: "⌫", ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE } ],
    [ { value: "☺", keyCode: -3 }, { value: "ABC", ratio: 2, keyCode: -1 }, { value: ",", keyCode: 44 }, { value: "⎵", ratio: 3, keyCode: 32 }, { value: ".", keyCode: 46 }, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
  ],
  qwertyLayout: [
    [ { value: "q" }, { value: "w" }, { value: "e" } , { value: "r" }, { value: "t" } , { value: "y" }, { value: "u" } , { value: "i" }, { value: "o" }, { value: "p" } ],
    [ { value: "a" }, { value: "s" }, { value: "d" }, { value: "f" }, { value: "g" } , { value: "h" }, { value: "j" }, { value: "k" }, { value: "l" }, { value: "'", keyCode: 39 } ],
    [ { value: "⇪", ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: "z" }, { value: "x" }, { value: "c" }, { value: "v" }, { value: "b" }, { value:"n" }, { value: "m" }, { value: "⌫", ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE } ],
    [ { value: "En", keyCode: -3 }, { value: "?123", ratio: 2, keyCode: -2 }, { value: ",", keyCode: 44 }, { value: "⎵", ratio: 3, keyCode: 32 }, { value: ".", keyCode: 46 }, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
  ],
  qwertyLayoutUpperCaps: [
    [ { value: "Q" }, { value: "W" }, { value: "E" } , { value: "R" }, { value: "T" } , { value: "Y" }, { value: "U" } , { value: "I" }, { value: "O" }, { value: "P" } ],
    [ { value: "A" }, { value: "S" }, { value: "D" }, { value: "F" }, { value: "G" } , { value: "H" }, { value: "J" }, { value: "K" }, { value: "L" }, { value: "\"", keyCode: 39 } ],
    [ { value: "⇪", ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: "Z" }, { value: "X" }, { value: "C" }, { value: "V" }, { value: "B" }, { value:"N" }, { value: "M" }, { value: "⌫", ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE } ],
    [ { value: "En", keyCode: -3 }, { value: "?123", ratio: 2, keyCode: -2 }, { value: ",", keyCode: 44 }, { value: "⎵", ratio: 3, keyCode: 32 }, { value: ".", keyCode: 46 }, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
  ],
  azertyLayout: [
    [ { value: "a" }, { value: "z" }, { value: "e" } , { value: "r" }, { value: "t" } , { value: "y" }, { value: "u" } , { value: "i" }, { value: "o" }, { value: "p" } ],
    [ { value: "q" }, { value: "s" }, { value: "d" }, { value: "f" }, { value: "g" } , { value: "h" }, { value: "j" }, { value: "k" }, { value: "l" }, { value: "m" } ],
    [ { value: "⇪", ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: "w" }, { value: "x" }, { value: "c" }, { value: "v" }, { value: "b" }, { value:"n" }, { value: "'", keyCode: 39 }, { value: "⌫", ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE } ],
    [ { value: "Fr", keyCode: -3 }, { value: "?123", ratio: 2, keyCode: -2 }, { value: ",", keyCode: 44 }, { value: "⎵", ratio: 3, keyCode: 32 }, { value: ".", keyCode: 46 }, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
  ],
  azertyLayoutUpperCaps: [
    [ { value: "A" }, { value: "Z" }, { value: "E" } , { value: "R" }, { value: "T" } , { value: "Y" }, { value: "U" } , { value: "I" }, { value: "O" }, { value: "P" } ],
    [ { value: "Q" }, { value: "S" }, { value: "D" }, { value: "F" }, { value: "G" } , { value: "H" }, { value: "J" }, { value: "K" }, { value: "L" }, { value: "M" } ],
    [ { value: "⇪", ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: "W" }, { value: "X" }, { value: "C" }, { value: "V" }, { value: "B" }, { value:"N" }, { value: "\"", keyCode: 39 }, { value: "⌫", ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE } ],
    [ { value: "Fr", keyCode: -3 }, { value: "?123", ratio: 2, keyCode: -2 }, { value: ",", keyCode: 44 }, { value: "⎵", ratio: 3, keyCode: 32 }, { value: ".", keyCode: 46 }, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
  ],
  dvorakLayout: [
    [ { value: "," }, { value: "." } , { value: "p" }, { value: "y" } , { value: "f" }, { value: "g" } , { value: "c" }, { value: "r" }, { value: "l" }, { value: "⌫", keyCode: KeyEvent.DOM_VK_BACK_SPACE } ],
    [ { value: "a" }, { value: "o" }, { value: "e" }, { value: "u" }, { value: "i" } , { value: "d" }, { value: "h" }, { value: "t" }, { value: "n" }, { value: "s" } ],
    [ { value: "⇪", ratio: 1, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: "q" }, { value: "j" }, { value: "k" }, { value: "x" }, { value: "b" }, { value:"m" }, { value:"w" }, { value:"v" }, { value:"z" } ],
    [ { value: "Dv", keyCode: -3 }, { value: "?123", ratio: 2, keyCode: -2 }, { value: "'" }, { value: "⎵", ratio: 4, keyCode: 32 }, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
  ],
  dvorakLayoutUpperCaps: [
    [ { value: "," }, { value: "." } , { value: "P" }, { value: "Y" } , { value: "F" }, { value: "G" } , { value: "C" }, { value: "R" }, { value: "L" }, { value: "⌫", keyCode: KeyEvent.DOM_VK_BACK_SPACE } ],
    [ { value: "A" }, { value: "O" }, { value: "E" }, { value: "U" }, { value: "I" } , { value: "D" }, { value: "H" }, { value: "T" }, { value: "N" }, { value: "S" } ],
    [ { value: "⇪", ratio: 1, keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: "Q" }, { value: "J" }, { value: "K" }, { value: "X" }, { value: "B" }, { value:"M" }, { value:"W" }, { value:"V" }, { value:"Z" } ],
    [ { value: "Dv", keyCode: -3 }, { value: "?123", ratio: 2, keyCode: -2 }, { value: "\"" }, { value: "⎵", ratio: 4, keyCode: 32 }, { value: "↵", ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN } ]
  ]
};

