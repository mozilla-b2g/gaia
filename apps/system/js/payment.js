/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

const kPaymentProvidersDialog = 'payment.html';
const kPaymentProvidersDir = 'resources/images/payment/';

var Payment = (function() {
  var providers = null;
  var providerList = null;
  var eventId = null;

  function addProviders(evt) {
    var frame = evt.target;
    if (!frame || !providers)
      return

    var frameDocument = frame.contentWindow.document;
    var providersHolder = frameDocument.getElementById('providers');
    providerList = providersHolder.getElementsByTagName('ul')[0];
    for (var i in providers) {
      var providerElement = frameDocument.createElement('li');
      var button = frameDocument.createElement('button');
      button.setAttribute('type', 'button');
      button.setAttribute('value', providers[i].typ);
      button.onclick = function selectProvider(evt) {
        // Gaia send the selected payment provider back to Chrome
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent('mozContentEvent', true, true,
                              {id: eventId,
                               userSelection: this.getAttribute('value')});
        window.dispatchEvent(event);
        eventId = null;
      };
      button.classList.add(providers[i].name);
      providerElement.appendChild(button);
      providerList.appendChild(providerElement);
    }
    return true;
  };

  function close() {
    TrustedDialog.close();
  };

  window.addEventListener('mozChromeEvent', function(e) {
    switch (e.detail.type) {
      // Chrome asks Gaia to show the payment provider selection dialog
      case 'open-payment-selection-dialog':
        providers = e.detail.paymentProviders;
        eventId = e.detail.id;
        if (!providers || !eventId)
          return;
        // Once the trusted dialog is opened and the payment provider
        // selection screen is loaded the addProviders function creates
        // and adds one button per payment provider option.
        var frame = TrustedDialog.open(kPaymentProvidersDialog,
                                       addProviders);
        break;

      // Chrome asks Gaia to show the payment flow according to the
      // payment provider selected by the user.
      case 'open-payment-flow-dialog':
        if (!e.detail.url)
          return;
        providers = null;
        var frame = TrustedDialog.open(e.detail.url);
        // After creating the new frame containing the payment provider buy
        // flow, we send it back to chrome so payment callbacks can be
        // injected.
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent('mozContentEvent', true, true,
                              {id: e.detail.id, frame: frame});
        window.dispatchEvent(event);
        break;
    }
  });

  return {
    close: close
  };
})();
