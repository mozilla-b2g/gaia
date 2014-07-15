'use strict';

requireApp('settings/shared/test/unit/mocks/mock_navigator_moz_settings.js');

mocha.globals(['SimSettingsHelper']);

suite('SimSettingsHelper > ', function() {
  var realMozSettings;

  suiteSetup(function(done) {
    realMozSettings = window.navigator.mozSettings;
    window.navigator.mozSettings = MockNavigatorSettings;

    // We have to load sim_settings_helper lazily because
    // mozSettings is not ready at first
    requireApp('settings/shared/js/sim_settings_helper.js', done);
  });

  suiteTeardown(function() {
    window.navigator.mozSettings = realMozSettings;
  });

  setup(function() {
    window.navigator.mozSettings.mSetup();
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

    test('setToSettingsDB is called successfully', function(done) {
      SimSettingsHelper._setToSettingsDB(fakeSettingKey, fakeSettingValue,
        function() {
        assert.equal(window.navigator.mozSettings.mSettings[fakeSettingKey],
          fakeSettingValue);
        done();
      });
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
    var mSettings;
    var clock;

    suiteSetup(function() {
      clock = sinon.useFakeTimers();
    });

    suiteTeardown(function() {
      clock.restore();
    });

    setup(function() {
      mSettings = MockNavigatorSettings.mSettings;
      this.sinon.spy(SimSettingsHelper, '_set');
      this.sinon.spy(SimSettingsHelper, '_on');
      this.sinon.spy(SimSettingsHelper, '_setToSettingsDB');
    });

    suite('outgoingCall > ', function() {
      setup(function() {
        SimSettingsHelper.setServiceOnCard('outgoingCall', fakeCardIndex);
        clock.tick(0);
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
        clock.tick(0);
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
        clock.tick(0);
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
        clock.tick(0);
      });

      test('can set on service id with number successfully', function() {
        assert.equal(mSettings['ril.mms.defaultServiceId'], fakeCardIndex);
        assert.equal(mSettings['ril.data.defaultServiceId'], fakeCardIndex);
      });
    });
  });

  suite('SimSettingsHelper._getServiceCallbacks', function() {
    var services = ['outgoingCall', 'outgoingMessages', 'outgoingData'];
    services.forEach(function(serviceName) {
      test(serviceName, function() {
        assert.isTrue(Array.isArray(
          SimSettingsHelper._callbacks[serviceName]));
      });
    });
  });

  suite('SimSettingsHelper.observe > ', function() {
    var spy1;
    var spy2;
    var defaultServiceId = 2;

    setup(function() {
      // Because window.navigator.mozSettings.mSetup() will remove these
      // observers, we have to make sure to bind them back.
      SimSettingsHelper._addSettingsObservers();

      spy1 = this.sinon.spy();
      spy2 = this.sinon.spy();
    });

    test('outgoingCall', function() {
      SimSettingsHelper.observe('outgoingCall', spy1);
      SimSettingsHelper.observe('outgoingCall', spy2);

      MockNavigatorSettings.mTriggerObservers('ril.telephony.defaultServiceId',
        defaultServiceId);

      assert.isTrue(spy1.called);
      assert.isTrue(spy2.called);
    });

    test('outgoingMessages', function() {
      SimSettingsHelper.observe('outgoingMessages', spy1);
      SimSettingsHelper.observe('outgoingMessages', spy2);

      MockNavigatorSettings.mTriggerObservers('ril.sms.defaultServiceId',
        defaultServiceId);

      assert.isTrue(spy1.called);
      assert.isTrue(spy2.called);
    });

    test('outgoingData', function() {
      SimSettingsHelper.observe('outgoingData', spy1);
      SimSettingsHelper.observe('outgoingData', spy2);

      MockNavigatorSettings.mTriggerObservers('ril.data.defaultServiceId',
        defaultServiceId);

      assert.isTrue(spy1.called);
      assert.isTrue(spy2.called);
    });
  });
});
