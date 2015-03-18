/*
 * To handle showing value selector in dialog overlay.
 * For now, this is used for trusted UI only, and will be deprecated by
 * Bug 911880.
 */

/* global ValueSelector */

'use strict';

(function(exports) {

function TrustedUiValueSelector(context) {
  // The value selector will be rendered in this.element,
  // usually dialog overlay.
  this.element = context.element;
  this.screen = document.getElementById('screen');
}

exports.TrustedUiValueSelector = TrustedUiValueSelector;

TrustedUiValueSelector.prototype = Object.create(window.BaseUI.prototype);

TrustedUiValueSelector.prototype.start = function() {
  window.addEventListener('mozChromeEvent', this);

  // Only show value selector for trusted UI when it is active
  this.active = false;

  this.render();
};

TrustedUiValueSelector.prototype.stop = function() {
  window.removeEventListener('mozChromeEvent', this);
  this.active = false;
};

TrustedUiValueSelector.prototype.render = function() {
  this.valueSelector = new ValueSelector(this);
};

TrustedUiValueSelector.prototype.handleEvent = function(evt) {
  switch (evt.type) {
    case 'mozChromeEvent':
      if (!this.active ||
          !evt.detail ||
          evt.detail.type !== 'inputmethod-contextchange') {
        return;
      }

      var typesToHandle = ['select-one', 'select-multiple', 'date', 'time',
        'datetime', 'datetime-local', 'blur'];
      if (typesToHandle.indexOf(evt.detail.inputType) < 0) {
        return;
      }
      // Making sure system dialog and app-window won't receive this event.
      evt.stopImmediatePropagation();

      this.debug('broadcast: for value selector');
      this.broadcast('inputmethod-contextchange', evt.detail);

      // Make dialog-overlay show
      if (evt.detail.inputType === 'blur') {
        this.screen.classList.remove('dialog');
      } else {
        this.screen.classList.add('dialog');
      }
      break;
  }
};

TrustedUiValueSelector.prototype._setVisibleForScreenReader =
  function vso__setVisibleForScreenReader(visible) {
  if (this.trustedUiFrame) {
    this.debug('aria-hidden on TrustedUiFrame:' + !visible);
    this.trustedUiFrame.setAttribute('aria-hidden', !visible);
  }
};

TrustedUiValueSelector.prototype.activate = function(frame) {
  this.active = true;
  this.trustedUiFrame = frame;
};

TrustedUiValueSelector.prototype.deactivate = function() {
  this.active = false;
  this.trustedUiFrame = null;
};

}(window));
