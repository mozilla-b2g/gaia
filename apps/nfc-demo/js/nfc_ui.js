var nfcUI = {

pendingNdefMessage: null,
messageArea: null,
p2p: false,
isConnected: false,

setConnectedState: function(connectedState) {
  if (connectedState) {
    this.isConnected = true;
  } else {
    this.isConnected = false;
  }
},

getConnectedState: function() {
  return isConnected;
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
      this.closeTagWriteDialog();
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
      this.pendingNdefMessage, this.p2p);
    this.commonRequestHandler(pendingDomRequest);
    this.pendingNdefMessage = null;
  }
},

closeTagWriteDialog: function() {
  $('.ui-dialog').dialog('close');
},

// Common Nfc UI Write Dialog.
commonRequestHandler: function(pending) {
  if (pending != null) {
    //console.log("bind to onsuccess/onerror");
    pending.onsuccess = function() {
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
    };
    pending.onerror = function(e) {
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
