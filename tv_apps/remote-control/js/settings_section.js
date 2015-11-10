/* global Section, Settings */
'use strict';

(function(exports) {
  function SettingsSection(id) {
    Section.call(this, id);
    Settings.on('changed', this._onSettingsChanged.bind(this));
  }

  SettingsSection.prototype = Object.create(Section.prototype);

  // Section's Interface
  SettingsSection.prototype._readyToShow = function() {
    if (Settings['remote-control.enabled']) {
      if (Settings['remote-control.pairing-required']) {
        this._checkedOption = 'option-pair-on';
      } else {
        this._checkedOption = 'option-pair-off';
      }
    } else {
      this._checkedOption = 'option-disabled';
    }

    this.checkRadio(this._checkedOption);
    this.setDefaultFocusElement(this._checkedOption);

    this.updateClearAuthorizedDevicesButton();
  };

  // Section's Interface
  SettingsSection.prototype._handleMove = function(direction) {
    var elem = this.getFocusedElement();
    if ((elem.id == 'option-pair-on' && direction == 'down') ||
        (elem.id == 'option-disabled' && direction == 'up')) {
      return document.getElementById('clear-authorized-devices');
    }
  };

  // Section's Interface
  SettingsSection.prototype._handleClick = function() {
    if (this._pendingSave) {
      return;
    }

    var elem = this.getFocusedElement();
    switch(elem.id) {
      case 'option-pair-off':
      case 'option-pair-on':
      case 'option-disabled':
        this.checkRadio(elem.id);
        break;
      case 'clear-authorized-devices':
        navigator.mozL10n.formatValue('clear-authorized-devices-message')
          .then((string) => {
            if (confirm(string)) {
              this.clearAuthorizedDevices();
            }
          });
        break;
      case 'save-button':
        this.saveSettings();
        break;
    }
  };

  SettingsSection.prototype._onSettingsChanged = function(name, value) {
    if (name == 'remote-control.authorized-devices') {
      this.updateClearAuthorizedDevicesButton();
    }
  };

  SettingsSection.prototype.checkRadio = function(id) {
    var radios = document.querySelectorAll('.option-radio');
    Array.from(radios).forEach(function(radio) {
      if (radio.id == id) {
        radio.classList.add('checked');
      } else {
        radio.classList.remove('checked');
      }
    });
  };

  SettingsSection.prototype.updateClearAuthorizedDevicesButton = function() {
    var authorizedDevices = Settings['remote-control.authorized-devices'];
    var authorizedDevicesCount = 0;
    if (authorizedDevices) {
      authorizedDevicesCount =
        Object.keys(JSON.parse(authorizedDevices)).length;
    }

    var button = document.getElementById('clear-authorized-devices');
    if (authorizedDevicesCount) {
      button.classList.remove('disabled');
      button.removeAttribute('aria-hidden');
    } else {
      button.classList.add('disabled');
      button.setAttribute('aria-hidden', true);
    }
  };

  SettingsSection.prototype.clearAuthorizedDevices = function() {
    Settings.save({
      'remote-control.authorized-devices': '{}'
    }).then(() => {
      this.updateClearAuthorizedDevicesButton();
      this.focus('save-button');
    });
  };

  SettingsSection.prototype.saveSettings = function() {
    var checkedOption = document.querySelector('.option-radio.checked').id;
    var callback = () => {
      this._pendingSave = undefined;
      this._checkedOption = undefined;
      this.backToParent();
    };

    this._pendingSave = true;

    if (checkedOption == this._checkedOption) {
      callback();
      return;
    }

    // Also clear authorized devices when user changes the mode.
    var settings = {
      'remote-control.authorized-devices': '{}'
    };

    switch(checkedOption) {
      case 'option-pair-on':
        settings['remote-control.enabled'] = true;
        settings['remote-control.pairing-required'] = true;
        break;
      case 'option-pair-off':
        settings['remote-control.enabled'] = true;
        settings['remote-control.pairing-required'] = false;
        break;
      case 'option-disabled':
        settings['remote-control.enabled'] = false;
        settings['remote-control.pairing-required'] = false;
        break;
    }

    Settings.save(settings).then(callback).catch(callback);
  };

  exports.SettingsSection = SettingsSection;
}(window));
