/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Support = {
  init: function support_init() {
    this.loadSupportInfo();
  },

  getSupportInfo: function support_getInfo(callback) {
    var SUPPORT_INFO = 'js/support.json';
    if (this._supportInfo) {
      callback(this._supportInfo);
    } else {
      var self = this;
      var xhr = new XMLHttpRequest();
      xhr.onreadystatechange = function loadSupportInfo() {
        if (xhr.readyState === 4) {
          if (xhr.status === 0 || xhr.status === 200) {
            self._supportInfo = xhr.response;
            callback(self._supportInfo);
          } else {
            console.error('Failed to fetch support.json: ',
                          xhr.statusText);
          }
        }
      };
      xhr.open('GET', SUPPORT_INFO, true); // async
      xhr.responseType = 'json';
      xhr.send();
    }
  },

  setLink: function support_setLink(node, data) {
    node.setAttribute('href', data['href']);
    node.textContent = data['text'];
  },

  loadSupportInfo: function support_loadSupportInfo() {
    Support.getSupportInfo(function displaySupportInfo(supportInfo) {
      document.getElementById('online-support-link')
        .setAttribute('href', supportInfo['online-support']['href']);
      document.getElementById('online-support-text')
        .textContent = supportInfo['online-support']['text'];

      var callSupportInfo = supportInfo['call-support'];
      if (callSupportInfo.length == 2) {
        Support.setLink(document.getElementById('call-support-link-1'),
                        callSupportInfo[0]);
        Support.setLink(document.getElementById('call-support-link-2'),
                        callSupportInfo[1]);
      }
      else {
        var link1 = document.getElementById('call-support-link-1')
          .cloneNode(true);
        Support.setLink(link1, callSupportInfo[0]);

        var numbers = document.getElementById('call-support-numbers');
        numbers.innerHTML = '';
        numbers.appendChild(link1);
      }
    });
  }
};

// startup
onLocalized(Support.init.bind(Support));
