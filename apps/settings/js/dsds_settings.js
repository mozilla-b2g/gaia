/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var DsdsSettings = (function(window, document, undefined) {
  var _settings = window.navigator.mozSettings;
  var _iccManager = window.navigator.mozIccManager;
  var _mobileConnections = null;

  /** */
  var _iccCardIndexForCellAndDataSettings = 0;

  /**
   * Init function.
   */
  function ds_init() {
    _mobileConnections = window.navigator.mozMobileConnections;
    if (!_settings || !_mobileConnections || !_iccManager) {
      return;
    }
    ds_handleCellAndDataSettingSimPanel();
  }

  /**
   * Get number of ICC slots.
   *
   * @return {Numeric} Number of ICC slots.
   */
  function ds_getNumberOfIccSlots() {
    return _mobileConnections.length;
  }

  /**
   *
   */
  function ds_getIccCardIndexForCellAndDataSettings() {
    return _iccCardIndexForCellAndDataSettings;
  }

  /**
   *
   */
  function ds_setIccCardIndexForCellAndDataSettings(
    iccCardIndexForCellAndDataSettings) {
    _iccCardIndexForCellAndDataSettings = iccCardIndexForCellAndDataSettings;
  }

  /**
   * Hide or show the cell and data settings panel in which we show the ICC
   * cards.
   */
  function ds_handleCellAndDataSettingSimPanel() {
    var cellAndDataItem = null;

    if (ds_getNumberOfIccSlots() > 1) {
      cellAndDataItem = document.getElementById('menuItem-cellularAndData');
      cellAndDataItem.setAttribute('href', '#carrier-iccs');
      cellAndDataItem = document.getElementById('data-connectivity');
      cellAndDataItem.removeAttribute('aria-disabled');
    }
  }

  // Public API.
  return {
    init: ds_init,
    getNumberOfIccSlots: ds_getNumberOfIccSlots,
    getIccCardIndexForCellAndDataSettings:
      ds_getIccCardIndexForCellAndDataSettings,
    setIccCardIndexForCellAndDataSettings:
      ds_setIccCardIndexForCellAndDataSettings
  };
})(this, document);

/**
 * Startup.
 */
navigator.mozL10n.ready(function loadWhenIdle() {
  var idleObserver = {
    time: 3,
    onidle: function() {
      DsdsSettings.init();
      navigator.removeIdleObserver(idleObserver);
    }
  };
  navigator.addIdleObserver(idleObserver);
});
