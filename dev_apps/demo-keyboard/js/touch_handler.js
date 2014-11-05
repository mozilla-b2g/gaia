/*
 * This file is intended to move to shared/js/keyboard/touch_handler.js
 *
 * This class handles touch events over a keyboard element, interprets
 * them relative to a specified KeyboardLayout object, and fires 'key'
 * events on the container element when the user touches and releases a key.
 */
'use strict';

(function(exports) {

  function KeyboardTouchHandler(app) {
    this._started = false;
    this.app = app;
  }

  // How long to wait before showing the alternatives for a key
  KeyboardTouchHandler.prototype.ALTERNATIVES_TIMEOUT = 700;  // milliseconds

  /*
   * How long to wait before autorepeating a key
   */
  // milliseconds before first auto-repeat
  KeyboardTouchHandler.prototype.REPEAT_DELAY = 700;
  // milliseconds between subsequent events
  KeyboardTouchHandler.prototype.REPEAT_INTERVAL = 75;

  // This constant specifies how aggressive we are with our
  // dynamic hit target resizing. Larger numbers mean more resizing.
  KeyboardTouchHandler.prototype.RESIZE_FACTOR = 40;

  KeyboardTouchHandler.prototype.start = function start() {
    if (this._started) {
      throw 'Instance should not be start()\'ed twice.';
    }
    this._started = true;

    this.pageview = null;
    this.page = null;

    this.activeKey = null;
    this.activeTouch = null;
    this.alternativesTimer = null;
    this.activeAltKey = null;
    this.repeating = false;
    this.repeatTimer = null;

    this.dispatcher = document.createElement('div');

    // These variables are used by the hit detector
    this.weights = null; //Set by setExpectedChars, cleared by dispatchKeyEvent
    this.keyCodeToName = {}; // Map keycodes to key names for this page
  };

  KeyboardTouchHandler.prototype.stop = function stop() {
    if (!this._started) {
      throw 'Instance was never start()\'ed but stop() is called.';
    }
    this._started = false;

    this.pageview = null;
    this.page = null;
    this.activeKey = null;
    this.activeTouch = null;
    this.alternativesTimer = null;
    this.activeAltKey = null;
    this.repeating = false;
    this.repeatTimer = null;

    this.dispatcher = null;

    this.weights = null;
    this.keyCodeToName = null;
  };

  KeyboardTouchHandler.prototype.setPageView =
    function setPageView(newpageview) {
      // If this doesn't work, register on the container
      if (this.pageview) {
        this.pageview.element.removeEventListener('touchstart', this);
        this.pageview.element.removeEventListener('touchend', this);
        this.pageview.element.removeEventListener('touchmove', this);
      }

      this.pageview = newpageview;
      this.page = this.pageview.page;

      if (this.pageview) {
        this.pageview.element.addEventListener('touchstart', this);
        this.pageview.element.addEventListener('touchend', this);
        this.pageview.element.addEventListener('touchmove', this);
      }

      this.activeKey = null;

      this.keyCodeToName = {};
      for (var keyname in this.page.keys) {
        var keyobj = this.page.keys[keyname];
        // If this key has a keycode, map the keycode back to the name
        if (keyobj.keycode) {
          this.keyCodeToName[keyobj.keycode] = keyname;
        }
      }
    };

  KeyboardTouchHandler.prototype.handleEvent = function handleEvent(evt) {
    for (var i = 0; i < evt.changedTouches.length; i++) {
      var touch = evt.changedTouches[i];

      switch (evt.type) {
        case 'touchstart':
          this.touchstart(touch);
          break;

        case 'touchend':
          this.touchend(touch);
          break;

        case 'touchmove':
          this.touchmove(touch);
          break;
      }
    }
  };

  KeyboardTouchHandler.prototype.touchstart = function touchstart(touch) {
    // If there is already an active key when this touch begins
    // then we're in a multi-touch case. Handle the pending key first
    if (this.activeKey) {
      if (this.pageview.alternativesShowing) {
        // If the user touches another key while an alternatives menu is
        // up, just hide the alternatives and don't send anything
        this.hideAlternatives();
      }
      else { // No alternatives menu is up
        this.sendKey();
      }
    }

    var keyname = this.keyAt(touch.clientX, touch.clientY);
    this.activeKey = keyname;
    this.activeTouch = touch.identifier;
    this.pageview.highlight(keyname);

    this.startTimers();
  };

  KeyboardTouchHandler.prototype.touchend = function touchend(touch) {
    // If this touch is not the most recent one, ignore it
    if (touch.identifier !== this.activeTouch) {
      return;
    }

    this.cancelTimers();

    if (this.pageview.alternativesShowing) {
      this.sendAltKey();
      this.hideAlternatives();
    }
    else if (this.repeating) {
      // We already sent the key at least once while it was held down, so
      // don't send it again now. We do have to unhighlight the key, though
      this.repeating = false;
      this.pageview.unhighlight(this.activeKey);
    }
    else {
      this.sendKey();
    }

    this.activeKey = null;
    this.activeTouch = null;
  };

  KeyboardTouchHandler.prototype.touchmove = function touchmove(touch) {
    // If this touch is not the most recent one, ignore it
    if (touch.identifier !== this.activeTouch) {
      return;
    }

    var x = touch.clientX, y = touch.clientY;

    if (this.pageview.alternativesShowing) {
      var box = this.pageview.alternativesMenuBox;
      // If the touch has moved out of the alternatives hide the menu
      // and cancel this touch so that any further events are ignored
      if (x < box.left || x > box.right || y < box.top || y > box.bottom) {
        this.hideAlternatives();
        this.activeKey = null;
        this.activeTouch = null;
      }
      else {
        for (var i = 0; i < this.pageview.alternativeKeyBoxes.length; i++) {
          box = this.pageview.alternativeKeyBoxes[i];
          if (x >= box.left && x < box.right &&
              y >= box.top && y < box.bottom) {
            if (box.key !== this.activeAltKey) {
              this.activeAltKey.classList.remove('touched');
              this.activeAltKey = box.key;
              this.activeAltKey.classList.add('touched');
            }
            break;
          }
        }
      }
    }
    else {
      // XXX
      // I should probably modify the hit detector so that if the touch is
      // completely outside of the keyboard area it returns null and we
      // can treat that as cancelling the input. Use a touchleave event?
      //
      // XXX: don't call the hit detector unless we've moved more that
      // some small threshold of pixels since we last switched the active key.
      // Keys should be slightly sticky that way.
      //
      var keyname = this.keyAt(x, y);
      if (keyname !== this.activeKey) {
        this.pageview.unhighlight(this.activeKey);
        this.activeKey = keyname;
        this.pageview.highlight(this.activeKey);
        this.startTimers();
      }
    }
  };

  KeyboardTouchHandler.prototype.sendKey = function sendKey() {
    this.pageview.unhighlight(this.activeKey);
    this.dispatchKeyEvent(this.activeKey);
  };

  // keys in the alternatives menu are not handled the same way
  KeyboardTouchHandler.prototype.sendAltKey = function sendAltKey() {
    var keyname = this.activeAltKey.dataset.name;
    this.dispatchKeyEvent(keyname);
    this.activeAltKey = null;
  };

  KeyboardTouchHandler.prototype.startTimers = function startTimers() {
    this.cancelTimers();
    if (this.page.keys[this.activeKey].alternatives) {
      this.alternativesTimer = window.setTimeout(
        this.showAlternatives.bind(this),
        this.ALTERNATIVES_TIMEOUT);
    }
    else if (this.page.keys[this.activeKey].autorepeat) {
      this.repeatTimer = window.setTimeout(this.repeatKey.bind(this),
                                           this.REPEAT_DELAY);
    }
  };

  KeyboardTouchHandler.prototype.cancelTimers = function cancelTimers() {
    if (this.alternativesTimer) {
      window.clearTimeout(this.alternativesTimer);
      this.alternativesTimer = null;
    }

    if (this.repeatTimer) {
      window.clearTimeout(this.repeatTimer);
      this.repeatTimer = null;
    }
  };

  KeyboardTouchHandler.prototype.showAlternatives =
    function showAlternatives() {
      if (!this.activeKey) {
        return;
      }

      this.pageview.showAlternatives(this.activeKey);
      this.pageview.unhighlight(this.activeKey);
      this.activeAltKey = this.pageview.alternativesMenu.firstElementChild;
      this.activeAltKey.classList.add('touched');
    };

  KeyboardTouchHandler.prototype.hideAlternatives =
    function hideAlternatives() {
      this.pageview.hideAlternatives(this.activeKey);
      this.activeAltKey = null;
    };

  KeyboardTouchHandler.prototype.repeatKey = function repeatKey() {
    this.repeating = true;
    this.dispatchKeyEvent(this.activeKey);
    this.repeatTimer = window.setTimeout(this.repeatKey.bind(this),
                                         this.REPEAT_INTERVAL);
  };

  // EventTarget methods
  KeyboardTouchHandler.prototype.addEventListener =
    function addEventListener(type, handler) {
      this.dispatcher.addEventListener(type, handler);
    };

  KeyboardTouchHandler.prototype.removeEventListener =
    function removeEventListener(type, handler) {
      this.dispatcher.removeEventListener(type, handler);
    };

  KeyboardTouchHandler.prototype.dispatchKeyEvent =
    function dispatchKeyEvent(keyname) {
      // Before sending a new key, discard the weights used to compute this one.
      this.weights = null;
      this.dispatcher.dispatchEvent(new CustomEvent('key',
                                                    { detail: keyname }));
    };

  KeyboardTouchHandler.prototype.setExpectedChars =
    function setExpectedChars(chars) {
      // The input is an array with 2n elements. Each pair of elements
      // represents a keycode and a weight
      if (!chars || chars.length === 0) {
        this.weights = null;
        return;
      }

      this.weights = {};

      // The raw weights from the prediction engine are word frequency numbers
      // between 1 and 32. We don't want to use them raw, but want to scale
      // them as a fraction of the largest weight. (So that if there is one
      // character with weight 20 and one with weight 10, they would be scaled
      // to 1 and 0.5.) We then multiply by a tuneable factor that specfies how
      // aggressive we are with prediction, and square the results since we
      // need a squared value in the hit detection algorithm
      var highestWeight = chars[1];

      for (var i = 0; i < chars.length; i += 2) {
        var keycode = chars[i];
        if (keycode === 0) { // Keycode 0 means end of word
          keycode = 32;    // so expect a space character instead
        }
        var weight = chars[i + 1];
        var keyname = this.keyCodeToName[keycode];
        if (!keyname) {
          continue;
        }

        weight = weight / highestWeight;
        weight = weight * this.RESIZE_FACTOR;
        weight = weight * weight;
        this.weights[keyname] = weight;
      }

      // Illustrate the weights of each key with an outline around the key
      // This is purely an illustration. The outlines around each key do not
      // actually display the Voronoi cells for each key
      // for (var keyname in page.keys) {
      //   var keyobj = page.keys[keyname];
      //   var keyelt = pageview.keyelts[keyname];
      //   if (!keyelt)
      //     continue;
      //   var weight = weights[keyname];
      //   if (weight) {
      //     keyelt.style.boxShadow = '0 0 5px ' +
      //       0.5 * Math.sqrt(weight) +
      //       'px gold';
      //   }
      //   else {
      //     keyelt.style.boxShadow = 'none';
      //   }
      // }
  };

  // Return the name of the key at (x,y). If that point is not inside any of
  // the keys, return the key whose center is nearest to that point. In order
  // to improve typing accuracy we perform dynamic hit target resizing by
  // altering the meaning of "nearest" according to the data passed to
  // setExpectedChars().  The algorithm uses a power diagram: see
  // http://en.wikipedia.org/wiki/Power_diagram for details.
  //
  // A simple hit detection algorithm is to use elementFromPoint() or to loop
  // through the keys and find one that contains the point (x,y).  The problem
  // with that is that if the user touches outside of any key nothing happens.
  //
  // So a better approach is to loop through the keys and compute the distance
  // from the center of the key to the point (x,y), then select the key with
  // the smallest distance. We have to be careful about the spacebar because
  // the ends of the bar are actually closer to keys in the 3rd row than they
  // are to the center of the bar. So this approach can be combined with the
  // first so that points inside a key always hit that key.
  //
  // But if we can predict what characters the user is likely to type next
  // then we can anticipate the user's input and do hit detection with that in
  // mind to try to reduce typos. To do this, we assign a weight to each key
  // depending on how likely it is. Then, instead of computing the distance to
  // the key we compute the "power" for each key, which is the distance minus
  // the weight.  The key with the smallest power (unlike distance the power
  // can be negative) is the one we hit. Note that this brings us back to a
  // situation where the ends of the spacebar may register as letters rather
  // than a space.
  //
  // Keys that do not send keycodes and keys that declare themselves to be
  // "static" in their layout file do not participate in dynamic hit target
  // resizing and a touch inside a static key always triggers that key. (A
  // touch outside the key also triggers it if there is nothing else closer.)
  //
  // XXX: We should make the weight of the key dependent on the elapsed time
  // since the last keystroke. This means we do more aggressive resizing when
  // the user is typing more quickly. That resizing can make it difficult to
  // type uncommon words, but by making the algorithm time sensitive, the user
  // can just slow down when typing uncommon words.
  //
  //
  KeyboardTouchHandler.prototype.keyAt = function keyAt(x, y) {
    var nearestName, smallestPower = Infinity;
    for (var keyname in this.pageview.keyelts) {
      var keydata = this.pageview.getKeyRect(keyname);

      if (keydata.static) {
        // If this is a static key then we don't want it to be affected by
        // dynamic hit target resizing. We treat it as hit if a touch is
        // anywhere inside of it and return immediately without looking for
        // other possible hits. Note that we can still hit these static keys
        // from the outside if we are closer to them than any other keys.
        if (keydata.left <= x && x <= keydata.right &&
            keydata.top <= y && y <= keydata.bottom) {
          return keyname;
        }
      }

      var dx = x - keydata.cx;
      var dy = y - keydata.cy;
      var distance = dx * dx + dy * dy;
      var weight = this.weights && this.weights[keyname] || 0;
      var power = distance - weight;
      if (power < smallestPower) {
        smallestPower = power;
        nearestName = keyname;
      }
    }
    return nearestName;
  };

  exports.KeyboardTouchHandler = KeyboardTouchHandler;
}(window));
