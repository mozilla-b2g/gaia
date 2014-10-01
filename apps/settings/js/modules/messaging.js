/* global IccHelper */

/*
 * XXX
 * This module should be used only by `messaging` and `messaging_detail`
 * panels only.
 */

define(function(require) {
  'use strict';

  // Constants
  var CBS_KEY = 'ril.cellbroadcast.disabled';
  var CMAS_KEY = 'cmas.enabled';

  var SettingsUtils = require('modules/settings_utils');
  var settings = window.navigator.mozSettings;

  var Messaging = function() {
    this._cardIndex = 0;

    this._cbs = null;
    this._cbsInput = null;

    this._cmas = null;
    this._cmasInput = null;

    this._boundCBSInputChanged = this._cbsInputChanged.bind(this);
    this._boundCMASInputChanged = this._cmasInputChanged.bind(this);
  };

  Messaging.prototype = {
    _disableItems: function m__disableItems(panel, disable) {
      var elementIds = [
        'menuItem-deliveryReport',
        'menuItem-readReport',
        'menuItem-autoRetrieve',
        'menuItem-wapPush',
        'menuItem-cellBroadcast',
        'menuItem-emergencyAlert'
      ];
      elementIds.forEach(function(id) {
        var element = panel.querySelector(id);
        if (!element) {
          return;
        }

        if (disable) {
          element.setAttribute('aria-disabled', true);
        } else {
          element.removeAttribute('aria-disabled');
        }
        var input = element.querySelector('input');
        if (!input) {
          input = element.querySelector('select');
        }
        input.disabled = disable;
      });
    },
    _cbsInputChanged: function m__cbsInputChanged() {
      var cardIndex = this._cardIndex;
      var cbsInputChecked = this._cbsInput.checked;

      // get first
      var getReq = settings.createLock().get(CBS_KEY);
      getReq.onsuccess = function() {
        var values = getReq.result[CBS_KEY];
        values[cardIndex] = !cbsInputChecked;

        var cbsset = {};
        cbsset[CBS_KEY] = values;

        // then set
        settings.createLock().set(cbsset);
      };
    },
    _cmasInputChanged: function m__cmasInputChanged() {
      var cardIndex = this._cardIndex;
      var cmasInputChecked = this._cmasInput.checked;

      // get first
      var getReq = settings.createLock().get(CMAS_KEY);
      getReq.onsuccess = function() {
        var values = getReq.result[CMAS_KEY];
        values[cardIndex] = cmasInputChecked;

        var cmasset = {};
        cmasset[CMAS_KEY] = values;

        // then set
        settings.createLock().set(cmasset);
      };
    },
    // check local storage to bring back CMAS pref
    initCBS: function m_initCBS(panel, cardIndex) {
      this._cardIndex = cardIndex;

      // Cell Broadcast
      this._cbs = panel.querySelector('#menuItem-cellBroadcast');
      this._cbsInput = this._cbs.querySelector('input');

      // Emergency Alert
      this._cmas = panel.querySelector('#menuItem-emergencyAlert');
      this._cmasInput = this._cmas.querySelector('input');

      // cleanup first
      this._cbsInput.removeEventListener('change', this._boundCBSInputChanged);
      this._cmasInput.removeEventListener('change',
        this._boundCMASInputChanged);

      // reset again
      this._cbsInput.addEventListener('change', this._boundCBSInputChanged);
      this._cmasInput.addEventListener('change', this._boundCMASInputChanged);
    },
    disableItems: function m_disableItems(panel) {
      var self = this;

      if (!settings || !IccHelper || IccHelper.cardState !== 'ready') {
        this._disableItems(panel, true);
        return;
      }

      IccHelper.addEventListener('cardstatechange', function() {
        self._disableItems(panel, IccHelper.cardState !== 'ready');
      });

      this._disableItems(panel, false);
    },
    injectCBSTemplate: function m_injectCBSTemplate(containerNode) {
      var promise = new Promise(function(resolve, reject) {
        var templateId = 'template-messaging';
        SettingsUtils.loadTemplate(templateId, function(html) {
          if (!html) {
            reject('We can\'t get the template ' + templateId);
          } else {
            containerNode.innerHTML = html;
            resolve();
          }
        });
      });
      return promise;
    }
  };

  var messaging = new Messaging();
  return messaging;
});
