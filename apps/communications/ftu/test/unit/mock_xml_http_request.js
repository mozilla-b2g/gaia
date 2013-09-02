'use strict';

(function() {
  var lastInstance;

  function MockXMLHttpRequest() {
    lastInstance = this;
  }

  var throwAtNextSend = false,
      objectToThrow = null,
      pendingNextSend = false,
      statesAtNextSend = null,
      errorCodeStatus = null;

  function mxhr_mThrowAtNextSend(e) {
    throwAtNextSend = true;
    objectToThrow = e || new Error('throwing an exception');
  }
 function mxhr_mStatesAtNextSend(states) {
    pendingNextSend = true;
    statesAtNextSend = states;
  }
  function mxhr_mTeardown() {
    throwAtNextSend = pendingNextSend = false;
    objectToThrow = statesAtNextSend = null;
    delete MockXMLHttpRequest.mLastOpenedUrl;
    lastInstance = null;
  }

  function mxhr_send() {
    if (throwAtNextSend) {
      throwAtNextSend = false;
      throw objectToThrow;
    }
    if (pendingNextSend) {
      pendingNextSend = false;
      MockXMLHttpRequest.mSendReadyState(statesAtNextSend);
      statesAtNextSend = null;
    }
    if (errorCodeStatus != null) {
      MockXMLHttpRequest.mSendReadyState();
    }
  }

  function mxhr_open(method, url, opts) {
    MockXMLHttpRequest.mLastOpenedUrl = url;
  }

  function mxhr_mSendError(errorCodeSend) {
    errorCodeStatus = errorCodeSend;
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
      lastInstance.status = errorCodeStatus || 200;
      errorCodeStatus = null;
      for (var key in states) {
        lastInstance[key] = states[key];
      }
      lastInstance.onreadystatechange && lastInstance.onreadystatechange();
    }
  }
  function mxhr_mResetSend(states) {
    for (var key in states) {
        lastInstance[key] = states[key];
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
  MockXMLHttpRequest.mStatesAtNextSend = mxhr_mStatesAtNextSend;
  MockXMLHttpRequest.mResetSend = mxhr_mResetSend;
  MockXMLHttpRequest.DONE = XMLHttpRequest.DONE;


  window.MockXMLHttpRequest = MockXMLHttpRequest;
})();
