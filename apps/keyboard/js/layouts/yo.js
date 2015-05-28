Keyboards.yo = {
  label: ' Yoruba',
  shortLabel: 'Yo',
  menuLabel: 'Yorùbá',
  imEngine: 'latin',
  types: ['text', 'url', 'email', 'password'],
  lang: 'yo',
  pages: [ {   // default page
    alt: {
      a: ['á', 'à', 'ā'],
      e: ['è', 'e̩', 'é̩', 'è̩', 'ē̩', 'ē', 'é', 'ẹ', 'ẹ́', 'ẹ̀', 'ẹ̄'],
      i: ['í', 'ì', 'ī'],
      o: ['ò', 'o̩', 'ó̩', 'ò̩', 'ō̩', 'ō', 'ó', 'ọ', 'ọ́', 'ọ̀', 'ọ̄'],
      s: ['ṣ', 's̩'],
      u: ['ú', 'ù', 'ū'],
      '.': [',', '?', '!', ';', ':', '…']
    },
    keys: [
      [
        { value: 'q' }, { value: 'w' }, { value: 'e' }, { value: 'r' },
        { value: 't' }, { value: 'y' }, { value: 'u' }, { value: 'i' },
        { value: 'o' }, { value: 'p' }
      ], [
        { value: 'a' }, { value: 's' }, { value: 'd' }, { value: 'f' },
        { value: 'g' }, { value: 'h' }, { value: 'j' }, { value: 'k' },
        { value: 'l' }
      ], [
        { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
        { value: 'z' }, { value: 'x' }, { value: 'c' }, { value: 'v' },
        { value: 'b' }, { value: 'n' }, { value: 'm' },
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  } ]
};
