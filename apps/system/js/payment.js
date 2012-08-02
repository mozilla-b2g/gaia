/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Payment = (function() {
  var chromeEventId = null;

  function selectProvider(choice) {
    // Gaia sends the selected payment provider back to Chrome
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentEvent', true, true, {
      id: chromeEventId,
      userSelection: choice
    });
    window.dispatchEvent(event);
    chromeEventId = null;
  };

  window.addEventListener('mozChromeEvent', function onMozChromeEvent(e) {
    chromeEventId = e.detail.id;
    if (!chromeEventId)
      return;
    switch (e.detail.type) {
      // Chrome asks Gaia to show the payment provider selection dialog
      case 'open-payment-selection-dialog':
        var providers = e.detail.paymentProviders;
        if (!providers)
          return;
        // We use ListMenu to show the payment provider options.
        var items = providers.map(function(provider) {
          return {
            label: provider.name,
            value: provider.type
          };
        });
        ListMenu.request(items, selectProvider);
        break;

      // Chrome asks Gaia to show the payment flow according to the
      // payment provider selected by the user.
      case 'open-payment-flow-dialog':
        if (!e.detail.url)
          return;
        // TODO: For now, known payment providers (BlueVia and Mozilla Market)
        //       only accepts the JWT by GET, so we just add it to the URL.
        e.detail.url += e.detail.jwt;

        var frame = TrustedDialog.open(e.detail.url);
        // After creating the new frame containing the payment provider buy
        // flow, we send it back to chrome so payment callbacks can be
        // injected.
        var event = document.createEvent('CustomEvent');
        event.initCustomEvent('mozContentEvent', true, true, {
          id: chromeEventId,
          frame: frame
        });
        window.dispatchEvent(event);
        break;
    }
  });
})();
