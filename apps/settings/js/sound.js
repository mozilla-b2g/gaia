/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*
 * The code below is the new activities-based ringtone
 * and alerttone selection
 */
(function() {
  'use strict';

  var lists = {
    'notifications': {
      type: 'alerttone',
      settingName: 'notification.ringtone',
      element: document.getElementById('alert-tone-selection')
    },
    'ringtones': {
      type: 'ringtone',
      settingName: 'dialer.ringtone',
      element: document.getElementById('ring-tone-selection')
    }
  };

  for (var item in lists) {
    // There is a closure in order to keep the right target for list
    (function(list) {
      var button = list.element;
      var key = list.settingName + '.name';

      // The button looks like a select element. By default it just reads
      // "change". But we want it to display the name of the current tone
      navigator.mozSettings.createLock()
      .get(key)
      .onsuccess = function(e) {
        if (e.target.result[key])
          button.textContent = e.target.result[key];
        else
          button.textContent = navigator.mozL10n.get('change');
      };
      // When the user clicks the button, we launch an activity to allow the
      // user to select new ringtone.
      button.onclick = function() {
        var activity = new MozActivity({
          name: 'pick',
          data: {
            type: list.type
          }
        });
        activity.onsuccess = function() {
          if (!activity.result.blob) {
            console.warn('pick activity empty result');
            return;
          }

          var reader = new FileReader();
          reader.readAsDataURL(activity.result.blob);
          reader.onload = function() {
            var settings = {};
            settings[list.settingName] = reader.result;

            if (activity.result.name) {
              button.textContent = activity.result.name;
              settings[list.settingName + '.name'] = activity.result.name;
            }
            else {
              button.textContent = navigator.mozL10n.get('change');
              settings[list.settingName + '.name'] = '';
            }

            navigator.mozSettings.createLock().set(settings);
          };
        };
      };
    })(lists[item]);
  }
}());
