'use strict';

var assert = require('assert');
var RootPanel = require('./lib/panels/root');

marionette('root panel', function() {
  var client = marionette.client({
    profile: {
      settings: {
        'privacy-panel-gt-complete': true
      }
    }
  });
  var subject;

  setup(function() {
    subject = new RootPanel(client);
    subject.init();
  });

  test('root page elements', function() {
    var menuItems = client.findElements('#root li');
    assert.ok(menuItems.length === 4);
  });

  test('ability to load ala panel', function() {
    subject.tapOnAlaMenuItem();
    assert.ok(subject.isAlaDisplayed());
  });

  test('ability to load rp panel', function() {
    subject.tapOnRpMenuItem();
    assert.ok(subject.isRpDisplayed());
  });

  test('ability to load tc panel', function() {
    subject.tapOnTcMenuItem();
    assert.ok(subject.isTcDisplayed());
  });

  test('ability to load guided tour panel', function() {
    subject.tapOnGtMenuItem();
    assert.ok(subject.isGtDisplayed());
  });
});
