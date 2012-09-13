/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Retrieve CostControl service
var CostControl = getService(function ccapp_onServiceReady(evt) {
  // If the service is not ready, when ready it sets the CostControl object
  // again and setup the application.
  CostControl = evt.detail.service;
  setupSettings();
});
if (CostControl)
  setupSettings();

// Settings view is in charge of display and allow user interaction to
// changing the application customization.
function setupSettings() { 

  var viewManager = new ViewManager();
 
  function _configureUI() {
    function getEntryParent(item) {
      var current = item;
      while (current && current.tagName !== 'LI')
        current = current.parentNode;

      return current;
    }

    var allGUIWidgets = document.querySelectorAll('.localsetting');
    [].forEach.call(allGUIWidgets, function ccapp_eachWidget(guiWidget) {
      var dialog = document.getElementById(guiWidget.dataset.selectdialog);
      var optionKey = guiWidget.dataset.option;
      var disableOn = guiWidget.dataset.disableon;

      // Configure dialog
      var okButton = dialog.querySelector('button.affirmative');
      if (okButton) {
        okButton.addEventListener('click', function ccapp_onDialogOk() {
          var checked = dialog.querySelector('input[type="radio"]:checked');
          CostControl.settings.option(optionKey, checked.value);
          viewManager.closeCurrentView();
        });
      }

      var cancelButton = dialog.querySelector('button.cancel');
      if (cancelButton) {
        cancelButton.addEventListener(
          'click',
          function ccapp_onDialogCancel() {
            var currentValue = CostControl.settings.option(optionKey);
            CostControl.settings.option(optionKey, currentValue);
            viewManager.closeCurrentView();
          }
        );
      }

      // Show the dialog
      guiWidget.addEventListener('click', function ccapp_onWidgetClick() {
        viewManager.changeViewTo(dialog.id);
      });

      // Keep the widget and the dialog synchronized
      CostControl.settings.observe(
        optionKey,
        function ccapp_onOptionChange (value) {
          value = value || optionDefaults[optionKey];
          var radio =
            dialog.querySelector('input[type="radio"][value="' + value + '"]');
          console.log('input[type="radio"][value="' + value + '"]');
          radio.checked = true;

          var textSpan = dialog.querySelector('input:checked + span');
          var tagSpan = guiWidget.querySelector('.tag');
          tagSpan.textContent = textSpan.textContent;
        }
      );

      // Simple dependency resolution: enable / disable some options depending
      // on the values of other
      if (disableOn) {
        var parsed = disableOn.split('=');
        var dependency = parsed[0];
        var disablingValue = parsed[1];
        CostControl.settings.observe(
          dependency,
          function ccapp_disableOnDependency (value) {
            var entry = getEntryParent(guiWidget);
            var test = (value == disablingValue);
            guiWidget.disabled = test;
            if (entry)
              entry.setAttribute('aria-disabled', test + '');
          }
        );
      }

    });

  }

  // Configure each settings' control and paint the interface
  function _init() {
    _configureUI();
  }

  // Repaint settings interface reading from local settings and localizing
  function _updateUI() {

  }

  // Updates the UI to match the localization
  function _localize() {
    _updateUI();
  }

  _init();

};
