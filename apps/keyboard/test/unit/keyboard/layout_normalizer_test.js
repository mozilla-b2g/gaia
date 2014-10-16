'use strict';

/* global LayoutNormalizer, KeyEvent */

require('/js/keyboard/layout_normalizer.js');

suite('LayoutNormalizer', function() {
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

  var SPECIAL_CODES_MAP = {
    'VK_BACK_SPACE': KeyEvent.DOM_VK_BACK_SPACE,
    'VK_CAPS_LOCK': KeyEvent.DOM_VK_CAPS_LOCK,
    'VK_RETURN': KeyEvent.DOM_VK_RETURN,
    'VK_VK_ALT': KeyEvent.DOM_VK_ALT
  };

  var normalizer;

  setup(function (){
    normalizer = new LayoutNormalizer();
  });

  suite('isSpecialKey', function() {
    test('keyCode is in special codes', function(){
      Object.keys(SPECIAL_CODES_MAP).forEach(keyCodeName => {
        var key = {
          keyCode: SPECIAL_CODES_MAP[keyCodeName]
        };
        assert.isTrue(normalizer._isSpecialKey(key),
                      keyCodeName + ' should be regarded as special key.');
      });
    });

    test('keyCode is <= 0', function(){
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

  suite('getUpperCaseValue', function() {
    // For space key, special key, and composite key tests,
    // we're deliberately not passing layout,
    // as if the normalizer needs to use layout in the function, then something
    // is definitely wrong.

    test('Space key', function(){
      var key = {
        keyCode: KeyEvent.DOM_VK_SPACE,
        value: 'space'
      };
      assert.equal(normalizer._getUpperCaseValue(key), 'space');
    });

    test('Special keys', function(){
      Object.keys(SPECIAL_CODES_MAP).forEach(keyCodeName => {
        var key = {
          keyCode: SPECIAL_CODES_MAP[keyCodeName],
          value: keyCodeName
        };
        assert.equal(normalizer._getUpperCaseValue(key), keyCodeName);
      });
    });

    test('Composite keys', function(){
      var key = {
        keyCode: 'C'.charCodeAt(0),
        value: 'Com',
        compositeKey: 'Com'
      };
      assert.equal(normalizer._getUpperCaseValue(key), 'Com');
    });

    test('Use uppercase from layout', function(){
      normalizer._layout = {
        upperCase: {
          'a': 'E'
        }
      };
      var key = {
        keyCode: 'a'.charCodeAt(0),
        value: 'a'
      };
      assert.equal(normalizer._getUpperCaseValue(key), 'E',
                   'upperCase of "a" should be "E" in this crafted test');
    });

    test('Use key.value.toUpperCase()', function(){
      normalizer._layout = {};
      var key = {
        keyCode: 'a'.charCodeAt(0),
        value: 'a'
      };
      assert.equal(normalizer._getUpperCaseValue(key), 'A');
    });
  });

  suite('normalizeKey', function() {
    var stubGetUpperCaseValue;

    setup(function(){
      stubGetUpperCaseValue = this.sinon.stub(normalizer, '_getUpperCaseValue');
    });


    test('Calling getUpperCaseValue', function(){
      normalizer._layout = {};

      var key = {
        value: 'a'
      };

      stubGetUpperCaseValue.returns('A');

      normalizer._normalizeKey(key);

      assert.isTrue(stubGetUpperCaseValue.calledWith(key));

    });

    test('keyCode is not present: value should derive into keyCode and ' +
         'keyCodeUpper', function(){
      normalizer._layout = {};

      var key = {
        value: 'a'
      };

      stubGetUpperCaseValue.returns('A');

      normalizer._normalizeKey(key);

      assert.equal(key.keyCode, 'a'.charCodeAt(0));
      assert.equal(key.keyCodeUpper, 'A'.charCodeAt(0));
    });

    test('keyCode is present: should derive into keyCodeUpper', function(){
      normalizer._layout = {};

      var key = {
        value: 'a',
        keyCode: 'e'.charCodeAt(0)
      };

      stubGetUpperCaseValue.returns('A');

      normalizer._normalizeKey(key);

      assert.equal(key.keyCodeUpper, 'e'.charCodeAt(0),
                   'keyCodeUpper should be keyCode of "e" ' +
                   'in this crafted test');
    });

    test('value should derive into lowercaseValue and uppercaseValue',
      function(){
      normalizer._layout = {};

      var key = {
        value: 'a'
      };

      stubGetUpperCaseValue.returns('A');

      normalizer._normalizeKey(key);

      assert.equal(key.lowercaseValue, 'a');
      assert.equal(key.uppercaseValue, 'A');
    });

    test('isSpecialKey', function(){
      var stubIsSpecialKey = this.sinon.stub(normalizer, '_isSpecialKey');

      stubIsSpecialKey.returns(true);

      normalizer._layout = {};

      var key = {
        value: 'a'
      };

      stubGetUpperCaseValue.returns('A');

      normalizer._normalizeKey(key);

      assert.isTrue(key.isSpecialKey);

      stubIsSpecialKey.returns(false);

      var key2 = {
        value: 'a'
      };

      stubGetUpperCaseValue.returns('A');

      normalizer._normalizeKey(key2);

      assert.isFalse(key2.isSpecialKey);
    });

    test('longPressKeyCode is not present: should derive from longPressValue',
      function(){
      normalizer._layout = {};
      var key = {
        value: 'a',
        longPressValue: 'a'
      };

      stubGetUpperCaseValue.returns('A');

      normalizer._normalizeKey(key);

      assert.equal(key.longPressKeyCode, 'a'.charCodeAt(0));
    });

    test('longPressKeyCode is present: should not derive from longPressValue',
      function(){
      normalizer._layout = {};

      var key = {
        value: 'a',
        longPressValue: 'a',
        longPressKeyCode: 'b'.charCodeAt(0)
      };

      stubGetUpperCaseValue.returns('A');      

      normalizer._normalizeKey(key);

      assert.equal(key.longPressKeyCode, 'b'.charCodeAt(0),
                   'longPressKeyCode should be keyCode of "b" ' +
                   'in this crafted test');
    });

    test('supprtsSwitching key should be normalized too', function(){
      normalizer._layout = {};

      var key = {
        value: 'c',
        supportsSwitching: {
          value: 'a'
        }
      };

      stubGetUpperCaseValue.onFirstCall().returns('C');
      stubGetUpperCaseValue.onSecondCall().returns('A');

      normalizer._normalizeKey(key);

      assert.equal(key.supportsSwitching.keyCodeUpper, 'A'.charCodeAt(0));
    });
  });

  suite('normalizePageKeys', function() {
    test('keys', function() {
      normalizer._layout = {};

      var page = {
        keys: [
          [ {value: 'a'}, {value: 'b'} ],
          [ {value: 'c'}, {value: 'd'}, {value: 'e'} ]
        ]
      };

      var stubNormalizeKey = this.sinon.stub(normalizer, '_normalizeKey');

      normalizer._normalizePageKeys(page);

      assert.isTrue(stubNormalizeKey.calledWith({value: 'a'}));
      assert.isTrue(stubNormalizeKey.calledWith({value: 'b'}));
      assert.isTrue(stubNormalizeKey.calledWith({value: 'c'}));
      assert.isTrue(stubNormalizeKey.calledWith({value: 'd'}));
      assert.isTrue(stubNormalizeKey.calledWith({value: 'e'}));
    });

    text('textLayoutOverwrite', function() {
      normalizer._layout = {};

      var page = {
        textLayoutOverwrite: {
          'a': false,
          'b': 'B'
        }
      };

      var stubNormalizeKey = this.sinon.stub(normalizer, '_normalizeKey');
      stubNormalizeKey.returns('C');

      normalizer._normalizePageKeys(page);

      assert.isFalse(stubNormalizeKey.calledWith({value: 'a'}));
      assert.isTrue(stubNormalizeKey.calledWith({value: 'b'}));

      assert.deepEqual(page.textLayoutOverwrite, {
        'a': false,
        'b': 'C'
      });
    });
  });

  suite('normalizePageAltKeys', function() {
    test('normalize alt menu (single char keys)', function() {
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
    var stubNormalizePageKeys;
    var stubNormalizePageAltKeys;

    setup(function(){
      stubNormalizePageKeys = this.sinon.stub(normalizer, '_normalizePageKeys');
      stubNormalizePageAltKeys =
        this.sinon.stub(normalizer, '_normalizePageAltKeys');
    });

    test('generation of page 0', function(){
      normalizer._layout = {
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
      };

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
      normalizer._layout = {
        pages: []
      };

      range(4).forEach( index => {
        normalizer._layout.pages.push({index: index});
      });

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
