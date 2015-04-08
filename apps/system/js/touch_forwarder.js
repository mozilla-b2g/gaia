/*
*
* A simple helper encapsulating the APZC compliant logic
* to forward touch events.
*
* var tf = new TouchForwarder();
* tf.destination = mozBrowserIframe;
* tf.forward(evt);
*
*/

(function(exports) {
  'use strict';

  var TouchForwarder = function TouchForwarder() {
    this.destination = null;
    this._resetState();
  };

  TouchForwarder.prototype.forward = function(e) {
    var iframe = this.destination;
    var touch;

    // Should not forward to a frame that's not displayed
    if (iframe.getAttribute('aria-hidden')) {
      return;
    }

    switch (e.type) {
      case 'touchstart':
        sendTouchEvent(iframe, e);

        touch = e.touches[0];
        this._startX = touch.clientX;
        this._startY = touch.clientY;
        this._shouldTap = true;
        break;

      case 'touchmove':
        sendTouchEvent(iframe, e);
        touch = e.touches[0];
        this._updateShouldTap(touch);
        break;

      case 'touchend':
        sendTouchEvent(iframe, e);

        touch = e.changedTouches[0];
        this._updateShouldTap(touch);

        if (this._shouldTap) {
          sendTapMouseEvents(iframe, touch.clientX, touch.clientY);
        }

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

    if (deltaX > 5 || deltaY > 5) {
      this._shouldTap = false;
    }
  };

  function sendTouchEvent(iframe, e) {
    if (!iframe) {
      return;
    }

    iframe.sendTouchEvent.apply(iframe, unsynthetizeEvent(e));
  }

  function sendTapMouseEvents(iframe, x, y) {
    if (!iframe) {
      return;
    }

    iframe.sendMouseEvent('mousemove', x, y, 0, 0, 0);
    iframe.sendMouseEvent('mousedown', x, y, 0, 1, 0);
    iframe.sendMouseEvent('mouseup', x, y, 0, 1, 0);
  }

  function unsynthetizeEvent(e) {
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
