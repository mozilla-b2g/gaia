
(function() {
  var proxyquire = require('proxyquire')
    , assert     = require('assert')
    , fe         = require( __dirname + '/../../../exports.js')
    , fsStub     = fe.fs
    , wrench = proxyquire('wrench', { 'fs': fsStub });
  var World = function World(cb) {
    var f = fe.instance();
    this.wrench = wrench;
    this.fe = f;
    cb();
  };
  exports.World = World;
})();
