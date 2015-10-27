'use strict';

var Ftu = require('./lib/ftu');
var assert = require('assert');

marionette('First Time Use >', function() {
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

  test('Change language to bidi english', function() {
    quickly.settings.set('devtools.pseudolocalization.enabled', true);
    quickly.apps.switchToApp(Ftu.URL);
    quickly.helper.waitForElement('#languages');
    var header = quickly.helper.waitForElement(Ftu.Selectors.header);
    ftu.selectLanguage('ar-x-psbidi');

    assert.equal(quickly.settings.get('language.current'), 'ar-x-psbidi');
    var translatedHeader = quickly.executeScript('' +
      'var qps = window.wrappedJSObject.navigator.mozL10n.qps;' +
      'return qps["ar-x-psbidi"].translate("Language");'
    );
    // sanity check expected translation
    var direction = quickly.helper.waitForElement('body')
                    .scriptWith(function(el) {
      return window.wrappedJSObject.getComputedStyle(el).direction;
    });
    assert.equal(direction, 'rtl');
    assert.equal(translatedHeader, header.text());
  });

  test('Correct nav button order under RTL', function() {
    quickly.settings.set('devtools.pseudolocalization.enabled', true);
    quickly.apps.switchToApp(Ftu.URL);
    quickly.helper.waitForElement('#languages');
    ftu.selectLanguage('ar-x-psbidi');

    var direction = quickly.helper.waitForElement('#nav-bar')
                    .scriptWith(function(el) {
      return window.wrappedJSObject.getComputedStyle(el).direction;
    });
    assert(direction, 'ltr');
  });

});
