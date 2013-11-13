var assert = require('assert');
var TARGET_APP = 'app://calendar.gaiamobile.org';
var TARGET_APP_MANIFEST = TARGET_APP + '/manifest.webapp';

var HOME_APP = 'app://homescreen.gaiamobile.org';
var HOME_APP_MANIFEST = HOME_APP + '/manifest.webapp';

marionette('App transitions', function() {
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  setup(function() {
  });

  test('tapping app quickly', function() {
    client.apps.launch(TARGET_APP);
    client.apps.launch(TARGET_APP);
    client.apps.launch(TARGET_APP);
  });

  test('open app', function() {
    client.apps.launch(TARGET_APP);
    client.waitFor(function() {
      return (client.findElement('iframe[mozapp="' +
        TARGET_APP + '"]').parentNode.getAttribute('transition-state') ==
        'opened');
    });
  });

  test('close app', function() {
    client.apps.launch(TARGET_APP);
    client.apps.launch(HOME_APP);
    client.waitFor(function() {
      return (client.findElement('iframe[mozapp="' +
        TARGET_APP + '"]').parentNode.getAttribute('transition-state') ==
        'closed');
    });
  });
});
