/* global MocksHelper */

'use strict';

requireApp('system/shared/js/shrinking_ui.js');
requireApp('system/test/unit/mock_orientation_manager.js');
requireApp('system/test/unit/mock_app_window.js');

var mocksForshrinkingUI = new MocksHelper([
  'AppWindow',
  'OrientationManager'
]).init();

suite('system/shrinkingUI', function() {
  var shrinkingUI;
  mocksForshrinkingUI.attachTestHelpers();

  var fakeApp;
  var fakeAppConfig = {
    url: 'app://www.fake/index.html',
    manifest: {},
    manifestURL: 'app://wwww.fake/ManifestURL',
    origin: 'app://www.fake',
    instanceID: 'instanceID'
  };

  setup(function() {
    fakeApp = new window.AppWindow(fakeAppConfig);

    fakeApp.element = document.createElement('div');
    var fakeParent = document.createElement('div');
    fakeParent.appendChild(fakeApp.element);
    shrinkingUI = new window.ShrinkingUI(fakeApp.element,
      fakeApp.element.parentNode);
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

  test('Start', function() {
    var stubStartTilt = this.sinon.stub(shrinkingUI, 'startTilt');
    shrinkingUI.start();
    assert.isTrue(stubStartTilt.calledOnce);
  });

  test('Response to hierachy event', function() {
    shrinkingUI.state.shrinking = true;
    assert.isTrue(shrinkingUI.respondToHierarchyEvent({ type: 'home' }),
      'should return true if receive home event from hierachy and ' +
      'it is active');
    assert.isTrue(shrinkingUI.respondToHierarchyEvent({ type: 'holdhome' }),
      'should return true if receive holdhome event from hierachy and ' +
      'it is active');
    shrinkingUI.state.shrinking = false;
    assert.isFalse(shrinkingUI.respondToHierarchyEvent({ type: 'home' }),
      'should return false if receive home event from hierachy and it is not' +
      ' active');
    assert.isFalse(shrinkingUI.respondToHierarchyEvent({ type: 'holdhome' }),
      'should return false if receive holdhome event from hierachy and it is' +
      ' not active');
  });

  test('Handle "shrinking-receiving" event', function() {
    shrinkingUI.start();
    var evt = {
      type: 'shrinking-receiving'
    };
    var stubReceivingEffects =
      this.sinon.stub(shrinkingUI, '_receivingEffects');
    shrinkingUI.handleEvent(evt);
    assert.isTrue(stubReceivingEffects.called);
  });

  test('Shrinking UI Start', function(done) {
    var fakeParent = document.createElement('div');
    fakeParent.appendChild(fakeApp.element);
    // test for state = true (not going to start actually)
    var stubActive = this.sinon.stub(shrinkingUI, 'isActive').returns(true);
    var stubSetTip = this.sinon.stub(shrinkingUI, '_setTip');
    var stubSetState = this.sinon.stub(shrinkingUI, '_setState');

    shrinkingUI.startTilt();
    assert.isTrue(stubActive.called);
    assert.isFalse(stubSetTip.called);
    assert.isFalse(stubSetState.called);

    stubActive.reset();
    stubSetTip.reset();
    stubSetState.reset();

    // actual "start"
    stubActive.returns(false);
    fakeApp.broadcast = this.sinon.spy();
    var stubShrinkingTilt =
      this.sinon.stub(shrinkingUI, '_shrinkingTilt', function(cb){
        cb();

        assert.isTrue(stubActive.called);
        assert.isTrue(stubSetState.calledWith(true));
        assert.isTrue(stubShrinkingTilt.called);
        assert.isTrue(shrinkingUI.elements.foregroundElement.classList.contains(
          'hidden'));
        done();
      });

    shrinkingUI.startTilt();
  });

  test('Shrinking UI SetTip', function() {
    var tempTip = document.createElement('div');
    tempTip.classList.remove = this.sinon.stub();
    var stubSlidingTip =
      this.sinon.stub(shrinkingUI, '_slidingTip').returns(tempTip);

    // first test: with shrinkingUI.current.tip being unavailable
 
    shrinkingUI.tip = null;
    shrinkingUI._setTip();

    assert.isTrue(stubSlidingTip.called);
    assert.equal(shrinkingUI.tip, tempTip);
    assert.equal(tempTip.parentNode, fakeApp.element.parentNode);
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

    var oldTip = shrinkingUI.tip;
    shrinkingUI.elements.foregroundElement.classList.add('hidden');
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
        assert.isFalse(shrinkingUI.elements.foregroundElement.classList
          .contains('hidden'));
        stubCleanEffects.restore(); // this one is for gjslinter happy

        shrinkingUI.tip = oldTip;

        done();
      });

    shrinkingUI.stopTilt();
  });

  test('Shrinking UI State', function() {
    assert.isFalse(shrinkingUI.isActive());

    shrinkingUI.state.shrinking = true;
    assert.isTrue(shrinkingUI.isActive());
  });

  test('Shrinking UI SetState', function() {
    var stubSetAttribute = this.sinon.stub();
    shrinkingUI.elements.foregroundElement = {
      setAttribute: stubSetAttribute
    };

    shrinkingUI._setState(123);

    assert.isTrue(stubSetAttribute.calledWith('data-shrinking-state', '123'));
  });

  test('Shrinking UI Update Slide Transition', function() {
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
    shrinkingUI.elements.foregroundElement = document.createElement('div');

    var stubShrinkingTilt = this.sinon.stub(shrinkingUI, '_shrinkingTilt');
    var stubSendingSlideTo = this.sinon.stub(shrinkingUI, '_sendingSlideTo');

    shrinkingUI._receivingEffects();

    assert.equal(shrinkingUI.elements.foregroundElement.style.opacity, '0');
    assert.isTrue(stubShrinkingTilt.called);

    // call afterTilt
    stubShrinkingTilt.getCall(0).args[0]();

    assert.equal(shrinkingUI.elements.foregroundElement.style.transition,
      'transform 0.05s ease 0s');

    assert.isTrue(stubSendingSlideTo.called);
    assert.isTrue(stubSendingSlideTo.getCall(0).calledWith('TOP'));

    // call afterTop
    stubSendingSlideTo.getCall(0).args[1]();
    assert.equal(shrinkingUI.elements.foregroundElement.style.opacity, '');
    assert.equal(shrinkingUI.elements.foregroundElement.style.transition,
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
    var oldAppFrame = shrinkingUI.elements.foregroundElement;

    var spyAddEventListener = this.sinon.spy();
    var spyRemoveEventListener = this.sinon.spy();

    var stubGetTiltingDegree =
      this.sinon.stub(shrinkingUI, '_getTiltingDegree').returns('5deg');

    var stubUpdateTiltTransition =
      this.sinon.stub(shrinkingUI, '_updateTiltTransition');

    shrinkingUI.elements.foregroundElement = {
      addEventListener: spyAddEventListener,
      removeEventListener: spyRemoveEventListener,
      style: {
        transform: ''
      }
    };

    shrinkingUI._sendingSlideTo(10, function(){
    });

    assert.equal(shrinkingUI.elements.foregroundElement.style.transform,
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
    shrinkingUI.elements.foregroundElement = oldAppFrame;
  });

  test('Shrinking UI SendingSlideTo, with Y = TOP', function() {
    var oldAppFrame = shrinkingUI.elements.foregroundElement;

    var stubGetTiltingDegree =
      this.sinon.stub(shrinkingUI, '_getTiltingDegree').returns('6deg');

    var stubUpdateTiltTransition =
      this.sinon.stub(shrinkingUI, '_updateTiltTransition');

    shrinkingUI.elements.foregroundElement = {
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
      shrinkingUI.elements.foregroundElement.style.transform,
      'rotateX(6deg) translateY(-40px)'
    );

    // for gjslint happy
    stubGetTiltingDegree.restore();
    stubUpdateTiltTransition.restore();

    shrinkingUI.elements.foregroundElement = oldAppFrame;
  });

  test('Shrinking UI SendingSlideTo, with Y = BOTTOM', function() {
    var oldAppFrame = shrinkingUI.elements.foregroundElement;

    var stubGetTiltingDegree =
      this.sinon.stub(shrinkingUI, '_getTiltingDegree').returns('7deg');

    var stubUpdateTiltTransition =
      this.sinon.stub(shrinkingUI, '_updateTiltTransition');

    shrinkingUI.elements.foregroundElement = {
      addEventListener: function(){},
      style: {
        transform: ''
      },
      removeEventListener: function() {}
    };

    shrinkingUI._sendingSlideTo('BOTTOM', function(){
    });

    assert.equal(
      shrinkingUI.elements.foregroundElement.style.transform,
      'rotateX(7deg) translateY(-0px)'
    );

    // for gjslint's happy
    stubGetTiltingDegree.restore();
    stubUpdateTiltTransition.restore();
    shrinkingUI.elements.foregroundElement = oldAppFrame;
  });

  test('Shrinking UI SendingSlideTo, with Y < 0', function() {
    var oldAppFrame = shrinkingUI.elements.foregroundElement;

    var stubGetTiltingDegree =
      this.sinon.stub(shrinkingUI, '_getTiltingDegree').returns('8deg');

    var stubUpdateTiltTransition =
      this.sinon.stub(shrinkingUI, '_updateTiltTransition');

    shrinkingUI.elements.foregroundElement = {
      addEventListener: function(){},
      style: {
        transform: ''
      },
    };

    shrinkingUI._sendingSlideTo(-20, function(){
    });

    assert.equal(
      shrinkingUI.elements.foregroundElement.style.transform,
      'rotateX(8deg) translateY(-0px)'
    );

    // for gjslint's happy
    stubGetTiltingDegree.restore();
    stubUpdateTiltTransition.restore();

    shrinkingUI.elements.foregroundElement = oldAppFrame;
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
    var tipText = tip.children[0];
    var tipArrow = tip.children[1];

    assert.equal(tip.tagName.toLowerCase(), 'div');
    assert.equal(tip.id, 'shrinking-tip');
    assert.equal(tipText.getAttribute('data-l10n-id'), 'shrinking-tip');
    assert.equal(tipArrow.tagName.toLowerCase(), 'div');
    assert.equal(tipArrow.id, 'shrinking-tip-arrow');
    assert.equal(tipArrow.textContent, '\u00A0');

    if(fakeMozL10n){
      delete navigator.mozL10n;
    }
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
      shrinkingUI
    );
    shrinkingUI.cover.addEventListener(
      'touchmove',
      shrinkingUI
    );
    shrinkingUI.cover.addEventListener(
      'touchend',
      shrinkingUI
    );

    shrinkingUI._disableSlidingCover();

    shrinkingUI.cover.dispatchEvent(createTouchEvent('touchstart'));
    shrinkingUI.cover.dispatchEvent(createTouchEvent('touchmove'));
    shrinkingUI.cover.dispatchEvent(createTouchEvent('touchend'));

    assert.isFalse(stubHandleSendingStart.called);
    assert.isFalse(stubHandleSendingSlide.called);
    assert.isFalse(stubHandleSendingOut.called);

    shrinkingUI.cover = oldCover;
  });

  test('Shrinking UI ShrinkingTilt, full, with null cover', function() {
    shrinkingUI.elements.foregroundElement.addEventListener = this.sinon.spy();
    shrinkingUI.elements.foregroundElement.removeEventListener =
      this.sinon.spy();
    var fakeChild = document.createElement('div');
    shrinkingUI.elements.backgroundElement.classList.add = this.sinon.spy();
    shrinkingUI.elements.foregroundElement.appendChild(fakeChild);
    shrinkingUI.elements.foregroundElement.insertBefore = this.sinon.spy();
    shrinkingUI.elements.foregroundElement.classList.add = this.sinon.spy();


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
    assert.isTrue(shrinkingUI.elements.backgroundElement.classList.add
      .calledWith('shrinking-wrapper'));
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
      'transform 0s ease 0s'
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

    shrinkingUI.elements.foregroundElement.addEventListener = this.sinon.spy();
    shrinkingUI.elements.foregroundElement.removeEventListener =
      this.sinon.spy();
    var fakeChild = document.createElement('div');
    shrinkingUI.elements.backgroundElement.classList.add = this.sinon.spy();
    shrinkingUI.elements.foregroundElement.appendChild(fakeChild);
    shrinkingUI.elements.foregroundElement.insertBefore = this.sinon.spy();
    shrinkingUI.elements.foregroundElement.classList.add = this.sinon.spy();

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
      shrinkingUI.elements.backgroundElement.classList.add
      .calledWith('shrinking-wrapper')
    );
    assert.equal(shrinkingUI.elements.foregroundElement.style.transition,
      'transform 0.5s ease 0s');
    assert.isTrue(
      shrinkingUI.elements.foregroundElement.addEventListener
      .calledWith('transitionend')
    );
    assert.isTrue(
      stubUpdateTiltTransition.calledWith(
        shrinkingUI.elements.foregroundElement.addEventListener
        .getCall(0).args[1]
      )
    );
    assert.equal(
      shrinkingUI.elements.foregroundElement.style.transformOrigin,
      '50% 100% 0px'
    );
    assert.equal(
      shrinkingUI.elements.foregroundElement.style.transform,
      'rotateX(11deg)'
    );

    // restoration for "outer" scope
    stubGetOverTiltingDegree.restore(); // for gjslint's happy
  });

  test('Shrinking UI ShrinkingTiltBack, instant = true', function(done) {
    var style = {
      transition: 'x',
      transform: 'xx'
    };
    shrinkingUI.elements.foregroundElement.style = style;
    shrinkingUI._shrinkingTiltBack(true, () => {
      assert.equal(shrinkingUI.elements.foregroundElement.style.transition, '');
      assert.equal(shrinkingUI.elements.foregroundElement.style.transform,
        'rotateX(0deg)');
      done();
    });
  });

  test('Shrinking UI ShrinkingTiltBack, instant = false', function() {
    var oldAppFrame = shrinkingUI.elements.foregroundElement;
    var frame = {
      addEventListener: this.sinon.spy(),
      removeEventListener: this.sinon.spy(),
      style: {
        transition: 'x',
        transform: 'xx'
      }
    };
    shrinkingUI.elements.foregroundElement = frame;

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

    shrinkingUI.elements.foregroundElement = oldAppFrame;
  });

  test('Shrinking UI HandleSendingStart', function() {
    var evt = {
      stopImmediatePropagation: this.sinon.spy(),
      touches: [
        {pageY: 123}
      ]
    };

    var stubDebug = this.sinon.stub(shrinkingUI, 'debug');
    var stubState = this.sinon.stub(shrinkingUI, 'isActive').returns(true);
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
    assert.equal(shrinkingUI.state.touch.initY, 123);
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
       'slideY < threshold', function() {
    var evt = {
      touches: [
        {
          pageY: 10
        }
      ]
    };

    var oldAppFrame = shrinkingUI.elements.foregroundElement;

    var oldState = shrinkingUI.state;
    shrinkingUI.state = {
      touch: {
        initY: 14,
        prevY: undefined
      },
      toward: 'Somewhere'
    };

    var oldThreshold = shrinkingUI.THRESHOLD;
    shrinkingUI.THRESHOLD = 5;

    var stubSendingSlideTo = this.sinon.stub(shrinkingUI, '_sendingSlideTo');

    // state.initY <- 4
    // state.prevY <- 4
    // slideY <- 4
    shrinkingUI._handleSendingSlide(evt);
    assert.equal(shrinkingUI.state.touch.prevY, 4);
    assert.equal(shrinkingUI.state.toward, 'BOTTOM');

    assert.isTrue(stubSendingSlideTo.calledWith(4));

    assert.isFalse(shrinkingUI.state.overThreshold);

    // restore
    shrinkingUI.elements.foregroundElement = oldAppFrame;
    shrinkingUI.state = oldState;
    shrinkingUI.THRESHOLD = oldThreshold;
  });

  test('Shrinking UI HandleSendingSlide: defined initY/prevY, ' +
       'prevY < slideY, slideY > threshold', function() {
    var evt = {
      touches: [
        {
          pageY: 10
        }
      ]
    };

    var oldAppFrame = shrinkingUI.elements.foregroundElement;
    var oldState = shrinkingUI.state;
    shrinkingUI.state = {
      touch: {
        initY: 16,
        prevY: 5
      },
      toward: 'Somewhere'
    };

    var oldThreshold = shrinkingUI.THRESHOLD;
    shrinkingUI.THRESHOLD = 3;

    var stubSendingSlideTo = this.sinon.stub(shrinkingUI, '_sendingSlideTo');

    // slideY <- 6
    shrinkingUI._handleSendingSlide(evt);
    assert.equal(shrinkingUI.state.touch.initY, 16);
    assert.equal(shrinkingUI.state.toward, 'TOP');

    assert.isTrue(shrinkingUI.state.overThreshold);

    // restore
    shrinkingUI.elements.foregroundElement = oldAppFrame;
    shrinkingUI.state = oldState;
    shrinkingUI.THRESHOLD = oldThreshold;

    // for gjslint's happy
    stubSendingSlideTo.restore();
  });

  test('Shrinking UI HandleSendingOut, full, ' +
       'overThreshold = true and toward = "TOP"', function() {
    var stubDebug = this.sinon.stub(shrinkingUI, 'debug');
    var stubState = this.sinon.stub(shrinkingUI, 'isActive').returns(true);

    var oldState = shrinkingUI.state;
    shrinkingUI.state = {
      overThreshold: true,
      toward: 'TOP',
    };

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
      var stubState = this.sinon.stub(shrinkingUI, 'isActive').returns(true);

      var oldState = shrinkingUI.state;
      shrinkingUI.state = state_;

      var stubClearTimeout = this.sinon.stub(window, 'clearTimeout');
      var stubSendingSlideTo = this.sinon.stub(shrinkingUI, '_sendingSlideTo');
      var stubSetTip = this.sinon.stub(shrinkingUI, '_setTip');

      shrinkingUI._handleSendingOut(null);
      assert.isTrue(stubSendingSlideTo.calledWith('BOTTOM'));

      stubSendingSlideTo.getCall(0).args[1]();

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
      toward: 'TOP'
    })
  );

  test('Shrinking UI HandleSendingOut, ' +
       'overThreshold = true and toward != "TOP"',
    handleSendingOutTestFactory({
      overThreshold: true,
      toward: 'NOT_TOP'
    })
  );

  test('Shrinking UI CleanEffects', function() {
    var stubDebug = this.sinon.stub(shrinkingUI, 'debug');
    var stubState = this.sinon.stub(shrinkingUI, 'isActive').returns(true);
    var stubSetState = this.sinon.stub(shrinkingUI, '_setState');
    var stubUpdateTiltTransition =
      this.sinon.stub(shrinkingUI, '_updateTiltTransition');
    var stubUpdateSlideTransition =
      this.sinon.stub(shrinkingUI, '_updateSlideTransition');
    var stubDisableSlidingCover =
      this.sinon.stub(shrinkingUI, '_disableSlidingCover');
    shrinkingUI.cover = {
      remove: function() {}
    };
    var spySlidingCoverRemove = this.sinon.stub(shrinkingUI.cover, 'remove');

    //fakeApp._element = document.createElement('div');
    //var fakeParent = document.createElement('div');
    //fakeParent.appendChild(fakeApp._element);
    shrinkingUI.elements.backgroundElement.classList.remove = this.sinon.spy();
    shrinkingUI.elements.foregroundElement.style.transition =
      'transform 0.3s ease';
    shrinkingUI.elements.foregroundElement.style.transform = 'rotateX(0.0deg)';

    shrinkingUI._cleanEffects();
    assert.isTrue(stubDebug.called);
    assert.isTrue(stubState.called);
    assert.isTrue(spySlidingCoverRemove.called);
    assert.equal(shrinkingUI.elements.foregroundElement.style.transition, '');
    assert.equal(shrinkingUI.elements.foregroundElement.style.transform, '');
    assert.equal(shrinkingUI.elements.foregroundElement.style.transformOrigin,
      '50% 50% 0px');
    assert.isTrue(stubSetState.calledWith(false));
    assert.isTrue(stubUpdateTiltTransition.calledWith(null));
    assert.isTrue(stubUpdateSlideTransition.calledWith(null));
    assert.isTrue(shrinkingUI.elements.backgroundElement.classList.remove
      .calledWith('shrinking-wrapper'));
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
