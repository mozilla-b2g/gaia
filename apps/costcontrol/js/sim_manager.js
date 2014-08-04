/* global SettingsListener */
/* exported SimManager */

'use strict';

var SimManager = (function() {
  /*jshint validthis: true */
  var serviceIcc = {};

  var serviceSettingMap = {
    'data' : 'ril.data.defaultServiceId',
    'telephony' : 'ril.telephony.defaultServiceId',
    'message' : 'ril.sms.defaultServiceId'
  };

  function notifyInitializationDone(updatedService) {
    var simInitializedEvent = new CustomEvent('simManagerReady', {
      detail: updatedService
    });
    window.dispatchEvent(simInitializedEvent);
  }

  function _init(serviceId) {

    _reset(serviceId);

    function checkForCompletion() {
      serviceIcc[serviceId].initialized = true;
      // Putting a listener to mark the dirty value when a change is detected.
      SettingsListener.observe(serviceSettingMap[serviceId], 0,
        function(value) {
          var isDirty = (serviceIcc[serviceId].slotId !== value);
          serviceIcc[serviceId].dirty = isDirty;
          serviceIcc[serviceId].slotId = value;
          if (isDirty) {
            var serviceSlotChangeEvent =
              new CustomEvent(serviceId + 'SlotChange', { detail: serviceId });
            window.dispatchEvent(serviceSlotChangeEvent);
          }
        }
      );
      notifyInitializationDone(serviceId);
    }

    if (SimManager.isMultiSim()) {
      var settings = window.navigator.mozSettings;
      var req = settings &&
                settings.createLock().get(serviceSettingMap[serviceId]);

      req.onsuccess = function _onsuccesSlotId() {
        if (!req.result[serviceSettingMap[serviceId]]) {
          console.warn('The setting ' + serviceSettingMap[serviceId] +
                       ' does not exists, using default Slot (0)');
        }
        var slotId = req.result[serviceSettingMap[serviceId]] || 0;
        serviceIcc[serviceId].slotId = slotId;
        checkForCompletion();
      };
      req.onerror = function _onErrorSlotId() {
        console.warn('The setting ' + serviceSettingMap[serviceId] +
                     ' does not exists');
        checkForCompletion();
      };
    } else {
      notifyInitializationDone(serviceId);
    }
  }

  function _requestDataSIMIcc(onsuccess, onerror) {
    _requestService('data', onsuccess, onerror);
  }

  function _requestTelephonySIMIcc(onsuccess, onerror) {
    _requestService('telephony', onsuccess, onerror);
  }

  function _requestMessageSIMIcc(onsuccess, onerror) {
    _requestService('message', onsuccess, onerror);
  }

  function _requestService(serviceId, onsuccess, onerror) {
    if (serviceIcc[serviceId] && serviceIcc[serviceId].initialized &&
        !serviceIcc[serviceId].dirty) {
      (typeof onsuccess === 'function') && onsuccess(serviceIcc[serviceId]);
    } else if (!serviceIcc[serviceId] || !serviceIcc[serviceId].initialized) {
      console.warn('SimManager is not ready, waiting for initialized custom ' +
                     'event');
      window.addEventListener('simManagerReady', function _onSMInit(evt) {
        if (evt.detail === 'all' || evt.detail === serviceId) {
          window.removeEventListener('simManagerReady', _onSMInit);
          _requestServiceSIMIcc(serviceId, onsuccess, onerror);
        }
      });
      _init(serviceId);
    } else {
      _requestServiceSIMIcc(serviceId, onsuccess, onerror);
    }
  }

  function _requestServiceSIMIcc(serviceId, onsuccess, onerror) {
    var iccManager = window.navigator.mozIccManager;
    var slotId = serviceIcc[serviceId].slotId;
    var mobileConnection = navigator.mozMobileConnections[slotId];
    var iccId = mobileConnection.iccId || null;

    if (!iccId) {
      console.error('The slot ' + slotId + ', configured as the ' + serviceId +
                    ' slot, is empty');
      (typeof onerror === 'function') && onerror();
      return;
    }
    serviceIcc[serviceId].iccId = iccId;
    serviceIcc[serviceId].icc = iccManager.getIccById(iccId);

    // Icc is not detected although iccId exists
    if (!serviceIcc[serviceId].icc) {
      (typeof onerror === 'function') && onerror();
      return;
    }

    (typeof onsuccess === 'function') && onsuccess(serviceIcc[serviceId]);
  }

  function _reset(serviceId) {
    function _resetService(serviceId) {
      // If it is not a DSDS device, the slotId is correct
      var _initialized = !SimManager.isMultiSim();
      serviceIcc[serviceId] = {
        dirty : true,
        icc : null,
        iccId : null,
        // The default value for slotId is 0  on the no DSDS device
        slotId: 0,
        initialized: _initialized
      };
    }
    if (!serviceId) {
      Object.keys(serviceSettingMap).forEach(function _initService(serviceId) {
        _resetService(serviceId);
      });
    } else {
      _resetService(serviceId);
    }
  }

  function _requestServiceConnection(serviceId) {
    var slotId = serviceIcc[serviceId].slotId;
    return navigator.mozMobileConnections[slotId];
  }

  function _requestDataConnection(callback) {
    if (serviceIcc.data && serviceIcc.data.initialized) {
      var connection = _requestServiceConnection('data');
      (typeof callback === 'function') && callback(connection);
    } else {
      console.warn('SimManager is not ready, waiting for initialized custom ' +
                     'event');
      window.addEventListener('simManagerReady', function _onSMInit(evt) {
        if (evt.detail === 'all' || evt.detail === 'data') {
          window.removeEventListener('simManagerReady', _onSMInit);
          var connection = _requestServiceConnection('data');
          (typeof callback === 'function') && callback(connection);
        }
      });
      _init('data');
    }
  }
  return {
    isMultiSim: function() {
      // On a multisim device, the mozMobileConnections array always return
      // the number of slots although these slots are empty.
      return (navigator.mozMobileConnections.length > 1);
    },
    // data info
    requestDataSimIcc: _requestDataSIMIcc,
    // telephony info
    requestTelephonySimIcc: _requestTelephonySIMIcc,
    requestDataConnection: _requestDataConnection,
    // message info
    requestMessageSimIcc: _requestMessageSIMIcc,
    reset: _reset
  };
})();

