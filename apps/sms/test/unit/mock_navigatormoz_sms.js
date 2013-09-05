'use strict';

var MockNavigatormozMobileMessage = {
  _mSmsRequest: null,
  _mMmsRequest: null,
  _mSegmentInfoRequests: [],

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
  }
};
