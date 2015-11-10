/* global Section, SettingsSection, Settings, QRCode */
'use strict';

(function(exports) {
  function App(id) {
    Section.call(this, id);

    this.addChild('big-qrcode', new Section('big-qrcode'));
    this.addChild('settings-section', new SettingsSection('settings-section'));

    Settings.on('changed', this._onSettingsChanged.bind(this));
  }

  App.prototype = Object.create(Section.prototype);

  // Section's Interface
  App.prototype._readyToShow = function(previousId) {
    this.updateStatus();

    // It the previousId is omitted, it means that this section is shown for the
    // first time by bootstrap.
    if (!previousId) {
      var enabled = Settings['remote-control.enabled'];
      var hasConnection = !!Settings['remote-control.server-ip'];

      if (enabled && hasConnection) {
        this.focus('qrcode');
      } else {
        this.focus('exit-button');
      }
    }
  };

  // Section's Interface
  App.prototype._handleClick = function() {
    var elem = this.getFocusedElement();
    switch(elem.id) {
      case 'qrcode':
        this.showChildSection('big-qrcode');
        break;
      case 'settings-button':
      case 'go-to-settings-button':
        this.showChildSection('settings-section');
        break;
      case 'exit-button':
        window.close();
        break;
    }
  };

  App.prototype._onSettingsChanged = function(name, value) {
    if (name == 'remote-control.server-ip') {
      this.updateIP(value);
    }
    this.updateStatus();
  };

  App.prototype.updateIP = function(ip) {
    document.getElementById('ip').textContent = 'http://' + ip;
    this.updateQRCode('qrcode-image', ip, 260, 260);
    this.updateQRCode('big-qrcode-image', ip, 540, 540);
  };

  App.prototype.updateQRCode = function(elemId, ip, width, height) {
    // Remove the previous one if it exists.
    var div = document.getElementById(elemId);
    while (div.firstChild) {
      div.removeChild(div.firstChild);
    }

    /* jshint nonew: false */
    new QRCode(elemId, {
      text: 'http://' + ip + '/',
      width: width,
      height: height,
      colorDark : '#000000',
      colorLight : '#ffffff',
      correctLevel : QRCode.CorrectLevel.L
    });
  };

  App.prototype.updateStatus = function() {
    var setVisible = function(elemId, visible) {
      var elem = document.getElementById(elemId);
      elem.classList[visible ? 'add' : 'remove']('visible');
    };

    var enabled = Settings['remote-control.enabled'];
    var hasConnection = !!Settings['remote-control.server-ip'];
    setVisible('main-area', enabled && hasConnection);
    setVisible('off-line-message', enabled && !hasConnection);
    setVisible('disabled-message', !enabled);
    setVisible('settings-icon', enabled);
  };

  exports.App = App;
}(window));
