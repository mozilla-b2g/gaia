/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Payment = (function() {
  var providers = null;
  var providerList = null;
  var eventId = null;

  function selectProvider(choice) {
    // Gaia sends the selected payment provider back to Chrome
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentEvent', true, true, {
      id: eventId,
      userSelection: choice
    });
    window.dispatchEvent(event);
    eventId = null;  
  };

  window.addEventListener('mozChromeEvent', function(e) {
    eventId = e.detail.id;
    switch (e.detail.type) {
      // Chrome asks Gaia to show the payment provider selection dialog
      case 'open-payment-selection-dialog':
        providers = e.detail.paymentProviders;
        if (!providers || !eventId)
          return;
        // Once the trusted dialog is opened and the payment provider
        // selection screen is loaded the addProviders function creates
        // and adds one button per payment provider option.
        var items = [];
        providers.forEach(function(provider, index) {
          items.push({
            label: provider.name,
            value: provider.typ
          });
        });
        ListMenu.request(items, selectProvider);
        break;

      // Chrome asks Gaia to show the payment flow according to the
      // payment provider selected by the user.
      case 'open-payment-flow-dialog':
        if (!e.detail.url)
          return;
        providers = null;
        // TODO: For now, known payment providers (BlueVia and Mozilla Market)
        //       only accepts the JWT by GET, so we just add it to the URL.
        e.detail.url += e.detail.jwt;
        var frame = TrustedDialog.open(e.detail.url);
        // After creating the new frame containing the payment provider buy
        // flow, we send it back to chrome so payment callbacks can be
        // injected.
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent('mozContentEvent', true, true, {
          id: e.detail.id,
          frame: frame
        });
        window.dispatchEvent(event);
        break;
    }
  });
})();
