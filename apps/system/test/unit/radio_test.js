/* global Radio, MocksHelper, MockNavigatorMozMobileConnections,
          requireApp, suite, suiteSetup, suiteTeardown,
          test, setup, assert */

'use strict';

requireApp(
  'system/shared/test/unit/mocks/mock_navigator_moz_mobile_connections.js');

var mocksForRadio = new MocksHelper([
  'NavigatorMozMobileConnections'
]).init();

suite('Radio > ', function() {
  var realMozMobileConnections;
  mocksForRadio.attachTestHelpers();

  suiteSetup(function(done) {
    realMozMobileConnections = window.navigator.mozMobileConnections;
    window.navigator.mozMobileConnections = MockNavigatorMozMobileConnections;
    MockNavigatorMozMobileConnections.mAddMobileConnection();

    requireApp('system/js/radio.js', done);
  });

  suiteTeardown(function() {
    window.navigator.mozMobileConnections = realMozMobileConnections;
    MockNavigatorMozMobileConnections.mTeardown();
  });

  setup(function() {
    // Don't cache this when testing, otherwise would be get 
    // lots of failures
    Radio._mozMobileConnections = null;
    Radio._expectedRadioStates = [null, null];
  });

  suite('internal _doSetRadioEnabled', function() {
    setup(function() {
      Radio.enabled = true;
      setConnection(0, 'enabled');
      this.sinon.spy(Radio, '_doSetRadioEnabled');
    });

    test('is called', function() {
      var conn = MockNavigatorMozMobileConnections[0];
      conn.triggerEventListeners('radiostatechange');
      sinon.assert.called(Radio._doSetRadioEnabled);
    });
  });

  suite('internal _reEnableRadioIfNeeded', function() {
    setup(function() {
      this.sinon.stub(Radio, '_setRadioEnabled');
    });

    test('conn.radioState is "disabled" and Radio.enabled is true', function() {
      var mockMobileConnection = { radioState: 'disabled' };
      Radio._enabled = true;
      Radio._reEnableRadioIfNeeded(mockMobileConnection);
      // _setRadioEnabled is called with correct parameters
      sinon.assert
        .calledWith(Radio._setRadioEnabled, mockMobileConnection, true);
    });

    ['enabled', 'enabling', 'disabling'].forEach((state) => {
      test('conn.radioState is ' + state, function() {
        var mockMobileConnection = { radioState: state };
        Radio._reEnableRadioIfNeeded(mockMobileConnection);
        sinon.assert.notCalled(Radio._setRadioEnabled);
      });
    });

    test('Radio.enabled is false', function() {
      var mockMobileConnection = { radioState: 'enabled' };
      Radio._enabled = false;
      Radio._reEnableRadioIfNeeded(mockMobileConnection);
      sinon.assert.notCalled(Radio._setRadioEnabled);
    });
  });

  suite('internal _onRadioStateChange', function() {
    setup(function() {
      this.sinon.stub(Radio, '_reEnableRadioIfNeeded');
    });

    test('without expected states', function() {
      var mockMobileConnection = {};
      Radio._onRadioStateChange(mockMobileConnection, 0);
      sinon.assert
        .calledWith(Radio._reEnableRadioIfNeeded, mockMobileConnection, 0);
    });

    suite('with an expected states that equals true', function() {
      var expectedState = true;

      suiteSetup(function() {
        expectedState = true;
      });

      test('radio state is enabled', function() {
        var mockMobileConnection = { radioState: 'enabled' };
        Radio._expectedRadioStates[0] = expectedState;
        Radio._onRadioStateChange(mockMobileConnection, 0);
        assert.equal(Radio._expectedRadioStates[0], null);
      });

      ['disabled', 'enabling', 'disabling'].forEach((state) => {
        test('radio state is ' + state, function() {
          var mockMobileConnection = { radioState: state };
          Radio._expectedRadioStates[0] = expectedState;
          Radio._onRadioStateChange(mockMobileConnection, 0);
          assert.equal(Radio._expectedRadioStates[0], expectedState);
        });
      });
    });

    suite('with an expected states that equals false', function() {
      var expectedState = false;

      suiteSetup(function() {
        expectedState = false;
      });

      test('radio state is disabled', function() {
        var mockMobileConnection = { radioState: 'disabled' };
        Radio._expectedRadioStates[0] = expectedState;
        Radio._onRadioStateChange(mockMobileConnection, 0);
        assert.equal(Radio._expectedRadioStates[0], null);
      });

      ['enabled', 'enabling', 'disabling'].forEach((state) => {
        test('radio state is ' + state, function() {
          var mockMobileConnection = { radioState: state };
          Radio._expectedRadioStates[0] = expectedState;
          Radio._onRadioStateChange(mockMobileConnection, 0);
          assert.equal(Radio._expectedRadioStates[0], expectedState);
        });
      });
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
        Radio._enabled = true;
      });

      setup(function() {
        this.sinon.spy(Radio, '_setRadioEnabled');
        Radio.enabled = true;
      });

      test('nothing happend', function() {
        assert.isFalse(Radio._setRadioEnabled.called);
      });
    });

    suite('_enabled is false, keep running', function() {
      // to make each suite with 2 conns
      suiteSetup(function() {
        MockNavigatorMozMobileConnections.mAddMobileConnection();
      });

      setup(function() {
        this.sinon.spy(Radio, '_setRadioEnabled');
        Radio._enabled = false;
      });

      suite('conn0 is enabling, conn1 is enabling', function() {
        setup(function() {
          setConnection(0, 'enabling');
          setConnection(1, 'enabling');
          Radio.enabled = true;
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
        Radio._enabled = false;
        Radio.enabled = true;
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
        this.sinon.stub(window, 'dispatchEvent');

        setConnection(0, 'disabled');
        setConnection(1, 'disabled');
        Radio.enabled = true;
      });

      test('enabled radio',
        function() {
          var conns = window.navigator.mozMobileConnections;
          assert.isFunction(
            conns[0].mCachedRadioEnabledReq.onsuccess);
          assert.isFunction(
            conns[1].mCachedRadioEnabledReq.onsuccess);

          // setRadioEnabled operation is done
          conns[0].mCachedRadioEnabledReq.onsuccess();
          conns[1].mCachedRadioEnabledReq.onsuccess();

          assert.isTrue(window.dispatchEvent.called);
      });
    });
  });

  function setConnection(connIndex, status) {
    MockNavigatorMozMobileConnections[connIndex].radioState = status;
  }
});
