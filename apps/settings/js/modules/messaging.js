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
  var CMAS_PREF_KEY = 'cmas.user-pref.enabled';

  var IccHelper = require('shared/icc_helper');
  var asyncStorage = require('shared/async_storage');
  var SettingsUtils = require('modules/settings_utils');
  var SettingsListener = require('shared/settings_listener');
  var settings = window.navigator.mozSettings;

  var Messaging = function() {
    this._cardIndex = 0;

    this._cbs = null;
    this._cbsInput = null;
    this._cbsInit = false;

    this._cmas = null;
    this._cmasInput = null;
    this._cmasInit = false;

    this._boundCBSChanged = this._cbsChanged.bind(this);
    this._boundCBSInputChanged = this._cbsInputChanged.bind(this);
    this._boundCMASInputChanged = this._cmasInputChanged.bind(this);
  };

  Messaging.prototype = {
    _disableItems: function m__disableItems(panel, disable) {
      var elementIds = [
        'menuItem-deliveryReport',
        'menuItem-readReport',
        'menuItem-sendReadReport',
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
    _setCMAS: function m__setCMAS(enabled) {
      var cardIndex = this._cardIndex;
      this._cmasInput.checked = enabled;

      // get first
      var getReq = settings.createLock().get(CMAS_KEY);
      getReq.onsuccess = function() {
        var values = getReq.result[CMAS_KEY];
        values[cardIndex] = enabled;

        var cmasset = {};
        cmasset[CMAS_KEY] = values;

        // then set
        settings.createLock().set(cmasset);
      };
    },
    _cbsChanged: function m__cbsChanged(cbsSettings) {
      var cardIndex = this._cardIndex;
      var value = cbsSettings[cardIndex];
      this._cbsInput.checked = !value;

      if (value) {
        // when CBS off, CMAS is also off
        this._setCMAS(false);
      } else {
        // when CBS on, retained CMAS pref
        this._restoreCMASPref();
      }

      this._cmasInput.disabled = value; // CMAS disabled when CBS off

      if (!this._cbsInit) {
        this._cbsInput.disabled = false;
        this._cbs.removeAttribute('aria-disabled');
        this._cbsInit = true;
      }
    },
    _cbsInputChanged: function m__cbsInputChanged() {
      var cardIndex = this._cardIndex;
      var cbsInputChecked = this._cbsInput.checked;

      if (!cbsInputChecked) { // save CMAS pref when CBS off
        this._storeCMASPref(this._cmasInput.checked);
      }

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
      this._setCMAS(this._cmasInput.checked);
      this._storeCMASPref(this._cmasInput.checked);
    },
    // remember last CMAS pref when CBS off
    _storeCMASPref: function m__storeCMASPref(checked) {
      var cardIndex = this._cardIndex;
      asyncStorage.getItem(CMAS_PREF_KEY, function(pref) {
        var states = pref || [true, true];
        states[cardIndex] = checked;
        asyncStorage.setItem(CMAS_PREF_KEY, states);
      });
    },
    // check local storage to bring back CMAS pref
    _restoreCMASPref: function m__restoreCMASPref() {
      var cardIndex = this._cardIndex;
      asyncStorage.getItem(CMAS_PREF_KEY, function(pref) {
        var states = pref || [true, true];
        this._setCMAS(states[cardIndex]);

        if (!this._cmasInit) {
          this._cmasInput.disabled = false;
          this._cmas.removeAttribute('aria-disabled');
          this._cmasInit = true;
        }
      }.bind(this));
    },
    initCBS: function m_initCBS(panel, cardIndex) {
      this._cardIndex = cardIndex;

      // Cell Broadcast
      this._cbs = panel.querySelector('#menuItem-cellBroadcast');
      this._cbsInput = this._cbs.querySelector('input');
      this._cbsInit = false;

      // Emergency Alert
      this._cmas = panel.querySelector('#menuItem-emergencyAlert');
      this._cmasInput = this._cmas.querySelector('input');
      this._cmasInit = false;

      // cleanup first
      this._cbsInput.removeEventListener('change', this._boundCBSInputChanged);
      this._cmasInput.removeEventListener('change',
        this._boundCMASInputChanged);
      SettingsListener.unobserve(CBS_KEY, this._boundCBSChanged);

      // reset again
      this._cbsInput.addEventListener('change', this._boundCBSInputChanged);
      this._cmasInput.addEventListener('change', this._boundCMASInputChanged);
      SettingsListener.observe(CBS_KEY, [false, false], this._boundCBSChanged);
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
