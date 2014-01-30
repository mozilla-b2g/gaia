Keyboards['bg-Pho-Ban'] = {
  label: 'Bulgarian (New)',
  menuLabel: 'Български (БАН)',
  types: ['text', 'url', 'email'],
  imEngine: 'latin',
  autoCorrectLanguage: 'bg',
  width: 11,
  alt: {
    'и': 'ѝ'
  },
  keys: [
    [
      { value: 'ч' }, { value: 'ш' }, { value: 'е' }, { value: 'р' },
      { value: 'т' }, { value: 'ъ' }, { value: 'у' }, { value: 'и' },
      { value: 'о' }, { value: 'п' }, { value: 'я' }
    ], [
      { value: 'а' }, { value: 'с' }, { value: 'д' }, { value: 'ф' },
      { value: 'г' }, { value: 'х' }, { value: 'й' }, { value: 'к' },
      { value: 'л' }, { value: 'щ' }, { value: 'ь' }
    ], [
      { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'з' }, { value: 'ж' }, { value: 'ц' }, { value: 'в' },
      { value: 'б' }, { value: 'н' }, { value: 'м' }, { value: 'ю' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
