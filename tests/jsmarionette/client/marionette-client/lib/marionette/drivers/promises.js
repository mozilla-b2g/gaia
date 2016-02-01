var Tcp = require('./tcp');
var Response = require('../message').Response;
var Command = require('../message').Command;

Promises.Socket = Tcp.Socket;

function Promises(options) {
  if (!options) {
    options = {};
  }
  Tcp.call(this, options);

  this.tcp = new Tcp(options);
  this.tcp._handshaking = false;
  this.tcp._driver = this;
  this.isSync = true;

  this.marionetteProtocol = function(){
    return this.tcp.marionetteProtocol;
  }

  this.applicationType = function(){
    return this.tcp.applicationType;
  }

  this.traits = function(){
    return this.tcp.traits;
  }

  this.tcp.cbhandshake = function (data){
    // if we don't set the marionetteProtocol on the driver,
    // the session fail to open and the client stucks at [msg: 0]
    this._driver.marionetteProtocol = data.marionetteProtocol || 1;
    this._driver.traits = data.traits;
    this._driver.applicationType = data.applicationType;
  }

  // receiving command from the server
  this.tcp._onClientCommand = function(data) {
    var _response;

    if (this._handshaking){
      this.cbhandshake(data);
      this._handshaking = false;
      _response = data;
      console.log("Handshaking SIM");
    } else {
      //_response = Response.fromMsg(data);
      _response = data;
      console.log("Handshaking NAO");
    }
    /*
    console.log("_handshaking e adding response ta passando aqui: data", data);

    console.log("_handshaking e adding response ta passando aqui: response", _response); */
    console.log("onDeviceResponse:",_response);
    this._onDeviceResponse({
      id: this.connectionId,
      response: _response
    });
  };
}


Promises.prototype = Object.create(Tcp.prototype);

Promises.prototype.connect = function() {
  var tcp = this.tcp;
  this.tcp._handshaking = true;
/*
  var e = new Error('dummy');
  var stack = e.stack.replace(/^[^\(]+?[\n$]/gm, '') .replace(/^\s+at\s+/gm, '') .replace(/^Object.<anonymous>\s*\(/gm, '{anonymous}()@') .split('\n');
  console.log(stack);
*/
  return new Promise(function(resolve, reject) {
    tcp.connect(function(err) {
      console.log('callback do connect!!! err:', err);
      err ? reject(err) : resolve();
    });
  });
};

Promises.prototype.send = function(obj) {
  var tcp = this.tcp;
  var _this = this;
  return new Promise(function(resolve, reject) {
    tcp.send(obj, function(res,err) {
      console.log('1- na promise no send:', _this);
      err ? reject(err) : resolve([res, _this]);
    });
  });
};

Promises.prototype.close = function() {
  this.tcp.close();
};

module.exports = Promises;
