'use strict';

/* global LayoutNormalizer, LayoutKeyNormalizer, KeyEvent */

require('/js/keyboard/layout_normalizer.js');

// little helper to build an array filled with numbers from |from| to |to|.
// ex: range(1, 10) -> [1,2,3,...9]
// useful for looping a specific number of iterations
var range = (from, to) => {
  if (undefined === to) {
    to = from;
    from = 0;
  }

  var rangeGenerator = function *() {
    for(var i = from; i < to; i++){
      yield i;
    }
  };

  return Array.from(rangeGenerator());
};

suite('LayoutKeyNormalizer', function() {
  var SPECIAL_CODES_MAP = {
    'VK_BACK_SPACE': KeyEvent.DOM_VK_BACK_SPACE,
    'VK_CAPS_LOCK': KeyEvent.DOM_VK_CAPS_LOCK,
    'VK_RETURN': KeyEvent.DOM_VK_RETURN,
    'VK_VK_ALT': KeyEvent.DOM_VK_ALT
  };

  suite('isSpecialKey', function() {
    test('keyCode is in special codes', function(){
      var normalizer = new LayoutKeyNormalizer();

      Object.keys(SPECIAL_CODES_MAP).forEach(keyCodeName => {
        var key = {
          keyCode: SPECIAL_CODES_MAP[keyCodeName]
        };
        assert.isTrue(normalizer._isSpecialKey(key),
                      keyCodeName + ' should be regarded as special key.');
      });
    });

    test('keyCode is <= 0', function(){
      var normalizer = new LayoutKeyNormalizer();

      // for the sake of this test, we only test 0 to -128
      range(-128, 1).forEach(keyCode => {
        var key = {
          keyCode: keyCode
        };
        assert.isTrue(normalizer._isSpecialKey(key),
                      keyCode + ' should be regarded as special key.');
      });
    });

    test('keyCode is > 0 and is not in special codes', function(){
      var normalizer = new LayoutKeyNormalizer();

      // for the sake of this test, we only test 1 to 255
      var keyCodeName;    // linter needs this definition
      var specialKeyCodes = [for (keyCodeName of Object.keys(SPECIAL_CODES_MAP))
                             SPECIAL_CODES_MAP[keyCodeName]];
      range(1, 256).forEach(keyCode => {
        if (specialKeyCodes.indexOf(keyCode) !== -1) {
          return;
        }
        var key = {
          keyCode: keyCode
        };
        assert.isFalse(normalizer._isSpecialKey(key),
                       keyCode + ' should not be regarded as special key.');
      });
    });
  });

  suite('isButton', function() {
    // As per bug#1212588, some special keys are to be regarded as
    // buttons (as per accesibility programs), but not all of
    // them. This unit test makes sure the functionality exists in the
    // layout normalizer. In case different keys are later decided to
    // swap roles, please change this test so that it stays
    // meaningful.

    var key = {
      keyCode: KeyEvent.DOM_VK_ALT,
      value: 'alt'
    };

    var button = {
      keyCode: KeyEvent.DOM_VK_RETURN,
      value: 'enter'
    };

    test('Alt is a key', function(){
      var normalizer = new LayoutKeyNormalizer();

      assert.isFalse(normalizer._isButton(key),
                     'alt should be regarded as a role=key, not a button.');
    });

    test('Return is a button', function(){
      var normalizer = new LayoutKeyNormalizer();

      assert.isTrue(normalizer._isButton(button),
                    'return should be regarded as a role=button, not a key.');
    });

    test('isButton present on normalized key', function(){
      var normalizer = new LayoutNormalizer({
        keys: [
          [{value: 'a'}]
        ],
        upperCase: {'a': 'C'}
      });

      normalizer.normalize();

      assert.isTrue(
        normalizer._layout.pages[0].keys[0][0].hasOwnProperty('isButton'),
        'a synthetic key made from a simple keyboard layout ' +
          'should have property isButton');
    });
  });


  suite('getUpperCaseValue', function() {
    // For space key, special key, and composite key tests,
    // we're deliberately not passing layout,
    // as if the normalizer needs to use layout in the function, then something
    // is definitely wrong.

    test('Space key', function(){
      var normalizer = new LayoutKeyNormalizer();

      var key = {
        keyCode: KeyEvent.DOM_VK_SPACE,
        value: 'space'
      };
      assert.equal(normalizer._getUpperCaseValue(key), 'space');
    });

    test('Special keys', function(){
      var normalizer = new LayoutKeyNormalizer();

      Object.keys(SPECIAL_CODES_MAP).forEach(keyCodeName => {
        var key = {
          keyCode: SPECIAL_CODES_MAP[keyCodeName],
          value: keyCodeName
        };
        assert.equal(normalizer._getUpperCaseValue(key), keyCodeName);
      });
    });

    test('Composite keys', function(){
      var normalizer = new LayoutKeyNormalizer();

      var key = {
        keyCode: 'C'.charCodeAt(0),
        value: 'Com',
        compositeKey: 'Com'
      };
      assert.equal(normalizer._getUpperCaseValue(key), 'Com');
    });

    test('Use uppercase from layout', function(){
      var normalizer = new LayoutKeyNormalizer({
        upperCase: {
          'a': 'E'
        }
      });

      var key = {
        keyCode: 'a'.charCodeAt(0),
        value: 'a'
      };

      assert.equal(
        normalizer._getUpperCaseValue(key), 'E',
        'upperCase of "a" should be "E" in this crafted test');
    });

    test('Use key.value.toUpperCase()', function(){
      var normalizer = new LayoutKeyNormalizer({});
      var key = {
        keyCode: 'a'.charCodeAt(0),
        value: 'a'
      };
      assert.equal(normalizer._getUpperCaseValue(key), 'A');
    });
  });

  suite('normalizeKey', function() {
    test('Calling getUpperCaseValue', function(){
      var normalizer = new LayoutKeyNormalizer({});

      var key = {
        value: 'a'
      };

      var stubGetUpperCaseValue =
        this.sinon.stub(normalizer, '_getUpperCaseValue').returns('A');

      normalizer.normalizeKey(key);

      assert.isTrue(stubGetUpperCaseValue.calledWith(key));
    });

    test('keyCode is not present: value should derive into keyCode and ' +
         'keyCodeUpper', function(){
      var normalizer = new LayoutKeyNormalizer({});

      var key = {
        value: 'a'
      };

      this.sinon.stub(normalizer, '_getUpperCaseValue').returns('A');

      normalizer.normalizeKey(key);

      assert.equal(key.keyCode, 'a'.charCodeAt(0));
      assert.equal(key.keyCodeUpper, 'A'.charCodeAt(0));
    });

    test('keyCode is present: should derive into keyCodeUpper', function(){
      var normalizer = new LayoutKeyNormalizer({});

      var key = {
        value: 'a',
        keyCode: 'e'.charCodeAt(0)
      };

      this.sinon.stub(normalizer, '_getUpperCaseValue').returns('A');

      normalizer.normalizeKey(key);

      assert.equal(key.keyCodeUpper, 'e'.charCodeAt(0),
                   'keyCodeUpper should be keyCode of "e" ' +
                   'in this crafted test');
    });

    test('value should derive into lowercaseValue and uppercaseValue',
    function(){
      var normalizer = new LayoutKeyNormalizer({});

      var key = {
        value: 'a'
      };

      this.sinon.stub(normalizer, '_getUpperCaseValue').returns('A');

      normalizer.normalizeKey(key);

      assert.equal(key.lowercaseValue, 'a');
      assert.equal(key.uppercaseValue, 'A');
    });

    test('isSpecialKey', function(){
      var normalizer = new LayoutKeyNormalizer({});
      var stubIsSpecialKey = this.sinon.stub(normalizer, '_isSpecialKey');

      stubIsSpecialKey.returns(true);

      var key = {
        value: 'a'
      };

      this.sinon.stub(normalizer, '_getUpperCaseValue').returns('A');

      normalizer.normalizeKey(key);

      assert.isTrue(key.isSpecialKey);

      stubIsSpecialKey.returns(false);

      var key2 = {
        value: 'a'
      };

      normalizer.normalizeKey(key2);

      assert.isFalse(key2.isSpecialKey);
    });

    test('longPressKeyCode is not present: should derive from longPressValue',
    function(){
      var normalizer = new LayoutKeyNormalizer({});
      var key = {
        value: 'a',
        longPressValue: 'a'
      };

      this.sinon.stub(normalizer, '_getUpperCaseValue').returns('A');

      normalizer.normalizeKey(key);

      assert.equal(key.longPressKeyCode, 'a'.charCodeAt(0));
    });

    test('longPressKeyCode is present: should not derive from longPressValue',
    function(){
      var normalizer = new LayoutKeyNormalizer({});

      var key = {
        value: 'a',
        longPressValue: 'a',
        longPressKeyCode: 'b'.charCodeAt(0)
      };

      this.sinon.stub(normalizer, '_getUpperCaseValue').returns('A');

      normalizer.normalizeKey(key);

      assert.equal(key.longPressKeyCode, 'b'.charCodeAt(0),
                   'longPressKeyCode should be keyCode of "b" ' +
                   'in this crafted test');
    });

    test('supprtsSwitching key should be normalized too', function(){
      var normalizer = new LayoutKeyNormalizer({});

      var key = {
        value: 'c',
        supportsSwitching: {
          value: 'a'
        }
      };

      this.sinon.stub(normalizer, '_getUpperCaseValue')
                .onFirstCall().returns('C')
                .onSecondCall().returns('A');

      normalizer.normalizeKey(key);

      assert.equal(key.supportsSwitching.keyCodeUpper, 'A'.charCodeAt(0));
    });

    test('normalize a key which has alternative keys', function() {
      var normalizer = new LayoutKeyNormalizer({});

      this.sinon.stub(normalizer, '_getUpperCaseValue').returns('A');

      var key = {
        value: 'a'
      };

      normalizer.normalizeKey(key, {}, true);

      assert.equal(key.className, 'alternate-indicator');
    });
  });
});

suite('LayoutNormalizer', function() {
  suite('normalizePageKeys', function() {
    var stubNormalizeKey;

    setup(function() {
      stubNormalizeKey =
        sinon.stub(LayoutKeyNormalizer.prototype, 'normalizeKey');
    });

    teardown(function() {
      stubNormalizeKey.restore();
    });

    test('keys', function() {
      var normalizer = new LayoutNormalizer({});

      var page = {
        keys: [
          [ {value: 'a'}, {value: 'b'} ],
          [ {value: 'c'}, {value: 'd'}, {value: 'e'} ]
        ]
      };

      normalizer._normalizePageKeys(page);

      assert.isTrue(stubNormalizeKey.calledWith({value: 'a'}));
      assert.isTrue(stubNormalizeKey.calledWith({value: 'b'}));
      assert.isTrue(stubNormalizeKey.calledWith({value: 'c'}));
      assert.isTrue(stubNormalizeKey.calledWith({value: 'd'}));
      assert.isTrue(stubNormalizeKey.calledWith({value: 'e'}));
    });

    test('textLayoutOverwrite', function() {
      var normalizer = new LayoutNormalizer({});

      var page = {
        textLayoutOverwrite: {
          'a': false,
          'b': 'B'
        }
      };

      stubNormalizeKey.returns('C');

      normalizer._normalizePageKeys(page);

      assert.isFalse(stubNormalizeKey.calledWith({value: false}));
      assert.isTrue(stubNormalizeKey.calledWith({value: 'B'}));

      assert.deepEqual(page.textLayoutOverwrite, {
        'a': false,
        'b': 'C'
      });
    });

    test('overwriting key in textLayoutOverwrite has alternative keys',
      function() {
        var normalizer = new LayoutNormalizer({});

        var page = {
          textLayoutOverwrite: {
            'a': 'b'
          },
          alt: {
            'b': 'cdefg'
          }
        };

        // we'd like to have normalizeKey really do it job in this test
        stubNormalizeKey.restore();

        var overwritingkey = 'b';
        var hasAlternativeKeys = normalizer._hasAlternativeKeys(overwritingkey,
                                                                page);
        assert.isTrue(hasAlternativeKeys);

        normalizer._normalizePageKeys(page);
        assert.equal(page.textLayoutOverwrite.a.className,
                     'alternate-indicator');
      });
  });

  suite('normalizePageAltKeys', function() {
    test('normalize alt menu (single char keys)', function() {
      var normalizer = new LayoutNormalizer({});
      var page = {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: {
          'a': 'áàâäåãāæ'
        },
        upperCase: {}
      };

      normalizer._normalizePageAltKeys(page);

      assert.deepEqual(page, {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: { 'a': [ 'á', 'à', 'â', 'ä', 'å', 'ã', 'ā', 'æ' ],
               'A': [ 'Á', 'À', 'Â', 'Ä', 'Å', 'Ã', 'Ā', 'Æ' ] },
        upperCase: {}
      });
    });

    test('normalize alt menu (with multi-char keys)', function() {
      var normalizer = new LayoutNormalizer({});
      var page = {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: {
          'a': 'á à â A$'
        },
        upperCase: {}
      };

      normalizer._normalizePageAltKeys(page);

      assert.deepEqual(page, {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: { 'a': [ 'á', 'à', 'â', 'A$' ],
               'A': [ 'Á', 'À', 'Â', 'A$' ] },
        upperCase: {}
      });
    });

    test('normalize alt menu (with one multi-char keys)', function() {
      var normalizer = new LayoutNormalizer({});
      var page = {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: {
          'a': 'A$ '
        },
        upperCase: {}
      };

      normalizer._normalizePageAltKeys(page);

      assert.deepEqual(page, {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: { 'a': [ 'A$' ],
               'A': [ 'A$' ] },
        upperCase: {}
      });
    });

    test('normalize alt menu (with Turkish \'i\' key)', function() {
      var normalizer = new LayoutNormalizer({});
      var page = {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: {
          'i': 'ß'
        },
        upperCase: {
          'i': 'İ'
        }
      };

      normalizer._normalizePageAltKeys(page);

      assert.deepEqual(page, {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: { 'i': [ 'ß' ],
               'İ': [ 'ß' ] },
        upperCase: {
          'i': 'İ'
        }
      });
    });

    test('normalize alt menu (with Catalan \'l·l\' key)', function() {
      var normalizer = new LayoutNormalizer({});
      var page = {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: {
          'l': 'l·l ł £'
        },
        upperCase: {}
      };

      normalizer._normalizePageAltKeys(page);

      var expectedPage = {
        keys: [
          [
            { value: 'preloaded' }
          ]
        ],
        alt: { 'l': [ 'l·l', 'ł', '£' ],
               'L': [ 'L·l', 'Ł', '£' ] },
        upperCase: {}
      };
      expectedPage.alt.L.upperCaseLocked = [ 'L·L', 'Ł', '£' ];

      assert.deepEqual(page, expectedPage);
    });
  });

  suite('normalize', function() {
    test('generation of page 0', function(){
      var normalizer = new LayoutNormalizer({
        alt: {'alt': [1]},
        keys: [2],
        upperCase: {'a': 'A'},
        width: 3,
        keyClassName: 'C',
        typeInsensitive: true,
        textLayoutOverwrite: {',': 'comma'},
        needsCommaKey: true,
        secondLayout: true,
        specificCssRule: true
      });

      this.sinon.stub(normalizer, '_normalizePageKeys');
      this.sinon.stub(normalizer, '_normalizePageAltKeys');

      normalizer.normalize();

      assert.deepEqual(normalizer._layout, {
        pages: [
          {
            alt: {'alt': [1]},
            keys: [2],
            upperCase: {'a': 'A'},
            width: 3,
            keyClassName: 'C',
            typeInsensitive: true,
            textLayoutOverwrite: {',': 'comma'},
            needsCommaKey: true,
            secondLayout: true,
            specificCssRule: true
          }
        ]
      }, 'page 0 of layout was not generated from layout top-most attributes');
    });

    test('each page gets normalized', function(){
      var layout = {
        pages: []
      };

      range(4).forEach( index => {
        layout.pages.push({index: index});
      });

      var normalizer = new LayoutNormalizer(layout);

      var stubNormalizePageKeys =
        this.sinon.stub(normalizer, '_normalizePageKeys');
      var stubNormalizePageAltKeys =
        this.sinon.stub(normalizer, '_normalizePageAltKeys');

      normalizer.normalize();

      range(4).forEach( index => {
        assert.isTrue(
          stubNormalizePageKeys.calledWith({index: index}),
          'normalizePageKeys was not called for index = ' + index
        );
        assert.isTrue(
          stubNormalizePageAltKeys.calledWith({index: index}),
          'normalizePageAltKeys was not called for index = ' + index
        );
      });
    });
  });
});

suite('Layout normalization: Cross-module integrated tests', function() {
  test('getUpperCase correctly uses moved-to-page0 properties', function(){
    var normalizer = new LayoutNormalizer({
      keys: [
        [{value: 'a'}]
      ],
      upperCase: {'a': 'C'}
    });

    normalizer.normalize();

    assert.deepEqual(normalizer._layout.pages[0].keys,
      [
        [{
          value: 'a',
          keyCode: 97,
          keyCodeUpper: 67,
          lowercaseValue: 'a',
          uppercaseValue: 'C',
          isSpecialKey: false,
          isButton: false
        }]
      ], 'upperCase of "a" should be "C" in this crafted test');
  });
});
