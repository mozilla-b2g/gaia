'use strict';

requireApp('communications/ftu/test/unit/mock_navigator_moz_wifi_manager.js');

var MockWifiHelper = {
  getWifiManager: function() {
    return MockNavigatorMozWifiManager;
  }
};
