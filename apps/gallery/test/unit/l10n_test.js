/**
 * Tests for the shared l10n date code
 * TODO: Shared code unit tests should not be in gallery
 * Bug #841422 has been filed to move these tests
 */
require('/shared/js/l10n.js');

suite('L10n', function() {

  var _;

  // these l10n keys are defined in apps/gallery/locales/
  var key_cropImage = 'cropimage';
  var key_delete = 'delete-n-items?';

  suiteSetup(function(done) {
    _ = navigator.mozL10n.get;

    navigator.mozL10n.ready(function() {
      done();
    });

  });

  suite('get', function() {
    test('existing key', function() {
      assert.strictEqual(_(key_cropImage), 'Crop');
    });

    test('inexisting key', function() {
      assert.strictEqual(_('bla'), '');
    });

  });

  suite('plural', function() {
    test('n=0', function() {
      assert.strictEqual(_(key_delete, { n: 0 }), 'Nothing selected');
    });

    test('n=1', function() {
      assert.strictEqual(_(key_delete, { n: 1 }), 'Delete selected item?');
    });

    test('n=2', function() {
      assert.strictEqual(_(key_delete, { n: 2 }), 'Delete 2 items?');
    });

  });

});
