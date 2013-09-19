Keyboards.el = {
  label: 'Greek',
  menuLabel: 'Greek',
  imEngine: 'latin',
  autoCorrectLanguage: 'el',
  alt: {
    α: 'ά',
    ε: 'έ€',
    ω: 'ώ',
    ο: 'ό',
    Υ: 'ΎΫ',
    υ: 'ύϋΰ',
    Ι: 'ΊΪ',
    ι: 'ίϊΐ',
    η: 'ή',
    σ: 'ς'
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
