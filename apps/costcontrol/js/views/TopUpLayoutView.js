/* exported TopUpLayoutView */
'use strict';

function TopUpLayoutView(ussdTopUpButton, codeTopUpButton) {

  function setupLayout(topUpConfig) {
    var ussdTopUpDisabled = !topUpConfig || !topUpConfig.ussd_destination;
    var codeTopUpDisabled = !topUpConfig || !topUpConfig.destination;
    ussdTopUpButton.disabled = ussdTopUpDisabled;
    ussdTopUpButton.hidden = ussdTopUpDisabled;
    codeTopUpButton.disabled = codeTopUpDisabled;
    codeTopUpButton.hidden = codeTopUpDisabled;
  }

  this.setupLayout = setupLayout;
}
