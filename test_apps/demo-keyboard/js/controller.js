/*
 * This file is intended to move to shared/js/keyboard/controller.js
 *
 * This class handles touch events over a keyboard element, interprets
 * them relative to a specified KeyboardLayout object, and fires 'key'
 * events on the container element when the user touches and releases a key.
 */
function KeyboardController(container) {
  this.container = container;
  this.page = null;
  this.hitdetector = null;

  this.activeKey = null;
  this.activeTouch = null;
  this.alternativesTimer = null;
  this.alternativesShowing = false;
  this.activeAltKey = null;

  container.addEventListener('touchstart', this);
  container.addEventListener('touchend', this);
  container.addEventListener('touchmove', this);
}

KeyboardController.ALTERNATIVES_TIMEOUT = 700;

KeyboardController.prototype.setPage = function setPage(page) {
  this.page = page;
  this.hitdetector = new KeyboardHitDetector(page);
  this.activeKey = null;
};

KeyboardController.prototype.handleEvent = function handleEvent(e) {
  for (var i = 0; i < e.changedTouches.length; i++) {
    var touch = e.changedTouches[i];

    switch (e.type) {
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

KeyboardController.prototype.touchstart = function touchstart(touch) {
  // If there is already an active key when this touch begins
  // then we're in a multi-touch case. Handle the pending key first
  if (this.activeKey) {
    if (this.alternativesShowing) {
      // If the user touches another key while an alternatives menu is
      // up, just hide the alternatives and don't send anything
      this.hideAlternatives();
    }
    else { // No alternatives menu is up
      this.sendKey();
    }
  }

  var keyname = this.hitdetector.keyAt(touch.clientX, touch.clientY);
  this.activeKey = keyname;
  this.activeTouch = touch.identifier;
  this.page.highlight(keyname);
  this.startAlternativesTimer();
};

KeyboardController.prototype.touchend = function touchend(touch, state) {
  // If this touch is not the most recent one, ignore it
  if (touch.identifier !== this.activeTouch)
    return;

  if (this.alternativesShowing) {
    this.sendAltKey();
    this.hideAlternatives();
  }
  else {
    this.cancelAlternativesTimer();
    this.sendKey();
  }

  this.activeKey = null;
  this.activeTouch = null;
};


KeyboardController.prototype.touchmove = function touchmove(touch, state) {
  // If this touch is not the most recent one, ignore it
  if (touch.identifier !== this.activeTouch)
    return;

  var x = touch.clientX, y = touch.clientY;

  if (this.alternativesShowing) {
    var box = this.alternativesRect;
    // If the touch has moved out of the alternatives hide the menu
    // and cancel this touch so that any further events are ignored
    if (x < box.left || x > box.right || y < box.top || y > box.bottom) {
      this.hideAlternatives();
      this.activeKey = null;
      this.activeTouch = null;
    }
    else {
      var altkey = document.elementFromPoint(x, y);
      if (altkey !== this.activeAltKey) {
        this.activeAltKey.classList.remove('touched');
        this.activeAltKey = altkey;
        this.activeAltKey.classList.add('touched');
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
    var keyname = this.hitdetector.keyAt(x, y);
    if (keyname !== this.activeKey) {
      this.page.unhighlight(this.activeKey);
      this.activeKey = keyname;
      this.page.highlight(this.activeKey);
      this.startAlternativesTimer();
    }
  }
};

KeyboardController.prototype.sendKey = function sendKey() {
  this.page.unhighlight(this.activeKey);
  this.container.dispatchEvent(new CustomEvent('key',
                                               { detail: this.activeKey }));
};

// keys in the alternatives menu are not handled the same way
KeyboardController.prototype.sendAltKey = function sendAltKey() {
  var keyname = this.activeAltKey.dataset.name;
  this.container.dispatchEvent(new CustomEvent('key', { detail: keyname }));
  this.activeAltKey = null;
};

KeyboardController.prototype.startAlternativesTimer = function() {
  var self = this;
  this.cancelAlternativesTimer();
  if (this.page.keys[this.activeKey].alternatives) {
    this.alternativesTimer = setTimeout(function() {
      if (self.activeKey) {
        self.showAlternatives();
      }
    }, KeyboardController.ALTERNATIVES_TIMEOUT);
  }
};

KeyboardController.prototype.cancelAlternativesTimer = function() {
  if (this.alternativesTimer) {
    clearTimeout(this.alternativesTimer);
    this.alternativesTimer = null;
  }
};

KeyboardController.prototype.showAlternatives = function() {
  this.page.showAlternatives(this.activeKey);
  this.page.unhighlight(this.activeKey);
  this.alternativesShowing = true;
  this.alternativesRect = this.page.alternativesMenu.getBoundingClientRect();
  this.activeAltKey = this.page.alternativesMenu.firstElementChild;
  this.activeAltKey.classList.add('touched');
};

KeyboardController.prototype.hideAlternatives = function() {
  this.page.hideAlternatives(this.activeKey);
  this.alternativesShowing = false;
  this.activeAltKey = null;
};



/*

  consider a finite state machine implementation.

  we can have any number of touches in progress at a time.

  (It might be a nice simplification to say that there is only one
    touch in progress and that if we get another touchstart we behave
    as if he current touch in progress got a touchend and just enter that key.
    though that probably won't do the right thing when an alternatives menu
    is displayed, so probably not.)

     (maintain a mapping from touchid to the key that is affected and
     the state the key is in. Actually: touch id should map to the state
     for that touch. the affected key is just part of that touch state.)

     (don't allow a key to autorepeat and have alternatives.)


     (The states below were written as key states. But really we want
      touch states. There isn't really a state 0. There is a regular
      touch state and a key alternatives touch state. Transitioning to
      state 0 in the below would actually mean deleting the touchid from
      the touch->state map)

     State 0: untouched normal state

       - touchstart event, or touchmove event moves into this key:
          if this is an autorepeat key, start the autorepeat timer
          else if this key has alternatives, start the alternatives timer
          if this key shows a popup, show it now
          go to state 1

     State 1: touched state

       - touchend event:
          cancel timers
          run the key command
          hide the popup
          go to state 0

       - touchmove event (and moves to another key)
           cancel timers
           hide the popup
           go to state 0 and process the event for another key

       - autorepeat timer fires
           run key command
           restart timer (possibly different interval than the initial)
           remain in state 1

       - alternatives timer fires
           hide popup
           display alternatives menu with first alternative selected
           go to state 2

    State 2: alternatives menu shown

        - touchend:
          send selected alternative
          hide menu
          go to state 0

        - touchmove:
           if the move remains close to the alternatives
             change selected alternative
             remain in state 2
           else if we move away from the alternatives
             hide the alternatives
             go to state 0 and reprocess the event

*/
