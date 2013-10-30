(function() {
  'use strict';

  function NativeScroll(el, initOptions) {
    var self = this,
        startPos,
        startPointer,
        positionKey,
        dirProperty,
        altDirProperty,
        reportedDirection,
        options = {
            'hScroll': false,
            'vScroll': true
        },
        optionsOnScrollStart,
        optionsOnScrollMove,
        optionsOnScrollEnd,
        optionsOnTouchStart,
        optionsOnTouchMove,
        optionsOnTouchEnd,

        scrollEventListener,

        // once swiped more than this value in the correct direction,
        // cancel system swipe altogether
        THRESHOLD_DISALLOW_SYSTEM_SWIPE = 5 * window.innerWidth / 100,
        // release system swipe (out of e.me)
        // only after finger had passed this value
        THRESHOLD_ALLOW_SYSTEM_SWIPE = 10 * window.innerWidth / 100;

    for (var key in initOptions) {
      options[key] = initOptions[key];
    }

    positionKey = options.hScroll ? 0 : 1;
    dirProperty = positionKey === 0 ? 'distX' : 'distY';
    altDirProperty = dirProperty === 'distY' ? 'distX' : 'distY';

    el.style.cssText += ';overflow-y: ' +
                        (options.vScroll ? 'auto' : 'hidden') +
                        ';overflow-x: ' + (options.hScroll ? 'auto' : 'hidden');


    // scroll event handlers
    optionsOnScrollStart = options.onScrollStart;
    optionsOnScrollMove = options.onScrollMove;
    optionsOnScrollEnd = options.onScrollEnd;

    // touch event handlers
    optionsOnTouchStart = options.onTouchStart;
    optionsOnTouchMove = options.onTouchMove;
    optionsOnTouchEnd = options.onTouchEnd;

    // event bindings
    el.addEventListener('touchstart', onTouchStart);
    scrollEventListener = new ScrollEventListener({
      'el': el,
      'onMove': onScrollMove,
      'onEnd': onScrollEnd
    });

    updateY();

    this.distY = 0;
    this.distX = 0;
    this.maxX = 0;
    this.maxY = 0;
    this.hScroll = options.hScroll;
    this.vScroll = options.vScroll;

    this.refresh = function refresh() {
      // for backwrads compitability with iScroll
      // this is not needed
    };

    this.scrollTo = function scrollTo(x, y) {
      x !== undefined && (el.scrollLeft = x);
      y !== undefined && (el.scrollTop = y);
    };

    function onTouchStart(e) {
      var touch = 'touches' in e ? e.touches[0] : e;

      el.dataset.touched = true;

      reportedDirection = false;
      startPos = [el.scrollLeft, el.scrollTop];
      startPointer = [touch.pageX, touch.pageY];
      self.maxX = el.scrollWidth - el.offsetWidth;
      self.maxY = el.scrollHeight - el.offsetHeight;
      self.distX = 0;
      self.distY = 0;

      el.addEventListener('touchmove', onTouchMove);
      el.addEventListener('touchend', onTouchEnd, true);

      scrollEventListener.start();

      optionsOnTouchStart && optionsOnTouchStart(e);
    }

    function onTouchMove(e) {
      // messages panning handler to prevent it
      e.preventPanning = true;

      var currPos = [el.scrollLeft, el.scrollTop],
          touch = 'touches' in e ? e.touches[0] : e;

      updateY();
      self.distX = touch.pageX - startPointer[0];
      self.distY = touch.pageY - startPointer[1];

      if (!reportedDirection) {
        if (Math.abs(self[dirProperty]) >= THRESHOLD_DISALLOW_SYSTEM_SWIPE) {
          reportedDirection = true;
        } else if (Math.abs(self[altDirProperty]) >=
                                                THRESHOLD_ALLOW_SYSTEM_SWIPE) {
          reportedDirection = true;
          // messages panning handler to pan normally
          e.preventPanning = false;
        }
      }

      optionsOnTouchMove && optionsOnTouchMove(e);
    }

    function onTouchEnd(e) {
      el.dataset.touched = false;

      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd, true);

      scrollEventListener.stop();

      updateY();
      optionsOnTouchEnd && optionsOnTouchEnd(e);
    }

    function onScrollStart(e) {
      el.dataset.scrolling = true;
      optionsOnScrollStart && optionsOnScrollStart(e);
    }

    function onScrollMove(e, first) {
      updateY();
      first && onScrollStart(e);
      optionsOnScrollMove && optionsOnScrollMove(e);
    }

    function onScrollEnd(e) {
      el.dataset.scrolling = false;
      optionsOnScrollEnd && optionsOnScrollEnd(e);
    }

    function updateY() {
      self.y = el.scrollTop;
    }
  }

  function ScrollEventListener(cfg) {
    var onMove = cfg.onMove || function() {};
    var onEnd = cfg.onEnd || function() {};

    var hadScrolled = false,
        isScrolling = false,
        shouldKeepListening,
        interval, intervalDelay = 100;

    cfg.el.addEventListener('scroll', onScroll);

    this.start = function(type) {
      shouldKeepListening = true;
    };

    this.stop = function(type) {
      shouldKeepListening = false;
    };

    function onScroll(e) {
      // if started scrolling, start listening to scroll stop
      if (!interval) {
        interval = setInterval(checkIfScrolled, intervalDelay);
      }
      // indicated a scroll had been triggered
      hadScrolled = true;
      onMove(e, !isScrolling);

      !isScrolling && (isScrolling = true);
    }

    function checkIfScrolled() {
      // if there was a scroll event
      if (!hadScrolled && !shouldKeepListening) {
        // stop listening
        interval = window.clearInterval(interval);

        isScrolling = false;

        // activate callback
        onEnd();
      } else {
        // reset indication
        hadScrolled = false;
      }
    }
  }

  window.Scroll = NativeScroll;

}());
