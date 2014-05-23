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
