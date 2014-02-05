Keyboards['bg-BDS'] = {
  label: 'Bulgarian (BDS)',
  menuLabel: 'Български (БДС)',
  types: ['text', 'url', 'email'],
  imEngine: 'latin',
  autoCorrectLanguage: 'bg',
  width: 11,
  alt: {
    'и': 'ѝ'
  },
  keys: [
    [
      { value: 'у' }, { value: 'е' }, { value: 'и' }, { value: 'ш' },
      { value: 'щ' }, { value: 'к' }, { value: 'с' }, { value: 'д' },
      { value: 'з' }, { value: 'ц' }, { value: 'б' }
    ], [
      { value: 'ь' }, { value: 'я' }, { value: 'а' }, { value: 'о' },
      { value: 'ж' }, { value: 'г' }, { value: 'т' }, { value: 'н' },
      { value: 'в' }, { value: 'м' }, { value: 'ч' }
    ], [
      { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'ю' }, { value: 'й' }, { value: 'ъ' }, { value: 'ф' },
      { value: 'х' }, { value: 'п' }, { value: 'р' }, { value: 'л' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
