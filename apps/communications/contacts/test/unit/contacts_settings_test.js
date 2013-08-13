require('/shared/js/lazy_loader.js');
require('/shared/test/unit/load_body_html_helper.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_asyncstorage.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_sdcard.js');
requireApp('communications/contacts/test/unit/mock_icc_helper.js');
requireApp('communications/dialer/test/unit/mock_confirm_dialog.js');
requireApp('communications/contacts/test/unit/mock_vcard_parser.js');
requireApp('communications/contacts/js/import_utils.js');
requireApp('communications/contacts/js/navigation.js');
requireApp('communications/contacts/js/contacts_settings.js');

if (!this._) this._ = null;
if (!this.utils) this.utils = null;

if (!window.Rest) {
  window.Rest = null;
}

window.self = null;

var mocksHelperForContactSettings = new MocksHelper([
  'Contacts', 'asyncStorage', 'fb', 'ConfirmDialog', 'VCFReader', 'IccHelper'
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

  suiteSetup(function() {
    loadBodyHTML('/contacts/index.html');
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

  suite('SD Card import', function() {
    setup(function() {
      contacts.Settings.init();
      checkForCard = utils.sdcard.checkStorageCard;
      mocksHelper.setup();
    });

    test('show SD Card import if SD card is present', function() {
      navigator.getDeviceStorage = stub(true);
      contacts.Settings.refresh();
      var importSdOption = document.getElementById('import-sd-option');
      assert.equal(importSdOption
        .firstElementChild.hasAttribute('disabled'), false);

      assert.equal(importSdOption
        .classList.contains('error'), false);

    });

    test('no SD card import if no SD card is present', function() {
      var realSdCheck = utils.sdcard.checkStorageCard;
      utils.sdcard.checkStorageCard = function() { return false; };
      contacts.Settings.refresh();
      utils.sdcard.checkStorageCard = realSdCheck;

      var importSdOption = document.getElementById('import-sd-option');
      assert.equal(importSdOption
        .firstElementChild.hasAttribute('disabled'), true);

      assert.equal(importSdOption
        .classList.contains('error'), true);

    });

    teardown(function() {
      utils.sdcard.checkStorageCard = checkForCard;
      mocksHelper.teardown();
      MockasyncStorage.clear();
    });
  });

  suite('Timestamp Import', function() {
    var gmailTime = Date.now();
    var liveTime = Date.now() - 24 * 60 * 60 * 1000;

    suiteSetup(function() {
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

    suiteTeardown(function() {
      MockasyncStorage.clear();
    });
  });
});
