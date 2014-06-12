/**
 * Links the root panel list item with USB Storage.
 */
define(function(require) {
  'use strict';

  var SettingsListener = require('shared/settings_listener');
  var AsyncStorage = require('shared/async_storage');

  function USBStoragePanel() {
    this._elements = null;
    this._enabled = false;
    this.defaultVolumeState = 'available';
  }

  USBStoragePanel.prototype = {
    init: function storage_init(elements) {
      this._elements = elements;
    },
    /**
     * The value indicates whether the module is responding. If it is false, the
     * UI stops reflecting the updates from the root panel context.
     *
     * @access public
     * @type {Boolean}
     */
    get enabled() {
      return this._enabled;
    },

    set enabled(value) {
      this._enabled = value;
      var umsSettingKey = 'ums.enabled';

      if (value) { //observe
        // ums master switch on root panel
        this._elements.umsEnabledCheckBox.addEventListener('change', this);

        SettingsListener.observe(umsSettingKey, false,
          this._umsSettingHandler.bind(this));
      } else { //unobserve
        this._elements.umsEnabledCheckBox.removeEventListener('change', this);

        SettingsListener.unobserve(umsSettingKey,
          this._umsSettingHandler.bind(this));
      }
    },

    _umsSettingHandler: function storage_umsSettingHandler(enabled) {
      this._elements.umsEnabledCheckBox.checked = enabled;
      this.updateUmsDesc();
    },

    handleEvent: function storage_handleEvent(evt) {
      switch (evt.type) {
        // case 'localized':
          // this.updateAppFreeSpace();
          // this.updateMediaStorageInfo();
          // break;
        case 'change':
          if (evt.target === this._elements.umsEnabledCheckBox) {
            this.umsMasterSettingChanged(evt);
          }
          // else {
          //   // we are handling storage state changes
          //   // possible state: available, unavailable, shared
          //   this.updateMediaStorageInfo();
          // }
          break;
      }
    },

    // ums description
    updateUmsDesc: function storage_updateUmsDesc() {
      var localize = navigator.mozL10n.localize;
      var key;
      if (this._elements.umsEnabledCheckBox.checked) {
        //TODO list all enabled volume name
        key = 'enabled';
      } else if (this.defaultVolumeState === 'shared') {
        key = 'umsUnplugToDisable';
      } else {
        key = 'disabled';
      }
      localize(this._elements.umsEnabledInfoBlock, key);
    },

    umsMasterSettingChanged: function storage_umsMasterSettingChanged(evt) {
      var checkbox = evt.target;
      var cset = {};
      var umsSettingKey = 'ums.enabled';
      var warningKey = 'ums-turn-on-warning';
      if (checkbox.checked) {
        AsyncStorage.getItem(warningKey, function(showed) {
          if (!showed) {
            this._elements.umsWarningDialog.hidden = false;

            this._elements.umsConfirmButton.onclick = function() {
              cset[umsSettingKey] = true;
              Settings.mozSettings.createLock().set(cset);

              AsyncStorage.setItem(warningKey, true);
              this._elements.umsWarningDialog.hidden = true;
            }.bind(this);

            this._elements.umsCancelButton.onclick = function() {
              cset[umsSettingKey] = false;
              Settings.mozSettings.createLock().set(cset);

              checkbox.checked = false;
              this._elements.umsWarningDialog.hidden = true;
            }.bind(this);
          } else {
            cset[umsSettingKey] = true;
            Settings.mozSettings.createLock().set(cset);
          }
        }.bind(this));
      } else {
        cset[umsSettingKey] = false;
        Settings.mozSettings.createLock().set(cset);
      }
    }
  };

  return function ctor_usb_storage_panel() {
    return new USBStoragePanel();
  };
});
