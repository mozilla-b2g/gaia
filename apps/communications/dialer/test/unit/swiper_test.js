'use strict';

requireApp('communications/dialer/js/swiper.js');

requireApp('communications/dialer/test/unit/mock_calls_handler.js');
requireApp('communications/dialer/test/unit/mock_dialer_oncall.html.js');

var mocksHelperForSwiper = new MocksHelper([
  'CallsHandler'
]).init();

suite('dialer/swiper', function() {
  var previousBody;
  var sCenter,
      sLeft,
      sRight;
  var restoreSpy,
      endSpy,
      answerSpy;

  mocksHelperForSwiper.attachTestHelpers();

  function sendTouchEvent(type, node, coords) {
    if (typeof document.createTouch === 'function') {
      var touch = document.createTouch(window, node, 1,
        coords.x, coords.y, coords.x, coords.y);
      var touchList = document.createTouchList(touch);

      var evt = document.createEvent('TouchEvent');
      evt.initTouchEvent(type, true, true, window,
        0, false, false, false, false,
        touchList, touchList, touchList);
      node.dispatchEvent(evt);
    }
  }

  suiteSetup(function() {
    previousBody = document.body.innerHTML;
    document.body.innerHTML = MockDialerOncallHtml;
    Swiper.init();
    sCenter = Swiper.sliderCenter;
    sLeft = Swiper.sliderLeft,
    sRight = Swiper.sliderRight;
    Swiper.iconWidth = 20;
  });

  suiteTeardown(function() {
    document.body.innerHTML = previousBody;
  });

  setup(function() {
    restoreSpy = this.sinon.spy(Swiper, 'restoreSlider');
    endSpy = this.sinon.spy(CallsHandler, 'end');
    answerSpy = this.sinon.spy(CallsHandler, 'answer');
    // stub getMaxOffset with mock length because we could not get correct
    // position/size without css
    this.sinon.stub(Swiper, '_getMaxOffset', function() {
      return 160;
    });
    this.sinon.useFakeTimers();
  });

  suite('Swiper behavior test', function() {
    test('init status', function() {
      assert.isFalse(Swiper.overlay.classList.contains('touched'));
    });

    test('touch begin', function() {
      var pos = { x: 160, y: 0 };
      sendTouchEvent('touchstart', Swiper.area, pos);
      assert.isTrue(Swiper.overlay.classList.contains('touched'));
      assert.isTrue(restoreSpy.calledWith());
    });

    test('touch move without icon reached', function() {
      var handlerClass = Swiper.sliderHandler.classList;

      // Move to left with 10 px
      var pos = { x: 150, y: 0 };
      sendTouchEvent('touchmove', Swiper.area, pos);
      assert.isTrue(handlerClass.contains('left'));
      assert.equal(sLeft.style.transform, 'translateX(-10px)');
      assert.equal(sRight.style.transform, 'translateX(0px)');

      // Move to right with 10 px
      var pos = { x: 170, y: 0 };
      sendTouchEvent('touchmove', Swiper.area, pos);
      assert.isTrue(handlerClass.contains('right'));
      assert.equal(sRight.style.transform, 'translateX(10px)');
      assert.equal(sLeft.style.transform, 'translateX(0px)');
    });

    test('touch move and reach the icon', function() {
      var handlerClass = Swiper.sliderHandler.classList;

      // Move to left with 160 px, icon is triggered and status changed
      var pos = { x: 0, y: 0 };
      sendTouchEvent('touchmove', Swiper.area, pos);
      assert.isTrue(handlerClass.contains('left'));
      assert.isTrue(Swiper.areaHangup.classList.contains('triggered'));
      assert.isFalse(endSpy.called);

      // Move back to center and status restore
      pos = { x: 160, y: 0 };
      sendTouchEvent('touchmove', Swiper.area, pos);
      assert.isFalse(Swiper.areaHangup.classList.contains('triggered'));

      // Move to right with 160 px
      pos = { x: 320, y: 0 };
      sendTouchEvent('touchmove', Swiper.area, pos);
      assert.isTrue(handlerClass.contains('right'));
      assert.isTrue(Swiper.areaPickup.classList.contains('triggered'));
      assert.isFalse(answerSpy.called);
    });

    test('touch end without icon triggered', function() {
      var pos = { x: 170, y: 0 };
      var sliderParts = [sLeft, sRight, sCenter];
      Swiper._sliderReachEnd = false;
      sendTouchEvent('touchend', Swiper.area, pos);
      assert.isFalse(Swiper.overlay.classList.contains('touched'));
      assert.isTrue(restoreSpy.calledWith(true));
      sliderParts.forEach(function(part) {
        assert.isTrue(part.classList.contains('bounce'));
      });
      assert.isTrue(Swiper.sliderLeft.classList.contains('bounce'));
      assert.isTrue(Swiper.sliderHandler.classList.contains('touched'));

      // slider widgets' status should be restored after bounce back
      sliderParts.forEach(function(part) {
        part.dispatchEvent(new CustomEvent('transitionend'));
        assert.isFalse(part.classList.contains('bounce'));
      });
      assert.isFalse(Swiper.sliderHandler.classList.contains('touched'));
    });

    test('touch end with end icon triggered', function() {
      var start = { x: 160, y: 0 };
      var move = { x: 150, y: 0 };
      var end = { x: 150, y: 0 };
      sendTouchEvent('touchstart', Swiper.area, start);
      sendTouchEvent('touchmove', Swiper.area, move);
      Swiper._sliderReachEnd = true;
      restoreSpy.reset();
      sendTouchEvent('touchend', Swiper.area, end);
      assert.isFalse(Swiper.overlay.classList.contains('touched'));
      assert.isTrue(endSpy.called);

      // Test slider restore it only after screen changed.
      assert.isFalse(restoreSpy.called);
      this.sinon.clock.tick(500);
      assert.isTrue(restoreSpy.called);
    });

    test('touch end with answer icon triggered', function() {
      var start = { x: 160, y: 0 };
      var move = { x: 170, y: 0 };
      var end = { x: 170, y: 0 };
      sendTouchEvent('touchstart', Swiper.area, start);
      sendTouchEvent('touchmove', Swiper.area, move);
      Swiper._sliderReachEnd = true;
      sendTouchEvent('touchend', Swiper.area, end);
      assert.isFalse(Swiper.overlay.classList.contains('touched'));
      assert.isTrue(answerSpy.called);
    });

  });
});
