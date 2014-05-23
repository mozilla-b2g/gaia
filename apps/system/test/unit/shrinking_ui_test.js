/* global MocksHelper, ShrinkingUI */

'use strict';

requireApp('system/js/shrinking_ui.js');
requireApp('system/test/unit/mock_orientation_manager.js');

var mocksForShrinkingUI = new MocksHelper([
  'OrientationManager'
]).init();

suite('system/ShrinkingUI', function() {
  mocksForShrinkingUI.attachTestHelpers();

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
    var oldDebug = ShrinkingUI.DEBUG;

    var stubDump = this.sinon.stub(window, 'dump');

    ShrinkingUI.DEBUG = true;
    var msg = 'somemsg';
    var opt = {'opt': 'optopt'};
    ShrinkingUI.debug(msg, opt);

    assert.isTrue(stubDump.calledWith('[DEBUG] ShrinkingUI: somemsg' +
      JSON.stringify(opt)));

    stubDump.reset();

    ShrinkingUI.DEBUG = false;
    ShrinkingUI.debug(msg, opt);
    assert.isFalse(stubDump.called);

    ShrinkingUI.DEBUG = oldDebug;
  });

  var homeAndHoldhomeTestFactory = function(type_) {
    return function() {
      var evt = {
        type: type_,
        stopImmediatePropagation: this.sinon.spy()
      };
      var stubState = this.sinon.stub(ShrinkingUI, '_state').returns(true);
      ShrinkingUI.handleEvent(evt);

      assert.isTrue(stubState.called);
      assert.isTrue(evt.stopImmediatePropagation.called);

      stubState.reset();
      evt.stopImmediatePropagation.reset();

      stubState.returns(false);
      ShrinkingUI.handleEvent(evt);
      assert.isTrue(stubState.called);
      assert.isFalse(evt.stopImmediatePropagation.called);
    };
  };

  test('Handle "home" event', homeAndHoldhomeTestFactory('home'));
  test('Handle "holdhome" event', homeAndHoldhomeTestFactory('holdhome'));

  test('Handle "homescreenopened" event', function() {
    var evt = {
      type: 'homescreenopened',
    };
    var stubSwitchTo = this.sinon.stub(ShrinkingUI, '_switchTo');
    ShrinkingUI.handleEvent(evt);
    assert.isTrue(stubSwitchTo.calledWith(null));
  });

  test('Handle "appcreated" event', function() {
    var evt = {
      type: 'appcreated',
      detail: {
        manifestURL: 'app://www.fake.app/murl'
      }
    };
    var stubRegister = this.sinon.stub(ShrinkingUI, '_register');
    ShrinkingUI.handleEvent(evt);
    assert.isTrue(stubRegister.calledWith(evt.detail));

    // test the early return in handleEvent
    //   (for evt.detail & evnt.detail.manifestURL)
    // note that this is only tested in appcreated,
    // and not appterminated & appopen

    delete evt.detail.manifestURL;
    stubRegister.reset();
    ShrinkingUI.handleEvent(evt);
    assert.isFalse(stubRegister.called);

    delete evt.detail;
    stubRegister.reset();
    ShrinkingUI.handleEvent(evt);
    assert.isFalse(stubRegister.called);
  });

  test('Handle "appterminated" event', function() {
    var evt = {
      type: 'appterminated',
      detail: {
        manifestURL: 'app://www.fake.app/maniurl'
      }
    };

    var oldCurrentManifestURL = ShrinkingUI.current.manifestURL;
    ShrinkingUI.current.manifestURL = evt.detail.manifestURL;
    var stubCleanEffects = this.sinon.stub(ShrinkingUI, '_cleanEffects');
    var stubState = this.sinon.stub(ShrinkingUI, '_state').returns(true);
    var stubUnregister = this.sinon.stub(ShrinkingUI, '_unregister');
    ShrinkingUI.handleEvent(evt);

    assert.isTrue(stubState.called);
    assert.isTrue(stubCleanEffects.called);
    assert.isTrue(stubUnregister.calledWith(evt.detail.manifestURL));

    // test _state() returns false

    stubState.reset();
    stubCleanEffects.reset();
    stubUnregister.reset();

    stubState.returns(false);

    ShrinkingUI.handleEvent(evt);

    assert.isTrue(stubState.called);
    assert.isFalse(stubCleanEffects.called);
    assert.isTrue(stubUnregister.called);

    // test _state() returns true (would check manifestURL identity)

    stubState.reset();
    stubCleanEffects.reset();
    stubUnregister.reset();

    stubState.returns(true);
    ShrinkingUI.current.manifestURL = 'RandomString';
    ShrinkingUI.handleEvent(evt);

    assert.isTrue(stubState.called);
    assert.isFalse(stubCleanEffects.called);
    assert.isTrue(stubUnregister.called);

    // restore everything

    ShrinkingUI.current.manifestURL = oldCurrentManifestURL;
  });

  test('Handle "appopen" event', function() {
    var evt = {
      type: 'appopen',
      detail: {
        manifestURL: 'app://www.fake.app/mfurl'
      }
    };
    var stubSwitchTo = this.sinon.stub(ShrinkingUI, '_switchTo');
    ShrinkingUI.handleEvent(evt);
    assert.isTrue(stubSwitchTo.calledWith(evt.detail.manifestURL));
  });

  test('Handle "appopen" event', function() {
    var evt = {
      type: 'appopen',
      detail: {
        manifestURL: 'app://www.fake.app/mfsturl'
      }
    };
    var stubSwitchTo = this.sinon.stub(ShrinkingUI, '_switchTo');
    ShrinkingUI.handleEvent(evt);
    assert.isTrue(stubSwitchTo.calledWith(evt.detail.manifestURL));
  });

  test('Handle "shrinking-start" event', function() {
    var evt = {
      type: 'shrinking-start'
    };
    var stubSetup = this.sinon.stub(ShrinkingUI, '_setup');
    var stubStart = this.sinon.stub(ShrinkingUI, 'start');
    ShrinkingUI.handleEvent(evt);
    assert.isTrue(stubSetup.called);
    assert.isTrue(stubStart.called);
  });

  test('Handle "shrinking-stop" event', function() {
    var evt = {
      type: 'shrinking-stop'
    };
    var stubStop = this.sinon.stub(ShrinkingUI, 'stop');
    ShrinkingUI.handleEvent(evt);
    assert.isTrue(stubStop.called);
  });

  test('Handle "shrinking-receiving" event', function() {
    var evt = {
      type: 'shrinking-receiving'
    };
    var stubSetup =
      this.sinon.stub(ShrinkingUI, '_setup');
    var stubReceivingEffects =
      this.sinon.stub(ShrinkingUI, '_receivingEffects');
    ShrinkingUI.handleEvent(evt);
    assert.isTrue(stubSetup.called);
    assert.isTrue(stubReceivingEffects.called);
  });

  test('Handle "shrinking-rejected" event', function() {
    var evt = {
      type: 'shrinking-rejected'
    };
    var stubRejected = this.sinon.stub(ShrinkingUI, '_rejected');
    ShrinkingUI.handleEvent(evt);
    assert.isTrue(stubRejected.called);
  });

  test('Handle "check-p2p-registration-for-active-app" event', function() {
    var evt = {
      type: 'check-p2p-registration-for-active-app',
      detail: {
        checkP2PRegistration: this.sinon.spy()
      }
    };
    var oldCurrentAppURL = ShrinkingUI.currentAppURL;
    ShrinkingUI.currentAppURL = 'RandomString';
    ShrinkingUI.handleEvent(evt);
    assert.isTrue(evt.detail.checkP2PRegistration.calledWith('RandomString'));
    ShrinkingUI.currentAppURL = oldCurrentAppURL;
  });

  test('Handle "dispatch-p2p-user-response-on-active-app" event', function() {
    var evt = {
      type: 'dispatch-p2p-user-response-on-active-app',
      detail: {
        dispatchP2PUserResponse: this.sinon.spy()
      }
    };
    var oldCurrentAppURL = ShrinkingUI.currentAppURL;
    ShrinkingUI.currentAppURL = 'RandomStr2';
    ShrinkingUI.handleEvent(evt);
    assert.isTrue(evt.detail.dispatchP2PUserResponse.calledWith('RandomStr2'));
    ShrinkingUI.currentAppURL = oldCurrentAppURL;
  });

  test('Register and unregister app at ShrinkingUI', function() {
    var oldApps = ShrinkingUI.apps;
    var testApp = {
      manifestURL: 'app://www.fake.app/testmaniurl'
    };
    ShrinkingUI._register(testApp);
    assert.equal(ShrinkingUI.apps[testApp.manifestURL], testApp);

    ShrinkingUI._unregister(testApp.manifestURL);
    assert.isFalse(testApp.manifestURL in ShrinkingUI.apps);

    ShrinkingUI.apps = oldApps;
  });

  test('ShrinkingUI SwitchTo', function() {
    var oldURL = ShrinkingUI.currentAppURL;
    ShrinkingUI._switchTo('someOtherTestURL');
    assert.equal(ShrinkingUI.currentAppURL, 'someOtherTestURL');

    ShrinkingUI.currentAppURL = oldURL;
  });

  test('Shrinking UI Setup', function() {
    var oldURL = ShrinkingUI.currentAppURL;
    var oldApps = ShrinkingUI.apps;
    var testApp = {
      frame: {
        parentNode: 'dummy1'
      }
    };
    ShrinkingUI.currentAppURL = 'yetAnotherTestURL';
    ShrinkingUI.apps = {
      'yetAnotherTestURL': testApp
    };

    ShrinkingUI._setup();
    assert.equal(ShrinkingUI.current.appFrame, testApp.frame);
    assert.equal(ShrinkingUI.current.wrapper, testApp.frame.parentNode);

    ShrinkingUI.currentAppURL = oldURL;
    ShrinkingUI.apps = oldApps;
  });

  test('Shrinking UI Start', function(done) {
    // test for state = true (not going to start actually)
    var stubState = this.sinon.stub(ShrinkingUI, '_state').returns(true);
    var stubSetTip = this.sinon.stub(ShrinkingUI, '_setTip');
    var stubSetState = this.sinon.stub(ShrinkingUI, '_setState');
    ShrinkingUI.start();
    assert.isTrue(stubState.called);
    assert.isFalse(stubSetTip.called);
    assert.isFalse(stubSetState.called);

    stubState.reset();
    stubSetTip.reset();
    stubSetState.reset();

    // actual "start"

    var oldURL = ShrinkingUI.currentAppURL;
    var oldApps = ShrinkingUI.apps;
    var testApp = {
      setVisible: this.sinon.spy()
    };
    ShrinkingUI.apps = {
      'yetAnotherTestURL': testApp
    };
    ShrinkingUI.currentAppURL = 'yetAnotherTestURL';

    stubState.returns(false);
    var stubShrinkingTilt =
      this.sinon.stub(ShrinkingUI, '_shrinkingTilt', function(cb){
        cb();

        assert.isTrue(stubState.called);
        assert.isTrue(stubSetState.calledWith(true));
        assert.isTrue(stubShrinkingTilt.called);
        assert.isTrue(testApp.setVisible.calledWith(false, true));

        ShrinkingUI.currentAppURL = oldURL;
        ShrinkingUI.apps = oldApps;

        done();
      });

    ShrinkingUI.start();
  });

  test('Shrinking UI SetTip', function() {
    var tempTip = {
      classList: {
        remove: this.sinon.spy()
      }
    };
    var stubSlidingTip =
      this.sinon.stub(ShrinkingUI, '_slidingTip').returns(tempTip);

    // first test: with ShrinkingUI.current.tip being unavailable

    var oldCurrent = ShrinkingUI.current;
    ShrinkingUI.current = {
      tip: null,
      wrapper: {
        appendChild: this.sinon.spy()
      }
    };

    ShrinkingUI._setTip();

    assert.isTrue(stubSlidingTip.called);
    assert.equal(ShrinkingUI.current.tip, tempTip);
    assert.isTrue(ShrinkingUI.current.wrapper.appendChild.calledWith(tempTip));
    assert.isTrue(tempTip.classList.remove.calledWith('hide'));

    // second test: with ShrinkingUIcurrent.tip being available

    ShrinkingUI.current.tip = {
      classList: {
        remove: this.sinon.spy()
      }
    };

    stubSlidingTip.reset();
    ShrinkingUI.current.wrapper.appendChild.reset();
    ShrinkingUI._setTip();

    assert.isTrue(stubSlidingTip.called);
    assert.isFalse(ShrinkingUI.current.wrapper.appendChild.called);
    assert.isTrue(ShrinkingUI.current.tip.classList.remove.calledWith('hide'));

    ShrinkingUI.current = oldCurrent;
  });

  test('Shrinking UI Stop', function(done) {
    // test for state = false (not going to start actually)
    var stubState = this.sinon.stub(ShrinkingUI, '_state').returns(false);
    var stubShrinkingTiltBack =
      this.sinon.stub(ShrinkingUI, '_shrinkingTiltBack');
    ShrinkingUI.stop();
    assert.isTrue(stubState.called);
    assert.isFalse(stubShrinkingTiltBack.called);

    stubState.reset();
    stubShrinkingTiltBack.restore();

    // actual "stop"

    var oldURL = ShrinkingUI.currentAppURL;
    var oldApps = ShrinkingUI.apps;
    var oldTip = ShrinkingUI.current.tip;
    var testApp = {
      setVisible: this.sinon.spy()
    };
    var fakeTip = {
      remove: this.sinon.spy()
    };
    ShrinkingUI.apps = {
      'yetAnotherTestURLForStop': testApp
    };
    ShrinkingUI.currentAppURL = 'yetAnotherTestURLForStop';
    ShrinkingUI.current.tip = fakeTip;

    stubState.returns(true);
    var stubCleanEffects = this.sinon.stub(ShrinkingUI, '_cleanEffects');

    stubShrinkingTiltBack =
      this.sinon.stub(ShrinkingUI, '_shrinkingTiltBack', function(instant, cb){
        assert.isTrue(instant);

        cb();

        assert.isTrue(stubState.called);
        assert.isTrue(fakeTip.remove.called);
        assert.isNull(this.current.tip);
        assert.isTrue(testApp.setVisible.calledWith(true));

        stubCleanEffects.restore(); // this one is for gjslinter happy

        ShrinkingUI.currentAppURL = oldURL;
        ShrinkingUI.apps = oldApps;
        ShrinkingUI.current.tip = oldTip;

        done();
      });

    ShrinkingUI.stop();
  });

  test('Shrinking UI Rejected', function(done) {
    var stubEnableSlidingCover =
      this.sinon.stub(ShrinkingUI, '_enableSlidingCover');
    var stubSetTip = this.sinon.stub(ShrinkingUI, '_setTip');
    var stubStop = this.sinon.stub(ShrinkingUI, 'stop');
    var stubSendSlideTo =
      this.sinon.stub(ShrinkingUI, '_sendingSlideTo', function(y, cb){
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

    ShrinkingUI._rejected();
  });

  test('Shrinking UI State', function() {
    var oldAppFrame = ShrinkingUI.current.appFrame;

    // first test: setup or not
    ShrinkingUI.current.appFrame = null;

    assert.isFalse(ShrinkingUI._state());

    // second tests: shrinkingState
    ShrinkingUI.current.appFrame = {
      dataset: {
        shrinkingState: 'false'
      }
    };

    assert.isFalse(ShrinkingUI._state());

    ShrinkingUI.current.appFrame.dataset.shrinkingState = 'true';
    assert.isTrue(ShrinkingUI._state());

    ShrinkingUI.current.appFrame = oldAppFrame;
  });

  test('Shrinking UI SetState', function() {
    var oldAppFrame = ShrinkingUI.current.appFrame;

    var stubSetAttribute = this.sinon.stub();
    ShrinkingUI.current.appFrame = {
      setAttribute: stubSetAttribute
    };
    var stubDebug = this.sinon.stub(ShrinkingUI, 'debug');

    ShrinkingUI._setState(123);

    assert.isTrue(stubSetAttribute.calledWith('data-shrinking-state', '123'));
    assert.isTrue(stubDebug.called);

    ShrinkingUI.current.appFrame = oldAppFrame;
  });

  test('Shrinking UI Update Slide Transition', function() {
    var oldTip = ShrinkingUI.current.tip;
    var oldSlideTransitionCb = ShrinkingUI.state.slideTransitionCb;

    // test valid slideTransitionCb

    var tip = {
      removeEventListener: this.sinon.spy()
    };
    ShrinkingUI.current.tip = tip;


    ShrinkingUI.state.slideTransitionCb = 'STCB';

    ShrinkingUI._updateSlideTransition('STCB2');
    assert.isTrue(tip.removeEventListener.calledWith('transitionend', 'STCB'));
    assert.equal(ShrinkingUI.state.slideTransitionCb, 'STCB2');

    tip.removeEventListener.reset();

    // test null slideTransitionCb

    ShrinkingUI.state.slideTransitionCb = null;

    ShrinkingUI._updateSlideTransition('STCB3');
    assert.isFalse(tip.removeEventListener.called);
    assert.equal(ShrinkingUI.state.slideTransitionCb, 'STCB3');

    // test null tip

    ShrinkingUI.current.tip = null;

    ShrinkingUI._updateSlideTransition('STCB4');
    assert.equal(ShrinkingUI.state.slideTransitionCb, 'STCB4');

    // restore

    ShrinkingUI.current.tip = oldTip;
    ShrinkingUI.state.slideTransitionCb = oldSlideTransitionCb;
  });

  test('Shrinking UI Update Tilt Transition', function() {
    var oldAppFrame = ShrinkingUI.current.appFrame;
    var oldTiltTransitionCb = ShrinkingUI.state.tiltTransitionCb;

    // test valid slideTransitionCb

    var appFrame = {
      removeEventListener: this.sinon.spy()
    };

    ShrinkingUI.current.appFrame = appFrame;

    ShrinkingUI.state.tiltTransitionCb = 'TTCB';

    ShrinkingUI._updateTiltTransition('TTCB2');
    assert.isTrue(
      appFrame.removeEventListener.calledWith('transitionend', 'TTCB')
    );
    assert.equal(ShrinkingUI.state.tiltTransitionCb, 'TTCB2');

    appFrame.removeEventListener.reset();

    // test null slideTransitionCb

    ShrinkingUI.state.tiltTransitionCb = null;

    ShrinkingUI._updateTiltTransition('TTCB3');
    assert.isFalse(appFrame.removeEventListener.called);
    assert.equal(ShrinkingUI.state.tiltTransitionCb, 'TTCB3');

    // test null appFrame

    ShrinkingUI.current.appFrame = null;

    ShrinkingUI._updateTiltTransition('TTCB4');
    assert.equal(ShrinkingUI.state.tiltTransitionCb, 'TTCB4');

    // restore

    ShrinkingUI.current.appFrame = oldAppFrame;
    ShrinkingUI.state.tiltTransitionCb = oldTiltTransitionCb;
  });

  test('Shrinking UI ReceivingEffects', function() {
    var oldStyle = ShrinkingUI.current.appFrame.style;

    var style = {
      opacity: 'x',
      transition: 'xx'
    };
    ShrinkingUI.current.appFrame.style = style;

    var stubShrinkingTilt = this.sinon.stub(ShrinkingUI, '_shrinkingTilt');
    var stubSendingSlideTo = this.sinon.stub(ShrinkingUI, '_sendingSlideTo');

    ShrinkingUI._receivingEffects();

    assert.equal(style.opacity, '0');
    assert.isTrue(stubShrinkingTilt.called);

    // call afterTilt
    stubShrinkingTilt.getCall(0).args[0]();

    assert.equal(style.transition, 'transform 0.05s ease');

    assert.isTrue(stubSendingSlideTo.called);
    assert.isTrue(stubSendingSlideTo.getCall(0).calledWith('TOP'));

    // call afterTop
    stubSendingSlideTo.getCall(0).args[1]();
    assert.equal(style.opacity, '');
    assert.equal(style.transition, 'transform 0.5s ease');

    assert.isTrue(stubSendingSlideTo.calledTwice);
    assert.isTrue(stubSendingSlideTo.getCall(1).calledWith('BOTTOM'));

    var stubShrinkingTiltBack =
      this.sinon.stub(ShrinkingUI, '_shrinkingTiltBack');
    var oldCleanEffects = ShrinkingUI._cleanEffects;
    ShrinkingUI._cleanEffects = 'dummyCE';

    // call doTiltBack
    stubSendingSlideTo.getCall(1).args[1]();
    assert.isTrue(stubShrinkingTiltBack.calledWith(false, 'dummyCE'));

    ShrinkingUI._cleanEffects = oldCleanEffects;
    ShrinkingUI.current.appFrame.style = oldStyle;
  });

  test('Shrinking UI SendingSlideTo, full, with specified Y', function() {
    var oldAppFrame = ShrinkingUI.current.appFrame;

    var spyAddEventListener = this.sinon.spy();
    var spyRemoveEventListener = this.sinon.spy();

    var stubGetTiltingDegree =
      this.sinon.stub(ShrinkingUI, '_getTiltingDegree').returns('5deg');

    var stubUpdateTiltTransition =
      this.sinon.stub(ShrinkingUI, '_updateTiltTransition');

    ShrinkingUI.current.appFrame = {
      addEventListener: spyAddEventListener,
      removeEventListener: spyRemoveEventListener,
      style: {
        transform: ''
      }
    };

    ShrinkingUI._sendingSlideTo(10, function(){
    });

    assert.equal(ShrinkingUI.current.appFrame.style.transform,
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
    ShrinkingUI.current.appFrame = oldAppFrame;
  });

  test('Shrinking UI SendingSlideTo, with Y = TOP', function() {
    var oldAppFrame = ShrinkingUI.current.appFrame;

    var stubGetTiltingDegree =
      this.sinon.stub(ShrinkingUI, '_getTiltingDegree').returns('6deg');

    var stubUpdateTiltTransition =
      this.sinon.stub(ShrinkingUI, '_updateTiltTransition');

    ShrinkingUI.current.appFrame = {
      addEventListener: function(){},
      style: {
        transform: ''
      },
      parentElement: {
        clientHeight: '40'
      }
    };

    ShrinkingUI._sendingSlideTo('TOP', function(){
    });

    assert.equal(
      ShrinkingUI.current.appFrame.style.transform,
      'rotateX(6deg) translateY(-40px)'
    );

    // for gjslint happy
    stubGetTiltingDegree.restore();
    stubUpdateTiltTransition.restore();

    ShrinkingUI.current.appFrame = oldAppFrame;
  });

  test('Shrinking UI SendingSlideTo, with Y = BOTTOM', function() {
    var oldAppFrame = ShrinkingUI.current.appFrame;

    var stubGetTiltingDegree =
      this.sinon.stub(ShrinkingUI, '_getTiltingDegree').returns('7deg');

    var stubUpdateTiltTransition =
      this.sinon.stub(ShrinkingUI, '_updateTiltTransition');

    ShrinkingUI.current.appFrame = {
      addEventListener: function(){},
      style: {
        transform: ''
      },
    };

    ShrinkingUI._sendingSlideTo('BOTTOM', function(){
    });

    assert.equal(
      ShrinkingUI.current.appFrame.style.transform,
      'rotateX(7deg) translateY(-0px)'
    );

    // for gjslint's happy
    stubGetTiltingDegree.restore();
    stubUpdateTiltTransition.restore();
    ShrinkingUI.current.appFrame = oldAppFrame;
  });

  test('Shrinking UI SendingSlideTo, with Y < 0', function() {
    var oldAppFrame = ShrinkingUI.current.appFrame;

    var stubGetTiltingDegree =
      this.sinon.stub(ShrinkingUI, '_getTiltingDegree').returns('8deg');

    var stubUpdateTiltTransition =
      this.sinon.stub(ShrinkingUI, '_updateTiltTransition');

    ShrinkingUI.current.appFrame = {
      addEventListener: function(){},
      style: {
        transform: ''
      },
    };

    ShrinkingUI._sendingSlideTo(-20, function(){
    });

    assert.equal(
      ShrinkingUI.current.appFrame.style.transform,
      'rotateX(8deg) translateY(-0px)'
    );

    // for gjslint's happy
    stubGetTiltingDegree.restore();
    stubUpdateTiltTransition.restore();

    ShrinkingUI.current.appFrame = oldAppFrame;
  });

  test('Shrinking UI SlidingCover', function() {
    var stubHandleSendingStart =
      this.sinon.stub(ShrinkingUI, '_handleSendingStart');
    var stubHandleSendingSlide =
      this.sinon.stub(ShrinkingUI, '_handleSendingSlide');
    var stubHandleSendingOut =
      this.sinon.stub(ShrinkingUI, '_handleSendingOut');

    var cover = ShrinkingUI._slidingCover();

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

    var tip = ShrinkingUI._slidingTip();
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
    var oldCover = ShrinkingUI.current.cover;

    var stubHandleSendingStart =
      this.sinon.stub(ShrinkingUI, '_handleSendingStart');
    var stubHandleSendingSlide =
      this.sinon.stub(ShrinkingUI, '_handleSendingSlide');
    var stubHandleSendingOut =
      this.sinon.stub(ShrinkingUI, '_handleSendingOut');

    ShrinkingUI.current.cover = document.createElement('div');

    var cover = ShrinkingUI._enableSlidingCover();

    cover.dispatchEvent(createTouchEvent('touchstart'));
    cover.dispatchEvent(createTouchEvent('touchmove'));
    cover.dispatchEvent(createTouchEvent('touchend'));

    assert.isTrue(stubHandleSendingStart.called);
    assert.isTrue(stubHandleSendingSlide.called);
    assert.isTrue(stubHandleSendingOut.called);

    ShrinkingUI.current.cover = oldCover;
  });

  test('Shrinking UI DisableSlidingCover', function() {
    var oldCover = ShrinkingUI.current.cover;

    var stubHandleSendingStart =
      this.sinon.stub(ShrinkingUI, '_handleSendingStart');
    var stubHandleSendingSlide =
      this.sinon.stub(ShrinkingUI, '_handleSendingSlide');
    var stubHandleSendingOut =
      this.sinon.stub(ShrinkingUI, '_handleSendingOut');

    ShrinkingUI.current.cover = document.createElement('div');

    ShrinkingUI.current.cover.addEventListener(
      'touchstart',
      ShrinkingUI._handleSendingStart
    );
    ShrinkingUI.current.cover.addEventListener(
      'touchmove',
      ShrinkingUI._handleSendingSlide
    );
    ShrinkingUI.current.cover.addEventListener(
      'touchend',
      ShrinkingUI._handleSendingOut
    );

    var cover = ShrinkingUI._disableSlidingCover();

    cover.dispatchEvent(createTouchEvent('touchstart'));
    cover.dispatchEvent(createTouchEvent('touchmove'));
    cover.dispatchEvent(createTouchEvent('touchend'));

    assert.isFalse(stubHandleSendingStart.called);
    assert.isFalse(stubHandleSendingSlide.called);
    assert.isFalse(stubHandleSendingOut.called);

    ShrinkingUI.current.cover = oldCover;
  });

  test('Shrinking UI ShrinkingTilt, full, with null cover', function() {
    var oldCurrent = ShrinkingUI.current;

    var current = {
      cover: null,
      appFrame: {
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
    ShrinkingUI.current = current;

    var stubSlidingCover =
      this.sinon.stub(ShrinkingUI, '_slidingCover').returns('cover');
    var stubGetOverTiltingDegree =
      this.sinon.stub(ShrinkingUI, '_getOverTiltingDegree').returns('9deg');
    var stubUpdateTiltTransition =
      this.sinon.stub(ShrinkingUI, '_updateTiltTransition');

    var spyCb = this.sinon.spy();

    ShrinkingUI._shrinkingTilt(spyCb);
    assert.isTrue(stubSlidingCover.called);
    assert.isTrue(
      current.appFrame.insertBefore.calledWith('cover',
      'someChild')
    );
    assert.isTrue(current.wrapper.classList.add.calledWith(
      'shrinking-wrapper'));
    assert.equal(current.appFrame.style.transition,
      'transform 0.5s ease');
    assert.isTrue(current.appFrame.addEventListener
      .calledWith('transitionend')
    );
    assert.isTrue(stubUpdateTiltTransition.
      calledWith(current.appFrame
        .addEventListener.getCall(0).args[1]
      )
    );
    assert.equal(current.appFrame.style.transformOrigin,
      '50% 100% 0');
    assert.equal(current.appFrame.style.transform, 'rotateX(9deg)');

    // restoration for "outer" scope
    stubGetOverTiltingDegree.restore(); // for gjslint's happy
    stubUpdateTiltTransition.reset();

    // call the bounceBack
    var stubGetTiltingDegree =
      this.sinon.stub(ShrinkingUI, '_getTiltingDegree').returns('10deg');

    current.appFrame.addEventListener.getCall(0).args[1]();
    assert.isTrue(
      current.appFrame.removeEventListener.calledWith(
        'transitionend',
        current.appFrame.addEventListener.getCall(0).args[1]
      )
    );
    assert.isTrue(current.appFrame.addEventListener.calledTwice);
    assert.isTrue(
      current.appFrame.addEventListener.alwaysCalledWith('transitionend')
    );
    assert.isTrue(
      stubUpdateTiltTransition.calledWith(
        current.appFrame.addEventListener.getCall(1).args[1]
      )
    );
    assert.equal(
      current.appFrame.style.transition,
      'transform 0.3s ease'
    );
    assert.equal(
      current.appFrame.style.transform,
      'rotateX(10deg) '
    );

    // restoration for bounceBack scope
    stubGetTiltingDegree.restore(); // for gjslint's happy

    // call the bounceBackEnd
    current.appFrame.addEventListener.getCall(1).args[1]();
    assert.isTrue(
      current.appFrame.removeEventListener.calledWith(
        'transitionend',
        current.appFrame.addEventListener.getCall(1).args[1]
      )
    );
    assert.equal(
      current.appFrame.style.transition,
      'transform 0.5s ease'
    );

    assert.isTrue(spyCb.called);

    ShrinkingUI.current = oldCurrent;
  });

  test('Shrinking UI ShrinkingTilt, with non-null cover', function() {
    var oldCurrent = ShrinkingUI.current;

    var current = {
      cover: 'something',
      appFrame: {
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
    ShrinkingUI.current = current;

    var stubSlidingCover =
      this.sinon.stub(ShrinkingUI, '_slidingCover');
    var stubGetOverTiltingDegree =
      this.sinon.stub(ShrinkingUI, '_getOverTiltingDegree').returns('11deg');
    var stubUpdateTiltTransition =
      this.sinon.stub(ShrinkingUI, '_updateTiltTransition');

    ShrinkingUI._shrinkingTilt();

    assert.isFalse(stubSlidingCover.called);
    assert.isFalse(current.appFrame.insertBefore.called);

    assert.isTrue(
      current.wrapper.classList.add.calledWith('shrinking-wrapper')
    );
    assert.equal(current.appFrame.style.transition, 'transform 0.5s ease');
    assert.isTrue(
      current.appFrame.addEventListener.calledWith('transitionend')
    );
    assert.isTrue(
      stubUpdateTiltTransition.calledWith(
        current.appFrame.addEventListener.getCall(0).args[1]
      )
    );
    assert.equal(
      current.appFrame.style.transformOrigin,
      '50% 100% 0'
    );
    assert.equal(
      current.appFrame.style.transform,
      'rotateX(11deg)'
    );

    // restoration for "outer" scope
    stubGetOverTiltingDegree.restore(); // for gjslint's happy

    ShrinkingUI.current = oldCurrent;
  });

  test('Shrinking UI ShrinkingTiltBack, instant = true', function() {
    var oldStyle = ShrinkingUI.current.appFrame.style;

    var style = {
      transition: 'x',
      transform: 'xx'
    };

    ShrinkingUI.current.appFrame.style = style;

    var spyCb = this.sinon.spy();

    ShrinkingUI._shrinkingTiltBack(true, spyCb);

    assert.equal(style.transition, '');
    assert.equal(style.transform, 'rotateX(0.0deg)');

    assert.isTrue(spyCb.called);
    ShrinkingUI.current.appFrame.style = oldStyle;
  });

  test('Shrinking UI ShrinkingTiltBack, instant = false', function() {
    var oldAppFrame = ShrinkingUI.current.appFrame;

    var appFrame = {
      addEventListener: this.sinon.spy(),
      removeEventListener: this.sinon.spy(),
      style: {
        transition: 'x',
        transform: 'xx'
      }
    };
    ShrinkingUI.current.appFrame = appFrame;

    var spyCb = this.sinon.spy();
    var stubUpdateTiltTransition =
      this.sinon.stub(ShrinkingUI, '_updateTiltTransition');

    ShrinkingUI._shrinkingTiltBack(false, spyCb);

    assert.equal(appFrame.style.transition, 'transform 0.3s ease');
    assert.equal(appFrame.style.transform, 'rotateX(0.0deg)');

    assert.isTrue(appFrame.addEventListener.calledWith('transitionend'));
    assert.isTrue(
      stubUpdateTiltTransition.calledWith(
        appFrame.addEventListener.getCall(0).args[1]
      )
    );

    // call the event listener
    appFrame.addEventListener.getCall(0).args[1]();

    assert.isTrue(
      appFrame.removeEventListener.calledWith(
        'transitionend',
        appFrame.addEventListener.getCall(0).args[1]
      )
    );

    assert.isTrue(spyCb.called);

    ShrinkingUI.current.appFrame = oldAppFrame;
  });

  test('Shrinking UI HandleSendingStart', function() {
    var evt = {
      stopImmediatePropagation: this.sinon.spy()
    };

    var stubDebug = this.sinon.stub(ShrinkingUI, 'debug');
    var stubState = this.sinon.stub(ShrinkingUI, '_state').returns(true);
    var stubUpdateSlideTransition =
      this.sinon.stub(ShrinkingUI, '_updateSlideTransition');

    var oldTip = ShrinkingUI.current.tip;
    var tip = {
      classList: {
          add: this.sinon.spy()
      },
      addEventListener: this.sinon.spy(),
      removeEventListener: this.sinon.spy()
    };
    ShrinkingUI.current.tip = tip;

    var ret = ShrinkingUI._handleSendingStart(evt);
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

    ShrinkingUI.current.tip = oldTip;

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

    var oldAppFrame = ShrinkingUI.current.appFrame;
    ShrinkingUI.current.appFrame = {
      parentElement: {
        clientHeight: 14
      }
    };

    var oldState = ShrinkingUI.state;
    ShrinkingUI.state = {
      touch: {
        initY: undefined,
        prevY: undefined
      },
      toward: 'Somewhere',
      suspended: false,
      delaySlidingID: 'SomeInvalidStringID'
    };

    var oldThreshold = ShrinkingUI.THRESHOLD;
    ShrinkingUI.THRESHOLD = 5;

    var stubSetTimeout = this.sinon.stub(window, 'setTimeout').returns(1234);
    var stubSendingSlideTo = this.sinon.stub(ShrinkingUI, '_sendingSlideTo');

    // state.initY <- 4
    // state.prevY <- 4
    // slideY <- 4
    ShrinkingUI._handleSendingSlide(evt);
    assert.equal(ShrinkingUI.state.touch.initY, 4);
    assert.equal(ShrinkingUI.state.touch.prevY, 4);
    assert.equal(ShrinkingUI.state.toward, 'BOTTOM');

    assert.equal(ShrinkingUI.state.delaySlidingID, 1234);
    assert.isTrue(ShrinkingUI.state.suspended);

    assert.isTrue(stubSendingSlideTo.calledWith(4));

    assert.isFalse(ShrinkingUI.state.overThreshold);

    // call handleDelaySliding
    stubSetTimeout.getCall(0).args[0]();
    assert.isTrue(stubSendingSlideTo.calledTwice);
    assert.isTrue(stubSendingSlideTo.alwaysCalledWith(4));
    assert.isFalse(ShrinkingUI.state.suspended);

    // restore
    ShrinkingUI.current.appFrame = oldAppFrame;
    ShrinkingUI.state = oldState;
    ShrinkingUI.THRESHOLD = oldThreshold;
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

    var oldAppFrame = ShrinkingUI.current.appFrame;
    ShrinkingUI.current.appFrame = {
      parentElement: {
        clientHeight: 16
      }
    };

    var oldState = ShrinkingUI.state;
    ShrinkingUI.state = {
      touch: {
        initY: 5,
        prevY: 5
      },
      toward: 'Somewhere',
      suspended: false,
      delaySlidingID: 'SomeInvalidStringID'
    };

    var oldThreshold = ShrinkingUI.THRESHOLD;
    ShrinkingUI.THRESHOLD = 3;

    var stubSetTimeout = this.sinon.stub(window, 'setTimeout');
    var stubSendingSlideTo = this.sinon.stub(ShrinkingUI, '_sendingSlideTo');

    // slideY <- 6
    ShrinkingUI._handleSendingSlide(evt);
    assert.equal(ShrinkingUI.state.touch.initY, 5);
    assert.equal(ShrinkingUI.state.toward, 'TOP');

    assert.isTrue(ShrinkingUI.state.overThreshold);

    // call handleDelaySliding
    stubSetTimeout.getCall(0).args[0]();

    // restore
    ShrinkingUI.current.appFrame = oldAppFrame;
    ShrinkingUI.state = oldState;
    ShrinkingUI.THRESHOLD = oldThreshold;

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

    var oldAppFrame = ShrinkingUI.current.appFrame;
    ShrinkingUI.current.appFrame = {
      parentElement: {
        clientHeight: 14
      }
    };

    var oldState = ShrinkingUI.state;
    ShrinkingUI.state = {
      touch: {},
      toward: 'Somewhere',
      suspended: true,
      overThreshold: 'Blah'
    };

    var stubSetTimeout = this.sinon.stub(window, 'setTimeout');
    var stubSendingSlideTo = this.sinon.stub(ShrinkingUI, '_sendingSlideTo');

    // slideY <- 6
    ShrinkingUI._handleSendingSlide(evt);
    assert.equal(ShrinkingUI.state.touch.initY, 4);
    assert.equal(ShrinkingUI.state.touch.prevY, 4);
    assert.equal(ShrinkingUI.state.toward, 'BOTTOM');

    assert.isFalse(stubSetTimeout.called);
    assert.isFalse(stubSendingSlideTo.called);
    assert.equal(ShrinkingUI.state.overThreshold, 'Blah');

    ShrinkingUI.current.appFrame = oldAppFrame;
    ShrinkingUI.state = oldState;
  });

  test('Shrinking UI HandleSendingOut, full, ' +
       'overThreshold = true and toward = "TOP"', function() {
    var stubDebug = this.sinon.stub(ShrinkingUI, 'debug');
    var stubState = this.sinon.stub(ShrinkingUI, '_state').returns(true);

    var oldState = ShrinkingUI.state;
    ShrinkingUI.state = {
      overThreshold: true,
      delaySlidingID: 2345,
      toward: 'TOP',
    };

    var stubClearTimeout = this.sinon.stub(window, 'clearTimeout');
    var stubSendingSlideTo = this.sinon.stub(ShrinkingUI, '_sendingSlideTo');
    var stubDispatchEvent =
      this.sinon.stub(window, 'dispatchEvent', function(evt, evt2){
        assert.equal(evt.type, 'shrinking-sent');
      });
    var stubDisableSlidingCover =
      this.sinon.stub(ShrinkingUI, '_disableSlidingCover');

    ShrinkingUI._handleSendingOut(null);
    assert.isTrue(stubDebug.called);
    assert.isTrue(stubState.called);
    assert.isTrue(stubClearTimeout.calledWith(2345));

    assert.isTrue(stubSendingSlideTo.calledWith('TOP'));

    stubSendingSlideTo.getCall(0).args[1]();

    assert.isTrue(stubDisableSlidingCover.called);
    assert.isTrue(stubDispatchEvent.called);

    // restore
    ShrinkingUI.state = oldState;
  });

  var handleSendingOutTestFactory = function(state_) {
    return function() {
      var stubDebug = this.sinon.stub(ShrinkingUI, 'debug');
      var stubState = this.sinon.stub(ShrinkingUI, '_state').returns(true);

      var oldState = ShrinkingUI.state;
      ShrinkingUI.state = state_;

      var stubClearTimeout = this.sinon.stub(window, 'clearTimeout');
      var stubSendingSlideTo = this.sinon.stub(ShrinkingUI, '_sendingSlideTo');
      var stubSetTip = this.sinon.stub(ShrinkingUI, '_setTip');

      ShrinkingUI._handleSendingOut(null);
      assert.isTrue(stubSendingSlideTo.calledWith('BOTTOM'));

      stubSendingSlideTo.getCall(0).args[1]();

      assert.isFalse(ShrinkingUI.state.suspended);
      assert.isTrue(stubSetTip.called);

      // restore
      ShrinkingUI.state = oldState;

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
    var stubDebug = this.sinon.stub(ShrinkingUI, 'debug');
    var stubState = this.sinon.stub(ShrinkingUI, '_state').returns(true);
    var stubSetState = this.sinon.stub(ShrinkingUI, '_setState');
    var stubUpdateTiltTransition =
      this.sinon.stub(ShrinkingUI, '_updateTiltTransition');
    var stubUpdateSlideTransition =
      this.sinon.stub(ShrinkingUI, '_updateSlideTransition');
    var spySlidingCoverRemove = this.sinon.spy();
    var stubDisableSlidingCover =
      this.sinon.stub(ShrinkingUI, '_disableSlidingCover').returns(
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

    var oldCurrent = ShrinkingUI.current;
    ShrinkingUI.current = {
      appFrame: {
        style: styleTemp
      },
      wrapper: {
        classList: classListTemp
      },
      cover: 'something'
    };

    ShrinkingUI._cleanEffects();
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

    assert.isNull(ShrinkingUI.current.wrapper);
    assert.isNull(ShrinkingUI.current.appFrame);
    assert.isNull(ShrinkingUI.current.cover);

    ShrinkingUI.current = oldCurrent;
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

    var oldConfigs = ShrinkingUI.configs;
    ShrinkingUI.configs = {
      degreeLandscape: 13,
      degreePortrait: 14
    };

    assert.equal(ShrinkingUI._getTiltingDegree(), 13);
    stubFetchCurrentOrientation.restore();

    stubFetchCurrentOrientation =
      this.sinon.stub(window.OrientationManager, 'fetchCurrentOrientation')
      .returns('portrait-primary');

    assert.equal(ShrinkingUI._getTiltingDegree(), 14);
    stubFetchCurrentOrientation.restore();

    ShrinkingUI.configs = oldConfigs;
  });

  test('Shrinking UI GetOverTiltingDegree', function() {
    var stubFetchCurrentOrientation =
      this.sinon.stub(window.OrientationManager, 'fetchCurrentOrientation')
      .returns('landscape-primary');

    var oldConfigs = ShrinkingUI.configs;
    ShrinkingUI.configs = {
      overDegreeLandscape: 15,
      overDegreePortrait: 16
    };

    assert.equal(ShrinkingUI._getOverTiltingDegree(), 15);
    stubFetchCurrentOrientation.restore();

    stubFetchCurrentOrientation =
      this.sinon.stub(window.OrientationManager, 'fetchCurrentOrientation')
      .returns('portrait-primary');

    assert.equal(ShrinkingUI._getOverTiltingDegree(), 16);
    stubFetchCurrentOrientation.restore();

    ShrinkingUI.configs = oldConfigs;
  });

});
