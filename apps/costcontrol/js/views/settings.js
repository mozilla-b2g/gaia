/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// Retrieve service
var Service = getService(function ccapp_onServiceReady(evt) {
  // If the service is not ready, when ready it sets the Service object
  // again and setup the application.
  Service = evt.detail.service;
  setupSettings();
});
if (Service)
  setupSettings();

// Settings view is in charge of display and allow user interaction to
// changing the application customization.
function setupSettings() {

  var DEFAULTS = {
    'plantype': 'prepaid',
    'tracking_period': 'never',
    'reset_time': 1,
    'lowlimit': true,
    'lowlimit_threshold': 5
  };

  var viewManager = new ViewManager();

  function _getEntryParent(item) {
    var current = item;
    while (current && current.tagName !== 'LI')
      current = current.parentNode;

    return current;
  }

  function _getDefaultValue(optionKey) {
    var defaultValue = DEFAULTS[optionKey];
    if (typeof defaultValue === 'function')
      defaultValue = defaultValue(Service.settings);
    return defaultValue;
  }

  var CONFIGURE_WIDGET = {
    'select': function ccapp_configureSelectWidget(guiWidget) {

      var dialog = document.getElementById(guiWidget.dataset.selectdialog);
      var optionKey = guiWidget.dataset.option;
      var disableOn = guiWidget.dataset.disableon;

      // Configure dialog
      var okButton = dialog.querySelector('button.affirmative');
      if (okButton) {
        okButton.addEventListener('click', function ccapp_onDialogOk() {
          var checked = dialog.querySelector('input[type="radio"]:checked');
          Service.settings.option(optionKey, checked.value);
          viewManager.closeCurrentView();
        });
      }

      var cancelButton = dialog.querySelector('button.cancel');
      if (cancelButton) {
        cancelButton.addEventListener('click',
          function ccapp_onDialogCancel() {
            var currentValue = Service.settings.option(optionKey);
            Service.settings.option(optionKey, currentValue);
            viewManager.closeCurrentView();
          }
        );
      }

      // Show the dialog
      guiWidget.addEventListener('click', function ccapp_onWidgetClick() {
        viewManager.changeViewTo(dialog.id);
      });

      // Keep the widget and the dialog synchronized
      Service.settings.observe(optionKey,
        function ccapp_onOptionChange(value) {

          // Use default value if no value
          if (value === null || typeof value === 'undefined')
            value = _getDefaultValue(optionKey);

          var radio =
            dialog.querySelector('input[type="radio"][value="' + value + '"]');

          if (!radio) {
            value = _getDefaultValue(optionKey);
            radio = dialog.querySelector('input[type="radio"][value="' +
                                         value + '"]');
          }
          radio.checked = true;

          var textSpan = dialog.querySelector('input:checked + span');
          var tagSpan = guiWidget.querySelector('.tag');
          tagSpan.textContent = textSpan.textContent;
        }
      );

      // Keep the UI localized
      window.addEventListener('localized', function ccapp_onLocalized() {
        var textSpan = dialog.querySelector('input:checked + span');
        var tagSpan = guiWidget.querySelector('.tag');
        tagSpan.textContent = textSpan.textContent;
      });

    },

    'switch' : function ccapp_configureSwitch(guiWidget) {
      var optionKey = guiWidget.dataset.option;

      // Add an observer to keep synchronization
      Service.settings.observe(
        optionKey,
        function ccapp_onOptionChange(value) {

          // Use default value if no value
          if (value === null || typeof value === 'undefined')
            value = _getDefaultValue(optionKey);

          guiWidget.checked = value;
        }
      );

      // Add an event listener to switch the option
      guiWidget.addEventListener('click', function ccapp_onSwitchChange() {
        Service.settings.option(optionKey, guiWidget.checked);
      });
    },

    'input' : function ccapp_configureInput(guiWidget) {
      var optionKey = guiWidget.dataset.option;

      // Add an observer to keep synchronization
      Service.settings.observe(
        optionKey,
        function ccapp_onOptionChange(value) {

          // Use default value if no value
          if (value === null || typeof value === 'undefined')
            value = _getDefaultValue(optionKey);

          guiWidget.value = value;
        }
      );

      // Add an event listener to switch the option
      guiWidget.addEventListener('change', function ccapp_onSwitchChange() {
        Service.settings.option(optionKey, guiWidget.value);
      });
    }
  };

  function _configureGUIWidgets() {

    function getWidgetType(widget) {
      if (typeof widget.dataset.selectdialog !== 'undefined')
        return 'select';

      if (widget.type === 'checkbox')
        return 'switch';

      if (['text', 'number'].indexOf(widget.type) !== -1)
        return 'input';
    }

    // Widgets
    var allGUIWidgets = document.querySelectorAll('.localsetting');
    [].forEach.call(allGUIWidgets, function ccapp_eachWidget(guiWidget) {

      var type = getWidgetType(guiWidget);
      CONFIGURE_WIDGET[type](guiWidget);

      // Simple dependency resolution: enable / disable some options depending
      // on the values of other
      var disableOn = guiWidget.dataset.disableon;
      if (disableOn) {
        var not = true;
        var parsed = disableOn.split('!=');
        if (parsed.length === 1) {
          parsed = disableOn.split('=');
          not = false;
        }

        var dependency = parsed[0];
        var disablingValue = parsed[1];
        Service.settings.observe(
          dependency,
          function ccapp_disableOnDependency(value) {
            var entry = _getEntryParent(guiWidget);
            var test = (('' + value) === disablingValue);
            if (not)
              test = !test;
            guiWidget.disabled = test;
            if (entry)
              entry.setAttribute('aria-disabled', test + '');
          }
        );
      }

    });
  }

  function _setBalanceView(balanceObj) {
    balanceObj = balanceObj || Service.getLastBalance();
    var settingsCurrency = document.getElementById('settings-currency');
    var settingsCredit = document.getElementById('settings-credit');
    var settingsTime = document.getElementById('settings-time');
    var settingsLowLimitCurrency =
      document.getElementById('settings-low-limit-currency');

    if (balanceObj) {
      settingsCurrency.textContent = balanceObj.currency;
      settingsLowLimitCurrency.textContent = balanceObj.currency;
      settingsCredit.textContent = formatBalance(balanceObj.balance);
      settingsTime.textContent = formatTime(balanceObj.timestamp);
    } else {
      settingsCurrency.textContent = '';
      settingsLowLimitCurrency.textContent = '';
      settingsCredit.textContent = '--';
      settingsTime.textContent = _('never');
    }
  }

  // Reset the balance view and attach a listener to keep the UI updated
  // when updating the balance.
  function _configureBalanceView() {
    _setBalanceView();
    Service.setBalanceCallbacks({
      onsuccess: function ccapp_onBalanceSuccess(evt) {
        var balance = evt.detail;
        _setBalanceView(balance);
      }
    });
  }

  function _configureUI() {
    _configureGUIWidgets();
    _configureBalanceView();
  }

  // Configure each settings' control and paint the interface
  function _init() {
    _configureUI();

    // Close settings
    var close = document.getElementById('close-settings');
    close.addEventListener('click', function ccapp_closeSettings() {
      parent.settingsVManager.closeCurrentView();
    });

    // Localize interface
    window.addEventListener('localized', _localize);
  }

  // Repaint settings interface reading from local settings and localizing
  function _updateUI() {
    _setBalanceView();
  }

  // Updates the UI to match the localization
  function _localize() {
    _updateUI();
  }

  _init();

}
