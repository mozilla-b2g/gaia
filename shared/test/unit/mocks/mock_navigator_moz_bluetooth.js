'use strict';

(function(window) {

  var MockBTAdapter = {};
  var mAdapterRequest = {
	result: MockBTAdapter,
	onsuccess: null,
	onerror: null
  };

  function mmb_getDefaultAdapter() {
    return mAdapterRequest;
  }

  function mmb_triggerOnGetAdapterSuccess() {
    if (mAdapterRequest.onsuccess) {
      mAdapterRequest.onsuccess();
	}
  }

  window.MockMozBluetooth = {
    getDefaultAdapter: mmb_getDefaultAdapter,
    triggerOnGetAdapterSuccess: mmb_triggerOnGetAdapterSuccess
  };

})(window);
