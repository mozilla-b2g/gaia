'use strict';

function BalanceLowLimitView(lowLimitEnabler, lowLimitInput) {
  var self = this;

  self._lowLimitEnabler = lowLimitEnabler;
  self._lowLimitInput = lowLimitInput;
  self._lowLimitEnabler.addEventListener('click', self);
  self._lowLimitInput.addEventListener('input', self);
  installProperties();
  self.validate();

  function installProperties() {
    var disabled = false;
    Object.defineProperty(self, 'disabled', {
      get: function() {
        return disabled;
      },
      set: function(value) {
        disabled = value;
        self._lowLimitEnabler.disabled = disabled;
        self._lowLimitInput.disabled = disabled;
        self.validate();
      }
    });
  }
}

BalanceLowLimitView.prototype.handleEvent = function() {
  this.validate();
};

BalanceLowLimitView.prototype.validate = function(e) {
  var numericValue = parseFloat(this._lowLimitInput.value, 10);

  this._isValid = this.disabled || !this._lowLimitEnabler.checked ||
                  !Number.isNaN(numericValue) && numericValue > 0;

  this._lowLimitInput.classList[this._isValid ? 'remove' : 'add']('error');
  if (typeof this.onvalidation === 'function') {
    this.onvalidation({type: 'validation', isValid: this._isValid});
  }
};
