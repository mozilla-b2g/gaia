/*
*
* A simple helper encapsulating the APZC compliant logic
* to forward touch events.
*
* var tf = new TouchForwarder(element);
* tf.forward(evt);
*/

(function(exports) {
  'use strict';

  const kSignificant = 10;

  var TouchForwarder = function TouchForwarder(destinationElement) {
    this.destination = destinationElement || null;
    this._resetState();
  };

  TouchForwarder.prototype.forward = function(e) {
    var element = this.destination;
    var touch;

    // Should not forward to a frame that's not displayed
    if (element.getAttribute('aria-hidden') == 'true') {
      return;
    }

    switch (e.type) {
      case 'touchstart':
        sendTouchEvent(element, e);

        touch = e.touches[0];
        this._startX = touch.clientX;
        this._startY = touch.clientY;
        this._shouldTap = true;
        break;

      case 'touchmove':
        sendTouchEvent(element, e);
        touch = e.touches[0];
        this._updateShouldTap(touch);
        break;

      case 'touchend':
        sendTouchEvent(element, e);

        touch = e.changedTouches[0];
        this._updateShouldTap(touch);

        if (this._shouldTap) {
          sendTapMouseEvents(element, touch.clientX, touch.clientY);
        }

        this._resetState();
        break;

      case 'click':
        sendTapMouseEvents(element, e.clientX, e.clientY);
        break;

      case 'touchcancel':
        sendTouchEvent(element, e);
        this._resetState();
        break;
    }
  };

  TouchForwarder.prototype._resetState = function() {
    this._startX = null;
    this._startY = null;
    this._shouldTap = false;
  };

  TouchForwarder.prototype._updateShouldTap = function(touch) {
    var deltaX = Math.abs(touch.clientX - this._startX);
    var deltaY = Math.abs(touch.clientY - this._startY);

    if (deltaX > kSignificant || deltaY > kSignificant) {
      this._shouldTap = false;
    }
  };

  function sendTouchEvent(element, e) {
    if (!element) {
      return;
    }

    // Only IFRAMEs support sendTouchEvent().
    var args = createSendTouchEventArgumentList(e);
    if (element.sendTouchEvent) {
      element.sendTouchEvent.apply(element, args);
    } else {
      sendTouchEventToElement.apply(element, args);
    }
  }

  function sendTapMouseEvents(el, x, y) {
    if (!el) {
      return;
    }

    // Only IFRAME supports sendMouseEvent().
    if (el.sendMouseEvent) {
      el.sendMouseEvent('mousemove', x, y, 0, 0, 0);
      el.sendMouseEvent('mousedown', x, y, 0, 1, 0);
      el.sendMouseEvent('mouseup', x, y, 0, 1, 0);
    } else {
      // For normal elements, we must synthesize our own 'click' event too.
      var mouseProps = {
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true
      };
      el.dispatchEvent(new MouseEvent('mousemove', mouseProps));
      el.dispatchEvent(new MouseEvent('mousedown', mouseProps));
      el.dispatchEvent(new MouseEvent('mouseup', mouseProps));
      el.dispatchEvent(new MouseEvent('click', mouseProps));
    }
  }

  /**
   * Like HTMLIFrameElement.sendTouchEvent(), but for all other elements.
   *
   * @this {HTMLElement}
   */
  function sendTouchEventToElement(
    type, identifiers, xs, ys, rxs, rys, rs, fs, count, modifiers) {

    var touchEvent = document.createEvent('TouchEvent');

    var touches = document.createTouchList(identifiers.map((ident, idx) => {
      return document.createTouch(
        /* view: */ window,
        /* target: */ this,
        /* identifier: */ ident,
        /* pageX: */ xs[idx],
        /* pageY: */ ys[idx],
        /* screenX: */ xs[idx],
        /* screenY: */ ys[idx],
        /* clientX: */ xs[idx],
        /* clientY: */ ys[idx],
        /* radiusX: */ rxs[idx],
        /* radiusY: */ rys[idx],
        /* rotationAngle: */ rs[idx],
        /* force: */ fs[idx]
      );
    }));

    var emptyTouches = document.createTouchList([]);

    touchEvent.initTouchEvent(
      /* type: */ type,
      /* canBubble: */ true,
      /* cancelable: */ true,
      /* view: */ window,
      /* detail: */ 0,
      /* ctrlKey: */ modifiers & 2,
      /* altKey: */ modifiers & 1,
      /* shiftKey: */ modifiers & 4,
      /* metaKey: */ modifiers & 8,
      /* touches: */
      (type === 'touchend' || type === 'touchcancel') ? emptyTouches : touches,
      /* targetTouches: */
      (type === 'touchend' || type === 'touchcancel') ? emptyTouches : touches,
      /* changedTouches: */ touches
    );


    /* jshint validthis:true */
    this.dispatchEvent(touchEvent);
  }

  /**
   * Prepare an argument list suitable for HTMLIFrameElement.sendTouchEvent().
   */
  function createSendTouchEventArgumentList(e) {
    var type = e.type;
    var relevantTouches = (e.type === 'touchend') ?
                            e.changedTouches : e.touches;
    var identifiers = [];
    var xs = [];
    var ys = [];
    var rxs = [];
    var rys = [];
    var rs = [];
    var fs = [];
    var modifiers = 0;

    for (var i = 0; i < relevantTouches.length; i++) {
      var t = relevantTouches[i];

      identifiers.push(t.identifier);
      xs.push(t.pageX);
      ys.push(t.pageY);
      rxs.push(t.radiusX);
      rys.push(t.radiusY);
      rs.push(t.rotationAngle);
      fs.push(t.force);
    }

    return [type, identifiers, xs, ys, rxs, rys, rs, fs, xs.length, modifiers];
  }

  exports.TouchForwarder = TouchForwarder;
}(window));
