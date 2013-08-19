(function(module, ns) {

  module.exports = {
    Abstract: ns.require('drivers/abstract'),
    HttpdPolling: ns.require('drivers/httpd-polling'),
    Websocket: ns.require('drivers/websocket')
  };

  if (typeof(window) === 'undefined') {
    module.exports.Tcp = require('./tcp');
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
