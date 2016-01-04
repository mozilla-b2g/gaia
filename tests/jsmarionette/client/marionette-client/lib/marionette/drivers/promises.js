var Tcp = require('./tcp');
var Response = require('../message').Response;
var Command = require('../message').Command;

Promises.Socket = Tcp.Socket;

var DEFAULT_HOST = 'localhost';
var DEFAULT_PORT = 2828;

function Promises(options) {
  if (!options) {
    options = {};
  }

  this._lastId = 0;
  this.host = options.host || DEFAULT_HOST;
  this.port = options.port || DEFAULT_PORT;

  this.connectionTimeout = options.connectionTimeout || 2000;
  this.retryInterval = 300;
  this.isSync = true;

  this.tcp = new Tcp(options);
  this.tcp._handshaking = false;
  this.tcp._driver = this;

  this.tcp.cbhandshake = function (data){
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

Promises.prototype.connect = function(cb) {
  var tcp = this.tcp;
  this.tcp._handshaking = true;

  return new Promise(function(resolve, reject) {
    tcp.connect(function(err) {
      if (err){
        reject(err);
      } else {
        cb();
        resolve();
      }
    });
  });
};

Promises.prototype.send = function(obj, cb) {

  var tcp = this.tcp;
  var that = this;

  return new Promise(function(resolve, reject) {
    var out;

    if (obj instanceof Command || obj instanceof Response) {
      obj.id = ++that._lastId;
      out = obj.toMsg();
    } else {
      out = obj;
    }

    tcp.send(out, function(res,err) {
      if (!err) {
        cb(res);
        resolve(res);
      } else {
        reject(err);
      }
    });

  });
};

Promises.prototype.close = function() {
  this.tcp.close();
};

module.exports = Promises;
