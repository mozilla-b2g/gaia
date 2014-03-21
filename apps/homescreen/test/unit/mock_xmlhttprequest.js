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
    delete MockXMLHttpRequest.mLastSendData;
    MockXMLHttpRequest.mHeaders = {};
    lastInstance = null;
  }

  function mxhr_send(data) {
    if (throwAtNextSend) {
      throwAtNextSend = false;
      throw objectToThrow;
    }
    MockXMLHttpRequest.mLastSendData = data;
  }

  function mxhr_open(method, url, opts) {
    MockXMLHttpRequest.mLastOpenedUrl = url;
  }

  function mxhr_mSendError() {
    lastInstance && lastInstance.onerror && lastInstance.onerror();
  }

  function mxhr_mSendTimeout() {
    lastInstance && lastInstance.ontimeout && lastInstance.ontimeout();
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

  function mxhr_mSetRequestHeader(key, val) {
    MockXMLHttpRequest.mHeaders[key] = val;
  }

  MockXMLHttpRequest.prototype = {
    open: mxhr_open,
    send: mxhr_send,
    DONE: XMLHttpRequest.prototype.DONE,
    overrideMimeType: function() {},
    setRequestHeader: mxhr_mSetRequestHeader
  };

  MockXMLHttpRequest.mThrowAtNextSend = mxhr_mThrowAtNextSend;
  MockXMLHttpRequest.mTeardown = mxhr_mTeardown;
  MockXMLHttpRequest.mSendError = mxhr_mSendError;
  MockXMLHttpRequest.mSendTimeout = mxhr_mSendTimeout;
  MockXMLHttpRequest.mSendOnLoad = mxhr_mOnLoad;
  MockXMLHttpRequest.mSendReadyState = mxhr_mSendReadyState;
  MockXMLHttpRequest.DONE = XMLHttpRequest.DONE;


  window.MockXMLHttpRequest = MockXMLHttpRequest;
})();
