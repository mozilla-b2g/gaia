Keyboards.he = {
  label: 'Hebrew',
  types: ['text', 'url', 'email'],
  menuLabel: 'עִבְרִית',
  alt: {
    // incomplete
  },
  keys: [
    [
      { value: 'ק' }, { value: 'ר' }, { value: 'א' }, { value: 'ט' },
      { value: 'ו' }, { value: 'ן' }, { value: 'ם' }, { value: 'פ' },
      { value: '⌫', ratio: 2, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: 'ש' }, { value: 'ד' }, { value: 'ג' }, { value: 'כ' },
      { value: 'ע' }, { value: 'י' }, { value: 'ח' }, { value: 'ל' },
      { value: 'ך' }, { value: 'ף' }
    ], [
      { value: 'ז' }, { value: 'ס' }, { value: 'ב' }, { value: 'ה' },
      { value: 'נ' }, { value: 'מ' }, { value: 'צ' }, { value: 'ת' },
      { value: 'ץ' }, { value: '?' }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
