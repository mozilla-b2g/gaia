(function(module, ns) {

  module.exports = {
    Abstract: ns.require('drivers/abstract')
  };

  if (typeof(window) === 'undefined') {
    module.exports.Tcp = require('./tcp');
    module.exports.TcpSync = require('./tcp-sync');
  } else {
    if (typeof(window.TCPSocket) !== 'undefined') {
      module.exports.MozTcp = ns.require('drivers/moz-tcp');
    }
  }

}.apply(
  this,
  (this.Marionette) ?
    [Marionette('drivers'), Marionette] :
    [module, require('../marionette')]
));
