define(["exports"], function (exports) {
  "use strict";

  var _extends = function (child, parent) {
    child.prototype = Object.create(parent.prototype, {
      constructor: {
        value: child,
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    child.__proto__ = parent;
  };

  /*global Controller*/

  // When injected in the System app, this selector can identify
  // the currently-focused <iframe> (app window).
  var ACTIVE_WINDOW_SELECTOR = "#windows > .active iframe";

  var TouchForwarderController = (function (Controller) {
    var TouchForwarderController = function TouchForwarderController(options) {
      Controller.call(this, options);

      var firstTouchStartEvt = null;
      var isForwarding = false;

      window.addEventListener("touchstart", function (evt) {
        if (evt.touches.length === 1) {
          firstTouchStartEvt = evt;
          return;
        }

        if (evt.touches.length !== 2) {
          return;
        }

        var iframe = document.querySelector(ACTIVE_WINDOW_SELECTOR);
        iframe.sendTouchEvent.apply(iframe, unsynthesizeEvent(firstTouchStartEvt));
        iframe.sendTouchEvent.apply(iframe, unsynthesizeEvent(evt));

        isForwarding = true;
      });

      window.addEventListener("touchmove", function (evt) {
        if (!isForwarding) {
          return;
        }

        var iframe = document.querySelector(ACTIVE_WINDOW_SELECTOR);
        iframe.sendTouchEvent.apply(iframe, unsynthesizeEvent(evt));
      });

      window.addEventListener("touchend", function (evt) {
        if (!isForwarding) {
          return;
        }

        if (evt.touches.length === 0) {
          isForwarding = false;
        }

        var iframe = document.querySelector(ACTIVE_WINDOW_SELECTOR);
        iframe.sendTouchEvent.apply(iframe, unsynthesizeEvent(evt));
      });

      console.log("[Customizer] Initialized TouchForwarderController", this);
    };

    _extends(TouchForwarderController, Controller);

    return TouchForwarderController;
  })(Controller);

  exports["default"] = TouchForwarderController;


  /**
   * Taken from System app:
   * https://github.com/mozilla-b2g/gaia/blob/600fd8249960b8256af9de67d9171025bb9a3ff3/apps/system/js/touch_forwarder.js#L93
   */
  function unsynthesizeEvent(e) {
    var type = e.type;
    var relevantTouches = (e.type === "touchend") ? e.changedTouches : e.touches;
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
      ys.push(t.pageY - 50); // Shift Y position up to remain in-bounds
      rxs.push(t.radiusX);
      rys.push(t.radiusY);
      rs.push(t.rotationAngle);
      fs.push(t.force);
    }

    return [type, identifiers, xs, ys, rxs, rys, rs, fs, xs.length, modifiers];
  }
});