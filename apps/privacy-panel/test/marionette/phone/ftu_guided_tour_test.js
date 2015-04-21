'use strict';

var assert = require('assert');
var GtPanels = require('../lib/panels/ftu_guided_tour');

marionette('first time use', function() {
  var client = marionette.client({});
  var subject;

  setup(function() {
    subject = new GtPanels(client);
    subject.init();
  });

  test('ability to get guided tour panel at ftu', function() {
    assert.ok(subject.isGtWelcomeDisplayed());
    subject.tapOnCloseBtn();
    assert.ok(subject.isRootDisplayed());
  });
});
