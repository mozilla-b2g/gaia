'use strict';

/* global contacts */
/* global Contacts */
/* global LazyLoader */
/* global MyLocks */
/* global MockWakeLock */
/* global MockasyncStorage */
/* global MockMozL10n */
/* global MockSdCard */
/* global MocksHelper */
/* global MockUtils */
/* global MockContactsIndexHtml */
/* global MockNavigatorMozMobileConnections */
/* global MockSimContactsImporter */
/* global MockVCFReader */
/* global MockMozContacts */

require('/shared/js/lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

requireApp('communications/contacts/services/contacts.js');
requireApp('communications/contacts/test/unit/mock_contacts_index.html.js');

requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_asyncstorage.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_wakelock.js');
requireApp('communications/contacts/test/unit/mock_sdcard.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/test/unit/mock_vcard_parser.js');
requireApp('communications/contacts/test/unit/mock_event_listeners.js');
requireApp('communications/contacts/test/unit/mock_sim_importer.js');

require('/shared/test/unit/mocks/mock_confirm_dialog.js');
require('/shared/test/unit/mocks/mock_mozContacts.js');

requireApp('communications/contacts/js/views/settings.js');
requireApp('communications/contacts/js/utilities/icc_handler.js');
requireApp('communications/contacts/js/utilities/sim_dom_generator.js');
requireApp('communications/contacts/js/navigation.js');

if (!window._) { window._ = null; }
if (!window.utils) { window.utils = null; }
if (!navigator.mozMobileConnections) { navigator.mozMobileConnections = null; }

var mocksHelperForContactImport = new MocksHelper([
  'Contacts', 'fb', 'asyncStorage', 'ConfirmDialog',
  'VCFReader', 'WakeLock', 'SimContactsImporter'
]);
mocksHelperForContactImport.init();

suite('Import contacts >', function() {
  var mocksHelper = mocksHelperForContactImport;

  var real_,
      realUtils,
      realWakeLock,
      realMozMobileConnections,
      realMozContacts;

  setup(function() {
    this.sinon.spy(window.utils.overlay, 'showMenu');
    this.sinon.spy(Contacts, 'showStatus');
  });

  teardown(function() {
    MockasyncStorage.clear();
  });

  suiteSetup(function(done) {
    mocksHelper.suiteSetup();

    realMozMobileConnections = navigator.mozMobileConnections;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;

    realWakeLock = navigator.requestWakeLock;
    navigator.requestWakeLock = MockWakeLock;

    realMozContacts = navigator.mozContacts;
    navigator.mozContacts = MockMozContacts;

    real_ = window._;
    window._ = MockMozL10n.get;

    realUtils = window.utils;
    window.utils = MockUtils;
    window.utils.overlay = {
      show: function() {},
      showMenu: function() {}
    };
    window.utils.misc = {
      getTimestamp: function(element, cb) {
        cb();
      },
      setTimestamp: function(time, cb) {
        cb();
      }
    };
    window.utils.sdcard = MockSdCard;
    window.utils.time = {
      pretty: function() {}
    };

    document.body.innerHTML = MockContactsIndexHtml;
    contacts.Settings.init();

    LazyLoader.load('/shared/js/contacts/import/utilities/status.js', done);
  });

  suiteTeardown(function() {
    navigator.mozMobileConnections = realMozMobileConnections;
    navigator.requestWakeLock = realWakeLock;
    navigator.mozContacts = realMozContacts;

    window.utils = realUtils;
    window._ = real_;

    mocksHelper.suiteTeardown();
  });

  test('SD Import went well', function(done) {
    contacts.Settings.importFromSDCard(function onImported() {
      assert.isTrue(window.utils.overlay.showMenu.called);
      assert.equal(Contacts.showStatus.getCall(0).args.length, 2);
      assert.equal(false, MyLocks.cpu);
      done();
    });
  });

  test('SD Import went well with duplicates found', function(done) {
    MockVCFReader.prototype.numDuplicated = 2;

    contacts.Settings.importFromSDCard(function onImported() {
      assert.isTrue(window.utils.overlay.showMenu.called);

      assert.isTrue(Contacts.showStatus.called);
      assert.isTrue(Contacts.showStatus.getCall(0).args[0] !== null);
      assert.isTrue(Contacts.showStatus.getCall(0).args[1] !== null);

      assert.equal(false, MyLocks.cpu);

      delete MockVCFReader.prototype.numDuplicated;
      done();
    });
  });

  test('SD Import with error cause no files to import', function(done) {
    // Simulate not finding any files
    MockSdCard.failOnRetrieveFiles = true;
    contacts.Settings.importFromSDCard(function onImported() {
      assert.isTrue(window.utils.overlay.showMenu.called);
      assert.isFalse(Contacts.showStatus.called);
      assert.equal(false, MyLocks.cpu);
      // Restore the mock
      MockSdCard.failOnRetrieveFiles = false;
      done();
    });
  });

  suite('SIM Import ', function() {
    suiteSetup(function() {
      contacts.Settings.init();
    });

    test('If there are no Contacts to be imported a message appears',
      function(done) {
        MockSimContactsImporter.prototype.numImportedContacts = 0;
        MockSimContactsImporter.prototype.numDuplicated = 0;
        MockSimContactsImporter.prototype.number = 0;

        contacts.Settings.importFromSIMCard('1234', function onImported() {
          assert.isTrue(Contacts.showStatus.called);
          assert.isTrue(Contacts.showStatus.getCall(0).args[0] !== null);
          assert.isTrue(Contacts.showStatus.getCall(0).args[1] === null);

          delete MockSimContactsImporter.prototype.numImportedContacts;
          done();
        });
    });

    test('SIM Import went well with duplicates found', function(done) {
      MockSimContactsImporter.prototype.numDuplicated = 1;
      MockSimContactsImporter.prototype.numImportedContacts = 3;
      MockSimContactsImporter.prototype.number = 3;

      contacts.Settings.importFromSIMCard('1234', function onImported() {
        assert.isTrue(Contacts.showStatus.called);
        assert.isTrue(Contacts.showStatus.getCall(0).args[0] !== null);
        assert.isTrue(Contacts.showStatus.getCall(0).args[1] !== null);

        assert.equal(false, MyLocks.cpu);

        delete MockSimContactsImporter.prototype.numDuplicates;
        done();
      });
    });
  });
});
