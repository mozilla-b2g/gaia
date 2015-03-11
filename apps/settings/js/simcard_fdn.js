/* global getIccByIndex, DsdsSettings */
'use strict';

define('simcard_fdn', [
  'modules/dialog_service'
], function(DialogService) {
  var SimFdnLock = {
    _elements: {},

    init: function spl_init() {
      var iccObj = getIccByIndex();
      if (!iccObj) {
        return console.error('Could not retrieve ICC object');
      }

      this._elements.simFdnDesc = document.querySelector('.fdn-enabled small');
      this._elements.resetPin2Item = document.querySelector('.fdn-resetPIN2');
      this._elements.simFdnCheckBox =
        document.querySelector('.fdn-enabled input');
      this._elements.resetPin2Button =
        document.querySelector('.fdn-resetPIN2 button');

      var updateFdnStatusCallback = this._updateFdnStatus.bind(this);
      iccObj.addEventListener('cardstatechange', updateFdnStatusCallback);

      // enable|disable|unlock FDN

      this._elements.simFdnCheckBox.disabled = true;
      this._elements.simFdnCheckBox.onchange = function spl_togglePin2() {
        var action = this.checked ? 'enable_fdn' : 'disable_fdn';
        if (iccObj.cardState === 'puk2Required') {
          action = 'unlock_puk2';
        }
        DialogService.show('simpin-dialog', {
          method: action,
          cardIndex: DsdsSettings.getIccCardIndexForCallSettings()
        }).then(function(result) {
          // we will update fdn status no matter how
          updateFdnStatusCallback();
        });
      };

      this._elements.resetPin2Button.onclick = function spl_resetPin2() {
        DialogService.show('simpin-dialog', {
          method: 'change_pin2',
          cardIndex: DsdsSettings.getIccCardIndexForCallSettings()
        });
      };

      this._updateFdnStatus();

      // add|edit|remove|call FDN contact
      window.addEventListener('panelready', (e) => {
        if (e.detail.current === '#call-fdnSettings') {
          // Refresh FDN status when the panel is reloaded, since we could be
          // dealing with different FDNsettings on dual SIM phones.
          this._updateFdnStatus();
        }
      });
    },

    _updateFdnStatus: function() {
      var iccObj = getIccByIndex();
      if (!iccObj) {
        return console.error('Could not retrieve ICC object');
      }

      var req = iccObj.getCardLock('fdn');
      req.onsuccess = () => {
        var enabled = req.result.enabled;
        this._elements.simFdnDesc.setAttribute('data-l10n-id',
          enabled ? 'enabled' : 'disabled');
        this._elements.simFdnCheckBox.disabled = false;
        this._elements.simFdnCheckBox.checked = enabled;
        this._elements.resetPin2Item.hidden = !enabled;
      };
    },

  };

  return SimFdnLock;
});

navigator.mozL10n.once(function() {
  require(['simcard_fdn'], function(SimFdnLock) {
    SimFdnLock.init();
  });
});
