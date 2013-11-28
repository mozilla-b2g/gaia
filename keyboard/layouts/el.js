Keyboards.el = {
  label: 'Greek',
  menuLabel: 'Ελληνικό',
  imEngine: 'latin',
  types: ['text', 'url', 'email'],
  autoCorrectLanguage: 'el',
  upperCase: {
    'ς': 'ς'
  },
  alt: {
    α: 'ά',
    ε: 'έ€',
    ω: 'ώ',
    ο: 'ό',
    Υ: 'ΎΫ',
    υ: 'ύϋΰ',
    Ι: 'ΊΪ',
    ι: 'ίϊΐ',
    η: 'ή'
  },
  keys: [
    [
      { value: ';' }, { value: 'ς' }, { value: 'ε' } , { value: 'ρ' },
      { value: 'τ' } , { value: 'υ' }, { value: 'θ' } , { value: 'ι' },
      { value: 'ο' }, { value: 'π' }
    ], [
      { value: 'α' }, { value: 'σ' }, { value: 'δ' }, { value: 'φ' },
      { value: 'γ' } , { value: 'η' }, { value: 'ξ' }, { value: 'κ' },
      { value: 'λ' }, { value: "'", keyCode: 39 }
    ], [
      { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'ζ' }, { value: 'χ' }, { value: 'ψ' }, { value: 'ω' },
      { value: 'β' }, { value: 'ν' }, { value: 'μ' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};

// This special layout is used when composing SMS messages in Greek, so that
// it would allow 160 characters in one message
Keyboards['el-sms'] = {
  label: 'Greek SMS',
  menuLabel: 'Ελληνικό για SMS',
  imEngine: 'latin',
  keys: [
    [
      { value: ';' }, { value: 'Ε', keyCode: 0x45 /* ASCII E */ } ,
      { value: 'Ρ', keyCode: 0x50 /* ASCII P */ },
      { value: 'Τ', keyCode: 0x54 /* ASCII T */ },
      { value: 'Υ', keyCode: 0x59 /* ASCII Y */ },
      { value: 'Θ' }, { value: 'Ι', keyCode: 0x49 /* ASCII I */},
      { value: 'Ο', keyCode: 0x4F /* ASCII O */ }, { value: 'Π' }
    ], [
      { value: 'Α', keyCode: 0x41 /* ASCII A */ }, { value: 'Σ' },
      { value: 'Δ' }, { value: 'Φ'},
      { value: 'Γ' }, { value: 'Η', keyCode: 0x48 /* ASCII H */ },
      { value: 'Ξ' }, { value: 'Κ', keyCode: 0x4B /* ASCII K */ },
      { value: 'Λ' }, { value: "'"}
    ], [
      { value: '⇪', ratio: 1.5, keyCode: -5, // special key code for NO_OP
        disabled: true},
      { value: 'Ζ', keyCode: 0x5A /* ASCII Z */ },
      { value: 'Χ', keyCode: 0x58 /* ASCII X */ }, { value: 'Ψ' },
      { value: 'Ω' }, { value: 'Β', keyCode: 0x42 /* ASCII B */ },
      { value: 'Ν', keyCode: 0x4E /* ASCII N */ },
      { value: 'Μ', keyCode: 0x4D /* ASCII M */ },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ]
};
