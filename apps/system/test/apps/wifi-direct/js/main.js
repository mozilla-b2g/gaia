'use strict';

(function() {
  var list = document.querySelector('section ul');
  var listView = new window.WifiP2pPeerListView(list);
  var wifiP2pManager = new window.WifiP2pManager(listView);

  wifiP2pManager.init();
}());
