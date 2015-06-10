/* global MozActivity, PinCard */

'use strict';

(function(exports) {
  function ContextMenu(buttonConfigs, app) {
    this.selfApp = app;
    this.buttonConfigs = buttonConfigs;
    document.addEventListener('contextmenu', this.updateMenu.bind(this));

    // Get app metadata like origin and manifestURL from TVDeck for pinning
    // channels to home
    this.selfApp.connect('tvdeck-getmeta').then(function (ports) {
      ports.forEach(function(port) {
        port.postMessage('ping');
        port.onmessage = function(message) {
          if (message) {
            this.tvDeckMeta = message.data;
            this.pinCard = new PinCard(this.tvDeckMeta);
            this.pinCard.on('update-pin-button', this.updateMenu.bind(this));
            port.onmessage = null;
          }
        }.bind(this);
      }.bind(this));
    }.bind(this));
  }

  var proto = {};

  proto.updateMenu = function cm_showMenu() {
    var currentHash = window.location.hash;
    if (this.pinCard.pinnedChannels[currentHash]) {
      // Show unpin button if current channel is pinned.
      this._updatePinButton('unpin-from-home', this._unpinFromHome.bind(this));
    } else {
      // Show pin button if current channel is not pinned yet.
      this._updatePinButton('pin-to-home', this._pinToHome.bind(this));
    }
  };

  proto._updatePinButton = function cm_updatePinButton(l10nId, onclick) {
    this.buttonConfigs.forEach(function(buttonConfig) {
      if (buttonConfig.element) {
        buttonConfig.element.onclick = onclick;
        if (buttonConfig.hasText) {
          buttonConfig.element.setAttribute('data-l10n-id', l10nId);
        }
      }
    }.bind(this));
  };

  proto._pinToHome = function cm__pinToHome() {
    if (!this.tvDeckMeta) {
      console.error('TVDeck meta not found.');
      return;
    }
    var number = window.location.hash.split(',')[2];

    /* jshint nonew:false */
    new MozActivity({
      name: 'pin',
      data: {
        type: 'Application',
        group: 'tv',
        name: {raw: 'CH ' + number},
        manifestURL: this.tvDeckMeta.manifestURL,
        launchURL: this.tvDeckMeta.origin + '/index.html' + window.location.hash
      }
    });
  };

  proto._unpinFromHome = function cm__unpinFromHome() {
    var message = {
      type: 'unpin',
      data: {
        manifestURL: this.tvDeckMeta.manifestURL,
        launchURL: this.tvDeckMeta.origin + '/index.html' + window.location.hash
      }
    };

    if (!this.unpinPorts) {
      this.selfApp.connect('appdeck-channel').then(function (ports) {
        this.unpinPorts = ports;
        this.unpinPorts.forEach(function(port) {
          port.postMessage(message);
        });
      }.bind(this));
    } else {
      this.unpinPorts.forEach(function(port) {
        port.postMessage(message);
      });
    }
  };

  ContextMenu.prototype = proto;
  exports.ContextMenu = ContextMenu;
})(window);
