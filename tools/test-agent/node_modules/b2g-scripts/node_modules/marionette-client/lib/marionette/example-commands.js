(function(exports) {
  if (typeof(exports.Marionette) === 'undefined') {
    exports.Marionette = {};
  }

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

  exports.Marionette.ExampleCommands = {
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

    elementEqualsResponse: cmd(
      { from: 'actor', value: false }
    ),

    findElementResponse: cmd(
      { from: 'actor', value: '{some-uuid}' }
    ),

    findElementsResponse: cmd(
      { from: 'actor', value: ['{some-uuid}', '{some-other-uuid}'] }
    ),

    value: cmd(
      { from: 'actor', value: 'zomg' }
    ),

    ok: cmd(
      { from: 'actor', ok: true }
    )
  };

}(
  (typeof(window) === 'undefined') ? module.exports : window
));
