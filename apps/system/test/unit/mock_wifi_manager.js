'use strict';

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

