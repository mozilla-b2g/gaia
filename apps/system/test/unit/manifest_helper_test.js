// Tests the manifest_helper.js from shared
'use strict';
/* global ManifestHelper, MockL10n */

require('/shared/test/unit/mocks/mock_l20n.js');
requireApp('system/shared/js/manifest_helper.js');

suite('ManifestHelper', function() {
  var realL10n;

  suiteSetup(function() {
    realL10n = document.l10n;
    document.l10n = MockL10n;
  });

  suiteTeardown(function() {
    document.l10n = realL10n;
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
});
