'use strict';

var Swiper = {
  /*
  * Timeout ID for backing from triggered state to normal state
  */
  triggeredTimeoutId: 0,

  /*
  * Interval ID for elastic of curve and arrow
  */
  elasticIntervalId: 0,

  /*
  * start/end curve/mask path data (position, curve control point)
  */
  CURVE_START_DATA: 'M0,80 C100,150 220,150 320,80',
  CURVE_END_DATA: 'M0,80 C100,-20 220,-20 320,80',
  CURVE_MASK_START_DATA: 'M0,80 C100,150 220,150 320,80 V 150 H 0 Z',
  CURVE_MASK_END_DATA: 'M0,80 C100,-20 220,-20 320,80 V 150 H 0 Z',

  /*
  * curve/mask transform const parameters
  */
  CURVE_TRANSFORM_DATA: ['M0,80 C100,', '0', ' 220,', '0', ' 320,80'],
  CURVE_MASK_TRANSFORM_DATA: ['M0,80 C100,', '0', ' 220,', '0',
                              ' 320,80 V 150 H 0 Z'],

  /*
  * control points coordinate y for CURVE_TRANSFORM_DATA
  */
  CURVE_TRANSFORM_Y1_INDEX: 1,
  CURVE_TRANSFORM_Y2_INDEX: 3,

  /*
  * jumping elastic interval
  */
  ELASTIC_INTERVAL: 4000,

  /*
  * timeout for triggered state after swipe up
  */
  TRIGGERED_TIMEOUT: 5000,

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

        if (target === leftTarget || target === rightTarget) {
          break;
        }

        if (overlay.classList.contains('triggered') &&
            target != leftTarget && target != rightTarget) {
          this.unloadPanel();
          break;
        }

        this.iconContainer.classList.remove('elastic');
        this.setElasticEnabled(false);
        Array.prototype.forEach.call(this.startAnimation, function(el) {
          el.endElement();
        });

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
    var handleMax = window.innerHeight / 4;
    var ty = Math.max(- handleMax, dy);
    var opacity = - ty / handleMax;
    // Curve control point coordinate Y
    var cy = 150 - opacity * 150;
    touch.cy = cy;
    var curvedata = [].concat(this.CURVE_TRANSFORM_DATA);
    curvedata[this.CURVE_TRANSFORM_Y1_INDEX] = cy;
    curvedata[this.CURVE_TRANSFORM_Y2_INDEX] = cy;
    var maskdata = [].concat(this.CURVE_MASK_TRANSFORM_DATA);
    maskdata[this.CURVE_TRANSFORM_Y1_INDEX] = cy;
    maskdata[this.CURVE_TRANSFORM_Y2_INDEX] = cy;

    this.iconContainer.style.transform = 'translateY(' + ty / 1.5 + 'px)';
    this.iconContainer.style.opacity = 0.4;
    this.curvepath.setAttribute('d', curvedata.join(''));
    this.hangupMask.setAttribute('d', maskdata.join(''));
    this.pickupMask.setAttribute('d', maskdata.join(''));
    this.areaHandle.setAttribute('y', 100 - opacity * 100);
  },

  handleGesture: function ls_handleGesture() {
    var handleMax = window.innerHeight / 4;
    var touch = this._touch;

    if (touch.cy < 80) {
      Array.prototype.forEach.call(this.endAnimation, function(el) {
        el.setAttribute('fill', 'freeze');
        el.beginElement();
      });
      var self = this;
      this.curvepath.addEventListener('endEvent', function endEvent() {
        self.curvepath.removeEventListener('endEvent', endEvent);
        self.curvepath.setAttribute('d', self.CURVE_END_DATA);
        self.curvepath.setAttribute('stroke-opacity', 0);
        self.hangupMask.setAttribute('d', self.CURVE_MASK_END_DATA);
        self.hangupMask.setAttribute('fill-opacity', 0);
        self.pickupMask.setAttribute('d', self.CURVE_MASK_END_DATA);
        self.pickupMask.setAttribute('fill-opacity', 0);
        self.areaHandle.setAttribute('y', 0);
        self.areaHandle.setAttribute('opacity', 0);

        Array.prototype.forEach.call(self.endAnimation, function(el) {
          el.removeAttribute('fill');
        });
      });
      this.areaHandle.style.transform =
        this.areaHandle.style.opacity =
        this.iconContainer.style.transform =
        this.iconContainer.style.opacity = '';
      this.overlay.classList.add('triggered');

      this.triggeredTimeoutId =
        setTimeout(this.unloadPanel.bind(this), this.TRIGGERED_TIMEOUT);
    }
    else {
      this.unloadPanel();
    }
  },

  getAllElements: function ls_getAllElements() {
    // ID of elements to create references
    var elements = ['area', 'area-pickup', 'area-hangup', 'area-handle',
        'icon-container', 'curvepath', 'hangup-mask', 'pickup-mask',
        'accessibility-hangup', 'accessibility-pickup'];
    var elementsForClass = ['start-animation', 'end-animation',
        'elastic-animation'];

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    };

    elements.forEach((function createElementRef(name) {
      this[toCamelCase(name)] = document.getElementById('swiper-' + name);
    }).bind(this));

    elementsForClass.forEach((function createElementsRef(name) {
      this[toCamelCase(name)] =
        document.querySelectorAll('.swiper-' + name);
    }).bind(this));

    this.overlay = document.getElementById('main-container');
    this.mainScreen = document.getElementById('call-screen');
  },

  playElastic: function ls_playElastic() {
    if (this._touch && this._touch.touched)
      return;
    var forEach = Array.prototype.forEach;
    forEach.call(this.elasticAnimation, function(el) {
      el.beginElement();
    });
    this.overlay.classList.add('elastic');

    var self = this;
    this.iconContainer.addEventListener('animationend',
      function animationend() {
        self.iconContainer.removeEventListener('animationend', animationend);
        self.overlay.classList.remove('elastic');
      });
  },

  setElasticEnabled: function ls_setElasticEnabled(value) {
    if (value && !this.elasticIntervalId) {
      this.elasticIntervalId =
        setInterval(this.playElastic.bind(this), this.ELASTIC_INTERVAL);
    }
    else if (!value && this.elasticIntervalId) {
      clearInterval(this.elasticIntervalId);
      this.elasticIntervalId = 0;
    }
  },

  unloadPanel: function ls_unloadPanel() {
    var self = this;

    Array.prototype.forEach.call(self.startAnimation, function(el) {
      el.setAttribute('fill', 'freeze');
      el.beginElement();
    });
    self.curvepath.addEventListener('endEvent', function eventend() {
      self.curvepath.removeEventListener('endEvent', eventend);
      self.curvepath.setAttribute('d', self.CURVE_START_DATA);
      self.curvepath.setAttribute('stroke-opacity', '1.0');
      self.hangupMask.setAttribute('d', self.CURVE_MASK_START_DATA);
      self.hangupMask.setAttribute('fill-opacity', '1.0');
      self.pickupMask.setAttribute('d', self.CURVE_MASK_START_DATA);
      self.pickupMask.setAttribute('fill-opacity', '1.0');
      self.areaHandle.setAttribute('y', 100);
      self.areaHandle.setAttribute('opacity', 1);
      Array.prototype.forEach.call(self.startAnimation, function(el) {
        el.removeAttribute('fill');
      });
    });

    self.areaHandle.style.transform =
      self.areaPickup.style.transform =
      self.areaHangup.style.transform =
      self.iconContainer.style.transform =
      self.iconContainer.style.opacity =
      self.areaPickup.style.opacity =
      self.areaHangup.style.opacity = '';
    self.overlay.classList.remove('triggered');
    self.areaPickup.classList.remove('triggered');
    self.areaHangup.classList.remove('triggered');

    clearTimeout(self.triggeredTimeoutId);
    self.setElasticEnabled(true);
  }
};

Swiper.init();
