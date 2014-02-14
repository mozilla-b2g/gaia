require('/shared/js/lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connection.js');
requireApp('communications/contacts/test/unit/mock_contacts_index.html.js');
requireApp('communications/contacts/test/unit/mock_iccmanager.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_asyncstorage.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_get_device_storage.js');
requireApp('communications/contacts/test/unit/mock_sdcard.js');
requireApp('communications/contacts/test/unit/mock_icc_helper.js');
requireApp('communications/dialer/test/unit/mock_confirm_dialog.js');
requireApp('communications/contacts/test/unit/mock_vcard_parser.js');
requireApp('communications/contacts/test/unit/mock_mozContacts.js');
requireApp('communications/contacts/test/unit/mock_sim_importer.js');
requireApp('communications/contacts/test/unit/mock_wakelock.js');
requireApp('communications/contacts/js/import_utils.js');
requireApp('communications/contacts/js/utilities/icc_handler.js');
requireApp('communications/contacts/js/utilities/sim_dom_generator.js');
requireApp('communications/contacts/js/navigation.js');
requireApp('communications/contacts/js/views/settings.js');
requireApp('communications/contacts/js/utilities/cookie.js');
requireApp('communications/contacts/js/utilities/event_listeners.js');

if (!this._) this._ = null;
if (!this.utils) this.utils = null;
if (!navigator.mozContacts) navigator.mozContacts = null;
if (!navigator.mozIccManager) navigator.mozIccManager = null;
if (!navigator.mozMobileConnections) navigator.mozMobileConnections = null;
if (!navigator.mozMobileConnection) navigator.mozMobileConnection = null;

if (!window.Rest) {
  window.Rest = null;
}

window.self = null;

var realMozContacts, realUtils, realMozIccManager,
  realMozMobileConnection, realMozMobileConnections;

if (!this.realMozContacts) {
  realMozContacts = null;
}

if (!this.realMozIccManager) {
  realIccManager = null;
}

var mocksHelperForContactSettings = new MocksHelper([
  'Contacts', 'asyncStorage', 'fb', 'ConfirmDialog', 'VCFReader', 'IccHelper',
  'SimContactsImporter', 'WakeLock'
]);
mocksHelperForContactSettings.init();

suite('Contacts settings', function() {
  var checkForCard, real_;
  var realDeviceStorage;
  var mocksHelper = mocksHelperForContactSettings;

  function stub(additionalCode, ret) {
    if (additionalCode && typeof additionalCode !== 'function')
      ret = additionalCode;

    var nfn = function() {
      nfn.callCount++;
      nfn.calledWith = [].slice.call(arguments);

      if (typeof additionalCode === 'function')
        additionalCode.apply(this, arguments);

      return ret;
    };
    nfn.callCount = 0;
    return nfn;
  }

  suiteSetup(function(done) {
    mocksHelper.suiteSetup();

    real_ = window._;
    realUtils = window.utils;
    realDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockgetDeviceStorage;


    if (!window.utils) {
      window.utils = { sdcard: MockSdCard };
    } else {
      window.utils.sdcard = MockSdCard;
    }
    window.utils.time = {
      pretty: function(date) {
        return date;
      }
    };
    window.utils.overlay = {
      show: function() {},
      showMenu: function() {}
    };
    window._ = stub('blah');

    document.body.innerHTML = MockContactsIndexHtml;

    LazyLoader.load(TestUrlResolver.resolve(
      'communications/contacts/js/utilities/status.js'), done);
  });

  suiteTeardown(function() {
    window._ = real_;
    window.utils = realUtils;
    navigator.getDeviceStorage = realDeviceStorage;
    mocksHelper.suiteTeardown();
  });

  suite('DSDS DOM support', function() {
    // This test sets an scenario of two sim cards
    suiteSetup(function() {
      realMozMobileConnections = navigator.mozMobileConnections;
      realMozMobileConnection = navigator.mozMobileConnection;
      navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
      navigator.mozMobileConnection = MockNavigatorMozMobileConnection;
      Contacts.showStatus = utils.status.show;

      realMozIccManager = navigator.mozIccManager;
      navigator.mozIccManager = new MockIccManager();
      // Add to facke iccs
      navigator.mozIccManager.iccIds[0] = 0;
      navigator.mozIccManager.iccIds[1] = 1;
    });
    suiteTeardown(function() {
      navigator.mozMobileConnections = realMozMobileConnections;
      navigator.mozMobileConnection = realMozMobileConnection;
    });

    setup(function() {
      while (navigator.mozMobileConnections.length !== 0) {
        navigator.mozMobileConnections.mRemoveMobileConnection();
      }
      var conn1 = new window.MockMobileconnection();
      conn1.iccId = 0;
      conn1.iccInfo = {
        'iccid': 0
      };
      navigator.mozMobileConnections.mAddMobileConnection(conn1, 0);
      var conn2 = new window.MockMobileconnection();
      conn2.iccId = 1;
      conn2.iccInfo = {
        'iccid': 1
      };
      navigator.mozMobileConnections.mAddMobileConnection(conn2, 1);

      contacts.Settings.init();
    });

    test('Check number of import buttons appearing', function() {
      // Check that we generated two sim import buttons
      assert.isNotNull(document.querySelector('#import-sim-option-0'));
      assert.isNotNull(document.querySelector('#import-sim-option-1'));
    });

    test('Check number of export buttons appearing', function() {
      assert.isNotNull(document.querySelector('#export-sim-option-0'));
      assert.isNotNull(document.querySelector('#export-sim-option-1'));
    });

    test('Check one sim inserted in slot 0', function() {
      // Modify the iccManager to return null when asking for slot 1
      var stub = sinon.stub(navigator.mozIccManager, 'getIccById',
        function(id) {
          if (id == 1) {
            return null;
          }

          return {
            'iccInfo': {
              'iccid': id
            }
          };
        }
      );

      contacts.Settings.init();

      assert.isNotNull(document.querySelector('#import-sim-option-0'));
      assert.isNotNull(document.querySelector('#export-sim-option-0'));

      assert.isNull(document.querySelector('#import-sim-option-1'));
      assert.isNull(document.querySelector('#export-sim-option-1'));

      stub.restore();
    });

    test('Check one sim inserted in slot 1', function() {
      // Modify the iccManager to return null when asking for slot 0
      var stub = sinon.stub(navigator.mozIccManager, 'getIccById',
        function(id) {
          if (id == 0) {
            return null;
          }

          return {
            'iccInfo': {
              'iccid': id
            }
          };
        }
      );

      contacts.Settings.init();

      assert.isNotNull(document.querySelector('#import-sim-option-1'));
      assert.isNotNull(document.querySelector('#export-sim-option-1'));

      assert.isNull(document.querySelector('#import-sim-option-0'));
      assert.isNull(document.querySelector('#export-sim-option-0'));

      stub.restore();
    });
  });

  suite('SIM Import', function() {
    suiteSetup(function() {
      realMozMobileConnections = navigator.mozMobileConnections;
      realMozMobileConnection = navigator.mozMobileConnection;
      navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
      navigator.mozMobileConnection = MockNavigatorMozMobileConnection;
      Contacts.showStatus = utils.status.show;
      contacts.Settings.init();
    });
    suiteTeardown(function() {
      navigator.mozMobileConnections = realMozMobileConnections;
      navigator.mozMobileConnection = realMozMobileConnection;
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

  suite('Export options', function() {
    var oldCheckStorageCard;
    suiteSetup(function() {
      oldCheckStorageCard = utils.sdcard.checkStorageCard;
    });

    setup(function() {
      utils.sdcard.checkStorageCard = function() { return true; };
      contacts.Settings.init();
      mocksHelper.suiteSetup();
      realMozContacts = navigator.mozContacts;
      navigator.mozContacts = MockMozContacts;
    });

    test('If there are no contacts, export option is disabled', function() {
      navigator.mozContacts.number = 0;
      contacts.Settings.refresh();
      var exportContacts = document.
                            getElementById('exportContacts').firstElementChild;
      assert.equal(exportContacts.getAttribute('disabled'), 'disabled');
    });

    test('If there are contacts, export option is enabled', function() {
      navigator.mozContacts.number = 100;
      contacts.Settings.refresh();
      var exportContacts = document.
                            getElementById('exportContacts').firstElementChild;
      assert.isNull(exportContacts.getAttribute('disabled'));
    });

    suiteTeardown(function() {
      mocksHelper.suiteTeardown();
      navigator.mozContacts = realMozContacts;
      utils.sdcard.checkStorageCard = oldCheckStorageCard;
    });
  });

  suite('SD Card import', function() {
    var showMenuSpy;
    var showStatusSpy;
    var realWakeLock;

    suiteSetup(function() {
      checkForCard = utils.sdcard.checkStorageCard;
      if (navigator.requestWakeLock) {
        realWakeLock = navigator.requestWakeLock;
      }
      navigator.requestWakeLock = MockWakeLock;
    });

    suiteTeardown(function() {
      utils.sdcard.checkStorageCard = checkForCard;
      navigator.requestWakeLock = realWakeLock;
    });

    setup(function() {
      contacts.Settings.init();
      mocksHelper.setup();
      showMenuSpy = sinon.spy(window.utils.overlay, 'showMenu');
      showStatusSpy = sinon.spy(Contacts, 'showStatus');
    });

    test('show SD Card import if SD card is present', function() {
      utils.sdcard.checkStorageCard = function() { return true; };
      contacts.Settings.refresh();
      var importSdOption = document.getElementById('import-sd-option');
      assert.equal(importSdOption
        .firstElementChild.hasAttribute('disabled'), false);

      assert.equal(importSdOption
        .classList.contains('error'), false);
      utils.sdcard.checkStorageCard = checkForCard;

    });

    test('no SD card import if no SD card is present', function() {
      utils.sdcard.checkStorageCard = function() { return false; };
      contacts.Settings.refresh();

      var importSdOption = document.getElementById('import-sd-option');
      assert.equal(importSdOption
        .firstElementChild.hasAttribute('disabled'), true);

      assert.equal(importSdOption
        .classList.contains('error'), true);
      utils.sdcard.checkStorageCard = checkForCard;
    });

    test('SD Import went well', function(done) {
      contacts.Settings.importFromSDCard(function onImported() {
        sinon.assert.called(showMenuSpy);
        sinon.assert.called(showStatusSpy);
        assert.equal(false, MyLocks['cpu']);
        done();
      });
    });

    test('SD Import with error cause no files to import', function(done) {
      // Simulate not finding any files
      MockSdCard.failOnRetrieveFiles = true;
      contacts.Settings.importFromSDCard(function onImported() {
        sinon.assert.called(showMenuSpy);
        sinon.assert.notCalled(showStatusSpy);
        assert.equal(false, MyLocks['cpu']);
        // Restore the mock
        MockSdCard.failOnRetrieveFiles = false;
        done();
      });
    });

    teardown(function() {
      utils.sdcard.checkStorageCard = checkForCard;
      mocksHelper.teardown();
      MockasyncStorage.clear();
      showMenuSpy.restore();
      showStatusSpy.restore();
    });
  });

  suite('Timestamp Import', function() {
    var gmailTime = Date.now();
    var liveTime = Date.now() - 24 * 60 * 60 * 1000;

    setup(function() {
      // Restore previous tainted html
      document.body.innerHTML = MockContactsIndexHtml;
      contacts.Settings.init();

      MockasyncStorage.clear();
      MockasyncStorage.setItem('gmail_last_import_timestamp', gmailTime);
      MockasyncStorage.setItem('live_last_import_timestamp', liveTime);

      contacts.Settings.updateTimestamps();
    });

    test('Contacts from SD card and SIM are not imported yet', function() {
      var time =
        document.getElementById('import-sd-option').querySelector('time');
      assert.equal(time.textContent, '');
      assert.isNull(time.getAttribute('datetime'));

      time = document.getElementById('import-sim-option').querySelector('time');
      assert.equal(time.textContent, '');
      assert.isNull(time.getAttribute('datetime'));
    });

    test('Contacts from Gmail and Live are already imported ', function() {
      var time =
        document.getElementById('import-gmail-option').querySelector('time');
      assert.equal(time.textContent, gmailTime);
      assert.equal(time.getAttribute('datetime'),
                    (new Date(gmailTime)).toLocaleString());

      time =
        document.getElementById('import-live-option').querySelector('time');
      assert.equal(time.textContent, liveTime);
      assert.equal(time.getAttribute('datetime'),
                    (new Date(liveTime)).toLocaleString());

    });

    teardown(function() {
      MockasyncStorage.clear();
    });
  });

  suite('SD Export when sharing sd card', function() {
    var importSDButton = exportSDButton = null;

    // Sets the state of the sdcard to shared (not usable)
    function shareSDCard() {
      utils.sdcard.status = MockSdCard.NOT_AVAILABLE;
    }

    // Free's the sdcard so we can use it
    function unShareSDCard() {
      utils.sdcard.status = MockSdCard.AVAILABLE;
    }

    suiteSetup(function() {
      importSDButton = document.getElementById('import-sd-option').
        firstElementChild;
      exportSDButton = document.getElementById('export-sd-option').
        firstElementChild;

      contacts.Settings.init();
    });

    test('Without sharing the sdcard', function() {
      unShareSDCard();

      contacts.Settings.refresh();
      assert.ok(!importSDButton.hasAttribute('disabled'));
      assert.ok(!exportSDButton.hasAttribute('disabled'));
    });

    test('Without sharing sdcard at start and sharing it', function(done) {
      unShareSDCard();

      // Trigger the card state change
      shareSDCard();

      setTimeout(function checkStorageButtons() {
          assert.ok(importSDButton.hasAttribute('disabled'));
          assert.ok(exportSDButton.hasAttribute('disabled'));
          done();
      }, 200);
    });

    test('With sharing sdcrd enabled at start and disabling it',
      function(done) {
      shareSDCard();

      contacts.Settings.refresh();
      assert.ok(importSDButton.hasAttribute('disabled'));
      assert.ok(exportSDButton.hasAttribute('disabled'));

      unShareSDCard();
      setTimeout(function checkStorageButtons() {
        assert.ok(!importSDButton.hasAttribute('disabled'));
        assert.ok(!exportSDButton.hasAttribute('disabled'));
        done();
      }, 200);

    });
  });
});
