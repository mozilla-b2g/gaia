// some helpers to test swipe interaction

'use strict';

var assert = require('chai').assert;

exports.changeDate = function(opts) {
  var app = opts.app;
  var isNext = opts.isNext;
  var getDate = opts.getDate;
  var swipeCount = opts.count || 5;

  var client = app.client;

  var prevText = app.headerContent.text();
  var prevDate = getDate();

  while (swipeCount--) {
    app['swipe' + (isNext ? 'Left' : 'Right')]();

    var text;

    //jshint loopfunc:true
    client.waitFor(function() {
      text = app.headerContent.text();
      return text !== prevText;
    }, { timeout: 2000 });

    // not checking for real overflow since font is different on each
    // environment (Travis uses a wider font) which would make test to fail
    // https://groups.google.com/forum/#!topic/mozilla.dev.gaia/DrQzv7qexw4
    assert.operator(text.length, '<', 21, 'header should not overflow');

    var date = getDate();
    assert.operator(
      Number(date),
      (isNext ? '>' : '<'),
      Number(prevDate),
      'should change the date'
    );

    prevText = text;
    prevDate = date;
  }
};

