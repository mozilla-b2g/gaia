'use strict';

// JSZhuyinServer provides a postMessage interface to communicate
// with JSZhuyin.
var JSZhuyinServer = {
  engine: null,
  messageTarget: self.opener || self.parent || self,
  load: function w_load() {
    self.addEventListener('message', this);

    var engine = this.engine = new JSZhuyin();
    (['loadend',
      'load',
      'error',
      'unload',
      'compositionupdate',
      'compositionend',
      'candidateschange',
      'actionhandled']).forEach((function attachCallback(type) {
        engine['on' + type] = this.getSender(type);
      }).bind(this));
  },
  getSender: function w_getSender(type) {
    var self = this;
    return function w_sender(data, reqId) {
      self.sendMessage(type, data, reqId);
    };
  },
  handleEvent: function w_handleEvent(evt) {
    var msg = evt.data;
    if (msg['sender'] === 'worker')
      return;

    if (msg['type'] === 'config') {
      var data = msg['data'];
      for (var key in msg['data']) {
        this.engine[key] = data[key];
      }

      return;
    }

    if (typeof this.engine[msg['type']] !== 'function') {
      throw 'Unknown message type: ' + msg['type'];
    }

    this.engine[msg['type']](msg['data'], msg['requestId']);
  },
  sendMessage: function w_sendMessage(type, data, reqId) {
    if (typeof window === 'object') {
      this.messageTarget.postMessage(
        { 'type': type, 'data': data,
          'requestId': reqId, 'sender': 'worker' }, '*');
    } else {
      this.messageTarget.postMessage(
        { 'type': type, 'data': data, 'requestId': reqId });
    }
  }
};

JSZhuyinServer.load();
