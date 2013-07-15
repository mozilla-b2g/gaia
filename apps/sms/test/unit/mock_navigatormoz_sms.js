'use strict';

var MockNavigatormozMobileMessage = {
  smsRequest: null,
  mmsRequest: null,

  send: function(recipients, content) {
    this.smsRequest = [];
    for (var i = 0; i < recipients.length; i++) {
      this.smsRequest.push({});
    }
    return this.smsRequest;
  },

  sendMMS: function() {
    this.mmsRequest = {};
    return this.mmsRequest;
  },

  getSegmentInfoForText: function() {
    return this.mNextSegmentInfo || this.mDefaultSegmentInfo;
  },

  getThreads: function() {
    var cursor = {
      result: null
    };
    setTimeout(function() {
      cursor.onsuccess();
    });
    return cursor;
  },

  mNextSegmentInfo: null,

  mDefaultSegmentInfo: {
    segments: 1,
    charsAvailableInLastSegment: 150
  },

  mTriggerSmsOnSuccess: function() {
    var evt = { target: { result: null } };

    if (this.smsRequest) {
      this.smsRequest.forEach(function(request) {
        if (request.onsuccess) {
          request.onsuccess(evt);
        }
      });
    }
  },

  mTriggerSmsOnError: function() {
    var evt = { target: { error: { name: null } } };

    if (this.smsRequest) {
      this.smsRequest.forEach(function(request) {
        if (request.onerror) {
          request.onerror(evt);
        }
      });
    }
  },

  mTriggerMmsOnSuccess: function() {
    var evt = { target: { result: null } };

    if (this.mmsRequest.onsuccess) {
      this.mmsRequest.onsuccess(evt);
    }
  },

  mTriggerMmsOnError: function() {
    var evt = { target: { error: { name: null } } };

    if (this.mmsRequest.onerror) {
      this.mmsRequest.onerror(evt);
    }
  },

  mTeardown: function() {
    this.mNextSegmentInfo = null;
  }
};
