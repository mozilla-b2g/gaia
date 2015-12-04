Keyboards.fa = {
  label: 'Persian',
  shortLabel: 'فا',
  menuLabel: 'فارسی',
  secondLayout: true,
  types: ['text', 'url', 'email'],
  alternateLayoutKey: '۱۲۳',
  basicLayoutKey: 'اب‌پ',
  lang: 'fa',
  pages: [ { // Default Page
    width: 11,
    specificCssRule: true,
    needsCommaKey: true,
    alt : {
      'ض': ['۱', '1'],
      'ص': ['۲', '2'],
      'ث': ['۳', '3'],
      'ق': ['۴', '4'],
      'ف': ['۵', '5'],
      'غ': ['۶', '6'],
      'ع': ['۷', '7'],
      'ه': ['ۀ', 'ة', '۸', '8'],
      'خ': ['۹', '9'],
      'ح': ['۰', '0'],
      'ا': ['آ', 'أ', 'ء'],
      'ی': ['ئ','ي'],
      'ت': 'ة',
      'ک': 'ك',
      '.': 'ًٌٍَُِّْءٔٓ',
      '،': ':!؟؛-«»'
    },
    textLayoutOverwrite: {
      ',': '،'
    },
    keys: [
      [
        { value: 'ض' }, { value: 'ص' }, { value: 'ث' }, { value: 'ق' },
        { value: 'ف' }, { value: 'غ' }, { value: 'ع' }, { value: 'ه' },
        { value: 'خ' }, { value: 'ح' }, { value: 'ج' }
      ], [
        { value: 'ش' }, { value: 'س' }, { value: 'ی' }, { value: 'ب' },
        { value: 'ل' }, { value: 'ا' }, { value: 'ت' }, { value: 'ن' },
        { value: 'م' }, { value: 'ک' }, { value: 'گ' }
      ], [
        { value: 'ظ' }, { value: 'ط' }, { value: 'ژ' }, { value: 'ز' },
        { value: 'ر' }, { value: 'ذ' }, { value: 'د' }, { value: 'پ' },
        { value: 'و' }, { value: 'چ' }, { value: '⌫', ratio: 1, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 8, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '\u25C2\u2507\u25B8', ratio: 1, keyCode: '8204', ariaLabel: 'نیم‌فاصله' },
        { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ],
  }, { // Symbols Page
    specificCssRule: true,
    alt: {
      '۱': ['1', '¹'],
      '۲': ['2', '²'],
      '۳': ['3', '³'],
      '۴': ['4', '⁴'],
      '۵': ['5', '⁵'],
      '۶': ['6', '⁶'],
      '۷': ['7', '⁷'],
      '۸': ['8', '⁸'],
      '۹': ['9', '⁹'],
      '۰': ['0', '⁰'],
      '﷼': ['$', '€', '£', '¢', '¥'],
      '»': ['"', '“', '”'],
      '«': ['\'', '‘', '’'],
      '؟': ['?', '¿'],
      '!': ['¡'],
      '+': ['-', '×', '÷', '±'],
      '؛': [';'],
      '.': 'ًٌٍَُِّْءٔٓ'
    },
    keys: [
      [
        { value: '۱' }, { value: '۲' }, { value: '۳' }, { value: '۴' },
        { value: '۵' }, { value: '۶' }, { value: '۷' }, { value: '۸' },
        { value: '۹' }, { value: '۰' },
      ], [
        { value: '@' }, { value: '#' }, { value: '﷼', className: 'alternate-indicator' },
        { value: '+' }, { value: '%' }, { value: '*' }, { value: '-' },
        { value: '/' }, { value: '(' }, { value: ')' }
      ], [
        { value: 'Alt', ratio: 1.5,
          keyCode: KeyboardEvent.DOM_VK_ALT,
          className: 'page-switch-key',
          targetPage: 2
        },
        { value: '&' }, { value: ':' }, { value: '؛' }, { value: '«' },
        { value: '»' }, { value: '!' }, { value: '؟' },
        { value: '⌫', ratio: 1.5, keyCode: KeyEvent.DOM_VK_BACK_SPACE }
      ], [
        { value: '&nbsp', ratio: 7, keyCode: KeyboardEvent.DOM_VK_SPACE },
        { value: '_' }, { value: '↵', ratio: 2, keyCode: KeyEvent.DOM_VK_RETURN }
      ]
    ]
  } ]
};
