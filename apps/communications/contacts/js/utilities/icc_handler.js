//
// IccManager Handler, abstract the new IccManager Multi SIM
// API.
// Generates code and handles listener for multiple SIMs
//
'use strict';

var IccHandler = function IccHandler() {

  var iccManager = null;
  var isSingleSIMApi = false;
  var iccs = {};
  var sims = [];
  var mobileConnections = null;

  var init = function init(domGenerator, cb) {
    iccManager = navigator.mozIccManager;
    mobileConnections = navigator.mozMobileConnections || [];
    isSingleSIMApi = typeof iccManager.getIccById !== 'function';

    if (isSingleSIMApi) {
      iccs['default'] = iccManager;
    } else {
      iccManager.iccIds.forEach(function(iccId) {
        iccs[iccId] = iccManager.getIccById(iccId);
      });
      for (var i = 0; i < mobileConnections.length; i++) {
        sims[i] = iccs[mobileConnections[i].iccId] || null;
      }

    }

    domGenerator.setIccList(sims);
    domGenerator.generateDOM();

    subscribeToChanges(cb);
  };

  // Make all the SIMS to listen to the same change observer
  var subscribeToChanges = function subscribeToChanges(cb) {
    if (!navigator.mozIccManager) {
      return;
    }

    Object.keys(iccs).forEach(function onIccId(iccId) {
      var icc = iccs[iccId];
      if (icc !== null) {
        icc.oncardstatechange = cb;
      }
    });
  };

  // Get the status of all the SIMs, not just the status, also
  // the proper icc object
  var getStatus = function getStatus() {
    var status = [];
    Object.keys(iccs).forEach(function onIccId(iccId) {
      var icc = iccs[iccId];
      status.push({
        'iccId': iccId,
        'icc': icc,
        'cardState': icc.cardState
      });
    });

    return status;
  };

  // Returns the specific icc depending on id.
  // If id is null will try to get the one named 'default'
  var getIccById = function getIccById(id) {
    if (!id) {
      id = 'default';
    }

    return iccs[id];
  };


  return {
    'getStatus': getStatus,
    'getIccById': getIccById,
    'init': init
  };

}();
