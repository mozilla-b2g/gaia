'use strict';

var assert = require('assert');
var Ftu = require('./lib/ftu');

marionette('First Time Use > Pseudo Localization', function() {
  var ftu;
  var client = marionette.client({ profile: Ftu.clientOptions });
  var quickly;

  setup(function() {
    ftu = new Ftu(client);

    // allow findElement to fail quickly
    quickly = client.scope({
      searchTimeout: 50
    });
    quickly.helper.client = quickly;
  });

  test('FTU Languages without pseudo localization', function() {
    quickly.settings.set('devtools.qps.enabled', false);
    quickly.apps.switchToApp(Ftu.URL);

    var panel = ftu.getPanel('language');
    assert.ok(panel.displayed());

    // the input is hidden so we can't use waitForElement
    quickly.findElement('gaia-radio[value="en-US"]');
    quickly.helper.waitForElementToDisappear('gaia-radio[value="qps-ploc"]');
  });

  test('FTU Languages with pseudo localization', function() {
    quickly.settings.set('devtools.qps.enabled', true);
    quickly.apps.switchToApp(Ftu.URL);
    quickly.helper.waitForElement('#languages');
    quickly.findElement('gaia-radio[value="en-US"]');
    quickly.findElement('gaia-radio[value="qps-ploc"]');
  });

  test('Can select accented-english', function() {
    quickly.settings.set('devtools.qps.enabled', true);
    quickly.apps.switchToApp(Ftu.URL);
    quickly.helper.waitForElement('#languages');
    var header = quickly.helper.waitForElement(Ftu.Selectors.header);
    ftu.selectLanguage('qps-ploc');
    ftu.waitForL10nReady();

    var translatedHeader = quickly.executeScript('' +
      'var qps = window.wrappedJSObject.navigator.mozL10n.qps;' +
      'return qps["qps-ploc"].translate("Language");'
    );
    assert.equal(translatedHeader, header.text());
  });
});
