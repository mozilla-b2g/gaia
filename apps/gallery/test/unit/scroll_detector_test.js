/**
 * Tests for the shared scroll detector helper
 * TODO: Shared code unit tests should not be in gallery
 * Bug #841422 has been filed to move these tests
 */

'use strict';

require('/shared/js/scroll_detector.js');

suite('shared/js/scroll_detector.js', function() {
  var scrollable;
  var content;
  var clock;

  // Keep in sync with the value into scroll_detector.js
  const IDLE_TIME=400;

  function scrollBy(x, y, async) {
    if (!async) {
      // Scroll by steps
      while (x) {
        x-=10;
        scrollable.scrollLeft += Math.min(x, 10);
      }

      while (y) {
        y-=10;
        scrollable.scrollLeft += Math.min(y, 10);
      }

      window.dispatchEvent(new CustomEvent('scroll'));
    } else {
      window.dispatchEvent(new CustomEvent('mozbrowserasyncscroll'));
    }
  }

  setup(function() {
    scrollable = document.createElement('div');
    scrollable.style.height = scrollable.style.width = '200px';
    scrollable.style.overflowX = 'scroll';
    scrollable.style.overflowY = 'scroll';

    content = document.createElement('div');
    content.style.height = content.style.width = '300px';

    scrollable.appendChild(content);

    this.sinon.useFakeTimers();
    clock = this.sinon.clock;
  });

  function checkScrollDetectorForXScroll() {
    checkScrollDetector(10, 0, false);
    checkScrollDetector(10, 0, true);
  }

  function checkScrollDetectorForYScroll() {
    checkScrollDetector(0, 10, false);
    checkScrollDetector(0, 10, true);
  }

  function checkScrollDetectorForXYScroll() {
    checkScrollDetector(10, 10, false);
    checkScrollDetector(10, 10, true);
  }

  function checkScrollDetector(x, y, async) {
    test('Check scrollstart is fired for first scroll', function() {
      var scrollStartHasFired = false;

      window.addEventListener('scrollstart', function onScrollStart(e) {
        window.removeEventListener(e.type, onScrollStart);
        scrollStartHasFired = true;
      });

      scrollBy(0, 10, async);

      assert.isTrue(scrollStartHasFired);
    });

    test('check scrollstart is not fired for following scroll', function() {
      var scrollStartHasFired = false;

      window.addEventListener('scrollstart', function onScrollStart(e) {
        window.removeEventListener(e.type, onScrollStart);
        scrollStartHasFired = true;
      });

      scrollBy(0, 10, async);

      assert.isFalse(scrollStartHasFired);
    });

    test('check scrollend is not fired before IDLE_TIME', function() {
      var scrollEndHasFired = false;

      scrollBy(0, 10, async);

      window.addEventListener('scrollend', function onScrollEnd(e) {
        window.removeEventListener(e.type, onScrollEnd);
        scrollEndHasFired = true;
      });

      clock.tick(IDLE_TIME - 1);

      assert.isFalse(scrollEndHasFired);
    });

    test('check scrollend is fired after IDLE_TIME', function() {
      var scrollEndHasFired = false;

      scrollBy(0, 10, async);

      window.addEventListener('scrollend', function onScrollEnd(e) {
        window.removeEventListener(e.type, onScrollEnd);
        scrollEndHasFired = true;
      });

      this.sinon.clock.tick(IDLE_TIME);

      assert.isTrue(scrollEndHasFired);
    });

    test('check scrollend is delayed after a new scroll', function() {
      var scrollEndHasFired = false;

      // Starts a scroll
      scrollBy(0, 10, async);

      window.addEventListener('scrollend', function onScrollEnd(e) {
        window.removeEventListener(e.type, onScrollEnd);
        scrollEndHasFired = true;
      });

      this.sinon.clock.tick(IDLE_TIME - 1);

      // Starts a new scroll right before the delay in order to reset
      // the timeout
      scrollBy(0, 10, async);

      // Ensure the scrollend event has not fired
      assert.isFalse(scrollEndHasFired);

      this.sinon.clock.tick(IDLE_TIME - 1);

      // Ensure the scrollend event has not fired
      assert.isFalse(scrollEndHasFired);

      this.sinon.clock.tick(1);

      // Ensure the scrollend event fired after the expected idle time
      assert.isTrue(scrollEndHasFired);
    });
  }

  // Starting the tests from here
  checkScrollDetectorForXScroll();
  checkScrollDetectorForYScroll();
  checkScrollDetectorForXYScroll();
});
