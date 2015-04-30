define(function(require) {
  'use strict';

  var CallSettingsTaskScheduler =
    require('panels/call/call_settings_task_scheduler');
  var CallConstant = require('panels/call/call_constant');
  var SettingsHelper = require('shared/settings_helper');
  var SettingsPanel = require('modules/settings_panel');
  var SettingsCache = require('modules/settings_cache');
  var SettingsService = require('modules/settings_service');
  var DsdsSettings = require('dsds_settings');
  var DialogService = require('modules/dialog_service');

  return function ctor_call_panel() {
    return SettingsPanel({
      onInit: function(panel, options) {
        this._cardIndex = options.cardIndex || 0;
        this._conns = window.navigator.mozMobileConnections;
        this._conn = this._conns[this._cardIndex];

        var $ = function(selector) {
          return panel.querySelector(selector);
        };

        this._elements = {
          panel: panel,
          header: $('gaia-header'),
          rilCallerId: $('#ril-callerId'),
          fdnDesc: $('#fdnSettings-desc'),
          alertPanel: $('.cw-alert'),
          alertPanelSetButton: $('.cw-alert .cw-alert-set'),
          alertPanelConfirmInput: $('.cw-alert .cw-alert-checkbox-label input'),
          alertPanelCancelButton: $('.cw-alert .cw-alert-cancel'),
          alertLabel: $('#menuItem-callWaiting .alert-label'),
          fdnItem: $('#menuItem-callFdn'),
          callWaitingItem: $('#menuItem-callWaiting'),
          callWaitingInput: $('#menuItem-callWaiting .checkbox-label input'),
          callForwardingItem: $('#menuItem-callForwarding'),
          callForwardingAnchor: $('#menuItem-callForwarding a'),
          callBarringItem: $('#menuItem-callBarring'),
          callerIdItem: $('#menuItem-callerId'),
          voiceMailItem: $('.menuItem-voicemail'),
          voiceMailDesc: $('#voiceMail-desc'),
          voicePrivacyItem: $('#menuItem-voicePrivacyMode'),
          voicePrivacyInput: $('#menuItem-voicePrivacyMode input')
        };

        // Set the navigation correctly when on a multi ICC card device.
        if (DsdsSettings.getNumberOfIccSlots() > 1) {
          this._elements.header.setAttribute('data-href', '#call-iccs');
        }

        this._bindPanelReadyEvent();
        this._bindCallForwardingMenuItemClickEvent();

        this._addVoiceTypeChangeListeners();

        this._initCallerId();
        this._initCallWaiting();
        this._initVoiceMailSettings();
        this._initVoicePrivacyModeChangeEvent();
        this._initVoicemailClickEvent();
        this._initCallWaitingAlertLabelClickEvent();
        this._initCallWaitingAlertCancelButtonClickEvent();

        CallSettingsTaskScheduler.observe('isLocked', (isLocked) => {
          this._enableTapOn('callerIdItem', !isLocked);
          this._enableTapOn('callWaitingItem', !isLocked);
        });

        this._refreshCallSettingItems();
      },

      onBeforeShow: function(panel, options) {
        if (typeof options.cardIndex !== 'undefined') {
          this._cardIndex = options.cardIndex;
          this._conn = this._conns[options.cardIndex];
        }

        this._initFDNItem();
        this._updateNetworkTypeLimitedItemsVisibility(
          this._conn.voice && this._conn.voice.type);
        this._refreshCallSettingItems();
      },

      _bindPanelReadyEvent: function() {
        window.addEventListener('panelready', (evt) => {
          switch (evt.detail.current) {
            case '#call':
              // No need to refresh the call settings items if navigated from
              // panels not manipulating call settings.
              if (evt.detail.previous === '#call-forwarding' ||
                evt.detail.previous === '#call-cbSettings') {
                  return;
              }
              break;
          }
        });
      },

      _bindCallForwardingMenuItemClickEvent: function() {
        this._elements.callForwardingAnchor.onclick = () => {
          SettingsService.navigate('call-forwarding', {
            cardIndex: this._cardIndex
          });
        };
      },

      _initCallerId: function() {
        // We listen for blur events so that way we set the CLIR mode once the
        // user clicks on the OK button.
        this._elements.rilCallerId.onblur = () => {
          var clirMode = CallConstant.CLIR_MAPPING[
            this._elements.rilCallerId.value];
          this._conn.setCallingLineIdRestriction(clirMode).then(() => {
            // If the setting success, system app will sync the value.
          }, () => {
            // If the setting fails,
            // we force sync the value here and update the UI.
            this._updateCallerIdPreference().then(() => {
              this._updateCallerIdItemState();
            });
          });
        };

        // System app will sync the value 'ril.clirMode' with the carrier
        navigator.mozSettings.addObserver('ril.clirMode', () => {
          this._updateCallerIdItemState();
        });
      },

      _initCallWaiting: function() {
        this._elements.alertPanelSetButton.onclick = () => {
          var checked = this._elements.alertPanelConfirmInput.checked;
          this._conn.setCallWaitingOption(checked).then(() => {
            this._elements.alertPanel.hidden = true;
            this._updateCallWaitingItemState();
          }, () => {
            this._elements.alertPanel.hidden = true;
            this._updateCallWaitingItemState();
          });
        };

        // Bind call waiting setting to the input
        this._elements.callWaitingInput.onchange = () => {
          var checked = this._elements.callWaitingInput.checked;
          this._conn.setCallWaitingOption(checked).then(() => {
            this._updateCallWaitingItemState();
          }, () => {
            this._updateCallWaitingItemState();
          });
        };
      },

      _initVoiceMailSettings: function() {
        // update all voice numbers if necessary
        SettingsCache.getSettings((results) => {
          var settings = navigator.mozSettings;
          var voicemail = navigator.mozVoicemail;
          var updateVMNumber = false;
          var numbers = results['ril.iccInfo.mbdn'] || [];

          [].forEach.call(this._conns, (conn, index) => {
            var number = numbers[index];
            // If the voicemail number has not been stored into the database yet
            // we check whether the number is provided by the mozVoicemail API.
            // In that case we store it into the setting database.
            if (!number && voicemail) {
              number = voicemail.getNumber(index);
              if (number) {
                updateVMNumber = true;
                numbers[index] = number;
              }
            }
          });

          if (updateVMNumber) {
            settings.createLock().set({
              'ril.iccInfo.mbdn': numbers
            }).then(() => {
              this._updateVoiceMailItemState();
              settings.addObserver('ril.iccInfo.mbdn', () => {
                this._updateVoiceMailItemState();
              });
            });
          } else {
            this._updateVoiceMailItemState();
            settings.addObserver('ril.iccInfo.mbdn', () => {
              this._updateVoiceMailItemState();
            });
          }
        });
      },

      _initFDNItem: function() {
        var iccId = navigator.mozMobileConnections[this._cardIndex].iccId;
        if (iccId) {
          var icc = navigator.mozIccManager.getIccById(iccId);
          if (icc) {
            icc.getServiceState('fdn').then((hasFdn) => {
              this._elements.fdnItem.hidden = !hasFdn;
            });
          }
        }
      },

      _initVoicemailClickEvent: function() {
        this._elements.voiceMailItem.onclick = () => {
          DialogService.show('call-voiceMailSettings');
        };
      },

      _initCallWaitingAlertLabelClickEvent: function() {
        this._elements.alertLabel.onclick = () => {
          this._elements.alertPanelConfirmInput.checked = false;
          this._elements.alertPanel.hidden = false;
        };
      },

      _initVoicePrivacyModeChangeEvent: function() {
        var defaultVoicePrivacySettings = [].map.call(this._conns, () => {
          return false;
        });

        var voicePrivacyHelper = SettingsHelper(
          'ril.voicePrivacy.enabled', defaultVoicePrivacySettings);

        this._elements.voicePrivacyInput.onchange = () => {
          var checked = this._elements.voicePrivacyInput.checked;
          voicePrivacyHelper.get((values) => {
            var originalValue = !checked;
            this._conn.setVoicePrivacyMode(checked).then(() => {
              values[this._cardIndex] = !originalValue;
              voicePrivacyHelper.set(values);
            }, () => {
              // restore the value if failed.
              this._elements.voicePrivacyInput.checked = originalValue;
            });
          });
        };
      },

      _initCallWaitingAlertCancelButtonClickEvent: function() {
        this._elements.alertPanelCancelButton.onclick = () => {
          this._elements.alertPanel.hidden = true;
        };
      },

      _addVoiceTypeChangeListeners: function() {
        var voiceTypes = [].map.call(this._conns, () => {
          return null;
        });

        [].forEach.call(this._conns, (conn, index) => {
          voiceTypes[index] = conn.voice.type;
          conn.addEventListener('voicechange', () => {
            var newType = conn.voice.type;
            if (index !== this._cardIndex || voiceTypes[index] === newType) {
              return;
            }

            voiceTypes[index] = newType;

            this._updateNetworkTypeLimitedItemsVisibility(newType);
            this._refreshCallSettingItems();
          });
        });
      },

      _updateNetworkTypeLimitedItemsVisibility: function(voiceType) {
        // The following features are limited to GSM types.
        this._elements.callForwardingItem.hidden =
        this._elements.callBarringItem.hidden =
        this._elements.callWaitingItem.hidden =
        this._elements.callerIdItem.hidden =
          (CallConstant.NETWORK_TYPE_CATEGORY[voiceType] !== 'gsm');

        // The following feature is limited to CDMA types.
        this._elements.voicePrivacyItem.hidden =
          (CallConstant.NETWORK_TYPE_CATEGORY[voiceType] !== 'cdma');
      },

      _refreshCallSettingItems: function() {
        this._updateVoiceMailItemState();
        this._updateFdnStatus();
        this._updateVoicePrivacyItemState();
        this._updateCallerIdPreference().then(() => {
          this._updateCallerIdItemState();
        });
        this._updateCallWaitingItemState();
      },

      _enableTapOn: function(elementName, enable) {
        var element = this._elements[elementName];
        if (!element) {
          return;
        }

        if (enable) {
          element.removeAttribute('aria-disabled');
        } else {
          element.setAttribute('aria-disabled', true);
        }
      },

      _updateCallerIdPreference: function() {
        // TODO
        // move this into separate module like CallForwarding
        return CallSettingsTaskScheduler.enqueue({
          type: 'CALLER_ID_PREF',
          func: () => {
            return this._conn.getCallingLineIdRestriction();
          }
        }).then((result) => {
          var promise = new Promise((resolve) => {
            var value = 0; //CLIR_DEFAULT

            // In some legitimates error cases (FdnCheckFailure),
            // the req.result is undefined. This is fine, we want this,
            // and in this case we will just display an error message
            // for all the matching requests.
            if (result) {
              switch (result.m) {
                case 1: // Permanently provisioned
                case 3: // Temporary presentation disallowed
                case 4: // Temporary presentation allowed
                  switch (result.n) {
                    case 1: // CLIR invoked, CLIR_INVOCATION
                    case 2: // CLIR suppressed, CLIR_SUPPRESSION
                    case 0: // Network default, CLIR_DEFAULT
                      value = result.n; //'CLIR_INVOCATION'
                      break;
                    default:
                      value = 0; //CLIR_DEFAULT
                      break;
                  }
                  break;
                case 0: // Not Provisioned
                case 2: // Unknown (network error, etc)
                  /* fall through */
                default:
                  value = 0; //CLIR_DEFAULT
                  break;
              }

              SettingsCache.getSettings((results) => {
                var preferences = results['ril.clirMode'] || [0, 0];
                preferences[this._cardIndex] = value;
                navigator.mozSettings.createLock().set({
                  'ril.clirMode': preferences
                }).then(resolve, resolve);
              });
            }
          });
          return promise;
        });
      },

      _updateCallerIdItemState: function() {
        if (this._elements.callerIdItem.hidden) {
          return Promise.resolve();
        } else {
          var promise = new Promise((resolve) => {
            SettingsCache.getSettings((results) => {
              var preferences = results['ril.clirMode'];
              var preference = preferences && preferences[this._cardIndex];
              var value;
              switch (preference) {
                case 1: // CLIR invoked
                  value = 'CLIR_INVOCATION';
                  break;
                case 2: // CLIR suppressed
                  value = 'CLIR_SUPPRESSION';
                  break;
                case 0: // Network default
                  /* fall through */
                default:
                  value = 'CLIR_DEFAULT';
                  break;
              }
              this._elements.rilCallerId.value = value;
            });
          });
          return promise;
        }
      },

      _updateCallWaitingItemState: function() {
        if (this._elements.callWaitingItem.hidden) {
          return Promise.resolve();
        } else {
          // TODO
          // move this into separate module like CallForwarding
          return CallSettingsTaskScheduler.enqueue({
            type: 'CALL_WAITING',
            func: () => {
              return this._conn.getCallWaitingOption();
            }
          }).then((enabled) => {
            this._elements.callWaitingInput.checked = enabled;
            if (enabled) {
              this._elements.callWaitingItem.dataset.state = 'on';
            } else {
              this._elements.callWaitingItem.dataset.state = 'off';
            }
          }).catch(() => {
            this._elements.callWaitingItem.dataset.state = 'unknown';
          });
        }
      },

      _updateVoiceMailItemState: function() {
        this._elements.voiceMailDesc.textContent = '';
        SettingsCache.getSettings((results) => {
          var numbers = results['ril.iccInfo.mbdn'];
          var number = numbers[this._cardIndex];
          if (number) {
            this._elements.voiceMailDesc.removeAttribute('data-l10n-id');
            this._elements.voiceMailDesc.textContent = number;
          } else {
            this._elements.voiceMailDesc.setAttribute(
              'data-l10n-id', 'voiceMail-number-notSet');
          }
        });
      },

      _updateVoicePrivacyItemState: function() {
        if (this._elements.voicePrivacyItem.hidden) {
          return;
        }

        this._conn.getVoicePrivacyMode().then((enabled) => {
          this._elements.voicePrivacyInput.checked = enabled;
        }, (error) => {
          console.log('get voice privacy mode error');
          console.log(error);
        });
      },

      _updateFdnStatus: function() {
        var iccId = navigator.mozMobileConnections[this._cardIndex].iccId;
        if (iccId) {
          var icc = navigator.mozIccManager.getIccById(iccId);
          if (icc) {
            icc.getCardLock('fdn').then((result) => {
              var enabled = result.enabled;
              this._elements.fdnDesc.setAttribute('data-l10n-id',
                enabled ? 'enabled' : 'disabled');
              this._elements.callForwardingItem.hidden = enabled;
            });
          }
        }
      }
    });
  };
});
