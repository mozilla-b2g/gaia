/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global Service */

// TODO: Blocked by [Payment] UX and visuals for the payment request
//       confirmation screen https://github.com/mozilla-b2g/gaia/issues/2692

'use strict';

const kPaymentConfirmationScreen = '../payment.html';

var Payment = {
  // We need to save a match between chrome event id and payment
  // request id so we can return the appropriate value when a payment
  // window is manually closed by the user.
  paymentWindows: new Map(),

  init: function init() {
    // XXX Use payment specific event - Bug 1126812
    window.addEventListener('mozChromeEvent', this);
  },

  dispatchEvent: function dispatchEvent(obj) {
    var event = document.createEvent('CustomEvent');
    event.initCustomEvent('mozContentEvent', true, true, obj);
    window.dispatchEvent(event);
  },

  handleEvent: function onMozChromeEvent(e) {
    var self = this;

    // We save the mozChromeEvent identifiers to correlate chrome with content
    // events.
    var chromeEventId = e.detail.id;
    if (!chromeEventId) {
      return;
    }

    // requestId identifies the mozPay DOMRequest identifier.
    var requestId = e.detail.requestId;
    var frame;

    switch (e.detail.type) {
      // Chrome asks Gaia to show the payment request confirmation dialog.
      case 'open-payment-confirmation-dialog':
        var requests = e.detail.paymentRequests;
        if (!requests) {
          self.dispatchEvent({
            id: chromeEventId,
            type: 'cancel',
            errorMsg: 'INVALID_REQUEST'
          });
          return;
        }

        var returnSelection = (function(chromeEventId) {
          return function(selection) {
            if (!selection) {
              return;
            }

            self.dispatchEvent({
              id: chromeEventId,
              userSelection: selection
            });
          };
        })(chromeEventId);

        // If there is only one request, we skip the confirmation dialog and
        // send the request type back to the chrome as a user selection, so
        // the payment flow can continue.
        if (requests.length == 1) {
          returnSelection(requests[0].type, e.detail.id);
          return;
        }

        frame = document.createElement('iframe');
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
            /* jshint -W083 */
            button.onclick = function selectRequest() {
              // We send the selected request back to Chrome so it can start
              // the appropriate payment flow.
              returnSelection(this.getAttribute('value'));
            };
            /* jshint +W083 */
            requestElement.appendChild(button);
            requestsList.appendChild(requestElement);
          }
        });

        this.openPaymentWindow(frame, requestId, chromeEventId);
        break;

      // Chrome asks Gaia to show the payment flow according to the
      // payment request selected by the user.
      case 'open-payment-flow-dialog':
        // We create the payment iframe but we don't set its src. Instead
        // we simply return the iframe instance to the platform once it is
        // inserted in the trusted UI container. At that point the platform
        // sets the corresponding payment information in the iframe.
        frame = document.createElement('iframe');
        frame.setAttribute('mozbrowser', 'true');
        frame.classList.add('screen');

        // We place the iframe in the DOM so we can get a DocShell and once
        // we did that, we give the iframe back to the platform so it can set
        // the appropriate flags including the iframe source.

        var ontrustedopened = (function(requestId, chromeEventId) {
          return function(event) {
            if (!event.detail ||
                !event.detail.config ||
                event.detail.config.requestId != requestId) {
              return;
            }
            window.removeEventListener('trustedopened', ontrustedopened);
            // The iframe is already inserted in the trusted UI container at
            // this point.
            self.dispatchEvent({
              id: chromeEventId,
              frame: frame
            });
          };
        })(requestId, chromeEventId);

        window.addEventListener('trustedopened', ontrustedopened);
        this.openPaymentWindow(frame, requestId, chromeEventId);
        break;

      case 'close-payment-flow-dialog':
        var ontrustedclosed = (function(requestId, chromeEventId) {
          return function(event) {
            if (!event.detail ||
                !event.detail.config ||
                event.detail.config.requestId != requestId) {
              return;
            }
            window.removeEventListener('trustedclosed', ontrustedclosed);
            self.dispatchEvent({
              id: chromeEventId
            });
          };
        })(requestId, chromeEventId);

        if (!this.removePaymentWindow(requestId)) {
          return;
        }

        window.addEventListener('trustedclosed', ontrustedclosed);
        window.dispatchEvent(new CustomEvent('killtrusted', {
          detail: {
            requestId: requestId,
            chromeId: chromeEventId
          }
        }));
        break;
    }
  },

  openPaymentWindow: function openPaymentWindow(frame, requestId,
                                                chromeEventId) {
    this.addPaymentWindow(requestId, chromeEventId);

    // The payment flow is shown within the trusted UI with the name of
    // the mozPay caller application as title.
    var app = Service.query('getTopMostWindow');
    var title = app ? app.manifest.name : null;
    title = title ? title : navigator.mozL10n.get('payment-flow');

    window.dispatchEvent(new CustomEvent('launchtrusted', {
      detail: {
        name: title,
        frame: frame,
        requestId: requestId,
        chromeId: chromeEventId
      }
    }));
  },

  addPaymentWindow: function addPaymentWindow(requestId, chromeEventId) {
    if (this.paymentWindows.has(requestId)) {
      return;
    }

    // We need to tell the chrome side about the user manually closing the
    // payment flow so the payment API can notify to the mozPay caller about
    // the flow being canceled.
    if (!this.paymentWindows.length) {
      window.addEventListener('trustedclosed',
                              this.onPaymentWindowClosedByUser.bind(this));
    }
    this.paymentWindows.set(requestId, chromeEventId);
  },

  removePaymentWindow: function removePaymentWindow(requestId) {
    if (!this.paymentWindows.has(requestId)) {
      return false;
    }

    this.paymentWindows.delete(requestId);

    if (!this.paymentWindows.size) {
      window.removeEventListener('trustedclosed',
                                 this.onPaymentWindowClosedByUser);
    }

    return true;
  },

  onPaymentWindowClosedByUser: function onPaymentWindowClosedByUser(event) {
    var detail = event.detail;
    if (!detail || !detail.config ||
        !this.paymentWindows.has(detail.config.requestId)) {
      return;
    }

    var requestId = detail.config.requestId;

    this.dispatchEvent({
      id: this.paymentWindows.get(requestId),
      type: 'cancel',
      errorMsg: 'DIALOG_CLOSED_BY_USER'
    });

    this.removePaymentWindow(requestId);
  }
};

// unit tests call init() manually
if (navigator.mozL10n) {
  navigator.mozL10n.once(Payment.init.bind(Payment));
}
