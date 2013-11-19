'use strict';

requireApp('settings/test/unit/mock_navigator_settings.js');
requireApp('settings/js/simcard_manager_settings_helper.js');

suite('SettingsHelper > ', function() {

  var realMozSettings;

  suiteSetup(function() {
    realMozSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realMozSettings;
  });

  // test for SettingsHelper.set method
  suite('SettingsHelper.set > ', function() {
    suite('outgoingCall > ', function() {
      suiteSetup(function() {
        SettingsHelper.set('outgoingCall');
      });

      test('outgoinCall key is used', function() {
        var settingKeys = SettingsHelper.settingKeys;
        assert.equal(settingKeys.length, 2);
        assert.include(settingKeys, 'ril.telephony.defaultServiceId');
        assert.include(settingKeys, 'ril.voicemail.defaultServiceId');
      });
    });

    suite('outgoingMessages > ', function() {
      setup(function() {
        SettingsHelper.set('outgoingMessages');
      });

      test('outgoingMessages key is used', function() {
        var settingKeys = SettingsHelper.settingKeys;
        assert.include(settingKeys, 'ril.sms.defaultServiceId');
      });
    });

    suite('outgoingData > ', function() {
      setup(function() {
        SettingsHelper.set('outgoingData');
      });

      test('outgoingData key is used', function() {
        var settingKeys = SettingsHelper.settingKeys;
        assert.equal(settingKeys.length, 2);
        assert.include(settingKeys, 'ril.mms.defaultServiceId');
        assert.include(settingKeys, 'ril.data.defaultServiceId');
      });
    });
  });

  suite('SettingsHelper.on > ', function() {
    var fakeSettingKey = 'ril.sms.defaultServiceId';
    var fakeCardIndex = 0;

    suiteSetup(function() {
      SettingsHelper.settingKeys = [fakeSettingKey];
    });

    setup(function() {
      this.sinon.stub(SettingsHelper, 'setToSettingsDB');
      SettingsHelper.on(fakeCardIndex);
    });

    test('on card 0 is called successfully', function() {
      var calledParameters = SettingsHelper.setToSettingsDB.firstCall.args;
      assert.equal(calledParameters[0], fakeSettingKey);
      assert.equal(calledParameters[1], fakeCardIndex);
    });
  });

  suite('SettingsHelper.setToSettingsDB > ', function() {
    var isFakeCbCalled = false;
    var fakeSettingKey = 'ril.sms.defaultServiceId';
    var fakeSettingValue = '0';

    suiteSetup(function() {
      SettingsHelper.setToSettingsDB(fakeSettingKey, fakeSettingValue,
        function() {
          isFakeCbCalled = true;
      });
    });

    test('setToSettingsDB is called successfully', function() {
      assert.equal(window.navigator.mozSettings.mSettings[fakeSettingKey],
        fakeSettingValue);

      assert.ok(isFakeCbCalled);
    });
  });

  suite('SettingsHelper.set("key").on(cardIndex) > ', function() {
    var fakeCardIndex = 0;
    var fakeSettingKey = 'outgoingCall';

    setup(function() {
      this.sinon.spy(SettingsHelper, 'setToSettingsDB');
      this.sinon.spy(SettingsHelper, 'set');
      this.sinon.spy(SettingsHelper, 'on');

      SettingsHelper.set(fakeSettingKey).on(fakeCardIndex);
    });

    test('can set on a card by chain successfully', function() {
      assert.ok(SettingsHelper.setToSettingsDB.called);
      assert.ok(SettingsHelper.set.called);
      assert.ok(SettingsHelper.on.called);
    });
  });
});
