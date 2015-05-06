'use strict';
/* exported MockWifiManager */

var MockWifiManager = {
  connection: {
    network: {
      get status() {
        return 'connected';
      },
      get ssid() {
        return 'mozilla guest';
      }
    }
  }
};

