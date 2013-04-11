requireApp('communications/contacts/js/contacts_settings.js');
requireApp('communications/contacts/js/utilities/future.js');

suite('Contacts settings', function() {
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

  var dom = '<section data-theme="organic" id="view-settings" role="region" class="skin-organic view view-bottom">\n' +
        '<header>\n' +
          '<menu type="toolbar" id="settings-form-actions">\n' +
            '<button id="settings-close" role="menuitem" data-l10n-id="done">Done</button>\n' +
          '</menu>\n' +
          '<h1 data-l10n-id="settings">Settings</h1>\n' +
        '</header>\n' +

        '<article class="view-body" id="settings-article">\n' +
          '<section role="region" class="view-body-inner">\n' +
            '<ul data-type="list">\n' +
              '<li id="settingsOrder">\n' +
               '<aside class="pack-end">\n' +
                  '<label>\n' +
                    '<input type="checkbox" data-type="switch" name="order.lastname" />\n' +
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
              '<li id="settingsSIM">\n' +
                '<button class="icon icon-sim" data-l10n-id="importSim2">\n' +
                  'SIM card\n' +
                '</button>\n' +
                '<p id="no-sim" data-l10n-id="noSimMsg"></p>\n' +
              '</li>\n' +
              '<li id="settingsStorage">\n' +
                '<button class="icon icon-gmail" data-l10n-id="importSd">\n' +
                  'Memory card\n' +
                '</button>\n' +
                '<p id="no-sd" data-l10n-id="noSdMsg"></p>\n' +
              '</li>\n' +
              '<li class="importService">\n' +
                '<button class="icon icon-gmail" data-l10n-id="importGmail">\n' +
                  'Gmail\n' +
                '</button>\n' +
              '</li>\n' +
              '<li class="importService">\n' +
                '<button class="icon icon-live" data-l10n-id="importLive">\n' +
                  'Windows Live\n' +
                '</button>\n' +
              '</li>\n' +
            '</ul>\n' +

            '<header id="fb-header">\n' +
              '<h2 data-l10n-id="facebook">Facebook</h2>\n' +
            '</header>\n' +
            '<ul id="settingsFb" data-type="list" data-state="logged-out">\n' +
              '<li class="fb-item">\n' +
                '<aside class="pack-end">\n' +
                  '<label>\n' +
                      '<input type="checkbox" data-type="switch" name="fb.imported">\n' +
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
      document.querySelector('body').innerHTML = dom;
      Contacts = {
        extServices: {},
        navigation: {
          home: stub()
        }
      };
      fb = {
        isEnabled: false
      };
      window.asyncStorage = {
        getItem: stub(),
        setItem: stub(),
        removeItem: stub()
      };
      contacts.Settings.init();
      _ = stub('blah');

      window.VCFReader = function() {
        window.VCFReader.callCount++;

        this.process = window.VCFReader.process;
      };
      window.VCFReader.callCount = 0;
      window.VCFReader.process = stub({
          then: function(cb) {
            setTimeout(cb, 10); //future
          }
        });
    });

    teardown(function() {
      document.querySelector('body').innerHTML = '';
    });

    test('show SD Card import if SD card is present', function() {
      navigator.getDeviceStorage = stub(true);

      assert.equal(contacts.Settings.checkStorageCard(), true);

      assert.equal(
        document.getElementById('settingsStorage').firstElementChild.hasAttribute('disabled'),
        false);
      assert.equal(document.querySelector('#no-sd').classList.contains('hide'), true);
    });

    test('no SD card import if no SD card is present', function() {
      navigator.getDeviceStorage = stub(false);

      assert.equal(contacts.Settings.checkStorageCard(), false);
      assert.equal(
        document.getElementById('settingsStorage').firstElementChild.hasAttribute('disabled'),
        true);
      assert.equal(document.querySelector('#no-sd').classList.contains('hide'), false);
    });

    test('Clicking SD import should traverse SD Card (0 results)', function(done) {
      Contacts.showOverlay = stub();
      Contacts.hideOverlay = stub();
      Contacts.showStatus = stub();
      navigator.getDeviceStorage = stub({
        enumerate: function() {
          var px = {};
          setTimeout(function() { px.onsuccess({target:{result:null}}); });
          return px;
        }
      });

      document.querySelector('[data-l10n-id="importSd"]').click();

      setTimeout(function() {
        assert.equal(Contacts.showOverlay.callCount, 1);
        assert.equal(navigator.getDeviceStorage.callCount, 1);
        assert.equal(navigator.getDeviceStorage.calledWith[0], 'sdcard');
        assert.equal(window.VCFReader.callCount, 1);
        assert.equal(window.VCFReader.process.callCount, 1);
        assert.equal(Contacts.hideOverlay.callCount, 1);
        assert.equal(Contacts.showStatus.callCount, 1);
        assert.equal(_.calledWith[1].n, 0);

        done();
      }, 300);

    })
  });
});
