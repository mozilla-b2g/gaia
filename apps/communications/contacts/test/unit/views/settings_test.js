'use strict';
/* global contacts */
/* global Contacts */
/* global MockasyncStorage */
/* global MockCookie */
/* global MockContactsIndexHtml */
/* global MockgetDeviceStorage */
/* global MocksHelper */
/* global MockIccManager */
/* global MockMozContacts */
/* global MockNavigatorMozMobileConnection */
/* global MockNavigatorMozMobileConnections */
/* global MockMozL10n */
/* global MockSdCard */
/* global utils */

require('/shared/js/lazy_loader.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connection.js');
require('/shared/test/unit/mocks/mock_iccmanager.js');
requireApp('communications/contacts/test/unit/mock_contacts_index.html.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_asyncstorage.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_cookie.js');
requireApp('communications/contacts/test/unit/mock_get_device_storage.js');
requireApp('communications/contacts/test/unit/mock_sdcard.js');
requireApp('communications/contacts/test/unit/mock_icc_helper.js');
requireApp('communications/dialer/test/unit/mock_confirm_dialog.js');
requireApp('communications/contacts/test/unit/mock_mozContacts.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/js/import_utils.js');
requireApp('communications/contacts/js/utilities/icc_handler.js');
requireApp('communications/contacts/js/utilities/sim_dom_generator.js');
requireApp('communications/contacts/js/navigation.js');
requireApp('communications/contacts/js/views/settings.js');
requireApp('communications/contacts/js/utilities/event_listeners.js');

if (!window._) { window._ = null; }
if (!window.utils) { window.utils = null; }
if (!navigator.onLine) { navigator.onLine = null; }
if (!navigator.mozContacts) { navigator.mozContacts = null; }
if (!navigator.mozIccManager) { navigator.mozIccManager = null; }
if (!navigator.mozMobileConnections) { navigator.mozMobileConnections = null; }
if (!navigator.mozMobileConnection) { navigator.mozMobileConnection = null; }

if (!window.Rest) {
  window.Rest = null;
}

window.self = null;

var fb,
    real_,
    realMozL10n,
    realMozContacts,
    realUtils,
    realCookie,
    realOnLine,
    realMozIccManager,
    realMozMobileConnection,
    realMozMobileConnections;

if (!window.realMozContacts) {
  realMozContacts = null;
}

if (!window.realMozIccManager) {
  realMozIccManager = null;
}

var mocksHelperForContactSettings = new MocksHelper([
  'Contacts', 'asyncStorage', 'fb', 'ConfirmDialog', 'IccHelper'
]);
mocksHelperForContactSettings.init();

suite('Contacts settings >', function() {
  var realDeviceStorage;
  var mocksHelper = mocksHelperForContactSettings;

  suiteSetup(function() {
    mocksHelper.suiteSetup();

    realUtils = window.utils;
    realOnLine = Object.getOwnPropertyDescriptor(navigator, 'onLine');
    Object.defineProperty(navigator, 'onLine', {
      fakeOnLine: false,
      configurable: true,
      get: function() { return this.fakeOnLine; },
      set: function(status) { this.fakeOnLine = status; }
    });

    realDeviceStorage = navigator.getDeviceStorage;
    navigator.getDeviceStorage = MockgetDeviceStorage;

    realMozL10n = navigator.mozL10n;
    navigator.mozL10n = MockMozL10n;

    real_ = window._;
    window._ = MockMozL10n.get;

    realCookie = window.utils && window.utils.cookie;
    window.utils = window.utils || {};
    window.utils.cookie = MockCookie;

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
    window.utils.status = {
      show: function() {}
    };

    document.body.innerHTML = MockContactsIndexHtml;

  });

  suiteTeardown(function() {
    window._ = real_;
    window.utils = realUtils;
    window.utils.cookie = realCookie;

    if (realOnLine) {
      Object.defineProperty(navigator, 'onLine', realOnLine);
    }

    navigator.getDeviceStorage = realDeviceStorage;
    navigator.mozL10n = realMozL10n;
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
          if (id === 0) {
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

  suite('Export options', function() {
    var oldCheckStorageCard;

    suiteSetup(function() {
      oldCheckStorageCard = utils.sdcard.checkStorageCard;
      utils.sdcard.checkStorageCard = function() { return true; };
    });

    setup(function() {
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

  suite('SD Card Availability>', function() {

    var importSection,
        importError,
        importSDButton;

    var exportSection,
        exportError,
        exportSDButton;

    var noCardErrorImport = 'noMemoryCardMsg',
        noCardErrorExport = 'noMemoryCardMsgExport',
        umsEnabledError = 'sdUMSEnabled';

    function shareSDCard() {
      utils.sdcard.status = MockSdCard.SHARED;
    }

    function connectSDCard() {
      utils.sdcard.status = MockSdCard.AVAILABLE;
    }

    function disconnectSDCard() {
      utils.sdcard.status = MockSdCard.NOT_AVAILABLE;
    }

    suiteSetup(function() {
      importSection = document.getElementById('import-sd-option');
      importSDButton = importSection.firstElementChild;
      importError = importSection.querySelector('p.error-message');

      exportSection = document.getElementById('export-sd-option');
      exportSDButton = exportSection.firstElementChild;
      exportError = exportSection.querySelector('p.error-message');

      contacts.Settings.init();
    });

    suite('SD shared >', function() {
      setup(function() {
        shareSDCard();
      });

      test('import button should be disabled', function() {
        assert.isTrue(importSDButton.hasAttribute('disabled'));
      });
      test('import error message should be shown', function() {
        assert.isTrue(importSection.classList.contains('error'));
      });
      test('import error message should be correct (usb storage enabled)',
        function() {
        assert.equal(importError.textContent, umsEnabledError);
      });

      test('export button should be disabled', function() {
        assert.isTrue(exportSDButton.hasAttribute('disabled'));
      });
      test('export error message should be shown', function() {
        assert.isTrue(exportSection.classList.contains('error'));
      });
      test('export error message should be correct (usb storage enabled)',
        function() {
        assert.equal(exportError.textContent, umsEnabledError);
      });
    });

    suite('SD not available >', function() {
      setup(function() {
        disconnectSDCard();
      });

      test('import button should be disabled', function() {
        assert.isTrue(importSDButton.hasAttribute('disabled'));
      });
      test('import error message should be shown', function() {
        assert.isTrue(importSection.classList.contains('error'));
      });
      test('import error message should be correct (insert SD card)',
        function() {
        assert.equal(importError.textContent, noCardErrorImport);
      });

      test('export button should be disabled', function() {
        assert.isTrue(exportSDButton.hasAttribute('disabled'));
      });
      test('export error message should be shown', function() {
        assert.isTrue(exportSection.classList.contains('error'));
      });
      test('export error message should be correct (insert SD card)',
        function() {
        assert.equal(exportError.textContent, noCardErrorExport);
      });
    });

    suite('SD available >', function() {
      setup(function() {
        connectSDCard();
      });

      test('import button should be enabled', function() {
        assert.isFalse(importSDButton.hasAttribute('disabled'));
      });
      test('import error message should be hidden', function() {
        assert.isFalse(importSection.classList.contains('error'));
      });

      test('export button should be enabled', function() {
        assert.isFalse(exportSDButton.hasAttribute('disabled'));
      });
      test('export error message should be hidden', function() {
        assert.isFalse(exportSection.classList.contains('error'));
      });

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

  suite('Network status change', function() {
    var fbImportOption,
        fbOfflineMsg,
        fbUpdateButton,
        importGmailOption,
        importLiveOption;
    var fbValue;

    suiteSetup(function() {
      fbValue = fb.isEnabled;
      fb.setIsEnabled(true);
      contacts.Settings.init();

      fbImportOption = document.querySelector('#settingsFb');
      fbOfflineMsg = document.querySelector('#no-connection');
      fbUpdateButton = document.querySelector('#import-fb');
      importGmailOption = document.getElementById('import-gmail-option');
      importLiveOption = document.getElementById('import-live-option');
    });

    suiteTeardown(function() {
      fb.setIsEnabled(fbValue);
    });

    suite('Online', function() {
      setup(function() {
        navigator.onLine = true;
        contacts.Settings.onLineChanged();
      });

      test('Import Facebook enabled', function() {
        assert.isFalse(
          fbImportOption.querySelector('li').hasAttribute('aria-disabled'));
      });
      test('Import Facebook error hidden', function() {
        assert.isTrue(
          fbOfflineMsg.classList.contains('hide'));
      });
      test('Update Facebook shown', function() {
        assert.isFalse(
          fbUpdateButton.classList.contains('hide'));
      });
      test('Import Gmail enabled', function() {
        assert.isFalse(
          importGmailOption.firstElementChild.hasAttribute('disabled'));
      });
      test('Import Gmail error hidden', function() {
        assert.isFalse(
          importGmailOption.classList.contains('error'));
      });
      test('Import Live enabled', function() {
        assert.isFalse(
          importLiveOption.firstElementChild.hasAttribute('disabled'));
      });
      test('Import Live error hidden', function() {
        assert.isFalse(
          importLiveOption.classList.contains('error'));
      });
    });

    suite('Offline', function() {
      setup(function() {
        navigator.onLine = false;
        contacts.Settings.onLineChanged();
      });
      test('Import Facebook disabled', function() {
        assert.isTrue(
          fbImportOption.querySelector('li').hasAttribute('aria-disabled'));
      });
      test('Import Facebook error shown', function() {
        assert.isFalse(
          fbOfflineMsg.classList.contains('hide'));
      });
      test('Update Facebook hidden', function() {
        assert.isTrue(
          fbUpdateButton.classList.contains('hide'));
      });
      test('Import Gmail disabled', function() {
        assert.isTrue(
          importGmailOption.firstElementChild.hasAttribute('disabled'));
      });
      test('Import Gmail error shown', function() {
        assert.isTrue(
          importGmailOption.classList.contains('error'));
      });
      test('Import Live disabled', function() {
        assert.isTrue(
          importLiveOption.firstElementChild.hasAttribute('disabled'));
      });
      test('Import Live error shown', function() {
        assert.isTrue(
          importLiveOption.classList.contains('error'));
        });
    });
  });

  suite('Bulk Delete options', function() {

    setup(function() {
      contacts.Settings.init();
      mocksHelper.suiteSetup();
      realMozContacts = navigator.mozContacts;
      navigator.mozContacts = MockMozContacts;
    });

    test('If no contacts, Bulk Delete option is disabled', function() {
      navigator.mozContacts.number = 0;
      contacts.Settings.refresh();
      var bulkDelContacts = document.
                            getElementById('bulkDelete');
      assert.equal(bulkDelContacts.getAttribute('disabled'), 'disabled');
    });

    test('If there are contacts, bulk Delete option is enabled', function() {
      navigator.mozContacts.number = 100;
      contacts.Settings.refresh();
      var bulkDelContacts = document.
                            getElementById('bulkDelete');
      assert.isNull(bulkDelContacts.getAttribute('disabled'));
    });

    suiteTeardown(function() {
      mocksHelper.suiteTeardown();
      navigator.mozContacts = realMozContacts;
    });
  });
});
