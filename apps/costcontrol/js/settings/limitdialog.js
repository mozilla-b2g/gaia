
'use strict';

function dataLimitConfigurer(guiWidget, settings, viewManager) {

  var dialog = document.getElementById('data-limit-dialog');
  var switchUnitButton = document.getElementById('switch-unit-button');
  var dataLimitInput = dialog.querySelector('input');
  var format = function ccal_formatterDataUnit(value) {
    var unit = settings.option('dataLimitUnit');
    return formatData([value, _(unit)]);
  };

  // Configure dialog
  var okButton = dialog.querySelector('button.recommend');
  if (okButton) {
    okButton.addEventListener('click', function ccld_onDialogOk() {
      var value = parseFloat(dataLimitInput.value);
      settings.option('dataLimitValue', value);
      settings.option('dataLimitUnit', currentUnit);
      viewManager.closeCurrentView();
    });
  }

  var cancelButton = dialog.querySelector('a.cancel');
  if (cancelButton) {
    cancelButton.addEventListener('click',
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

  // Disable OK button when dataLimitInput not matches any positive real number
  // (up to three digits length), with optional decimal point, accepting up
  // to 2 decimal places.
  dataLimitInput.addEventListener('input',
    function cc_ondataLimitInputChange(evt) {
      var limitRegexp = new RegExp('^[0-9]{1,3}(\\.[0-9]{1,2})?$');
      okButton.disabled = (!limitRegexp.test(evt.target.value.trim()));
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
