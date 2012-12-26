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
  * Max value for handle swiper up
  */
  HANDLE_MAX: 70,

  /* init */
  init: function ls_init() {
    this.getAllElements();

    this.area.addEventListener('mousedown', this);
    this.areaHangup.addEventListener('click', this);
    this.areaPickup.addEventListener('click', this);
    this.overlay.addEventListener('transitionend', this);

    this.setElasticEnabled(true);
  },

  handleEvent: function ls_handleEvent(evt) {
    switch (evt.type) {
      case 'mousedown':
        var leftTarget = this.areaHangup;
        var rightTarget = this.areaPickup;
        var handle = this.areaHandle;
        var overlay = this.overlay;
        var target = evt.target;

        if (overlay.classList.contains('triggered')) {
          clearTimeout(this.triggeredTimeoutId);
          this.triggeredTimeoutId = setTimeout(this.unloadPanel.bind(this),
                                               this.TRIGGERED_TIMEOUT);
          break;
        }

        this.setElasticEnabled(false);

        this._touch = {};
        window.addEventListener('mouseup', this);
        window.addEventListener('mousemove', this);

        this._touch.touched = true;
        this._touch.initX = evt.pageX;
        this._touch.initY = evt.pageY;
        overlay.classList.add('touched');
        break;

      case 'mousemove':
        this.handleMove(evt.pageX, evt.pageY);
        break;

      case 'mouseup':
        var handle = this.areaHandle;
        window.removeEventListener('mousemove', this);
        window.removeEventListener('mouseup', this);

        this.handleMove(evt.pageX, evt.pageY);
        this.handleGesture();
        delete this._touch;
        this.overlay.classList.remove('touched');

        break;
      case 'click':
        clearTimeout(this.triggeredTimeoutId);
        switch (evt.target) {
          case this.areaHangup:
            OnCallHandler.end();
            break;

          case this.areaPickup:
            OnCallHandler.answer();
            break;
        }
        break;
    }
  },

  handleMove: function ls_handleMove(pageX, pageY) {
    var touch = this._touch;

    if (!touch.touched) {
      // Do nothing if the user have not move the finger to the handle yet
      if (document.elementFromPoint(pageX, pageY) !== this.areaHandle)
        return;

      touch.touched = true;
      touch.initX = pageX;
      touch.initY = pageY;

      var overlay = this.overlay;
      overlay.classList.add('touched');
    }

    var dy = pageY - touch.initY;
    var ty = Math.max(- this.HANDLE_MAX, dy);
    var base = - ty / this.HANDLE_MAX;
    // mapping position 20-100 to opacity 0.1-0.5
    var opacity = base <= 0.2 ? 0.1 : base * 0.5;
    touch.ty = ty;
    this.iconContainer.style.transform = 'translateY(' + ty + 'px)';
    this.iconPickup.style.opacity =
      this.iconHangup.style.opacity = opacity;
  },

  handleGesture: function ls_handleGesture() {
    var touch = this._touch;

    if (touch.ty < -50) {
      this.areaHandle.style.transform =
        this.areaHandle.style.opacity =
        this.iconHangup.style.opacity =
        this.iconPickup.style.opacity =
        this.iconContainer.style.transform =
        this.iconContainer.style.opacity = '';
      this.overlay.classList.add('triggered');

      this.triggeredTimeoutId =
        setTimeout(this.unloadPanel.bind(this), this.TRIGGERED_TIMEOUT);
    } else {
      this.unloadPanel();
      this.setElasticEnabled(true);
    }
  },

  getAllElements: function ls_getAllElements() {
    // ID of elements to create references
    var elements = ['area', 'area-pickup', 'area-hangup', 'area-handle',
        'icon-container', 'hangup-mask', 'pickup-mask',
        'accessibility-hangup', 'accessibility-pickup'];

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
    this.iconPickup = document.querySelector('#swiper-area-pickup > div');
    this.iconHangup = document.querySelector('#swiper-area-hangup > div');
  },

  setElasticEnabled: function ls_setElasticEnabled(value) {
    if (value)
      this.overlay.classList.add('elastic');
    else
      this.overlay.classList.remove('elastic');
  },

  unloadPanel: function ls_unloadPanel() {
    this.areaHandle.style.transform =
      this.iconPickup.style.transform =
      this.iconHangup.style.transform =
      this.iconContainer.style.transform =
      this.iconContainer.style.opacity =
      this.iconPickup.style.opacity =
      this.iconHangup.style.opacity = '';
    this.overlay.classList.remove('triggered');
    this.iconPickup.classList.remove('triggered');
    this.iconHangup.classList.remove('triggered');

    clearTimeout(this.triggeredTimeoutId);
    this.setElasticEnabled(true);
  }
};

Swiper.init();
