var Tcp = require('./tcp');
var Response = require('../message').Response;
var Command = require('../message').Command;

Promises.Socket = Tcp.Socket;

function Promises(options) {
  if (!options) {
    options = {};
  }

  this.tcp = new Tcp(options);
  this.tcp._handshaking = false;
  this.tcp._driver = this;

  this.tcp.cbhandshake = function (data){
    // if we don't set the marionetteProtocol on the driver,
    // the session fail to open and the client stucks at [msg: 0]
    this._driver.marionetteProtocol = data.marionetteProtocol || 1;
    this._driver.traits = data.traits;
    this._driver.applicationType = data.applicationType;
  }

  // receiving command from the server
  this.tcp._onClientCommand = function(data) {

    if (this._handshaking){
      this.cbhandshake(data);
      this._handshaking = false;
    }

    var _response = new Response(0, data);
    this._onDeviceResponse({
      id: this.connectionId,
      response: _response.toMsg()
    });
  };
}

Promises.prototype.connect = function() {
  var tcp = this.tcp;
  this.tcp._handshaking = true;

  return new Promise(function(resolve, reject) {
    tcp.connect(function(err) {
      err ? reject(err) : resolve();
    });
  });
};

Promises.prototype.send = function(obj) {
  var tcp = this.tcp;

  return new Promise(function(resolve, reject) {
    tcp.send(obj, function(res,err) {
      err ? reject(err) : resolve(res);
    });

  });
};

Promises.prototype.close = function() {
  this.tcp.close();
};

module.exports = Promises;
