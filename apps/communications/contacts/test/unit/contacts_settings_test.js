require('/shared/js/lazy_loader.js');
requireApp('communications/contacts/test/unit/mock_contacts.js');
requireApp('communications/contacts/test/unit/mock_asyncstorage.js');
requireApp('communications/contacts/test/unit/mock_fb.js');
requireApp('communications/contacts/test/unit/mock_sdcard.js');
requireApp('communications/contacts/test/unit/mock_icc_helper.js');
requireApp('communications/dialer/test/unit/mock_confirm_dialog.js');
requireApp('communications/contacts/test/unit/mock_vcard_parser.js');
requireApp('communications/contacts/js/import_utils.js');
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

  var dom = '<section data-theme="organic" id="view-settings" role="region" ' +
    'class="skin-organic view view-bottom">\n' +
    '<header>\n' +
    '<menu type="toolbar" id="settings-form-actions">\n' +
    '<button id="settings-close" role="menuitem" data-l10n-id="done">Done' +
    '</button>\n' +
    '</menu>\n' +
    '<h1 data-l10n-id="settings">Settings</h1>\n' +
    '</header>\n' +

    '<article class="view-body" id="settings-article">\n' +
    '<section role="region" class="view-body-inner">\n' +
    '<ul data-type="list">\n' +
    '<li id="settingsOrder">\n' +
    '<aside class="pack-end">\n' +
    '<label class="pack-switch">\n' +
    '<input type="checkbox" name="order.lastname" />\n' +
    '<span></span>\n' +
    '</label>\n' +
    '</aside>\n' +
    '<p data-l10n-id="contactsOrderBy">Order by last name</p>\n' +
    '</li>\n' +
    '</ul>\n' +
    '<header>\n' +
    '<h2 data-l10n-id="importContactsTitle">Import Contacts</h2>\n' +
    '</header>\n' +
    '<ul data-type="list" id="importSources">\n' +
    '<li id="settingsSIM" data-source="sim">\n' +
    '<button class="icon icon-sim" data-l10n-id="importSim2">\n' +
    'SIM card\n' + '<p><span></span><time></time></p>\n' +
    '</button>\n' +
    '<p id="no-sim" data-l10n-id="noSimMsg"></p>\n' +
    '</li>\n' +
    '<li id="settingsStorage" data-source="sd">\n' +
    '<button class="icon icon-gmail" data-l10n-id="importMemoryCard">\n' +
    'Memory card\n' + '<p><span></span><time></time></p>\n' +
    '</button>\n' +
    '<p id="no-memorycard" data-l10n-id="noMemoryCardMsg"></p>\n' +
    '</li>\n' +
    '<li class="importService" data-source="gmail">\n' +
    '<button class="icon icon-gmail" data-l10n-id="importGmail">\n' +
    'Gmail\n' + '<p><span></span><time></time></p>\n' +
    '</button>\n' +
    '</li>\n' +
    '<li class="importService" data-source="live">\n' +
    '<button class="icon icon-live" data-l10n-id="importOutlook">\n' +
    'Windows Live\n' + '<p><span></span><time></time></p>\n' +
    '</button>\n' +
    '</li>\n' +
    '</ul>\n' +

    '<header id="fb-header">\n' +
    '<h2 data-l10n-id="facebook">Facebook</h2>\n' +
    '</header>\n' +
    '<ul id="settingsFb" data-type="list" data-state="logged-out">\n' +
    '<li class="fb-item">\n' +
    '<aside class="pack-end">\n' +
    '<label class="pack-switch">\n' +
    '<input type="checkbox" name="fb.imported">\n' +
    '<span id="span-check-fb"></span>\n' +
    '</label>\n' +
    '</aside>\n' +
    '<p data-l10n-id="facebookSwitchMsg">Sync friends</p>\n' +
    '<p id="fb-totals"></p>\n' +
    '</li>\n' +
    '<li id="fb-update-option">\n' +
    '<!-- icon-error/icon-sync -->\n' +
    '<button data-l10n-id="fbUpdateFriends" id="import-fb" class="icon">\n' +
    'Update imported friends\n' +
    '</button>\n' +
    '<p id="renew-pwd-msg" data-l10n-id="renewPwdMsg" class="fb-error"></p>\n' +
    '<p id="no-connection" data-l10n-id="noConnection11"></p>\n' +
    '</li>\n' +
    '</ul>\n' +
    '</section>\n' +
    '</article>\n' +
    '</section>';


  suite('SD Card import', function() {
    setup(function() {
      document.body.innerHTML = dom;

      contacts.Settings.init();
      checkForCard = utils.sdcard.checkStorageCard;
      mocksHelper.setup();
    });

    test('show SD Card import if SD card is present', function() {
      navigator.getDeviceStorage = stub(true);
      contacts.Settings.refresh();

      assert.equal(document.getElementById('settingsStorage')
        .firstElementChild.hasAttribute('disabled'), false);

      assert.equal(document.querySelector('#no-memorycard')
        .classList.contains('hide'), true);
    });

    test('no SD card import if no SD card is present', function() {
      var realSdCheck = utils.sdcard.checkStorageCard;
      utils.sdcard.checkStorageCard = function() { return false; };
      contacts.Settings.refresh();
      utils.sdcard.checkStorageCard = realSdCheck;

      assert.equal(document.getElementById('settingsStorage')
        .firstElementChild.hasAttribute('disabled'), true);

      assert.equal(document.querySelector('#no-memorycard')
        .classList.contains('hide'), false);
    });

    test('Click SD import should traverse SD Card (0 results)', function(done) {
      Contacts.showOverlay = stub();
      Contacts.hideOverlay = stub();
      Contacts.showStatus = stub();

      document.querySelector('[data-l10n-id="importMemoryCard"]').click();

      setTimeout(function() {
        assert.equal(Contacts.showOverlay.callCount, 1);
        done();
      }, 300);
    });

    teardown(function() {
      document.body.innerHTML = '';
      utils.sdcard.checkStorageCard = checkForCard;
      mocksHelper.teardown();
      MockasyncStorage.clear();
    });
  });

  suite('Timestamp Import', function() {
    var gmailTime = Date.now();
    var liveTime = Date.now() - 24 * 60 * 60 * 1000;

    suiteSetup(function() {
      document.body.innerHTML = dom;
      contacts.Settings.init();

      MockasyncStorage.setItem('gmail_last_import_timestamp', gmailTime);
      MockasyncStorage.setItem('live_last_import_timestamp', liveTime);

      contacts.Settings.updateTimestamps();
    });

    test('Contacts from SD card and SIM are not imported yet', function() {
      var time = document.querySelector('[data-source="sd"] time');
      assert.equal(time.textContent, '');
      assert.isNull(time.getAttribute('datetime'));

      time = document.querySelector('[data-source="sim"] time');
      assert.equal(time.textContent, '');
      assert.isNull(time.getAttribute('datetime'));
    });

    test('Contacts from Gmail and Live are already imported ', function() {
      var time = document.querySelector('[data-source="gmail"] time');
      assert.equal(time.textContent, gmailTime);
      assert.equal(time.getAttribute('datetime'),
                    (new Date(gmailTime)).toLocaleString());

      time = document.querySelector('[data-source="live"] time');
      assert.equal(time.textContent, liveTime);
      assert.equal(time.getAttribute('datetime'),
                    (new Date(liveTime)).toLocaleString());

    });

    suiteTeardown(function() {
      document.body.innerHTML = '';
      MockasyncStorage.clear();
    });
  });
});
