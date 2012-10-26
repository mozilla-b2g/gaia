'use strict';

var Swiper = {
  /* init */
  init: function ls_init() {
    this.getAllElements();

    this.area.addEventListener('mousedown', this);
    this.areaHandle.addEventListener('mousedown', this);
    this.areaHangup.addEventListener('mousedown', this);
    this.areaPickup.addEventListener('mousedown', this);

    this.overlay.addEventListener('transitionend', this);
  },

  handleEvent: function ls_handleEvent(evt) {
    switch (evt.type) {
      case 'mousedown':
        var leftTarget = this.areaHangup;
        var rightTarget = this.areaPickup;
        var handle = this.areaHandle;
        var overlay = this.overlay;
        var target = evt.target;

        this._touch = {
          target: null,
          touched: false,
          leftTarget: leftTarget,
          rightTarget: rightTarget,
          railLeftWidth: this.railLeft.offsetWidth,
          railRightWidth: this.railRight.offsetWidth,
          overlayWidth: this.overlay.offsetWidth,
          handleWidth: this.areaHandle.offsetWidth,
          maxHandleOffset: rightTarget.offsetLeft - handle.offsetLeft -
            (handle.offsetWidth - rightTarget.offsetWidth) / 2
        };
        window.addEventListener('mouseup', this);
        window.addEventListener('mousemove', this);

        switch (target) {
          case leftTarget:
            overlay.classList.add('touched-left');
            break;

          case rightTarget:
            overlay.classList.add('touched-right');
            break;

          case this.areaHandle:
            this._touch.touched = true;
            this._touch.initX = evt.pageX;
            this._touch.initY = evt.pageY;

            overlay.classList.add('touched');
            break;

          case this.accessibilityPickup:
            overlay.classList.add('touched');
            this.areaPickup.classList.add('triggered');
            this.areaHandle.classList.add('triggered');
            this._touch.target = this.areaPickup;
            this.handleGesture();
            break;

          case this.accessibilityHangup:
            overlay.classList.add('touched');
            this.areaPickup.classList.add('triggered');
            this.areaHandle.classList.add('triggered');
            this._touch.target = this.areaHangup;
            this.handleGesture();
            break;
        }
        break;

      case 'mousemove':
        this.handleMove(evt.pageX, evt.pageY);
        break;

      case 'mouseup':
        var handle = this.areaHandle;
        window.removeEventListener('mousemove', this);
        window.removeEventListener('mouseup', this);

        this.overlay.classList.remove('touched-left');
        this.overlay.classList.remove('touched-right');

        this.handleMove(evt.pageX, evt.pageY);
        this.handleGesture();
        delete this._touch;
        this.overlay.classList.remove('touched');

        break;
    }
  },

  setRailWidth: function ls_setRailWidth(left, right) {
    var touch = this._touch;
    this.railLeft.style.transform = 'scaleX(' + (left / touch.railLeftWidth) + ')';
    this.railRight.style.transform = 'scaleX(' + (right / touch.railRightWidth) + ')';
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
      overlay.classList.remove('touched-left');
      overlay.classList.remove('touched-right');
      overlay.classList.add('touched');
    }

    var dx = pageX - touch.initX;

    var handleMax = touch.maxHandleOffset;
    this.areaHandle.style.MozTransition = 'none';
    this.areaHandle.style.MozTransform =
      'translateX(' + Math.max(- handleMax, Math.min(handleMax, dx)) + 'px)';

    var railMax = touch.railLeftWidth;
    var railLeft = railMax + dx;
    var railRight = railMax - dx;

    this.setRailWidth(Math.max(0, Math.min(railMax * 2, railLeft)),
                      Math.max(0, Math.min(railMax * 2, railRight)));

    var base = touch.overlayWidth / 4;
    var opacity = Math.max(0.1, (base - Math.abs(dx)) / base);

    if (dx > 0) {
      touch.rightTarget.style.opacity =
        this.railRight.style.opacity = '';
      touch.leftTarget.style.opacity =
        this.railLeft.style.opacity = opacity;
    } else {
      touch.rightTarget.style.opacity =
        this.railRight.style.opacity = opacity;
      touch.leftTarget.style.opacity =
        this.railLeft.style.opacity = '';
    }

    var handleWidth = touch.handleWidth;

    if (railLeft < handleWidth / 2) {
      touch.leftTarget.classList.add('triggered');
      touch.rightTarget.classList.remove('triggered');
      touch.target = touch.leftTarget;
    } else if (railRight < handleWidth / 2) {
      touch.leftTarget.classList.remove('triggered');
      touch.rightTarget.classList.add('triggered');
      touch.target = touch.rightTarget;
    } else {
      touch.leftTarget.classList.remove('triggered');
      touch.rightTarget.classList.remove('triggered');
      touch.target = null;
    }
  },

  handleGesture: function ls_handleGesture() {
    var self = this;
    var touch = this._touch;
    var target = touch.target;
    this.areaHandle.style.MozTransition = null;

    if (!target) {
      self.areaHandle.style.MozTransform =
        self.areaPickup.style.opacity =
        self.railRight.style.opacity =
        self.areaHangup.style.opacity =
        self.railLeft.style.opacity =
        self.railRight.style.width =
        self.railLeft.style.width = '';
      self.areaHandle.classList.remove('triggered');
      self.areaHangup.classList.remove('triggered');
      self.areaPickup.classList.remove('triggered');
      return;
    }

    var distance = target.offsetLeft - this.areaHandle.offsetLeft -
      (this.areaHandle.offsetWidth - target.offsetWidth) / 2;
    this.areaHandle.classList.add('triggered');

    var transition = 'translateX(' + distance + 'px)';
    var railLength = touch.rightTarget.offsetLeft -
      touch.leftTarget.offsetLeft -
      (this.areaHandle.offsetWidth + target.offsetWidth) / 2;

    switch (target) {
      case this.areaHangup:
        this.setRailWidth(0, railLength);
        OnCallHandler.end();
        break;

      case this.areaPickup:
        this.setRailWidth(railLength, 0);
        OnCallHandler.answer();
        break;
    }
  },

  getAllElements: function ls_getAllElements() {
    // ID of elements to create references
    var elements = ['area', 'area-pickup', 'area-hangup', 'area-handle',
        'rail-left', 'rail-right',
        'accessibility-hangup', 'accessibility-pickup'];

    var toCamelCase = function toCamelCase(str) {
      return str.replace(/\-(.)/g, function replacer(str, p1) {
        return p1.toUpperCase();
      });
    }

    elements.forEach((function createElementRef(name) {
      this[toCamelCase(name)] = document.getElementById('swiper-' + name);
    }).bind(this));

    this.overlay = document.getElementById('main-container');
    this.mainScreen = document.getElementById('call-screen');
  }
};

Swiper.init();
