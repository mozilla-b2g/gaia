'use strict';

/* global L10nLoader */

require('/js/keyboard/l10n_loader.js');

suite('L10nLoader', function() {
  test('load() should load the script', function() {
    var appendChildSpy = this.sinon.spy(document.body, 'appendChild');

    var loader = new L10nLoader();
    loader.SCRIPT_URL = encodeURI('data:text/javascript,');

    loader.load();
    assert.equal(appendChildSpy.getCall(0).args[0].src, loader.SCRIPT_URL);
  });

  test('load() should load the script once when called twice', function() {
    var appendChildSpy = this.sinon.spy(document.body, 'appendChild');

    var loader = new L10nLoader();
    loader.SCRIPT_URL = encodeURI('data:text/javascript,');

    loader.load();
    loader.load();

    assert.equal(appendChildSpy.callCount, 1);
  });
});
