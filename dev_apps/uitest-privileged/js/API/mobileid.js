'use strict';

var MobileId = {
  init: function() {
    this.clearButton = document.getElementById('clear-button');
    this.clearButton.classList.add('hidden');
    this.clearButton.addEventListener('click', this.onClear.bind(this));

    this.getAssertionButton = document.getElementById('get-assertion-button');
    this.getAssertionButton.addEventListener('click', (function() {
      navigator.getMobileIdAssertion().then(
        this.onAssertion.bind(this),
        this.onError.bind(this)
      );
    }).bind(this));

    this.forceSelectionButton = document.getElementById('force-selection-button');
    this.forceSelectionButton.addEventListener('click', (function() {
      navigator.getMobileIdAssertion({
        forceSelection: true
      }).then(
        this.onAssertion.bind(this),
        this.onError.bind(this)
      );
    }).bind(this));

    this.assertionPlaceholder = document.getElementById('assertion-placeholder');
    this.assertionContainer = document.getElementById('assertion-container');

    this.errorPlaceholder = document.getElementById('error-placeholder');
    this.errorContainer = document.getElementById('error-container');
  },

  onAssertion: function(aAssertion) {
    var segments = aAssertion.split('.');

    var decoded = JSON.parse(atob(segments[1].replace(/-/g, '+')
                                             .replace(/_/g, '/')));
    if (!decoded || !decoded.verifiedMSISDN) {
      this.onError('Invalid assertion :(');
      return;
    }
    this.assertionContainer.classList.remove('hidden');
    this.assertionPlaceholder.textContent = 'Verified phone number ' +
                                            decoded.verifiedMSISDN;
    this.clearButton.classList.remove('hidden');
  },

  onError: function(aError) {
    console.error('ERROR ' + aError.name || aError);
    this.errorContainer.classList.remove('hidden');
    this.errorPlaceholder.textContent = aError.name;
    this.clearButton.classList.remove('hidden');
  },

  onClear: function() {
    this.assertionPlaceholder.textContent = '';
    this.assertionContainer.classList.add('hidden');
    this.errorPlaceholder.textContent = '';
    this.errorContainer.classList.add('hidden');
    this.clearButton.classList.add('hidden');
  },
};

window.addEventListener('DOMContentLoaded', function onload() {
  window.removeEventListener('DOMContentLoaded', onload);
  MobileId.init();
});
