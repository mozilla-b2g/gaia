require('/shared/js/lazy_loader.js');
requireElements('communications/contacts/elements/settings.html');
require('/shared/test/unit/mocks/mock_navigator_moz_settings.js');
require('/shared/test/unit/mocks/mock_lazy_loader.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_asyncstorage.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_sdcard.js');
requireApp('communications/contacts/test/unit/mock_icc_helper.js');
requireApp('communications/dialer/test/unit/mock_confirm_dialog.js');
requireApp('communications/contacts/test/unit/mock_vcard_parser.js');
requireApp('communications/contacts/test/unit/mock_mozContacts.js');
requireApp('communications/contacts/test/unit/mock_wakelock.js');
requireApp('communications/contacts/js/import_utils.js');
requireApp('communications/contacts/js/navigation.js');
requireApp('communications/contacts/js/views/settings.js');
requireApp('communications/contacts/js/utilities/event_listeners.js');

if (!this._) this._ = null;
if (!this.utils) this.utils = null;
if (!navigator.mozContacts) navigator.mozContacts = null;

if (!window.Rest) {
  window.Rest = null;
}

window.self = null;


var realMozContacts;

if (!this.realMozContacts) {
  realMozContacts = null;
}

var mocksHelperForContactSettings = new MocksHelper([
  'Contacts', 'asyncStorage', 'fb', 'ConfirmDialog', 'VCFReader', 'IccHelper',
  'LazyLoader', 'WakeLock'
]);
mocksHelperForContactSettings.init();

suite('Contacts settings', function() {
  var checkForCard, real_;
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

  suiteTemplate('settings');

  suiteSetup(function() {
    mocksHelper.suiteSetup();
    real_ = window._;
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

  });

  suiteTeardown(function() {
    window._ = real_;
    mocksHelper.suiteTeardown();
  });

  suite('Export options', function() {
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
    });
  });

  suite('SD Card import', function() {
    var showMenuSpy;
    var showStatusSpy;
    var realWakeLock;

    suiteSetup(function() {
      checkForCard = utils.sdcard.checkStorageCard;
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
      realWakeLock = navigator.requestWakeLock;
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
      navigator.requestWakeLock = realWakeLock;
    });
  });

  suite('Timestamp Import', function() {

    suiteTemplate('settings');

    var gmailTime = Date.now();
    var liveTime = Date.now() - 24 * 60 * 60 * 1000;

    setup(function() {
      contacts.Settings.init();

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

  suite('SD Export when UMS enabled', function() {
    var realSettings = navigator.mozSettings;
    var importSDButton = exportSDButton = null;
    var checkForCard;

    suiteSetup(function() {
      checkForCard = utils.sdcard.checkStorageCard;
      utils.sdcard.checkStorageCard = function() { return true; };
      navigator.mozSettings = MockNavigatorSettings;

    });

    suiteTeardown(function() {
      navigator.mozSettings.mTeardown();
      navigator.mozSettings = realSettings;
      utils.sdcard.checkStorageCard = checkForCard;
    });

    setup(function() {
      navigator.mozSettings.mTeardown();

      importSDButton = document.getElementById('import-sd-option').
        firstElementChild;
      exportSDButton = document.getElementById('export-sd-option').
        firstElementChild;
    });

    function setUMS(value) {
      navigator.mozSettings.createLock().set({
        'ums.enabled': value
      });
    }

    function triggerUMSChange(value) {
      navigator.mozSettings.mTriggerObservers('ums.enabled', {
        'settingValue': value
      });
    }

    test('Without the UMS enabled', function() {
      setUMS(false);

      contacts.Settings.init();
      assert.ok(!importSDButton.hasAttribute('disabled'));
      assert.ok(!exportSDButton.hasAttribute('disabled'));
    });

    test('Without UMS enabled at start and enabling it', function(done) {
      setUMS(false);

      contacts.Settings.init();

      // Trigger the ums change
      triggerUMSChange(true);

      setTimeout(function checkStorageButtons() {
        assert.ok(importSDButton.hasAttribute('disabled'));
        assert.ok(exportSDButton.hasAttribute('disabled'));
        done();
      }, 200);
    });

    test('With UMS enabled at start and disabling it', function(done) {
      setUMS(true);

      contacts.Settings.init();
      contacts.Settings.refresh(function onRefreshFinished() {
        assert.ok(importSDButton.hasAttribute('disabled'));
        assert.ok(exportSDButton.hasAttribute('disabled'));

        triggerUMSChange(false);

        setTimeout(function checkStorageButtons() {
          assert.ok(!importSDButton.hasAttribute('disabled'));
          assert.ok(!exportSDButton.hasAttribute('disabled'));
          done();
        }, 200);
      });

    });
  });
});
