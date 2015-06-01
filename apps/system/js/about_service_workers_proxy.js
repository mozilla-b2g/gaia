/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/* global IACHandler */

/* exports AboutServiceWorkersProxy */

/**
 * On B2G we cannot directly show the content of about:* pages with access to
 * privileged code. We already have an about:serviceworkers chrome page showing
 * the list of installed service workers on Desktop. Unfortunately we cannot
 * access it from Gaia. To access this information, we need to query the
 * platform from the System app. And to show it we chose to add a new panel
 * inside the existing "Developer" panel in the Settings app. The communication
 * with the Settings app is done via Inter App Communication API.
 *
 * This module acts as a proxy between the Settings app and the platform.
 * The high level picture is the following:
 *
 *      Settings App
 *          |
 *          |- IAC
 *          |
 *      System App
 *          |
 *          |- Chrome/Content events
 *          |
 *        Gecko (ServiceWorkersManager accessed from a B2G dedicated component)
 */

'use strict';

(function(exports) {

  const ASW_CHROME_EVENT = 'mozAboutServiceWorkersChromeEvent';
  const ASW_CONTENT_EVENT = 'mozAboutServiceWorkersContentEvent';

  var AboutServiceWorkersProxy = {

    start: function() {
      window.addEventListener('iac-about-service-workers', this.onPortMessage);
    },

    sendPortMessage: function(message) {
      var port = IACHandler.getPort('about-service-workers', this);
      if (port) {
        port.postMessage(message);
      } else {
        console.error('No about-service-workers port');
      }
    },

    onPortMessage: function(event) {
      if (!event || !event.detail) {
        console.error('Wrong event');
        return;
      }

      var self = AboutServiceWorkersProxy;
      var request = event.detail;

      switch (request.name) {
        case 'init':
        case 'update':
        case 'unregister':
          self.chromeRequest(request).then(result => {
            self.sendPortMessage({
              id: request.id,
              result: result
            });
          }).catch(error => {
            self.sendPortMessage({
              id: request.id,
              error: error
            });
          });
          break;
        default:
          console.error('Wrong method name');
          break;
      }
    },

    sendContentEvent: function(detail) {
      var event = new CustomEvent(ASW_CONTENT_EVENT, {
        detail: detail
      });
      window.dispatchEvent(event);
    },

    chromeRequest: function(request) {
      if (!request) {
        return Promise.reject('InternalErrorMissingEventDetail');
      }

      return new Promise((resolve, reject) => {
        var id = request.id;
        window.addEventListener(ASW_CHROME_EVENT,
                                function onChromeEvent(event) {
          window.removeEventListener(ASW_CHROME_EVENT, onChromeEvent);
          var message = event.detail;
          if (!message || !message.id || message.id != id) {
            return reject('InternalErrorWrongChromeEvent');
          }

          if (message.error) {
            reject(message.error);
          } else if (message.result) {
            resolve(message.result);
          }
        });

        AboutServiceWorkersProxy.sendContentEvent(request);
      });
    }
  };

  exports.AboutServiceWorkersProxy = AboutServiceWorkersProxy;

}(window));

window.addEventListener('DOMContentLoaded', function onloaded() {
  window.removeEventListener('DOMContentLoaded', onloaded);
  window.AboutServiceWorkersProxy.start();
});
