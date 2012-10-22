/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

// TODO: Blocked by [Payment] UX and visuals for the payment request
//       confirmation screen https://github.com/mozilla-b2g/gaia/issues/2692

'use strict';

const kPaymentConfirmationScreen = '../payment.html';

var Payment = (function Payment() {
  var chromeEventId = null;

  window.addEventListener('mozChromeEvent', function onMozChromeEvent(e) {
    // We save the mozChromeEvent identifiers to send replies back from content
    // with this exact value.
    chromeEventId = e.detail.id;
    if (!chromeEventId)
      return;
    switch (e.detail.type) {
      // Chrome asks Gaia to show the payment request confirmation dialog.
      case 'open-payment-confirmation-dialog':
        var requests = e.detail.paymentRequests;
        if (!requests)
          return;

        var returnSelection = function returnSelection(selection) {
          if (!selection)
            return;

          var event = document.createEvent('CustomEvent');
          event.initCustomEvent('mozContentEvent', true, true, {
            id: chromeEventId,
            userSelection: selection
          });
          window.dispatchEvent(event);
        };

        // If there is only one request, we skip the confirmation dialog and
        // send the request type back to the chrome as a user selection, so
        // the payment flow can continue.
        if (requests.length == 1) {
          returnSelection(requests[0].type);
          return;
        }

        var frame = document.createElement('iframe');
        frame.setAttribute('mozbrowser', 'true');
        frame.setAttribute('remote', true);
        frame.classList.add('screen');
        frame.src = kPaymentConfirmationScreen;
        frame.addEventListener('mozbrowserloadend', function addReqs(evt) {
          var frame = evt.target;
          if (!frame || !requests)
            return;

          // TODO: Temp layout until issue #2692 is solved.
          var frameDocument = frame.contentWindow.document;
          var requestsList = frameDocument.getElementById('requests')
                             .getElementsByTagName('ul')[0];
          for (var i in requests) {
            var requestElement = frameDocument.createElement('li');
            var button = frameDocument.createElement('button');
            button.setAttribute('value', requests[i].type);
            var requestText = 'Pay with ' + requests[i].providerName + '\n' +
                              requests[i].productName + '\n' +
                              requests[i].productDescription + '\n' +
                              requests[i].productPrice[0].amount + ' ' +
                              requests[i].productPrice[0].currency;
            button.appendChild(frameDocument.createTextNode(requestText));
            button.onclick = function selectRequest() {
              // We send the selected request back to Chrome so it can start
              // the appropriate payment flow.
              returnSelection(this.getAttribute('value'));
            };
            requestElement.appendChild(button);
            requestsList.appendChild(requestElement);
          }
        });

        // The payment request confirmation screen is shown within the trusted
        // UI.
        TrustedUIManager.open('payment-confirmation', frame,
                              kPaymentConfirmationScreen, chromeEventId);
        break;

      // Chrome asks Gaia to show the payment flow according to the
      // payment request selected by the user.
      case 'open-payment-flow-dialog':
        if (!e.detail.uri)
          return;
        // TODO: For now, known payment providers (BlueVia and Mozilla Market)
        //       only accepts the JWT by GET, so we just add it to the URI.
        e.detail.uri += e.detail.jwt;

        var frame = document.createElement('iframe');
        frame.setAttribute('mozbrowser', 'true');
        frame.classList.add('screen');
        frame.src = e.detail.uri;
        frame.addEventListener('mozbrowserloadstart', function loadStart(evt) {
          // After creating the new frame containing the payment provider buy
          // flow, we send it back to chrome so the payment callbacks can be
          // injected.
          var event = document.createEvent('CustomEvent');
          event.initCustomEvent('mozContentEvent', true, true, {
            id: chromeEventId,
            frame: evt.target
          });
          window.dispatchEvent(event);
        });

        // The payment flow is shown within the trusted UI.
        TrustedUIManager.open('PaymentFlow', frame, e.detail.uri,
                              chromeEventId);
        break;

      case 'close-payment-flow-dialog':
        TrustedUIManager.close(function dialogClosed() {
          var event = document.createEvent('customEvent');
          event.initCustomEvent('mozContentEvent', true, true,
                                { id: chromeEventId });
          window.dispatchEvent(event);
        });
        break;
    }
  });
})();
