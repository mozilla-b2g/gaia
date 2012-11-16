/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function AutoSettings(settings, viewManager) {

  function _getEntryParent(item) {
    var current = item;
    while (current && current.tagName !== 'LI')
      current = current.parentNode;

    return current;
  }

  function _getDefaultValue(optionKey) {
    return settings.defaultValue(optionKey);
  }

  var FORMATTERS = {
    'id': function ccapp_formatterId(value) {
      return value;
    },

    'dataUnit': function ccapp_formatterDataUnit(value) {
      var unit = settings.option('data_limit_unit');
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
          settings.option(optionKey, checked.value);
          viewManager.closeCurrentView();
        });
      }

      var cancelButton = dialog.querySelector('button.cancel');
      if (cancelButton) {
        cancelButton.addEventListener('click',
          function ccapp_onDialogCancel() {
            var currentValue = settings.option(optionKey);
            settings.option(optionKey, currentValue);
            viewManager.closeCurrentView();
          }
        );
      }

      // Show the dialog
      guiWidget.addEventListener('click', function ccapp_onWidgetClick() {
        viewManager.changeViewTo(dialog.id);
      });

      // Keep the widget and the dialog synchronized
      settings.observe(optionKey,
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
          settings.option(optionKey, value);
          viewManager.closeCurrentView();
        });
      }

      input.addEventListener('input', function ccas_onEmptyInput() {
        okButton.disabled = (input.value.trim() === '');
      });

      var cancelButton = dialog.querySelector('a.cancel');
      if (cancelButton) {
        cancelButton.addEventListener('click',
          function ccapp_onDialogCancel() {
            var currentValue = settings.option(optionKey);
            settings.option(optionKey, currentValue);
            viewManager.closeCurrentView();
          }
        );
      }

      // Keep the widget and the dialog synchronized
      settings.observe(optionKey,
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
      settings.observe(
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
        settings.option(optionKey, guiWidget.checked);
      });
    },

    'input' : function ccapp_configureInput(guiWidget) {
      var optionKey = guiWidget.dataset.option;

      // Add an observer to keep synchronization
      settings.observe(
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
        settings.option(optionKey, value);
      });
    }
  };

  function _configureGUIWidgets() {
    var that = this;

    function getWidgetType(widget) {
      var customType = that.customRecognizer;
      if (typeof customType === 'function')
        customType = customType(widget, settings, viewManager);

      if (customType)
        return customType;

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
      settings.observe(dependency,
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
      CONFIGURE_WIDGET[type](guiWidget, settings, viewManager);

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

  return {
    customRecognizer: undefined,
    addType: function as_addType(name, configFunction) {
      CONFIGURE_WIDGET[name] = configFunction;
    },
    configure: _configureGUIWidgets
  };

}
