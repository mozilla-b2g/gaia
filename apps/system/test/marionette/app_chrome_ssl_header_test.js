'use strict';

marionette('App Chrome - Lock Icon', function() {
  var assert = require('assert');

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    },
    apps: {
      'chromeheaderapp.gaiamobile.org':
        __dirname + '/../apps/chromeheaderapp'
    }
  });

  function changeWindowState(appWindowId, state) {
    client.executeScript(function(appWindowId, state) {
      // Dispatch a mozsecuritychange event to the app element.
      var win = window.wrappedJSObject;
      var evt = new CustomEvent('mozbrowsersecuritychange',
                                { detail: { 'state': state }});
      var container = win.document.getElementById(appWindowId);
      container.dispatchEvent(evt);
    }, [appWindowId, state]);
  }

  function getTitleProperties(appElement) {
    var header = appElement.findElement('gaia-header');
    client.waitFor(function() {
      return (
        header.getAttribute('title-start') !== null &&
        header.getAttribute('title-end') !== null
      );
    });
    return {
      start: parseInt(header.getAttribute('title-start')),
      end: parseInt(header.getAttribute('title-end')),
      fontSize: parseInt(header.findElement('h1').cssProperty('fontSize'))
    };
  }

  var appElement, popupElement, popupHeader;
  var TEST_APP = 'app://chromeheaderapp.gaiamobile.org';

  setup(function() {
    client.apps.launch(TEST_APP);
    client.apps.switchToApp(TEST_APP);

    client.findElement('#popup-button').click();
    client.switchToFrame();

    var appWindowId = client.executeScript(function() {
      var app = window.wrappedJSObject.Service.currentApp;
      return app.element.id;
    });
    appElement = client.findElement('#' + appWindowId);
    popupElement = client.helper.waitForElement(
      '#' + appWindowId + ' .popupWindow'
    );
    popupHeader = popupElement.findElement('gaia-header');
  });

  test('popup should show no icon', function() {
    var selector = '.title:not([data-ssl="secure"])';
    assert(popupHeader.findElement(selector).displayed(),
           selector + ' is displayed');

    var titleProps = getTitleProperties(popupElement);
    console.log('titleProps: ' + JSON.stringify(titleProps));
    // first 50px is for close button
    assert(titleProps.start <= 50 && titleProps.end === 0,
           'no space allowed for lock icon: ' + JSON.stringify(titleProps));
    client.apps.close(TEST_APP);
  });

  test('secured popup should show secure icon', function() {
    var selector = '.title[data-ssl="secure"]';
    changeWindowState(popupElement.getAttribute('id'), 'secure');
    client.waitFor(function() {
      return popupHeader.findElement(selector);
    });
    assert(popupHeader.findElement(selector).displayed(),
           selector + ' is displayed');

    var titleProps = getTitleProperties(popupElement);
    assert(titleProps.start > 50 && titleProps.end === 0,
           'space allowed for lock icon: ' + JSON.stringify(titleProps));
    client.apps.close(TEST_APP);
  });

  test('broken-ssl popup should show broken icon', function() {
    var selector = '.title[data-ssl="broken"]';
    changeWindowState(popupElement.getAttribute('id'), 'broken');
    client.waitFor(function() {
      return popupHeader.findElement(selector);
    });
    assert(popupHeader.findElement(selector).displayed(),
           selector + ' is displayed');

    var titleProps = getTitleProperties(popupElement);
    assert(titleProps.start > 50 && titleProps.end === 0,
           'space allowed for broken lock icon: ' + JSON.stringify(titleProps));
    client.apps.close(TEST_APP);
  });

  test('lock icon placement with RTL language', function() {
    client.settings.set('language.current', 'qps-plocm');
    var documentElement = client.findElement('html');
    // Localization can be async, wait for the content to update
    client.waitFor(function() {
      return documentElement.getAttribute('dir') == 'rtl';
    });

    var selector = '.title[data-ssl="secure"]';
    changeWindowState(popupElement.getAttribute('id'), 'secure');
    client.waitFor(function() {
      return popupHeader.findElement(selector);
    });
    assert(popupHeader.findElement(selector).displayed(),
           selector + ' is displayed');

    var titleProps = getTitleProperties(popupElement);
    assert(titleProps.start == 50 && titleProps.end >= 30,
           'space allowed for lock icon: ' + JSON.stringify(titleProps));
    client.apps.close(TEST_APP);

  });
});
