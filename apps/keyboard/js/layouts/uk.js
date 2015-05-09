Keyboards.uk = {
  label: 'Ukrainian',
  shortLabel: 'Uk',
  menuLabel: 'Українська',
  imEngine: 'latin',
  types: ['text', 'url', 'email'],
  basicLayoutKey: 'АБВ',
  lang: 'uk',
  pages: [ {    //default page
    alt: {
      а: '@',
      г: 'ґ'
    },
    width: 12,
    keys: [
      [
        { value: 'й' }, { value: 'ц' }, { value: 'у' }, { value: 'к' },
        { value: 'е' }, { value: 'н' }, { value: 'г' }, { value: 'ш' },
        { value: 'щ' }, { value: 'з' }, { value: 'х' }, { value: 'ї' }
      ], [
        { value: 'ф' }, { value: 'і' }, { value: 'в' }, { value: 'а' },
        { value: 'п' }, { value: 'р' }, { value: 'о' }, { value: 'л' },
        { value: 'д' }, { value: 'ж' }, { value: 'є' }
      ], [
        { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
        { value: 'я' }, { value: 'ч' }, { value: 'с' }, { value: 'м' },
        { value: 'и' }, { value: 'т' }, { value: 'ь' }, { value: 'б' },
        { value: 'ю' }, { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 10, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ],
  }, {  // symbol page 1
    alt: {
      '0': ['º'],
      '₴': ['$', '€', '£', '¢', '¥'],
      '"': ['“', '”'],
      '\'':['‘', '’']
    },
    // These are based on the en layout
    keys: [
      [
        { value: '1' }, { value: '2' }, { value: '3' }, { value: '4' },
        { value: '5' }, { value: '6' }, { value: '7' }, { value: '8' },
        { value: '9' }, { value: '0' }
      ], [
        { value: '@' }, { value: '#' },
        { value: '₴', className: 'alternate-indicator' }, { value: '&' },
        { value: '*' }, { value: '-' }, { value: '_' }, { value: '/' },
        { value: '(' }, { value: ')' }
      ], [
        { value: 'Alt', ratio: 1.5,
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'page-switch-key',
          targetPage: 2
        },
        { value: '+',
          supportsSwitching: {
            value: ','
          }
        }, { value: ':' }, { value: ';' }, { value: '"' },
        { value: '\'' }, { value: '!' }, { value: '?' },
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  }
 ]
};
