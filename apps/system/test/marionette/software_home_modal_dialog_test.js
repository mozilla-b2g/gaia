'use strict';

marionette('Software Home Button - Modal Dialog', function() {

  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      },
      settings: {
        'software-button.enabled': true
      }
    }
  });
  var home, system;

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    home.waitForLaunch();
    client.switchToFrame();
  });

  test('Proper layout for alerts', function() {
    client.executeScript(function() {
      window.wrappedJSObject.ModalDialog.alert(
        'apmActivated', 'noHopspotWhenAPMisOn', { title: 'ok' });
    });

    function rect(el) {
      return el.getBoundingClientRect();
    }

    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var sbRect = system.statusbar.scriptWith(rect);
      var alert = client.findElement('#modal-dialog-alert');
      var dialogRect = alert.scriptWith(rect);
      var shbRect = system.softwareButtons.scriptWith(rect);

      return dialogRect.bottom === shbRect.top &&
        winHeight === (sbRect.height + dialogRect.height + shbRect.height);
    });
  });
});
