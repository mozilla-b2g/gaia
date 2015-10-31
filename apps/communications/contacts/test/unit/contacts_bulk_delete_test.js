/*jshint node: true, browser: true */
/* globals MocksHelper, MockLoader,
           BulkDelete, ConfirmDialog */

'use strict';

requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_confirm_dialog.js');
requireApp('communications/contacts/test/unit/mock_loader.js');
requireApp('communications/contacts/test/unit/mock_overlay.js');

requireApp('communications/contacts/js/contacts_bulk_delete.js');

var mocksHelperForContactsBulkDelete = new MocksHelper([
  'Overlay',
  'ConfirmDialog'
]).init();

if (!window.utils) {
  window.utils = {};
}

suite('contacts_bulk_delete.js', function() {

  var realLoader;

  var promise = {};

  mocksHelperForContactsBulkDelete.attachTestHelpers();

  suiteSetup(function() {
    realLoader = window.Loader;
    window.Loader = MockLoader;
  });

  suiteTeardown(function() {
    window.Loader = realLoader;
  });

  setup(function() {
    this.sinon.spy(ConfirmDialog, 'show');
    this.sinon.spy(ConfirmDialog, 'hide');
  });

  function assertPerformDeleteSuccess(numberOfContacts) {
    BulkDelete.performDelete(promise);

    promise.onsuccess({
      length: numberOfContacts
    });

    assert.isTrue(ConfirmDialog.show.called);
    assert.isNull(ConfirmDialog.title);
    assert.deepEqual(ConfirmDialog.text,
                     {id: 'ContactConfirmDel', args: {n: 10}});
    assert.equal(ConfirmDialog.noObject.title, 'cancel');
    assert.equal(ConfirmDialog.yesObject.title, 'delete');
  }

  test('call performDelete successfully and user confirms', function(done) {
    var doDeleteStub = sinon.stub(BulkDelete, 'doDelete', function() {
      doDeleteStub.restore();
      done();
    });

    assertPerformDeleteSuccess(10);
    // Confirmed by user
    ConfirmDialog.executeYes();
    assert.isTrue(ConfirmDialog.hide.called);
  });

  test('call performDelete successfully and user cancels', function() {
    assertPerformDeleteSuccess(10);
    // Cancelled by user
    ConfirmDialog.executeNo();
    assert.isTrue(ConfirmDialog.hide.called);
  });
});
