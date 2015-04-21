'use strict';

var Ftu = require('../lib/ftu');
var assert = require('assert');

marionette('First Time Use >', function() {
  var ftu;
  var client = marionette.client(Ftu.clientOptions);
  var quickly;

  setup(function() {
    ftu = new Ftu(client);
    // allow findElement to fail quickly
    quickly = client.scope({
      searchTimeout: 50
    });
    quickly.helper.client = quickly;
  });

  test('Change language to mirrored english', function() {
    quickly.settings.set('devtools.qps.enabled', true);
    quickly.apps.switchToApp(Ftu.URL);
    quickly.helper.waitForElement('#languages');
    var header = quickly.helper.waitForElement(Ftu.Selectors.header);
    ftu.selectLanguage('qps-plocm');
    ftu.waitForL10nReady();

    assert.equal(quickly.settings.get('language.current'), 'qps-plocm');
    var translatedHeader = quickly.executeScript('' +
      'var qps = window.wrappedJSObject.navigator.mozL10n.qps;' +
      'return qps["qps-plocm"].translate("Language");'
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
    quickly.settings.set('devtools.qps.enabled', true);
    quickly.apps.switchToApp(Ftu.URL);
    quickly.helper.waitForElement('#languages');
    ftu.selectLanguage('qps-plocm');
    ftu.waitForL10nReady();

    var direction = quickly.helper.waitForElement('#nav-bar')
                    .scriptWith(function(el) {
      return window.wrappedJSObject.getComputedStyle(el).direction;
    });
    assert(direction, 'ltr');
  });

});
