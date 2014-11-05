/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

window.addEventListener('load', function() {
  window.navigator.mozSetMessageHandler('wappush-received', function(message) {
    // To UI
    document.getElementById('sender').value = message.sender;
    document.getElementById('contentType').value = message.contentType;
    document.getElementById('content').value = message.content;
    document.getElementById('contentLength').value = message.content.length;
    if (message.authInfo) {
      document.getElementById('authPass').value = message.authInfo.pass;
      document.getElementById('authChecked').value = message.authInfo.checked;
      document.getElementById('authSEC').value = message.authInfo.sec;
      document.getElementById('authMAC').value = message.authInfo.mac;
      document.getElementById('authWbxmlLength').value = message.authInfo.data.length;
      document.getElementById('authWbxml').value = JSON.stringify(message.authInfo.data);
    }

    // To logcat
    dump('###################### Wap Push Received ######################\n');
    dump('Sender: ' + message.sender + '\n');
    dump('Content Type: ' + message.contentType + '\n');
    dump('Content: ' + message.content + '\n');
    if (message.authInfo) {
      dump('Authentication Infomation:\n');
      dump('Pass: ' + message.authInfo.pass + '\n');
      dump('Checked: ' + message.authInfo.checked + '\n');
      dump('SEC: ' + message.authInfo.sec + '\n');
      dump('MAC: ' + message.authInfo.mac + '\n');
      dump('Data(' + message.authInfo.data.length + '): ' + JSON.stringify(message.authInfo.data) + '\n');
    }
    dump('###############################################################\n');
  });
});

