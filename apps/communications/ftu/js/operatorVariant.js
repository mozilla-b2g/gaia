'use strict';

var OperatorVariant = (function() {
  function setIsSIMPresentOnFirstBoot(value) {
    var result = navigator.mozSettings.createLock().set(
      { 'ftu.simPresentOnFirstBoot' : value });

    result.onerror = function ov_error() {
      console.error('An error occurre setting ftu.simPresentOnFirstBoot: ' +
                    value);
    };
  };

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
  */
  function setSIMOnFirstBootState() {
    var cardState;

    try {
      if (!IccHelper || !IccHelper.cardState) {
        cardState = undefined;
      } else {
        cardState = IccHelper.cardState;
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
          setIsSIMPresentOnFirstBoot(cardState === 'ready');
        }
        cardState = null;
      };

      req.onerror = function ov_error() {
        console.error('Error retrieving ftu.simPresentOnFirstBoot');
      };

    } catch (e) {
      console.error('Error setSIMOnFirstBootState. ' + e);
    }
  };

  return {
    setSIMOnFirstBootState: setSIMOnFirstBootState
  };
})();
