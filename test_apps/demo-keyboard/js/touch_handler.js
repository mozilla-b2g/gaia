/*
 * This file is intended to move to shared/js/keyboard/touch_handler.js
 *
 * This class handles touch events over a keyboard element, interprets
 * them relative to a specified KeyboardLayout object, and fires 'key'
 * events on the container element when the user touches and releases a key.
 */
(function(exports) {
  'use strict';

  // How long to wait before showing the alternatives for a key
  const ALTERNATIVES_TIMEOUT = 700;  // milliseconds

  // How long to wait before autorepeating a key
  const REPEAT_DELAY = 700;    // milliseconds before first auto-repeat
  const REPEAT_INTERVAL = 75;  // milliseconds between subsequent events

  // This constant specifies how aggressive we are with our
  // dynamic hit target resizing. Larger numbers mean more resizing.
  // The amount of resizing is proportional to the square root of this number.
  const RESIZE_FACTOR = 40;

  var pageview;
  var page;

  var activeKey = null;
  var activeTouch = null;
  var alternativesTimer = null;
  var alternativesShowing = false;
  var alternativesRect = null;
  var activeAltKey = null;
  var repeating = false;
  var repeatTimer = null;

  var dispatcher = document.createElement('div');

  // These variables are used by the hit detector
  var weights = {};
  var keyCodeToName = {};  // map keycodes to key names for this page

  function setPageView(newpageview) {
    // If this doesn't work, register on the container
    if (pageview) {
      pageview.element.removeEventListener('touchstart', handleEvent);
      pageview.element.removeEventListener('touchend', handleEvent);
      pageview.element.removeEventListener('touchmove', handleEvent);
    }

    pageview = newpageview;
    page = pageview.page;

    if (pageview) {
      pageview.element.addEventListener('touchstart', handleEvent);
      pageview.element.addEventListener('touchend', handleEvent);
      pageview.element.addEventListener('touchmove', handleEvent);
    }

    activeKey = null;

    keyCodeToName = {};
    for (var keyname in page.keys) {
      var keyobj = page.keys[keyname];
      // If this key has a keycode, map the keycode back to the name
      if (keyobj.keycode) {
        keyCodeToName[keyobj.keycode] = keyname;
      }
    }
  }

  function handleEvent(e) {
    for (var i = 0; i < e.changedTouches.length; i++) {
      var touch = e.changedTouches[i];

      switch (e.type) {
      case 'touchstart':
        touchstart(touch);
        break;

      case 'touchend':
        touchend(touch);
        break;

      case 'touchmove':
        touchmove(touch);
        break;
      }
    }
  }

  function touchstart(touch) {
    // If there is already an active key when this touch begins
    // then we're in a multi-touch case. Handle the pending key first
    if (activeKey) {
      if (alternativesShowing) {
        // If the user touches another key while an alternatives menu is
        // up, just hide the alternatives and don't send anything
        hideAlternatives();
      }
      else { // No alternatives menu is up
        sendKey();
      }
    }

    var keyname = keyAt(touch.clientX, touch.clientY);
    activeKey = keyname;
    activeTouch = touch.identifier;
    pageview.highlight(keyname);

    startTimers();
  }

  function touchend(touch) {
    // If this touch is not the most recent one, ignore it
    if (touch.identifier !== activeTouch)
      return;

    cancelTimers();

    if (alternativesShowing) {
      sendAltKey();
      hideAlternatives();
    }
    else if (repeating) {
      // We already sent the key at least once while it was held down, so
      // don't send it again now. We do have to unhighlight the key, though
      repeating = false;
      pageview.unhighlight(activeKey);
    }
    else {
      sendKey();
    }

    activeKey = null;
    activeTouch = null;
  }

  function touchmove(touch) {
    // If this touch is not the most recent one, ignore it
    if (touch.identifier !== activeTouch)
      return;

    var x = touch.clientX, y = touch.clientY;

    if (alternativesShowing) {
      var box = alternativesRect;
      // If the touch has moved out of the alternatives hide the menu
      // and cancel this touch so that any further events are ignored
      if (x < box.left || x > box.right || y < box.top || y > box.bottom) {
        hideAlternatives();
        activeKey = null;
        activeTouch = null;
      }
      else {
        var altkey = document.elementFromPoint(x, y);
        if (altkey !== activeAltKey) {
          activeAltKey.classList.remove('touched');
          activeAltKey = altkey;
          activeAltKey.classList.add('touched');
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
      var keyname = keyAt(x, y);
      if (keyname !== activeKey) {
        pageview.unhighlight(activeKey);
        activeKey = keyname;
        pageview.highlight(activeKey);
        startTimers();
      }
    }
  }

  function sendKey() {
    pageview.unhighlight(activeKey);
    dispatchKeyEvent(activeKey);
  }

  // keys in the alternatives menu are not handled the same way
  function sendAltKey() {
    var keyname = activeAltKey.dataset.name;
    dispatchKeyEvent(keyname);
    activeAltKey = null;
  }

  function startTimers() {
    cancelTimers();
    if (page.keys[activeKey].alternatives) {
      alternativesTimer = setTimeout(showAlternatives, ALTERNATIVES_TIMEOUT);
    }
    else if (page.keys[activeKey].autorepeat) {
      repeatTimer = setTimeout(repeatKey, REPEAT_DELAY);
    }
  }

  function cancelTimers() {
    if (alternativesTimer) {
      clearTimeout(alternativesTimer);
      alternativesTimer = null;
    }
    if (repeatTimer) {
      clearTimeout(repeatTimer);
      repeatTimer = null;
    }
  }

  function showAlternatives() {
    if (!activeKey)
      return;
    pageview.showAlternatives(activeKey);
    pageview.unhighlight(activeKey);
    alternativesShowing = true;
    alternativesRect = pageview.alternativesMenu.getBoundingClientRect();
    activeAltKey = pageview.alternativesMenu.firstElementChild;
    activeAltKey.classList.add('touched');
  }

  function hideAlternatives() {
    pageview.hideAlternatives(activeKey);
    alternativesShowing = false;
    activeAltKey = null;
  }

  function repeatKey() {
    repeating = true;
    dispatchKeyEvent(activeKey);
    repeatTimer = setTimeout(repeatKey, REPEAT_INTERVAL);
  }

  // EventTarget methods
  function addEventListener(type, handler) {
    dispatcher.addEventListener(type, handler);
  }

  function removeEventListener(type, handler) {
    dispatcher.removeEventListener(type, handler);
  }

  function dispatchKeyEvent(keyname) {
    dispatcher.dispatchEvent(new CustomEvent('key', { detail: keyname }));
  }

  function setExpectedChars(chars) {
    // The input is an array with 2n elements. Each pair of elements
    // represents a keycode and a weight
    weights = {};

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
      if (keycode === 0) // Keycode 0 means end of word
        keycode = 32;    // so expect a space character instead
      var weight = chars[i + 1];
      var keyname = keyCodeToName[keycode];
      if (!keyname)
        continue;
      weight = weight / highestWeight;
      weight = weight * RESIZE_FACTOR;
      weight = weight * weight;
      weights[keyname] = weight;
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
  }

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
  function keyAt(x, y) {
    var nearestName, smallestPower = Infinity;
    for (var keyname in pageview.keyelts) {
      var keydata = pageview.getKeyRect(keyname);

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
      var weight = weights[keyname] || 0;
      var power = distance - weight;
      if (power < smallestPower) {
        smallestPower = power;
        nearestName = keyname;
      }
    }
    return nearestName;
  };

  exports.KeyboardTouchHandler = {
    setPageView: setPageView,
    setExpectedChars: setExpectedChars,
    addEventListener: addEventListener,
    removeEventListener: removeEventListener
  };
}(window));
