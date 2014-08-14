/* global MocksHelper, MockSystem */

'use strict';

requireApp('system/js/shrinking_ui.js');
requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_app_window_manager.js');
requireApp('system/test/unit/mock_app_window.js');
require('/shared/test/unit/mocks/mock_system.js');

var mocksForshrinkingUI = new MocksHelper([
  'AppWindow',
  'AppWindowManager',
  'OrientationManager',
  'System'
]).init();

suite('system/shrinkingUI', function() {
  var shrinkingUI;
  mocksForshrinkingUI.attachTestHelpers();

  var fakeApp, fakeBrowserApp;
  var fakeAppConfig = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake',
    instanceID: 'instanceID'
  };

  var fakeBrowserAppConfig = {
    url: 'http://yahoo.com',
    origin: 'http://yahoo.com',
    instanceID: 'instanceID2'
  };

  setup(function() {
    shrinkingUI = new window.ShrinkingUI();
    shrinkingUI.start();
    fakeApp = new window.AppWindow(fakeAppConfig);
    fakeBrowserApp = new window.AppWindow(fakeBrowserAppConfig);
    window.AppWindowManager.mActiveApp = fakeApp;
  });

  teardown(function() {
    window.AppWindowManager.mActiveApp = null;
  });

  function createTouchEvent(type, target, x, y) {
    var touch = document.createTouch(window, target, 1, x, y, x, y);
    var touchList = document.createTouchList(touch);

    var evt = document.createEvent('TouchEvent');
    evt.initTouchEvent(type, true, true, window,
                       0, false, false, false, false,
                       touchList, touchList, touchList);
    return evt;
  }

  test('Test Debug function', function() {
    var oldDebug = shrinkingUI.DEBUG;

    var stubDump = this.sinon.stub(window, 'dump');

    shrinkingUI.DEBUG = true;
    var msg = 'somemsg';
    var opt = {'opt': 'optopt'};
    shrinkingUI.debug(msg, opt);

    assert.isTrue(stubDump.calledWith('[DEBUG] ShrinkingUI: somemsg' +
      JSON.stringify(opt)));

    stubDump.reset();

    shrinkingUI.DEBUG = false;
    shrinkingUI.debug(msg, opt);
    assert.isFalse(stubDump.called);

    shrinkingUI.DEBUG = oldDebug;
  });

  var homeAndHoldhomeTestFactory = function(type_) {
    return function() {
      var evt = {
        type: type_,
        stopImmediatePropagation: this.sinon.spy()
      };
      var stubState = this.sinon.stub(shrinkingUI, '_state').returns(true);
      shrinkingUI.handleEvent(evt);

      assert.isTrue(stubState.called);
      assert.isTrue(evt.stopImmediatePropagation.called);

      stubState.reset();
      evt.stopImmediatePropagation.reset();

      stubState.returns(false);
      shrinkingUI.handleEvent(evt);
      assert.isTrue(stubState.called);
      assert.isFalse(evt.stopImmediatePropagation.called);
    };
  };

  test('Update Active App', function() {
    shrinkingUI._updateActiveApp();
    assert.deepEqual(shrinkingUI.current.app, fakeApp);
    assert.equal(shrinkingUI.current.manifestURL, fakeApp.manifestURL);
  });

  test('Update Active App if app has no manifestURL', function() {
    window.AppWindowManager.mActiveApp = fakeBrowserApp;

    shrinkingUI._updateActiveApp();
    assert.deepEqual(shrinkingUI.current.app, fakeBrowserApp);
    assert.equal(shrinkingUI.current.manifestURL, MockSystem.manifestURL);
  });

  test('Handle "home" event', homeAndHoldhomeTestFactory('home'));
  test('Handle "holdhome" event', homeAndHoldhomeTestFactory('holdhome'));

  test('Handle "home" event would make current app as null', function() {
    var evt = {
      type: 'home',
    };
    var stubUpdateActiveApp = this.sinon.stub(shrinkingUI, '_updateActiveApp');
    shrinkingUI.handleEvent(evt);
    assert.isTrue(stubUpdateActiveApp.calledOnce);
  });

  test('Handle "homescreenopened" event', function() {
    var evt = {
      type: 'homescreenopened',
    };
    var stubUpdateActiveApp = this.sinon.stub(shrinkingUI, '_updateActiveApp');
    shrinkingUI.handleEvent(evt);
    assert.isTrue(stubUpdateActiveApp.calledOnce);
  });

  test('Handle "appterminated" event', function() {
    var evt = {
      type: 'appterminated',
      detail: {
        url: 'app://www.fake.app/maniurl',
        manifestURL: 'app://www.fake.app/maniurl',
        instanceID: 'fakeinstance'
      }
    };

    var oldCurrentManifestURL = shrinkingUI.current.manifestURL;
    shrinkingUI.current.manifestURL = evt.detail.manifestURL;
    shrinkingUI.current.instanceID = evt.detail.instanceID;
    var stubCleanEffects = this.sinon.stub(shrinkingUI, '_cleanEffects');
    var stubState = this.sinon.stub(shrinkingUI, '_state').returns(true);
    shrinkingUI.handleEvent(evt);

    assert.isTrue(stubState.called);
    assert.isTrue(stubCleanEffects.called);

    // test _state() returns false

    stubState.reset();
    stubCleanEffects.reset();

    stubState.returns(false);

    shrinkingUI.handleEvent(evt);

    assert.isTrue(stubState.called);
    assert.isFalse(stubCleanEffects.called);

    // test _state() returns true (would check manifestURL identity)

    stubState.reset();
    stubCleanEffects.reset();

    stubState.returns(true);
    shrinkingUI.current.instanceID = 'RandomString';
    shrinkingUI.handleEvent(evt);

    assert.isTrue(stubState.called);
    assert.isFalse(stubCleanEffects.called);

    // restore everything

    shrinkingUI.current.manifestURL = oldCurrentManifestURL;
  });

  test('Handle "appterminated" event', function() {
    var evt = {
      type: 'appterminated',
      detail: {
        url: 'app://www.fake.app/maniurl',
        manifestURL: 'app://www.fake.app/maniurl',
        instanceID: 'fakeinstance'
      }
    };

    var stubCleanEffects = this.sinon.stub(shrinkingUI, '_cleanEffects');
    this.sinon.stub(shrinkingUI, '_state').returns(true);
    shrinkingUI.current.instanceID = 'fakeinstance';
    shrinkingUI.handleEvent(evt);
    assert.isTrue(stubCleanEffects.calledOnce);

  });

  test('Handle "appopen" event', function() {
    var evt = {
      type: 'appopen',
      detail: {
        manifestURL: 'app://www.fake.app/mfurl',
        instanceID: 'instanceID',
        url: 'app://www.fake.app/mfurl'
      }
    };
    var stubUpdateActiveApp = this.sinon.stub(shrinkingUI, '_updateActiveApp');
    shrinkingUI.handleEvent(evt);
    assert.isTrue(stubUpdateActiveApp.calledOnce);
  });

  test('Handle "activityopened" event', function() {
    var evt = {
      type: 'activityopened',
      detail: {
        manifestURL: 'app://www.fake.app/mfurl',
        instanceID: 'instanceID',
        url: 'app://www.fake.app/mfurl'
      }
    };
    var stubUpdateActiveApp = this.sinon.stub(shrinkingUI, '_updateActiveApp');
    shrinkingUI.handleEvent(evt);
    assert.isTrue(stubUpdateActiveApp.calledOnce);
  });

  test('Handle "appwill-become-active" event', function() {
    var evt = {
      type: 'appwill-become-active',
      detail: {
        manifestURL: 'app://www.fake.app/mfsturl',
        instanceID: 'instanceID',
        url: 'app://www.fake.app/mfsturl'
      }
    };
    var stubUpdateActiveApp = this.sinon.stub(shrinkingUI, '_updateActiveApp');
    shrinkingUI.handleEvent(evt);
    assert.isTrue(stubUpdateActiveApp.calledOnce);
  });

  test('Handle "shrinking-start" event', function() {
    var evt = {
      type: 'shrinking-start'
    };
    var stubSetup = this.sinon.stub(shrinkingUI, '_setup');
    var stubStart = this.sinon.stub(shrinkingUI, 'startTilt');
    shrinkingUI.handleEvent(evt);
    assert.isTrue(stubSetup.called);
    assert.isTrue(stubStart.called);
  });

  test('Handle "shrinking-stop" event', function() {
    var evt = {
      type: 'shrinking-stop'
    };
    var stubStop = this.sinon.stub(shrinkingUI, 'stopTilt');
    shrinkingUI.handleEvent(evt);
    assert.isTrue(stubStop.called);
  });

  test('Handle "shrinking-receiving" event', function() {
    var evt = {
      type: 'shrinking-receiving'
    };
    var stubSetup =
      this.sinon.stub(shrinkingUI, '_setup');
    var stubReceivingEffects =
      this.sinon.stub(shrinkingUI, '_receivingEffects');
    shrinkingUI.handleEvent(evt);
    assert.isTrue(stubSetup.called);
    assert.isTrue(stubReceivingEffects.called);
  });

  test('Handle "shrinking-rejected" event', function() {
    var evt = {
      type: 'shrinking-rejected'
    };
    var stubRejected = this.sinon.stub(shrinkingUI, '_rejected');
    shrinkingUI.handleEvent(evt);
    assert.isTrue(stubRejected.called);
  });

  test('Handle "check-p2p-registration-for-active-app" event', function() {
    var evt = {
      type: 'check-p2p-registration-for-active-app',
      detail: {
        checkP2PRegistration: this.sinon.spy()
      }
    };
    shrinkingUI.current.manifestURL = 'RandomString';
    shrinkingUI.handleEvent(evt);
    assert.isTrue(evt.detail.checkP2PRegistration.calledWith('RandomString'));
  });

  test('Handle "dispatch-p2p-user-response-on-active-app" event', function() {
    var evt = {
      type: 'dispatch-p2p-user-response-on-active-app',
      detail: {
        dispatchP2PUserResponse: this.sinon.spy()
      }
    };
    shrinkingUI.current.manifestURL = 'RandomStr2';
    shrinkingUI.handleEvent(evt);
    assert.isTrue(evt.detail.dispatchP2PUserResponse.calledWith('RandomStr2'));
  });

  test('Shrinking UI Setup', function() {
    shrinkingUI.current.app = fakeApp;
    fakeApp.element = {
      parentNode: 'dummy1'
    };

    shrinkingUI._setup();
    assert.deepEqual(shrinkingUI.current.element, { parentNode: 'dummy1' });
    assert.equal(shrinkingUI.current.wrapper, 'dummy1');
  });

  test('Shrinking UI Start', function(done) {
    // test for state = true (not going to start actually)
    var stubState = this.sinon.stub(shrinkingUI, '_state').returns(true);
    var stubSetTip = this.sinon.stub(shrinkingUI, '_setTip');
    var stubSetState = this.sinon.stub(shrinkingUI, '_setState');
    shrinkingUI.startTilt();
    assert.isTrue(stubState.called);
    assert.isFalse(stubSetTip.called);
    assert.isFalse(stubSetState.called);

    stubState.reset();
    stubSetTip.reset();
    stubSetState.reset();

    // actual "start"

    var oldURL = shrinkingUI.currentAppURL;
    var testApp = {
      setVisible: this.sinon.spy()
    };

    shrinkingUI.current.app = testApp;

    stubState.returns(false);
    var stubShrinkingTilt =
      this.sinon.stub(shrinkingUI, '_shrinkingTilt', function(cb){
        cb();

        assert.isTrue(stubState.called);
        assert.isTrue(stubSetState.calledWith(true));
        assert.isTrue(stubShrinkingTilt.called);
        assert.isTrue(testApp.setVisible.calledWith(false, true));

        shrinkingUI.currentAppURL = oldURL;

        done();
      });

    shrinkingUI.startTilt();
  });

  test('Shrinking UI SetTip', function() {
    var tempTip = {
      classList: {
        remove: this.sinon.spy()
      }
    };
    var stubSlidingTip =
      this.sinon.stub(shrinkingUI, '_slidingTip').returns(tempTip);

    // first test: with shrinkingUI.current.tip being unavailable

    var oldCurrent = shrinkingUI.current;
    shrinkingUI.current = {
      tip: null,
      wrapper: {
        appendChild: this.sinon.spy()
      }
    };

    shrinkingUI._setTip();

    assert.isTrue(stubSlidingTip.called);
    assert.equal(shrinkingUI.current.tip, tempTip);
    assert.isTrue(shrinkingUI.current.wrapper.appendChild.calledWith(tempTip));
    assert.isTrue(tempTip.classList.remove.calledWith('hide'));

    // second test: with shrinkingUIcurrent.tip being available

    shrinkingUI.current.tip = {
      classList: {
        remove: this.sinon.spy()
      }
    };

    stubSlidingTip.reset();
    shrinkingUI.current.wrapper.appendChild.reset();
    shrinkingUI._setTip();

    assert.isTrue(stubSlidingTip.called);
    assert.isFalse(shrinkingUI.current.wrapper.appendChild.called);
    assert.isTrue(shrinkingUI.current.tip.classList.remove.calledWith('hide'));

    shrinkingUI.current = oldCurrent;
    assert.notEqual('undefined', typeof shrinkingUI.current.tip,
      'after test the tip was not reseted');
    assert.notEqual('null', typeof shrinkingUI.current.tip,
      'after test the tip was not reseted');
  });

  test('Shrinking UI Stop', function(done) {
    // test for state = false (not going to start actually)
    var originalShrinking = shrinkingUI.state.shrinking;
    shrinkingUI.state.shrinking = false;
    var stubShrinkingTiltBack =
      this.sinon.stub(shrinkingUI, '_shrinkingTiltBack');
    shrinkingUI.stopTilt();
    assert.isFalse(stubShrinkingTiltBack.called);
    stubShrinkingTiltBack.restore();
    shrinkingUI.state.shrinking = originalShrinking;

    // actual "stop"

    var oldURL = shrinkingUI.currentAppURL;
    var oldTip = shrinkingUI.current.tip;
    var testApp = {
      setVisible: this.sinon.spy()
    };
    var fakeTip = {
      remove: this.sinon.spy()
    };

    shrinkingUI.current.app = testApp;
    shrinkingUI.current.tip = fakeTip;

    // Stub a promised function.
    var stubCleanEffects = this.sinon.stub(shrinkingUI, '_cleanEffects',
    function() {
      return {
        then: function(cb) {
          cb();
        }
      };
    });

    stubShrinkingTiltBack =
      this.sinon.stub(shrinkingUI, '_shrinkingTiltBack', function(instant, cb){
        assert.isTrue(instant);
        cb();
        assert.isTrue(fakeTip.remove.called);
        assert.isNull(this.current.tip);
        assert.isTrue(testApp.setVisible.calledWith(true));

        stubCleanEffects.restore(); // this one is for gjslinter happy

        shrinkingUI.currentAppURL = oldURL;
        shrinkingUI.current.tip = oldTip;

        done();
      });

    shrinkingUI.stopTilt();
  });

  test('Shrinking UI Rejected', function(done) {
    var stubEnableSlidingCover =
      this.sinon.stub(shrinkingUI, '_enableSlidingCover');
    var stubSetTip = this.sinon.stub(shrinkingUI, '_setTip');
    var stubStop = this.sinon.stub(shrinkingUI, 'stopTilt');
    var stubSendSlideTo =
      this.sinon.stub(shrinkingUI, '_sendingSlideTo', function(y, cb){
        assert.equal(y, 'BOTTOM');

        cb();

        assert.isTrue(stubEnableSlidingCover.called);
        assert.isTrue(stubSetTip.called);
        assert.isTrue(stubStop.called);

        stubEnableSlidingCover.restore();
        stubSetTip.restore();
        stubSendSlideTo.restore();
        stubStop.restore();

        done();
      });

    shrinkingUI._rejected();
  });

  test('Shrinking UI State', function() {
    var oldAppFrame = shrinkingUI.current.element;

    // first test: setup or not
    shrinkingUI.current.element = null;

    assert.isFalse(shrinkingUI._state());

    // second tests: shrinkingState
    shrinkingUI.current.element = {
      dataset: {
        shrinkingState: 'false'
      }
    };

    shrinkingUI.state.shrinking =
    shrinkingUI.state.tilting =
    shrinkingUI.state.ending = false;

    assert.isFalse(shrinkingUI._state());

    shrinkingUI.state.shrinking = true;
    assert.isTrue(shrinkingUI._state());

    shrinkingUI.current.element = oldAppFrame;
  });

  test('Shrinking UI SetState', function() {
    var oldAppFrame = shrinkingUI.current.element;

    var stubSetAttribute = this.sinon.stub();
    shrinkingUI.current.element = {
      setAttribute: stubSetAttribute
    };
    var stubDebug = this.sinon.stub(shrinkingUI, 'debug');

    shrinkingUI._setState(123);

    assert.isTrue(stubSetAttribute.calledWith('data-shrinking-state', '123'));
    assert.isTrue(stubDebug.called);

    shrinkingUI.current.element = oldAppFrame;
  });

  test('Shrinking UI Update Slide Transition', function() {
    var oldTip = shrinkingUI.current.tip;
    var oldSlideTransitionCb = shrinkingUI.state.slideTransitionCb;

    // test valid slideTransitionCb

    var tip = {
      removeEventListener: this.sinon.spy()
    };
    shrinkingUI.current.tip = tip;


    shrinkingUI.state.slideTransitionCb = 'STCB';

    shrinkingUI._updateSlideTransition('STCB2');
    assert.isTrue(tip.removeEventListener.calledWith('transitionend', 'STCB'));
    assert.equal(shrinkingUI.state.slideTransitionCb, 'STCB2');

    tip.removeEventListener.reset();

    // test null slideTransitionCb

    shrinkingUI.state.slideTransitionCb = null;

    shrinkingUI._updateSlideTransition('STCB3');
    assert.isFalse(tip.removeEventListener.called);
    assert.equal(shrinkingUI.state.slideTransitionCb, 'STCB3');

    // test null tip

    shrinkingUI.current.tip = null;

    shrinkingUI._updateSlideTransition('STCB4');
    assert.equal(shrinkingUI.state.slideTransitionCb, 'STCB4');

    // restore

    shrinkingUI.current.tip = oldTip;
    shrinkingUI.state.slideTransitionCb = oldSlideTransitionCb;
  });

  test('Shrinking UI Update Tilt Transition', function() {
    var oldAppFrame = shrinkingUI.current.element;
    var oldTiltTransitionCb = shrinkingUI.state.tiltTransitionCb;

    // test valid slideTransitionCb

    var frame = {
      removeEventListener: this.sinon.spy()
    };

    shrinkingUI.current.element = frame;

    shrinkingUI.state.tiltTransitionCb = 'TTCB';

    shrinkingUI._updateTiltTransition('TTCB2');
    assert.isTrue(
      frame.removeEventListener.calledWith('transitionend', 'TTCB')
    );
    assert.equal(shrinkingUI.state.tiltTransitionCb, 'TTCB2');

    frame.removeEventListener.reset();

    // test null slideTransitionCb

    shrinkingUI.state.tiltTransitionCb = null;

    shrinkingUI._updateTiltTransition('TTCB3');
    assert.isFalse(frame.removeEventListener.called);
    assert.equal(shrinkingUI.state.tiltTransitionCb, 'TTCB3');

    // test null frame

    shrinkingUI.current.element = null;

    shrinkingUI._updateTiltTransition('TTCB4');
    assert.equal(shrinkingUI.state.tiltTransitionCb, 'TTCB4');

    // restore

    shrinkingUI.current.element = oldAppFrame;
    shrinkingUI.state.tiltTransitionCb = oldTiltTransitionCb;
  });

  test('Shrinking UI ReceivingEffects', function() {
    shrinkingUI.current.element = document.createElement('div');

    var stubShrinkingTilt = this.sinon.stub(shrinkingUI, '_shrinkingTilt');
    var stubSendingSlideTo = this.sinon.stub(shrinkingUI, '_sendingSlideTo');

    shrinkingUI._receivingEffects();

    assert.equal(shrinkingUI.current.element.style.opacity, '0');
    assert.isTrue(stubShrinkingTilt.called);

    // call afterTilt
    stubShrinkingTilt.getCall(0).args[0]();

    assert.equal(shrinkingUI.current.element.style.transition,
      'transform 0.05s ease 0s');

    assert.isTrue(stubSendingSlideTo.called);
    assert.isTrue(stubSendingSlideTo.getCall(0).calledWith('TOP'));

    // call afterTop
    stubSendingSlideTo.getCall(0).args[1]();
    assert.equal(shrinkingUI.current.element.style.opacity, '');
    assert.equal(shrinkingUI.current.element.style.transition,
      'transform 0.5s ease 0s');

    assert.isTrue(stubSendingSlideTo.calledTwice);
    assert.isTrue(stubSendingSlideTo.getCall(1).calledWith('BOTTOM'));

    var stubShrinkingTiltBack =
      this.sinon.stub(shrinkingUI, '_shrinkingTiltBack');
    var oldCleanEffects = shrinkingUI._cleanEffects;
    shrinkingUI._cleanEffects = 'dummyCE';

    // call doTiltBack
    stubSendingSlideTo.getCall(1).args[1]();
    assert.isTrue(stubShrinkingTiltBack.calledWith(false, 'dummyCE'));

    shrinkingUI._cleanEffects = oldCleanEffects;
  });

  test('Shrinking UI SendingSlideTo, full, with specified Y', function() {
    var oldAppFrame = shrinkingUI.current.element;

    var spyAddEventListener = this.sinon.spy();
    var spyRemoveEventListener = this.sinon.spy();

    var stubGetTiltingDegree =
      this.sinon.stub(shrinkingUI, '_getTiltingDegree').returns('5deg');

    var stubUpdateTiltTransition =
      this.sinon.stub(shrinkingUI, '_updateTiltTransition');

    shrinkingUI.current.element = {
      addEventListener: spyAddEventListener,
      removeEventListener: spyRemoveEventListener,
      style: {
        transform: ''
      }
    };

    shrinkingUI._sendingSlideTo(10, function(){
    });

    assert.equal(shrinkingUI.current.element.style.transform,
      'rotateX(5deg) translateY(-10px)');

    assert.isTrue(spyAddEventListener.calledWith('transitionend'));
    assert.isTrue(
      stubUpdateTiltTransition
      .calledWith(spyAddEventListener.getCall(0).args[1])
    );

    // simulate transitionend event
    spyAddEventListener.callArg(1);

    assert.isTrue(
      spyRemoveEventListener
      .calledWith('transitionend', spyAddEventListener.getCall(0).args[1])
    );

    stubGetTiltingDegree.restore(); // for gjslint happy
    shrinkingUI.current.element = oldAppFrame;
  });

  test('Shrinking UI SendingSlideTo, with Y = TOP', function() {
    var oldAppFrame = shrinkingUI.current.element;

    var stubGetTiltingDegree =
      this.sinon.stub(shrinkingUI, '_getTiltingDegree').returns('6deg');

    var stubUpdateTiltTransition =
      this.sinon.stub(shrinkingUI, '_updateTiltTransition');

    shrinkingUI.current.element = {
      addEventListener: function(){},
      style: {
        transform: ''
      },
      parentElement: {
        clientHeight: '40'
      }
    };

    shrinkingUI._sendingSlideTo('TOP', function(){
    });

    assert.equal(
      shrinkingUI.current.element.style.transform,
      'rotateX(6deg) translateY(-40px)'
    );

    // for gjslint happy
    stubGetTiltingDegree.restore();
    stubUpdateTiltTransition.restore();

    shrinkingUI.current.element = oldAppFrame;
  });

  test('Shrinking UI SendingSlideTo, with Y = BOTTOM', function() {
    var oldAppFrame = shrinkingUI.current.element;

    var stubGetTiltingDegree =
      this.sinon.stub(shrinkingUI, '_getTiltingDegree').returns('7deg');

    var stubUpdateTiltTransition =
      this.sinon.stub(shrinkingUI, '_updateTiltTransition');

    shrinkingUI.current.element = {
      addEventListener: function(){},
      style: {
        transform: ''
      },
    };

    shrinkingUI._sendingSlideTo('BOTTOM', function(){
    });

    assert.equal(
      shrinkingUI.current.element.style.transform,
      'rotateX(7deg) translateY(-0px)'
    );

    // for gjslint's happy
    stubGetTiltingDegree.restore();
    stubUpdateTiltTransition.restore();
    shrinkingUI.current.element = oldAppFrame;
  });

  test('Shrinking UI SendingSlideTo, with Y < 0', function() {
    var oldAppFrame = shrinkingUI.current.element;

    var stubGetTiltingDegree =
      this.sinon.stub(shrinkingUI, '_getTiltingDegree').returns('8deg');

    var stubUpdateTiltTransition =
      this.sinon.stub(shrinkingUI, '_updateTiltTransition');

    shrinkingUI.current.element = {
      addEventListener: function(){},
      style: {
        transform: ''
      },
    };

    shrinkingUI._sendingSlideTo(-20, function(){
    });

    assert.equal(
      shrinkingUI.current.element.style.transform,
      'rotateX(8deg) translateY(-0px)'
    );

    // for gjslint's happy
    stubGetTiltingDegree.restore();
    stubUpdateTiltTransition.restore();

    shrinkingUI.current.element = oldAppFrame;
  });

  test('Shrinking UI SlidingCover', function() {
    var stubHandleSendingStart =
      this.sinon.stub(shrinkingUI, '_handleSendingStart');
    var stubHandleSendingSlide =
      this.sinon.stub(shrinkingUI, '_handleSendingSlide');
    var stubHandleSendingOut =
      this.sinon.stub(shrinkingUI, '_handleSendingOut');

    var cover = shrinkingUI._slidingCover();

    assert.equal(cover.tagName.toLowerCase(), 'div');

    assert.equal(cover.id, 'shrinking-cover');
    assert.equal(cover.style.width, '100%');
    assert.equal(cover.style.height, '100%');
    assert.equal(cover.style.position, 'relative');
    assert.equal(cover.style.zIndex, '2');

    cover.dispatchEvent(createTouchEvent('touchstart'));
    cover.dispatchEvent(createTouchEvent('touchmove'));
    cover.dispatchEvent(createTouchEvent('touchend'));

    assert.isTrue(stubHandleSendingStart.called);
    assert.isTrue(stubHandleSendingSlide.called);
    assert.isTrue(stubHandleSendingOut.called);
  });

  test('Shrinking UI SlidingTip', function() {
    var fakeMozL10n = false;
    if(!('mozL10n' in navigator)){
      navigator.mozL10n = {
        get: function(){
          return 'dummy';
        }
      };
      fakeMozL10n = true;
    }

    var tip = shrinkingUI._slidingTip();
    var tipArrow = tip.children[0];

    assert.equal(tip.tagName.toLowerCase(), 'div');
    assert.equal(tip.id, 'shrinking-tip');
    assert.equal(
      tip.textContent,
      navigator.mozL10n.get('shrinking-tip') + tipArrow.textContent
    );
    assert.equal(tipArrow.tagName.toLowerCase(), 'div');
    assert.equal(tipArrow.id, 'shrinking-tip-arrow');
    assert.equal(tipArrow.textContent, '\u00A0');

    if(fakeMozL10n){
      delete navigator.mozL10n;
    }
  });

  test('Shrinking UI EnableSlidingCover', function() {
    var oldCover = shrinkingUI.current.cover;

    var stubHandleSendingStart =
      this.sinon.stub(shrinkingUI, '_handleSendingStart');
    var stubHandleSendingSlide =
      this.sinon.stub(shrinkingUI, '_handleSendingSlide');
    var stubHandleSendingOut =
      this.sinon.stub(shrinkingUI, '_handleSendingOut');

    shrinkingUI.current.cover = document.createElement('div');

    var cover = shrinkingUI._enableSlidingCover();

    cover.dispatchEvent(createTouchEvent('touchstart'));
    cover.dispatchEvent(createTouchEvent('touchmove'));
    cover.dispatchEvent(createTouchEvent('touchend'));

    assert.isTrue(stubHandleSendingStart.called);
    assert.isTrue(stubHandleSendingSlide.called);
    assert.isTrue(stubHandleSendingOut.called);

    shrinkingUI.current.cover = oldCover;
  });

  test('Shrinking UI DisableSlidingCover', function() {
    var oldCover = shrinkingUI.current.cover;

    var stubHandleSendingStart =
      this.sinon.stub(shrinkingUI, '_handleSendingStart');
    var stubHandleSendingSlide =
      this.sinon.stub(shrinkingUI, '_handleSendingSlide');
    var stubHandleSendingOut =
      this.sinon.stub(shrinkingUI, '_handleSendingOut');

    shrinkingUI.current.cover = document.createElement('div');

    shrinkingUI.current.cover.addEventListener(
      'touchstart',
      shrinkingUI._handleSendingStart
    );
    shrinkingUI.current.cover.addEventListener(
      'touchmove',
      shrinkingUI._handleSendingSlide
    );
    shrinkingUI.current.cover.addEventListener(
      'touchend',
      shrinkingUI._handleSendingOut
    );

    var cover = shrinkingUI._disableSlidingCover();

    cover.dispatchEvent(createTouchEvent('touchstart'));
    cover.dispatchEvent(createTouchEvent('touchmove'));
    cover.dispatchEvent(createTouchEvent('touchend'));

    assert.isFalse(stubHandleSendingStart.called);
    assert.isFalse(stubHandleSendingSlide.called);
    assert.isFalse(stubHandleSendingOut.called);

    shrinkingUI.current.cover = oldCover;
  });

  test('Shrinking UI ShrinkingTilt, full, with null cover', function() {
    var oldCurrent = shrinkingUI.current;

    var current = {
      cover: null,
      element: {
        addEventListener: this.sinon.spy(),
        removeEventListener: this.sinon.spy(),
        firstElementChild: 'someChild',
        insertBefore: this.sinon.spy(),
        style: {}
      },
      wrapper: {
        classList: {
          add: this.sinon.spy()
        }
      }
    };
    shrinkingUI.current = current;

    var stubSlidingCover =
      this.sinon.stub(shrinkingUI, '_slidingCover').returns('cover');
    var stubGetOverTiltingDegree =
      this.sinon.stub(shrinkingUI, '_getOverTiltingDegree').returns('9deg');
    var stubUpdateTiltTransition =
      this.sinon.stub(shrinkingUI, '_updateTiltTransition');

    var spyCb = this.sinon.spy();

    shrinkingUI._shrinkingTilt(spyCb);
    assert.isTrue(stubSlidingCover.called);
    assert.isTrue(
      current.element.insertBefore.calledWith('cover',
      'someChild')
    );
    assert.isTrue(current.wrapper.classList.add.calledWith(
      'shrinking-wrapper'));
    assert.equal(current.element.style.transition,
      'transform 0.5s ease');
    assert.isTrue(current.element.addEventListener
      .calledWith('transitionend')
    );
    assert.isTrue(stubUpdateTiltTransition.
      calledWith(current.element
        .addEventListener.getCall(0).args[1]
      )
    );
    assert.equal(current.element.style.transformOrigin,
      '50% 100% 0');
    assert.equal(current.element.style.transform, 'rotateX(9deg)');

    // restoration for "outer" scope
    stubGetOverTiltingDegree.restore(); // for gjslint's happy
    stubUpdateTiltTransition.reset();

    // call the bounceBack
    var stubGetTiltingDegree =
      this.sinon.stub(shrinkingUI, '_getTiltingDegree').returns('10deg');

    current.element.addEventListener.getCall(0).args[1]();
    assert.isTrue(
      current.element.removeEventListener.calledWith(
        'transitionend',
        current.element.addEventListener.getCall(0).args[1]
      )
    );
    assert.isTrue(current.element.addEventListener.calledTwice);
    assert.isTrue(
      current.element.addEventListener.alwaysCalledWith('transitionend')
    );
    assert.isTrue(
      stubUpdateTiltTransition.calledWith(
        current.element.addEventListener.getCall(1).args[1]
      )
    );
    assert.equal(
      current.element.style.transition,
      'transform 0.3s ease'
    );
    assert.equal(
      current.element.style.transform,
      'rotateX(10deg) '
    );

    // restoration for bounceBack scope
    stubGetTiltingDegree.restore(); // for gjslint's happy

    // call the bounceBackEnd
    current.element.addEventListener.getCall(1).args[1]();
    assert.isTrue(
      current.element.removeEventListener.calledWith(
        'transitionend',
        current.element.addEventListener.getCall(1).args[1]
      )
    );
    assert.equal(
      current.element.style.transition,
      'transform 0.5s ease'
    );

    assert.isTrue(spyCb.called);

    shrinkingUI.current = oldCurrent;
  });

  test('Shrinking UI ShrinkingTilt, with non-null cover', function() {
    var oldCurrent = shrinkingUI.current;

    var current = {
      cover: 'something',
      element: {
        addEventListener: this.sinon.spy(),
        insertBefore: this.sinon.spy(),
        style: {}
      },
      wrapper: {
        classList: {
          add: this.sinon.spy()
        }
      }
    };
    shrinkingUI.current = current;

    var stubSlidingCover =
      this.sinon.stub(shrinkingUI, '_slidingCover');
    var stubGetOverTiltingDegree =
      this.sinon.stub(shrinkingUI, '_getOverTiltingDegree').returns('11deg');
    var stubUpdateTiltTransition =
      this.sinon.stub(shrinkingUI, '_updateTiltTransition');

    shrinkingUI._shrinkingTilt();

    assert.isFalse(stubSlidingCover.called);
    assert.isFalse(current.element.insertBefore.called);

    assert.isTrue(
      current.wrapper.classList.add.calledWith('shrinking-wrapper')
    );
    assert.equal(current.element.style.transition, 'transform 0.5s ease');
    assert.isTrue(
      current.element.addEventListener.calledWith('transitionend')
    );
    assert.isTrue(
      stubUpdateTiltTransition.calledWith(
        current.element.addEventListener.getCall(0).args[1]
      )
    );
    assert.equal(
      current.element.style.transformOrigin,
      '50% 100% 0'
    );
    assert.equal(
      current.element.style.transform,
      'rotateX(11deg)'
    );

    // restoration for "outer" scope
    stubGetOverTiltingDegree.restore(); // for gjslint's happy

    shrinkingUI.current = oldCurrent;
  });

  test('Shrinking UI ShrinkingTiltBack, instant = true', function(done) {
    shrinkingUI.current.element = document.createElement('div');
    var style = {
      transition: 'x',
      transform: 'xx'
    };
    shrinkingUI.current.element.style = style;
    shrinkingUI._shrinkingTiltBack(true, () => {
      assert.equal(shrinkingUI.current.element.style.transition, '');
      assert.equal(shrinkingUI.current.element.style.transform,
        'rotateX(0deg)');
      done();
    });
  });

  test('Shrinking UI ShrinkingTiltBack, instant = false', function() {
    var oldAppFrame = shrinkingUI.current.element;
    var frame = {
      addEventListener: this.sinon.spy(),
      removeEventListener: this.sinon.spy(),
      style: {
        transition: 'x',
        transform: 'xx'
      }
    };
    shrinkingUI.current.element = frame;

    var spyCb = this.sinon.spy();
    var stubUpdateTiltTransition =
      this.sinon.stub(shrinkingUI, '_updateTiltTransition');

    shrinkingUI._shrinkingTiltBack(false, spyCb);

    assert.equal(frame.style.transition, 'transform 0.3s ease');
    assert.equal(frame.style.transform, 'rotateX(0.0deg)');

    assert.isTrue(frame.addEventListener.calledWith('transitionend'));
    assert.isTrue(
      stubUpdateTiltTransition.calledWith(
        frame.addEventListener.getCall(0).args[1]
      )
    );

    // call the event listener
    frame.addEventListener.getCall(0).args[1]();

    assert.isTrue(
      frame.removeEventListener.calledWith(
        'transitionend',
        frame.addEventListener.getCall(0).args[1]
      )
    );

    assert.isTrue(spyCb.called);

    shrinkingUI.current.element = oldAppFrame;
  });

  test('Shrinking UI HandleSendingStart', function() {
    var evt = {
      stopImmediatePropagation: this.sinon.spy()
    };

    var stubDebug = this.sinon.stub(shrinkingUI, 'debug');
    var stubState = this.sinon.stub(shrinkingUI, '_state').returns(true);
    var stubUpdateSlideTransition =
      this.sinon.stub(shrinkingUI, '_updateSlideTransition');

    var oldTip = shrinkingUI.current.tip;
    var tip = {
      classList: {
          add: this.sinon.spy()
      },
      addEventListener: this.sinon.spy(),
      removeEventListener: this.sinon.spy()
    };
    shrinkingUI.current.tip = tip;

    var ret = shrinkingUI._handleSendingStart(evt);
    assert.isFalse(ret);

    assert.isTrue(evt.stopImmediatePropagation.called);
    assert.isTrue(tip.classList.add.calledWith('hide'));
    assert.isTrue(tip.addEventListener.calledWith('transitionend'));
    assert.isTrue(
      stubUpdateSlideTransition.calledWith(
        tip.addEventListener.getCall(0).args[1]
      )
    );

    // call tsEnd
    tip.addEventListener.getCall(0).args[1]();
    assert.isTrue(
      tip.removeEventListener.calledWith(
        'transitionend',
        tip.addEventListener.getCall(0).args[1]
      )
    );

    shrinkingUI.current.tip = oldTip;

    // for gjslint's happy
    stubDebug.restore();
    stubState.restore();
  });

  test('Shrinking UI HandleSendingSlide: full; initY/prevY = undefined, ' +
       'suspended = false, slideY < threshold', function() {
    var evt = {
      touches: [
        {
          pageY: 10
        }
      ]
    };

    var oldAppFrame = shrinkingUI.current.element;
    shrinkingUI.current.element = {
      parentElement: {
        clientHeight: 14
      }
    };

    var oldState = shrinkingUI.state;
    shrinkingUI.state = {
      touch: {
        initY: undefined,
        prevY: undefined
      },
      toward: 'Somewhere',
      suspended: false,
      delaySlidingID: 'SomeInvalidStringID'
    };

    var oldThreshold = shrinkingUI.THRESHOLD;
    shrinkingUI.THRESHOLD = 5;

    var stubSetTimeout = this.sinon.stub(window, 'setTimeout').returns(1234);
    var stubSendingSlideTo = this.sinon.stub(shrinkingUI, '_sendingSlideTo');

    // state.initY <- 4
    // state.prevY <- 4
    // slideY <- 4
    shrinkingUI._handleSendingSlide(evt);
    assert.equal(shrinkingUI.state.touch.initY, 4);
    assert.equal(shrinkingUI.state.touch.prevY, 4);
    assert.equal(shrinkingUI.state.toward, 'BOTTOM');

    assert.equal(shrinkingUI.state.delaySlidingID, 1234);
    assert.isTrue(shrinkingUI.state.suspended);

    assert.isTrue(stubSendingSlideTo.calledWith(4));

    assert.isFalse(shrinkingUI.state.overThreshold);

    // call handleDelaySliding
    stubSetTimeout.getCall(0).args[0]();
    assert.isTrue(stubSendingSlideTo.calledTwice);
    assert.isTrue(stubSendingSlideTo.alwaysCalledWith(4));
    assert.isFalse(shrinkingUI.state.suspended);

    // restore
    shrinkingUI.current.element = oldAppFrame;
    shrinkingUI.state = oldState;
    shrinkingUI.THRESHOLD = oldThreshold;
  });

  test('Shrinking UI HandleSendingSlide: defined initY/prevY, ' +
       'suspended = false, prevY < slideY, slideY > threshold', function() {
    var evt = {
      touches: [
        {
          pageY: 10
        }
      ]
    };

    var oldAppFrame = shrinkingUI.current.element;
    shrinkingUI.current.element = {
      parentElement: {
        clientHeight: 16
      }
    };

    var oldState = shrinkingUI.state;
    shrinkingUI.state = {
      touch: {
        initY: 5,
        prevY: 5
      },
      toward: 'Somewhere',
      suspended: false,
      delaySlidingID: 'SomeInvalidStringID'
    };

    var oldThreshold = shrinkingUI.THRESHOLD;
    shrinkingUI.THRESHOLD = 3;

    var stubSetTimeout = this.sinon.stub(window, 'setTimeout');
    var stubSendingSlideTo = this.sinon.stub(shrinkingUI, '_sendingSlideTo');

    // slideY <- 6
    shrinkingUI._handleSendingSlide(evt);
    assert.equal(shrinkingUI.state.touch.initY, 5);
    assert.equal(shrinkingUI.state.toward, 'TOP');

    assert.isTrue(shrinkingUI.state.overThreshold);

    // call handleDelaySliding
    stubSetTimeout.getCall(0).args[0]();

    // restore
    shrinkingUI.current.element = oldAppFrame;
    shrinkingUI.state = oldState;
    shrinkingUI.THRESHOLD = oldThreshold;

    // for gjslint's happy
    stubSendingSlideTo.restore();
  });

  test('Shrinking UI HandleSendingSlide: ' +
       'defined initY/prevY, suspended = true', function() {
    var evt = {
      touches: [
        {
          pageY: 10
        }
      ]
    };

    var oldAppFrame = shrinkingUI.current.element;
    shrinkingUI.current.element = {
      parentElement: {
        clientHeight: 14
      }
    };

    var oldState = shrinkingUI.state;
    shrinkingUI.state = {
      touch: {},
      toward: 'Somewhere',
      suspended: true,
      overThreshold: 'Blah'
    };

    var stubSetTimeout = this.sinon.stub(window, 'setTimeout');
    var stubSendingSlideTo = this.sinon.stub(shrinkingUI, '_sendingSlideTo');

    // slideY <- 6
    shrinkingUI._handleSendingSlide(evt);
    assert.equal(shrinkingUI.state.touch.initY, 4);
    assert.equal(shrinkingUI.state.touch.prevY, 4);
    assert.equal(shrinkingUI.state.toward, 'BOTTOM');

    assert.isFalse(stubSetTimeout.called);
    assert.isFalse(stubSendingSlideTo.called);
    assert.equal(shrinkingUI.state.overThreshold, 'Blah');

    shrinkingUI.current.element = oldAppFrame;
    shrinkingUI.state = oldState;
  });

  test('Shrinking UI HandleSendingOut, full, ' +
       'overThreshold = true and toward = "TOP"', function() {
    var stubDebug = this.sinon.stub(shrinkingUI, 'debug');
    var stubState = this.sinon.stub(shrinkingUI, '_state').returns(true);

    var oldState = shrinkingUI.state;
    shrinkingUI.state = {
      overThreshold: true,
      delaySlidingID: 2345,
      toward: 'TOP',
    };

    var stubClearTimeout = this.sinon.stub(window, 'clearTimeout');
    var stubSendingSlideTo = this.sinon.stub(shrinkingUI, '_sendingSlideTo');
    var stubDispatchEvent =
      this.sinon.stub(window, 'dispatchEvent', function(evt, evt2){
        assert.equal(evt.type, 'shrinking-sent');
      });
    var stubDisableSlidingCover =
      this.sinon.stub(shrinkingUI, '_disableSlidingCover');

    shrinkingUI._handleSendingOut(null);
    assert.isTrue(stubDebug.called);
    assert.isTrue(stubState.called);
    assert.isTrue(stubClearTimeout.calledWith(2345));

    assert.isTrue(stubSendingSlideTo.calledWith('TOP'));

    stubSendingSlideTo.getCall(0).args[1]();

    assert.isTrue(stubDisableSlidingCover.called);
    assert.isTrue(stubDispatchEvent.called);

    // restore
    shrinkingUI.state = oldState;
  });

  var handleSendingOutTestFactory = function(state_) {
    return function() {
      var stubDebug = this.sinon.stub(shrinkingUI, 'debug');
      var stubState = this.sinon.stub(shrinkingUI, '_state').returns(true);

      var oldState = shrinkingUI.state;
      shrinkingUI.state = state_;

      var stubClearTimeout = this.sinon.stub(window, 'clearTimeout');
      var stubSendingSlideTo = this.sinon.stub(shrinkingUI, '_sendingSlideTo');
      var stubSetTip = this.sinon.stub(shrinkingUI, '_setTip');

      shrinkingUI._handleSendingOut(null);
      assert.isTrue(stubSendingSlideTo.calledWith('BOTTOM'));

      stubSendingSlideTo.getCall(0).args[1]();

      assert.isFalse(shrinkingUI.state.suspended);
      assert.isTrue(stubSetTip.called);

      // restore
      shrinkingUI.state = oldState;

      // for gjslint's happy
      stubDebug.restore();
      stubState.restore();
      stubClearTimeout.restore();
    };
  };

  test('Shrinking UI HandleSendingOut, overThreshold = false',
    handleSendingOutTestFactory({
      overThreshold: false,
      delaySlidingID: 2345,
      toward: 'TOP',
      suspended: true
    })
  );

  test('Shrinking UI HandleSendingOut, ' +
       'overThreshold = true and toward != "TOP"',
    handleSendingOutTestFactory({
      overThreshold: true,
      delaySlidingID: 2345,
      toward: 'NOT_TOP',
      suspended: true
    })
  );

  test('Shrinking UI CleanEffects', function() {
    var stubDebug = this.sinon.stub(shrinkingUI, 'debug');
    var stubState = this.sinon.stub(shrinkingUI, '_state').returns(true);
    var stubSetState = this.sinon.stub(shrinkingUI, '_setState');
    var stubUpdateTiltTransition =
      this.sinon.stub(shrinkingUI, '_updateTiltTransition');
    var stubUpdateSlideTransition =
      this.sinon.stub(shrinkingUI, '_updateSlideTransition');
    var spySlidingCoverRemove = this.sinon.spy();
    var stubDisableSlidingCover =
      this.sinon.stub(shrinkingUI, '_disableSlidingCover').returns(
        {remove: spySlidingCoverRemove}
      );

    var styleTemp = {
      transition: 'blah',
      transform: 'blah2',
      transformOrigin: 'blah3'
    };

    var classListTemp = {
      remove: this.sinon.spy()
    };

    var oldCurrent = shrinkingUI.current;
    shrinkingUI.current = {
      element: {
        style: styleTemp
      },
      wrapper: {
        classList: classListTemp
      },
      cover: 'something'
    };

    shrinkingUI._cleanEffects();
    assert.isTrue(stubDebug.called);
    assert.isTrue(stubState.called);
    assert.equal(styleTemp.transition, '');
    assert.equal(styleTemp.transform, '');
    assert.equal(styleTemp.transformOrigin, '50% 50% 0');
    assert.isTrue(stubSetState.calledWith(false));
    assert.isTrue(stubUpdateTiltTransition.calledWith(null));
    assert.isTrue(stubUpdateSlideTransition.calledWith(null));
    assert.isTrue(classListTemp.remove.calledWith('shrinking-wrapper'));
    assert.isTrue(spySlidingCoverRemove.called);

    assert.isNull(shrinkingUI.current.wrapper);
    assert.isNull(shrinkingUI.current.element);
    assert.isNull(shrinkingUI.current.cover);

    shrinkingUI.current = oldCurrent;
    stubDebug.restore();
    stubState.restore();
    stubSetState.restore();
    stubUpdateTiltTransition.restore();
    stubUpdateSlideTransition.restore();
    stubDisableSlidingCover.restore();
  });

  test('Shrinking UI GetTiltingDegree', function() {
    var stubFetchCurrentOrientation =
      this.sinon.stub(window.OrientationManager, 'fetchCurrentOrientation')
      .returns('landscape-primary');

    var oldConfigs = shrinkingUI.configs;
    shrinkingUI.configs = {
      degreeLandscape: 13,
      degreePortrait: 14
    };

    assert.equal(shrinkingUI._getTiltingDegree(), 13);
    stubFetchCurrentOrientation.restore();

    stubFetchCurrentOrientation =
      this.sinon.stub(window.OrientationManager, 'fetchCurrentOrientation')
      .returns('portrait-primary');

    assert.equal(shrinkingUI._getTiltingDegree(), 14);
    stubFetchCurrentOrientation.restore();

    shrinkingUI.configs = oldConfigs;
  });

  test('Shrinking UI GetOverTiltingDegree', function() {
    var stubFetchCurrentOrientation =
      this.sinon.stub(window.OrientationManager, 'fetchCurrentOrientation')
      .returns('landscape-primary');

    var oldConfigs = shrinkingUI.configs;
    shrinkingUI.configs = {
      overDegreeLandscape: 15,
      overDegreePortrait: 16
    };

    assert.equal(shrinkingUI._getOverTiltingDegree(), 15);
    stubFetchCurrentOrientation.restore();

    stubFetchCurrentOrientation =
      this.sinon.stub(window.OrientationManager, 'fetchCurrentOrientation')
      .returns('portrait-primary');

    assert.equal(shrinkingUI._getOverTiltingDegree(), 16);
    stubFetchCurrentOrientation.restore();

    shrinkingUI.configs = oldConfigs;
  });

});
