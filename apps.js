
'use strict';

var Apps = {
  events: ['keypress', 'unload'],
  handleEvent: function apps_handleEvent(evt) {
    switch (evt.type) {
      case 'keypress':
        if (evt.keyCode != evt.DOM_VK_ESCAPE)
          break;
        evt.preventDefault();

        var event = document.createEvent('UIEvents');
        event.initUIEvent('appclose', true, true, window, 0);
        window.top.dispatchEvent(event);
        break;
      case 'unload':
        this.uninit();
        break;
    }
  },

  init: function apps_init() {
    this.events.forEach((function(evt) {
      window.addEventListener(evt, this, true);
    }).bind(this));

    TouchEventHandler.start();
    TouchHandler.start();
  },

  uninit: function apps_uninit() {
    this.events.forEach((function(evt) {
      window.removeEventListener(evt, this, true);
    }).bind(this));

    TouchEventHandler.stop();
    TouchHandler.stop();
  }
};

var TouchHandler = {
  events: ['touchstart', 'touchmove', 'touchend'],
  start: function th_start() {
    this.events.forEach((function(evt) {
      window.addEventListener(evt, this, false);
    }).bind(this));
  },
  stop: function th_stop() {
    this.events.forEach((function(evt) {
      window.removeEventListener(evt, this, false);
    }).bind(this));
  },
  onTouchStart: function th_touchStart(evt) {
    this.startX = this.lastX = evt.pageX;
    this.startY = this.lastY = evt.pageY;
  },
  onTouchEnd: function th_touchEnd(evt) {
    this.startX = this.startY = 0;
    this.lastX = this.lastY = 0;
  },
  onTouchMove: function th_touchMove(evt) {
    var offsetX = this.lastX - evt.pageX;
    var offsetY = this.lastY - evt.pageY;

    var element = this.target;
    element.scrollLeft += offsetX;
    element.scrollTop += offsetY;

    this.lastX = evt.pageX;
    this.lastY = evt.pageY;
  },
  isPan: function isPan(x1, y1, x2, y2) {
    var kRadius = 10;
    return Math.abs(x1 - x2) > kRadius || Math.abs(y1 - y2) > kRadius;
  },
  handleEvent: function th_handleEvent(evt) {
    if (evt.getPreventDefault())
      return;

    switch (evt.type) {
      case 'touchstart':
        evt.preventDefault();
        this.target = evt.originalTarget;
        this.onTouchStart(evt.touches ? evt.touches[0] : evt);
        break;
      case 'touchmove':
        if (!this.target)
          break;
        evt.preventDefault();

        var touchEvent = evt.touches ? evt.touches[0] : evt;
        if (!this.panning) {
          var pan = this.isPan(evt.pageX, evt.pageY, this.startX, this.startY);
          if (pan) {
            this.panning = true;
            this.startX = this.lastX = touchEvent.pageX;
            this.startY = this.lastY = touchEvent.pageY;
            this.target.setAttribute('panning', true);
          }
        }
        this.onTouchMove(touchEvent);
        break;
      case 'touchend':
        if (!this.target)
          return;
        evt.preventDefault();

        if (this.panning) {
          this.target.removeAttribute('panning');
          this.panning = null;
          this.onTouchEnd(evt.touches ? evt.touches[0] : evt);
        }
        this.target = null;
      break;
    }
  }
};

var TouchEventHandler = {
  events: ['mousedown', 'mousemove', 'mouseup', 'mouseout'],
  start: function teh_start() {
    this.events.forEach((function(evt) {
      window.addEventListener(evt, this, true);
    }).bind(this));
  },
  stop: function teh_stop() {
    this.events.forEach((function(evt) {
      window.removeEventListener(evt, this, true);
    }).bind(this));
  },
  handleEvent: function teh_handleEvent(evt) {
    var type = '';
    switch (evt.type) {
      case 'mousedown':
        this.target = evt.target;
        type = 'touchstart';
        break;
      case 'mousemove':
        type = 'touchmove';
        break;
      case 'mouseup':
        this.target = null;
        type = 'touchend';
        break;
      case 'mouseout':
        this.target = null;
        type = 'touchcancel';
        break;
    }

    if (this.target)
      this.sendTouchEvent(evt, this.target, type);
  },
  uuid: 0,
  sendTouchEvent: function teh_sendTouchEvent(evt, target, name) {
    var touchEvent = document.createEvent("touchevent");
    var point = document.createTouch(window, target, this.uuid++,
                                     evt.pageX, evt.pageY,
                                     evt.screenX, evt.screenY,
                                     evt.clientX, evt.clientY,
                                     1, 1, 0, 0);
    var touches = document.createTouchList(point);
    var targetTouches = touches;
    var changedTouches = touches;
    touchEvent.initTouchEvent(name, true, true, window, 0,
                              false, false, false, false,
                              touches, targetTouches, changedTouches);
    return target.dispatchEvent(touchEvent);
  }
};

Apps.init();

