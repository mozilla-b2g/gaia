/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/* globals ApnHelper */

'use strict';

/**
 * Singleton object that handles some cell and data settings.
 */
var CarrierSettings = (function(window, document, undefined) {
  var APN_FILE = '/shared/resources/apn.json';
  var AUTH_TYPES = ['none', 'pap', 'chap', 'papOrChap'];
  var CP_APN_KEY = 'ril.data.cp.apns';

  var NETWORK_TYPE_SETTING = 'operatorResources.data.icon';
  var networkTypeMapping = {};

  var _networkTypeCategory = {
    'gprs': 'gsm',
    'edge': 'gsm',
    'umts': 'gsm',
    'hsdpa': 'gsm',
    'hsupa': 'gsm',
    'hspa': 'gsm',
    'hspa+': 'gsm',
    'lte': 'gsm',
    'gsm': 'gsm',
    'is95a': 'cdma',
    'is95b': 'cdma',
    '1xrtt': 'cdma',
    'evdo0': 'cdma',
    'evdoa': 'cdma',
    'evdob': 'cdma',
    'ehrpd': 'cdma'
  };

  var _;
  var _settings;
  var _mobileConnections;
  var _iccManager;
  var _voiceTypes;

  /** mozMobileConnection instance the panel settings rely on */
  var _mobileConnection = null;
  /** Flags */
  var _onSubmitEventListenerAdded = {
    'data': false,
    'mms': false,
    'supl': false,
    'dun': false,
    'ims': false
  };
  /** Flag */
  var _restartingDataConnection = false;
  /**
   * allApnSettings is a list of all possible prefered APNs based on the SIM
   * operator numeric (MCC MNC codes in the ICC card)
   */
  var _allApnList = null;
  /** MCC and MNC codes the APNs rely on */
  var _mccMncCodes = { mcc: '000', mnc: '00' };

  /* Store the states of automatic operator selection */
  var _opAutoSelectStates = null;

  /**
   * Init function.
   */
  function cs_init() {
    _ = window.navigator.mozL10n.get;
    _settings = window.navigator.mozSettings;
    _mobileConnections = window.navigator.mozMobileConnections;
    _iccManager = window.navigator.mozIccManager;
    if (!_ || !_settings || !_mobileConnections || !_iccManager) {
      return;
    }

    _voiceTypes = Array.prototype.map.call(_mobileConnections,
      function() { return null; });

    // Get the mozMobileConnection instace for this ICC card.
    _mobileConnection = _mobileConnections[
      DsdsSettings.getIccCardIndexForCellAndDataSettings()
    ];
    if (!_mobileConnection) {
      return;
    }

    cs_addVoiceTypeChangeListeners();
    cs_updateNetworkTypeLimitedItemsVisibility(
      _mobileConnection.voice && _mobileConnection.voice.type);

    // Show carrier name.
    cs_showCarrierName();

    // Init network type selector.
    cs_initNetworkTypeText(cs_initNetworkTypeSelector());

    /*
     * Displaying all GSM and CDMA options by default for CDMA development.
     * We should remove CDMA options after the development finished.
     * Bug 881862 is filed for tracking this.
     */
    // get network type
    getSupportedNetworkInfo(_mobileConnection, function(result) {
      var content =
        document.getElementById('carrier-operatorSettings-content');

      cs_initIccsUI();

      cs_initOperatorSelector();
      cs_initRoamingPreferenceSelector();

      // Init warnings the user sees before enabling data calls and roaming.
      cs_initWarnings();

      // Update the list of APNs in the APN panels.
      window.addEventListener('panelready', function(e) {
        // Get the mozMobileConnection instace for this ICC card.
        _mobileConnection = _mobileConnections[
          DsdsSettings.getIccCardIndexForCellAndDataSettings()
        ];
        if (!_mobileConnection) {
          return;
        }

        var currentHash = e.detail.current;
        if (currentHash === '#carrier') {
          cs_updateNetworkTypeLimitedItemsVisibility(
            _mobileConnection.voice && _mobileConnection.voice.type);
          // Show carrier name.
          cs_showCarrierName();
          return;
        } else if (currentHash === '#carrier-detail') {
          var detailHeader =
            document.querySelector('#carrier-detail header h1');
          navigator.mozL10n.localize(detailHeader, 'simSettingsWithIndex',
            {index: DsdsSettings.getIccCardIndexForCellAndDataSettings() + 1});
        }

        if (!currentHash.startsWith('#carrier-') ||
            (currentHash === '#carrier-dc-warning') ||
            (currentHash === '#carrier-dr-warning')) {
          return;
        }

        if (currentHash === '#carrier-operatorSettings') {
          cs_updateNetworkTypeSelector(result);
          cs_updateAutomaticOperatorSelectionCheckbox();
          return;
        }

        // Get MCC and MNC codes the APNs will rely on.
        cs_getMccMncCodes(function getMccMncCodesCb() {
          var networkType = _mobileConnection.data.type;

          if (currentHash === '#carrier-dataSettings') {
            cs_queryApns(cs_updateApnList, 'data', networkType);
          } else if (currentHash === '#carrier-mmsSettings') {
            cs_queryApns(cs_updateApnList, 'mms', networkType);
          } else if (currentHash === '#carrier-suplSettings') {
            cs_queryApns(cs_updateApnList, 'supl', networkType);
          } else if (currentHash === '#carrier-dunSettings') {
            cs_queryApns(cs_updateApnList, 'dun', networkType);
          } else if (currentHash === '#carrier-imsSettings') {
            cs_queryApns(cs_updateApnList, 'ims', networkType);
          }
        });
      });
    });

    // We need to refresh call setting items as they can be changed in dialer.
    document.addEventListener('visibilitychange', function() {
      if (document.hidden) {
        return;
      }

      if (Settings.currentPanel === '#carrier-dataSettings') {
        cs_refreshItems('data');
      } else if (Settings.currentPanel === '#carrier-mmsSettings') {
        cs_refreshItems('mms');
      } else if (Settings.currentPanel === '#carrier-suplSettings') {
        cs_refreshItems('supl');
      } else if (Settings.currentPanel === '#carrier-dunSettings') {
        cs_refreshItems('dun');
      } else if (Settings.currentPanel === '##carrier-imsSettings') {
        cs_refreshItems('ims');
      }
    });
  }

  function cs_initIccsUI() {
    var isMultiSim = DsdsSettings.getNumberOfIccSlots() > 1;
    var carrierInfo = document.querySelector('#carrier .carrier-info');
    var advancedSettings =
      document.querySelector('#carrier .carrier-advancedSettings');
    var simSettings = document.querySelector('#carrier .carrier-simSettings');
    var operatorSettingsHeader =
      document.querySelector('#carrier-operatorSettings header');

    if (isMultiSim) {
      LazyLoader.load([
        '/js/carrier_iccs.js'
      ], function() {
        IccHandlerForCarrierSettings.init();
      });

      operatorSettingsHeader.dataset.href = '#carrier-detail';
    } else {
      operatorSettingsHeader.dataset.href = '#carrier';
    }
    carrierInfo.hidden = isMultiSim;
    advancedSettings.hidden = isMultiSim;
    simSettings.hidden = !isMultiSim;
  }

  function cs_refreshItems(usage) {
    _mobileConnections = window.navigator.mozMobileConnections;
    _mobileConnection = _mobileConnections[
      DsdsSettings.getIccCardIndexForCellAndDataSettings()
    ];
    if (!_mobileConnection) {
      return;
    }
    var networkType = _mobileConnection.data.type;
    cs_queryApns(cs_updateApnList, usage, networkType);
  }

  /**
   * Add listeners on 'voicechange' for show/hide network type limited items.
   */
  function cs_addVoiceTypeChangeListeners() {
    Array.prototype.forEach.call(_mobileConnections, function(conn, index) {
      _voiceTypes[index] = conn.voice.type;
      conn.addEventListener('voicechange', function() {
        var newType = conn.voice.type;
        if (index !== DsdsSettings.getIccCardIndexForCellAndDataSettings() ||
            _voiceTypes[index] === newType) {
          return;
        }
        _voiceTypes[index] = newType;
        if (newType) {
          cs_updateNetworkTypeLimitedItemsVisibility(newType);
        }
      });
    });
  }

  /**
   * Update the network type limited items' visibility based on the voice type.
   */
  function cs_updateNetworkTypeLimitedItemsVisibility(voiceType) {
    // The following features are limited to GSM types.
    var autoSelectOperatorItem = document.getElementById('operator-autoSelect');
    var availableOperatorsHeader =
      document.getElementById('availableOperatorsHeader');
    var availableOperators = document.getElementById('availableOperators');
    // The following feature is limited to CDMA types.
    var roamingPreferenceItem =
      document.getElementById('operator-roaming-preference');

    autoSelectOperatorItem.hidden = availableOperatorsHeader.hidden =
      availableOperators.hidden = (_networkTypeCategory[voiceType] !== 'gsm');

    roamingPreferenceItem.hidden =
      (_networkTypeCategory[voiceType] !== 'cdma');
  }

  /**
   * Get the mcc/mnc codes from the setting database.
   *
   * @param {Function} callback Callback function to be called once the work is
   *                            done.
   */
  function cs_getMccMncCodes(callback) {
    var iccCardIndex = DsdsSettings.getIccCardIndexForCellAndDataSettings();
    var transaction = _settings.createLock();
    var mccKey = 'operatorvariant.mcc';
    var mncKey = 'operatorvariant.mnc';

    var mccRequest = transaction.get(mccKey);
    mccRequest.onsuccess = function() {
      var mccs = mccRequest.result[mccKey];
      if (!mccs || !Array.isArray(mccs) || !mccs[iccCardIndex]) {
        _mccMncCodes.mcc = '000';
      } else {
        _mccMncCodes.mcc = mccs[iccCardIndex];
      }
      var mncRequest = transaction.get(mncKey);
      mncRequest.onsuccess = function() {
        var mncs = mncRequest.result[mncKey];
        if (!mncs || !Array.isArray(mncs) || !mncs[iccCardIndex]) {
          _mccMncCodes.mnc = '00';
        } else {
          _mccMncCodes.mnc = mncs[iccCardIndex];
        }
        if (callback) {
          callback();
        }
      };
    };
  }

  /**
   * Show the carrier name in the ICC card.
   */
  function cs_showCarrierName() {
    var desc = document.getElementById('dataNetwork-desc');
    var iccCard = _iccManager.getIccById(_mobileConnection.iccId);
    var network = _mobileConnection.voice.network;
    var iccInfo = iccCard.iccInfo;
    var carrier = network ? (network.shortName || network.longName) : null;

    if (carrier && iccInfo && iccInfo.isDisplaySpnRequired && iccInfo.spn) {
      if (iccInfo.isDisplayNetworkNameRequired && carrier !== iccInfo.spn) {
        carrier = carrier + ' ' + iccInfo.spn;
      } else {
        carrier = iccInfo.spn;
      }
    }
    desc.textContent = carrier;
  }

  /**
   * Helper function. Get the value for the ril.data.defaultServiceId setting
   * from the setting database.
   *
   * @param {Function} callback Callback function to be called once the work is
   *                            done.
   */
  function cs_getDefaultServiceIdForData(callback) {
    var request = _settings.createLock().get('ril.data.defaultServiceId');
    request.onsuccess = function onSuccessHandler() {
      var defaultServiceId =
        parseInt(request.result['ril.data.defaultServiceId'], 10);
      if (callback) {
        callback(defaultServiceId);
      }
    };
  }

  function cs_initNetworkTypeText(aNext) {
    var req;
    try {
      networkTypeMapping = {};
      req = _settings.createLock().get(NETWORK_TYPE_SETTING);
      req.onsuccess = function() {
        var networkTypeValues = req.result[NETWORK_TYPE_SETTING] || {};
        for (var key in networkTypeValues) {
          networkTypeMapping[key] = networkTypeValues[key];
        }
        aNext && aNext();
      };
      req.onerror = function() {
        console.error('Error loading ' + NETWORK_TYPE_SETTING + ' settings. ' +
                      req.error && req.error.name);
        aNext && aNext();
      };
    } catch (e) {
      console.error('Error loading ' + NETWORK_TYPE_SETTING + ' settings. ' +
                    e);
      aNext && aNext();
    }
  }

  /**
   * Init network type selector. Add the event listener that handles the changes
   * for the network type.
   */
  function cs_initNetworkTypeSelector() {
    if (!_mobileConnection.setPreferredNetworkType)
      return;

    var alertDialog = document.getElementById('preferredNetworkTypeAlert');
    var message = document.getElementById('preferredNetworkTypeAlertMessage');
    var continueButton = alertDialog.querySelector('button');
    continueButton.addEventListener('click', function onClickHandler() {
      alertDialog.hidden = true;
      getSupportedNetworkInfo(_mobileConnection, cs_updateNetworkTypeSelector);
    });

    var preferredNetworkTypeHelper =
      SettingsHelper('ril.radio.preferredNetworkType');

    var selector = document.getElementById('preferredNetworkType');
    selector.addEventListener('blur', function evenHandler() {
      var targetIndex = DsdsSettings.getIccCardIndexForCellAndDataSettings();
      var type = selector.value;
      var request = _mobileConnection.setPreferredNetworkType(type);

      request.onsuccess = function onSuccessHandler() {
        preferredNetworkTypeHelper.get(function gotPNT(values) {
          values[targetIndex] = type;
          preferredNetworkTypeHelper.set(values);
        });
      };
      request.onerror = function onErrorHandler() {
        message.textContent = _('preferredNetworkTypeAlertErrorMessage');
        alertDialog.hidden = false;
      };
    });
  }

  /**
   * Update network type selector.
   */
  function cs_updateNetworkTypeSelector(supportedNetworkTypeResult) {
    if (!_mobileConnection.getPreferredNetworkType ||
        !supportedNetworkTypeResult.networkTypes) {
      return;
    }

    var selector = document.getElementById('preferredNetworkType');
    // Clean up all option before updating again.
    while (selector.hasChildNodes()) {
      selector.removeChild(selector.lastChild);
    }

    var request = _mobileConnection.getPreferredNetworkType();
    request.onsuccess = function onSuccessHandler() {
      var supportedNetworkTypes = supportedNetworkTypeResult.networkTypes;
      var networkType = request.result;
      if (networkType) {
        supportedNetworkTypes.forEach(function(type) {
          var option = document.createElement('option');
          option.value = type;
          option.selected = (networkType === type);
          // show user friendly network mode names
          if (type in networkTypeMapping) {
            option.text = networkTypeMapping[type];
          } else {
            var l10nId = supportedNetworkTypeResult.l10nIdForType(type);
            localize(option, l10nId);
            // fallback to the network type
            if (!l10nId) {
              option.textContent = type;
            }
          }
          selector.appendChild(option);
        });

      } else {
        console.warn('carrier: could not retrieve network type');
      }
    };
    request.onerror = function onErrorHandler() {
      console.warn('carrier: could not retrieve network type');
    };
  }

  /**
   * Network operator selection: auto/manual.
   */
  function cs_initOperatorSelector() {
    var opAutoSelect = document.getElementById('operator-autoSelect');
    var opAutoSelectInput = opAutoSelect.querySelector('input');
    var opAutoSelectState = opAutoSelect.querySelector('small');

    _opAutoSelectStates =
      Array.prototype.map.call(_mobileConnections, function() { return true; });

    /**
     * Update selection mode.
     */
    function updateSelectionMode(scan) {
      var mode = _mobileConnection.networkSelectionMode;
      // we're assuming the auto-selection is ON by default.
      var auto = !mode || (mode === 'automatic');
      opAutoSelectInput.checked = auto;
      if (auto) {
        localize(opAutoSelectState, 'operator-networkSelect-auto');
      } else {
        localize(opAutoSelectState, 'operator-networkSelect-manual');
        if (scan) {
          gOperatorNetworkList.scan();
        }
      }
    }

    /**
     * Toggle autoselection.
     */
    opAutoSelectInput.onchange = function() {
      var targetIndex = DsdsSettings.getIccCardIndexForCellAndDataSettings();
      _opAutoSelectStates[targetIndex] = opAutoSelectInput.checked;

      if (opAutoSelectInput.checked) {
        gOperatorNetworkList.stop();
        var req = _mobileConnection.selectNetworkAutomatically();
        req.onsuccess = function() {
          updateSelectionMode(false);
        };
      } else {
        gOperatorNetworkList.scan();
      }
    };

    /**
     * Create a network operator list item.
     */
    function newListItem(network, callback) {
      /**
       * A network list item has the following HTML structure:
       *   <li>
       *     <small> Network State </small>
       *     <a> Network Name </a>
       *   </li>
       */

      // name
      var name = document.createElement('a');
      name.textContent = network.shortName || network.longName;

      // state
      var state = document.createElement('small');
      localize(state,
        network.state ? ('state-' + network.state) : 'state-unknown');

      // create list item
      var li = document.createElement('li');
      li.appendChild(state);
      li.appendChild(name);

      li.dataset.cachedState = network.state || 'unknown';
      li.classList.add('operatorItem');

      // bind connection callback
      li.onclick = function() {
        callback(network, true);
      };
      return li;
    }

    // operator network list
    var gOperatorNetworkList = (function operatorNetworkList(list) {
      // get the "Searching..." and "Search Again" items, respectively
      var infoItem = list.querySelector('li[data-state="on"]');
      var scanItem = list.querySelector('li[data-state="ready"]');
      scanItem.onclick = scan;

      var currentConnectedNetwork = null;
      var connecting = false;
      var operatorItemMap = {};

      var scanRequest = null;

      /**
       * Clear the list.
       */
      function clear() {
        operatorItemMap = {};
        var operatorItems = list.querySelectorAll('li:not([data-state])');
        var len = operatorItems.length;
        for (var i = len - 1; i >= 0; i--) {
          list.removeChild(operatorItems[i]);
        }
      }

      /**
       * Reset operator item state.
       */
      function resetOperatorItemState() {
        var operatorItems =
          Array.prototype.slice.call(list.querySelectorAll('.operatorItem'));
        operatorItems.forEach(function(operatorItem) {
          var state = operatorItem.dataset.cachedState;
          var messageElement = operatorItem.querySelector('small');

          if (!state) {
            state = 'unknown';
          } else if (state === 'current') {
            state = 'available';
          }

          localize(messageElement, 'state-' + state);
        });
      }

      /**
       * Select operator.
       */
      function selectOperator(network, manuallySelect) {
        if (connecting) {
          return;
        }

        var listItem = operatorItemMap[network.mcc + '.' + network.mnc];
        if (!listItem) {
          return;
        }

        var messageElement = listItem.querySelector('small');

        connecting = true;
        // update current network state as 'available' (the string display
        // on the network to connect)
        if (manuallySelect) {
          resetOperatorItemState();
        }

        var req = _mobileConnection.selectNetwork(network);
        localize(messageElement, 'operator-status-connecting');
        req.onsuccess = function onsuccess() {
          currentConnectedNetwork = network;
          localize(messageElement, 'operator-status-connected');
          updateSelectionMode(false);
          connecting = false;
        };
        req.onerror = function onerror() {
          connecting = false;
          localize(messageElement, 'operator-status-connectingfailed');
          if (currentConnectedNetwork) {
            recoverAvailableOperator();
          } else {
            updateSelectionMode(false);
          }
        };
      }

      /**
       * Recover available operators.
       */
      function recoverAvailableOperator() {
        if (currentConnectedNetwork) {
          selectOperator(currentConnectedNetwork, false);
        }
      }

      /**
       * Scan available operators.
       */
      function scan() {
        clear();
        list.dataset.state = 'on'; // "Searching..."

        // invalidate the original request if it exists
        invalidateRequest(scanRequest);
        scanRequest = _mobileConnection.getNetworks();
        scanRequest.onsuccess = function onsuccess() {
          var networks = scanRequest.result;
          for (var i = 0; i < networks.length; i++) {
            var network = networks[i];
            var listItem = newListItem(network, selectOperator);
            list.insertBefore(listItem, scanItem);

            operatorItemMap[network.mcc + '.' + network.mnc] = listItem;
            if (network.state === 'current') {
              currentConnectedNetwork = network;
            }
          }
          list.dataset.state = 'ready'; // "Search Again" button

          scanRequest = null;
        };

        scanRequest.onerror = function onScanError(error) {
          console.warn('carrier: could not retrieve any network operator. ');
          list.dataset.state = 'ready'; // "Search Again" button

          scanRequest = null;
        };
      }

      function invalidateRequest(request) {
        if (request) {
          request.onsuccess = request.onerror = function() {};
        }
      }

      function stop() {
        list.dataset.state = 'off';
        clear();
        invalidateRequest(scanRequest);
        scanRequest = null;
      }

      // API
      return {
        stop: stop,
        scan: scan
      };
    })(document.getElementById('availableOperators'));

    updateSelectionMode(true);
  }

  /**
   * Update the checkbox of the automatic operator selection.
   */
  function cs_updateAutomaticOperatorSelectionCheckbox() {
    var opAutoSelectInput =
      document.querySelector('#operator-autoSelect input');
    var targetIndex = DsdsSettings.getIccCardIndexForCellAndDataSettings();
    opAutoSelectInput.checked = _opAutoSelectStates[targetIndex];
    opAutoSelectInput.dispatchEvent(new Event('change'));
  }

  /**
   * Init roaming preference selector.
   */
  function cs_initRoamingPreferenceSelector() {
    if (!_mobileConnection.getRoamingPreference) {
      document.getElementById('operator-roaming-preference').hidden = true;
      return;
    }

    var defaultRoamingPreferences =
      Array.prototype.map.call(_mobileConnections,
        function() { return 'any'; });
    var roamingPreferenceHelper =
      SettingsHelper('ril.roaming.preference', defaultRoamingPreferences);

    var selector =
      document.getElementById('operator-roaming-preference-selector');
    var req = _mobileConnection.getRoamingPreference();
    req.onsuccess = function() {
      for (var i = 0; i < selector.options.length; i++) {
        var selection = selector.options[i];
        if (selection.value === req.result) {
          selection.selected = true;

          var evt = document.createEvent('Event');
          evt.initEvent('change', true, true);
          selector.dispatchEvent(evt);
          break;
        }
      }
    };

    req.onerror = function() {
      console.warn('carrier: ' + req.error.name);
    };

    selector.addEventListener('blur', function() {
      var index = this.selectedIndex;
      if (index >= 0) {
        var selection = this.options[index];
        roamingPreferenceHelper.get(function gotRP(values) {
          var targetIndex =
            DsdsSettings.getIccCardIndexForCellAndDataSettings();
          var setReq = _mobileConnection.setRoamingPreference(selection.value);
          setReq.onsuccess = function set_rp_success() {
            values[targetIndex] = selection.value;
            roamingPreferenceHelper.set(values);
          };
          setReq.onerror = function set_rp_error() {
            selector.value = values[targetIndex];
          };
        });
      }
    });
  }

  /**
   * Init some cell and data warning dialogs such as the one related to
   * enable data calls and the related to enable data calls in roaming.
   */
  function cs_initWarnings() {
    /**
     * Init a warning dialog.
     *
     * @param {String} settingKey The key of the setting.
     * @param {String} dialogId The id of the warning dialog.
     * @param {String} explanationItemId The id of the explanation item.
     * @param {Function} warningDisabledCallback Callback function to be
     *                                           called once the warning is
     *                                           disabled.
     */
    function initWarning(settingKey,
                         dialogId,
                         explanationItemId,
                         warningDisabledCallback) {

      var warningDialogEnabledKey = settingKey + '.warningDialog.enabled';
      var explanationItem = document.getElementById(explanationItemId);

      /**
       * Figure out whether the warning is enabled or not.
       *
       * @param {Function} callback Callback function to be called once the
       *                            work is done.
       */
      function getWarningEnabled(callback) {
        window.asyncStorage.getItem(warningDialogEnabledKey,
                                    function getItemCb(warningEnabled) {
          if (warningEnabled === null) {
            warningEnabled = true;
          }
          if (callback) {
            callback(warningEnabled);
          }
        });
      }

      /**
       * Set the value of the setting into the settings database.
       *
       * @param {Boolean} state State to be stored.
       */
      function setState(state) {
        var cset = {};
        cset[settingKey] = !!state;
        _settings.createLock().set(cset);
      }

      /**
       * Helper function. Handler to be called once the user click on the
       * accept button form the warning dialog.
       */
      function onSubmit() {
        window.asyncStorage.setItem(warningDialogEnabledKey, false);
        explanationItem.hidden = false;
        setState(true);
        if (warningDisabledCallback) {
          warningDisabledCallback();
        }
      }

      /**
       * Helper function. Handler to be called once the user click on the
       * cancel button form the warning dialog.
       */
      function onReset() {
        window.asyncStorage.setItem(warningDialogEnabledKey, true);
      }

      // Register an observer to monitor setting changes.
      _settings.addObserver(settingKey, function observerCb(event) {
        getWarningEnabled(function getWarningEnabledCb(warningEnabled) {
          var enabled = event.settingValue;
          if (warningEnabled) {
            if (enabled) {
              setState(false);
              openDialog(dialogId, onSubmit, onReset);
            }
          } else {
            explanationItem.hidden = false;
          }
        });
      });

      // Initialize the visibility of the warning message.
      getWarningEnabled(function getWarningEnabledCb(warningEnabled) {
        if (warningEnabled) {
          var request = _settings.createLock().get(settingKey);
          request.onsuccess = function onSuccessCb() {
            var enabled = false;
            if (request.result[settingKey] !== undefined) {
              enabled = request.result[settingKey];
            }
            if (enabled) {
              window.asyncStorage.setItem(warningDialogEnabledKey, false);
              explanationItem.hidden = false;
            }
          };
        } else {
          explanationItem.hidden = false;
          if (warningDisabledCallback) {
            warningDisabledCallback();
          }
        }
      });
    }

    /**
     * Turn off data roaming automatically when users turn off data calls.
     */
    function warningDataEnabledCb() {
       _settings.addObserver('ril.data.enabled', function observerCb(event) {
         if (!event.settingValue && _restartingDataConnection) {
           var cset = {};
           cset['ril.data.roaming_enabled'] = false;
           _settings.createLock().set(cset);
         }
      });
    }

    initWarning('ril.data.enabled',
                'carrier-dc-warning',
                'dataConnection-expl',
                warningDataEnabledCb);
    initWarning('ril.data.roaming_enabled',
                'carrier-dr-warning',
                'dataRoaming-expl');
  }

  /**
   * Query <apn> elements matching the mcc/mnc arguments, both the ones in the
   * apn.json database and the one received through client provisioning
   * messages.
   *
   * @param {Function} callback Function to be called once the work is done.
   * @param {String} usage The usage for the APNs in the panel.
   * @param {String} type The network type which the APN must be
   *                 compatible with.
   */
  function cs_queryApns(callback, usage, type) {
    var usageFilter = usage;
    if (!usage || usage == 'data') {
      usageFilter = 'default';
    }

    /**
     * Helper function. Filter APNs by usage.
     *
     * @param {Array} apnList
     */
    function filter(apnList) {
      var found = [];
      for (var i = 0; i < apnList.length; i++) {
        if (apnList[i].type.indexOf(usageFilter) != -1) {
          found.push(apnList[i]);
        }
      }
      return found;
    }

    // load and query both apn.json database and 'ril.data.cp.apns' setting,
    // then trigger callback on results
    loadJSON(APN_FILE, function loadJsonCb(apn) {
      var mcc = _mccMncCodes.mcc;
      var mnc = _mccMncCodes.mnc;

      _allApnList = ApnHelper.getCompatible(apn, mcc, mnc, type);

      if (!_settings) {
        if (callback) {
          callback(filter(_allApnList), usage);
        }
        return;
      }
      var transaction = _settings.createLock();
      var load = transaction.get(CP_APN_KEY);
      load.onsuccess = function loadApnsSuccess() {
        var preferedApnList = _allApnList.concat([]);
        var clientProvisioingApns = load.result[CP_APN_KEY];
        if (clientProvisioingApns) {
          preferedApnList = preferedApnList.concat(
            ApnHelper.getCompatible(clientProvisioingApns, mcc, mnc, type)
          );
        }

        if (callback) {
          callback(filter(preferedApnList), usage);
        }
      };
      load.onerror = function loadApnsError() {
        if (callback) {
          callback(filter(_allApnList), usage);
        }
      };
    });
  }

  /**
   * Helper function.
   */
  function cs_formInputElement(usage, name) {
    var id = 'ril.' + usage + '.' + name;
    return document.getElementById(id);
  }

  /**
   * Helper function. Ensure only one radio button is selected at any time.
   *
   * @param {Element} apnList Element list.
   *
   * @param {String} target This parameter holds the input element value for the
   *                        element in the list to switch to. If might be either
   *                        an id as '_custom_' (when switching to the custom
   *                        APN or a hash code (when switching to any other
   *                        APN).
   */
  function cs_switchRadioButtons(apnList, target) {
    var selector = 'input[type="radio"][value="' + target + '"]';
    apnList.querySelector(selector).checked = true;
  }

  /**
   * Update APN list.
   *
   * @param {Array} apnItems Array of APNs.
   * @param {String} usage The usage for the APNs in the panel.
   * @param {Function} callback Callback function to be called once the list
   *                            gets updated. This callback is useful for unit
   *                            testing.
   */
  function cs_updateApnList(apnItems, usage, callback) {
    var apnPanel = document.getElementById('carrier-' + usage + 'Settings');
    if (!apnPanel) {
      // unsupported APN type
      return;
    }

    var apnList = apnPanel.querySelector('.apnSettings-list');
    var advForm = apnPanel.querySelector('.apnSettings-advanced');
    var lastItem = apnList.querySelector('.apnSettings-custom');

    var kUsageMapping = {
      'data': 'default',
      'mms': 'mms',
      'supl': 'supl',
      'dun': 'dun',
      'ims': 'ims'
    };
    var currentType = kUsageMapping[usage];

    /* Keys for the APN properties in the UI elements */
    var UI_KEYS = [
      'hashCode',
      'carrier',
      'apn',
      'user',
      'passwd',
      'httpProxyHost',
      'httpProxyPort',
      'authType',
      'protocol',
      'roaming_protocol'
    ];

    /**
     * Helper function. Given a string, return a hash code.
     *
     * @param {String} s Given string.
     *
     * @return {Numeric} Hash code.
     */
    function _getHashCode(s) {
      return s.split('').reduce(
        function(a, b) {
          a = ((a << 5) - a) + b.charCodeAt(0);
          return a & a;
        }, 0);
    }

    /**
     * Helper function. Fill up APN form fields.
     *
     * @param {Object} item Object containing APN properties.
     */
    function fillApnForm(item) {
      cs_formInputElement(usage, 'hashCode').value = item.hashCode || '';
      cs_formInputElement(usage, 'carrier').value = item.carrier || '';
      cs_formInputElement(usage, 'apn').value = item.apn || '';
      cs_formInputElement(usage, 'user').value = item.user || '';
      cs_formInputElement(usage, 'passwd').value = item.password || '';
      cs_formInputElement(usage, 'httpProxyHost').value = item.proxy || '';
      cs_formInputElement(usage, 'httpProxyPort').value = item.port || '';
      if (usage == 'mms') {
        cs_formInputElement(usage, 'mmsc').value = item.mmsc || '';
        cs_formInputElement(usage, 'mmsproxy').value = item.mmsproxy || '';
        cs_formInputElement(usage, 'mmsport').value = item.mmsport || '';
      }
      cs_formInputElement(usage, 'authType').value =
        AUTH_TYPES[item.authtype] || 'notDefined';
      cs_formInputElement(usage, 'protocol').value =
        item.protocol || 'notDefined';
      cs_formInputElement(usage, 'roaming_protocol').value =
        item.roaming_protocol || 'notDefined';
    }

    /**
     * Create a button to apply <apn> data to the current fields.
     *
     */
    function createAPNItem(index, item) {
      // create an <input type="radio"> element
      var input = document.createElement('input');
      input.type = 'radio';
      input.name = currentType + 'Apn';
      var s = (item._id || item.carrier) + index;
      var hashCode = _getHashCode(s);
      input.value = hashCode;
      item.hashCode = hashCode;
      input.onclick = function onClickHandler() {
        fillApnForm(item);
        cs_switchRadioButtons(apnList, hashCode);
      };

      // include the radio button element in a list item
      var span = document.createElement('span');
      span.textContent = item.carrier;
      var label = document.createElement('label');
      label.classList.add('pack-radio');
      label.appendChild(input);
      label.appendChild(span);
      var li = document.createElement('li');
      li.appendChild(label);

      return li;
    }

    // empty the APN list
    while (lastItem.previousElementSibling) {
      apnList.removeChild(apnList.firstElementChild);
    }

    // fill the APN list
    for (var i = 0; i < apnItems.length; i++) {
      apnList.insertBefore(createAPNItem(i, apnItems[i]), lastItem);
    }

    // fill the APN form in case the user clicks on the 'custom' APN radio
    lastItem.querySelector('input').addEventListener('click',
      function() {
        fillCustomAPNSettingFields();
        cs_switchRadioButtons(apnList, '_custom_');
    });

    // set current APN to 'custom' on user modification and sanitize addresses
    advForm.onchange = function onCustomInput(event) {
      var addresskeys = ['mmsproxy', 'httpProxyHost'];
      addresskeys.forEach(function(addresskey) {
        if (event.target.dataset.setting ==
            'ril.' + usage + '.' + addresskey) {
          event.target.value = sanitizeAddress(event.target.value);
        }
      });

      storeCustomAPNSettingFields();
      cs_switchRadioButtons(apnList, '_custom_');
      fillCustomAPNSettingFields();
    };

    // maps for UI fields(current settings key) to new apn setting keys.
    var kKeyMappings = {
      'passwd': 'password',
      'httpProxyHost': 'proxy',
      'httpProxyPort': 'port',
      'authType': 'authtype'
    };

    /**
     * Helper function.
     */
    function fillCustomAPNSettingFields() {
      var keys = UI_KEYS.slice(0);
      var iccCardIndex = DsdsSettings.getIccCardIndexForCellAndDataSettings();
      if (usage === 'mms') {
        keys.push('mmsc', 'mmsproxy', 'mmsport');
      }

      keys.forEach(function(key) {
        asyncStorage.getItem(
          'ril.' + usage + '.custom.ICC' + iccCardIndex + key,
          function(value) {
            if (key === 'hashCode') {
              cs_formInputElement(usage, key).value = _getHashCode('_custom_');
            } else if (key === 'carrier') {
              cs_formInputElement(usage, key).value = '_custom_';
            } else if (key === 'authType' ||
                       key === 'protocol' ||
                       key === 'roaming_protocol') {
              cs_formInputElement(usage, key).value = value || 'notDefined';
            } else {
              cs_formInputElement(usage, key).value = value || '';
            }
        });
      });
    }

    /**
     * Helper function.
     */
    function storeCustomAPNSettingFields() {
      var keys = UI_KEYS.slice(0);
      var iccCardIndex = DsdsSettings.getIccCardIndexForCellAndDataSettings();
      if (usage === 'mms') {
        keys.push('mmsc', 'mmsproxy', 'mmsport');
      }

      keys.forEach(function(key) {
        asyncStorage.setItem(
          'ril.' + usage + '.custom.ICC' + iccCardIndex + key,
          cs_formInputElement(usage, key).value
        );
      });
    }

    /**
     * Helper function. Build the 'ril.data.apnSettings' to be passed to the
     * RIL plumbing for setting up the data call. It also stores the setting
     * into the settings database.
     *
     * @param {String} type APN type affected.
     * @param {Array} apns Array containing the APN for the ICC cards.
     * @param {Numeric} iccCardAffected Index of the ICC card affected. The one
     *                                  we are building the new APNs for.
     */
    function buildAndStoreApnSettings(type, apns, iccCardAffected) {
      var apnToBeMerged = {};
      var keys = UI_KEYS.slice(0);

      // Load the fields from the form into the apn to be merged.
      if (type === 'mms') {
        keys.push('mmsc', 'mmsproxy', 'mmsport');
      }
      keys.forEach(function(key) {
        apnToBeMerged[(kKeyMappings[key] || key)] =
          cs_formInputElement(usage, key).value;
      });

      var newApnsForIccCards = [[], []];
      for (var iccCardIndex = 0;
           iccCardIndex < apns.length;
           iccCardIndex++) {

        // We only update the APNs for the ICC card we are handling.
        if (iccCardIndex !== iccCardAffected) {
          newApnsForIccCards[iccCardIndex] = apns[iccCardIndex];
          continue;
        }

        // This is the APN element for the current ICC card, handle it.
        var apnTypeNotPresent = true;
        var newApnsForIccCard = [];
        var apnsForIccCard = apns[iccCardIndex];
        var apn = null;
        for (var j = 0; j < apnsForIccCard.length; j++) {
          apn = apnsForIccCard[j];
          if (apn.types.indexOf(type) !== -1) {
            apnTypeNotPresent = false;
            break;
          }
        }
        if (apnTypeNotPresent) {
          apnToBeMerged.types = [type];
          newApnsForIccCard.push(apnToBeMerged);
        }

        for (var apnIndex = 0; apnIndex < apnsForIccCard.length; apnIndex++) {
          apn = apnsForIccCard[apnIndex];
          // Search the existing APN for the type being modified.
          if (apn.types.indexOf(type) !== -1) {
            if (apn.types.length > 1) {
              // The existing APN being modified is also used for other types
              // of APNs. We need to keep the existing APN for those types.
              // Delete the type of APN that we are modifying from the
              // existing APN and create a new APN for the type we need to
              // modify and add it to the set of APNs for the ICC card.
              var tmpApn = JSON.parse(JSON.stringify(apn));
              tmpApn.types.splice(apn.types.indexOf(type), 1);
              newApnsForIccCard.push(tmpApn);
            }
            apnToBeMerged.types = [type];
            newApnsForIccCard.push(apnToBeMerged);
          } else {
            // The APN here is valid for other types, keep it.
            newApnsForIccCard.push(apn);
          }
        }

        newApnsForIccCards[iccCardIndex] = newApnsForIccCard;
      }

      _settings.createLock().set(
        {'ril.data.apnSettings': newApnsForIccCards}
      );
    }

    /**
     * Build and store the new value for the setting storing the APN settings.
     */
    function setApnSettings() {
      if (!currentType) {
        return;
      }
      var request = _settings.createLock().get('ril.data.apnSettings');
      request.onsuccess = function onSuccessHandler() {
        var currentApnSettings = request.result['ril.data.apnSettings'];
        var iccCardIndex = DsdsSettings.getIccCardIndexForCellAndDataSettings();
        buildAndStoreApnSettings(currentType,
                                 currentApnSettings,
                                 iccCardIndex);
      };
    }

    if (_settings) {
      // Select the APN relying on the APNs in 'ril.data.apnSettings' setting.
      var request = _settings.createLock().get('ril.data.apnSettings');
      request.onsuccess = function onSuccessHandler() {
        var apn = null;
        var iccCardIndex = DsdsSettings.getIccCardIndexForCellAndDataSettings();
        // The 'ril.data.apnSettings' setting must be an array of two elements
        // even for single ICC card devices. We add [[],[]] as default value.
        var apnSettingsList =
          request.result['ril.data.apnSettings'] || [[], []];
        for (var i = 0; i < apnSettingsList[iccCardIndex].length; i++) {
          apn = apnSettingsList[iccCardIndex][i];
          if (apn.types.indexOf(currentType) !== -1) {
            break;
          } else {
            apn = null;
          }
        }

        var apnSelected = false;
        var radioApnItems = apnList.querySelectorAll('input[type="radio"]');
        for (var j = 0; (j < radioApnItems.length) && apn; j++) {
          var s = (apn._id || apn.carrier) + j;
          var hashCode = apn.hashCode || _getHashCode(s);
          if (radioApnItems[j].value == hashCode) {
            apn.hashCode = apn.hashCode || hashCode;
            fillApnForm(apn);
            cs_switchRadioButtons(apnList, hashCode);
            apnSelected = true;
            break;
          }
        }

        if (!apnSelected) {
          fillCustomAPNSettingFields();
          cs_switchRadioButtons(apnList, '_custom_');
        }

        if (callback && (typeof callback === 'function')) {
          callback();
        }
      };
    }

    /**
     * Restart data connection by toggling it off and on again.
     */
    function restartDataConnection() {
      _restartingDataConnection = true;
      var key = 'ril.data.enabled';
      function setDataState(state) {
        var cset = {};
        cset[key] = state;
        _settings.createLock().set(cset);
      }

      var request = _settings.createLock().get(key);
      request.onsuccess = function() {
        if (request.result[key]) {
          // Turn data off.
          setDataState(false);
          // Turn data back on in 2.5s.
          setTimeout(function() {
            _restartingDataConnection = false;
            setDataState(true);
          }, 2500);
        }
      };
    }

    /**
     * Store the APN settings and restart the data call if needed.
     */
    function onSubmit() {
      setApnSettings();
      setTimeout(function() {
        cs_getDefaultServiceIdForData(
          function getDefaultServiceIdForDataCb(defaultServiceId) {
            var currentServiceId =
              DsdsSettings.getIccCardIndexForCellAndDataSettings();

            var restart = (defaultServiceId === currentServiceId);
            if (!restart) {
              return;
            }
            restartDataConnection();
        });
      });
    }

    if (!_onSubmitEventListenerAdded[usage]) {
      // Add the event handler. We might force data connection to restart if
      // changes are validated
      var submitButton = apnPanel.querySelector('button[type=submit]');
      if (!submitButton) {
        return;
      }
      submitButton.addEventListener('click', onSubmit);
      _onSubmitEventListenerAdded[usage] = true;
    }
  } // cs_updateApnList function

  return {
    init: cs_init,
    switchRadioButtons: cs_switchRadioButtons,
    updateApnList: cs_updateApnList
  };
})(this, document);

CarrierSettings.init();
