
/**
 * Remoted network API that tries to look like node.js's "net" API.  We are
 * expected/required to run in a worker thread where we don't have direct
 * access to mozTCPSocket so everything has to get remitted to the main thread.
 * Our counterpart is mailapi/worker-support/net-main.js
 *
 *
 * ## Sending lots of data: flow control, Blobs ##
 *
 * mozTCPSocket provides a flow-control mechanism (the return value to send
 * indicates whether we've crossed a buffering boundary and 'ondrain' tells us
 * when all buffered data has been sent), but does not yet support enqueueing
 * Blobs for processing (which is part of the proposed standard at
 * http://www.w3.org/2012/sysapps/raw-sockets/).  Also, the raw-sockets spec
 * calls for generating the 'drain' event once our buffered amount goes back
 * under the internal buffer target rather than waiting for it to hit zero like
 * mozTCPSocket.
 *
 * Our main desire right now for flow-control is to avoid using a lot of memory
 * and getting killed by the OOM-killer.  As such, flow control is not important
 * to us if we're just sending something that we're already keeping in memory.
 * The things that will kill us are giant things like attachments (or message
 * bodies we are quoting/repeating, potentially) that we are keeping as Blobs.
 *
 * As such, rather than echoing the flow-control mechanisms over to this worker
 * context, we just allow ourselves to write() a Blob and have the net-main.js
 * side take care of streaming the Blobs over the network.
 *
 * Note that successfully sending a lot of data may entail holding a wake-lock
 * to avoid having the network device we are using turned off in the middle of
 * our sending.  The network-connection abstraction is not currently directly
 * involved with the wake-lock management, but I could see it needing to beef up
 * its error inference in terms of timeouts/detecting disconnections so we can
 * avoid grabbing a wi-fi wake-lock, having our connection quietly die, and then
 * we keep holding the wi-fi wake-lock for much longer than we should.
 *
 * ## Supported API Surface ##
 *
 * We make sure to expose the following subset of the node.js API because we
 * have consumers that get upset if these do not exist:
 *
 * Attributes:
 * - encrypted (false, this is not the tls byproduct)
 * - destroyed
 *
 * Methods:
 * - setKeepAlive(Boolean)
 * - write(Buffer)
 * - end
 *
 * Events:
 * - "connect"
 * - "close"
 * - "end"
 * - "data"
 * - "error"
 **/
define('net',['require','exports','module','util','events','mailapi/worker-router'],function(require, exports, module) {

function debug(str) {
  //dump("NetSocket: (" + Date.now() + ") :" + str + "\n");
}

var util = require('util'),
    EventEmitter = require('events').EventEmitter,
    router = require('mailapi/worker-router');

var routerMaker = router.registerInstanceType('netsocket');

function NetSocket(port, host, crypto) {
  var cmdMap = {
    onopen: this._onconnect.bind(this),
    onerror: this._onerror.bind(this),
    ondata: this._ondata.bind(this),
    onclose: this._onclose.bind(this)
  };
  var routerInfo = routerMaker.register(function(data) {
    cmdMap[data.cmd](data.args);
  });
  this._sendMessage = routerInfo.sendMessage;
  this._unregisterWithRouter = routerInfo.unregister;

  var args = [host, port,
              {
                // Bug 784816 is changing useSSL into useSecureTransport for
                // spec compliance.  Use both during the transition period.
                useSSL: crypto, useSecureTransport: crypto,
                binaryType: 'arraybuffer'
              }];
  this._sendMessage('open', args);

  EventEmitter.call(this);

  this.destroyed = false;
}
exports.NetSocket = NetSocket;
util.inherits(NetSocket, EventEmitter);
NetSocket.prototype.setTimeout = function() {
};
NetSocket.prototype.setKeepAlive = function(shouldKeepAlive) {
};
// The semantics of node.js's socket.write does not take ownership and that's
// how our code uses it, so we can't use transferrables by default.  However,
// there is an optimization we want to perform related to Uint8Array.subarray().
//
// All the subarray does is create a view on the underlying buffer.  This is
// important and notable because the structured clone implementation for typed
// arrays and array buffers is *not* clever; it just serializes the entire
// underlying buffer and the typed array as a view on that.  (This does have
// the upside that you can transfer a whole bunch of typed arrays and only one
// copy of the buffer.)  The good news is that ArrayBuffer.slice() does create
// an entirely new copy of the buffer, so that works with our semantics and we
// can use that to transfer only what needs to be transferred.
NetSocket.prototype.write = function(u8array) {
  if (u8array instanceof Blob) {
    // We always send blobs in their entirety; you should slice the blob and
    // give us that if that's what you want.
    this._sendMessage('write', [u8array]);
    return;
  }

  var sendArgs;
  // Slice the underlying buffer and transfer it if the array is a subarray
  if (u8array.byteOffset !== 0 ||
      u8array.length !== u8array.buffer.byteLength) {
    var buf = u8array.buffer.slice(u8array.byteOffset,
                                   u8array.byteOffset + u8array.length);
    this._sendMessage('write',
                      [buf, 0, buf.byteLength],
                      [buf]);
  }
  else {
    this._sendMessage('write',
                      [u8array.buffer, u8array.byteOffset, u8array.length]);
  }
};
NetSocket.prototype.upgradeToSecure = function() {
  this._sendMessage('upgradeToSecure', []);
};
NetSocket.prototype.end = function() {
  if (this.destroyed)
    return;
  this._sendMessage('end');
  this.destroyed = true;
  this._unregisterWithRouter();
};

NetSocket.prototype._onconnect = function() {
  this.emit('connect');
};
NetSocket.prototype._onerror = function(err) {
  this.emit('error', err);
};
NetSocket.prototype._ondata = function(data) {
  var buffer = Buffer(data);
  this.emit('data', buffer);
};
NetSocket.prototype._onclose = function() {
  this.emit('close');
  this.emit('end');
};

exports.connect = function(port, host, crypto) {
  return new NetSocket(port, host, !!crypto);
};

}); // end define
;
/**
 *
 **/

define('tls',
  [
    'net',
    'exports'
  ],
  function(
    $net,
    exports
  ) {

exports.connect = function(port, host, wuh, onconnect) {
  var socky = new $net.NetSocket(port, host, true);
  if (onconnect)
    socky.on('connect', onconnect);
  return socky;
};

}); // end define
;
/**
 *
 **/

define('os',
  [
    'exports'
  ],
  function(
    exports
  ) {

exports.hostname = function() {
  return 'localhost';
};
exports.getHostname = exports.hostname;

}); // end define
;
define('xoauth2',['require','exports','module'],function(require, exports, module) {
});

define('simplesmtp/lib/client',['require','exports','module','stream','util','net','tls','os','xoauth2','crypto'],function (require, exports, module) {
// TODO:
// * Lisada timeout serveri ühenduse jaoks

var Stream = require('stream').Stream,
    utillib = require('util'),
    net = require('net'),
    tls = require('tls'),
    oslib = require('os'),
    xoauth2 = require('xoauth2'),
    crypto = require('crypto');

// monkey patch net and tls to support nodejs 0.4
if(!net.connect && net.createConnection){
    net.connect = net.createConnection;
}

if(!tls.connect && tls.createConnection){
    tls.connect = tls.createConnection;
}

// expose to the world
module.exports = function(port, host, options){
    var connection = new SMTPClient(port, host, options);
    process.nextTick(connection.connect.bind(connection));
    return connection;
};

/**
 * <p>Generates a SMTP connection object</p>
 * 
 * <p>Optional options object takes the following possible properties:</p>
 * <ul>
 *     <li><b>name</b> - the name of the client server</li>
 *     <li><b>auth</b> - authentication object <code>{user:"...", pass:"..."}</code>
 *     <li><b>crypto</b> - type of server connection.
 *        "plain"/false, "ssl"/true, or "starttls".
 *     </li>
 *     <li><b>debug</b> - output client and server messages to console</li>
 *     <li><b>instanceId</b> - unique instance id for debugging</li>
 * </ul>
 * 
 * @constructor
 * @namespace SMTP Client module
 * @param {Number} [port=25] Port number to connect to
 * @param {String} [host="localhost"] Hostname to connect to
 * @param {Object} [options] Option properties
 */
function SMTPClient(port, host, options){
    Stream.call(this);
    this.writable = true;
    this.readable = true;
    
    this.options = options || {};
  
    var VALID_CRYPTO = ['plain', 'ssl', 'starttls'];
  
    if (this.options.crypto === true) {
        this.options.crypto = 'ssl';
    } else if (this.options.crypto === false) {
        this.options.crypto = 'plain';
    }
  
    this.port = port || (this.options.crypto === 'ssl' ? 465 : 25);
    this.host = host || "localhost";
    
    this.options.auth = this.options.auth || false;
    this.options.maxConnections = this.options.maxConnections || 5;
    
    if(!this.options.name){
        // defaul hostname is machine hostname or [IP]
        var defaultHostname = (oslib.hostname && oslib.hostname()) ||
                              (oslib.getHostname && oslib.getHostname()) ||
                              "";
        if(defaultHostname.indexOf('.')<0){
            defaultHostname = "[127.0.0.1]";
        }
        if(defaultHostname.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)){
            defaultHostname = "["+defaultHostname+"]";
        }
        
        this.options.name = defaultHostname;
    }
    
    this._init();
}
utillib.inherits(SMTPClient, Stream);

/**
 * <p>Initializes instance variables</p>
 */
SMTPClient.prototype._init = function(){
    /**
     * Defines if the current connection is secure or not. If not, 
     * STARTTLS can be used if available
     * @private
     */
    this._secureMode = false;
    
    /**
     * Ignore incoming data on TLS negotiation
     * @private
     */
    this._ignoreData = false;
    
    /**
     * Store incomplete messages coming from the server
     * @private
     */
    this._remainder = "";

    /**
     * If set to true, then this object is no longer active
     * @private 
     */
    this.destroyed = false;
    
    /**
     * The socket connecting to the server
     * @publick
     */
    this.socket = false;
    
    /**
     * Lists supported auth mechanisms
     * @private
     */
    this._supportedAuth = [];
    
    /**
     * Currently in data transfer state
     * @private
     */
    this._dataMode = false;
    
    /**
     * Keep track if the client sends a leading \r\n in data mode 
     * @private
     */
    this._lastDataBytes = new Buffer(2);
    
    /**
     * Function to run if a data chunk comes from the server
     * @private
     */
    this._currentAction = false;
  
    // in plain or ssl mode, do not attempt to upgrade encryption at the
    // protocol layer because it's handled automatically.
    if(this.options.crypto === 'plain' || this.options.crypto === 'ssl') {
        this._secureMode = true;
    }

    /**
     * XOAuth2 token generator if XOAUTH2 auth is used
     * @private
     */
    this._xoauth2 = false;

    if(typeof this.options.auth.XOAuth2 == "object" && typeof this.options.auth.XOAuth2.getToken == "function"){
        this._xoauth2 = this.options.auth.XOAuth2;
    }else if(typeof this.options.auth.XOAuth2 == "object"){
        if(!this.options.auth.XOAuth2.user && this.options.auth.user){
            this.options.auth.XOAuth2.user = this.options.auth.user;
        }
        this._xoauth2 = xoauth2.createXOAuth2Generator(this.options.auth.XOAuth2);
    }
};

/**
 * <p>Creates a connection to a SMTP server and sets up connection
 * listener</p>
 */
SMTPClient.prototype.connect = function(){

    if(this.options.crypto === 'ssl') {
        this.socket = tls.connect(this.port, this.host, {}, this._onConnect.bind(this));
    }else{
        this.socket = net.connect(this.port, this.host);
        this.socket.on("connect", this._onConnect.bind(this));
    }
    
    this.socket.on("error", this._onError.bind(this));
};

/**
 * <p>Upgrades the connection to TLS</p>
 * 
 * @param {Function} callback Callbac function to run when the connection
 *        has been secured
 */
SMTPClient.prototype._upgradeConnection = function(callback){
    this._secureMode = true;
    this.socket.upgradeToSecure();
    callback(null, true);
};

/**
 * <p>Connection listener that is run when the connection to 
 * the server is opened</p>
 * 
 * @event
 */
SMTPClient.prototype._onConnect = function(){
    if("setKeepAlive" in this.socket){
        this.socket.setKeepAlive(true);
    }else if(this.socket.encrypted && "setKeepAlive" in this.socket.encrypted){
        this.socket.encrypted.setKeepAlive(true); // secure connection
    }
    
    this.socket.on("data", this._onData.bind(this));
    this.socket.on("close", this._onClose.bind(this));
    this.socket.on("end", this._onEnd.bind(this));

    this.socket.setTimeout(3 * 3600 * 1000); // 1 hours
    this.socket.on("timeout", this._onTimeout.bind(this));
    
    this._currentAction = this._actionGreeting;
};

/**
 * <p>Destroys the client - removes listeners etc.</p>
 */
SMTPClient.prototype._destroy = function(){
    if(this._destroyed)return;
    this._destroyed = true;
    this.emit("end");
    this.removeAllListeners();
};

/**
 * <p>'data' listener for data coming from the server</p>
 * 
 * @event
 * @param {Buffer} chunk Data chunk coming from the server
 */
SMTPClient.prototype._onData = function(chunk){
    var str;

    if(this._ignoreData || !chunk || !chunk.length){
        return;
    }

    // Wait until end of line
    if(chunk[chunk.length-1] != 0x0A){
        this._remainder += chunk.toString();
        return;
    }else{
        str = (this._remainder + chunk.toString()).trim();
        this._remainder = "";
    }

    if(this.options.debug){
        console.log("SERVER"+(this.options.instanceId?" "+
            this.options.instanceId:"")+":\n└──"+str.replace(/\r?\n/g,"\n   "));
    }
    
    if(typeof this._currentAction == "function"){
        this._currentAction.call(this, str);
    }
};

/**
 * <p>'error' listener for the socket</p>
 * 
 * @event
 * @param {Error} err Error object
 * @param {String} type Error name
 */
SMTPClient.prototype._onError = function(err, type, data){
    if(type && type != "Error"){
        err.name = type;
    }
    if(data){
        err.data = data;
    }
    this.emit("error", err);
    this.close();
};

/**
 * <p>'close' listener for the socket</p>
 * 
 * @event
 */
SMTPClient.prototype._onClose = function(){
    this._destroy();
};

/**
 * <p>'end' listener for the socket</p>
 * 
 * @event
 */
SMTPClient.prototype._onEnd = function(){
    this._destroy();
};

/**
 * <p>'timeout' listener for the socket</p>
 * 
 * @event
 */
SMTPClient.prototype._onTimeout = function(){
    this.close();
};

/**
 * <p>Passes data stream to socket if in data mode</p>
 * 
 * @param {Buffer} chunk Chunk of data to be sent to the server
 */
SMTPClient.prototype.write = function(chunk){
    // works only in data mode
    if(!this._dataMode){
        // this line should never be reached but if it does, then
        // say act like everything's normal.
        return true;
    }
    
    if(typeof chunk == "string"){
        chunk = new Buffer(chunk, "utf-8");
    }
    
    if(chunk.length > 2){
        this._lastDataBytes[0] = chunk[chunk.length-2];
        this._lastDataBytes[1] = chunk[chunk.length-1];
    }else if(chunk.length == 1){
        this._lastDataBytes[0] = this._lastDataBytes[1];
        this._lastDataBytes[1] = chunk[0];
    }
    
    if(this.options.debug){
        console.log("CLIENT (DATA)"+(this.options.instanceId?" "+
            this.options.instanceId:"")+":\n└──"+chunk.toString().trim().replace(/\n/g,"\n   "));
    }
    
    // pass the chunk to the socket
    return this.socket.write(chunk);
};

/**
 * <p>Indicates that a data stream for the socket is ended. Works only
 * in data mode.</p>
 * 
 * @param {Buffer} [chunk] Chunk of data to be sent to the server
 */
SMTPClient.prototype.end = function(chunk){
    // works only in data mode
    if(!this._dataMode){
        // this line should never be reached but if it does, then
        // say act like everything's normal.
        return true;
    }
    
    if(chunk && chunk.length){
        this.write(chunk);
    }

    // redirect output from the server to _actionStream
    this._currentAction = this._actionStream;

    // indicate that the stream has ended by sending a single dot on its own line
    // if the client already closed the data with \r\n no need to do it again 
    if(this._lastDataBytes[0] == 0x0D && this._lastDataBytes[1] == 0x0A){
        this.socket.write(new Buffer(".\r\n", "utf-8"));
    }else if(this._lastDataBytes[1] == 0x0D){
        this.socket.write(new Buffer("\n.\r\n"));
    }else{
        this.socket.write(new Buffer("\r\n.\r\n"));
    }
    
    // end data mode    
    this._dataMode = false;
};

/**
 * <p>Send a command to the server, append \r\n</p>
 * 
 * @param {String} str String to be sent to the server
 */
SMTPClient.prototype.sendCommand = function(str){
    if(this.options.debug){
        console.log("CLIENT"+(this.options.instanceId?" "+
            this.options.instanceId:"")+":\n└──"+(str || "").toString().trim().replace(/\n/g,"\n   "));
    }
    this.socket.write(new Buffer(str+"\r\n", "utf-8"));
};

/**
 * <p>Sends QUIT</p>
 */
SMTPClient.prototype.quit = function(){
    this.sendCommand("QUIT");
    this._currentAction = this.close;
};

/**
 * <p>Closes the connection to the server</p>
 */
SMTPClient.prototype.close = function(){
    if(this.options.debug){
        console.log("Closing connection to the server");
    }
    if(this.socket && this.socket.socket && this.socket.socket.end && !this.socket.socket.destroyed){
        this.socket.socket.end();
    }
    if(this.socket && this.socket.end && !this.socket.destroyed){
        this.socket.end();
    }
    this._destroy();
};

/**
 * <p>Initiates a new message by submitting envelope data, starting with
 * <code>MAIL FROM:</code> command</p>
 * 
 * @param {Object} envelope Envelope object in the form of 
 *        <code>{from:"...", to:["..."]}</code>
 */
SMTPClient.prototype.useEnvelope = function(envelope){
    this._envelope = envelope || {};
    this._envelope.from = this._envelope.from || ("anonymous@"+this.options.name);
    
    // clone the recipients array for latter manipulation
    this._envelope.rcptQueue = JSON.parse(JSON.stringify(this._envelope.to || []));
    this._envelope.rcptFailed = [];
    
    this._currentAction = this._actionMAIL;
    this.sendCommand("MAIL FROM:<"+(this._envelope.from)+">");
};

/**
 * <p>If needed starts the authentication, if not emits 'idle' to
 * indicate that this client is ready to take in an outgoing mail</p>
 */
SMTPClient.prototype._authenticateUser = function(){
    
    if(!this.options.auth){
        // no need to authenticate, at least no data given
        this._currentAction = this._actionIdle;
        this.emit("idle"); // ready to take orders
        return;
    }
    
    var auth;
    if(this.options.auth.XOAuthToken && this._supportedAuth.indexOf("XOAUTH")>=0){
        auth = "XOAUTH";
    }else if(this._xoauth2 && this._supportedAuth.indexOf("XOAUTH2")>=0){
        auth = "XOAUTH2";
    }else if(this.options.authMethod) {
        auth = this.options.authMethod.toUpperCase().trim();
    }else{
        // use first supported
        auth = (this._supportedAuth[0] || "PLAIN").toUpperCase().trim();
    }
    
    switch(auth){
        case "XOAUTH":
            this._currentAction = this._actionAUTHComplete;
            
            if(typeof this.options.auth.XOAuthToken == "object" &&
              typeof this.options.auth.XOAuthToken.generate == "function"){
                this.options.auth.XOAuthToken.generate((function(err, XOAuthToken){
                    if(err){
                        return this._onError(err, "XOAuthTokenError");
                    }
                    this.sendCommand("AUTH XOAUTH " + XOAuthToken);
                }).bind(this));
            }else{
                this.sendCommand("AUTH XOAUTH " + this.options.auth.XOAuthToken.toString());
            }
            return;
        case "XOAUTH2":
            this._currentAction = this._actionAUTHComplete;
            this._xoauth2.getToken((function(err, token){
                if(err){
                    this._onError(err, "XOAUTH2Error");
                    return;
                }
                this.sendCommand("AUTH XOAUTH2 " + token);
            }).bind(this));
            return;
        case "LOGIN":
            this._currentAction = this._actionAUTH_LOGIN_USER;
            this.sendCommand("AUTH LOGIN");
            return;
        case "PLAIN":
            this._currentAction = this._actionAUTHComplete;
            this.sendCommand("AUTH PLAIN "+new Buffer(
                    this.options.auth.user+"\u0000"+
                    this.options.auth.user+"\u0000"+
                    this.options.auth.pass,"utf-8").toString("base64"));
            return;
        case "CRAM-MD5":
            this._currentAction = this._actionAUTH_CRAM_MD5;
            this.sendCommand("AUTH CRAM-MD5");
            return;
    }
    
    this._onError(new Error("Unknown authentication method - "+auth), "UnknowAuthError");
};

/** ACTIONS **/

/**
 * <p>Will be run after the connection is created and the server sends
 * a greeting. If the incoming message starts with 220 initiate
 * SMTP session by sending EHLO command</p>
 * 
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionGreeting = function(str){
    if(str.substr(0,3) != "220"){
        this._onError(new Error("Invalid greeting from server - "+str), false, str);
        return;
    }
    
    this._currentAction = this._actionEHLO;
    this.sendCommand("EHLO "+this.options.name);
};

/**
 * <p>Handles server response for EHLO command. If it yielded in
 * error, try HELO instead, otherwise initiate TLS negotiation
 * if STARTTLS is supported by the server or move into the
 * authentication phase.</p>
 * 
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionEHLO = function(str){
    if(str.charAt(0) != "2"){
        // This is a security failure if we want to perform a startTLS upgrade
        if (!this._secureMode && this.options.crypto === 'starttls') {
            this._onError(new Error("No EHLO support means no STARTTLS"),
                          "SecurityError");
            return;
        }

        // Try HELO instead
        this._currentAction = this._actionHELO;
        this.sendCommand("HELO "+this.options.name);
        return;
    }

    // If this is a STARTTLS connection, always attempt a STARTTLS upgrade.
    // This differs from upstream's behavior, in which a connection
    // requesting STARTTLS will downgrade to 'plain' if the server does
    // not support STARTTLS. We want to err on the side of security instead.
    if (!this._secureMode && this.options.crypto === 'starttls') {
        this.sendCommand("STARTTLS");
        this._currentAction = this._actionSTARTTLS;
        return; 
    }
    
    // Detect if the server supports PLAIN auth
    if(str.match(/AUTH(?:\s+[^\n]*\s+|\s+)PLAIN/i)){
        this._supportedAuth.push("PLAIN");
    }
    
    // Detect if the server supports LOGIN auth
    if(str.match(/AUTH(?:\s+[^\n]*\s+|\s+)LOGIN/i)){
        this._supportedAuth.push("LOGIN");
    }
    
    // Detect if the server supports CRAM-MD5 auth
    if(str.match(/AUTH(?:\s+[^\n]*\s+|\s+)CRAM-MD5/i)){
        this._supportedAuth.push("CRAM-MD5");
    }

    // Detect if the server supports XOAUTH auth
    if(str.match(/AUTH(?:\s+[^\n]*\s+|\s+)XOAUTH/i)){
        this._supportedAuth.push("XOAUTH");
    }

    // Detect if the server supports XOAUTH2 auth
    if(str.match(/AUTH(?:\s+[^\n]*\s+|\s+)XOAUTH2/i)){
        this._supportedAuth.push("XOAUTH2");
    }
    
    this._authenticateUser.call(this);
};

/**
 * <p>Handles server response for HELO command. If it yielded in
 * error, emit 'error', otherwise move into the authentication phase.</p>
 * 
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionHELO = function(str){
    if(str.charAt(0) != "2"){
        this._onError(new Error("Invalid response for EHLO/HELO - "+str), false, str);
        return;
    }
    this._authenticateUser.call(this);
};

/**
 * <p>Handles server response for STARTTLS command. If there's an error
 * try HELO instead, otherwise initiate TLS upgrade. If the upgrade
 * succeedes restart the EHLO</p>
 * 
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionSTARTTLS = function(str){
    if(str.charAt(0) != "2") {
        // If the server does not support STARTTLS, give up.
        this._onError(new Error("Error initiating TLS - " + str), "SecurityError");
        return;
    }
    
    this._upgradeConnection((function(err, secured){
        if(err){
            this._onError(new Error("Error initiating TLS - "+(err.message || err)), "TLSError");
            return;
        }
        if(this.options.debug){
            console.log("Connection secured");
        }
        
        if(secured){
            // restart session
            this._currentAction = this._actionEHLO;
            this.sendCommand("EHLO "+this.options.name);
        }else{
            this._authenticateUser.call(this);
        }
    }).bind(this));
};

/**
 * <p>Handle the response for AUTH LOGIN command. We are expecting
 * '334 VXNlcm5hbWU6' (base64 for 'Username:'). Data to be sent as
 * response needs to be base64 encoded username.</p>
 * 
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionAUTH_LOGIN_USER = function(str){
    if(str != "334 VXNlcm5hbWU6"){
        this._onError(new Error("Invalid login sequence while waiting for '334 VXNlcm5hbWU6' - "+str), false, str);
        return;
    }
    this._currentAction = this._actionAUTH_LOGIN_PASS;
    this.sendCommand(new Buffer(
            this.options.auth.user, "utf-8").toString("base64"));
};

/**
 * <p>Handle the response for AUTH CRAM-MD5 command. We are expecting
 * '334 <challenge string>'. Data to be sent as response needs to be
 * base64 decoded challenge string, MD5 hashed using the password as
 * a HMAC key, prefixed by the username and a space, and finally all
 * base64 encoded again.</p>
 *
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionAUTH_CRAM_MD5 = function(str) {
	var challengeMatch = str.match(/^334\s+(.+)$/),
		challengeString = "";

	if (!challengeMatch) {
		this._onError(new Error("Invalid login sequence while waiting for server challenge string - "+str), false, str);
		return;
	} else {
		challengeString = challengeMatch[1];
	}

	// Decode from base64
	var base64decoded = new Buffer(challengeString, 'base64').toString('ascii'),
		hmac_md5 = crypto.createHmac('md5', this.options.auth.pass);
	hmac_md5.update(base64decoded);
	var hex_hmac = hmac_md5.digest('hex'),
		prepended = this.options.auth.user + " " + hex_hmac;

    this._currentAction = this._actionAUTH_CRAM_MD5_PASS;

	this.sendCommand(new Buffer(prepended).toString("base64"));
};

/**
 * <p>Handles the response to CRAM-MD5 authentication, if there's no error,
 * the user can be considered logged in. Emit 'idle' and start
 * waiting for a message to send</p>
 *
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionAUTH_CRAM_MD5_PASS = function(str) {
	if (!str.match(/^235\s+/)) {
	    this._onError(new Error("Invalid login sequence while waiting for '235 go ahead' - "+str), false, str);
	    return;
	}
	this._currentAction = this._actionIdle;
	this.emit("idle"); // ready to take orders
};

/**
 * <p>Handle the response for AUTH LOGIN command. We are expecting
 * '334 UGFzc3dvcmQ6' (base64 for 'Password:'). Data to be sent as
 * response needs to be base64 encoded password.</p>
 * 
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionAUTH_LOGIN_PASS = function(str){
    if(str != "334 UGFzc3dvcmQ6"){
        this._onError(new Error("Invalid login sequence while waiting for '334 UGFzc3dvcmQ6' - "+str), false, str);
        return;
    }
    this._currentAction = this._actionAUTHComplete;
    this.sendCommand(new Buffer(this.options.auth.pass, "utf-8").toString("base64"));
};

/**
 * <p>Handles the response for authentication, if there's no error,
 * the user can be considered logged in. Emit 'idle' and start
 * waiting for a message to send</p>
 * 
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionAUTHComplete = function(str){
    var response;

    if(this._xoauth2 && str.substr(0, 3) == "334"){
        try{
            response = str.split(" ");
            response.shift();
            response = JSON.parse(new Buffer(response.join(" "), "base64").toString("utf-8"));

            if((!this._xoauth2.reconnectCount || this._xoauth2.reconnectCount < 2) && ['400','401'].indexOf(response.status)>=0){
                this._xoauth2.reconnectCount = (this._xoauth2.reconnectCount || 0) + 1;
                this._currentAction = this._actionXOAUTHRetry;
            }else{
                this._xoauth2.reconnectCount = 0;
                this._currentAction = this._actionAUTHComplete;
            }
            this.sendCommand(new Buffer(0));
            return;

        }catch(E){}
    }

    this._xoauth2.reconnectCount = 0;

    if(str.charAt(0) != "2"){
        this._onError(new Error("Invalid login - "+str), "AuthError", str);
        return;
    }
    
    this._currentAction = this._actionIdle;
    this.emit("idle"); // ready to take orders
};

SMTPClient.prototype._actionXOAUTHRetry = function(str){
    this._xoauth2.generateToken((function(err, token){
        if(err){
            this._onError(err, "XOAUTH2Error");
            return;
        }
        this._currentAction = this._actionAUTHComplete;
        this.sendCommand("AUTH XOAUTH2 " + token);
    }).bind(this));
}

/**
 * <p>This function is not expected to run. If it does then there's probably
 * an error (timeout etc.)</p>
 * 
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionIdle = function(str){
    if(Number(str.charAt(0)) > 3){
        this._onError(new Error(str), false, str);
        return;
    }
    
    // this line should never get called
};

/**
 * <p>Handle response for a <code>MAIL FROM:</code> command</p>
 * 
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionMAIL = function(str){
    if(Number(str.charAt(0)) != "2"){
        this._onError(new Error("Mail from command failed - " + str), "SenderError", str);
        return;
    }
    
    if(!this._envelope.rcptQueue.length){
        this._onError(new Error("Can't send mail - no recipients defined"), "RecipientError");
    }else{
        this._envelope.curRecipient = this._envelope.rcptQueue.shift();
        this._currentAction = this._actionRCPT;
        this.sendCommand("RCPT TO:<"+this._envelope.curRecipient+">");
    }
};

/**
 * <p>Handle response for a <code>RCPT TO:</code> command</p>
 * 
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionRCPT = function(str){
    if(Number(str.charAt(0)) != "2"){
        // this is a soft error
        this._envelope.rcptFailed.push(this._envelope.curRecipient);
    }
    
    if(!this._envelope.rcptQueue.length){
        if(this._envelope.rcptFailed.length < this._envelope.to.length){
            this.emit("rcptFailed", this._envelope.rcptFailed);
            this._currentAction = this._actionDATA;
            this.sendCommand("DATA");
        }else{
            this._onError(new Error("Can't send mail - all recipients were rejected"), "RecipientError");
            return;
        }
    }else{
        this._envelope.curRecipient = this._envelope.rcptQueue.shift();
        this._currentAction = this._actionRCPT;
        this.sendCommand("RCPT TO:<"+this._envelope.curRecipient+">");
    }
};

/**
 * <p>Handle response for a <code>DATA</code> command</p>
 * 
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionDATA = function(str){
    // response should be 354 but according to this issue https://github.com/eleith/emailjs/issues/24
    // some servers might use 250 instead, so lets check for 2 or 3 as the first digit
    if([2,3].indexOf(Number(str.charAt(0)))<0){
        this._onError(new Error("Data command failed - " + str), false, str);
        return;
    }
    
    // Emit that connection is set up for streaming
    this._dataMode = true;
    this._currentAction = this._actionIdle;
    this.emit("message");
};

/**
 * <p>Handle response for a <code>DATA</code> stream</p>
 * 
 * @param {String} str Message from the server
 */
SMTPClient.prototype._actionStream = function(str){
    if(Number(str.charAt(0)) != "2"){
        // Message failed
        this.emit("ready", false, str);
    }else{
        // Message sent succesfully
        this.emit("ready", true, str);
    }
    
    // Waiting for new connections
    this._currentAction = this._actionIdle;
    process.nextTick(this.emit.bind(this, "idle"));
};

});
/**
 * SMTP probe logic.
 **/

define('mailapi/smtp/probe',
  [
    'simplesmtp/lib/client',
    'exports'
  ],
  function(
    $simplesmtp,
    exports
  ) {

var setTimeoutFunc = window.setTimeout.bind(window),
    clearTimeoutFunc = window.clearTimeout.bind(window);

exports.TEST_useTimeoutFuncs = function(setFunc, clearFunc) {
  setTimeoutFunc = setFunc;
  clearTimeoutFunc = clearFunc;
};

exports.TEST_USE_DEBUG_MODE = false;

/**
 * How many milliseconds should we wait before giving up on the connection?
 *
 * I have a whole essay on the rationale for this in the IMAP prober.  Us, we
 * just want to use the same value as the IMAP prober.  This is a candidate for
 * centralization.
 */
exports.CONNECT_TIMEOUT_MS = 30000;

/**
 * Validate that we find an SMTP server using the connection info and that it
 * seems to like our credentials.
 *
 * Because the SMTP client has no connection timeout support, use our own timer
 * to decide when to give up on the SMTP connection.  We use the timer for the
 * whole process, including even after the connection is established.
 */
function SmtpProber(credentials, connInfo) {
  console.log("PROBE:SMTP attempting to connect to", connInfo.hostname);
  this._conn = $simplesmtp(
    connInfo.port, connInfo.hostname,
    {
      crypto: connInfo.crypto,
      auth: { user: credentials.username, pass: credentials.password },
      debug: exports.TEST_USE_DEBUG_MODE,
    });
  // onIdle happens after successful login, and so is what our probing uses.
  this._conn.on('idle', this.onResult.bind(this, null));
  this._conn.on('error', this.onResult.bind(this));
  this._conn.on('end', this.onResult.bind(this, 'unknown'));

  this.timeoutId = setTimeoutFunc(
                     this.onResult.bind(this, 'unresponsive-server'),
                     exports.CONNECT_TIMEOUT_MS);

  this.onresult = null;
  this.error = null;
  this.errorDetails = { server: connInfo.hostname };
}
exports.SmtpProber = SmtpProber;
SmtpProber.prototype = {
  onResult: function(err) {
    if (!this.onresult)
      return;
    if (err && typeof(err) === 'object') {
      // XXX just map all security errors as indicated by name
      if (err.name && /^Security/.test(err.name)) {
        err = 'bad-security';
      }
      else {
        switch (err.name) {
          case 'AuthError':
            err = 'bad-user-or-pass';
            break;
          case 'UnknownAuthError':
          default:
            err = 'server-problem';
            break;
        }
      }
    }

    this.error = err;
    if (err)
      console.warn('PROBE:SMTP sad. error: | ' + (err && err.name || err) +
                   ' | '  + (err && err.message || '') + ' |');
    else
      console.log('PROBE:SMTP happy');

    clearTimeoutFunc(this.timeoutId);

    this.onresult(this.error, this.errorDetails);
    this.onresult = null;

    this._conn.close();
  },
};

}); // end define
;