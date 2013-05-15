/**
 * Tests for the shared l10n date code
 * TODO: Shared code unit tests should not be in gallery
 * Bug #841422 has been filed to move these tests
 */
require('/shared/js/l10n.js');

suite('L10n', function() {

  var _;

  suiteSetup(function(done) {
    _ = navigator.mozL10n.get;

    navigator.mozL10n.ready(function() {
      done();
    });

  });

  suite('get', function() {
    test('existing key', function() {
      assert.strictEqual(_('cropimage'), 'Crop');
    });

    test('inexisting key', function() {
      assert.strictEqual(_('bla'), '');
    });

  });

});
