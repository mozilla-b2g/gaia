/* globals ContactsSDExport, mocha, MockgetDeviceStorage,
           MockGetStorageIfAvailable, MockGetUnusedFilename */

'use strict';

requireApp('communications/contacts/js/export/sd.js');
requireApp('communications/contacts/test/unit/mock_get_device_storage.js');
requireApp('communications/contacts/test/unit/export/mock_export_utils.js');

mocha.globals(
  [
    '_',
    'ContactToVcard',
    'getUnusedFilename',
    'getStorageIfAvailable'
  ]
);

suite('Sd export', function() {

  var subject;
  var realDeviceStorage = null;
  var c1 = {
        familyName: ['foo'],
        givenName: ['bar']
      },
      c2 = {
        givenName: ['bar']
      },
      c3 = {
        familyName: ['foo']
      },
      c4 = {};
  var updateSpy = null;
  var progressMock = function dummy() {};
  var realContactToVcard = null;
  var real_ = null;
  var realgetStorageIfAvailable = null;
  var realgetUnusedFilename = null;

  suiteSetup(function() {
    // Device storage mock
    realDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockgetDeviceStorage;

    // L10n mock
    real_ = window._;
    window._ = function() {};

    // getStorageIfAvailable mock
    realgetStorageIfAvailable = window.getStorageIfAvailable;
    window.getStorageIfAvailable = MockGetStorageIfAvailable;

    // getUnusedFilename mock
    realgetUnusedFilename = window.getUnusedFilename;
    window.getUnusedFilename = MockGetUnusedFilename;
  });

  suiteTeardown(function() {
    navigator.getDeviceStorage = realDeviceStorage;
    window._ = real_;
    window.getStorageIfAvailable = realgetStorageIfAvailable;
    window.getUnusedFilename = realgetUnusedFilename;
  });

  setup(function() {
    subject = new ContactsSDExport();
    subject.setProgressStep(progressMock);
    realContactToVcard = window.ContactToVcard;
    window.ContactToVcard = function() {};
    updateSpy = this.sinon.stub(
      window,
      'ContactToVcard',
      function(contacts, append, finish) {
        append(' ', contacts.length);
        finish();
        /* This dummy append call is required to trigger the otherwise
         * asynchronous completion logic within the export code. */
        append('', 0);
      }
    );
  });

  teardown(function() {
    window.ContactToVcard = realContactToVcard;
  });

  test('Calling with 1 contact', function(done) {
    subject.setContactsToExport([c1]);

    subject.doExport(function onFinish(error, exported, msg) {
      done(function() {
        assert.equal(false, subject.hasDeterminativeProgress());
        assert.equal(1, updateSpy.callCount);
        assert.isNull(error);
        assert.equal(1, exported);
      });
    });
  });

  test('Calling with 1 contact with no given name', function(done) {
    subject.setContactsToExport([c2]);

    subject.doExport(function onFinish(error, exported, msg) {
      done(function() {
        assert.equal(false, subject.hasDeterminativeProgress());
        assert.equal(1, updateSpy.callCount);
        assert.isNull(error);
        assert.equal(1, exported);
      });
    });
  });

  test('Calling with 1 contact with no family name', function(done) {
    subject.setContactsToExport([c3]);

    subject.doExport(function onFinish(error, exported, msg) {
      done(function() {
        assert.equal(false, subject.hasDeterminativeProgress());
        assert.equal(1, updateSpy.callCount);
        assert.isNull(error);
        assert.equal(1, exported);
      });
    });
  });

  test('Calling with several contacts', function(done) {
    var contacts = [c1, c2, c3, c4];

    subject.setContactsToExport(contacts);

    subject.doExport(function onFinish(error, exported, msg) {
      done(function() {
        assert.equal(1, updateSpy.callCount);
        assert.isNull(error);
        assert.equal(contacts.length, exported);
      });
    });
  });
});
