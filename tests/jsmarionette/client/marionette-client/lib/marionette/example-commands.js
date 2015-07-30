/* global Marionette */
(function(module, ns) {
  'use strict';

  function merge() {
    var args = Array.prototype.slice.call(arguments),
        result = {};

    args.forEach(function(object) {
      var key;
      for (key in object) {
        if (object.hasOwnProperty(key)) {
          result[key] = object[key];
        }
      }
    });
    return result;
  }

  function cmd(defaults) {
    return function(override) {
      if (typeof(override) === 'undefined') {
        override = {};
      }
      return merge(defaults, override);
    };
  }

  module.exports = {
    connect: cmd(
      { from: 'root', applicationType: 'gecko', traits: [] }
    ),

    getMarionetteID: cmd(
      { type: 'getMarionetteID' }
    ),

    getMarionetteIDResponse: cmd(
      { from: 'root', id: 'con1' }
    ),

    newSession: cmd(
      { type: 'newSession' }
    ),

    newSessionResponse: cmd(
      { from: 'actor', value: 'b2g-7' }
    ),

    getWindow: cmd(
      { type: 'getWindow' }
    ),

    getWindows: cmd(
      { type: 'getWindows' }
    ),

    getWindowsResponse: cmd(
      { from: 'actor', value: ['1-b2g', '2-b2g'] }
    ),

    getWindowResponse: cmd(
      { from: 'actor', value: '3-b2g' }
    ),

    getUrl: cmd(
      { type: 'getUrl' }
    ),

    getUrlResponse: cmd(
      { from: 'actor', value: 'http://localhost/' }
    ),

    getLogsResponse: cmd(
      {
        from: 'actor',
        value: [
          //log, level, time
          ['debug', 'wow', 'Fri Apr 27 2012 11:00:32 GMT-0700 (PDT)']
        ]
      }
    ),

    screenshotResponse: cmd(
      {
        from: 'actor',
        value: 'data:image/png;base64,iVBOgoAAAANSUhEUgAAAUAAAAHMCAYAAACk4nEJA'
      }
    ),

    elementEqualsResponse: cmd(
      { from: 'actor', value: false }
    ),

    findElementResponse: cmd(
      { from: 'actor', value: '{some-uuid}' }
    ),

    findElementsResponse: cmd(
      { from: 'actor', value: ['{some-uuid}', '{some-other-uuid}'] }
    ),

    numberError: cmd(
      {
        from: 'actor',
        error: {
          message: 'you fail',
          status: 7,
          stacktrace: 'fail@url\nother:300'
        }
      }
    ),

    stringError: cmd(
      {
        from: 'actor',
        error: {
          message: 'you fail',
          status: 'no such element',
          stacktrace: 'fail@url\nother:300'
        }
      }
    ),

    value: cmd(
      { from: 'actor', value: 'zomg' }
    ),

    ok: cmd(
      { from: 'actor', ok: true }
    )
  };

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('example-commands'), Marionette] :
    [module, require('./marionette')]
));
