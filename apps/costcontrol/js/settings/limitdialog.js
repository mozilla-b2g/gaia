/* global _, addNetworkUsageAlarm, Common, Formatting, SimManager */
/* exported dataLimitConfigurer */
'use strict';

function dataLimitConfigurer(guiWidget, settings, viewManager) {
  var MINUS_CHAR_CODE = 45,
      COMMA_CHAR_CODE = 44,
      DOT_CHAR_CODE = 46;

  var dialog = document.getElementById('data-limit-dialog');
  var dataLimitInput = dialog.querySelector('input');
  var format = function ccal_formatterDataUnit(value) {
    var unit = settings.option('dataLimitUnit');
    return Formatting.formatData([value, _(unit)]);
  };

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
        viewManager.closeCurrentView();
      }
    );
  }

  // Prevent undesired characters like '-'
  dataLimitInput.addEventListener('keypress',
    function cc_onKeypress(event) {
      if ((event.charCode === MINUS_CHAR_CODE) ||
          (event.charCode === COMMA_CHAR_CODE) ||
          (event.charCode === DOT_CHAR_CODE &&
           event.target.value.indexOf('.') !== -1)) {

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
            Number.isInteger(numberDataLimit * 100));
  }
  // Disable OK button when dataLimitInput not matches any positive real number
  // (up to three digits length), with optional decimal point, accepting up
  // to 2 decimal places.
  dataLimitInput.addEventListener('input',
    function cc_ondataLimitInputChange(evt) {
      var lowLimitValue = evt.target.value.trim();
      var isNumericLowLimit = !Number.isNaN(lowLimitValue);

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
  switchUnitButton.querySelector('span.tag').textContent = _(currentUnit);
  switchUnitButton.addEventListener('click',
    function ccapp_switchUnit() {
      currentUnit = (currentUnit === 'MB') ? 'GB' : 'MB';
      switchUnitButton.querySelector('span.tag').textContent = _(currentUnit);
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
      switchUnitButton.querySelector('span.tag').textContent = _(value);

      var tagSpan = guiWidget.querySelector('.tag');
      tagSpan.textContent = format(dataLimitInput.value);
    }
  );

  // Show the dialog
  var oldUnitValue;
  guiWidget.addEventListener('click', function ccld_onWidgetClick() {
    viewManager.changeViewTo(dialog.id);
    dataLimitInput.focus();
    dataLimitInput.setSelectionRange(dataLimitInput.value.length,
                                     dataLimitInput.value.length);
    oldUnitValue = settings.option('dataLimitUnit');
    switchUnitButton.querySelector('span.tag').textContent = _(oldUnitValue);
  });

}
