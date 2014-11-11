Keyboards.gu = {
  label: 'Gujarati',
  shortLabel: 'Gu',
  menuLabel: 'ગુજરાતી',
  alternateLayoutKey: '?१२३',
  basicLayoutKey: 'કખગ',
  types: ['text', 'url', 'email', 'password'],
  imEngine: 'india',
  pages: [
    {
      width: 11,
      keyClassName: 'gujarati',
      secondLayout: true,
      upperCase: {
        'ૌ':'ઔ',
        'ૈ':'ઐ',
        'ા':'આ',
        'ી':'ઈ',
        'ૂ':'ઊ',
        'બ':'ભ',
        'હ':'ઙ',
        'ગ':'ઘ',
        'દ':'ધ',
        'જ':'ઝ',
        'ડ':'ઢ',
        'ો':'ઓ',
        'ે':'એ',
        '્':'અ',
        'િ':'ઇ',
        'ુ':'ઉ',
        'પ':'ફ',
        'ર':'ર',
        'ક':'ખ',
        'ત':'થ',
        'ચ':'છ',
        'ટ':'ઠ',
        'ૃ':'ઋ',
        'ં':'ઁ',
        'મ':'ણ',
        'ન':'ન',
        'વ':'વ',
        'લ':'ળ',
        'સ':'શ',
        'ય':'ષ',
        '઼':'ઞ'
      },
      alt: {
        'ૌ':'ઔ',
        'ૈ':'ઐ',
        'ા':'આ',
        'ી':'ઈ',
        'ૂ':'ઊ',
        'બ':'ભ',
        'હ':'ઙ',
        'ગ':'ઘ',
        'દ':'ધ',
        'જ':'ઝ',
        'ડ':'ઢ',
        'ો':'ઓ',
        'ે':'એ',
        '્':'અ',
        'િ':'ઇ',
        'ુ':'ઉ',
        'પ':'ફ',
        'ર':'ર',
        'ક':'ખ',
        'ત':'થ',
        'ચ':'છ',
        'ટ':'ઠ',
        'ૃ':'ઋ',
        'ં':'ઁ',
        'મ':'ણ',
        'ન':'ન',
        'વ':'વ',
        'લ':'ળ',
        'સ':'શ',
        'ય':'ષ',
        '઼':'ઞ'
      },
      keys: [
        [
          { value: 'ૌ' }, { value: 'ૈ' }, { value: 'ા' }, { value: 'ી' },
          { value: 'ૂ' }, { value: 'બ' }, { value: 'હ' }, { value: 'ગ' },
          { value: 'દ' }, { value: 'જ' }, { value: 'ડ' }
        ], [
          { value: 'ો' }, { value:'ે' }, { value: '્' }, { value: 'િ' },
          { value: 'ુ' }, { value: 'પ' }, { value: 'ર' }, { value: 'ક' },
          { value: 'ત' }, { value: 'ચ' }, { value: 'ટ' }
        ], [
          { value: '⇪', keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
          { value: 'ૃ' }, { value: 'ં' }, { value: 'મ' }, { value: 'ન' },
          { value: 'વ' }, { value: 'લ' }, { value: 'સ' }, { value: 'ય' },
          { value: '઼' }, { value: '⌫', keyCode: KeyEvent.DOM_VK_BACK_SPACE }
        ], [
          { value: '&nbsp', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE },
          { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
        ]
      ]
    }, {
      alt: {
        '०': ['0', 'º'],
        '१': ['1'],
        '२': ['2'],
        '३': ['3'],
        '४': ['4'],
        '५': ['5'],
        '६': ['6'],
        '७': ['7'],
        '८': ['8'],
        '९': ['9'],
        '₹': ['৳', '$', '€', '£', '¢', '¥'],
        '"': ['“', '”'],
        '\'':['‘', '’'],
        '?': ['¿'],
        '!': ['¡'],
        '+': ['-', '×', '÷', '±']
      },
      // These are based on the en layout, with top row modifed and $ localized.
      keys: [
        [
          { value: '१' }, { value: '२' }, { value: '३' }, { value: '४' },
          { value: '५' }, { value: '६' }, { value: '७' }, { value: '८' },
          { value: '९' }, { value: '०' }
        ], [
          { value: '@' }, { value: '#' },
          { value: '₹', className: 'alternate-indicator' }, { value: '&' },
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
