/* global PinCard, MozActivity */

'use strict';

(function(exports) {
  function ContextMenu(buttonConfigs, app) {
    this.selfApp = app;
    this.buttonConfigs = buttonConfigs;
    this.pinCard = new PinCard(this.app);
    this.pinCard.on('update-pin-button', this.updateMenu.bind(this));
    document.addEventListener('contextmenu', this.updateMenu.bind(this));
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
    var number = window.location.hash.split(',')[2];

    /* jshint nonew:false */
    new MozActivity({
      name: 'pin',
      data: {
        type: 'Application',
        group: 'tv',
        name: {
          id: 'channel-name',
          args: {
            number: number
          }
        },
        manifestURL: this.selfApp.manifestURL,
        launchURL: this.selfApp.origin + '/index.html' + window.location.hash
      }
    });
  };

  proto._unpinFromHome = function cm__unpinFromHome() {
    var message = {
      type: 'unpin',
      data: {
        manifestURL: this.selfApp.manifestURL,
        launchURL: this.selfApp.origin + '/index.html' + window.location.hash
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
