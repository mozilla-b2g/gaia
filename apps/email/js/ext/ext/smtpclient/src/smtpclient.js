// Copyright (c) 2013 Andris Reinman
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:

// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.

// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

(function(root, factory) {
    'use strict';

    if (typeof define === 'function' && define.amd) {
        define(['tcp-socket', 'stringencoding', 'axe', './smtpclient-response-parser'], function(TCPSocket, encoding, axe, SmtpClientResponseParser) {
            return factory(TCPSocket, encoding.TextEncoder, encoding.TextDecoder, axe, SmtpClientResponseParser, window.btoa);
        });
    } else if (typeof exports === 'object') {
        var encoding = require('stringencoding');
        module.exports = factory(require('tcp-socket'), encoding.TextEncoder, encoding.TextDecoder, require('axe'), require('./smtpclient-response-parser'), function(str) {
            return new Buffer(str).toString("base64");
        });
    } else {
        navigator.TCPSocket = navigator.TCPSocket || navigator.mozTCPSocket;
        root.SmtpClient = factory(navigator.TCPSocket, root.TextEncoder, root.TextDecoder, root.axe, root.SmtpClientResponseParser, window.btoa);
    }
}(this, function(TCPSocket, TextEncoder, TextDecoder, axe, SmtpClientResponseParser, btoa) {
    'use strict';

    var DEBUG_TAG = 'SMTP Client';

    /**
     * Creates a connection object to a SMTP server and allows to send mail through it.
     * Call `connect` method to inititate the actual connection, the constructor only
     * defines the properties but does not actually connect.
     *
     * NB! The parameter order (host, port) differs from node.js "way" (port, host)
     *
     * @constructor
     *
     * @param {String} [host="localhost"] Hostname to conenct to
     * @param {Number} [port=25] Port number to connect to
     * @param {Object} [options] Optional options object
     * @param {Boolean} [options.useSecureTransport] Set to true, to use encrypted connection
     * @param {String} [options.name] Client hostname for introducing itself to the server
     * @param {Object} [options.auth] Authentication options. Depends on the preferred authentication method. Usually {user, pass}
     * @param {String} [options.authMethod] Force specific authentication method
     * @param {Boolean} [options.disableEscaping] If set to true, do not escape dots on the beginning of the lines
     */
    function SmtpClient(host, port, options) {
        this._TCPSocket = TCPSocket;

        this.options = options || {};

        this.port = port || (this.options.useSecureTransport ? 465 : 25);
        this.host = host || 'localhost';

        /**
         * If set to true, start an encrypted connection instead of the plaintext one
         * (recommended if applicable). If useSecureTransport is not set but the port used is 465,
         * then ecryption is used by default.
         */
        this.options.useSecureTransport = 'useSecureTransport' in this.options ? !!this.options.useSecureTransport : this.port === 465;

        /**
         * Authentication object. If not set, authentication step will be skipped.
         */
        this.options.auth = this.options.auth || false;

        /**
         * Hostname of the client, this will be used for introducing to the server
         */
        this.options.name = this.options.name || 'localhost';

        /**
         * Downstream TCP socket to the SMTP server, created with mozTCPSocket
         */
        this.socket = false;

        /**
         * Indicates if the connection has been closed and can't be used anymore
         *
         */
        this.destroyed = false;

        /**
         * Informational value that indicates the maximum size (in bytes) for
         * a message sent to the current server. Detected from SIZE info.
         * Not available until connection has been established.
         */
        this.maxAllowedSize = 0;

        /**
         * Keeps track if the downstream socket is currently full and
         * a drain event should be waited for or not
         */
        this.waitDrain = false;

        // Private properties

        /**
         * SMTP response parser object. All data coming from the downstream server
         * is feeded to this parser
         */
        this._parser = new SmtpClientResponseParser();

        /**
         * If authenticated successfully, stores the username
         */
        this._authenticatedAs = null;

        /**
         * A list of authentication mechanisms detected from the EHLO response
         * and which are compatible with this library
         */
        this._supportedAuth = [];

        /**
         * If true, accepts data from the upstream to be passed
         * directly to the downstream socket. Used after the DATA command
         */
        this._dataMode = false;

        /**
         * Keep track of the last bytes to see how the terminating dot should be placed
         */
        this._lastDataBytes = '';

        /**
         * Envelope object for tracking who is sending mail to whom
         */
        this._envelope = null;

        /**
         * Stores the function that should be run after a response has been received
         * from the server
         */
        this._currentAction = null;

        /**
         * If STARTTLS support lands in TCPSocket, _secureMode can be set to
         * true, once the connection is upgraded
         */
        this._secureMode = !!this.options.useSecureTransport;
    }

    //
    // EVENTS
    //

    // Event functions should be overriden, these are just placeholders

    /**
     * Will be run when an error occurs. Connection to the server will be closed automatically,
     * so wait for an `onclose` event as well.
     *
     * @param {Error} err Error object
     */
    SmtpClient.prototype.onerror = function() {};

    /**
     * More data can be buffered in the socket. See `waitDrain` property or
     * check if `send` method returns false to see if you should be waiting
     * for the drain event. Before sending anything else.
     */
    SmtpClient.prototype.ondrain = function() {};

    /**
     * The connection to the server has been closed
     */
    SmtpClient.prototype.onclose = function() {};

    /**
     * The connection is established and idle, you can send mail now
     */
    SmtpClient.prototype.onidle = function() {};

    /**
     * The connection is waiting for the mail body
     *
     * @param {Array} failedRecipients List of addresses that were not accepted as recipients
     */
    SmtpClient.prototype.onready = function() {};

    /**
     * The mail has been sent.
     * Wait for `onidle` next.
     *
     * @param {Boolean} success Indicates if the message was queued by the server or not
     */
    SmtpClient.prototype.ondone = function() {};

    //
    // PUBLIC METHODS
    //

    // Connection related methods

    /**
     * Initiate a connection to the server
     */
    SmtpClient.prototype.connect = function() {
        this.socket = this._TCPSocket.open(this.host, this.port, {
            /*
                I wanted to use "string" at first but realized that if a
                STARTTLS would have to be implemented not in the socket level
                in the future, then the stream must be binary
            */
            binaryType: 'arraybuffer',
            useSecureTransport: this._secureMode,
            ca: this.options.ca
        });

        this.socket.oncert = this.oncert;
        this.socket.onerror = this._onError.bind(this);
        this.socket.onopen = this._onOpen.bind(this);
    };

    /**
     * Pauses `data` events from the downstream SMTP server
     */
    SmtpClient.prototype.suspend = function() {
        if (this.socket && this.socket.readyState === 'open') {
            this.socket.suspend();
        }
    };

    /**
     * Resumes `data` events from the downstream SMTP server. Be careful of not
     * resuming something that is not suspended - an error is thrown in this case
     */
    SmtpClient.prototype.resume = function() {
        if (this.socket && this.socket.readyState === 'open') {
            this.socket.resume();
        }
    };

    /**
     * Sends QUIT
     */
    SmtpClient.prototype.quit = function() {
        axe.debug(DEBUG_TAG, 'Sending QUIT...');
        this._sendCommand('QUIT');
        this._currentAction = this.close;
    };

    /**
     * Reset authentication
     *
     * @param {Object} [auth] Use this if you want to authenticate as another user
     */
    SmtpClient.prototype.reset = function(auth) {
        this.options.auth = auth || this.options.auth;
        axe.debug(DEBUG_TAG, 'Sending RSET...');
        this._sendCommand('RSET');
        this._currentAction = this._actionRSET;
    };

    /**
     * Closes the connection to the server
     */
    SmtpClient.prototype.close = function() {
        axe.debug(DEBUG_TAG, 'Closing connection...');
        if (this.socket && this.socket.readyState === 'open') {
            this.socket.close();
        } else {
            this._destroy();
        }
    };

    // Mail related methods

    /**
     * Initiates a new message by submitting envelope data, starting with
     * `MAIL FROM:` command. Use after `onidle` event
     *
     * @param {Object} envelope Envelope object in the form of {from:"...", to:["..."]}
     */
    SmtpClient.prototype.useEnvelope = function(envelope) {
        this._envelope = envelope || {};
        this._envelope.from = [].concat(this._envelope.from || ('anonymous@' + this.options.name))[0];
        this._envelope.to = [].concat(this._envelope.to || []);

        // clone the recipients array for latter manipulation
        this._envelope.rcptQueue = [].concat(this._envelope.to);
        this._envelope.rcptFailed = [];

        this._currentAction = this._actionMAIL;
        axe.debug(DEBUG_TAG, 'Sending MAIL FROM...');
        this._sendCommand('MAIL FROM:<' + (this._envelope.from) + '>');
    };


    /**
     * Send ASCII data to the server. Works only in data mode (after `onready` event), ignored
     * otherwise
     *
     * @param {String} chunk ASCII string (quoted-printable, base64 etc.) to be sent to the server
     * @return {Boolean} If true, it is safe to send more data, if false, you *should* wait for the ondrain event before sending more
     */
    SmtpClient.prototype.send = function(chunk) {
        // works only in data mode
        if (!this._dataMode) {
            // this line should never be reached but if it does,
            // act like everything's normal.
            return true;
        }

        // TODO: if the chunk is an arraybuffer, use a separate function to send the data
        return this._sendString(chunk);
    };

    /**
     * Indicates that a data stream for the socket is ended. Works only in data
     * mode (after `onready` event), ignored otherwise. Use it when you are done
     * with sending the mail. This method does not close the socket. Once the mail
     * has been queued by the server, `ondone` and `onidle` are emitted.
     *
     * @param {Buffer} [chunk] Chunk of data to be sent to the server
     */
    SmtpClient.prototype.end = function(chunk) {
        // works only in data mode
        if (!this._dataMode) {
            // this line should never be reached but if it does,
            // act like everything's normal.
            return true;
        }

        if (chunk && chunk.length) {
            this.send(chunk);
        }

        // redirect output from the server to _actionStream
        this._currentAction = this._actionStream;

        // indicate that the stream has ended by sending a single dot on its own line
        // if the client already closed the data with \r\n no need to do it again
        if (this._lastDataBytes === '\r\n') {
            this.waitDrain = this.socket.send(new Uint8Array([0x2E, 0x0D, 0x0A]).buffer); // .\r\n
        } else if (this._lastDataBytes.substr(-1) === '\r') {
            this.waitDrain = this.socket.send(new Uint8Array([0x0A, 0x2E, 0x0D, 0x0A]).buffer); // \n.\r\n
        } else {
            this.waitDrain = this.socket.send(new Uint8Array([0x0D, 0x0A, 0x2E, 0x0D, 0x0A]).buffer); // \r\n.\r\n
        }

        // end data mode
        this._dataMode = false;

        return this.waitDrain;
    };

    // PRIVATE METHODS

    // EVENT HANDLERS FOR THE SOCKET

    /**
     * Connection listener that is run when the connection to the server is opened.
     * Sets up different event handlers for the opened socket
     *
     * @event
     * @param {Event} evt Event object. Not used
     */
    SmtpClient.prototype._onOpen = function() {
        this.socket.ondata = this._onData.bind(this);

        this.socket.onclose = this._onClose.bind(this);
        this.socket.ondrain = this._onDrain.bind(this);

        this._parser.ondata = this._onCommand.bind(this);

        this._currentAction = this._actionGreeting;
    };

    /**
     * Data listener for chunks of data emitted by the server
     *
     * @event
     * @param {Event} evt Event object. See `evt.data` for the chunk received
     */
    SmtpClient.prototype._onData = function(evt) {
        var stringPayload = new TextDecoder('UTF-8').decode(new Uint8Array(evt.data));
        axe.debug(DEBUG_TAG, 'SERVER: ' + stringPayload);
        this._parser.send(stringPayload);
    };

    /**
     * More data can be buffered in the socket, `waitDrain` is reset to false
     *
     * @event
     * @param {Event} evt Event object. Not used
     */
    SmtpClient.prototype._onDrain = function() {
        this.waitDrain = false;
        this.ondrain();
    };

    /**
     * Error handler for the socket
     *
     * @event
     * @param {Event} evt Event object. See evt.data for the error
     */
    SmtpClient.prototype._onError = function(evt) {
        if (evt instanceof Error && evt.message) {
            axe.error(DEBUG_TAG, evt);
            this.onerror(evt);
        } else if (evt && evt.data instanceof Error) {
            axe.error(DEBUG_TAG, evt.data);
            this.onerror(evt.data);
        } else {
            axe.error(DEBUG_TAG, new Error(evt && evt.data && evt.data.message || evt.data || evt || 'Error'));
            this.onerror(new Error(evt && evt.data && evt.data.message || evt.data || evt || 'Error'));
        }

        this.close();
    };

    /**
     * Indicates that the socket has been closed
     *
     * @event
     * @param {Event} evt Event object. Not used
     */
    SmtpClient.prototype._onClose = function() {
        axe.debug(DEBUG_TAG, 'Socket closed.');
        this._destroy();
    };

    /**
     * This is not a socket data handler but the handler for data emitted by the parser,
     * so this data is safe to use as it is always complete (server might send partial chunks)
     *
     * @event
     * @param {Object} command Parsed data
     */
    SmtpClient.prototype._onCommand = function(command) {
        if (typeof this._currentAction === 'function') {
            this._currentAction.call(this, command);
        }
    };

    /**
     * Ensures that the connection is closed and such
     */
    SmtpClient.prototype._destroy = function() {
        if (!this.destroyed) {
            this.destroyed = true;
            this.onclose();
        }
    };

    /**
     * Sends a string to the socket.
     *
     * @param {String} chunk ASCII string (quoted-printable, base64 etc.) to be sent to the server
     * @return {Boolean} If true, it is safe to send more data, if false, you *should* wait for the ondrain event before sending more
     */
    SmtpClient.prototype._sendString = function(chunk) {
        // escape dots
        if (!this.options.disableEscaping) {
            chunk = chunk.replace(/\n\./g, '\n..');
            if ((this._lastDataBytes.substr(-1) === '\n' || !this._lastDataBytes) && chunk.charAt(0) === '.') {
                chunk = '.' + chunk;
            }
        }

        // Keeping eye on the last bytes sent, to see if there is a <CR><LF> sequence
        // at the end which is needed to end the data stream
        if (chunk.length > 2) {
            this._lastDataBytes = chunk.substr(-2);
        } else if (chunk.length === 1) {
            this._lastDataBytes = this._lastDataBytes.substr(-1) + chunk;
        }

        axe.debug(DEBUG_TAG, 'Sending ' + chunk.length + ' bytes of payload');

        // pass the chunk to the socket
        this.waitDrain = this.socket.send(new TextEncoder('UTF-8').encode(chunk).buffer);
        return this.waitDrain;
    };

    /**
     * Send a string command to the server, also append \r\n if needed
     *
     * @param {String} str String to be sent to the server
     */
    SmtpClient.prototype._sendCommand = function(str) {
        this.waitDrain = this.socket.send(new TextEncoder('UTF-8').encode(str + (str.substr(-2) !== '\r\n' ? '\r\n' : '')).buffer);
    };

    /**
     * Intitiate authentication sequence if needed
     */
    SmtpClient.prototype._authenticateUser = function() {

        if (!this.options.auth) {
            // no need to authenticate, at least no data given
            this._currentAction = this._actionIdle;
            this.onidle(); // ready to take orders
            return;
        }

        var auth;

        if (!this.options.authMethod && this.options.auth.xoauth2) {
            this.options.authMethod = 'XOAUTH2';
        }

        if (this.options.authMethod) {
            auth = this.options.authMethod.toUpperCase().trim();
        } else {
            // use first supported
            auth = (this._supportedAuth[0] || 'PLAIN').toUpperCase().trim();
        }

        switch (auth) {
            case 'LOGIN':
                // LOGIN is a 3 step authentication process
                // C: AUTH LOGIN
                // C: BASE64(USER)
                // C: BASE64(PASS)
                axe.debug(DEBUG_TAG, 'Authentication via AUTH LOGIN');
                this._currentAction = this._actionAUTH_LOGIN_USER;
                this._sendCommand('AUTH LOGIN');
                return;
            case 'PLAIN':
                // AUTH PLAIN is a 1 step authentication process
                // C: AUTH PLAIN BASE64(\0 USER \0 PASS)
                axe.debug(DEBUG_TAG, 'Authentication via AUTH PLAIN');
                this._currentAction = this._actionAUTHComplete;
                this._sendCommand(
                    // convert to BASE64
                    'AUTH PLAIN ' +
                    btoa(unescape(encodeURIComponent(
                        //this.options.auth.user+'\u0000'+
                        '\u0000' + // skip authorization identity as it causes problems with some servers
                        this.options.auth.user + '\u0000' +
                        this.options.auth.pass))));
                return;
            case 'XOAUTH2':
                // See https://developers.google.com/gmail/xoauth2_protocol#smtp_protocol_exchange
                axe.debug(DEBUG_TAG, 'Authentication via AUTH XOAUTH2');
                this._currentAction = this._actionAUTH_XOAUTH2;
                this._sendCommand('AUTH XOAUTH2 ' + this._buildXOAuth2Token(this.options.auth.user, this.options.auth.xoauth2));
                return;
        }

        this._onError(new Error('Unknown authentication method ' + auth));
    };

    // ACTIONS FOR RESPONSES FROM THE SMTP SERVER

    /**
     * Initial response from the server, must have a status 220
     *
     * @param {Object} command Parsed command from the server {statusCode, data, line}
     */
    SmtpClient.prototype._actionGreeting = function(command) {
        if (command.statusCode !== 220) {
            this._onError(new Error('Invalid greeting: ' + command.data));
            return;
        }

        axe.debug(DEBUG_TAG, 'Sending EHLO ' + this.options.name);

        this._currentAction = this._actionEHLO;
        this._sendCommand('EHLO ' + this.options.name);
    };

    /**
     * Response to EHLO. If the response is an error, try HELO instead
     *
     * @param {Object} command Parsed command from the server {statusCode, data, line}
     */
    SmtpClient.prototype._actionEHLO = function(command) {
        var match;

        if (!command.success) {
            // Try HELO instead
            axe.warn(DEBUG_TAG, 'EHLO not successful, trying HELO ' + this.options.name);
            this._currentAction = this._actionHELO;
            this._sendCommand('HELO ' + this.options.name);
            return;
        }

        // Detect if the server supports PLAIN auth
        if (command.line.match(/AUTH(?:\s+[^\n]*\s+|\s+)PLAIN/i)) {
            axe.debug(DEBUG_TAG, 'Server supports AUTH PLAIN');
            this._supportedAuth.push('PLAIN');
        }

        // Detect if the server supports LOGIN auth
        if (command.line.match(/AUTH(?:\s+[^\n]*\s+|\s+)LOGIN/i)) {
            axe.debug(DEBUG_TAG, 'Server supports AUTH LOGIN');
            this._supportedAuth.push('LOGIN');
        }

        // Detect if the server supports XOAUTH2 auth
        if (command.line.match(/AUTH(?:\s+[^\n]*\s+|\s+)XOAUTH2/i)) {
            axe.debug(DEBUG_TAG, 'Server supports AUTH XOAUTH2');
            this._supportedAuth.push('XOAUTH2');
        }

        // Detect maximum allowed message size
        if ((match = command.line.match(/SIZE (\d+)/i)) && Number(match[1])) {
            this._maxAllowedSize = Number(match[1]);
            axe.debug(DEBUG_TAG, 'Maximum allowd message size: ' + this._maxAllowedSize);
        }

        this._authenticateUser.call(this);
    };

    /**
     * Response to HELO
     *
     * @param {Object} command Parsed command from the server {statusCode, data, line}
     */
    SmtpClient.prototype._actionHELO = function(command) {
        if (!command.success) {
            axe.error(DEBUG_TAG, 'HELO not successful');
            this._onError(new Error(command.data));
            return;
        }
        this._authenticateUser.call(this);
    };

    /**
     * Response to AUTH LOGIN, if successful expects base64 encoded username
     *
     * @param {Object} command Parsed command from the server {statusCode, data, line}
     */
    SmtpClient.prototype._actionAUTH_LOGIN_USER = function(command) {
        if (command.statusCode !== 334 || command.data !== 'VXNlcm5hbWU6') {
            axe.error(DEBUG_TAG, 'AUTH LOGIN USER not successful: ' + command.data);
            this._onError(new Error('Invalid login sequence while waiting for "334 VXNlcm5hbWU6 ": ' + command.data));
            return;
        }
        axe.debug(DEBUG_TAG, 'AUTH LOGIN USER successful');
        this._currentAction = this._actionAUTH_LOGIN_PASS;
        this._sendCommand(btoa(unescape(encodeURIComponent(this.options.auth.user))));
    };

    /**
     * Response to AUTH LOGIN username, if successful expects base64 encoded password
     *
     * @param {Object} command Parsed command from the server {statusCode, data, line}
     */
    SmtpClient.prototype._actionAUTH_LOGIN_PASS = function(command) {
        if (command.statusCode !== 334 || command.data !== 'UGFzc3dvcmQ6') {
            axe.error(DEBUG_TAG, 'AUTH LOGIN PASS not successful: ' + command.data);
            this._onError(new Error('Invalid login sequence while waiting for "334 UGFzc3dvcmQ6 ": ' + command.data));
            return;
        }
        axe.debug(DEBUG_TAG, 'AUTH LOGIN PASS successful');
        this._currentAction = this._actionAUTHComplete;
        this._sendCommand(btoa(unescape(encodeURIComponent(this.options.auth.pass))));
    };

    /**
     * Response to AUTH XOAUTH2 token, if error occurs send empty response
     *
     * @param {Object} command Parsed command from the server {statusCode, data, line}
     */
    SmtpClient.prototype._actionAUTH_XOAUTH2 = function(command) {
        if (!command.success) {
            axe.warn(DEBUG_TAG, 'Error during AUTH XOAUTH2, sending empty response');
            this._sendCommand('');
            this._currentAction = this._actionAUTHComplete;
        } else {
            this._actionAUTHComplete(command);
        }
    };

    /**
     * Checks if authentication succeeded or not. If successfully authenticated
     * emit `idle` to indicate that an e-mail can be sent using this connection
     *
     * @param {Object} command Parsed command from the server {statusCode, data, line}
     */
    SmtpClient.prototype._actionAUTHComplete = function(command) {
        if (!command.success) {
            axe.debug(DEBUG_TAG, 'Authentication failed: ' + command.data);
            this._onError(new Error(command.data));
            return;
        }

        axe.debug(DEBUG_TAG, 'Authentication successful.');

        this._authenticatedAs = this.options.auth.user;

        this._currentAction = this._actionIdle;
        this.onidle(); // ready to take orders
    };

    /**
     * Used when the connection is idle and the server emits timeout
     *
     * @param {Object} command Parsed command from the server {statusCode, data, line}
     */
    SmtpClient.prototype._actionIdle = function(command) {
        if (command.statusCode > 300) {
            this._onError(new Error(command.line));
            return;
        }

        this._onError(new Error(command.data));
    };

    /**
     * Response to MAIL FROM command. Proceed to defining RCPT TO list if successful
     *
     * @param {Object} command Parsed command from the server {statusCode, data, line}
     */
    SmtpClient.prototype._actionMAIL = function(command) {
        if (!command.success) {
            axe.debug(DEBUG_TAG, 'MAIL FROM unsuccessful: ' + command.data);
            this._onError(new Error(command.data));
            return;
        }

        if (!this._envelope.rcptQueue.length) {
            this._onError(new Error('Can\'t send mail - no recipients defined'));
        } else {
            axe.debug(DEBUG_TAG, 'MAIL FROM successful, proceeding with ' + this._envelope.rcptQueue.length + ' recipients');
            axe.debug(DEBUG_TAG, 'Adding recipient...');
            this._envelope.curRecipient = this._envelope.rcptQueue.shift();
            this._currentAction = this._actionRCPT;
            this._sendCommand('RCPT TO:<' + this._envelope.curRecipient + '>');
        }
    };

    /**
     * Response to a RCPT TO command. If the command is unsuccessful, try the next one,
     * as this might be related only to the current recipient, not a global error, so
     * the following recipients might still be valid
     *
     * @param {Object} command Parsed command from the server {statusCode, data, line}
     */
    SmtpClient.prototype._actionRCPT = function(command) {
        if (!command.success) {
            axe.warn(DEBUG_TAG, 'RCPT TO failed for: ' + this._envelope.curRecipient);
            // this is a soft error
            this._envelope.rcptFailed.push(this._envelope.curRecipient);
        }

        if (!this._envelope.rcptQueue.length) {
            if (this._envelope.rcptFailed.length < this._envelope.to.length) {
                this._currentAction = this._actionDATA;
                axe.debug(DEBUG_TAG, 'RCPT TO done, proceeding with payload');
                this._sendCommand('DATA');
            } else {
                this._onError(new Error('Can\'t send mail - all recipients were rejected'));
                this._currentAction = this._actionIdle;
                return;
            }
        } else {
            axe.debug(DEBUG_TAG, 'Adding recipient...');
            this._envelope.curRecipient = this._envelope.rcptQueue.shift();
            this._currentAction = this._actionRCPT;
            this._sendCommand('RCPT TO:<' + this._envelope.curRecipient + '>');
        }
    };

    /**
     * Response to the RSET command. If successful, clear the current authentication
     * information and reauthenticate.
     *
     * @param {Object} command Parsed command from the server {statusCode, data, line}
     */
    SmtpClient.prototype._actionRSET = function(command) {
        if (!command.success) {
            axe.error(DEBUG_TAG, 'RSET unsuccessful ' + command.data);
            this._onError(new Error(command.data));
            return;
        }

        this._authenticatedAs = null;

        this._authenticateUser.call(this);
    };

    /**
     * Response to the DATA command. Server is now waiting for a message, so emit `onready`
     *
     * @param {Object} command Parsed command from the server {statusCode, data, line}
     */
    SmtpClient.prototype._actionDATA = function(command) {
        // response should be 354 but according to this issue https://github.com/eleith/emailjs/issues/24
        // some servers might use 250 instead
        if ([250, 354].indexOf(command.statusCode) < 0) {
            axe.error(DEBUG_TAG, 'DATA unsuccessful ' + command.data);
            this._onError(new Error(command.data));
            return;
        }

        this._dataMode = true;
        this._currentAction = this._actionIdle;
        this.onready(this._envelope.rcptFailed);
    };

    /**
     * Response from the server, once the message stream has ended with <CR><LF>.<CR><LF>
     * Emits `ondone`.
     *
     * @param {Object} command Parsed command from the server {statusCode, data, line}
     */
    SmtpClient.prototype._actionStream = function(command) {
        this._currentAction = this._actionIdle;

        if (!command.success) {
            // Message failed
            axe.error(DEBUG_TAG, 'Message sending failed.');
            this.ondone(false);
        } else {
            axe.debug(DEBUG_TAG, 'Message sent successfully.');
            // Message sent succesfully
            this.ondone(true);
        }

        // If the client wanted to do something else (eg. to quit), do not force idle
        if (this._currentAction === this._actionIdle) {
            // Waiting for new connections
            axe.debug(DEBUG_TAG, 'Idling while waiting for new connections...');
            this.onidle();
        }
    };

    /**
     * Builds a login token for XOAUTH2 authentication command
     *
     * @param {String} user E-mail address of the user
     * @param {String} token Valid access token for the user
     * @return {String} Base64 formatted login token
     */
    SmtpClient.prototype._buildXOAuth2Token = function(user, token) {
        var authData = [
            'user=' + (user || ''),
            'auth=Bearer ' + token,
            '',
            ''
        ];
        // base64("user={User}\x00auth=Bearer {Token}\x00\x00")
        return btoa(unescape(encodeURIComponent(authData.join('\x01'))));
    };

    return SmtpClient;
}));
