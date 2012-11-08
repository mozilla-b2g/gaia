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

var viewManager = new ViewManager();

// Settings view is in charge of display and allow user interaction to
// changing the application customization.
function setupSettings() {

  function _getEntryParent(item) {
    var current = item;
    while (current && current.tagName !== 'LI')
      current = current.parentNode;

    return current;
  }

  function _getDefaultValue(optionKey) {
    return Service.settings.defaultValue(optionKey);
  }

  var FORMATTERS = {
    'id': function ccapp_formatterId(value) {
      return value;
    },

    'dataUnit': function ccapp_formatterDataUnit(value) {
      var unit = Service.settings.option('data_limit_unit');
      return value + ' ' + unit;
    }
  };

  function _getFormatter(name) {
    var formatter = FORMATTERS[name];
    if (!formatter)
      return FORMATTERS.id;

    return formatter;
  }

  var CONFIGURE_WIDGET = {
    'select': function ccapp_configureSelectWidget(guiWidget) {

      var dialog = document.getElementById(guiWidget.dataset.selectdialog);
      var optionKey = guiWidget.dataset.option;
      var format = _getFormatter(guiWidget.dataset.formatter);

      // Configure dialog
      var okButton = dialog.querySelector('button.recommend');
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
          tagSpan.textContent = format(textSpan.textContent);
        }
      );

      // Keep the UI localized
      window.addEventListener('localized', function ccapp_onLocalized() {
        var textSpan = dialog.querySelector('input:checked + span');
        var tagSpan = guiWidget.querySelector('.tag');
        tagSpan.textContent = format(textSpan.textContent);
      });

    },

    'complexinput' : function ccapp_configureComplexInput(guiWidget) {

      var dialog = document.getElementById(guiWidget.dataset.inputdialog);
      var input = dialog.querySelector('input');
      var optionKey = guiWidget.dataset.option;
      var format = _getFormatter(guiWidget.dataset.formatter);

      // Configure dialog
      var okButton = dialog.querySelector('button.recommend');
      if (okButton) {
        okButton.addEventListener('click', function ccapp_onDialogOk() {
          var value = input.value;
          if (input.type === 'number')
            value = parseFloat(value);
          Service.settings.option(optionKey, value);
          viewManager.closeCurrentView();
        });
      }

      var cancelButton = dialog.querySelector('a.cancel');
      if (cancelButton) {
        cancelButton.addEventListener('click',
          function ccapp_onDialogCancel() {
            var currentValue = Service.settings.option(optionKey);
            Service.settings.option(optionKey, currentValue);
            viewManager.closeCurrentView();
          }
        );
      }

      // Keep the widget and the dialog synchronized
      Service.settings.observe(optionKey,
        function ccapp_onOptionChange(value) {

          // Use default value if no value
          if (value === null || typeof value === 'undefined')
            value = _getDefaultValue(optionKey);

          // Set dialog
          input.value = value;

          var tagSpan = guiWidget.querySelector('.tag');
          tagSpan.textContent = format(input.value);
        }
      );

      // Show the dialog
      guiWidget.addEventListener('click', function ccapp_onWidgetClick() {
        viewManager.changeViewTo(dialog.id);
        input.focus();
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
        var value = guiWidget.value;
        if (guiWidget.type === 'number')
          value = parseFloat(value);
        Service.settings.option(optionKey, value);
      });
    }
  };

  function _configureGUIWidgets() {

    function getWidgetType(widget) {
      if (typeof widget.dataset.inputdialog !== 'undefined')
        return 'complexinput';

      if (typeof widget.dataset.selectdialog !== 'undefined')
        return 'select';

      if (widget.type === 'checkbox')
        return 'switch';

      if (['text', 'number'].indexOf(widget.type) !== -1)
        return 'input';
    }

    function installDependency(expression, callback) {
      var equality = false;
      var parsed = expression.split('!=');
      if (parsed.length === 1) {
        parsed = expression.split('=');
        equality = true;
      }

      var dependency = parsed[0];
      var referenceValue = parsed[1];
      Service.settings.observe(dependency,
        function ccapp_dependencyAction(value) {
          var test = (('' + value) === referenceValue);
          callback(equality === test); // or is an equality test and values are
                                       // equal or is an inequality test and
                                       // values are different.
        }
      );
    }

    // Widgets
    var allGUIWidgets = document.querySelectorAll('.localsetting');
    [].forEach.call(allGUIWidgets, function ccapp_eachWidget(guiWidget) {

      var type = getWidgetType(guiWidget);
      var entry = _getEntryParent(guiWidget);
      CONFIGURE_WIDGET[type](guiWidget);

      // Simple dependency resolution:

      // enable / disable some options depending on the values of other
      var disableOn = guiWidget.dataset.disableOn;
      if (disableOn) {
        installDependency(disableOn, function ccapp_toDisable(passed) {
          guiWidget.disabled = passed;
          if (entry)
            entry.setAttribute('aria-disabled', passed + '');
        });
      }

      // hide / show some options depending on the values of other
      var hideOn = guiWidget.dataset.hideOn;
      if (hideOn) {
        installDependency(hideOn, function ccapp_toHide(passed) {
          guiWidget.setAttribute('aria-hidden', passed + '');
          if (entry)
            entry.setAttribute('aria-hidden', passed + '');
        });
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

  // Shows the reset confirmation
  function _showResetConfirmation(callback) {
    var dialogId = 'reset-confirmation-dialog';
    var dialog = document.getElementById(dialogId);
    viewManager.changeViewTo(dialogId);

    var cancel = dialog.querySelector('button.close-dialog');
    cancel.addEventListener('click', function ccapp_cancelConfimation() {
      viewManager.closeCurrentView();
    });

    var confirm = dialog.querySelector('button.danger');
    confirm.addEventListener('click', function ccapp_onConfirm(evt) {
      viewManager.closeCurrentView();
      callback(evt);
    });
  }

  // Read telephony information
  function _setTelephonyView() {
    function toMinutes(milliseconds) {
      return Math.ceil(milliseconds / (1000 * 60));
    }

    // Dates
    var formattedTime = _('never');
    var lastReset = Service.settings.option('lastreset');
    if (lastReset !== null)
      formattedTime = (new Date(lastReset))
                      .toLocaleFormat(_('short-date-format'));
    document.getElementById('telephony-from-date').textContent = formattedTime;

    var now = new Date();
    document.getElementById('telephony-to-date').textContent =
      _('today') + ', ' + now.toLocaleFormat('%H:%M');

    // Counters
    document.getElementById('calltime').textContent =
      toMinutes(Service.settings.option('calltime'));
    document.getElementById('smscount').textContent =
      Service.settings.option('smscount');
  }

  // Attach listener to keep telephony information updated
  function _configureTelephonyView() {
    Service.settings.observe('calltime', _setTelephonyView);
    Service.settings.observe('smscount', _setTelephonyView);
    document.getElementById('reset-telephony').addEventListener('click',
      function ccapp_resetTelephony() {
        _showResetConfirmation(Service.resetTelephony);
      }
    );
  }

  // Read data-usage information
  function _setDataUsageView() {
    // Dates
    var formattedTime = _('never');
    var lastReset = Service.settings.option('lastdatareset');
    if (lastReset !== null)
      formattedTime = (new Date(lastReset))
                      .toLocaleFormat(_('short-date-format'));
    document.getElementById('data-usage-from-date').textContent = formattedTime;

    var now = new Date();
    document.getElementById('data-usage-to-date').textContent =
      _('today') + ', ' + now.toLocaleFormat('%H:%M');

    // Mobile data
    var mobileData = 0;
    var dataUsage = Service.settings.option('lastdatausage');
    if (dataUsage)
      mobileData = dataUsage.mobile.total;
    document.getElementById('mobile-data-usage').textContent =
      roundData(mobileData).join(' ');
  }

  // Attach listener to keep data usage information updated
  function _configureDataUsageView() {
    Service.settings.observe('lastdatausage', _setDataUsageView);
    Service.settings.observe('lastdatareset', _setDataUsageView);
    document.getElementById('reset-data-usage').addEventListener('click',
      function ccapp_resetDataUsage() {
        _showResetConfirmation(Service.resetDataUsage);
      }
    );
  }

  // Configures the switch button
  function _configureDataLimitDialog() {
    var switchUnitButton = document.getElementById('switch-unit-button');
    var input = document.getElementById('data-limit-input');
    var unit = Service.settings.option('data_limit_unit');
    switchUnitButton.querySelector('span.tag').textContent = unit;

    switchUnitButton.addEventListener('click',
      function ccapp_switchUnit() {
        var unit = Service.settings.option('data_limit_unit');
        if (unit === 'MB')
          unit = 'GB';
        else
          unit = 'MB';
        var value = input.value ? parseFloat(input.value) : null;
        Service.settings.option('data_limit_unit', unit);
        Service.settings.option('data_limit_value', value);
        switchUnitButton.querySelector('span.tag').textContent = unit;
      }
    );
  }

  function _configureUI() {
    _configureGUIWidgets();
    _configureBalanceView();
    _configureTelephonyView();
    _configureDataUsageView();

    // Extra setup for this component
    _configureDataLimitDialog();
  }

  // Adapt the layout depending plantype
  function _changeLayout(planType) {
    function setSectionHeaderVisibility(sectionId, visibility) {
      var header = document.getElementById(sectionId);
      header.setAttribute('aria-hidden', !visibility + '');
    }

    function setSectionVisibility(sectionId, visibility) {
      setSectionHeaderVisibility(sectionId, visibility);
      var entries = document.querySelector('#' + sectionId + ' + ul');
      entries.setAttribute('aria-hidden', !visibility + '');
    }

    function moveResetEntriesTo(sectionId) {
      var entries = document.querySelectorAll('.reset-entry');
      var ul = document.querySelector('#' + sectionId + ' + ul');
      [].forEach.call(entries, function ccapp_appendResetEntry(entry) {
        ul.appendChild(entry);
      });
    }

    var status = Service.getServiceStatus();
    var plantype = document.getElementById('plantype-settings');

    // Only data layout
    if (!status.enabledFunctionalities.balance &&
        !status.enabledFunctionalities.telephony) {

      plantype.setAttribute('aria-hidden', 'true');
      setSectionVisibility('phone-activity-settings', false);
      setSectionVisibility('balance-settings', false);
      setSectionVisibility('data-usage-settings', true);
      setSectionHeaderVisibility('data-usage-settings', false);
      setSectionVisibility('phone-internet-settings', false);
      moveResetEntriesTo('data-usage-settings');

    // Prepaid layout
    } else if (planType === Service.PLAN_PREPAID) {

      plantype.setAttribute('aria-hidden', 'false');
      setSectionVisibility('phone-activity-settings', false);
      setSectionVisibility('balance-settings', true);
      setSectionVisibility('data-usage-settings', true);
      setSectionVisibility('phone-internet-settings', false);
      moveResetEntriesTo('data-usage-settings');

    // Postpaid layout
    } else if (planType === Service.PLAN_POSTPAID) {

      plantype.setAttribute('aria-hidden', 'false');
      setSectionVisibility('phone-activity-settings', true);
      setSectionVisibility('balance-settings', false);
      setSectionVisibility('data-usage-settings', true);
      setSectionVisibility('phone-internet-settings', true);
      moveResetEntriesTo('phone-internet-settings');
    }
  }

  // Configure each settings' control and paint the interface
  function _init() {
    _configureUI();

    // Change layout depending on plantype
    Service.settings.observe('plantype', _changeLayout);

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
    _setTelephonyView();
  }

  // Updates the UI to match the localization
  function _localize() {
    _updateUI();
  }

  _init();

}
