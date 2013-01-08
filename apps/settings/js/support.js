/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Support = {
  init: function support_init() {
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

  loadSupportInfo: function support_loadSupportInfo() {
    var self = this;
    this.getSupportInfo(function displaySupportInfo(supportInfo) {
      document.getElementById('online-support-link')
        .setAttribute('href', supportInfo.onlinesupport.href);
      document.getElementById('online-support-text')
        .textContent = supportInfo.onlinesupport.title;

      var callSupportInfo = supportInfo.callsupport;
      var numbers = document.getElementById('call-support-numbers');
      if (callSupportInfo.length < 2) {
        numbers.innerHTML = navigator.mozL10n
          .get('call-support-numbers1',
               { 'link': callSupportInfo[0].href,
                 'title': callSupportInfo[0].title
               });
      } else {
        numbers.innerHTML = navigator.mozL10n
          .get('call-support-numbers2',
               { 'link1': callSupportInfo[0].href,
                 'title1': callSupportInfo[0].title,
                 'link2': callSupportInfo[1].href,
                 'title2': callSupportInfo[1].title
               });
      }
    });
  }
};

// startup
onLocalized(Support.init.bind(Support));
