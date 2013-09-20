/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Support = {
  init: function support_init() {
    var url = 'http://support.mozilla.org/products/firefox-os';
    document.querySelector('[data-l10n-id="user-guide"]').onclick =
      function openUserGuide() { openLink(url) };

    this.loadSupportInfo();
  },

  getSupportInfo: function support_getInfo(callback) {
    if (this._supportInfo) {
      callback(this._supportInfo);
      return;
    }
    var self = this;
    loadJSON('/resources/support.json', function loadSupportInfo(data) {
      self._supportInfo = data;
      callback(self._supportInfo);
    });
  },

  createLinkNode: function support_createLinkNode(data) {
    var link = document.createElement('a');
    link.setAttribute('href', data.href);
    link.textContent = data.title;
    return link;
  },

  loadSupportInfo: function support_loadSupportInfo() {
    var self = this;
    this.getSupportInfo(function displaySupportInfo(supportInfo) {
      if (!supportInfo) {
        return;
      }

      document.getElementById('help')
        .setAttribute('data-has-support-info', true);

      var link = document.getElementById('online-support-link');
      var text = document.getElementById('online-support-text');
      var settings = Settings.mozSettings;
      var transaction = settings.createLock();
      link.target = 'blank';

      var onlineSupportTitleRequest =
        transaction.get('support.onlinesupport.title');

      onlineSupportTitleRequest.onsuccess = function() {
        var onlineSupportTitle =
          onlineSupportTitleRequest.result['support.onlinesupport.title'];
        if (onlineSupportTitle !== '') {
          var onlineSupportHrefRequest =
            transaction.get('support.onlinesupport.href');
          onlineSupportHrefRequest.onsuccess = function() {
            link.href =
              onlineSupportHrefRequest.result['support.onlinesupport.href'];
            text.textContent = onlineSupportTitle;
          };
        }
        else {
          link.href = supportInfo.onlinesupport.href;
          text.textContent = supportInfo.onlinesupport.title;
        }
      };

      // We'll stash the support info in here when reading from the Settings.
      // If no values are found in Settings for support info We'll refer to the
      // JSON File Data.
      var callSupportInfo = null;

      // Local helper function to set the information once we've retrieved it.
      function setSupportInfo(supportInfo) {
        var numbers = document.getElementById('call-support-numbers');
        if (callSupportInfo.length < 2) {
          numbers.appendChild(self.createLinkNode(callSupportInfo[0]));
        }
        else {
          var link1 = self.createLinkNode(callSupportInfo[0]);
          var link2 = self.createLinkNode(callSupportInfo[1]);
          numbers.innerHTML = navigator.mozL10n
            .get('call-support-numbers', { 'link1': link1.outerHTML,
                                           'link2': link2.outerHTML });
        }
      }

      // Check to see if we have a title for the first support number.
      var callSupportTitle1Req =
        transaction.get('support.callsupport1.title');
      callSupportTitle1Req.onsuccess = function() {
        var callSupport1Title =
          callSupportTitle1Req.result['support.callsupport1.title'];
        // If we have a title we'll go ahead and load the href for it too.
        if (callSupport1Title !== '') {
          var callSupportHref1Req =
            transaction.get('support.callsupport1.href');
          callSupportHref1Req.onsuccess = function() {
            callSupportInfo = [
              {
                'title': callSupport1Title,
                'href': callSupportHref1Req.result['support.callsupport1.href']
              }
            ];

            // Now check to see if we have a title for the second
            // support number. If we do, we'll load it's href as well.
            var callSupportTitle2Req =
              transaction.get('support.callsupport2.title');
            callSupportTitle2Req.onsuccess = function() {
              var callSupport2Title =
                callSupportTitle2Req.result['support.callsupport2.title'];
              if (callSupport2Title !== '') {
                var callSupportHref2Req =
                  transaction.get('support.callsupport2.href');
                callSupportHref2Req.onsuccess = function() {
                  callSupportInfo.push({
                    'title': callSupport2Title,
                    'href': callSupportHref2Req.result[
                      'support.callsupport2.href'
                    ]
                  });
                  // Finally set the support info retreived from Settings.
                  setSupportInfo(callSupportInfo);
                };
              }
            };
          };
        }
        else {
          // No customized values, use what's in the JSON file.
          setSupportInfo(supportInfo.callsupport);
        }
      };
    });
  }
};

// startup
navigator.mozL10n.ready(Support.init.bind(Support));
