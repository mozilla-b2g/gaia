/*jshint node: true, browser: true */
/* globals MocksHelper, MockLoader, BulkDelete, ConfirmDialog */

'use strict';

requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_confirm_dialog.js');
requireApp('communications/contacts/test/unit/mock_loader.js');

requireApp('communications/contacts/js/contacts_bulk_delete.js');

var mocksHelperForContactsBulkDelete = new MocksHelper([
  'ConfirmDialog'
]).init();

/* jshint ignore:start */
if (!this.utils) {
  this.utils = null;
}
/* jshint ignore:end */

suite('contacts_bulk_delete.js', function() {

  var realOverlay = null;
  var realLoader = null;

  var promise = {};

  var confirmShowSpy, confirmHideSpy, spies;

  mocksHelperForContactsBulkDelete.attachTestHelpers();

  suiteSetup(function() {
    if (!window.utils) {
      window.utils = {};
    }
    realOverlay = window.utils.overlay;
    window.utils.overlay = {
      show: function() {}
    };
    realLoader = window.Loader;
    window.Loader = MockLoader;
  });

  suiteTeardown(function() {
    window.utils.overlay = realOverlay;
    window.Loader = realLoader;
  });

  setup(function() {
    confirmShowSpy = sinon.spy(ConfirmDialog, 'show');
    confirmHideSpy = sinon.spy(ConfirmDialog, 'hide');
    spies = [confirmShowSpy, confirmHideSpy];
  });

  teardown(function() {
    spies.forEach(function(spy) {
      spy.restore();
    });
  });

  function assertPerformDeleteSuccess(numberOfContacts) {
    BulkDelete.performDelete(promise);

    promise.onsuccess({
      length: numberOfContacts
    });

    assert.isTrue(confirmShowSpy.called);
    assert.isNull(ConfirmDialog.title);
    assert.deepEqual(ConfirmDialog.text,
      { id: 'ContactConfirmDel', args: { n: 69 } });
    assert.equal(ConfirmDialog.noObject.title, 'cancel');
    assert.equal(ConfirmDialog.yesObject.title, 'delete');
  }

  test('call performDelete successfully and user confirms', function(done) {
    var doDeleteStub = sinon.stub(BulkDelete, 'doDelete', function() {
      doDeleteStub.restore();
      done();
    });

    assertPerformDeleteSuccess(69);
    // Confirmed by user
    ConfirmDialog.executeYes();
    assert.isTrue(confirmHideSpy.called);
  });

  test('call performDelete successfully and user cancels', function() {
    assertPerformDeleteSuccess(69);
    // Cancelled by user
    ConfirmDialog.executeNo();
    assert.isTrue(confirmHideSpy.called);
  });
});
