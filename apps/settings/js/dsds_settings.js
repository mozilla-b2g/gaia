/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var DsdsSettings = (function() {
  var _settings = window.navigator.mozSettings;
  var _mobileConnections = null;
  if (window.navigator.mozMobileConnections) {
    _mobileConnections = window.navigator.mozMobileConnections;
  }
  /** */
  var _iccCardIndexForCallSettings = 0;

  /** */
  var _iccCardIndexForCellAndDataSettings = 0;

  /**
   * Init function.
   */
  function ds_init() {
    if (!_settings || !_mobileConnections) {
      return;
    }
    ds_handleDefaultIccCard();
    ds_handleCellAndDataSettingSimPanel();
  }

  /**
   * Get number of ICC slots.
   *
   * @return {Numeric} Number of ICC slots.
   */
  function ds_getNumberOfIccSlots() {
    if (_mobileConnections) {
      return _mobileConnections.length;
    }
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
   *
   */
  function ds_getIccCardIndexForCellAndDataSettings() {
    return _iccCardIndexForCellAndDataSettings;
  }

  /**
   * Find out first available iccID for default iccID
   */
  function ds_handleDefaultIccCard() {
    for (var i = 0, len = _mobileConnections.length; i < len; i++) {
      if (_mobileConnections[i].iccId !== null) {
        ds_setIccCardIndexForCellAndDataSettings(i);
        break;
      }
    }
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
})();
