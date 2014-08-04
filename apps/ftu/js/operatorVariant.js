/* global IccHelper */
/* exported OperatorVariant */
'use strict';

var OperatorVariant = (function() {

  var NO_SIM = '000-000';

/**
  * If ftu.simPresentOnFirstBoot setting has value do nothing otherwise
  * set ftu.simPresentOnFirstBoot = true if
  * IccHelper.cardState value is:
  *   'ready'.
  * otherwise set to false.
  *   'pinRequired',
  *   'pukRequired',
  *   'networkLocked',
  *   'corporateLocked',
  *   'serviceProviderLocked',
  *   'network1Locked',
  *   'network2Locked',
  *   'hrpdNetworkLocked',
  *   'ruimCorporateLocked',
  *   'ruimServiceProviderLocked'
  */
  function setSIMOnFirstBootState() {
    var cardValue;

    function normalizeCode(aCode) {
      var ncode = '' + aCode;
      while (ncode.length < 3) {
        ncode = '0' + ncode;
      }
      return ncode;
    }

    try {
      if (!IccHelper || !IccHelper.cardState) {
        cardValue = NO_SIM;
      } else {
        var mcc = IccHelper.iccInfo.mcc;
        var mnc = IccHelper.iccInfo.mnc;
        if ((mcc !== undefined) && (mcc !== null) &&
            (mnc !== undefined) && (mnc !== null)) {
          cardValue = normalizeCode(mcc) + '-' + normalizeCode(mnc);
        } else {
          cardValue = NO_SIM;
        }
      }

      var settings = navigator.mozSettings;
      if (!settings) {
        console.log('Settings is not available');
        return;
      }

      var req = settings.createLock().get('ftu.simPresentOnFirstBoot');

      req.onsuccess = function ov_onsuccess() {
        var currentStatus = req.result['ftu.simPresentOnFirstBoot'];
        if (currentStatus === undefined || currentStatus === null) {
          var result = navigator.mozSettings.createLock().set(
            { 'ftu.simPresentOnFirstBoot' : cardValue });

          result.onerror = function ov_error() {
              console.error('An error occurre setting ' +
                            'ftu.simPresentOnFirstBoot: ' + cardValue);
          };
        }
        cardValue = null;
      };

      req.onerror = function ov_error() {
        console.error('Error retrieving ftu.simPresentOnFirstBoot');
      };

    } catch (e) {
      console.error('Error setSIMOnFirstBootState. ' + e);
    }
  }

  return {
    setSIMOnFirstBootState: setSIMOnFirstBootState
  };
})();
