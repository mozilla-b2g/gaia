!function() {

  function debug(str) {
    //dump('mozNetworkStats: ' + str + '\n');
  }

  FFOS_RUNTIME.makeNavigatorShim('mozNetworkStats', {
  	WIFI: 'wifi',
  	MOBILE: 'mobile',
  	sampleRate: 1,
  	maxStorageSamples: 1,
    getAvailableNetworks: FFOS_RUNTIME.domRequest([]),
    getSamples: FFOS_RUNTIME.domRequest([])
  }, true);
}();
