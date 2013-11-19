var SettingsBase = {
  handleEvent: function settings_handleEvent(event) {
    var input = event.target;
    var type = input.type;
    var key = input.name;

    var settings = window.navigator.mozSettings;
    //XXX should we check data-ignore here?
    if (!key || !settings || event.type != 'change')
      return;

    // Not touching <input> with data-setting attribute here
    // because they would have to be committed with a explicit "submit"
    // of their own dialog.
    if (input.dataset.setting)
      return;

    var value;
    switch (type) {
      case 'checkbox':
      case 'switch':
        value = input.checked; // boolean
        break;
      case 'range':
        // Bug 906296:
        //   We parseFloat() once to be able to round to 1 digit, then
        //   we parseFloat() again to make sure to store a Number and
        //   not a String, otherwise this will make Gecko unable to
        //   apply new settings.
        value = parseFloat(parseFloat(input.value).toFixed(1)); // float
        break;
      case 'select-one':
      case 'radio':
      case 'text':
      case 'password':
        value = input.value; // default as text
        if (input.dataset.valueType === 'integer') // integer
          value = parseInt(value);
        break;
    }

    var cset = {}; cset[key] = value;
    settings.createLock().set(cset);
  }
};

window.addEventListener('load', function loadSettings() {
  window.addEventListener('change', SettingsBase);
});
