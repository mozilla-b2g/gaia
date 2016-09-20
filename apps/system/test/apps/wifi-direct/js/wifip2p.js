/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* global dump */

'use strict';

(function(exports) {
  var gWpsMethod = 'pbc';
  var gGoIntent = '1';

  function debug(s) {
    dump('Wifi Direct Test: ' + s);
  }

  function WifiP2pManager(aPeerListView) {
    this.manager = navigator.mozWifiP2pManager;
    this.peerListView = aPeerListView;
  }

  WifiP2pManager.prototype = {
    init: function() {
      if (!this.manager) {
        debug('Wifi Direct not supported.');
        return false;
      }

      this.manager.setScanEnabled(true);

      // Add peerListView controller.
      this.peerListView.onPeerClicked = aPeerInfo => {
        this.onPeerClicked(aPeerInfo);
      };

      // Add event listeners.
      ['statuschange', 'enabled',
        'disabled', 'peerinfoupdate'].forEach(aEvent => {
        this.manager.addEventListener(aEvent, this);
      });

      // Add 'wifip2p-pairing-request' handler.
      navigator.mozSetMessageHandler('wifip2p-pairing-request', aEvent => {
        this.handlePairingRequest(aEvent);
      });

      return true;
    },

    onPeerClicked: function(aPeerInfo) {
      debug('Peer: ' + aPeerInfo.address + ' is clicked: ' +
            aPeerInfo.connectionStatus);

      if (aPeerInfo.connectionStatus === 'connected') {
        this.manager.disconnect(aPeerInfo.address);
        return;
      }

      // Try to connect.
      debug('aPeerInfo.wpsCapabilities: ' + aPeerInfo.wpsCapabilities);
      if (-1 === aPeerInfo.wpsCapabilities.indexOf(gWpsMethod)) {
        debug('Peer doesn\'t support the wps method we prefer: ' + gWpsMethod);
        return;
      }
      this.manager.connect(aPeerInfo.address, gWpsMethod, gGoIntent);
    },

    // Single entry for addEventListener.
    handleEvent: function(aEvent) {
      debug('handleEvent: ' + aEvent.type);
      this['on' + aEvent.type](aEvent);
    },

    // Handle pairing request notified by system message.
    handlePairingRequest: function(aEvent) {
      var accepted = true;

      var setPairingConfirm = (aAccepted, aPin) => {
        this.manager.setPairingConfirmation(aAccepted, aPin);
      };

      switch (aEvent.wpsMethod) {
        case 'pbc':
          accepted = confirm('Connect with ' + aEvent.name + '?');
          setPairingConfirm(accepted, '');
          break;
        case 'display':
          alert('PIN: ' + aEvent.pin);
          // !!! Confirm before alert() to avoid bugs,
          setPairingConfirm(true, aEvent.pin);
          break;
        case 'keypad':
          var pin = prompt('PIN');
          if (pin) {
            debug('Pin was entered: ' + pin);
          } else {
            accepted = false;
          }
          setPairingConfirm(accepted, pin);
          break;
        default:
          debug('Unknown wps method: ' + aEvent.wpsMethod);
          break;
      }
    },

    refreshPeerList: function() {
      var req = this.manager.getPeerList();
      req.onsuccess = () => {
        var peerList = req.result;
        debug('getPeerList.onsuccess: ' + JSON.stringify(peerList));
        this.peerListView.setPeerList(peerList);
      };
    },

    //
    // Event handlers.
    //
    onstatuschange: function(aEvent) {
      var groupOwner = this.manager.groupOwner;
      if (groupOwner) {
        debug('Current Group owner: macAddress: ' + groupOwner.macAddress +
              ', ipAddress: ' + groupOwner.ipAddress +
              ', isLocal: ' + groupOwner.isLocal);
      }

      debug('The peer whose status has just changed is: ' +
            aEvent.peerAddress);

      this.refreshPeerList();
    },

    onenabled: function(aEvent) {
      this.peerList.clear();
      this.manager.setScanEnabled(true);
    },

    ondisabled: function(aEvent) {
      this.peerList.clear();
    },

    onpeerinfoupdate: function(aEvent) {
      this.refreshPeerList();
    },
  };

  exports.WifiP2pManager = WifiP2pManager;
})(window);
