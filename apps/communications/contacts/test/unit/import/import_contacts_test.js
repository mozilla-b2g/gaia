'use strict';

/* global contacts */
/* global Contacts */
/* global LazyLoader */
/* global MyLocks */
/* global utils */
/* global TestUrlResolver */
/* global MockWakeLock */
/* global MockasyncStorage */
/* global MockMozL10n */
/* global MockSdCard */
/* global MocksHelper */
/* global MockUtils */
/* global MockContactsIndexHtml */
/* global MockNavigatorMozMobileConnection */
/* global MockNavigatorMozMobileConnections */

require('/shared/js/lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connection.js');

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
requireApp('communications/contacts/test/unit/mock_import_utils.js');
requireApp('communications/contacts/test/unit/mock_sim_importer.js');

requireApp('communications/dialer/test/unit/mock_confirm_dialog.js');

requireApp('communications/contacts/js/views/settings.js');
requireApp('communications/contacts/js/utilities/icc_handler.js');
requireApp('communications/contacts/js/utilities/sim_dom_generator.js');
requireApp('communications/contacts/js/navigation.js');

if (!window._) { window._ = null; }
if (!window.utils) { window.utils = null; }
if (!navigator.mozMobileConnections) { navigator.mozMobileConnections = null; }
if (!navigator.mozMobileConnection) { navigator.mozMobileConnection = null; }

var mocksHelperForContactImport = new MocksHelper([
  'Contacts', 'fb', 'asyncStorage', 'importUtils', 'ConfirmDialog',
  'VCFReader', 'WakeLock', 'SimContactsImporter'
]);
mocksHelperForContactImport.init();

suite('Import contacts >', function() {
  var mocksHelper = mocksHelperForContactImport;

  var real_,
      realUtils,
      realWakeLock,
      realMozMobileConnection,
      realMozMobileConnections;

  suiteSetup(function(done) {
    mocksHelper.suiteSetup();

    realMozMobileConnections = navigator.mozMobileConnections;
    realMozMobileConnection = navigator.mozMobileConnection;
    navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
    navigator.mozMobileConnection = MockNavigatorMozMobileConnection;

    realWakeLock = navigator.requestWakeLock;
    navigator.requestWakeLock = MockWakeLock;

    real_ = window._;
    window._ = MockMozL10n.get;

    realUtils = window.utils;
    window.utils = MockUtils;
    window.utils.overlay = {
      show: function() {},
      showMenu: function() {}
    };
    window.utils.sdcard = MockSdCard;
    window.utils.time = {
      pretty: function() {}
    };

    document.body.innerHTML = MockContactsIndexHtml;
    contacts.Settings.init();

    LazyLoader.load(TestUrlResolver.resolve(
      'communications/contacts/js/utilities/status.js'), done);
  });

  suiteTeardown(function() {
    navigator.mozMobileConnections = realMozMobileConnections;
    navigator.mozMobileConnection = realMozMobileConnection;
    navigator.requestWakeLock = realWakeLock;

    window.utils = realUtils;
    window._ = real_;

    mocksHelper.suiteTeardown();
  });

  setup(function() {
    this.sinon.spy(window.utils.overlay, 'showMenu');
    this.sinon.spy(Contacts, 'showStatus');
  });

  teardown(function() {
    MockasyncStorage.clear();
  });

  test('SD Import went well', function(done) {
    contacts.Settings.importFromSDCard(function onImported() {
      assert.isTrue(window.utils.overlay.showMenu.called);
      assert.isTrue(Contacts.showStatus.called);
      assert.equal(false, MyLocks.cpu);
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
      Contacts.showStatus = utils.status.show;
      contacts.Settings.init();
    });

    test('If there are no Contacts to be imported a message appears',
      function(done) {
        var observer = new MutationObserver(function(record) {
          observer.disconnect();
          assert.isTrue(record[0].target.classList.contains('opening'));
          done();
        });
        observer.observe(document.getElementById('statusMsg'), {
          attributes: true,
          attributeFilter: ['class']
        });
        var simOption = document.querySelector('.icon-sim');
        simOption.click();
    });
  });
});
