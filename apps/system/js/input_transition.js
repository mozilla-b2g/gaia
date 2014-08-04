'use strict';

(function(exports) {

/**
 * InputAppsTransitionManager takes care of the visual life cycle of
 * the keyboard container. The container basically cycles through
 * the four defined states.
 *
 * Note that there isn't a show() method because the input management
 * currently rely on keyboard app to call resize() first.
 *
 */
var InputAppsTransitionManager = function() {
  this._started = false;
  this.currentState = undefined;
  this.occupyingHeight = undefined;
  this._element = null;
};

InputAppsTransitionManager.prototype.onstatechange = null;

InputAppsTransitionManager.prototype.ELEMENT_ID = 'keyboards';

InputAppsTransitionManager.prototype.start = function() {
  if (this._started) {
    throw new Error('InputAppsTransitionManager: ' +
      'Instance should not be start()\'ed twice.');
  }
  this._started = true;

  this._element = document.getElementById(this.ELEMENT_ID);
  if (!this._element) {
    throw new Error('InputAppsTransitionManager: element not found.');
  }

  this._element.addEventListener('transitionend', this, true);

  // Start with hidden state.
  this.currentState = this.STATE_HIDDEN;
};

InputAppsTransitionManager.prototype.stop = function hb_stop() {
  if (!this._started) {
    throw new Error('InputAppsTransitionManager: ' +
      'Instance was never start()\'ed but stop() is called.');
  }
  this._started = false;

  this._element.removeEventListener('transitionend', this, true);

  this.currentState = undefined;
  this.occupyingHeight = undefined;
  this._element = null;
};

InputAppsTransitionManager.prototype.handleEvent = function(evt) {
  // We only care about transition: transform
  if (evt.propertyName !== 'transform') {
    return;
  }

  switch (this.currentState) {
    case this.STATE_HIDDEN:
    case this.STATE_VISIBLE:
      // These should never happpen.
      console.error('InputAppsTransitionManager: ' +
        'received transitionend event during incorrect states.');

      break;

    case this.STATE_TRANSITION_IN:
      this._changeState(this.STATE_VISIBLE);

      break;

    case this.STATE_TRANSITION_OUT:
      this.occupyingHeight = undefined;
      this._changeState(this.STATE_HIDDEN);

      break;
  }
};

InputAppsTransitionManager.prototype.STATE_HIDDEN = 0;
InputAppsTransitionManager.prototype.STATE_VISIBLE = 1;
InputAppsTransitionManager.prototype.STATE_TRANSITION_IN = 2;
InputAppsTransitionManager.prototype.STATE_TRANSITION_OUT = 3;

InputAppsTransitionManager.prototype.handleResize = function(height) {
  switch (this.currentState) {
    case this.STATE_HIDDEN:
    case this.STATE_TRANSITION_OUT:
      this.occupyingHeight = height;
      this._changeState(this.STATE_TRANSITION_IN);

      // Start or revert transition
      this._element.classList.remove('no-transition');
      this._element.classList.remove('hide');

      break;

    case this.STATE_VISIBLE:
      if (height === this.occupyingHeight) {
        return;

      }
      this.occupyingHeight = height;
      // No state change, but we need to publish a event.
      this._publish('keyboardchange');

      break;

    case this.STATE_TRANSITION_IN:
      // No state change, simply update the cached height.
      this.occupyingHeight = height;

      break;
  }
};

InputAppsTransitionManager.prototype.hide = function() {
  if (this.currentState === this.STATE_TRANSITION_OUT ||
      this.currentState === this.STATE_HIDDEN) {
    // Do nothing.
    return;
  }
  // No matter what the current state is, we now enters transition out state.
  this._changeState(this.STATE_TRANSITION_OUT);

  // Start hide transition
  this._element.classList.remove('no-transition');
  this._element.classList.add('hide');
};

InputAppsTransitionManager.prototype.hideImmediately = function() {
  if (this.currentState === this.STATE_HIDDEN) {
    // Do nothing.
    return;
  }
  // No matter what the current state is, we now enters transition out state.
  this._changeState(this.STATE_TRANSITION_OUT);

  // hide without transition
  this._element.classList.add('no-transition');
  this._element.classList.add('hide');

  this._changeState(this.STATE_HIDDEN);
};

InputAppsTransitionManager.prototype._changeState = function(state) {
  if (state === this.currentState) {
    // Should not call onstatechange and dispatch events.
    return;
  }

  this.currentState = state;
  if (typeof this.onstatechange === 'function') {
    this.onstatechange();
  }

  // Publish some events.
  switch (state) {
    case this.STATE_HIDDEN:
      this._publish('keyboardhidden');

      break;

    case this.STATE_VISIBLE:
      this._publish('keyboardchange');

      break;

    case this.STATE_TRANSITION_IN:
      // No event in for this state change

      break;

    case this.STATE_TRANSITION_OUT:
      this._publish('keyboardhide');

      break;
  }
};

InputAppsTransitionManager.prototype._publish = function (type) {
  var eventInitDict = {
    bubbles: true,
    cancellable: true,
    detail: {
      height: this.occupyingHeight
    }
  };

  // We dispatch the events at the body level so we are able to intercept
  // them and prevent page resizing where desired.
  var evt = new CustomEvent(type, eventInitDict);
  document.body.dispatchEvent(evt);
};


exports.InputAppsTransitionManager = InputAppsTransitionManager;

})(window);
