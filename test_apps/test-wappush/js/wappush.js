/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

window.addEventListener('load', function() {
  window.navigator.mozSetMessageHandler('wappush-received', function(message) {
    // To UI
    document.getElementById('sender').value = message.sender;
    document.getElementById('contentType').value = message.contentType;
    document.getElementById('content').value = message.content;

    // To logcat
    dump('###################### Wap Push Received ######################\n');
    dump('Sender: ' + message.sender + '\n');
    dump('Content Type: ' + message.contentType + '\n');
    dump('Content: ' + message.content + '\n');
    dump('###############################################################\n');
  });
});

