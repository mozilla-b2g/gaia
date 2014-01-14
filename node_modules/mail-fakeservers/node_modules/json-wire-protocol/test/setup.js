(function() {

  var isNode = typeof window === 'undefined';
  var ctx = isNode ? global : window;

  function setupChai(chai) {
    chai.Assertion.includeStack = true;
    ctx.assert = chai.assert;
  }

  // node setup
  if (isNode) {
    setupChai(require('chai'));
    global.jsonWireProtocol = require('../lib/index');
  } else {
    require('/node_modules/eventemitter2/lib/eventemitter2.js');
    require('/lib/index.js');
    require('/node_modules/chai/chai.js', function() {
      setupChai(window.chai);
    });
  }


}(

));
