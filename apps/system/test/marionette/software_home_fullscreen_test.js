'use strict';

var assert = require('assert');

marionette('Software Home Button - Fullscreen Request', function() {

  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      },
      settings: {
        'software-button.enabled': true
      },
      apps: {
        'fullscreen_request.gaiamobile.org':
          __dirname + '/../apps/fullscreen_request'
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var home, system;

  setup(function() {
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    home.waitForLaunch();
    client.switchToFrame();
  });

  test('Does not hide after a mozRequestFullscreen request', function() {
    var appUrl = 'app://fullscreen_request.gaiamobile.org';
    client.apps.launch(appUrl);

    var frame = system.waitForLaunch(appUrl);

    assert.ok(!system.softwareHomeFullscreen.displayed());

    client.switchToFrame(frame);
    client.helper.waitForElement('#fullscreen').click();
    client.switchToFrame();

    client.waitFor(function(){
      return system.softwareHomeFullscreen.displayed() &&
        !system.softwareHomeFullscreenLayout.displayed();
    });

    system.clickSoftwareHomeButton();
    client.waitFor(function(){
      return client.findElement(system.Selector.activeHomescreenFrame)
        .displayed();
    });
  });

  test('Fullscreen request makes app take up entire viewport', function() {
    var appUrl = 'app://fullscreen_request.gaiamobile.org';
    client.apps.launch(appUrl);

    var frame = system.waitForLaunch(appUrl);
    client.switchToFrame(frame);
    client.helper.waitForElement('#fullscreen').click();
    client.switchToFrame();

    // Make sure iframe takes up full viewport.
    var manifestURL = appUrl + '/manifest.webapp';
    var appFrame = client.findElement('iframe[mozapp="' + manifestURL + '"]');
    var winHeight = client.findElement('body').size().height;
    client.waitFor(function() {
      var frameHeight = appFrame.scriptWith(function(el) {
        return el.getBoundingClientRect().height;
      });
      return winHeight === frameHeight;
    });

    // When an app requests fullscreen, Gecko will apply position fixed to the
    // mozbrowser iframe to make it take up the entire screen. However, if
    // the iframe has an ancestor that has a transform style, fixed will
    // be relative to that ancestor (by design). So for this test we walk up
    // the DOM tree from the mozbrowser frame and make sure no ancestors
    // have a transform property set.
    // See https://bugzilla.mozilla.org/show_bug.cgi?id=1212960
    function hasTransformAncestor(el) {
      while (el) {
        if (window.getComputedStyle(el).transform !== 'none') {
          return true;
        }
        el = el.parentElement;
      }
      return false;
    }
    assert.equal(false, appFrame.scriptWith(hasTransformAncestor),
      'mozbrowser iframe has no ancestor with tranform style');
  });
});
