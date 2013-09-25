'use strict';

var Swiper = {
  /*
  * Timeout ID for backing from triggered state to normal state
  */
  triggeredTimeoutId: 0,

  /*
  * timeout for triggered state after swipe up
  */
  TRIGGERED_TIMEOUT: 5000,

  /*
  * slider distance for showing fade-in effect.
  */
  FADEIN_DISTANCE: 35,

  /*
  * If user is sliding.
  */
  _sliderPulling: false,

  /*
  * If user released the finger and the handler had already
  * reached one of the ends.
  */
  _sliderReachEnd: false,

  /*
  * Detect if sliding crossed the middle line.
  */
  _slidingToward: '',

  _getMaxOffset: function ls_getMaxOffset() {
    var leftIcon = this.areaHangup;
    var rightIcon = this.areaPickup;
    var areaW = this.areaWidth;
    var trackLength = rightIcon.offsetLeft - leftIcon.offsetLeft + areaW;
    var maxLength = Math.floor(trackLength / 2);
    return maxLength - areaW + this.iconWidth - this.sliderEdgeWidth;
  },
  /* init */
  init: function ls_init() {
    this.getAllElements();

    this.area.addEventListener('touchstart', this);
    this.overlay.addEventListener('transitionend', this);
  },

  handleEvent: function ls_handleEvent(evt) {
    switch (evt.type) {
      case 'touchstart':
        var overlay = this.overlay;
        if (evt.target === this.area)
          this.handleSlideBegin();

        this._touch = {};
        window.addEventListener('touchend', this);
        window.addEventListener('touchmove', this);

        this._touch.touched = true;
        this._touch.initX = evt.touches[0].pageX;
        this._touch.initY = evt.touches[0].pageY;

        this.handleMove(this._touch.initX, this._touch.initY);
        overlay.classList.add('touched');
        break;

      case 'touchmove':
        this.handleMove(evt.touches[0].pageX, evt.touches[0].pageY);
        this.handleSlide();
        break;

      case 'touchend':
        window.removeEventListener('touchmove', this);
        window.removeEventListener('touchend', this);
        if (evt.touches.length > 0) {
          this.handleMove(evt.touches[0].pageX, evt.touches[0].pageY);
        }
        this.handleSlideEnd();
        delete this._touch;
        this.overlay.classList.remove('touched');

        break;
    }
  },

  handleSlideBegin: function ls_handleSlideBegin() {
    this.restoreSlider();
  },

  handleSlide: function ls_handleSlide() {

    if (!this._sliderPulling)
      return;

    var tx = this._touch.tx;
    var dir = 'right';
    if (0 > tx)
      var dir = 'left';

    // Drag from left to right or counter-direction.
    if ('' !== this._slidingToward && dir !== this._slidingToward) {
      this.restoreSlider();
    }
    this._slidingToward = dir;

    // Unsigned.
    var utx = Math.abs(tx);

    // XXX: the overlay area between center and the left & right.
    // When the movement offset is even (86px for ex),
    // the glitch will be the left, and when it's odd,
    // the glitch will be the right.
    var glitchC = 0;

    // Thanks the color effect on the slider, we can overlay icons
    // without any obvious glitches.
    var glitchS = 5;


    // XXX: lots of try and errors
    if ('right' === dir) {
      glitchC = (0 === utx % 2) ? -1 : 0;
    } else {
      glitchC = (0 === utx % 2) ? 0 : 0;
    }

    var leftIcon = this.areaHangup;
    var rightIcon = this.areaPickup;
    var offset = utx;
    var maxOffset = this._getMaxOffset();

    // If the front-end slider reached the boundary.
    // We plus and minus the icon width because maxLength should be fixed,
    // and only the handler and the blue occured area should be adjusted.
    if (offset + (this.iconWidth / 2) > maxOffset) {
      var target = 'left' === dir ? leftIcon : rightIcon;
      this._sliderReachEnd = true;
      offset = Math.min(maxOffset, offset);
      target.classList.add('triggered');

    } else {
      leftIcon.classList.remove('triggered');
      rightIcon.classList.remove('triggered');
      this._sliderReachEnd = false;
    }

    // Start to paint the slider.
    this.sliderLeft.classList.add('pulling');
    this.sliderRight.classList.add('pulling');

    var subject = ('right' === dir) ? this.sliderRight : this.sliderLeft;
    var cntsubject = ('right' === dir) ? this.sliderLeft : this.sliderRight;
    var counterDir = ('right' === dir) ? 'left' : 'right';

    // 'translateX' will move it according to the left border.
    if ('right' === dir) {
      subject.style.transform = 'translateX(' + offset + 'px)';
    } else {
      subject.style.transform = 'translateX(-' + offset + 'px)';
    }
    this.sliderHandler.classList.remove(counterDir);
    this.sliderHandler.classList.add(dir);

    // Need to set this to let transition event triggered while
    // we bounce the handlers back.
    // @see `restoreSlider`
    cntsubject.style.transform = 'translateX(0px)';

    // Move center as long as half of the offset, then scale it.
    var cMove = Math.floor(offset / 2 + glitchC);
    var cScale = offset + glitchS;

    if ('right' === dir) {
      this.sliderCenter.style.transform = 'translateX(' + cMove + 'px)';
    } else {
      this.sliderCenter.style.transform = 'translateX(-' + cMove + 'px)';
    }
    this.sliderCenter.style.transform += 'scaleX(' + cScale + ')';

    // Add slider opacity effect.
    this.sliderHandler.style.opacity = cScale / this.FADEIN_DISTANCE;

    // Add the effects to slider handler.
    this.sliderHandler.classList.add('touched');
  },

  // Restore all slider elements.
  //
  // easing {Boolean} true|undefined to bounce back slowly.
  restoreSlider: function ls_restoreSlider(easing) {
    // To prevent magic numbers...
    var sh = this.sliderHandler;
    var sliderParts = [this.sliderLeft, this.sliderRight, this.sliderCenter];
    var numbers = sliderParts.length;
    var exit = 0;
    // Mimic the `getAllElements` function...
    sliderParts.forEach(function ls_rSlider(h) {
        if (easing) {

          // Add transition to let it bounce back slowly.
          h.classList.add('bounce');
          var tsEnd = function ls_tsEnd(evt) {
            h.style.transition = '';

            // Remove the effects to these icons.
            h.classList.remove('bounce');
            h.removeEventListener('transitionend', tsEnd);
            if (++exit < numbers) {
              return;
            }
            sh.style.opacity = 1;
            sh.classList.remove('touched');
          };
          h.addEventListener('transitionend', tsEnd);

        } else {
          // Reset slider elements status
          h.style.transition = '';

          // Reset slider color & opacity
          sh.style.opacity = 1;
          sh.classList.remove('touched');

        }

        // After setup, bounce it back.
        h.style.transform = '';
    });

    this._sliderPulling = true;
    this._sliderReachEnd = false;
  },

  handleSlideEnd: function ls_handleSlideEnd() {

    // Bounce back to the center immediately.
    if (false === this._sliderReachEnd) {
      this.restoreSlider(true);
    } else {
      var leftIcon = this.areaHangup;
      var rightIcon = this.areaPickup;
      var tx = this._touch.tx;
      var target = (tx > 0) ? rightIcon : leftIcon;
      this.handleIconTriggered(target);
      // Restore it only after screen changed.
      var appLaunchDelay = 400;
      setTimeout(this.restoreSlider.bind(this, true), appLaunchDelay);
    }
    this._sliderPulling = false;
  },

  handleMove: function ls_handleMove(pageX, pageY) {
    var touch = this._touch;

    if (!touch.touched) {
      touch.touched = true;
      touch.initX = pageX;
      touch.initY = pageY;

      var overlay = this.overlay;
      overlay.classList.add('touched');
    }

    touch.tx = pageX - touch.initX;
    touch.ty = pageY - touch.initY;
  },

  handleIconTriggered: function sw_handleIconTriggered(target) {
    if (target === this.areaHangup) {
      CallsHandler.end();
    } else if (target === this.areaPickup) {
      CallsHandler.answer();
    }
  },

  getAllElements: function ls_getAllElements() {
    // ID of elements to create references
    var elements = ['area', 'area-pickup', 'area-hangup', 'area-handle',
        'icon-container', 'hangup-mask', 'pickup-mask', 'area-slider',
        'slider-handler', 'accessibility-hangup', 'accessibility-pickup'];

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    elements.forEach((function createElementRef(name) {
      this[toCamelCase(name)] = document.getElementById('swiper-' + name);
    }).bind(this));

    this.overlay = document.getElementById('main-container');
    this.mainScreen = document.getElementById('call-screen');
    this.areaPickup = document.querySelector('#swiper-area-pickup');
    this.areaHangup = document.querySelector('#swiper-area-hangup');
    this.areaWidth = this.areaPickup.clientWidth;
    this.iconPickup = document.querySelector('#swiper-area-pickup > div');
    this.iconHangup = document.querySelector('#swiper-area-hangup > div');
    this.iconWidth = this.iconPickup.clientWidth;

    this.sliderLeft = this.sliderHandler.querySelector('.swiper-slider-left');
    this.sliderCenter =
      this.sliderHandler.querySelector('.swiper-slider-center');
    this.sliderRight = this.sliderHandler.querySelector('.swiper-slider-right');
    this.sliderEdgeWidth = this.sliderLeft.clientWidth;
  }
};

Swiper.init();
