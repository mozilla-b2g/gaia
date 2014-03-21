'use strict';
/* global ContactsBTExport */
/* global MockContactToVcarBlob */
/* global MockgetDeviceStorage */
/* global MockGetStorageIfAvailable */
/* global MockGetUnusedFilename */
/* global MocksHelper */
/* global MockMozL10n */

requireApp('communications/contacts/js/export/bt.js');
requireApp('communications/contacts/test/unit/mock_mozActivity.js');
requireApp('communications/contacts/test/unit/mock_get_device_storage.js');
requireApp('communications/contacts/test/unit/export/mock_export_utils.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');

if (!window._) {
  window._ = null;
}

if (!window.getStorageIfAvailable) {
  window.getStorageIfAvailable = null;
}

if (!window.getUnusedFilename) {
  window.getUnusedFilename = null;
}

if (!window.ContactToVcardBlob) {
  window.ContactToVcardBlob = null;
}

var mocksHelperForExportBT = new MocksHelper([
  'MozActivity'
]).init();

suite('BT export', function() {
  var real_,
      realMozL10n,
      realDeviceStorage,
      realgetUnusedFilename,
      realContactToVcardBlob,
      realgetStorageIfAvailable;

  var mockContact1 = {
        familyName: ['surname1'],
        givenName: ['name1']
      },
      mockContact2 = {
        familyName: ['surname2'],
        givenName: ['name2']
      };

  var subject,
      mockProgress,
      mocksHelper = mocksHelperForExportBT;

  suiteSetup(function() {
    mocksHelper.suiteSetup();

    // Device storage mock
    realDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockgetDeviceStorage;

    // L10n mock
    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;

    real_ = window._;
    window._ = navigator.mozL10n.get;

    //getStorageIfAvailable mock
    realgetStorageIfAvailable = window.getStorageIfAvailable;
    window.getStorageIfAvailable = MockGetStorageIfAvailable;

    //getUnusedFilename mock
    realgetUnusedFilename = window.getUnusedFilename;
    window.getUnusedFilename = MockGetUnusedFilename;

    //ContactToVcardBlob mock
    realContactToVcardBlob = window.ContactToVcardBlob;
    window.ContactToVcardBlob = MockContactToVcarBlob;

    mockProgress = function() {};
  });

  suiteTeardown(function() {
    mocksHelper.suiteTeardown();
    navigator.getDeviceStorage = realDeviceStorage;
    window._ = real_;
    window.getStorageIfAvailable = realgetStorageIfAvailable;
    window.getUnusedFilename = realgetUnusedFilename;
    window.ContactToVcardBlob = realContactToVcardBlob;
  });

  setup(function() {
    mocksHelper.setup();
    subject = new ContactsBTExport();
    subject.setProgressStep(mockProgress);
  });

  teardown(function() {
    mocksHelper.teardown();
  });

  test('Calling with 1 contact', function(done) {
    subject.setContactsToExport([mockContact1]);

    subject.doExport(function onFinish(error, exported, msg) {
      assert.equal(false, subject.hasDeterminativeProgress());
      assert.isNull(error);
      assert.equal(1, exported);
      done();
    });
  });

  test('Calling with several contacts', function(done) {
    var contacts = [mockContact1, mockContact2];
    subject.setContactsToExport(contacts);

    subject.doExport(function onFinish(error, exported, msg) {
      assert.isNull(error);
      assert.equal(contacts.length, exported);
      done();
    });
  });
});
