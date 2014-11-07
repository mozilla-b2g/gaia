'use strict';

var assert = require('assert');
var RootPanel = require('./lib/panels/root');

marionette('root panel', function() {
  var client = marionette.client({
    settings: {
      'privacy-panel-gt-complete': true
    }
  });
  var subject;

  setup(function() {
    subject = new RootPanel(client);
    subject.init();
  });

  test('root page elements', function() {
    var menuItems = client.findElements('#root li');
    assert.ok(menuItems.length === 3);
  });

  test('ability to load ala panel', function() {
    subject.tapOnAlaMenuItem();
    assert.ok(subject.isAlaDisplayed());
  });

  test('ability to load rpp panel', function() {
    subject.tapOnRppMenuItem();
    assert.ok(subject.isRppDisplayed());
  });

  test('ability to load guided tour panel', function() {
    subject.tapOnGtMenuItem();
    assert.ok(subject.isGtDisplayed());
  });
});
