(function() {
  function MockXMLHttpRequest() {
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

  MockXMLHttpRequest.prototype = {
    open: mxhr_open,
    send: mxhr_send
  };

  MockXMLHttpRequest.mThrowAtNextSend = mxhr_mThrowAtNextSend;
  MockXMLHttpRequest.mTeardown = mxhr_mTeardown;


  window.MockXMLHttpRequest = MockXMLHttpRequest;
})();
