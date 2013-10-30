/*exported MockNavigatormozMobileMessage */

'use strict';

var MockNavigatormozMobileMessage = {
  _mSmsRequest: null,
  _mMmsRequest: null,
  _mSegmentInfoRequests: [],
  _mMarkReadRequest: null,
  _mMessagesRequest: null,
  _mMessageRequest: null,

  send: function(recipients, content) {
    this._mSmsRequest = [];
    for (var i = 0; i < recipients.length; i++) {
      this._mSmsRequest.push({});
    }
    return this._mSmsRequest;
  },

  sendMMS: function() {
    this._mMmsRequest = {};
    return this._mMmsRequest;
  },

  markMessageRead: function(messageId, value) {
    this._mMarkReadRequest = {};
    return this._mMarkReadRequest;
  },

  mTriggerMarkReadSuccess: function() {
    var evt = { target: { result: null } };

    if (this._mMarkReadRequest && this._mMarkReadRequest.onsuccess) {
      var current = this._mMarkReadRequest;
      this._mMarkReadRequest = null;
      current.onsuccess.call(evt.target, evt);
    }
  },

  getMessages: function(filter, invert) {
    this._mMessagesRequest = {};
    return this._mMessagesRequest;
  },

  getMessage: function(aMessageID) {
    this._mMessageRequest = {};
    return this._mMessageRequest;
  },

  mTriggerMessagesRequest: function(messages) {
    var mock = this;
    if (this._mMessagesRequest && this._mMessagesRequest.onsuccess) {
      var cursor = {
        done: false,
        continue: function() {
          var next = messages.shift();
          if (next === undefined) {
            this.result = null;
            this.done = true;
          } else {
            this.result = next;
          }

          var evt = { target: cursor };
          mock._mMessagesRequest.onsuccess.call(this, evt);
        }
      };

      cursor.continue();
    }
  },

  mTriggerSuccessMessageRequest: function() {
    if (this._mMessageRequest && this._mMessageRequest.onsuccess) {
      this._mMessageRequest.onsuccess.call(this, null);
    }
  },
  getSegmentInfoForText: function() {
    var lastRequest = {};
    this._mSegmentInfoRequests.push(lastRequest);
    return lastRequest;
  },

  mTriggerSegmentInfoSuccess: function(segmentInfo, index) {
    segmentInfo = segmentInfo || this._mDefaultSegmentInfo;
    var evt = { target: { result: segmentInfo } };

    if (this._mSegmentInfoRequests && this._mSegmentInfoRequests.length) {
      if (index === undefined) {
        // trigger the last one
        index = this._mSegmentInfoRequests.length - 1;
      }

      var request = this._mSegmentInfoRequests.splice(index, 1)[0];
      if (request.onsuccess) {
        request.onsuccess.call(evt.target, evt);
      }
    }
  },

  mTriggerSegmentInfoError: function(index) {
    var evt = { target: {} };

    if (this._mSegmentInfoRequests && this._mSegmentInfoRequests.length) {
      if (index === undefined) {
        // trigger the last one
        index = this._mSegmentInfoRequests.length - 1;
      }

      var request = this._mSegmentInfoRequests.splice(index, 1)[0];
      if (request.onerror) {
        request.onerror.call(evt.target, evt);
      }
    }
  },

  getThreads: function() {
    var cursor = {
      result: null
    };

    var evt = { target: {} };
    setTimeout(function() {
      cursor.onsuccess.call(evt.target, evt);
    });
    return cursor;
  },

  _mDefaultSegmentInfo: {
    segments: 1,
    charsAvailableInLastSegment: 150
  },

  mTriggerSmsOnSuccess: function() {
    var evt = { target: { result: null } };

    if (this._mSmsRequest) {
      this._mSmsRequest.forEach(function(request) {
        if (request.onsuccess) {
          request.onsuccess.call(evt.target, evt);
        }
      });
      this._mSmsRequest = null;
    }
  },

  mTriggerSmsOnError: function() {
    var evt = { target: { error: { name: null } } };

    if (this._mSmsRequest) {
      this._mSmsRequest.forEach(function(request) {
        if (request.onerror) {
          request.onerror.call(evt.target, evt);
        }
      });
      this._mSmsRequest = null;
    }
  },

  mTriggerMmsOnSuccess: function() {
    var evt = { target: { result: null } };

    if (this._mMmsRequest && this._mMmsRequest.onsuccess) {
      this._mMmsRequest.onsuccess.call(evt.target, evt);
      this._mMmsRequest = null;
    }
  },

  mTriggerMmsOnError: function() {
    var evt = { target: { error: { name: null } } };

    if (this._mMmsRequest && this._mMmsRequest.onerror) {
      this._mMmsRequest.onerror.call(evt.target, evt);
      this._mMmsRequest = null;
    }
  },

  mTeardown: function() {
    this._mSegmentInfoRequests = [];
    this._mSmsRequest = null;
    this._mMmsRequest = null;
    this._mMarkReadRequest = null;
    this._mMessagesRequest = null;
    this._mMessageRequest = null;
  }
};
