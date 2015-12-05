/* global DsdsSettings, IccHandlerForCarrierSettings,
          LazyLoader, IccHandlerForCarrierSettings */
'use strict';

/**
 * Singleton object that handles some cell and data settings.
 */
var CarrierSettings = (function() {
  var DATA_KEY = 'ril.data.enabled';
  var DATA_ROAMING_KEY = 'ril.data.roaming_enabled';

  var _settings;
  var _mobileConnections;
  var _iccManager;

  /** mozMobileConnection instance the panel settings rely on */
  var _mobileConnection = null;
  /** Flag */
  var _restartingDataConnection = false;

  var _elements = {
    detailHeader:
      document.querySelector('#carrier-detail gaia-header h1'),
    carrierInfo:
      document.querySelector('#carrier .carrier-info'),
    advancedSettings:
      document.querySelector('#carrier .carrier-advancedSettings'),
    advancedSettingsList:
      document.querySelectorAll('#carrier .carrier-advancedSettings li'),
    simSettings:
      document.querySelector('#carrier .carrier-simSettings'),
    dataToggle:
      document.querySelector('#menuItem-enableDataCall gaia-switch'),
    dataRoamingToggle:
      document.querySelector('#menuItem-enableDataRoaming gaia-switch'),
    desc:
      document.getElementById('dataNetwork-desc')
  };

  /**
   * Init function.
   */
  function cs_init() {
    _settings = window.navigator.mozSettings;
    _mobileConnections = window.navigator.mozMobileConnections;
    _iccManager = window.navigator.mozIccManager;
    if (!_settings || !_mobileConnections || !_iccManager) {
      return;
    }

    // Get the mozMobileConnection instace for this ICC card.
    _mobileConnection = _mobileConnections[
      DsdsSettings.getIccCardIndexForCellAndDataSettings()
    ];
    if (!_mobileConnection) {
      return;
    }

    // Show carrier name.
    cs_showCarrierName();

    // Set the navigation correctly when on a multi ICC card device.
    cs_initIccsUI();

    cs_initDataToggles();

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
        // Show carrier name.
        cs_showCarrierName();
        return;
      } else if (currentHash === '#carrier-detail') {
        document.l10n.setAttributes(
          _elements.detailHeader,
          'simSettingsWithIndex',
          { index: DsdsSettings.getIccCardIndexForCellAndDataSettings() + 1 });
      }

      if (!currentHash.startsWith('#carrier-')) {
        return;
      }
    });
  }

  function cs_initIccsUI() {
    var isMultiSim = DsdsSettings.getNumberOfIccSlots() > 1;
    if (isMultiSim) {
      LazyLoader.load([
        '/js/carrier_iccs.js'
      ], function() {
        IccHandlerForCarrierSettings.init();
      });
    }
    _elements.carrierInfo.hidden = isMultiSim;
    _elements.advancedSettings.hidden = isMultiSim;
    _elements.simSettings.hidden = !isMultiSim;
  }

  function cs_initDataToggles() {
    function updateDataRoamingToggle(dataEnabled) {
      if (dataEnabled) {
        _elements.dataRoamingToggle.disabled = false;
      } else {
        _elements.dataRoamingToggle.disabled = true;
        _elements.dataRoamingToggle.checked = false;
        _elements.dataRoamingToggle.dispatchEvent(new Event('change'));
      }
    }

    function getDataEnabled() {
      return new Promise(function(resolve, reject) {
        var transaction = _settings.createLock();
        var req = transaction.get(DATA_KEY);
        req.onsuccess = function() {
          resolve(req.result[DATA_KEY]);
        };
        req.onerror = function() {
          resolve(false);
        };
      });
    }

    var isSimCardInserted = Array.prototype.some.call(
      navigator.mozMobileConnections,
      function(connection) {
        return connection.iccId;
      }
    );
    if (!isSimCardInserted) {
      _elements.dataToggle.disabled = true;
      _elements.dataRoamingToggle.disabled = true;
      Array.prototype.forEach.call(_elements.advancedSettingsList,
        (element) => {
          element.setAttribute('aria-disabled', true);
        }
      );
    }

    getDataEnabled().then(function(dataEnabled) {
      dataEnabled = isSimCardInserted && dataEnabled;
      updateDataRoamingToggle(dataEnabled);
    });
    // We need to disable data roaming when data connection is disabled.
    _settings.addObserver(DATA_KEY, function observerCb(event) {
      _elements.dataToggle.checked = event.settingValue;
      if (_restartingDataConnection) {
        return;
      }
      updateDataRoamingToggle(event.settingValue);
    });

    // Init warnings the user sees before enabling data calls and roaming.
    // The function also registers handlers for the changes of the toggles.
    cs_initWarning(DATA_KEY,
                   _elements.dataToggle,
                   isSimCardInserted,
                   'dataConnection-warning-head',
                   'dataConnection-warning-message');
    cs_initWarning(DATA_ROAMING_KEY,
                   _elements.dataRoamingToggle,
                   isSimCardInserted,
                   'dataRoaming-warning-head',
                   'dataRoaming-warning-message');
  }

  /**
   * Show the carrier name in the ICC card.
   */
  function cs_showCarrierName() {
    if (DsdsSettings.getNumberOfIccSlots() > 1) {
      // We don't do anything here when the device support dsds.
      return;
    }
    var iccCard = _iccManager.getIccById(_mobileConnection.iccId);
    var network = _mobileConnection.voice.network;
    var iccInfo = iccCard && iccCard.iccInfo;
    var carrier = network ? (network.shortName || network.longName) : null;

    if (carrier && iccInfo && iccInfo.isDisplaySpnRequired && iccInfo.spn) {
      if (iccInfo.isDisplayNetworkNameRequired && carrier !== iccInfo.spn) {
        carrier = carrier + ' ' + iccInfo.spn;
      } else {
        carrier = iccInfo.spn;
      }
    }
    if (iccCard) {
      _elements.desc.textContent = carrier;
    } else {
      _elements.desc.setAttribute('data-l10n-id', 'noSimCard');
    }
  }

  /**
   * Init a warning dialog.
   *
   * @param {String} settingKey The key of the setting.
   * @param {Object} input The input element.
   * @param {Boolean} isSimCardInserted
   * True if there is a SIM card inserted, otherwise.
   * @param {String} l10n id of the title.
   * @param {String} l10n id of the message.
   */
  function cs_initWarning(settingKey,
                          input,
                          isSimCardInserted,
                          titleL10nId,
                          messageL10nId) {
    var warningDialogEnabledKey = settingKey + '.warningDialog.enabled';

    /**
     * Figure out whether the warning is enabled or not.
     *
     * @param {Function} callback Callback function to be called once the
     *                            work is done.
     */
    function getWarningEnabled(callback) {
      var request = _settings.createLock().get(warningDialogEnabledKey);

      request.onsuccess = function onSuccessHandler() {
        var warningEnabled = request.result[warningDialogEnabledKey];
        if (warningEnabled === null) {
          warningEnabled = true;
        }
        if (callback) {
          callback(warningEnabled);
        }
      };
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

    function getState(callback) {
      var request = _settings.createLock().get(settingKey);
      request.onsuccess = function onSuccessHandler() {
        if (callback) {
          callback(request.result[settingKey]);
        }
      };
    }

    function setWarningDialogState(state) {
      var cset = {};
      cset[warningDialogEnabledKey] = !!state;
      _settings.createLock().set(cset);
    }

    /**
     * Helper function. Handler to be called once the user click on the
     * accept button form the warning dialog.
     */
    function onSubmit() {
      setWarningDialogState(false);
      setState(true);
      input.checked = true;
    }

    /**
     * Helper function. Handler to be called once the user click on the
     * cancel button form the warning dialog.
     */
    function onReset() {
      setWarningDialogState(true);
      setState(false);
      input.checked = false;
    }

    // Initialize the state of the input.
    getState(function(enabled) {
      input.checked = isSimCardInserted && enabled;

        // Register an observer to monitor setting changes.
      input.addEventListener('change', function() {
        var enabled = this.checked;
        getWarningEnabled(function getWarningEnabledCb(warningEnabled) {
          if (warningEnabled) {
            if (enabled) {
              require(['modules/dialog_service'], function(DialogService) {
                DialogService.confirm(messageL10nId, {
                  title: titleL10nId,
                  submitButton: 'turnOn',
                  cancelButton: 'notNow'
                }).then(function(result) {
                  var type = result.type;
                  if (type === 'submit') {
                    onSubmit();
                  } else {
                    onReset();
                  }
                });
              });
            }
          } else {
            setState(enabled);
          }
        });
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
            setWarningDialogState(false);
          }
        };
      }
    });
  }

  return {
    init: cs_init
  };
})();

CarrierSettings.init();
