define(function(require) {
  'use strict';

  var SettingsPanel = require('modules/settings_panel');
  var DialogService = require('modules/dialog_service');

  return function ctor_call_fdn_settings_panel() {
    return SettingsPanel({
      onInit: function(panel, options) {
        this._cardIndex = options.cardIndex || 0;
        this._conns = window.navigator.mozMobileConnections;
        this._conn = this._conns[this._cardIndex];

        this._elements = {
          panel: panel,
          simFdnDesc: panel.querySelector('.fdn-enabled small'),
          resetPin2Item: panel.querySelector('.fdn-resetPIN2'),
          simFdnCheckBox: panel.querySelector('.fdn-enabled input'),
          resetPin2Button: panel.querySelector('.fdn-resetPIN2 button')
        };

        this._elements.simFdnCheckBox.onchange =
          this._showToggleFdnDialog.bind(this);
        this._elements.resetPin2Button.onclick =
          this._showChangePin2Dialog.bind(this);
      },

      onBeforeShow: function(panel, options) {
        if (typeof options.cardIndex !== 'undefined') {
          this._cardIndex = options.cardIndex;
          this._conn = this._conns[this._cardIndex];
        }

        var iccObj = this._getCurrentIccObj();
        if (iccObj) {
          iccObj.oncardstatechange = this._updateFdnStatus.bind(this);
        }

        this._updateFdnStatus();
      },

      _showToggleFdnDialog: function() {
        var action = this._elements.simFdnCheckBox.checked ?
          'enable_fdn' : 'disable_fdn';
        var iccObj = this._getCurrentIccObj();
        if (iccObj) {
          if (iccObj.cardState === 'puk2Required') {
            action = 'unlock_puk2';
          }

          return DialogService.show('simpin-dialog', {
            method: action,
            cardIndex: this._cardIndex
          }).then(() => {
            // we will update fdn status no matter how
            this._updateFdnStatus();
          });
        }
      },

      _showChangePin2Dialog: function() {
        DialogService.show('simpin-dialog', {
          method: 'change_pin2',
          cardIndex: this._cardIndex
        });
      },

      _updateFdnStatus: function() {
        var iccObj = this._getCurrentIccObj();
        if (iccObj) {
          return iccObj.getCardLock('fdn').then((result) => {
            var enabled = result.enabled;
            this._elements.simFdnDesc.setAttribute('data-l10n-id',
              enabled ? 'enabled' : 'disabled');
            this._elements.simFdnCheckBox.disabled = false;
            this._elements.simFdnCheckBox.checked = enabled;
            this._elements.resetPin2Item.hidden = !enabled;
          });
        }
      },

      _getCurrentIccObj: function() {
        var iccId;
        var iccObj;

        if (this._conn) {
          iccId = this._conn.iccId;
          if (iccId) {
            iccObj = window.navigator.mozIccManager.getIccById(iccId);
          }
        }

        if (!iccObj) {
          console.log('We can\'t find related iccObj in card - ',
            this._cardIndex);
        }

        return iccObj;
      }
    });
  };
});
