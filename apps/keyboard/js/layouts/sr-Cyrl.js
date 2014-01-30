Keyboards['sr-Cyrl'] = {
  label: 'Serbian (Cyrillic)',
  menuLabel: 'Српски (ћирилица)',
  imEngine: 'latin',
  types: ['text', 'url', 'email'],
  autoCorrectLanguage: 'sr-Cyrl',
  alt: {
    // incomplete
  },
  width: 11,
  keys: [
    [
      { value: 'љ' }, { value: 'њ' }, { value: 'е' }, { value: 'р' },
      { value: 'т' }, { value: 'з' }, { value: 'у' }, { value: 'и' },
      { value: 'о' }, { value: 'п' }, { value: 'ш' }
    ], [
      { value: 'а' }, { value: 'с' }, { value: 'д' }, { value: 'ф' },
      { value: 'г' }, { value: 'х' }, { value: 'ј' }, { value: 'к' },
      { value: 'л' }, { value: 'ч' }, { value: 'ћ' }
    ], [
      { value: '⇪', keyCode: KeyEvent.DOM_VK_CAPS_LOCK }, { value: 's' },
      { value: 'џ' }, { value: 'ц' }, { value: 'в' }, { value: 'б' },
      { value: 'н' }, { value: 'м' }, { value: 'ђ' }, { value: 'ж' },
      { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
