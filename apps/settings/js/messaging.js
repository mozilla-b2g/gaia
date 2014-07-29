/* global IccHelper, SettingsListener */

'use strict';

/**
 * The Messaging singleton is in charge of handling some messagings settings and
 * enable/disable some messaging services such as WAP push and cell broadcast
 * messaging services.
 */
var Messaging = (function(window, document, undefined) {

  /**
   * Init the panel.
   */
  function m_init() {
    var settings = window.navigator.mozSettings;
    if (!settings || !IccHelper || IccHelper.cardState !== 'ready') {
      m_disableItems(true);
      return;
    }
    IccHelper.addEventListener('cardstatechange', function() {
      m_disableItems(IccHelper.cardState !== 'ready');
    });

    m_disableItems(false);
    m_initDeliveryReportSettings();
    m_initCellBroadcast();
    m_initSMSC();
  }

  /**
   * Ensure the delivery report settings are applied to both SMS and MMS
   * services. The panel only has one input to setup this preference but we need
   * to setup the preference for both services.
   */
  function m_initDeliveryReportSettings() {
    var requestStatusReportKeyForSms = 'ril.sms.requestStatusReport.enabled';
    var requestStatusReportKeyForMms = 'ril.mms.requestStatusReport.enabled';
    var settings = window.navigator.mozSettings;

    function setDeliveryReportSetting(key, value) {
      var lock = settings.createLock();
      var setting = {};
      setting[key] = value;
      lock.set(setting);
    }

    // Since delivery report for sms/mms should be the same, sync the value
    // while initializing.
    var request = settings.createLock().get(requestStatusReportKeyForSms);
    request.onsuccess = function onSuccessCb() {
      setDeliveryReportSetting(requestStatusReportKeyForMms,
                               request.result[requestStatusReportKeyForSms]);
    };
    // Keep both setting synced.
    settings.addObserver(
      requestStatusReportKeyForSms, function addObserverCb(event) {
        setDeliveryReportSetting(requestStatusReportKeyForMms,
                                 event.settingValue);
    });
  }

  /**
   * Init the cell broadcast service.
   */
  function m_initCellBroadcast() {
    var settings = window.navigator.mozSettings;

    var CBS_KEY = 'ril.cellbroadcast.disabled';
    var wrapper = document.getElementById('menuItem-cellBroadcast');
    var input = wrapper.querySelector('input');
    var init = false;

    // The UI for cell broadcast indicates that it is enabled or not, whereas
    // the setting used is 'disabled' so note that we switch the value when it
    // is set or displayed
    var cellBroadcastChanged = function(value) {
      input.checked = !value;
      if (!init) {
        input.disabled = false;
        wrapper.removeAttribute('aria-disabled');
        init = true;
      }
    };

    var inputChanged = function(event) {
      var cbsset = {};
      cbsset[CBS_KEY] = !input.checked;
      settings.createLock().set(cbsset);
    };

    input.addEventListener('change', inputChanged);
    SettingsListener.observe(CBS_KEY, false, cellBroadcastChanged);
  }

  /**
   * Retrieves the SMSC information
   */
   function m_initSMSC() {
    // TODO: deal with dual SIM situations (see bug 1001285)
    var request = navigator.mozMobileMessage.getSmscAddress();
    var wrapper = document.getElementById('menuItem-smsc');
    var holder = wrapper.querySelector('p');
    request.onsuccess = function() {
      // we only want the number, not the rest of details
      // and, as it is a number, we don't need to use l10n
      holder.textContent = this.result.split(',')[0].replace(/"/g, '');
    };
    request.onerror = function() {
      navigator.l10n.localize(holder, 'unknownSMSC');
      console.error('Unable to retrieve SMSC number');
    };
   }

  /**
   * Disable the items listed in the panel in order to avoid user interaction.
   * This is useful in case the ICC card status is not equal to ready (e.g.
   * airplane mode).
   *
   * @param {Boolean} disable This flag tells the function what to do.
   */
  function m_disableItems(disable) {
    var elementIds = ['menuItem-deliveryReport',
                      'menuItem-readReport',
                      'menuItem-autoRetrieve',
                      'menuItem-wapPush',
                      'menuItem-cellBroadcast'];

    elementIds.forEach(function(id) {
      var element = document.getElementById(id);
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
  }

  return {
    init: m_init
  };
})(this, document);

navigator.mozL10n.once(Messaging.init.bind(Messaging));
