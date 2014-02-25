/* global OptionMenu */
/* exported SimPicker */

'use strict';

(function(exports) {

  /*
   * SimPicker is a helper to dynamically generate menus for selecting SIM
   * cards when making calls, sending SMS, etc.
   */
  var SimPicker = {
    show: function hk_show(defaultCardIndex, phoneNumber, simSelectedCallback) {
      var params = {
        headerL10nId: 'select-sim-dial-via',
        headerL10nArgs: {phoneNumber: phoneNumber},
        classes: ['select-sim-menu'],
        items: []
      };

      for (var i = 0; i < window.navigator.mozMobileConnections.length; i++) {
        var appendElem = null;
        if (i === defaultCardIndex) {
          appendElem = document.createElement('span');
          appendElem.classList.add('sim-default');
          appendElem.textContent =
            navigator.mozL10n.localize(appendElem,
                                       'select-sim-menu-button-default');
        }

        params.items.push({
          l10nId: 'select-sim-menu-button',
          l10nArgs: {n: i+1},
          method: simSelectedCallback,
          append: appendElem,
          params: [i]
        });
      }
      params.items.push({
        l10nId: 'cancel',
        incomplete: true
      });

      new OptionMenu(params).show();
    }
  };

  exports.SimPicker = SimPicker;

})(window);
