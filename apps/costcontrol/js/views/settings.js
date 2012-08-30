/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Settings view is in charge of display and allow user interaction to 
// changing the application customization.
var VIEW_SETTINGS = 'settings-view';
Views[VIEW_SETTINGS] = (function cc_setUpDataSettings() {

  var DIALOG_PLAN_SETUP = 'plantype-setup-dialog';

  function _configurePlanTypeSetup() {
    // Get the widget
    var planSetup = document.getElementById('settings-view-plantype-setup');

    // Configure to enter the dialog with options
    planSetup.addEventListener('click', function cc_onclickPlanSetup() {
      settingsVManager.changeViewTo(DIALOG_PLAN_SETUP);
    });

    // Configure an observer to detect when the plantype setting change
    CostControl.settings.observe(
      'plantype',
      function ccapp_onPlanTypeChange(value) {
        _updateUI();
        // TODO: Shutdown credit, show telephony
      }
    );

    // When accepting the dialog to select plan type, sets the proper value
    var okButton = document.querySelector('#plantype-setup-dialog button');
    okButton.addEventListener('click', function cc_onclickOk() {
      var selected = document
        .querySelector('#plantype-setup-dialog [type="radio"]:checked');

      CostControl.settings.option('plantype', selected.value);
    });
  }

  // Configure each settings' control and paint the interface
  function _init() {
    _configurePlanTypeSetup();
    _updateUI();
  }

  // Repaint settings interface reading from local settings
  function _updateUI() {
    var query, value;

    // Plantype
    query = '#plantype-setup-dialog [type="radio"][value="&value"]';
    value = CostControl.settings.option('plantype');
    query = query.replace('&value', value !== null ? value : 'prepaid');
    document.querySelector(query).setAttribute('checked', 'checked');
    document.querySelector('#settings-view-plantype-setup .tag')
      .textContent = _(value);
  }

  return {
    init: _init,
    updateUI: _updateUI
  };

}());
