function debug(str) {
  dump('desktop-helper (TouchEventHandler): ' + str + '\n');
}

let CC = Components.Constructor;
let Cc = Components.classes;
let Ci = Components.interfaces;
let Cu = Components.utils;
let Cr = Components.results;

Cu.import('resource://gre/modules/Services.jsm');


// =================== Touch ====================
// Simulate touch events on desktop
var TouchEventHandler = (function touchEventHandler() {
  let contextMenuTimeout = 0;

  // This guard is used to not re-enter the events processing loop for
  // self dispatched events
  let ignoreEvents = false;

  let threshold = 25;
  try {
    threshold = Services.prefs.getIntPref('ui.dragThresholdX');
  } catch(e) {}

  let delay = 500;
  try {
    delay = Services.prefs.getIntPref('ui.click_hold_context_menus.delay');
  } catch(e) {}

  let TouchEventHandler = {
    events: ['mousedown', 'mousemove', 'mouseup', 'click'],
    start: function teh_start() {
      this.events.forEach((function(evt) {
        addEventListener(evt, this, true);
      }).bind(this));
    },
    stop: function teh_stop() {
      this.events.forEach((function(evt) {
        removeEventListener(evt, this, true);
      }).bind(this));
    },
    handleEvent: function teh_handleEvent(evt) {
      if (evt.button || ignoreEvents ||
          evt.mozInputSource == Ci.nsIDOMMouseEvent.MOZ_SOURCE_UNKNOWN)
        return;

      // The system window use an hybrid system even on the device which is
      // a mix of mouse/touch events. So let's not cancel *all* mouse events
      // if it is the current target.
      let content = evt.target.ownerDocument.defaultView;
      let isSystemWindow = content.location.toString().indexOf("system.gaiamobile.org") != -1;

      let eventTarget = this.target;
      let type = '';
      switch (evt.type) {
        case 'mousedown':
          debug('mousedown:');
          this.target = evt.target;

          contextMenuTimeout =
            this.sendContextMenu(evt.target, evt.pageX, evt.pageY, delay);

          this.cancelClick = false;
          this.startX = evt.pageX;
          this.startY = evt.pageY;

          // Capture events so if a different window show up the events
          // won't be dispatched to something else.
          evt.target.setCapture(false);

          type = 'touchstart';
          break;

        case 'mousemove':
          if (!eventTarget)
            return;

          if (!this.cancelClick) {
            if (Math.abs(this.startX - evt.pageX) > threshold ||
                Math.abs(this.startY - evt.pageY) > threshold) {
              this.cancelClick = true;
              content.clearTimeout(contextMenuTimeout);
            }
          }

          type = 'touchmove';
          break;

        case 'mouseup':
          if (!eventTarget)
            return;
          debug('mouseup: ' + evt.detail);
          this.target = null;

          content.clearTimeout(contextMenuTimeout);
          type = 'touchend';
          break;

        case 'click':
          debug('click');
          // Mouse events has been cancelled so dispatch a sequence
          // of events to where touchend has been fired
          evt.preventDefault();
          evt.stopImmediatePropagation();

          if (this.cancelClick)
            return;

          ignoreEvents = true;
          content.setTimeout(function dispatchMouseEvents(self) {
            self.fireMouseEvent('mousedown', evt);
            self.fireMouseEvent('mousemove', evt);
            self.fireMouseEvent('mouseup', evt);
            ignoreEvents = false;
         }, 0, this);

          debug('click: fire');
          return;
      }

      let target = eventTarget || this.target;
      if (target && type) {
        this.sendTouchEvent(evt, target, type);
      }

      if (type && type != 'touchmove') {
        debug(' cancelled (fire ' + type + ')');
      }

      if (!isSystemWindow) {
        evt.preventDefault();
        evt.stopImmediatePropagation();
      }
    },
    fireMouseEvent: function teh_fireMouseEvent(type, evt)  {
      debug(type + ': fire');

      let content = evt.target.ownerDocument.defaultView;
      var utils = content.QueryInterface(Ci.nsIInterfaceRequestor)
                         .getInterface(Ci.nsIDOMWindowUtils);
      utils.sendMouseEvent(type, evt.pageX, evt.pageY, 0, 1, 0, true);
    },
    sendContextMenu: function teh_sendContextMenu(target, x, y, delay) {
      let doc = target.ownerDocument;
      let evt = doc.createEvent('MouseEvent');
      evt.initMouseEvent('contextmenu', true, true, doc.defaultView,
                         0, x, y, x, y, false, false, false, false,
                         0, null);

      let content = target.ownerDocument.defaultView;
      let timeout = content.setTimeout((function contextMenu() {
        debug('fire context-menu');

        target.dispatchEvent(evt);
        this.cancelClick = true;
      }).bind(this), delay);

      return timeout;
    },
    sendTouchEvent: function teh_sendTouchEvent(evt, target, name) {
      let document = target.ownerDocument;
      let content = document.defaultView;

      let touchEvent = document.createEvent('touchevent');
      let point = document.createTouch(content, target, 0,
                                       evt.pageX, evt.pageY,
                                       evt.screenX, evt.screenY,
                                       evt.clientX, evt.clientY,
                                       1, 1, 0, 0);
      let touches = document.createTouchList(point);
      let targetTouches = touches;
      let changedTouches = touches;
      touchEvent.initTouchEvent(name, true, true, content, 0,
                                false, false, false, false,
                                touches, targetTouches, changedTouches);
      target.dispatchEvent(touchEvent);
      return touchEvent;
    }
  };

  return TouchEventHandler;
})();

TouchEventHandler.start();
