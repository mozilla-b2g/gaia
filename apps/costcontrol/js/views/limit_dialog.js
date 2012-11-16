
'use strict';

function dataLimitRecognizer(widget) {
  if (widget.classList.contains('set-data-limit'))
    return 'data-limit';

  return null;
}

function dataLimitConfigurer(guiWidget, settings, viewManager) {

  var dialog = document.getElementById('data-limit-dialog');
  var switchUnitButton = document.getElementById('switch-unit-button');
  var dataLimitInput = dialog.querySelector('input');
  var format = function ccal_formatterDataUnit(value) {
    var unit = settings.option('data_limit_unit');
    return formatData([value, unit]);
  };

  // Configure dialog
  var okButton = dialog.querySelector('button.recommend');
  if (okButton) {
    okButton.addEventListener('click', function ccld_onDialogOk() {
      var value = parseFloat(dataLimitInput.value);
      settings.option('data_limit_value', value);
      settings.option('data_limit_unit', currentUnit);
      viewManager.closeCurrentView();
    });
  }

  var cancelButton = dialog.querySelector('a.cancel');
  if (cancelButton) {
    cancelButton.addEventListener('click',
      function ccld_onDialogCancel() {
        var oldValue = settings.option('data_limit_value');
        var oldUnit = settings.option('data_limit_unit');
        currentUnit = oldUnit;
        settings.option('data_limit_value', oldValue);
        settings.option('data_limit_unit', oldUnit);
        viewManager.closeCurrentView();
      }
    );
  }

  // Disable OK button when empty dataLimitInput
  dataLimitInput.addEventListener('input',
    function cc_ondataLimitInputChange(evt) {
      okButton.disabled = (evt.target.value.trim() === '');
    }
  );

  // Configure the swicth unit button
  var currentUnit = settings.option('data_limit_unit');
  var switchUnitButton = dialog.querySelector('.switch-unit-button');
  switchUnitButton.querySelector('span.tag').textContent = currentUnit;
  switchUnitButton.addEventListener('click',
    function ccapp_switchUnit() {
      currentUnit = (currentUnit === 'MB') ? 'GB' : 'MB';
      switchUnitButton.querySelector('span.tag').textContent = currentUnit;
    }
  );

  // Keep the widget and the dialog synchronized
  settings.observe('data_limit_value',
    function ccld_onValueChange(value) {

      // Use default value if no value
      if (value === null || typeof value === 'undefined')
        value = settings.defaultValue('data_limit_value');

      // Set dialog
      dataLimitInput.value = value;

      var tagSpan = guiWidget.querySelector('.tag');
      tagSpan.textContent = format(dataLimitInput.value);
    }
  );

  settings.observe('data_limit_unit',
    function ccld_onUnitChange(value) {

      // Use default value if no value
      if (value === null || typeof value === 'undefined')
        value = settings.defaultValue('data_limit_unit');

      // Set dialog
      switchUnitButton.querySelector('span.tag').textContent = value;

      var tagSpan = guiWidget.querySelector('.tag');
      tagSpan.textContent = format(dataLimitInput.value);
    }
  );

  // Show the dialog
  var oldUnitValue;
  guiWidget.addEventListener('click', function ccld_onWidgetClick() {
    viewManager.changeViewTo(dialog.id);
    dataLimitInput.focus();
    oldUnitValue = settings.option('data_limit_unit');
    switchUnitButton.querySelector('span.tag').textContent = oldUnitValue;
  });

}
