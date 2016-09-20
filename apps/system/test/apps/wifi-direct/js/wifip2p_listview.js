/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global dump */

'use strict';

(function(exports) {
  function debug(s) {
    dump('Wifi Direct Test: ' + s);
  }

  function WifiP2pPeerListView(aListView) {
    this.onPeerClicked = function() {};
    this.listView = aListView;
  }

  WifiP2pPeerListView.prototype = {
    clear: function() {
      // remove all items except the text expl. and the "search again" button
      var peerItems = this.listView.querySelectorAll('li');
      var len = peerItems.length;
      for (var i = len - 1; i >= 0; i--) {
        this.listView.removeChild(peerItems[i]);
      }
    },

    setPeerList: function(aPeerList) {
      this.clear();
      debug('PeerList to set: ' + JSON.stringify(aPeerList));
      for (var i = 0; i < aPeerList.length; i++) {
        var listItem = this._newPeerListItem(aPeerList[i], this.onPeerClicked);
        this.listView.appendChild(listItem);
      }
    },

    _newPeerListItem: function(aPeerInfo, aCallback) {
      var item = document.createElement('li');
      item.dataset.id = aPeerInfo.name;

      var name = document.createElement('p');
      name.textContent = aPeerInfo.name;
      item.appendChild(name);

      var status = document.createElement('p');
      status.textContent = aPeerInfo.connectionStatus;
      item.appendChild(status);

      item.addEventListener('click', function() {
        aCallback(aPeerInfo);
      });

      return item;
    },
  };

  exports.WifiP2pPeerListView = WifiP2pPeerListView;
})(window);
