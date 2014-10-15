/* global MocksHelper, MockSystem */

'use strict';

requireApp('system/js/shrinking_ui.js');
requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_app_window.js');
require('/shared/test/unit/mocks/mock_system.js');

var mocksForshrinkingUI = new MocksHelper([
  'AppWindow',
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
    window.System.currentApp = fakeApp;
  });

  teardown(function() {
    window.System.currentApp = null;
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

  test('Handle "home" event', homeAndHoldhomeTestFactory('home'));
  test('Handle "holdhome" event', homeAndHoldhomeTestFactory('holdhome'));

  test('Handle "activeappchanged" event, when app is tilting', function() {
    var evt = {
      type: 'activeappchanged'
    };
    this.sinon.stub(shrinkingUI, '_state').returns(true);
    shrinkingUI.state = {
      activeApp: 'testActiveApp'
    };
    var stubSop = this.sinon.stub(shrinkingUI, 'stopTilt');
    shrinkingUI.handleEvent(evt);
    assert.isTrue(stubSop.called);
    assert.isTrue(shrinkingUI._clearPreviousTilting);
    assert.equal(shrinkingUI.current, 'testActiveApp');
  });

  test('Handle "activeappchanged" event, when app is not tilting', function() {
    var evt = {
      type: 'activeappchanged'
    };
    this.sinon.stub(shrinkingUI, '_state').returns(false);
    var stubSop = this.sinon.stub(shrinkingUI, 'stopTilt');
    shrinkingUI.handleEvent(evt);
    assert.isFalse(stubSop.called);
    assert.isFalse(shrinkingUI._clearPreviousTilting);
    assert.deepEqual(shrinkingUI.current, fakeApp);
  });

  test('Handle "shrinking-start" event', function() {
    var evt = {
      type: 'shrinking-start'
    };
    var stubStart = this.sinon.stub(shrinkingUI, 'startTilt');
    shrinkingUI.handleEvent(evt);
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
    var stubReceivingEffects =
      this.sinon.stub(shrinkingUI, '_receivingEffects');
    shrinkingUI.handleEvent(evt);
    assert.isTrue(stubReceivingEffects.called);
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

  test('Handle "check-p2p-registration-for-active-app" event ' +
       'when manifestURL is null', function() {
    var evt = {
      type: 'check-p2p-registration-for-active-app',
      detail: {
        checkP2PRegistration: this.sinon.spy()
      }
    };
    shrinkingUI.current.manifestURL = null;
    shrinkingUI.handleEvent(evt);
    assert.isTrue(evt.detail.checkP2PRegistration
      .calledWith(MockSystem.manifestURL));
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

  test('Handle "dispatch-p2p-user-response-on-active-app" event ' +
       'when manifestURL is null', function() {
    var evt = {
      type: 'dispatch-p2p-user-response-on-active-app',
      detail: {
        dispatchP2PUserResponse: this.sinon.spy()
      }
    };
    shrinkingUI.current.manifestURL = null;
    shrinkingUI.handleEvent(evt);
    assert.isTrue(evt.detail.dispatchP2PUserResponse
      .calledWith(MockSystem.manifestURL));
  });

  test('Shrinking UI Start', function(done) {
    var fakeParent = document.createElement('div');
    fakeParent.appendChild(fakeApp.element);
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
    fakeApp.broadcast = this.sinon.spy();
    stubState.returns(false);
    var stubShrinkingTilt =
      this.sinon.stub(shrinkingUI, '_shrinkingTilt', function(cb){
        cb();

        assert.isTrue(stubState.called);
        assert.isTrue(stubSetState.calledWith(true));
        assert.isTrue(stubShrinkingTilt.called);
        assert.isTrue(fakeApp.broadcast.calledWith('shrinkingstart'));

        shrinkingUI.currentAppURL = oldURL;

        done();
      });

    shrinkingUI.startTilt();
  });

  test('Shrinking UI SetTip', function() {
    var fakeParent = document.createElement('div');
    fakeParent.appendChild(fakeApp.element);
    var tempTip = document.createElement('div');
    tempTip.classList.remove = this.sinon.stub();
    var stubSlidingTip =
      this.sinon.stub(shrinkingUI, '_slidingTip').returns(tempTip);

    // first test: with shrinkingUI.current.tip being unavailable
 
    shrinkingUI.tip = null;
    shrinkingUI._setTip();

    assert.isTrue(stubSlidingTip.called);
    assert.equal(shrinkingUI.tip, tempTip);
    assert.deepEqual(tempTip.parentNode, fakeParent);
    assert.isTrue(tempTip.classList.remove.calledWith('hide'));

    // second test: with shrinkingUIcurrent.tip being available

    shrinkingUI.tip = document.createElement('div'); 

    stubSlidingTip.reset();
    shrinkingUI.tip.classList.remove = this.sinon.stub();

    shrinkingUI._setTip();

    assert.isFalse(stubSlidingTip.called);
    assert.equal(shrinkingUI.tip.parent, null);
    assert.isTrue(shrinkingUI.tip.classList.remove.calledWith('hide'));
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
    fakeApp.broadcast = this.sinon.stub();
    var fakeTip = {
      remove: this.sinon.spy()
    };

    shrinkingUI.tip = fakeTip;

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
        assert.isNull(this.tip);
        assert.isTrue(fakeApp.broadcast.calledWith('shrinkingstop'));

        stubCleanEffects.restore(); // this one is for gjslinter happy

        shrinkingUI.currentAppURL = oldURL;
        shrinkingUI.tip = oldTip;

        done();
      });

    shrinkingUI.stopTilt();
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
    shrinkingUI.tip = tip;


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

    shrinkingUI.tip = null;

    shrinkingUI._updateSlideTransition('STCB4');
    assert.equal(shrinkingUI.state.slideTransitionCb, 'STCB4');

    // restore

    shrinkingUI.tip = oldTip;
    shrinkingUI.state.slideTransitionCb = oldSlideTransitionCb;
  });

  test('Shrinking UI Update Tilt Transition', function() {
    var oldTiltTransitionCb = shrinkingUI.state.tiltTransitionCb;

    // test valid slideTransitionCb

    fakeApp.element.removeEventListener = this.sinon.stub();

    shrinkingUI.state.tiltTransitionCb = 'TTCB';

    shrinkingUI._updateTiltTransition('TTCB2');
    assert.isTrue(
      fakeApp.element.removeEventListener.calledWith('transitionend', 'TTCB')
    );
    assert.equal(shrinkingUI.state.tiltTransitionCb, 'TTCB2');

    fakeApp.element.removeEventListener.reset();

    // test null slideTransitionCb

    shrinkingUI.state.tiltTransitionCb = null;

    shrinkingUI._updateTiltTransition('TTCB3');
    assert.isFalse(fakeApp.element.removeEventListener.called);
    assert.equal(shrinkingUI.state.tiltTransitionCb, 'TTCB3');

    // test null frame

    this.sinon.stub(fakeApp, 'getBottomMostWindow', function() {
      return {
        element: null
      };
    });

    shrinkingUI._updateTiltTransition('TTCB4');
    assert.equal(shrinkingUI.state.tiltTransitionCb, 'TTCB4');

    // restore

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
    var oldCover = shrinkingUI.cover;

    var stubHandleSendingStart =
      this.sinon.stub(shrinkingUI, '_handleSendingStart');
    var stubHandleSendingSlide =
      this.sinon.stub(shrinkingUI, '_handleSendingSlide');
    var stubHandleSendingOut =
      this.sinon.stub(shrinkingUI, '_handleSendingOut');

    shrinkingUI.cover = document.createElement('div');

    var cover = shrinkingUI._enableSlidingCover();

    cover.dispatchEvent(createTouchEvent('touchstart'));
    cover.dispatchEvent(createTouchEvent('touchmove'));
    cover.dispatchEvent(createTouchEvent('touchend'));

    assert.isTrue(stubHandleSendingStart.called);
    assert.isTrue(stubHandleSendingSlide.called);
    assert.isTrue(stubHandleSendingOut.called);

    shrinkingUI.cover = oldCover;
  });

  test('Shrinking UI DisableSlidingCover', function() {
    var oldCover = shrinkingUI.cover;

    var stubHandleSendingStart =
      this.sinon.stub(shrinkingUI, '_handleSendingStart');
    var stubHandleSendingSlide =
      this.sinon.stub(shrinkingUI, '_handleSendingSlide');
    var stubHandleSendingOut =
      this.sinon.stub(shrinkingUI, '_handleSendingOut');

    shrinkingUI.cover = document.createElement('div');

    shrinkingUI.cover.addEventListener(
      'touchstart',
      shrinkingUI._handleSendingStart
    );
    shrinkingUI.cover.addEventListener(
      'touchmove',
      shrinkingUI._handleSendingSlide
    );
    shrinkingUI.cover.addEventListener(
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

    shrinkingUI.cover = oldCover;
  });

  test('Shrinking UI ShrinkingTilt, full, with null cover', function() {
    fakeApp._element = document.createElement('div');
    fakeApp._element.addEventListener = this.sinon.spy();
    fakeApp._element.removeEventListener = this.sinon.spy();
    var fakeChild = document.createElement('div');
    var fakeParent = document.createElement('div');
    fakeParent.classList.add = this.sinon.spy();
    fakeApp._element.appendChild(fakeChild);
    fakeParent.appendChild(fakeApp._element);
    fakeApp._element.insertBefore = this.sinon.spy();
    fakeApp._element.classList.add = this.sinon.spy();

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
      fakeApp.element.insertBefore.calledWith('cover',
      fakeChild)
    );
    assert.isTrue(fakeParent.classList.add.calledWith(
      'shrinking-wrapper'));
    assert.equal(fakeApp.element.style.transition,
      'transform 0.5s ease 0s');
    assert.isTrue(fakeApp.element.addEventListener
      .calledWith('transitionend')
    );
    assert.isTrue(stubUpdateTiltTransition.
      calledWith(fakeApp.element
        .addEventListener.getCall(0).args[1]
      )
    );
    assert.equal(fakeApp.element.style.transformOrigin,
      '50% 100% 0px');
    assert.equal(fakeApp.element.style.transform, 'rotateX(9deg)');

    // restoration for "outer" scope
    stubGetOverTiltingDegree.restore(); // for gjslint's happy
    stubUpdateTiltTransition.reset();

    // call the bounceBack
    var stubGetTiltingDegree =
      this.sinon.stub(shrinkingUI, '_getTiltingDegree').returns('10deg');

    fakeApp.element.addEventListener.getCall(0).args[1]({
      target: fakeApp.element
    });
    assert.isTrue(
      fakeApp.element.removeEventListener.calledWith(
        'transitionend',
        fakeApp.element.addEventListener.getCall(0).args[1]
      )
    );
    assert.isTrue(fakeApp.element.addEventListener.calledTwice);
    assert.isTrue(
      fakeApp.element.addEventListener.alwaysCalledWith('transitionend')
    );
    assert.isTrue(
      stubUpdateTiltTransition.calledWith(
        fakeApp.element.addEventListener.getCall(1).args[1]
      )
    );
    assert.equal(
      fakeApp.element.style.transition,
      'transform 0.3s ease 0s'
    );
    assert.equal(
      fakeApp.element.style.transform,
      'rotateX(10deg)'
    );

    // restoration for bounceBack scope
    stubGetTiltingDegree.restore(); // for gjslint's happy

    // call the bounceBackEnd
    fakeApp.element.addEventListener.getCall(1).args[1]({
      target: fakeApp.element
    });
    assert.isTrue(
      fakeApp.element.removeEventListener.calledWith(
        'transitionend',
        fakeApp.element.addEventListener.getCall(1).args[1]
      )
    );
    assert.equal(
      fakeApp.element.style.transition,
      'transform 0.5s ease 0s'
    );

    assert.isTrue(spyCb.called);

  });

  test('Shrinking UI ShrinkingTilt, with non-null cover', function() {
    fakeApp._element = document.createElement('div');
    fakeApp._element.addEventListener = this.sinon.spy();
    fakeApp._element.removeEventListener = this.sinon.spy();
    var fakeChild = document.createElement('div');
    var fakeParent = document.createElement('div');
    fakeParent.classList.add = this.sinon.spy();
    fakeApp._element.appendChild(fakeChild);
    fakeParent.appendChild(fakeApp._element);
    fakeApp._element.insertBefore = this.sinon.spy();
    fakeApp._element.classList.add = this.sinon.spy();
    shrinkingUI.cover = 'cover';

    var stubSlidingCover =
      this.sinon.stub(shrinkingUI, '_slidingCover');
    var stubGetOverTiltingDegree =
      this.sinon.stub(shrinkingUI, '_getOverTiltingDegree').returns('11deg');
    var stubUpdateTiltTransition =
      this.sinon.stub(shrinkingUI, '_updateTiltTransition');

    shrinkingUI._shrinkingTilt();

    assert.isFalse(stubSlidingCover.called);
    assert.isFalse(fakeApp.element.insertBefore.called);

    assert.isTrue(
      fakeParent.classList.add.calledWith('shrinking-wrapper')
    );
    assert.equal(fakeApp._element.style.transition, 'transform 0.5s ease 0s');
    assert.isTrue(
      fakeApp.element.addEventListener.calledWith('transitionend')
    );
    assert.isTrue(
      stubUpdateTiltTransition.calledWith(
        fakeApp.element.addEventListener.getCall(0).args[1]
      )
    );
    assert.equal(
      fakeApp.element.style.transformOrigin,
      '50% 100% 0px'
    );
    assert.equal(
      fakeApp.element.style.transform,
      'rotateX(11deg)'
    );

    // restoration for "outer" scope
    stubGetOverTiltingDegree.restore(); // for gjslint's happy
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

    var oldTip = shrinkingUI.tip;
    var tip = {
      classList: {
          add: this.sinon.spy()
      },
      addEventListener: this.sinon.spy(),
      removeEventListener: this.sinon.spy()
    };
    shrinkingUI.tip = tip;

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

    shrinkingUI.tip = oldTip;

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

    fakeApp._element = document.createElement('div');
    var fakeParent = document.createElement('div');
    fakeParent.appendChild(fakeApp._element);
    fakeParent.classList.remove = this.sinon.spy();
    fakeApp._element.style.transition = 'transform 0.3s ease';
    fakeApp._element.style.transform = 'rotateX(0.0deg)';

    shrinkingUI._cleanEffects();
    assert.isTrue(stubDebug.called);
    assert.isTrue(stubState.called);
    assert.equal(fakeApp._element.style.transition, '');
    assert.equal(fakeApp._element.style.transform, '');
    assert.equal(fakeApp._element.style.transformOrigin, '50% 50% 0px');
    assert.isTrue(stubSetState.calledWith(false));
    assert.isTrue(stubUpdateTiltTransition.calledWith(null));
    assert.isTrue(stubUpdateSlideTransition.calledWith(null));
    assert.isTrue(fakeParent.classList.remove.calledWith('shrinking-wrapper'));
    assert.isTrue(spySlidingCoverRemove.called);

    assert.isNull(shrinkingUI.cover);

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
