define(function(require) {
  'use strict';

  var CallConstant = require('panels/call/call_constant');
  var CallForwarding = require('panels/call/call_forwarding');
  var CallUtils = require('panels/call/call_utils');
  var DialogService = require('modules/dialog_service');
  var SettingsPanel = require('modules/settings_panel');

  return function ctor_call_forwarding() {
    return SettingsPanel({
      onInit: function(panel, options) {
        this._elements = {};
        this._elements.panel = panel;

        this._cardIndex = options.cardIndex || 0;
        this._conns = window.navigator.mozMobileConnections;
        this._conn = this._conns[this._cardIndex];

        // We will keep each callForwarding as internal variable
        this._callForwardings = [null, null];

        var $ = function(selector) {
          return panel.querySelector(selector);
        };

        this._elements = {
          liCfuDesc: $('#li-cfu-desc'),
          liCfmbDesc: $('#li-cfmb-desc'),
          liCfnRepDesc: $('#li-cfnrep-desc'),
          liCfnReaDesc: $('#li-cfnrea-desc'),
          cfuDesc: $('#cfu-desc'),
          cfmbDesc: $('#cfmb-desc'),
          cfnRepDesc: $('#cfnrep-desc'),
          cfnReaDesc: $('#cfnrea-desc'),
          mobileBusyMenuItem: $('.callForwardingMobileBusy'),
          noReplyMenuItem: $('.callForwardingNoReply'),
          notReachableMenuItem: $('.callForwardingNotReachable'),
          unConditionalMenuItem: $('.callForwardingUnconditional')
        };

        this._cfOptionNameMapping = {
          'unConditional': 'cfuDesc',
          'mobileBusy': 'cfmbDesc',
          'noReply': 'cfnRepDesc',
          'notReachable': 'cfnReaDesc'
        };

        this._bindMenuItemsClickEvent();
      },

      onBeforeShow: function(panel, options) {
        if (typeof options.cardIndex !== 'undefined') {
          this._cardIndex = options.cardIndex;
          this._conn = this._conns[this._cardIndex];
        }

        if (this._callForwardings[this._cardIndex] === null) {
          this._callForwardings[this._cardIndex] =
            CallForwarding(this._cardIndex);
        }

        this._bindCallForwardingObservers();
        this._refresh();
      },

      onHide: function() {
        this._unbindCallForwardingObservers();
      },

      _bindCallForwardingObservers: function() {
        var cf = this._getCallForwarding();

        cf.observe('state', (state) => {
          if (state === 'normal') {
            this._lockMenuItems(false);

            // we have to force updating this information because
            // some numbers will not be changed, there is no way
            // to trigger every cf.observe()
            Object.keys(CallConstant.CALL_FORWARD_REASON_MAPPING).forEach(
              (cfOptionName) => {
                var selector = this._cfOptionNameMapping[cfOptionName];
                var element = this._elements[selector];
                var number = cf[cfOptionName + 'Number'];
                this._updateNumberInfoOnElement(element, number);
            });
          } else if (state === 'requesting') {
            this._lockMenuItems(true);
            this._updateAllDescInfoWithL10nId('callSettingsQuery');
          } else if (state === 'error') {
            this._lockMenuItems(false);
            this._updateAllDescInfoWithL10nId('callSettingsQueryError');
          }
        });

        Object.keys(CallConstant.CALL_FORWARD_REASON_MAPPING).forEach(
          (cfOptionName) => {
            var selector = this._cfOptionNameMapping[cfOptionName];
            var element = this._elements[selector];

            cf.observe(cfOptionName + 'Number', (number) => {
              this._updateNumberInfoOnElement(element, number);
            });
        });
      },

      _updateNumberInfoOnElement: function(element, number) {
        if (!element) {
          return;
        }

        if (number) {
          navigator.mozL10n.setAttributes(element,
            'callForwardingForwardingVoiceToNumber', {
              number: number
          });
        } else {
          element.setAttribute('data-l10n-id',
            'callForwardingNotForwarding');
        }
      },

      _unbindCallForwardingObservers: function() {
        var cf = this._getCallForwarding();
        cf.unobserve('state');
        Object.keys(CallConstant.CALL_FORWARD_REASON_MAPPING).forEach(
          (cfOptionName) => {
            cf.unobserve(cfOptionName + 'Number');
        });
      },

      _getCallForwarding: function() {
        var cf = this._callForwardings[this._cardIndex];
        if (!cf) {
          console.log('can\'t find related call forwarding instance ' +
            'at cardIndex - ', this._cardIndex);
        } else {
          return cf;
        }
      },

      _updateAllDescInfoWithL10nId: function(l10nId) {
        this._elements.cfuDesc.setAttribute('data-l10n-id', l10nId);
        this._elements.cfmbDesc.setAttribute('data-l10n-id', l10nId);
        this._elements.cfnRepDesc.setAttribute('data-l10n-id', l10nId);
        this._elements.cfnReaDesc.setAttribute('data-l10n-id', l10nId);
      },

      _bindMenuItemsClickEvent: function() {
        var mapping = {
          mobileBusy: {
            menuItem: this._elements.mobileBusyMenuItem,
            panelId: 'call-cf-mobile-busy-settings'
          },
          noReply: {
            menuItem: this._elements.noReplyMenuItem,
            panelId: 'call-cf-no-reply-settings'
          },
          notReachable: {
            menuItem: this._elements.notReachableMenuItem,
            panelId: 'call-cf-not-reachable-settings'
          },
          unConditional: {
            menuItem: this._elements.unConditionalMenuItem,
            panelId: 'call-cf-unconditional-settings'
          }
        };

        var onclick = (panelId, cfOptionName) => {
          var cf = this._getCallForwarding();
          var number = cf[cfOptionName + 'Number'];
          var enabled = cf[cfOptionName + 'Enabled'];

          // Reflect related settings value on the panel
          DialogService.show(panelId, {
            number: number,
            enabled: enabled
          }).then((result) => {
            var type = result.type;
            var value = result.value || {};
            var returnNumber = value.number || '';
            var returnEnabled = value.enabled || false;

            if (type === 'submit') {
              this._getCallForwarding().setCallForwardingValues({
                key: cfOptionName,
                enabled: returnEnabled,
                number: returnNumber
              }).then((result) => {
                if (result) {
                  var {key, action} = result;
                  this._refresh().then((options) => {
                    var rules = options[key];
                    var messageL10nId =
                      this._getSetCallForwardingOptionResult(rules, action);
                    DialogService.alert(messageL10nId, {
                      title: 'callForwardingConfirmTitle',
                      submitButton: 'continue'
                    });
                  });
                }
              }, (error) => {
                if (error) {
                  DialogService.alert(error.name, {
                    title: 'callForwardingConfirmTitle',
                    submitButtonText: 'continue'
                  });
                  this._refresh();
                }
              });
            }
          });
        };

        for (var cfOptionName in mapping) {
          var item = mapping[cfOptionName];
          var panelId = item.panelId;
          var menuItem = item.menuItem;
          menuItem.onclick = onclick.bind(null, panelId, cfOptionName);
        }
      },

      _lockMenuItems: function(isLocked) {
        // After that, update 'Call Forwarding' submenu items
        var elements = [
          'liCfuDesc',
          'liCfmbDesc',
          'liCfnRepDesc',
          'liCfnReaDesc'
        ];

        elements.forEach(function(id) {
          var element = this._elements[id];
          if (isLocked) {
            element.setAttribute('aria-disabled', true);
          } else {
            element.removeAttribute('aria-disabled');
            // If unconditional call forwarding is on we
            // keep disabled the other panels.
            if (this._getCallForwarding().isUnconditionalCFOn() &&
              id !== 'liCfuDesc') {
              element.setAttribute('aria-disabled', true);
            }
          }
        }, this);
      },

      _refresh: function(checkCallForwardingOption, reason, action) {
        return this._getCallForwarding().refresh();
      },

      _getSetCallForwardingOptionResult: function(rules, action) {
        var rule = CallUtils.findActiveVoiceRule(rules);
        var l10nId;

        if (rule) {
          l10nId = (action === CallConstant.CALL_FORWARD_ACTION.DISABLE) ?
            'callForwardingSetForbidden' : 'callForwardingSetSuccess';
          return l10nId;
        } else {
          l10nId = (action === CallConstant.CALL_FORWARD_ACTION.REGISTRATION) ?
            'callForwardingSetError' : 'callForwardingSetSuccess';
          return l10nId;
        }
      }
    });
  };
});
