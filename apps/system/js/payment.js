/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

// TODO: Blocked by [Payment] UX and visuals for the payment request
//       confirmation screen https://github.com/mozilla-b2g/gaia/issues/2692

'use strict';

const kPaymentConfirmationScreen = '../payment.html';

var Payment = {
  chromeEventId: null,
  trustedUILayers: {},

  init: function init() {
    window.addEventListener('mozChromeEvent', this);
  },

  handleEvent: function onMozChromeEvent(e) {
    // We save the mozChromeEvent identifiers to send replies back from content
    // with this exact value.
    this.chromeEventId = e.detail.id;
    if (!this.chromeEventId) {
      return;
    }
    this.requestId = e.detail.requestId;

    switch (e.detail.type) {
      // Chrome asks Gaia to show the payment request confirmation dialog.
      case 'open-payment-confirmation-dialog':
        var requests = e.detail.paymentRequests;
        if (!requests)
          return;

        var returnSelection = (function returnSelection(selection) {
          if (!selection)
            return;

          this._dispatchEvent({
            id: this.chromeEventId,
            userSelection: selection
          });
        }).bind(this);

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
          if (!frame || !requests) {
            return;
          }

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

        this._openTrustedUI(frame);
        break;

      // Chrome asks Gaia to show the payment flow according to the
      // payment request selected by the user.
      case 'open-payment-flow-dialog':
        this.trustedUILayers[this.requestId] = this.chromeEventId;

        // We create the payment iframe but we don't set its src. Instead
        // we simply return the iframe instance to the platform once it is
        // inserted in the trusted UI container. At that point the platform
        // sets the corresponding payment information in the iframe.
        var frame = document.createElement('iframe');
        frame.setAttribute('mozbrowser', 'true');
        frame.classList.add('screen');

        // We place the iframe in the DOM so we can get a DocShell and once
        // we did that, we give the iframe back to the platform so it can set
        // the appropriate flags including the iframe source.

        var ontrustedopened = (function(event) {
          if (!event.detail ||
              !event.detail.config ||
              event.detail.config.requestId != this.requestId) {
            return;
          }
          window.removeEventListener('trustedopened', ontrustedopened);
          // The iframe is already inserted in the trusted UI container at this
          // point.
          this._dispatchEvent({
            id: this.chromeEventId,
            frame: frame
          });
        }).bind(this);

        window.addEventListener('trustedopened', ontrustedopened);
        this._openTrustedUI(frame);
        break;

      case 'close-payment-flow-dialog':
        var ontrustedclosed = (function(event) {
          if (!event.detail ||
              !event.detail.config ||
              event.detail.config.requestId != this.requestId) {
            return;
          }
          window.removeEventListener('trustedclosed', ontrustedclosed);
          this._dispatchEvent({ id: this.chromeEventId });
        }).bind(this);

        window.addEventListener('trustedclosed', ontrustedclosed);
        window.dispatchEvent(new CustomEvent('killtrusted', {
          detail: {
            requestId: this.requestId,
            chromeId: this.chromeEventId
          }
        }));
        break;
    }
  },

  _openTrustedUI: function _openTrustedUI(frame) {
    // The payment flow is shown within the trusted UI with the name of
    // the mozPay caller application as title.
    var title = Service.currentApp.name;
    title = title ? title : navigator.mozL10n.get('payment-flow');

    window.dispatchEvent(new CustomEvent('launchtrusted', {
      detail: {
        name: title,
        frame: frame,
        requestId: this.requestId,
        chromeId: this.chromeEventId
      }
    }));
  },

  _dispatchEvent: function _dispatchEvent(obj) {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentEvent', true, true, obj);
    window.dispatchEvent(event);
  }
};

// unit tests call init() manually
if (navigator.mozL10n) {
  navigator.mozL10n.once(Payment.init.bind(Payment));
}
