// Tests the manifest_helper.js from shared
'use strict';
/* global ManifestHelper, MockL10n */

require('/shared/test/unit/mocks/mock_l10n.js');
requireApp('system/shared/js/manifest_helper.js');

suite('ManifestHelper', function() {
  var realL10n;

  suiteSetup(function() {
    realL10n = navigator.mozL10n;
    navigator.mozL10n = MockL10n;
  });

  suiteTeardown(function() {
    navigator.mozL10n = realL10n;
  });

  test('All properties the same when no locales', function() {
    var data = {
      name: 'Built-in Keyboard',
      description: 'Built-in Keyboard',
      type: 'certified',
      role: 'keyboard'
    };
    var helper = new ManifestHelper(data);
    for (var prop in data) {
      assert.equal(helper[prop], data[prop], 'Value for ' + prop + 'matches');
    }
  });
  suite('Properties with locale overrides', function() {
    setup(function() {
      navigator.mozL10n.language.code = 'en-US';
      this.data = {
        name: 'Built-in Keyboard',
        description: 'Built-in Keyboard',
        type: 'certified',
        role: 'keyboard',
        test: 'none',
        sub: {
          test: 'none',
          array: [1, 2, 3],
          overriden: 'false',
          locales: {
            en: {
              overriden: 'true'
            }
          }
        },
        locales: {
          'en-US': {
            test: 'en-US'
          },
          en: {
            name: 'English Keyboard',
            test: 'en'
          }
        }
      };
      this.helper = new ManifestHelper(this.data);
    });
    test('not overriden', function() {
      assert.equal(this.helper.description, this.data.description);
    });
    test('overriden with en-US', function() {
      assert.equal(this.helper.test, 'en-US');
    });
    test('overriden with en', function() {
      assert.equal(this.helper.name, this.data.locales.en.name);
    });
    test('sub properties inherit locale translation', function() {
      assert.equal(this.helper.sub.overriden, 'true');
    });
    test('arrays stay arrays', function() {
      assert.ok(this.helper.sub.array instanceof Array);
    });
    test('helper is sensitive to change in locale', function() {
      navigator.mozL10n.language.code = 'en-GB';
      assert.equal(this.helper.test, 'en');
    });
  });
});
