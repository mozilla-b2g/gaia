/* global BaseModule, MocksHelper, MockNavigatorMozMobileConnections */

'use strict';

requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');
requireApp('system/js/service.js');
requireApp('system/js/base_module.js');
requireApp('system/js/radio.js');

var mocksForRadio = new MocksHelper([
  'NavigatorMozMobileConnections'
]).init();

suite('Radio > ', function() {
  mocksForRadio.attachTestHelpers();
  var radio;

  setup(function() {
    MockNavigatorMozMobileConnections.mAddMobileConnection();
    radio = BaseModule.instantiate('Radio',
      {
        mobileConnections: MockNavigatorMozMobileConnections
      });
    radio.start();
  });

  teardown(function() {
    radio.stop();
  });

  suite('AirplaneMode', function() {
    test('Should do nothing if airplaneMode is undefined', function() {
      this.sinon.stub(radio, '_setRadioEnabled');
      this.sinon.stub(radio.service, 'query').returns(undefined);
      radio._start();
      assert.isFalse(radio._setRadioEnabled.called);
    });

    test('Should turn off if airplaneMode is enabled on started', function() {
      this.sinon.stub(radio, '_setRadioEnabled');
      this.sinon.stub(radio.service, 'query').returns(true);
      radio._start();
      assert.isTrue(radio._setRadioEnabled.calledWith(
        MockNavigatorMozMobileConnections[0], false, 0));
      assert.isTrue(radio._setRadioEnabled.calledWith(
        MockNavigatorMozMobileConnections[1], false, 1));
    });

    test('Should turn on if airplaneMode is disabled on started', function() {
      this.sinon.stub(radio, '_setRadioEnabled');
      this.sinon.stub(radio.service, 'query').returns(false);
      radio._start();
      assert.isTrue(radio._setRadioEnabled.calledTwice);
      assert.isTrue(radio._setRadioEnabled.calledWith(
        MockNavigatorMozMobileConnections[0], true, 0));
      assert.isTrue(radio._setRadioEnabled.calledWith(
        MockNavigatorMozMobileConnections[1], true, 1));
    });

    test('Should turn off radio when getting airplanemode-enabled',
      function() {
        this.sinon.stub(radio, '_setRadioEnabled');
        window.dispatchEvent(new CustomEvent('airplanemode-enabled'));
        assert.isTrue(radio._setRadioEnabled.calledWith(
          MockNavigatorMozMobileConnections[0], false, 0));
        assert.isTrue(radio._setRadioEnabled.calledWith(
          MockNavigatorMozMobileConnections[1], false, 1));
      });

    test('Should turn on radio when getting airplanemode-disabled',
      function() {
        this.sinon.stub(radio, '_setRadioEnabled');
        window.dispatchEvent(new CustomEvent('airplanemode-disabled'));
        assert.isTrue(radio._setRadioEnabled.calledWith(
          MockNavigatorMozMobileConnections[0], true, 0));
        assert.isTrue(radio._setRadioEnabled.calledWith(
          MockNavigatorMozMobileConnections[1], true, 1));
      });
  });

  suite('internal _doSetRadioEnabled', function() {
    setup(function() {
      radio.enabled = true;
      setConnection(0, 'enabled');
      this.sinon.spy(radio, '_doSetRadioEnabled');
    });

    test('is called', function() {
      var conn = MockNavigatorMozMobileConnections[0];
      conn.triggerEventListeners('radiostatechange');
      sinon.assert.called(radio._doSetRadioEnabled);
    });
  });

  suite('internal _onRadioStateChange', function() {
    setup(function() {
      this.sinon.stub(radio, 'publish');
    });

    test('publishes the current state', function() {
      var mockMobileConnection = { radioState: 'fakeState' };
      radio._onRadioStateChange(mockMobileConnection, 0);
      assert.isTrue(radio.publish.calledWith('statechange', {
        index: 0,
        state: mockMobileConnection.radioState
      }));
    });
  });

  suite('set enabled to true', function() {
    // make conn count back to 1 at first
    suiteSetup(function() {
      MockNavigatorMozMobileConnections.mTeardown();
    });

    suite('but _enabled is true already, do nothing', function() {
      // to make each suite with 2 conns
      suiteSetup(function() {
        MockNavigatorMozMobileConnections.mAddMobileConnection();
      });

      setup(function() {
        this.sinon.spy(radio, '_setRadioEnabled');
        radio._enabled = true;
        radio.enabled = true;
      });

      test('nothing happend', function() {
        assert.isFalse(radio._setRadioEnabled.called);
      });
    });

    suite('_enabled is false, keep running', function() {
      // to make each suite with 2 conns
      suiteSetup(function() {
        MockNavigatorMozMobileConnections.mAddMobileConnection();
      });

      setup(function() {
        this.sinon.spy(radio, '_setRadioEnabled');
        radio._enabled = false;
      });

      suite('conn0 is enabling, conn1 is enabling', function() {
        setup(function() {
          setConnection(0, 'enabling');
          setConnection(1, 'enabling');
          radio.enabled = true;
        });

        test('we will cache doSetRadioEnabled for later use', function() {
          var conns = MockNavigatorMozMobileConnections;
          assert.isFunction(
            conns[0].mEventListeners.radiostatechange[0]);
          assert.isFunction(
            conns[1].mEventListeners.radiostatechange[0]);
        });
      });
    });

    suite('conn0 is enabling, conn1 is enabled', function() {
      // to make each suite with 2 conns
      suiteSetup(function() {
        MockNavigatorMozMobileConnections.mAddMobileConnection();
      });

      setup(function() {
        this.sinon.stub(window, 'dispatchEvent');

        setConnection(0, 'enabling');
        setConnection(1, 'enabled');
        radio._enabled = false;
        radio.enabled = true;
      });

      test('no further steps because setCount is not 2', function() {
        var conns = MockNavigatorMozMobileConnections;

        assert.isFunction(
          conns[0].mEventListeners.radiostatechange[0]);
        assert.isFunction(
          conns[1].mCachedRadioEnabledReq.onsuccess);

        // but because setCount is not 2, we will not
        // execute further steps
        conns[1].mCachedRadioEnabledReq.onsuccess();
        assert.isFalse(window.dispatchEvent.called);
      });
    });

    suite('conn0 is disabled, conn1 is disabled', function() {
      // to make each suite with 2 conns
      suiteSetup(function() {
        MockNavigatorMozMobileConnections.mAddMobileConnection();
      });

      setup(function() {
        setConnection(0, 'disabled');
        setConnection(1, 'disabled');
        radio.enabled = true;
      });

      test('enabled radio',
        function() {
          var conns = MockNavigatorMozMobileConnections;
          assert.isFunction(
            conns[0].mCachedRadioEnabledReq.onsuccess);
          assert.isFunction(
            conns[1].mCachedRadioEnabledReq.onsuccess);

          // setRadioEnabled operation is done
          conns[0].mCachedRadioEnabledReq.onsuccess();
          conns[1].mCachedRadioEnabledReq.onsuccess();
      });
    });
  });

  function setConnection(connIndex, status) {
    MockNavigatorMozMobileConnections[connIndex].radioState = status;
  }
});
