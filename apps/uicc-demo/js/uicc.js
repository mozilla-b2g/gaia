/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* Copyright © 2013, Deutsche Telekom, Inc. */


// Applet ID
var aid = [0xD2, 0x76, 0x00, 0x01, 0x18, 0x00, 0x02, 0xFF,
           0x49, 0x50, 0x25, 0x89, 0xC0, 0x01, 0x9B, 0x01];
//var aid = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x00, 0x00];
var apdu = {
  cla: 0x90,
  command: 0x10,
  p1: 0x00,
  p2: 0x00,
  p3: 0x00,
  path: null,
  data: null,
  data2: null
};
/*var apdu = {
cla: 0x80,
command: 0x80,
p1: 0x00,
p2: 0x00,
p3: 0x00,
path: null,
data: null,
data2: null
};*/


var channelId = 0;
var transmitResult = null;

$(document).ready(function() {
$('#openbutton').bind('click', function(event, ui) {
    var aidstr = arrayToHexStr(aid);
    if (isValidChannel(channelId)) {
      appendTextAndScroll('#output', 'Channel already open: (' +
                          channelId + ').');
      return;
    }
    // Open channel to applet ID
    iccOpenChannel(aidstr);
  }
);
$('#exchangebutton').bind('click', function(event, ui) {
    // Issue command to open channelID (associated with AppletID)
    if (!isValidChannel(channelId)) {
      appendTextAndScroll('#output', 'Not a valid channel to transmit.');
      return;
    }
    iccExchangeAPDU(channelId, apdu);
  }
);
$('#closebutton').bind('click', function(event, ui) {
    if (!isValidChannel(channelId)) {
      appendTextAndScroll('#output', 'Not a valid channel to close.');
      return;
    }
    // Close channel to applet.
    iccCloseChannel(channelId);
  }
);
$('#addlistenersbutton').bind('click', function(event, ui) {
    addSecureElementListeners();
    appendTextAndScroll('#output', 'SE Listeners added');
  }
);
$('#removelistenersbutton').bind('click', function(event, ui) {
    removeSecureElementListeners();
    appendTextAndScroll('#output', 'SE Listeners removed');
  }
);
}); // End document ready js block

// Utils
function arrayToHexStr(array) {
  var hexStr = array.map(function(x) {
      x = x.toString(16); // to hex
      x = ('00' + x).slice(-2);
      return x;
    }
  ).join('');
  return hexStr;
}

function hexStringToString(hexstr) {
  var str = '';
  for (var i = 0; i < hexstr.length; i += 2) {
    var charCode = parseInt(hexstr.substr(i, 2), 16);
    str += String.fromCharCode(charCode);
  }
  return str;
}

function isValidChannel(channel) {
  if (channel <= 0 || channel == null || channel === undefined) {
    return false;
  }
  return true;
}

function appendTextAndScroll(htmlElementRef, message) {
  var htmlElement = $(htmlElementRef);
  htmlElement.val(htmlElement.val() + message + '\n');
  // TODO: The animation starts scrollTop at '0' every time, rather than scroll
  // from current position.
  htmlElement.animate({ scrollTop: htmlElement.prop('scrollHeight') -
                        htmlElement.height() }, 0);
}

// UICC applet commands
function iccOpenChannel(aidhexstr) {
  var icc = window.navigator.mozMobileConnection.icc;
  var req = icc.iccOpenChannel(aidhexstr);
  //appendTextAndScroll('#output', 'iccOpenChannel returned.');
  req.onsuccess = function() {
    appendTextAndScroll('#output', 'INFO: Open returns success. Channel: (' +
                        JSON.stringify(this.result) + ')');
    if (!isValidChannel(this.result)) {
      appendTextAndScroll('#output',
                          'INFO: Channel ID invalid. All channels in use.');
    } else {
      channelId = this.result;
    }
  };
  req.onerror = function() {
    appendTextAndScroll('#output', 'ERROR: Open Failure! Return data: (' +
                        JSON.stringify(this.error) + ')');
  };
}

function iccExchangeAPDU(channel, apdu) {
  var icc = window.navigator.mozMobileConnection.icc;
  var req = icc.iccExchangeAPDU(channel, apdu);
  //appendTextAndScroll('#output', 'iccExchangeAPDU returned');
  req.onsuccess = function() {
    appendTextAndScroll('#output',
                        'INFO: APDU Exchange Success! Return data: (' +
                        JSON.stringify(this.result) + ')');
    transmitResult = hexStringToString(this.result[2]);
    appendTextAndScroll('#output', 'INFO: String Result: ' + transmitResult);
  };
  req.onerror = function() {
    appendTextAndScroll('#output',
                        'ERROR: APDU Exchange Failure! Return data: (' +
                        JSON.stringify(this.result) + ')');
  };
}

function iccCloseChannel(channel) {
  var icc = window.navigator.mozMobileConnection.icc;
  var req = icc.iccCloseChannel(channel);
  //appendTextAndScroll('#output', 'iccCloseChannel returned.');
  channelId = 0;
  req.onsuccess = function() {
    appendTextAndScroll('#output',
                        'INFO: Close Success! Return data: (' +
                        JSON.stringify(this.result) + ')');
  };
  req.onerror = function() {
    appendTextAndScroll('#output',
                        'ERROR: Close Failure! Return data: (' +
                        JSON.stringify(this.error) + ')');
  };
}

// NFC Secure Element listeners
function addSecureElementListeners() {
  addSecureElementActivatedListener();
  addSecureElementDeactivatedListener();
  addSecureElementTransactionListener();
}

function removeSecureElementListeners() {
  removeSecureElementActivatedListener();
  removeSecureElementDeactivatedListener();
  removeSecureElementTransactionListener();
}

function addSecureElementActivatedListener() {
  navigator.mozNfc.onsecureelementactivated = function(event) {
    var messageType = event.message.type;
    if (messageType == 'secureElementActivated') {
      var message = 'Secure Element Activated.';
      appendTextAndScroll('#output', message + '\n');
    }
  };
}

function addSecureElementDeactivatedListener() {
  navigator.mozNfc.onsecureelementdeactivated = function(event) {
    var messageType = event.message.type;
    if (messageType == 'secureElementDeactivated') {
      var message = 'Secure Element Deactivated.';
      appendTextAndScroll('#output', message + '\n');
    }
  };
}

function addSecureElementTransactionListener() {
  navigator.mozNfc.onsecureelementtransaction = function(event) {
    var messageType = event.message.type;
    var content = event.message.content;
    if (messageType == 'secureElementTransaction') {
      var message = 'Secure Element Transaction complete. AID: ' +
                    content.aid + ', DATA: ' + content.data;
      appendTextAndScroll('#output', message + '\n');
      alert(message);
    }
  };
}

function removeSecureElementActivatedListener() {
  navigator.mozNfc.onsecureelementactivated = null;
}

function removeSecureElementDeactivatedListener() {
  navigator.mozNfc.onsecureelementdeactivated = null;
}

function removeSecureElementTransactionListener() {
  navigator.mozNfc.onsecureelementtransaction = null;
}
