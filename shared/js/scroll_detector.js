/*
 * This helper is used to determine when a scroll action has started or
 * when it is finished.
 * It listens for scroll events happening inside the application and
 * fire a scrollstart event for the first scroll and a scrollend event
 * once a no scroll action is following after a given delay.
 *
 */

(function ScrollDetector() {
  'use strict';

  var scrollTimeout = null;

  // IDLE_TIME is the time allowed between 2 scroll actions before
  // considering that the scroll action has finished.
  // It should not be < to the mozbrowserasyncscroll delay defined in
  // gfx/layers/ipc/AsyncPanZoomController.cpp
  const IDLE_TIME = 400;

  var isScrolling = false;
  function handleScroll(e) {
    if (!isScrolling) {
      dispatchScrollStart();
    }

    if (scrollTimeout) {
      window.clearTimeout(scrollTimeout);
    }
    scrollTimeout = window.setTimeout(dispatchScrollEnd, IDLE_TIME);
  }

  function dispatchScrollStart() {
    isScrolling = true;
    dispatchCustomScrollEvent();
  }

  function dispatchScrollEnd() {
    isScrolling = false;
    dispatchCustomScrollEvent();
  }

  function dispatchCustomScrollEvent() {
    var eventName = isScrolling ? 'scrollstart' : 'scrollend';
    window.dispatchEvent(new CustomEvent(eventName));
  }

  window.addEventListener('mozbrowserasyncscroll', handleScroll, true);
  window.addEventListener('scroll', handleScroll, true);
})();

