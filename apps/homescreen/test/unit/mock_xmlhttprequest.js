'use strict';

(function() {
  var lastInstance;

  function MockXMLHttpRequest() {
    lastInstance = this;
  }

  var throwAtNextSend = false,
      objectToThrow = null;

  function mxhr_mThrowAtNextSend(e) {
    throwAtNextSend = true;
    objectToThrow = e || new Error('throwing an exception');
  }

  function mxhr_mTeardown() {
    throwAtNextSend = false;
    objectToThrow = null;
    delete MockXMLHttpRequest.mLastOpenedUrl;
    lastInstance = null;
  }

  function mxhr_send() {
    if (throwAtNextSend) {
      throwAtNextSend = false;
      throw objectToThrow;
    }
  }

  function mxhr_open(method, url, opts) {
    MockXMLHttpRequest.mLastOpenedUrl = url;
  }

  function mxhr_mSendError() {
    lastInstance && lastInstance.onerror && lastInstance.onerror();
  }

  function mxhr_mOnLoad(states) {
    if (lastInstance) {
      lastInstance.status = 200;
      for (var key in states) {
        lastInstance[key] = states[key];
      }
      lastInstance.onload && lastInstance.onload();
    }
  }

  function mxhr_mSendReadyState(states) {
    if (lastInstance) {
      lastInstance.readyState = XMLHttpRequest.DONE;
      lastInstance.status = 200;
      for (var key in states) {
        lastInstance[key] = states[key];
      }
      lastInstance.onreadystatechange && lastInstance.onreadystatechange();
    }
  }

  MockXMLHttpRequest.prototype = {
    open: mxhr_open,
    send: mxhr_send,
    DONE: XMLHttpRequest.prototype.DONE,
    overrideMimeType: function() {}
  };

  MockXMLHttpRequest.mThrowAtNextSend = mxhr_mThrowAtNextSend;
  MockXMLHttpRequest.mTeardown = mxhr_mTeardown;
  MockXMLHttpRequest.mSendError = mxhr_mSendError;
  MockXMLHttpRequest.mSendOnLoad = mxhr_mOnLoad;
  MockXMLHttpRequest.mSendReadyState = mxhr_mSendReadyState;
  MockXMLHttpRequest.DONE = XMLHttpRequest.DONE;


  window.MockXMLHttpRequest = MockXMLHttpRequest;
})();
