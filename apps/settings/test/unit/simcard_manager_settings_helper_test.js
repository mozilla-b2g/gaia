'use strict';

requireApp('settings/shared/test/unit/mocks/mock_navigator_moz_settings.js');
requireApp('settings/js/simcard_manager_settings_helper.js');

suite('SimSettingsHelper > ', function() {

  var realMozSettings;

  suiteSetup(function() {
    realMozSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realMozSettings;
  });

  // test for SimSettingsHelper.set method
  suite('SimSettingsHelper._set > ', function() {
    suite('outgoingCall > ', function() {
      suiteSetup(function() {
        SimSettingsHelper._set('outgoingCall');
      });

      test('outgoingCall key is used', function() {
        var settingKeys = SimSettingsHelper.settingKeys;
        assert.equal(settingKeys.length, 2);
        assert.include(settingKeys, 'ril.telephony.defaultServiceId');
        assert.include(settingKeys, 'ril.voicemail.defaultServiceId');
      });
    });

    suite('outgoingMessages > ', function() {
      setup(function() {
        SimSettingsHelper._set('outgoingMessages');
      });

      test('outgoingMessages key is used', function() {
        var settingKeys = SimSettingsHelper.settingKeys;
        assert.include(settingKeys, 'ril.sms.defaultServiceId');
      });
    });

    suite('outgoingData > ', function() {
      setup(function() {
        SimSettingsHelper._set('outgoingData');
      });

      test('outgoingData key is used', function() {
        var settingKeys = SimSettingsHelper.settingKeys;
        assert.include(settingKeys, 'ril.mms.defaultServiceId');
        assert.include(settingKeys, 'ril.data.defaultServiceId');
      });
    });
  });

  suite('SimSettingsHelper._on > ', function() {
    var fakeSettingKey = 'ril.sms.defaultServiceId';
    var fakeCardIndex = 0;

    suiteSetup(function() {
      SimSettingsHelper.settingKeys = [fakeSettingKey];
    });

    setup(function() {
      this.sinon.stub(SimSettingsHelper, '_setToSettingsDB');
      SimSettingsHelper._on(fakeCardIndex);
    });

    test('on card 0 is called successfully', function() {
      var calledParameters = SimSettingsHelper._setToSettingsDB.firstCall.args;
      assert.equal(calledParameters[0], fakeSettingKey);
      assert.equal(calledParameters[1], fakeCardIndex);
    });
  });

  suite('SimSettingsHelper._setToSettingsDB > ', function() {
    var fakeSettingKey = 'ril.sms.defaultServiceId';
    var fakeSettingValue = 0;

    suiteSetup(function() {
      SimSettingsHelper._setToSettingsDB(fakeSettingKey, fakeSettingValue);
    });

    test('setToSettingsDB is called successfully', function() {
      assert.equal(window.navigator.mozSettings.mSettings[fakeSettingKey],
        fakeSettingValue);
    });
  });

  suite('SimSettingsHelper._set("key")._on(cardIndex) > ', function() {
    var fakeCardIndex = 0;
    var fakeSettingKey = 'outgoingCall';

    setup(function() {
      this.sinon.spy(SimSettingsHelper, '_setToSettingsDB');
      this.sinon.spy(SimSettingsHelper, '_set');
      this.sinon.spy(SimSettingsHelper, '_on');

      SimSettingsHelper._set(fakeSettingKey)._on(fakeCardIndex);
    });

    test('can set on a card by chain successfully', function() {
      assert.ok(SimSettingsHelper._setToSettingsDB.called);
      assert.ok(SimSettingsHelper._set.called);
      assert.ok(SimSettingsHelper._on.called);
    });
  });

  suite('SimSettingsHelper._get > ', function() {
    suite('outgoingCall > ', function() {
      suiteSetup(function() {
        SimSettingsHelper._get('outgoingCall');
      });

      test('outgoingCall key is used', function() {
        var settingKeys = SimSettingsHelper.settingKeys;
        assert.equal(settingKeys.length, 1);
        assert.include(settingKeys, 'ril.telephony.defaultServiceId');
      });
    });

    suite('outgoingMessages > ', function() {
      setup(function() {
        SimSettingsHelper._set('outgoingMessages');
      });

      test('outgoingMessages key is used', function() {
        var settingKeys = SimSettingsHelper.settingKeys;
        assert.include(settingKeys, 'ril.sms.defaultServiceId');
      });
    });

    suite('outgoingData > ', function() {
      setup(function() {
        SimSettingsHelper._set('outgoingData');
      });

      test('outgoingData key is used', function() {
        var settingKeys = SimSettingsHelper.settingKeys;
        assert.include(settingKeys, 'ril.data.defaultServiceId');
      });
    });
  });

  suite('SimSettingsHelper._onWhichCard > ', function() {
    var fakeSettingKey = 'ril.sms.defaultServiceId';
    var fakeCallback = function() { };

    suiteSetup(function() {
      SimSettingsHelper.settingKeys = [fakeSettingKey];
    });

    setup(function() {
      this.sinon.stub(SimSettingsHelper, '_getFromSettingsDB');
      SimSettingsHelper._onWhichCard(fakeCallback);
    });

    test('on card 0 is called successfully', function() {
      var calledParameters =
        SimSettingsHelper._getFromSettingsDB.firstCall.args;

      assert.equal(calledParameters[0], fakeSettingKey);
      assert.equal(calledParameters[1], fakeCallback);
    });
  });

  suite('SimSettingsHelper._getFromSettingsDB > ', function() {
    var isCallbackCalled = false;
    var fakeSettingKey = 'ril.sms.defaultServiceId';
    var fakeCallback = function(done) {
      isCallbackCalled = true;
      done();
    };

    suiteSetup(function(done) {
      SimSettingsHelper._getFromSettingsDB(fakeSettingKey, function() {
        fakeCallback(done);
      });
    });

    test('setToSettingsDB is called successfully', function() {
      assert.ok(isCallbackCalled);
    });
  });

  suite('SimSettingsHelper._get("key")._onWhichCard(callback) > ', function() {
    var isCallbackCalled = false;
    var fakeSettingKey = 'outgoingCall';
    var fakeCallback = function(done) {
      isCallbackCalled = true;
      done();
    };

    setup(function(done) {
      this.sinon.spy(SimSettingsHelper, '_get');
      this.sinon.spy(SimSettingsHelper, '_onWhichCard');
      this.sinon.spy(SimSettingsHelper, '_getFromSettingsDB');

      SimSettingsHelper._get(fakeSettingKey)._onWhichCard(function() {
        fakeCallback(done);
      });
    });

    test('can set on a card by chain successfully', function() {
      assert.ok(SimSettingsHelper._get.called);
      assert.ok(SimSettingsHelper._onWhichCard.called);
      assert.ok(SimSettingsHelper._getFromSettingsDB.called);
      assert.ok(isCallbackCalled);
    });
  });

  suite('SimSettingsHelper.getCardIndexFrom("key", callback) > ', function() {
    var fakeCallback;
    var isCallbackCalled;
    var currentCardIndex;
    var defaultCardIndex = 0;

    setup(function() {
      this.sinon.spy(SimSettingsHelper, '_get');
      this.sinon.spy(SimSettingsHelper, '_onWhichCard');
      this.sinon.spy(SimSettingsHelper, '_getFromSettingsDB');

      isCallbackCalled = false;

      fakeCallback = function(done, cardIndex) {
        isCallbackCalled = true;
        currentCardIndex = cardIndex;
        done();
      };
    });

    suite('from outgoingCall > ', function() {
      setup(function(done) {
        SimSettingsHelper.getCardIndexFrom('outgoingCall', function(cardIndex) {
          fakeCallback(done, cardIndex);
        });
      });

      test('can get from outgoingCall successfully', function() {
        assert.include(SimSettingsHelper.settingKeys,
          'ril.telephony.defaultServiceId');

        assert.equal(currentCardIndex, defaultCardIndex);
        assert.ok(isCallbackCalled);
      });
    });

    suite('from outgoingMessages > ', function() {
      setup(function(done) {
        SimSettingsHelper.getCardIndexFrom('outgoingMessages',
          function(cardIndex) {
            fakeCallback(done, cardIndex);
        });
      });

      test('can get from outgoingMessages successfully', function() {
        assert.include(SimSettingsHelper.settingKeys,
          'ril.sms.defaultServiceId');

        assert.equal(currentCardIndex, defaultCardIndex);
        assert.ok(isCallbackCalled);
      });
    });

    suite('from outgoingData > ', function() {
      setup(function(done) {
        SimSettingsHelper.getCardIndexFrom('outgoingData',
          function(cardIndex) {
            fakeCallback(done, cardIndex);
        });
      });

      test('can get from outgoingData successfully', function() {
        assert.include(SimSettingsHelper.settingKeys,
          'ril.data.defaultServiceId');

        assert.equal(currentCardIndex, defaultCardIndex);
        assert.ok(isCallbackCalled);
      });
    });
  });

  suite('SimSettingsHelper.setServiceOnCard("key", cardIndex) > ', function() {
    var fakeCardIndex = 0;
    var mSettings = MockNavigatorSettings.mSettings;

    setup(function() {
      this.sinon.spy(SimSettingsHelper, '_set');
      this.sinon.spy(SimSettingsHelper, '_on');
      this.sinon.spy(SimSettingsHelper, '_setToSettingsDB');
    });

    suite('outgoingCall > ', function() {
      setup(function() {
        SimSettingsHelper.setServiceOnCard('outgoingCall', fakeCardIndex);
      });

      test('can set on outgoingCall successfully', function() {
        assert.include(SimSettingsHelper.settingKeys,
          'ril.telephony.defaultServiceId');

        assert.include(SimSettingsHelper.settingKeys,
          'ril.voicemail.defaultServiceId');

        assert.equal(mSettings['ril.telephony.defaultServiceId'],
          fakeCardIndex);
        assert.equal(mSettings['ril.voicemail.defaultServiceId'],
          fakeCardIndex);
      });
    });

    suite('outgoingMessages > ', function() {
      setup(function() {
        SimSettingsHelper.setServiceOnCard('outgoingMessages', fakeCardIndex);
      });

      test('can set on outgoingMessages successfully', function() {
        assert.include(SimSettingsHelper.settingKeys,
          'ril.sms.defaultServiceId');

        assert.equal(mSettings['ril.sms.defaultServiceId'], fakeCardIndex);
      });
    });

    suite('outgoingData > ', function() {
      setup(function() {
        SimSettingsHelper.setServiceOnCard('outgoingData', fakeCardIndex);
      });

      test('can set on outgoingData successfully', function() {
        assert.include(SimSettingsHelper.settingKeys,
          'ril.mms.defaultServiceId');

        assert.include(SimSettingsHelper.settingKeys,
          'ril.data.defaultServiceId');

        assert.equal(mSettings['ril.mms.defaultServiceId'], fakeCardIndex);
        assert.equal(mSettings['ril.data.defaultServiceId'], fakeCardIndex);
      });
    });

    suite('set string index to outgoingData > ', function() {
      setup(function() {
        SimSettingsHelper.setServiceOnCard('outgoingData', '' + fakeCardIndex);
      });

      test('can set on service id with number successfully', function() {
        assert.equal(mSettings['ril.mms.defaultServiceId'], fakeCardIndex);
        assert.equal(mSettings['ril.data.defaultServiceId'], fakeCardIndex);
      });
    });
  });
});
