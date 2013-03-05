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
    var SUPPORT_INFO = 'resources/support.json';
    var xhr = new XMLHttpRequest();
    xhr.onerror = function() {
      console.error('Failed to fetch support.json: ',
                    xhr.statusText);
    };
    xhr.onload = function loadSupportInfo() {
      if (xhr.status === 0 || xhr.status === 200) {
        self._supportInfo = xhr.response;
        callback(self._supportInfo);
      }
    };
    xhr.open('GET', SUPPORT_INFO, true); // async
    xhr.responseType = 'json';
    xhr.send();
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
      link.href = supportInfo.onlinesupport.href;
      link.target = 'blank';
      text.textContent = supportInfo.onlinesupport.title;

      var callSupportInfo = supportInfo.callsupport;
      var numbers = document.getElementById('call-support-numbers');
      if (callSupportInfo.length < 2) {
        numbers.appendChild(self.createLinkNode(callSupportInfo[0]));
      } else {
        var link1 = self.createLinkNode(callSupportInfo[0]);
        var link2 = self.createLinkNode(callSupportInfo[1]);
        numbers.innerHTML = navigator.mozL10n
          .get('call-support-numbers', { 'link1': link1.outerHTML,
                                         'link2': link2.outerHTML });
      }
    });
  }
};

// startup
navigator.mozL10n.ready(Support.init.bind(Support));
