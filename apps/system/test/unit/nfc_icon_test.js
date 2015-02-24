/* global NfcIcon, MockNfcManager */
'use strict';

requireApp('system/js/service.js');
requireApp('system/js/base_ui.js');
requireApp('system/js/base_icon.js');
requireApp('system/js/nfc_icon.js');
requireApp('system/test/unit/mock_nfc_manager.js');

suite('system/NfcIcon', function() {
  var subject, manager;

  setup(function() {
    manager = new MockNfcManager();
    subject = new NfcIcon(manager);
    subject.start();
    subject.element = document.createElement('div');
  });

  teardown(function() {
    subject.stop();
  });

  test('Nfc is inactive', function() {
    this.sinon.stub(manager, 'isActive').returns(false);
    subject.update();
    assert.isFalse(subject.isVisible());
  });

  test('Nfc is active', function() {
    this.sinon.stub(manager, 'isActive').returns(true);
    subject.update();
    assert.isTrue(subject.isVisible());
  });
});
