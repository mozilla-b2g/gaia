/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var DsdsSettings = (function(window, document, undefined) {
  var _settings = window.navigator.mozSettings;
  var _iccManager = window.navigator.mozIccManager;
  var _mobileConnections = null;

  /** */
  var _iccCardIndexForCallSettings = 0;

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
    ds_handleCallSettingSimPanel();
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
  function ds_getIccCardIndexForCallSettings() {
    return _iccCardIndexForCallSettings;
  }

  /**
   *
   */
  function ds_setIccCardIndexForCallSettings(
    iccCardIndexForCallSettings) {
    _iccCardIndexForCallSettings = iccCardIndexForCallSettings;
  }

  /**
   * Hide or show the call settings panel in which we show the ICC cards.
   */
  function ds_handleCallSettingSimPanel() {
    var callItem = null;

    if (ds_getNumberOfIccSlots() > 1) {
      callItem = document.getElementById('menuItem-callSettings');
      callItem.setAttribute('href', '#call-iccs');
      if ((_mobileConnections[0].radioState !== 'enabled') ||
          (!_mobileConnections[0].iccId &&
           !_mobileConnections[1].iccId)) {
        return;
      }
      callItem = document.getElementById('call-settings');
      callItem.removeAttribute('aria-disabled');
    }
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
      if ((_mobileConnections[0].radioState !== 'enabled') ||
          (!_mobileConnections[0].iccId &&
           !_mobileConnections[1].iccId)) {
        return;
      }
      cellAndDataItem = document.getElementById('data-connectivity');
      cellAndDataItem.removeAttribute('aria-disabled');
    }
  }

  // Public API.
  return {
    init: ds_init,
    getNumberOfIccSlots: ds_getNumberOfIccSlots,
    getIccCardIndexForCallSettings:
      ds_getIccCardIndexForCallSettings,
    setIccCardIndexForCallSettings:
      ds_setIccCardIndexForCallSettings,
    getIccCardIndexForCellAndDataSettings:
      ds_getIccCardIndexForCellAndDataSettings,
    setIccCardIndexForCellAndDataSettings:
      ds_setIccCardIndexForCellAndDataSettings
  };
})(this, document);
