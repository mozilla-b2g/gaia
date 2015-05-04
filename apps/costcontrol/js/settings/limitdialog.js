/* global _, addNetworkUsageAlarm, Common, Formatting, SimManager */
/* exported dataLimitConfigurer */
'use strict';

function dataLimitConfigurer(guiWidget, settings, viewManager, widgetRoot) {
  var REMOVE_CHAR_CODE = 8,
      // It Represents any positive real number (up to three digits length),
      // with optional decimal point, accepting up to 2 decimal places.  It is
      // not necessary adding the significant number when it is zero (eg. '.5'
      // is a valid entry)
      DATA_LIMIT_NUMERIC_FORMAT = new RegExp('^[0-9]{0,3}(\\.[0-9]{1,2})?$');


  var dialog = document.getElementById('data-limit-dialog');
  var dataLimitInput = dialog.querySelector('input');
  var format = function ccal_formatterDataUnit(value) {
    var unit = settings.option('dataLimitUnit');
    return Formatting.formatData([value, _(unit)]);
  };

  window.addEventListener('localized', function _onLocalize() {
    var tagSpan = guiWidget.querySelector('.tag');
    tagSpan.textContent = format(dataLimitInput.value);
  });

  // Configure dialog
  var okButton = dialog.querySelector('button.recommend');
  if (okButton) {
    okButton.addEventListener('click', function ccld_onDialogOk() {
      var value = parseFloat(dataLimitInput.value);
      settings.option('dataLimitValue', value);
      settings.option('dataLimitUnit', currentUnit);
      var dataLimit = Common.getDataLimit({'dataLimitValue': value,
                                           'dataLimitUnit': currentUnit});
      SimManager.requestDataSimIcc(function(dataSim) {
        addNetworkUsageAlarm(Common.getDataSIMInterface(dataSim.iccId),
                             dataLimit);
      });
      viewManager.closeCurrentView();
    });
  }

  var dialogHeader = dialog.querySelector('#limit-dialog-header');
  if (dialogHeader) {
    dialogHeader.addEventListener('action',
      function ccld_onDialogCancel() {
        var oldValue = settings.option('dataLimitValue');
        var oldUnit = settings.option('dataLimitUnit');
        currentUnit = oldUnit;
        settings.option('dataLimitValue', oldValue);
        settings.option('dataLimitUnit', oldUnit);
        dataLimitInput.classList.remove('error');
        okButton.disabled = false;
        viewManager.closeCurrentView();
      }
    );
  }

  function isNotRemovingChar(newChar) {
    return REMOVE_CHAR_CODE !== newChar;
  }

  function isAllowedValue(newValue) {
     return isValidValue(newValue) || wouldBeValid(newValue);
  }
  // Checks if value is numeric and it has a valid format
  // Not allowed entry characters '-', ',' or more than one '.'
  function isValidValue(newValue) {
    var containsNonValidCharacters = [',','-']
      .some(c => newValue.indexOf(c) > -1);
    var containsMoreThanOneDot = (newValue.match(/\./g) || []).length > 1;
    return !Number.isNaN(newValue) &&
           !containsNonValidCharacters && !containsMoreThanOneDot &&
           isValidFormat(newValue);
  }

  function wouldBeValid(lowLimitValue) {
    var allowedEntry = new RegExp('^0?(\\.0?)?$');
    return allowedEntry.test(lowLimitValue);
  }

  function preventBadInput(valid, newChar, currentInput) {
    // This method returns the string resultant of adding the character of the
    // keypress event
    function simulateNewValue(newChar, currentInput) {
      var value = currentInput.value,
          idx = currentInput.selectionStart,
          newCharValue = String.fromCharCode(newChar);
      return value.substr(0, idx) + newCharValue + value.substr(idx);
    }
    var newValue = simulateNewValue(newChar, currentInput);
    var isInvalid = !valid(newValue);
    return isInvalid;
  }

  dataLimitInput.addEventListener('keypress',
    function cc_onKeypress(event) {
      var currentInput =  event.target;
      var newChar = event.charCode || event.keyCode;

      // If the entry is not valid or the result of the input is invalid, we
      // have to prevent the event propagation
      if (isNotRemovingChar(newChar) &&
          preventBadInput(isAllowedValue, newChar, currentInput)) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
  );

  function isValidFormat(lowLimitValue) {
    var numberDataLimit = Number(lowLimitValue);
    return (numberDataLimit < 1000 &&
            numberDataLimit > 0 &&
            DATA_LIMIT_NUMERIC_FORMAT.test(numberDataLimit));
  }

  // Disable OK button when dataLimitInput not matches any positive real number
  // (up to three digits length), with optional decimal point, accepting up
  // to 2 decimal places.
  dataLimitInput.addEventListener('input',
    function cc_ondataLimitInputChange(evt) {
      var lowLimitValue = evt.target.value.trim();
      var isNumericLowLimit = !Number.isNaN(Number(lowLimitValue));

      if (isNumericLowLimit &&
          lowLimitValue.indexOf('.0') !== lowLimitValue.length - 2 &&
          lowLimitValue.indexOf('.') !== lowLimitValue.length - 1) {
        dataLimitInput.value = Number(lowLimitValue);
      }

      var isValidValue = (isNumericLowLimit && isValidFormat(lowLimitValue));

      if (isValidValue) {
        dataLimitInput.classList.remove('error');
      } else {
        dataLimitInput.classList.add('error');
      }
      okButton.disabled = (!isValidValue);
    }
  );

  // Configure the swicth unit button
  var currentUnit = settings.option('dataLimitUnit');
  var switchUnitButton = dialog.querySelector('.switch-unit-button');
  function localizeSwitchUnitButton(unit) {
    switchUnitButton.setAttribute('data-l10n-id', 'unit-' + unit);
    switchUnitButton.querySelector('span.tag').setAttribute(
      'data-l10n-id', unit);
  }

  localizeSwitchUnitButton(currentUnit);
  switchUnitButton.addEventListener('click',
    function ccapp_switchUnit() {
      currentUnit = (currentUnit === 'MB') ? 'GB' : 'MB';
      localizeSwitchUnitButton(currentUnit);
    }
  );

  // Prevent to loose the focus when tapping on switch unit button
  // TODO: Replace with 'focusout' on dataLimitInput when fixing bug:
  // https://bugzilla.mozilla.org/show_bug.cgi?id=687787
  switchUnitButton.addEventListener('mousedown',
    function _preventFocusLost(evt) {
      evt.preventDefault();
    }
  );

  // Keep the widget and the dialog synchronized
  settings.observe('dataLimitValue',
    function ccld_onValueChange(value) {
      // Use default value if no value
      if (value === null || typeof value === 'undefined') {
        value = settings.defaultValue('dataLimitValue');
      }

      // Set dialog
      dataLimitInput.value = value;

      var tagSpan = guiWidget.querySelector('.tag');
      tagSpan.textContent = format(dataLimitInput.value);
    }
  );

  settings.observe('dataLimitUnit',
    function ccld_onUnitChange(value) {

      // Use default value if no value
      if (value === null || typeof value === 'undefined') {
        value = settings.defaultValue('dataLimitUnit');
      }

      // Set dialog
      localizeSwitchUnitButton(value);

      var tagSpan = guiWidget.querySelector('.tag');
      tagSpan.textContent = format(dataLimitInput.value);
    }
  );

  // Show the dialog
  var oldUnitValue;
  guiWidget.addEventListener('click', function ccld_onWidgetClick() {
    viewManager.changeViewTo(dialog.id, widgetRoot);
    dataLimitInput.focus();
    dataLimitInput.setSelectionRange(dataLimitInput.value.length,
                                     dataLimitInput.value.length);
    oldUnitValue = settings.option('dataLimitUnit');
    localizeSwitchUnitButton(oldUnitValue);
  });

}
