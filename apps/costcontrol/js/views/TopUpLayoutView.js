'use strict';

function TopUpLayoutView(ussdTopUpButton, codeTopUpButton) {

  function setupLayout(topUpConfig) {
    var ussdTopUpDisabled = !topUpConfig || !topUpConfig.ussd_destination;
    var codeTopUpDisabled = !topUpConfig || !topUpConfig.destination;
    ussdTopUpButton.disabled = ussdTopUpDisabled;
    ussdTopUpButton.setAttribute('aria-hidden', ussdTopUpDisabled);
    codeTopUpButton.disabled = codeTopUpDisabled;
    codeTopUpButton.setAttribute('aria-hidden', codeTopUpDisabled);
  }

  this.setupLayout = setupLayout;
}
