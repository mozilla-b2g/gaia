Keyboards.ru = {
  label: 'Russian',
  menuLabel: 'Pусский',
  imEngine: 'latin',
  types: ['text', 'url', 'email'],
  autoCorrectLanguage: 'ru',
  alt: {
    е: 'ё',
    ь: 'ъ'
  },
  width: 11,
  keys: [
    [
      { value: 'й' }, { value: 'ц' }, { value: 'у' }, { value: 'к' },
      { value: 'е' }, { value: 'н' }, { value: 'г' }, { value: 'ш' },
      { value: 'щ' }, { value: 'з' }, { value: 'х' }
    ], [
      { value: 'ф' }, { value: 'ы' }, { value: 'в' }, { value: 'а' },
      { value: 'п' }, { value: 'р' }, { value: 'о' }, { value: 'л' },
      { value: 'д' }, { value: 'ж' }, { value: 'э' }
    ], [
      { value: '⇪', keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'я' }, { value: 'ч' }, { value: 'с' }, { value: 'м' },
      { value: 'и' }, { value: 'т' }, { value: 'ь' }, { value: 'б' },
      { value: 'ю' }, { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
