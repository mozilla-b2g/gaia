/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var AutoSettings = (function() {

  var OPTION_CONFIGURERS = {
    'select': function _selectConfigurer(guiWidget) {
      var optionName = guiWidget.dataset.option;
      var span, parent = guiWidget.parentElement;
      if (parent.classList.contains('fake-select')) {
        var firstChild = parent.firstChild;
        if (!firstChild || firstChild.tagName !== 'SPAN') {
          span = document.createElement('span');
          parent.insertBefore(span, parent.firstChild);
        }
      }
      guiWidget.addEventListener('change', function _onSelectChange() {
        debug('Value:', guiWidget.value);
        settings.option(optionName, guiWidget.value);
      });
      settings.observe(optionName, function _onOptionChange(value) {
        if (value === undefined) {
          value = settings.defaultValue(optionName);
        }
        guiWidget.value = value;
        if (span) {
          var selected = guiWidget.options[guiWidget.selectedIndex];
          var l10nId = selected.getAttribute('data-l10n-id');
          span.textContent = selected.textContent;
          if (l10nId) {
            span.setAttribute('data-l10n-id', l10nId);
          }
        }
      });
    },
    // Select is used to simulate custom combo boxes. It displays a selection
    // dialog with an ok button and possibly a cancel button. The value is only
    // changed if ok button is pressed. If cancel provided and clicked then
    // the former value is restored.
    'customselect': function _customselectConfigurer(guiWidget) {

      var dialog = document.getElementById(guiWidget.dataset.selectdialog);
      var optionName = guiWidget.dataset.option;

      // Dialog

      var okButton = dialog.querySelector('button.recommend');
      if (okButton) {
        okButton.addEventListener('click', function _onDialogOk() {
          var checked = dialog.querySelector('input[type="radio"]:checked');
          settings.option(optionName, checked.value);
          vmanager.closeCurrentView();
        });
      }

      var cancelButton = dialog.querySelector('button.cancel');
      if (cancelButton) {
        cancelButton.addEventListener('click',
          function _onDialogCancel() {
            var currentValue = settings.option(optionName);
            settings.option(optionName, currentValue);
            vmanager.closeCurrentView();
          }
        );
      }

      guiWidget.addEventListener('click', function _onWidgetClick() {
        vmanager.changeViewTo(dialog.id);
      });

      // Keep the widget and the dialog synchronized
      settings.observe(optionName,
        function _onOptionChange(value) {

          // Use default value if no value
          if (value === null || value === undefined) {
            value = getDefaultValue(optionName);
          }

          var radio =
            dialog.querySelector('input[type="radio"][value="' + value + '"]');

          if (!radio) {
            value = getDefaultValue(optionName);
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
      window.addEventListener('localized', function _onLocalized() {
        var textSpan = dialog.querySelector('input:checked + span');
        var tagSpan = guiWidget.querySelector('.tag');
        tagSpan.textContent = textSpan.textContent;
      });

    },

    // Switch configurer handles an checkbox. When it changes, the checked
    // state is used as the content for the option.
    'switch' : function _switchConfigurer(guiWidget) {
      var optionName = guiWidget.dataset.option;

      // Add an observer to keep synchronization
      settings.observe(
        optionName,
        function _onOptionChange(value) {
          if (value === null || value === undefined) {
            value = getDefaultValue(optionName);
          }
          guiWidget.checked = value;
        }
      );

      // Add an event listener to switch the option
      guiWidget.addEventListener('click', function ccapp_onSwitchChange() {
        settings.option(optionName, guiWidget.checked);
      });
    },

    // Input configurer handles an input box. When the content changes, the
    // content is parsed and sent to the proper option.
    'input' : function _inputConfigurer(guiWidget) {
      var optionName = guiWidget.dataset.option;

      // Add an observer to keep synchronization
      settings.observe(
        optionName,
        function _onOptionChange(value) {
          if (value === null || value === undefined) {
            value = getDefaultValue(optionName);
          }
          guiWidget.value = value;
        }
      );

      // Add an event listener to switch the option
      guiWidget.addEventListener('change', function _onContentChange() {
        var value = guiWidget.value;
        if (guiWidget.type === 'number') {
          value = parseFloat(value);
        }
        settings.option(optionName, value);
      });
    }
  };

  // Add a new type with its configuration function
  function addType(newType, configFunction) {
    OPTION_CONFIGURERS[newType] = configFunction;
  }

  var customRecognizer;
  // Add a recognizer to detect new types
  function setCustomRecognizer(recognizer) {
    customRecognizer = recognizer;
  }

  // Return the <li> wrapping the option
  function getEntryParent(item) {
    while (item && item.tagName !== 'LI')
      item = item.parentNode;
    return item;
  }

  // Return the default value for an option
  function getDefaultValue(optionName) {
    return settings.defaultValue(optionName);
  }

  // Configure the web page
  var settings, vmanager;
  function initialize(settingsInterface, viewManager, root) {
    var that = this;

    root = root || 'body';
    settings = settingsInterface;
    vmanager = viewManager;

    // Return the type of configurer needed based on the properties of
    // the HTML element marked as the option.
    function getWidgetType(widget) {
      if (widget.dataset.widgetType) {
        return widget.dataset.widgetType;
      }

      var customType;
      if (customRecognizer === 'function') {
        customType = customRecognizer(widget, settings, vmanager);
      }

      if (customType) {
        return customType;
      }

      if (widget.tagName === 'SELECT') {
        return 'select';
      }

      if (typeof widget.dataset.selectdialog !== 'undefined') {
        return 'customselect';
      }

      if (widget.type === 'checkbox') {
        return 'switch';
      }

      if (['text', 'number'].indexOf(widget.type) !== -1) {
        return 'input';
      }
    }

    // Install a dependency based on an expression. When expression is true
    // call the callback.
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
    var allGUIWidgets = document.querySelectorAll(root + ' .settings-option');
    [].forEach.call(allGUIWidgets, function _forEachWidget(guiWidget) {

      var type = getWidgetType(guiWidget);
      var entry = getEntryParent(guiWidget);
      var configurer = OPTION_CONFIGURERS[type];
      if (configurer) {
        configurer(guiWidget, settings, vmanager);
      }

      // Simple dependency resolution:

      // enable / disable some options depending on the values of other
      var disableOn = guiWidget.dataset.disableOn;
      if (disableOn) {
        installDependency(disableOn, function _disable(passed) {
          guiWidget.disabled = passed;
          if (entry) {
            entry.setAttribute('aria-disabled', passed + '');
          }
        });
      }

      // hide / show some options depending on the values of other
      var hideOn = guiWidget.dataset.hideOn;
      if (hideOn) {
        installDependency(hideOn, function _hide(passed) {
          guiWidget.setAttribute('aria-hidden', passed + '');
          if (entry) {
            entry.setAttribute('aria-hidden', passed + '');
          }
        });
      }

    });
  }

  return {
    initialize: initialize,
    setCustomRecognizer: setCustomRecognizer,
    addType: addType
  };

}());
