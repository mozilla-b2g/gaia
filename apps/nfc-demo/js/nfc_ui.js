/**
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/* Copyright © 2013, Deutsche Telekom, Inc. */


var nfcUI = {

pendingNdefMessage: null,
messageArea: null,
p2p: false,
isConnected: false,
nfcTag: null,
activityData: null,

// NFCTag
closeNFCTag: function() {
  if (this.nfcTag) {
    this.nfcTag.close();
    this.nfcTag = null;
  }
},

// activity data UI global.
setActivityData: function(activityData) {
  this.activityData = activityData;
},

getActivityData: function() {
  return this.activityData;
},

setConnectedState: function(connectedState) {
  if (connectedState) {
    this.isConnected = true;
  } else {
    this.isConnected = false;
  }
},

getConnectedState: function() {
  return this.isConnected;
},

hasPendingMessage: function() {
  if (this.pendingNdefMessage == null) {
    return true;
  } else {
    return false;
  }
},

postPendingMessage: function(msgRecord) {
  this.pendingNdefMessage = msgRecord;
  // Open Write Dialog:
  if (!this.p2p) {
    $('#nfc_tag_write_dialog').click();
    if (this.isConnected) {
      this.writePendingMessage();
    }
  }
},

cancelPendingWrite: function() {
  this.pendingNdefMessage = null;
},

setMessageArea: function(elementRefName) {
  this.messageArea = elementRefName;
},

writePendingMessage: function() {
  if (this.pendingNdefMessage != null) {
    debug('Write pending message');
    var pendingDomRequest = nfcWriter.writeRecordArrayTag(
      this.pendingNdefMessage);
    this.commonRequestHandler(pendingDomRequest);
    this.pendingNdefMessage = null;
  }
},

makeReadOnlyNDEF: function() {
  req = nfcWriter.makeReadOnlyNDEF();
  if (!req) {
    nfcUI.appendTextAndScroll($(nfcUI.messageArea),
      'MakeReadOnly No Tag Present.\n');
  }
  req.onsuccess = function() {
    var msg = this.result;
    nfcUI.appendTextAndScroll($(nfcUI.messageArea),
      'MakeReadOnly result: ' + msg + ' \n');
  };
  req.onerror = function() {
    var msg = this.error;
    nfcUI.appendTextAndScroll($(nfcUI.messageArea),
      'MakeReadOnly error: ' + msg + ' \n');
  };
},

closeTagWriteDialog: function() {
  if ($('.ui-dialog')) {
    debug('XXXX Closing dialog. XXXX');
    $('.ui-dialog').dialog('close');
  } else {
    // FIXME: Use notification of dialog onload instead of timeout.
    setTimeout(function() {
      debug('XXXX Closing dialog. XXXX');
      $('.ui-dialog').dialog('close');
    }, 1000);
  }
},

// Common Nfc UI Write Dialog.
commonRequestHandler: function(pending) {
  debug('In commonRequestHandler: ' + pending);
  if (pending != null) {
    debug('In commonRequestHandler func set.');
    //console.log("bind to onsuccess/onerror");
    pending.onsuccess = function() {
      debug('In commonRequestHandler onsuccess.');
      var msg = this.result;
      var message = 'Tag write successful. (Message: ' +
        JSON.stringify(msg) + ')';
      debug(message);
      // Dismiss dialog, and do anything else you want for UI/UX.
      nfcUI.closeTagWriteDialog();
      if (nfcUI.messageArea == null) {
        alert('Message: ' + message);
        return;
      }
      nfcUI.appendTextAndScroll($(nfcUI.messageArea), message + '\n');
      nfcUI.closeNFCTag();
    };
    pending.onerror = function(e) {
      debug('In commonRequestHandler onerror.');
      var msg = this.error;
      // Print error object.
      var message = 'Error writing tag. (Result: ' + JSON.stringify(msg) + ')';
      debug(message);
      nfcUI.closeTagWriteDialog();
      if (nfcUI.messageArea == null) {
        alert('Error: ' + message);
        return;
      }
      nfcUI.appendTextAndScroll($(nfcUI.messageArea), message + '\n');
      nfcUI.closeNFCTag();
    };
  }
},

scrollToBottom: function(htmlElement) {
  // TODO: The animation starts scrollTop at "0" every time, rather than scroll
  // from current position.
  htmlElement.animate({ scrollTop:
    htmlElement.prop('scrollHeight') - htmlElement.height() }, 0);
},

appendTextAndScroll: function(htmlElement, message) {
  htmlElement.val(htmlElement.val() + message);
  this.scrollToBottom(htmlElement);
}

};
