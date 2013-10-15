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

  createLinkNode: function support_createLinkNode(data, type) {
    var link = document.createElement('a');
    link.setAttribute('href', data.href);
    link.classList.add('link-text');
    if (type == 'tel') {
      link.textContent = data.title + ' (' + data.href + ')';
    } else {
      link.textContent = data.title;
    }
    return link;
  },

  loadSupportInfo: function support_loadSupportInfo() {
    var self = this;
    this.getSupportInfo(function displaySupportInfo(supportInfo) {

      // Indicate to our panel that there is support info present.
      function enableSupportInfo() {
        document.getElementById('help')
        .setAttribute('data-has-support-info', true);
      }

      // Local helper function to set the online support information once it's
      // retrieved or we've determined that we'll use what's in the build
      // JSON file.
      function setOnlineSupportInfo(onlineSupportInfo) {
        enableSupportInfo();
        var text = document.getElementById('online-support-text');
        text.appendChild(self.createLinkNode(onlineSupportInfo));
      }

      var settings = Settings.mozSettings;
      var transaction = settings.createLock();

      var onlineSupportTitleRequest =
        transaction.get('support.onlinesupport.title');

      onlineSupportTitleRequest.onsuccess = function() {
        var onlineSupportInfo = null;
        var onlineSupportTitle =
          onlineSupportTitleRequest.result['support.onlinesupport.title'];
        if (onlineSupportTitle !== '') {
          onlineSupportInfo = { title: onlineSupportTitle };
          var onlineSupportHrefRequest =
            transaction.get('support.onlinesupport.href');
          onlineSupportHrefRequest.onsuccess = function() {
            onlineSupportInfo.href =
              onlineSupportHrefRequest['support.onlinesupport.href'];
            setOnlineSupportInfo(onlineSupportInfo);
          };
        } else if (supportInfo) {
          setOnlineSupportInfo(supportInfo.onlinesupport);
        }
      };

      // We'll stash the support info in here when reading from the Settings.
      // If no values are found in Settings for support info We'll refer to the
      // JSON File Data.
      var callSupportInfo = null;

      // Local helper function to set the information once we've retrieved it.
      function setCallSupportInfo(supportInfo) {
        enableSupportInfo();
        var numbers = document.getElementById('call-support-numbers');
        for (var id in supportInfo)
          numbers.appendChild(self.createLinkNode(supportInfo[id], 'tel'));
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
                  setCallSupportInfo(callSupportInfo);
                };
              }
            };
          };
        } else if (supportInfo) {
          // No customized values, use what's in the JSON file.
          setCallSupportInfo(supportInfo.callsupport);
        }
      };
      callSupportTitle1Req.onerror = function() {
        if (supportInfo) {
          setCallSupportInfo(supportInfo.callsupport);
        }
      };
    });
  }
};

// startup
navigator.mozL10n.ready(Support.init.bind(Support));
