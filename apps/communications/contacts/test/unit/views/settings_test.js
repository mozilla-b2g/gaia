'use strict';
/* global contacts */
/* global Contacts */
/* global MockImportStatusData */
/* global MockCookie */
/* global MockContactsIndexHtml */
/* global MockgetDeviceStorage */
/* global MocksHelper */
/* global MockIccManager */
/* global MockMozContacts */
/* global MockNavigatorMozMobileConnections */
/* global MockMozL10n */
/* global MockSdCard */
/* global utils */
/* global MockNavigatorSettings */

require('/shared/js/lazy_loader.js');
require('/shared/js/contacts/import/utilities/misc.js');
require('/shared/js/contacts/utilities/event_listeners.js');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
require('/shared/test/unit/mocks/mock_iccmanager.js');
requireApp('communications/contacts/test/unit/mock_contacts_index.html.js');
requireApp('communications/contacts/test/unit/mock_navigation.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_import_status_data.js');
requireApp('communications/contacts/test/unit/mock_asyncstorage.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_cookie.js');
requireApp('communications/contacts/test/unit/mock_get_device_storage.js');
requireApp('communications/contacts/test/unit/mock_sdcard.js');
requireApp('communications/contacts/test/unit/mock_icc_helper.js');
requireApp('communications/dialer/test/unit/mock_confirm_dialog.js');
require('/shared/test/unit/mocks/mock_mozContacts.js');
requireApp('communications/contacts/test/unit/mock_l10n.js');
requireApp('communications/contacts/js/utilities/icc_handler.js');
requireApp('communications/contacts/js/utilities/sim_dom_generator.js');
requireApp('communications/contacts/js/navigation.js');
requireApp('communications/contacts/js/utilities/normalizer.js');
requireApp('communications/contacts/js/views/settings.js');

if (!window._) { window._ = null; }
if (!window.utils) { window.utils = null; }
if (!navigator.onLine) { navigator.onLine = null; }
if (!navigator.mozContacts) { navigator.mozContacts = null; }
if (!navigator.mozIccManager) { navigator.mozIccManager = null; }
if (!navigator.mozMobileConnections) { navigator.mozMobileConnections = null; }

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
    realMozMobileConnections;

if (!window.realMozContacts) {
  realMozContacts = null;
}

if (!window.realMozIccManager) {
  realMozIccManager = null;
}

var mocksHelperForContactSettings = new MocksHelper([
  'Contacts', 'ImportStatusData', 'asyncStorage', 'fb', 'ConfirmDialog',
  'IccHelper'
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
    var spyL10n;
    // This test sets an scenario of two sim cards
    suiteSetup(function() {
      realMozMobileConnections = navigator.mozMobileConnections;
      navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
      Contacts.showStatus = utils.status.show;

      realMozIccManager = navigator.mozIccManager;
      navigator.mozIccManager = new MockIccManager();
      // Add to facke iccs
      navigator.mozIccManager.iccIds[0] = 0;
      navigator.mozIccManager.iccIds[1] = 1;

      spyL10n = sinon.spy(navigator.mozL10n, 'setAttributes');
    });
    suiteTeardown(function() {
      navigator.mozMobileConnections = realMozMobileConnections;
      spyL10n.restore();
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
      var importButton0 = document.querySelector('#import-sim-option-0');
      var importButton1 = document.querySelector('#import-sim-option-1');
      assert.isNotNull(importButton0);
      assert.isNotNull(importButton1);

      // We test as well that the l10NIds are correctly set
      assert.equal(spyL10n.args[0][1], 'simCardNumber');
      assert.equal(spyL10n.args[1][1], 'simCardNumber');
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
        umsEnabledError = 'memoryCardUMSEnabled';

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

    suite('SD not present >', function() {
      var deviceStorages, deviceStorage;

      suiteSetup(function() {
        deviceStorages = utils.sdcard.deviceStorages;
        deviceStorage = utils.sdcard.deviceStorage;

        utils.sdcard.deviceStorages = [];
        utils.sdcard.deviceStorage = null;
      });

      suiteTeardown(function() {
        utils.sdcard.deviceStorages = deviceStorages;
        utils.sdcard.deviceStorage = deviceStorage;
      });

      test('import button should be disabled', function() {
        assert.isTrue(importSDButton.hasAttribute('disabled'));
      });

      test('export button should be disabled', function() {
        assert.isTrue(exportSDButton.hasAttribute('disabled'));
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
    var realMozSettings;

    suiteSetup(function(done) {
      realMozSettings = navigator.mozSettings;
      navigator.mozSettings = MockNavigatorSettings;
      navigator.mozSettings.mSettings['locale.hour12'] = true;

      require('/shared/js/l10n_date.js');
      require('/shared/js/date_time_helper.js', done);

    });

    suiteTeardown(function() {
      navigator.mozSettings = realMozSettings;
    });

    var timestamps = {
      'gmail': Date.now(),
      'live': Date.now() - 24 * 60 * 60 * 1000,
      'sd': Date.now() - 48 * 60 * 60 * 1000,
      'sim': Date.now() - 72 * 60 * 60 * 1000
    };

    setup(function(done) {
      // Restore previous tainted html
      document.body.innerHTML = MockContactsIndexHtml;
      contacts.Settings.init();

      MockImportStatusData.clear().then(done, done);

    });

    function assertNoContactsFrom(source) {
      var time = document.getElementById('import-' + source + '-option')
          .querySelector('time');
      assert.equal(time.textContent, '');
      assert.isNull(time.getAttribute('datetime'));
    }

    test('No contacts imported yet', function() {
      var sources = Object.keys(timestamps);
      for (var i = 0, l = sources.length; i < l; i++) {
          assertNoContactsFrom(sources[i]);
      }
    });

    function assertContactsImportedFrom(source, done, extraString) {
      var importElm = document.getElementById('import-' + source + '-option');
      var time = importElm.querySelector('time');

      var test = function() {
        assert.equal(time.getAttribute('datetime'),
            (new Date(timestamps[source])).toLocaleString());
        assert.equal(time.textContent, utils.time.pretty(timestamps[source]));
        if (extraString) {
          assert.isTrue(time.textContent.indexOf(extraString) != -1);
        }
        observer.disconnect();
      };

      var observer = new MutationObserver(function(){
        test();
        done();
      });

      observer.observe(time, {attributes: true});

      MockImportStatusData.put(source + '_last_import_timestamp',
          timestamps[source])
        .then(function() {
          contacts.Settings.updateTimestamps();
        });
    }

    test('Contacts imported from SD', function(done) {
      assertContactsImportedFrom('sd', done);
    });

    test('Contacts imported from sim', function(done) {
      assertContactsImportedFrom('sim', done);
    });

    test('Contacts imported from Gmail', function(done) {
      assertContactsImportedFrom('gmail', done);
    });

    test('Contacts imported from Live', function(done) {
      assertContactsImportedFrom('live', done);
    });

    test('Test check 12 hour format', function(done) {
      assertContactsImportedFrom('gmail', done, 'shortTimeFormat12');
    });

    test('Test check 24 hour format', function(done) {
      navigator.mozSettings.mSettings['locale.hour12'] = false;
      navigator.mozSettings.mTriggerObservers('locale.hour12',
       {'settingValue': false});
      assertContactsImportedFrom('gmail', done, 'shortTimeFormat24');
    });
  });

  suite('FB data synced from FTU', function() {
    var STORAGE_KEY = 'tokenData';
    var CACHE_FRIENDS_KEY = 'numFacebookFriends';

    setup(function() {
      document.body.innerHTML = MockContactsIndexHtml;
      contacts.Settings.init();
    });

    teardown(function(done) {
      MockImportStatusData.clear().then(done, done);
    });

    test('FB active if token already synced', function(done) {
      var fbImportCheck = document.querySelector('[name="fb.imported"]');

      function assertChecked() {
        document.removeEventListener('facebookEnabled', assertChecked);
        done(function() {
          assert.isTrue(fbImportCheck.checked);
        });
      }

      document.addEventListener('facebookEnabled', assertChecked);

      MockImportStatusData.put(STORAGE_KEY, {access_token: '1'})
          .then(function() {
        contacts.Settings.refresh();
      });
    });

    test('Show the right number of total & synced friends', function(done) {
      var fbTotalsMsg = document.querySelector('#fb-totals');

      var observer = new MutationObserver(function() {
        if (fbTotalsMsg.innerHTML !== '') {
          observer.disconnect();
          done(function() {
            assert.isTrue(fbTotalsMsg.innerHTML.indexOf('50') !== -1);
          });
        }
      });

      observer.observe(fbTotalsMsg, {childList: true});

      MockImportStatusData.put(CACHE_FRIENDS_KEY, 50).then(function() {
        MockImportStatusData.put(STORAGE_KEY, {access_token: '1'})
            .then(function() {
          contacts.Settings.refresh();
        });
      });
    });
  });

  suite('Facebook actions reflected in UI', function() {
    var mockFbUtils;

    setup(function() {
      document.body.innerHTML = MockContactsIndexHtml;
      contacts.Settings.init();
    });

    teardown(function(done) {
      MockImportStatusData.clear().then(done, done);
    });

    suiteSetup(function(done) {
      mockFbUtils = fb.utils;
      require('/shared/js/contacts/import/facebook/fb_utils.js', function() {
        sinon.stub(Contacts, 'confirmDialog', function(attr, msg, no, yes) {
          yes.callback();
        });

        sinon.stub(Contacts, 'utility', function(attr1, cb) {
          cb();
        });

        // Stub needed to fake event target id.
        sinon.stub(window, 'addEventListener', function(eventType, cb) {
          if (eventType === 'transitionend') {
            cb({'target': {'id': 'span-check-fb'}, data: ''});
          }
        });

        sinon.stub(Contacts, 'showOverlay', function() {
          return { setTotal: function() {} };
        });

        sinon.stub(fb.utils, 'clearFbData', function() {
          return {
            'result': {
              set onsuccess(cb) {
                cb();
              },
              lcontacts: []
            },
            set onsuccess(cb) {
              cb();
            }
          };
        });

        sinon.stub(fb.utils, 'logout', function() {
          return {
            set onsuccess(cb) {
              cb();
            }
          };
        });

        done();
      });
    });

    suiteTeardown(function() {
      fb.utils = mockFbUtils;
      Contacts.confirmDialog.restore();
      Contacts.utility.restore();
      window.addEventListener.restore();
      Contacts.showOverlay.restore();
      fb.utils.clearFbData.restore();
      fb.utils.logout.restore();
    });

    test('Cached friend number is correctly deleted on logout', function(done) {
      MockImportStatusData.put(fb.utils.CACHE_FRIENDS_KEY, 50).then(function() {
        MockImportStatusData.put(fb.utils.STORAGE_KEY, {access_token: '1'})
            .then(function() {
          contacts.Settings.refresh();

          var spy = sinon.spy(fb.utils, 'removeCachedNumFriends');

          document.querySelector('#settingsFb > .fb-item').click();

          done(function() {
            assert.isTrue(spy.called);
            spy.restore();
          });
        });
      });
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
        var customEvent = new CustomEvent('online');
        window.dispatchEvent(customEvent);
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
        var customEvent = new CustomEvent('offline');
        window.dispatchEvent(customEvent);
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

    test('If FB contacts are deleted but some contacts remain,' +
                                ' bulk Delete option is enabled', function() {
      document.addEventListener('fb_cleaned', function cleaned() {
        document.removeEventListener('fb_cleaned', cleaned);
        navigator.mozContacts.number = 50;
        contacts.Settings.refresh();
      });
      document.dispatchEvent(new CustomEvent('fb_cleaned'));
      contacts.Settings.refresh();
      var bulkDelContacts = document.getElementById('bulkDelete');
      assert.isNull(bulkDelContacts.getAttribute('disabled'));
    });

    test('If there are only FB contacts and they are deleted,' +
                               ' bulk Delete option is disabled', function() {
      document.addEventListener('fb_cleaned', function cleaned() {
        document.removeEventListener('fb_cleaned', cleaned);
        navigator.mozContacts.number = 0;
        contacts.Settings.refresh();
      });
      document.dispatchEvent(new CustomEvent('fb_cleaned'));
      var bulkDelContacts = document.getElementById('bulkDelete');
      assert.equal(bulkDelContacts.getAttribute('disabled'), 'disabled');
    });

    suiteTeardown(function() {
      mocksHelper.suiteTeardown();
      navigator.mozContacts = realMozContacts;
    });
  });

  suite('ICE options', function() {

    var iceContacts;

    suiteSetup(function() {
      iceContacts = document.getElementById('set-ice');
    });

    setup(function() {
      contacts.Settings.init();
      mocksHelper.suiteSetup();
      realMozContacts = navigator.mozContacts;
      navigator.mozContacts = MockMozContacts;
    });

    test('If no contacts, ICE contacts option is disabled', function() {
      navigator.mozContacts.number = 0;
      contacts.Settings.refresh();
      assert.isTrue(iceContacts.disabled);
    });

    test('If there are contacts, ICE contacts option is enabled', function() {
      navigator.mozContacts.number = 100;
      contacts.Settings.refresh();
      assert.isFalse(iceContacts.disabled);
    });

    test('Pressing the ICE button should init ICE module', function(done) {
      contacts.Settings.showICEScreen(function() {
        assert.equal(
          contacts.Settings.navigation.currentView(),
          'ice-settings'
        );
        assert.ok(contacts.ICE.initialized);
        done();
      });
    });

    suiteTeardown(function() {
      mocksHelper.suiteTeardown();
      navigator.mozContacts = realMozContacts;
    });
  });
});
