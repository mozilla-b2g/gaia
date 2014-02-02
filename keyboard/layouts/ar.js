Keyboards.ar = {
  label: 'Arabic',
  menuLabel: 'العربية',
  secondLayout: true,
  specificCssRule: true,
  types: ['text', 'url', 'email'],
  alternateLayoutKey: '123',
  basicLayoutKey: 'أ ب ج',
  width: 11,
  alt : {
	  ي:'ى'
  },
  keys: [
    [
      { value: 'ض' }, { value: 'ص' }, { value: 'ث' }, { value: 'ق' },
      { value: 'ف' }, { value: 'غ' } , { value: 'ع' }, { value: 'ه' },
      { value: 'خ' }, { value: 'ح' }, { value: 'ج' }
    ], [
      { value: 'ش' }, { value: 'س' }, { value: 'ي' }, { value: 'ب' },
      { value: 'ل' } , { value: 'ا' }, { value: 'ت' }, { value: 'ن' },
      { value: 'م' }, { value: 'ك' }, { value: 'ة' }
    ], [
      { value: '⇪', ratio: 1.5, keyCode: KeyEvent.DOM_VK_CAPS_LOCK },
      { value: 'ء' }, { value: 'ظ' }, { value: 'ط' }, { value: 'ذ' },
      { value: 'د' }, { value: 'ز' }, { value: 'ر' }, { value: 'و' },
      { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
    ], [
      { value: '&nbsp', ratio: 9, keyCode: KeyboardEvent.DOM_VK_SPACE },
      { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
    ]
  ],
  upperCase: {
    ض: 'َ',
    ص: 'ً',
    ث: 'ُ',
    ق: 'ٌ',
    ف: 'ْ',
    غ: 'ّ',
    ع: 'ِ',
    ه: 'ٍ',
    خ: '’',
    ح: ',',
    ج: '؛',
    ش: '\\',
    س: ']',
    ي: '[',
    ب: 'ـ',
    ل: 'إ',
    ا: 'أ',
    ت: 'آ',
    ن: '،',
    م: '/',
    ك: ':',
    ة: '\"',
    ء: 'ئ',
    ظ: 'ؤ',
    ط: '؟',
    ذ: '=',
    د: '-',
    ز: '×',
    ر: '÷',
    و: '+'
  },
  textLayoutOverwrite: {
    ',': '،'
  },
  alternateLayoutOverwrite: {
    '?': '؟'
  }
};
