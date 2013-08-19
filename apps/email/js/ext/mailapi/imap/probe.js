
/**
 * Make our TCPSocket implementation look like node's net library.
 *
 * We make sure to support:
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

  var args = [host, port, { useSSL: crypto, binaryType: 'arraybuffer' }];
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
NetSocket.prototype.write = function(buffer) {
  this._sendMessage('write', [buffer.buffer, buffer.byteOffset, buffer.length]);
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

exports.connect = function(port, host) {
  return new NetSocket(port, host, false);
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
define('imap',['require','exports','module','util','rdcommon/log','net','tls','events','mailparser/mailparser'],function(require, exports, module) {
var util = require('util'), $log = require('rdcommon/log'),
    net = require('net'), tls = require('tls'),
    EventEmitter = require('events').EventEmitter,
    mailparser = require('mailparser/mailparser');

var emptyFn = function() {}, CRLF = '\r\n',
    CRLF_BUFFER = Buffer(CRLF),
    STATES = {
      NOCONNECT: 0,
      NOAUTH: 1,
      AUTH: 2,
      BOXSELECTING: 3,
      BOXSELECTED: 4
    }, BOX_ATTRIBS = ['NOINFERIORS', 'NOSELECT', 'MARKED', 'UNMARKED'],
    MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep',
              'Oct', 'Nov', 'Dec'],
    reFetch = /^\* (\d+) FETCH [\s\S]+? \{(\d+)\}$/,
    reUid = /UID (\d+)/,
    reBodyPart = /BODY/,
    reDate = /^(\d{2})-(.{3})-(\d{4})$/,
    reDateTime = /^(\d{2})-(.{3})-(\d{4}) (\d{2}):(\d{2}):(\d{2}) ([+-]\d{4})$/,
    HOUR_MILLIS = 60 * 60 * 1000, MINUTE_MILLIS = 60 * 1000;

const CHARCODE_RBRACE = ('}').charCodeAt(0),
      CHARCODE_ASTERISK = ('*').charCodeAt(0),
      CHARCODE_RPAREN = (')').charCodeAt(0);

var setTimeoutFunc = window.setTimeout.bind(window),
    clearTimeoutFunc = window.clearTimeout.bind(window);

exports.TEST_useTimeoutFuncs = function(setFunc, clearFunc) {
  setTimeoutFunc = setFunc;
  clearTimeoutFunc = clearFunc;
};

/**
 * A buffer for us to assemble buffers so the back-end doesn't fragment them.
 * This is safe for mozTCPSocket's buffer usage because the buffer is always
 * consumed synchronously.  This is not necessarily safe under other semantics.
 */
var gSendBuf = new Uint8Array(2000);

function singleArgParseInt(x) {
  return parseInt(x, 10);
}

/**
 * Parses (UTC) IMAP dates into UTC timestamps. IMAP dates are DD-Mon-YYYY.
 */
function parseImapDate(dstr) {
  var match = reDate.exec(dstr);
  if (!match)
    throw new Error("Not a good IMAP date: " + dstr);
  var day = parseInt(match[1], 10),
      zeroMonth = MONTHS.indexOf(match[2]),
      year = parseInt(match[3], 10);
  return Date.UTC(year, zeroMonth, day);
}

/**
 * Modified utf-7 detecting regexp for use by `decodeModifiedUtf7`.
 */
const RE_MUTF7 = /&([^-]*)-/g,
      RE_COMMA = /,/g;
/**
 * Decode the modified utf-7 representation used to encode mailbox names to
 * lovely unicode.
 *
 * Notes:
 * - '&' enters mutf-7 mode, '-' exits it (and exiting is required!), but '&-'
 *    encodes a '&' rather than * a zero-length string.
 * - ',' is used instead of '/' for the base64 encoding
 *
 * Learn all about it at:
 * https://tools.ietf.org/html/rfc3501#section-5.1.3
 */
function decodeModifiedUtf7(encoded) {
  return encoded.replace(
    RE_MUTF7,
    function replacer(fullMatch, b64data) {
      // &- encodes &
      if (!b64data.length)
        return '&';
      // we use a funky base64 where ',' is used instead of '/'...
      b64data = b64data.replace(RE_COMMA, '/');
      // The base-64 encoded utf-16 gets converted into a buffer holding the
      // utf-16 encoded bits.
      var u16data = new Buffer(b64data, 'base64');
      // and this actually decodes the utf-16 into a JS string.
      return u16data.toString('utf-16be');
    });
}
exports.decodeModifiedUtf7 = decodeModifiedUtf7;

/**
 * Parses IMAP date-times into UTC timestamps.  IMAP date-times are
 * "DD-Mon-YYYY HH:MM:SS +ZZZZ"
 */
function parseImapDateTime(dstr) {
  var match = reDateTime.exec(dstr);
  if (!match)
    throw new Error("Not a good IMAP date-time: " + dstr);
  var day = parseInt(match[1], 10),
      zeroMonth = MONTHS.indexOf(match[2]),
      year = parseInt(match[3], 10),
      hours = parseInt(match[4], 10),
      minutes = parseInt(match[5], 10),
      seconds = parseInt(match[6], 10),
      // figure the timestamp before the zone stuff.  We don't
      timestamp = Date.UTC(year, zeroMonth, day, hours, minutes, seconds),
      // to reduce string garbage creation, we use one string. (we have to
      // play math games no matter what, anyways.)
      zoneDelta = parseInt(match[7], 10),
      zoneHourDelta = Math.floor(zoneDelta / 100),
      // (the negative sign sticks around through the mod operation)
      zoneMinuteDelta = zoneDelta % 100;

  // ex: GMT-0700 means 7 hours behind, so we need to add 7 hours, aka
  // subtract negative 7 hours.
  timestamp -= zoneHourDelta * HOUR_MILLIS + zoneMinuteDelta * MINUTE_MILLIS;

  return timestamp;
}

function formatImapDateTime(date) {
  var s;
  s = ((date.getDate() < 10) ? ' ' : '') + date.getDate() + '-' +
       MONTHS[date.getMonth()] + '-' +
       date.getFullYear() + ' ' +
       ('0'+date.getHours()).slice(-2) + ':' +
       ('0'+date.getMinutes()).slice(-2) + ':' +
       ('0'+date.getSeconds()).slice(-2) +
       ((date.getTimezoneOffset() > 0) ? ' -' : ' +' ) +
       ('0'+(Math.abs(date.getTimezoneOffset()) / 60)).slice(-2) +
       ('0'+(Math.abs(date.getTimezoneOffset()) % 60)).slice(-2);
  return s;
}

var IDLE_NONE = 1,
    IDLE_WAIT = 2,
    IDLE_READY = 3,
    DONE_WAIT = 4;

function ImapConnection (options) {
  if (!(this instanceof ImapConnection))
    return new ImapConnection(options);
  EventEmitter.call(this);

  this._options = {
    username: '',
    password: '',
    host: 'localhost',
    port: 143,
    secure: false,
    connTimeout: 10000, // connection timeout in msecs
    _logParent: null
  };
  this._state = {
    status: STATES.NOCONNECT,
    conn: null,
    curId: 0,
    requests: [],
    unsentRequests: [],
    activeRequests: 0,
    numCapRecvs: 0,
    isReady: false,
    isIdle: true,
    tmrKeepalive: null,
    tmoKeepalive: 10000,
    tmrConn: null,
    curData: null,
    // Because 0-length literals are a possibility, use null to represent no
    // expected data.
    curExpected: null,
    curXferred: 0,
    box: {
      _uidnext: 0,
      _flags: [],
      _newKeywords: false,
      validity: 0,
      // undefined when unknown, null is nomodseq, string of the actual
      // highestmodseq once retrieved.
      highestModSeq: undefined,
      keywords: [],
      permFlags: [],
      name: null,
      messages: { total: 0, new: 0 }
    },
    ext: {
      // Capability-specific state info
      idle: {
        MAX_WAIT: 1740000, // 29 mins in ms
        state: IDLE_NONE,
        timeWaited: 0 // ms
      }
    }
  };
  this._unprocessed = [];
  this._options = extend(this._options, options);
  // The Date.now thing is to assign a random/unique value as a logging stop-gap
  this._LOG = (this._options._logParent ? LOGFAB.ImapProtoConn(this, this._options._logParent, Date.now() % 1000) : null);
  if (this._LOG) this._LOG.created();
  this.delim = null;
  this.namespaces = { personal: [], other: [], shared: [] };
  this.capabilities = [];
  this.enabledCapabilities = [];
  // The list of capabilities the server advertises that we want to ignore
  // because they are broken on the server.  If blacklisting at runtime, use
  // the blacklistCapability method.
  this.blacklistedCapabilities = this._options.blacklistedCapabilities || [];
};
util.inherits(ImapConnection, EventEmitter);
exports.ImapConnection = ImapConnection;

ImapConnection.prototype.hasCapability = function(name) {
  return this.capabilities.indexOf(name) !== -1;
};

ImapConnection.prototype.blacklistCapability = function(name) {
  var blacklist = this.blacklistedCapabilities;
  name = up(name); // normalized to upper-case
  // bail if already blacklisted
  if (blacklist.indexOf(name) !== -1)
    return;
  blacklist.push(name);
  // remove from known capabilities if present
  var idx = this.capabilities.indexOf(name);
  if (idx !== -1)
    this.capabilities.splice(idx, 1);
};

ImapConnection.prototype._findAndShiftRequestByPrefix = function(prefix) {
  var len = this._state.requests.length;
  prefix = prefix.trim();

  var request, i;
  for (i = 0; i < len; i++) {
    request = this._state.requests[i];
    if (!request || !request.prefix) {
      continue;
    }

    if (request.prefix.lastIndexOf(prefix, 0) === 0) {
      return this._state.requests.splice(i, 1)[0];
    }
  }

  // if we didn't find anything, assume it was the first request, but issue a
  // warning if there was more than one outstanding request
  if (this._state.requests.length > 1) {
    var skipped = [];
    for (i = 0; i < len; i++) {
      request = this._state.requests[i];
      skipped.push(request.prefix);
    }
  }
  return this._state.requests.shift();
};

ImapConnection.prototype._findFetchRequest = function(uid, bodyPart) {
  var requests = this._state.requests;
  var len = requests.length;

  var currentReq;
  for (var i = 0; i < len; i++) {
    currentReq = requests[i].fetchParams;

    if (
      currentReq &&
      currentReq.uids[uid] &&
      currentReq.bodyPart === bodyPart
    ) {
      return requests[i];
    }
  }
};

ImapConnection.prototype.connect = function(loginCb) {
  var self = this,
      fnInit = function() {
        // First get pre-auth capabilities, including server-supported auth
        // mechanisms
        self._send('CAPABILITY', null, function() {
          // Next, attempt to login
          var checkedNS = false;
          var redo = function(err, reentry) {
            if (err) {
              loginCb(err);
              return;
            }
            // Next, get the list of available namespaces if supported
            if (!checkedNS && self.capabilities.indexOf('NAMESPACE') > -1) {
              // Re-enter this function after we've obtained the available
              // namespaces
              checkedNS = true;
              self._send('NAMESPACE', null, redo);
              return;
            }
            // Lastly, get the top-level mailbox hierarchy delimiter used by the
            // server
            self._send('LIST "" ""', null, loginCb);
          };
          self._login(redo);
        });
      };
  loginCb = loginCb || emptyFn;
  this._reset();

  if (this._LOG) this._LOG.connect(this._options.host, this._options.port);

  this._state.conn = (this._options.crypto ? tls : net).connect(
                       this._options.port, this._options.host);
  this._state.tmrConn = setTimeoutFunc(this._fnTmrConn.bind(this, loginCb),
                                       this._options.connTimeout);

  this._state.conn.on('connect', function() {
    if (self._LOG) self._LOG.connected();
    if (self._state.tmrConn) {
      clearTimeoutFunc(self._state.tmrConn);
      self._state.tmrConn = null;
    }
    self._state.status = STATES.NOAUTH;
    /*
    We will need to add support for node-like starttls emulation on top of TCPSocket
    once TCPSocket supports starttls (see also bug 784816).

    if (self._options.crypto === 'starttls') {
      self._send('STARTTLS', function() {
        starttls(self, function() {
	  if (!self.authorized)
	    throw new Error("starttls failed");
	  fnInit();
        });
      });
      return;
    }
    */
    fnInit();
  });

  this._state.conn.on('data', function(buffer) {
    try {
      self._unprocessed.push(buffer);
      while (self._unprocessed.length) {
        processData(self._unprocessed.shift());
      }
    }
    catch (ex) {
      console.error('Explosion while processing data', ex);
      if ('stack' in ex)
        console.error('Stack:', ex.stack);
      throw ex;
    }
  });

  function processResponse(data) {
    var curReq = null;
    // -- Untagged server responses
    if (data[0] === '*') {
      if (self._state.status === STATES.NOAUTH) {
        if (data[1] === 'PREAUTH') { // the server pre-authenticated us
          self._state.status = STATES.AUTH;
          if (self._state.numCapRecvs === 0)
            self._state.numCapRecvs = 1;
        } else if (data[1] === 'NO' || data[1] === 'BAD' || data[1] === 'BYE') {
          if (self._LOG && data[1] === 'BAD')
            self._LOG.bad(data[2]);
          self._state.conn.end();
          return;
        }
        if (!self._state.isReady)
          self._state.isReady = true;
        // Restrict the type of server responses when unauthenticated
        if (data[1] !== 'CAPABILITY' && data[1] !== 'ALERT')
          return;
      }
      switch (data[1]) {
        case 'CAPABILITY':
          if (self._state.numCapRecvs < 2)
            self._state.numCapRecvs++;
          self.capabilities = data[2].split(' ').map(up);
        break;
        // Feedback from the ENABLE command.
        case 'ENABLED':
          self.enabledCapabilities = self.enabledCapabilities.concat(
                                       data[2].split(' '));
          self.enabledCapabilities.sort();
        break;
        // The system-defined flags for this mailbox; during SELECT/EXAMINE
        case 'FLAGS':
          if (self._state.status === STATES.BOXSELECTING) {
            self._state.box._flags = data[2].substr(1, data[2].length-2)
                                            .split(' ').map(function(flag) {
                                              return flag.substr(1);
                                            });
          }
        break;
        case 'OK':
          if ((result = /^\[ALERT\] (.*)$/i.exec(data[2])))
            self.emit('alert', result[1]);
          else if (self._state.status === STATES.BOXSELECTING) {
            var result;
            if ((result = /^\[UIDVALIDITY (\d+)\]/i.exec(data[2])))
              self._state.box.validity = result[1];
            else if ((result = /^\[UIDNEXT (\d+)\]/i.exec(data[2])))
              self._state.box._uidnext = parseInt(result[1]);
            // Flags the client can change permanently.  If \* is included, it
            // means we can make up new keywords.
            else if ((result = /^\[PERMANENTFLAGS \((.*)\)\]/i.exec(data[2]))) {
              self._state.box.permFlags = result[1].split(' ');
              var idx;
              if ((idx = self._state.box.permFlags.indexOf('\\*')) > -1) {
                self._state.box._newKeywords = true;
                self._state.box.permFlags.splice(idx, 1);
              }
              self._state.box.keywords = self._state.box.permFlags
                                             .filter(function(flag) {
                                               return (flag[0] !== '\\');
                                             });
              for (var i=0; i<self._state.box.keywords.length; i++)
                self._state.box.permFlags.splice(self._state.box.permFlags.indexOf(self._state.box.keywords[i]), 1);
              self._state.box.permFlags = self._state.box.permFlags
                                              .map(function(flag) {
                                                return flag.substr(1);
                                              });
            }
            else if ((result = /^\[HIGHESTMODSEQ (\d+)\]/i.exec(data[2]))) {
              // Kept as a string since it may be a full 64-bit value.
              self._state.box.highestModSeq = result[1];
            }
            // The server does not support mod sequences for the folder.
            else if ((result = /^\[NOMODSEQ\]/i.exec(data[2]))) {
              self._state.box.highestModSeq = null;
            }
          }
        break;
        case 'NAMESPACE':
          parseNamespaces(data[2], self.namespaces);
        break;
        case 'SEARCH':
          self._state.requests[0].args.push(
            (data[2] === undefined || data[2].length === 0)
              ? [] : data[2].trim().split(' ').map(singleArgParseInt));
        break;
        case 'LIST':
        case 'XLIST':
          var result;
          if (self.delim === null &&
              (result = /^\(\\No[sS]elect(?:[^)]*)\) (.+?) .*$/.exec(data[2])))
            self.delim = (result[1] === 'NIL'
                          ? false
                          : result[1].substring(1, result[1].length - 1));
          else if (self.delim !== null) {
            if (self._state.requests[0].args.length === 0)
              self._state.requests[0].args.push({});
            result = /^\((.*)\) (.+?) "?([^"]+)"?$/.exec(data[2]);

            var box = {
                  displayName: null,
                  attribs: result[1].split(' ').map(function(attrib) {
                             return attrib.substr(1).toUpperCase();
                           }),
                  delim: (result[2] === 'NIL'
                          ? false : result[2].substring(1, result[2].length-1)),
                  children: null,
                  parent: null
                },
                name = result[3],
                curChildren = self._state.requests[0].args[0];
            if (name[0] === '"' && name[name.length-1] === '"')
              name = name.substring(1, name.length - 1);

            if (box.delim) {
              var path = name.split(box.delim).filter(isNotEmpty),
                  parent = null;
              name = path.pop();
              for (var i=0,len=path.length; i<len; i++) {
                if (!curChildren[path[i]])
                  curChildren[path[i]] = { delim: box.delim };
                if (!curChildren[path[i]].children)
                  curChildren[path[i]].children = {};
                parent = curChildren[path[i]];
                curChildren = curChildren[path[i]].children;
              }

              box.parent = parent;
            }
            box.displayName = decodeModifiedUtf7(name);
            if (curChildren[name])
              box.children = curChildren[name].children;
            curChildren[name] = box;
          }
        break;
        // QRESYNC (when successful) generates a "VANISHED (EARLIER) uids"
        // payload to tell us about deleted/expunged messages when selecting
        // a folder.
        // It will also generate untagged VANISHED updates as the result of an
        // expunge on this connection or other connections (for this folder).
        case 'VANISHED':
          var earlier = false;
          if (data[2].lastIndexOf('(EARLIER) ', 0) === 0) {
            earlier = true;
            data[2] = data[2].substring(10);
          }
          // Using vanished because the existing 'deleted' event uses sequence
          // numbers.
          self.emit('vanished', parseUIDListString(data[2]), earlier);
        break;
        default:
          if (/^\d+$/.test(data[1])) {
            var isUnsolicited = (self._state.requests[0] &&
                      self._state.requests[0].command.indexOf('NOOP') > -1) ||
                      (self._state.isIdle && self._state.ext.idle.state === IDLE_READY);
            switch (data[2]) {
              case 'EXISTS':
                // mailbox total message count
                var prev = self._state.box.messages.total,
                    now = parseInt(data[1]);
                self._state.box.messages.total = now;
                if (self._state.status !== STATES.BOXSELECTING && now > prev) {
                  self._state.box.messages.new = now-prev;
                  self.emit('mail', self._state.box.messages.new); // new mail
                }
              break;
              case 'RECENT':
                // messages marked with the \Recent flag (i.e. new messages)
                self._state.box.messages.new = parseInt(data[1]);
              break;
              case 'EXPUNGE':
                // confirms permanent deletion of a single message
                if (self._state.box.messages.total > 0)
                  self._state.box.messages.total--;
                if (isUnsolicited)
                  self.emit('deleted', parseInt(data[1], 10));
              break;
              default:
                // fetches without header or body (part) retrievals
                if (/^FETCH/.test(data[2])) {
                  var msg = new ImapMessage();
                  parseFetch(data[2].substring(data[2].indexOf("(")+1,
                                               data[2].lastIndexOf(")")),
                             "", msg);
                  msg.seqno = parseInt(data[1], 10);
                  // we don't need/want to use _findFetchRequest because that only
                  // applies for body fetches, which this is definitely not.
                  if (self._state.requests.length &&
                      self._state.requests[0].command.indexOf('FETCH') > -1) {
                    curReq = self._state.requests[0];
                    curReq._fetcher.emit('message', msg);
                    msg.emit('end');
                  } else if (isUnsolicited)
                    self.emit('msgupdate', msg);
                }
            }
          }
      }
    } else if (data[0][0] === 'A' || data[0] === '+') {
      // Tagged server response or continuation response

      if (data[0] === '+' && self._state.ext.idle.state === IDLE_WAIT) {
        self._state.ext.idle.state = IDLE_READY;
        process.nextTick(function() { self._send(); });
        return;
      }

      var sendBox = false;
      clearTimeoutFunc(self._state.tmrKeepalive);
      if (self._state.status === STATES.BOXSELECTING) {
        if (data[1] === 'OK') {
          sendBox = true;
          self._state.status = STATES.BOXSELECTED;
        } else {
          self._state.status = STATES.AUTH;
          self._resetBox();
        }
      }

      // XXX there is an edge case here where we LOGOUT and the server sends
      // "* BYE" "AXX LOGOUT OK" and the close event gets processed (probably
      // because of the BYE and the fact that we don't nextTick a lot for the
      // moz logic) and _reset() nukes the requests before we see the LOGOUT,
      // which we do end up seeing.  So just bail in that case.
      if (self._state.requests.length === 0) {
        return;
      }

      var recentReq = (data[0] !== '+') ?
        self._findAndShiftRequestByPrefix(data[0]) :
        self._state.requests.shift();

      if (recentReq.command.indexOf('RENAME') > -1) {
        self._state.box.name = self._state.box._newName;
        delete self._state.box._newName;
        sendBox = true;
      }


      if (typeof recentReq.callback === 'function') {
        var err = null;
        var args = recentReq.args,
            cmd = recentReq.command;
        if (data[0] === '+') {
          // continuation, put request back-on
          self._state.requests.unshift(recentReq);
          if (cmd.indexOf('APPEND') !== 0) {
            err = new Error('Unexpected continuation');
            err.type = 'continuation';
            err.serverResponse = '';
            err.request = cmd;
          } else
            return recentReq.callback();
        } else if (data[1] !== 'OK') {
          err = new Error('Error while executing request: ' + data[2]);
          err.type = data[1];
          err.serverResponse = data[2];
          err.request = cmd;
        } else if (self._state.status === STATES.BOXSELECTED) {
          if (sendBox) // SELECT, EXAMINE, RENAME
            args.unshift(self._state.box);
          // According to RFC 3501, UID commands do not give errors for
          // non-existant user-supplied UIDs, so give the callback empty results
          // if we unexpectedly received no untagged responses.
          else if ((cmd.indexOf('UID FETCH') === 0
                    || cmd.indexOf('UID SEARCH') === 0
                   ) && args.length === 0)
            args.unshift([]);
        }
        args.unshift(err);
        recentReq.callback.apply(recentReq, args);
      }

      if (recentReq) {
        if (recentReq.active)
          self._state.activeRequests--;
      }
      else {
        // We expect this to happen in the case where our callback above
        // resulted in our connection being killed.  So just bail in that case.
        if (self._state.status === STATES.NOCONNECT)
          return;
        // This is unexpected and bad.  Log a poor man's error for now.
        console.error('IMAP: Somehow no recentReq for data:', data);
        return;
      }

      var recentCmd = recentReq.command;
      if (self._LOG) self._LOG.cmd_end(recentReq.prefix, recentCmd, /^LOGIN$/.test(recentCmd) ? '***BLEEPING OUT LOGON***' : recentReq.cmddata);
      if (self._state.requests.length === 0
          && recentCmd !== 'LOGOUT') {
        if (self._state.status === STATES.BOXSELECTED &&
            self.capabilities.indexOf('IDLE') > -1) {
          // According to RFC 2177, we should re-IDLE at least every 29
          // minutes to avoid disconnection by the server
          self._send('IDLE', null, undefined, undefined, true);
        }
        self._state.tmrKeepalive = setTimeoutFunc(function() {
          if (self._state.isIdle) {
            if (self._state.ext.idle.state === IDLE_READY) {
              self._state.ext.idle.timeWaited += self._state.tmoKeepalive;
              if (self._state.ext.idle.timeWaited >= self._state.ext.idle.MAX_WAIT)
                // restart IDLE
                self._send('IDLE', null, undefined, undefined, true);
            } else if (self.capabilities.indexOf('IDLE') === -1)
              self._noop();
          }
        }, self._state.tmoKeepalive);
      } else
        process.nextTick(function() { self._send(); });

      self._state.isIdle = true;
    } else if (data[0] === 'IDLE') {
      if (self._state.requests.length)
        process.nextTick(function() { self._send(); });
      self._state.isIdle = false;
      self._state.ext.idle.state = IDLE_NONE;
      self._state.ext.idle.timeWaited = 0;
    } else {
      if (self._LOG)
        self._LOG.unknownResponse(data[0], data[1], data[2]);
      // unknown response
    }
  }

  /**
   * Process up to one thing.  Generally:
   * - If we are processing a literal, we make sure we have the data for the
   *   whole literal, then we process it.
   * - If we are not in a literal, we buffer until we have one newline.
   */
  function processData(data) {
    if (data.length === 0) return;
    var idxCRLF = null, literalInfo, curReq;

    // - Accumulate data until newlines when not in a literal
    if (self._state.curExpected === null) {
      // no newline, append and bail
      if ((idxCRLF = bufferIndexOfCRLF(data, 0)) === -1) {
        if (self._state.curData)
          self._state.curData = bufferAppend(self._state.curData, data);
        else
          self._state.curData = data;
        return;
      }
      // yes newline, use the buffered up data and new data
      // (note: data may now contain more than one line's worth of data!)
      if (self._state.curData && self._state.curData.length) {
        data = bufferAppend(self._state.curData, data);
        self._state.curData = null;
      }
    }

    // -- Literal
    // Don't mess with incoming data if it's part of a literal
    if (self._state.curExpected !== null) {
      curReq = curReq || self._state.requests[0];

      if (!curReq._done) {
        var chunk = data;
        self._state.curXferred += data.length;
        if (self._state.curXferred > self._state.curExpected) {
          var pos = data.length
                    - (self._state.curXferred - self._state.curExpected),
              extra = data.slice(pos);
          if (pos > 0)
            chunk = data.slice(0, pos);
          else
            chunk = undefined;
          data = extra;
          curReq._done = 1;
        }

        if (chunk && chunk.length) {
          if (self._LOG) self._LOG.data(chunk.length, chunk);
          if (curReq._msgtype === 'headers') {
            chunk.copy(self._state.curData, curReq.curPos, 0);
            curReq.curPos += chunk.length;
          }
          else
            curReq._msg.emit('data', chunk);
        }
      }

      if (curReq._done) {
        var restDesc;
        if (curReq._done === 1) {
          if (curReq._msgtype === 'headers')
            curReq._headers = self._state.curData.toString('ascii');
          self._state.curData = null;
          curReq._done = true;
        }

        if (self._state.curData)
          self._state.curData = bufferAppend(self._state.curData, data);
        else
          self._state.curData = data;

        idxCRLF = bufferIndexOfCRLF(self._state.curData);
        if (idxCRLF && self._state.curData[idxCRLF - 1] === CHARCODE_RPAREN) {
          if (idxCRLF > 1) {
            // eat up to, but not including, the right paren
            restDesc = self._state.curData.toString('ascii', 0, idxCRLF - 1)
                         .trim();
            if (restDesc.length)
              curReq._desc += ' ' + restDesc;
          }
          parseFetch(curReq._desc, curReq._headers, curReq._msg);
          data = self._state.curData.slice(idxCRLF + 2);
          curReq._done = false;
          self._state.curXferred = 0;
          self._state.curExpected = null;
          self._state.curData = null;
          curReq._msg.emit('end', curReq._msg);
          // XXX we could just change the next else to not be an else, and then
          // this conditional is not required and we can just fall out.  (The
          // expected check === 0 may need to be reinstated, however.)
          if (data.length && data[0] === CHARCODE_ASTERISK) {
            self._unprocessed.unshift(data);
            return;
          }
        } else // ??? no right-paren, keep accumulating data? this seems wrong.
          return;
      } else // not done, keep accumulating data
        return;
    }
    // -- Fetch w/literal
    // (More specifically, we were not in a literal, let's see if this line is
    // a fetch result line that starts a literal.  We want to minimize
    // conversion to a string, as there used to be a naive conversion here that
    // chewed up a lot of processor by converting all of data rather than
    // just the current line.)
    else if (data[0] === CHARCODE_ASTERISK) {
      var strdata;
      idxCRLF = bufferIndexOfCRLF(data, 0);
      if (data[idxCRLF - 1] === CHARCODE_RBRACE &&
          (literalInfo =
             (strdata = data.toString('ascii', 0, idxCRLF)).match(reFetch))) {
        self._state.curExpected = parseInt(literalInfo[2], 10);

        var desc = strdata.substring(strdata.indexOf('(')+1).trim();
        var type = /BODY\[(.*)\](?:\<\d+\>)?/.exec(strdata)[1];
        var uid = reUid.exec(desc)[1];

        // figure out which request this belongs to. If its not assigned to a
        // specific uid then send it to the first pending request...
        curReq = self._findFetchRequest(uid, type) || self._state.requests[0];
        var msg = new ImapMessage();

        // because we push data onto the unprocessed queue for any literals and
        // processData lacks any context, we need to reorder the request to be
        // first if it is not already first.  (Storing the request along-side
        // the data in insufficient because if the literal data is fragmented
        // at all, the context will be lost.)
        if (self._state.requests[0] !== curReq) {
          self._state.requests.splice(self._state.requests.indexOf(curReq), 1);
          self._state.requests.unshift(curReq);
        }

        msg.seqno = parseInt(literalInfo[1], 10);
        curReq._desc = desc;
        curReq._msg = msg;
        msg.size = self._state.curExpected;

        curReq._fetcher.emit('message', msg);

        curReq._msgtype = (type.indexOf('HEADER') === 0 ? 'headers' : 'body');
        // This library buffers headers, so allocate a buffer to hold the literal.
        if (curReq._msgtype === 'headers') {
          self._state.curData = new Buffer(self._state.curExpected);
          curReq.curPos = 0;
        }
        if (self._LOG) self._LOG.data(strdata.length, strdata);
        // (If it's not headers, then it's body, and we generate 'data' events.)
        self._unprocessed.unshift(data.slice(idxCRLF + 2));
        return;
      }
    }

    if (data.length === 0)
      return;

    data = customBufferSplitCRLF(data);
    var response = data.shift().toString('ascii');
    // queue the remaining buffer chunks up for processing at the head of the queue
    self._unprocessed = data.concat(self._unprocessed);

    if (self._LOG) self._LOG.data(response.length, response);
    processResponse(stringExplode(response, ' ', 3));
  };

  this._state.conn.on('close', function onClose() {
    self._reset();
    if (this._LOG) this._LOG.closed();
    self.emit('close');
  });
  this._state.conn.on('error', function(err) {
    try {
      var errType;
      // (only do error probing on things we can safely use 'in' on)
      if (err && typeof(err) === 'object') {
        // XXX just map all security errors as indicated by the name into
        // security errors.
        if (/^Security/.test(err.name)) {
          err = new Error('SSL error');
          errType = err.type = 'bad-security';
        }
      }
      if (self._state.tmrConn) {
        clearTimeoutFunc(self._state.tmrConn);
        self._state.tmrConn = null;
      }
      if (self._state.status === STATES.NOCONNECT) {
        var connErr = new Error('Unable to connect. Reason: ' + err);
        connErr.type = errType || 'unresponsive-server';
        connErr.serverResponse = '';
        loginCb(connErr);
      }
      self.emit('error', err);
      if (this._LOG) this._LOG.connError(err);
    }
    catch(ex) {
      console.error("Error in imap onerror:", ex);
      throw ex;
    }
  });
};

/**
 * Aggressively shutdown the connection, ideally so that no further callbacks
 * are invoked.
 */
ImapConnection.prototype.die = function() {
  if (this._state.conn) {
    this._state.conn.removeAllListeners();
    this._state.conn.end();
  }
  this._reset();
  this._LOG.__die();
};

ImapConnection.prototype.isAuthenticated = function() {
  return this._state.status >= STATES.AUTH;
};

ImapConnection.prototype.logout = function(cb) {
  if (this._state.status >= STATES.NOAUTH)
    this._send('LOGOUT', null, cb);
  else
    throw new Error('Not connected');
};

/**
 * Enable one or more optional capabilities.  This is additive and there's no
 * way to un-enable things once enabled.  So enable(["a", "b"]), followed by
 * enable(["c"]) is the same as enable(["a", "b", "c"]).
 *
 * http://tools.ietf.org/html/rfc5161
 */
ImapConnection.prototype.enable = function(capabilities, cb) {
  if (this._state.status < STATES.AUTH)
    throw new Error('Not connected or authenticated');
  this._send('ENABLE ' + capabilities.join(' '), cb || emptyFn);
};

ImapConnection.prototype.openBox = function(name, readOnly, cb) {
  if (this._state.status < STATES.AUTH)
    throw new Error('Not connected or authenticated');
  if (this._state.status === STATES.BOXSELECTED)
    this._resetBox();
  if (cb === undefined) {
    if (readOnly === undefined)
      cb = emptyFn;
    else
      cb = readOnly;
    readOnly = false;
  }
  var self = this;
  function dispatchFunc() {
    self._state.status = STATES.BOXSELECTING;
    self._state.box.name = name;
  }

  this._send((readOnly ? 'EXAMINE' : 'SELECT'), ' "' + escape(name) + '"', cb,
             dispatchFunc);
};

/**
 * SELECT/EXAMINE a box using the QRESYNC extension.  The last known UID
 * validity and last known modification sequence are required.  The set of
 * known UIDs is optional.
 */
ImapConnection.prototype.qresyncBox = function(name, readOnly,
                                               uidValidity, modSeq,
                                               knownUids,
                                               cb) {
  if (this._state.status < STATES.AUTH)
    throw new Error('Not connected or authenticated');
  if (this.enabledCapabilities.indexOf('QRESYNC') === -1)
    throw new Error('QRESYNC is not enabled');
  if (this._state.status === STATES.BOXSELECTED)
    this._resetBox();
  if (cb === undefined) {
    if (readOnly === undefined)
      cb = emptyFn;
    else
      cb = readOnly;
    readOnly = false;
  }
  var self = this;
  function dispatchFunc() {
    self._state.status = STATES.BOXSELECTING;
    self._state.box.name = name;
  }

  this._send((readOnly ? 'EXAMINE' : 'SELECT') + ' "' + escape(name) + '"' +
             ' (QRESYNC (' + uidValidity + ' ' + modSeq +
             (knownUids ? (' ' + knownUids) : '') + '))', cb, dispatchFunc);
};



// also deletes any messages in this box marked with \Deleted
ImapConnection.prototype.closeBox = function(cb) {
  var self = this;
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox is currently selected');
  this._send('CLOSE', null, function(err) {
    if (!err) {
      self._state.status = STATES.AUTH;
      self._resetBox();
    }
    cb(err);
  });
};

ImapConnection.prototype.removeDeleted = function(cb) {
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox is currently selected');
  cb = arguments[arguments.length-1];

  this._send('EXPUNGE', null, cb);
};

ImapConnection.prototype.getBoxes = function(namespace, searchSpec, cb) {
  cb = arguments[arguments.length-1];
  if (arguments.length < 2)
    namespace = '';
  if (arguments.length < 3)
    searchSpec = '*';

  var cmd, cmddata = ' "' + escape(namespace) + '" "' +
                       escape(searchSpec) + '"';
  // Favor special-use over XLIST
  if (this.capabilities.indexOf('SPECIAL-USE') !== -1) {
    cmd = 'LIST';
    cmddata += ' RETURN (SPECIAL-USE)';
  }
  else if (this.capabilities.indexOf('XLIST') !== -1) {
    cmd = 'XLIST';
  }
  else {
    cmd = 'LIST';
  }
  this._send(cmd, cmddata, cb);
};

ImapConnection.prototype.addBox = function(name, cb) {
  cb = arguments[arguments.length-1];
  if (typeof name !== 'string' || name.length === 0)
    throw new Error('Mailbox name must be a string describing the full path'
                    + ' of a new mailbox to be created');
  this._send('CREATE', ' "' + escape(name) + '"', cb);
};

ImapConnection.prototype.delBox = function(name, cb) {
  cb = arguments[arguments.length-1];
  if (typeof name !== 'string' || name.length === 0)
    throw new Error('Mailbox name must be a string describing the full path'
                    + ' of an existing mailbox to be deleted');
  this._send('DELETE', ' "' + escape(name) + '"', cb);
};

ImapConnection.prototype.renameBox = function(oldname, newname, cb) {
  cb = arguments[arguments.length-1];
  if (typeof oldname !== 'string' || oldname.length === 0)
    throw new Error('Old mailbox name must be a string describing the full path'
                    + ' of an existing mailbox to be renamed');
  else if (typeof newname !== 'string' || newname.length === 0)
    throw new Error('New mailbox name must be a string describing the full path'
                    + ' of a new mailbox to be renamed to');
  if (this._state.status === STATES.BOXSELECTED
      && oldname === this._state.box.name && oldname !== 'INBOX')
    this._state.box._newName = oldname;

  this._send('RENAME', ' "' + escape(oldname) + '" "' + escape(newname) + '"', cb);
};

ImapConnection.prototype.search = function(options, cb) {
  this._search('UID ', options, cb);
};
ImapConnection.prototype._search = function(which, options, cb) {
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox is currently selected');
  if (!Array.isArray(options))
    throw new Error('Expected array for search options');
  this._send(which + 'SEARCH',
             buildSearchQuery(options, this.capabilities), cb);
};

ImapConnection.prototype.append = function(data, options, cb) {
  if (typeof options === 'function') {
    cb = options;
    options = {};
  }
  options = options || {};
  if (!('mailbox' in options)) {
    if (this._state.status !== STATES.BOXSELECTED)
      throw new Error('No mailbox specified or currently selected');
    else
      options.mailbox = this._state.box.name;
  }
  var cmd = ' "'+escape(options.mailbox)+'"';
  if ('flags' in options) {
    if (!Array.isArray(options.flags))
      options.flags = Array(options.flags);
    if (options.flags.length)
      cmd += " (\\"+options.flags.join(' \\')+")";
  }
  if ('date' in options) {
    if (!(options.date instanceof Date))
      throw new Error('Expected null or Date object for date');
    cmd += ' "' + formatImapDateTime(options.date) + '"';
  }
  cmd += ' {';
  cmd += (Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data));
  cmd += '}';
  var self = this, step = 1;
  this._send('APPEND', cmd, function(err) {
    if (err || step++ === 2)
      return cb(err);
    if (typeof(data) === 'string') {
      self._state.conn.write(Buffer(data + CRLF));
    }
    else {
      self._state.conn.write(data);
      self._state.conn.write(CRLF_BUFFER);
    }
    if (this._LOG) this._LOG.sendData(data.length, data);
  });
}

ImapConnection.prototype.multiappend = function(messages, cb) {
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox specified or currently selected');
  var cmd = ' "'+escape(this._state.box.name)+'"';

  function buildAppendClause(options) {
    if ('flags' in options) {
      if (!Array.isArray(options.flags))
        options.flags = Array(options.flags);
      if (options.flags.length)
        cmd += " (\\"+options.flags.join(' \\')+")";
    }
    if ('date' in options) {
      if (!(options.date instanceof Date))
        throw new Error('Expected null or Date object for date');
      cmd += ' "' + formatImapDateTime(options.date) + '"';
    }
    cmd += ' {';
    cmd += (Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data));
    cmd += '}';
  }

  var self = this, iNextMessage = 1, done = false,
      message = messages[0], data = message.messageText;
  buildAppendClause(message);
  this._send('APPEND', cmd, function(err) {
    if (err || done)
      return cb(err, iNextMessage - 1);

    self._state.conn.write(typeof(data) === 'string' ? Buffer(data) : data);
    // The message literal itself should end with a newline.  We don't want to
    // send an extra one because then that terminates the command.
    if (self._LOG) self._LOG.sendData(data.length, data);

    if (iNextMessage < messages.length) {
      cmd = '';
      message = messages[iNextMessage++];
      data = message.messageText;
      buildAppendClause(message);
      cmd += CRLF;
      self._state.conn.write(Buffer(cmd));
      if (self._LOG) self._LOG.sendData(cmd.length, cmd);
    }
    else {
      // This terminates the command.
      self._state.conn.write(CRLF_BUFFER);
      if (self._LOG) self._LOG.sendData(2, CRLF);
      done = true;
    }
  });
}


ImapConnection.prototype.fetch = function(uids, options) {
  return this._fetch('UID ', uids, options);
};
ImapConnection.prototype._fetch = function(which, uids, options) {
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox is currently selected');

  if (uids === undefined || uids === null
      || (Array.isArray(uids) && uids.length === 0))
    throw new Error('Nothing to fetch');

  if (!Array.isArray(uids))
    uids = [uids];
  validateUIDList(uids);

  var opts = {
    markSeen: false,
    request: {
      struct: true,
      headers: true, // \_______ at most one of these can be used for any given
                    //   _______ fetch request
      body: false  //   /
    }
  }, toFetch, bodyRange = '', self = this;
  if (typeof options !== 'object')
    options = {};
  extend(opts, options, 'request');

  if (!Array.isArray(opts.request.headers)) {
    if (Array.isArray(opts.request.body)) {
      var rangeInfo;
      if (opts.request.body.length !== 2)
        throw new Error("Expected Array of length 2 for body byte range");
      else if (typeof opts.request.body[1] !== 'string'
               || !(rangeInfo = /^([\d]+)\-([\d]+)$/.exec(opts.request.body[1]))
               || parseInt(rangeInfo[1]) >= parseInt(rangeInfo[2]))
        throw new Error("Invalid body byte range format");
      bodyRange = '<' + parseInt(rangeInfo[1]) + '.' + parseInt(rangeInfo[2])
                  + '>';
      opts.request.body = opts.request.body[0];
    }
    if (typeof opts.request.headers === 'boolean'
        && opts.request.headers === true) {
      // fetches headers only
      toFetch = 'HEADER';
    } else if (typeof opts.request.body === 'boolean'
               && opts.request.body === true) {
      // fetches the whole entire message text (minus the headers), including
      // all message parts
      toFetch = 'TEXT';
    } else if (typeof opts.request.body === 'string') {
      if (opts.request.body.toUpperCase() === 'FULL') {
        // fetches the whole entire message (including the headers)
        toFetch = '';
      } else if (/^([\d]+[\.]{0,1})*[\d]+$/.test(opts.request.body)) {
        // specific message part identifier, e.g. '1', '2', '1.1', '1.2', etc
        toFetch = opts.request.body;
      } else
        throw new Error("Invalid body partID format");
    }
  } else {
    // fetch specific headers only
    toFetch = 'HEADER.FIELDS (' + opts.request.headers.join(' ').toUpperCase()
              + ')';
  }

  var fetchParams;
  // we only run fetches in parallel when fetching for one UID per request.
  // (Otherwise, you are asking for data from multiple UIDs at the same time and
  // a parallel fetch is not needed since your request is basically already issuing
  // one.)
  if (uids.length === 1 && opts.request.body) {
    var uidMap = {};
    uids.forEach(function(id) {
      uidMap[id] = toFetch;
    });

    fetchParams = { uids: uidMap, bodyPart: opts.request.body };
  }

  var extensions = '';
  if (this.capabilities.indexOf('X-GM-EXT-1') > -1)
    extensions = 'X-GM-THRID X-GM-MSGID X-GM-LABELS ';
  // google is mutually exclusive with QRESYNC
  else if (this.enabledCapabilities.indexOf('QRESYNC') > -1)
    extensions = 'MODSEQ ';

  var cmd = ' ' + uids.join(',') + ' (' + extensions
             + 'UID FLAGS INTERNALDATE'
             + (opts.request.struct ? ' BODYSTRUCTURE' : '')
             + (typeof toFetch === 'string' ? ' BODY'
             + (!opts.markSeen ? '.PEEK' : '')
             + '[' + toFetch + ']' + bodyRange : '') + ')';

  var onFetch = function onFetch(e) {
    var fetcher = this._fetcher;
    if (e && fetcher) {
      fetcher.emit('error', e);
    }
    else if (e && !fetcher) {
      self.emit('error', e);
    }
    else if (fetcher) {
      fetcher.emit('end');
    }
  };

  this._send(which + 'FETCH', cmd, onFetch, null, null, fetchParams);

  var imapFetcher = new ImapFetch();
  this._state.requests[this._state.requests.length-1]._fetcher = imapFetcher;
  return imapFetcher;
};

ImapConnection.prototype.addFlags = function(uids, flags, cb) {
  this._store('UID ', uids, flags, true, cb);
};

ImapConnection.prototype.delFlags = function(uids, flags, cb) {
  this._store('UID ', uids, flags, false, cb);
};

ImapConnection.prototype.addKeywords = function(uids, flags, cb) {
  return this._addKeywords('UID ', uids, flags, cb);
};
ImapConnection.prototype._addKeywords = function(which, uids, flags, cb) {
  if (!this._state.box._newKeywords)
    throw new Error('This mailbox does not allow new keywords to be added');
  this._store(which, uids, flags, true, cb);
};

ImapConnection.prototype.delKeywords = function(uids, flags, cb) {
  this._store('UID ', uids, flags, false, cb);
};

ImapConnection.prototype.copy = function(uids, boxTo, cb) {
  return this._copy('UID ', uids, boxTo, cb);
};
ImapConnection.prototype._copy = function(which, uids, boxTo, cb) {
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox is currently selected');

  if (!Array.isArray(uids))
    uids = [uids];

  validateUIDList(uids);

  this._send(which + 'COPY',
             ' ' + uids.join(',') + ' "' + escape(boxTo) + '"', cb);
};

/* Namespace for seqno-based commands */
ImapConnection.prototype.__defineGetter__('seq', function() {
  var self = this;
  return {
    move: function(seqnos, boxTo, cb) {
      return self._move('', seqnos, boxTo, cb);
    },
    copy: function(seqnos, boxTo, cb) {
      return self._copy('', seqnos, boxTo, cb);
    },
    delKeywords: function(seqnos, flags, cb) {
      self._store('', seqnos, flags, false, cb);
    },
    addKeywords: function(seqnos, flags, cb) {
      return self._addKeywords('', seqnos, flags, cb);
    },
    delFlags: function(seqnos, flags, cb) {
      self._store('', seqnos, flags, false, cb);
    },
    addFlags: function(seqnos, flags, cb) {
      self._store('', seqnos, flags, true, cb);
    },
    fetch: function(seqnos, options) {
      return self._fetch('', seqnos, options);
    },
    search: function(options, cb) {
      self._search('', options, cb);
    }
  };
});


/****** Private Functions ******/

ImapConnection.prototype._fnTmrConn = function(loginCb) {
  var err = new Error('Connection timed out');
  err.type = 'timeout';
  loginCb(err);
  this._state.conn.end();
};

ImapConnection.prototype._store = function(which, uids, flags, isAdding, cb) {
  if (this._state.status !== STATES.BOXSELECTED)
    throw new Error('No mailbox is currently selected');
  if (uids === undefined)
    throw new Error('The message ID(s) must be specified');

  if (!Array.isArray(uids))
    uids = [uids];
  validateUIDList(uids);

  if ((!Array.isArray(flags) && typeof flags !== 'string')
      || (Array.isArray(flags) && flags.length === 0))
    throw new Error((isKeywords ? 'Keywords' : 'Flags')
                    + ' argument must be a string or a non-empty Array');
  if (!Array.isArray(flags))
    flags = [flags];
  // Disabling the guard logic right now because it's not needed and we're
  // removing the distinction between keywords and flags.  However, it does
  // seem like a good idea for the protocol layer to check this, so not just
  // actually deleting it right now.
  /*
  for (var i=0; i<flags.length; i++) {
    if (!isKeywords) {
      if (this._state.box.permFlags.indexOf(flags[i]) === -1
          || flags[i] === '\\*' || flags[i] === '*')
        throw new Error('The flag "' + flags[i]
                        + '" is not allowed by the server for this mailbox');
    } else {
      // keyword contains any char except control characters (%x00-1F and %x7F)
      // and: '(', ')', '{', ' ', '%', '*', '\', '"', ']'
      if (/[\(\)\{\\\"\]\%\*\x00-\x20\x7F]/.test(flags[i])) {
        throw new Error('The keyword "' + flags[i]
                        + '" contains invalid characters');
      }
    }
  }
  */
  flags = flags.join(' ');
  cb = arguments[arguments.length-1];

  this._send(which + 'STORE',
             ' ' + uids.join(',') + ' ' + (isAdding ? '+' : '-')
             + 'FLAGS.SILENT (' + flags + ')', cb);
};

ImapConnection.prototype._login = function(cb) {
  var self = this,
      fnReturn = function(err) {
        if (!err) {
          self._state.status = STATES.AUTH;
          if (self._state.numCapRecvs !== 2) {
            // fetch post-auth server capabilities if they were not
            // automatically provided after login
            self._send('CAPABILITY', null, cb);
            return;
          }
        }
        cb(err);
      };
  if (this._state.status === STATES.NOAUTH) {
    var connErr;
    if (this.capabilities.indexOf('LOGINDISABLED') > -1) {
      connErr = new Error('Logging in is disabled on this server');
      connErr.type = 'server-maintenance';
      connErr.serverResponse = 'LOGINDISABLED';
      cb(connErr);
      return;
    }

    if (this.capabilities.indexOf('AUTH=XOAUTH') !== -1 &&
        'xoauth' in this._options) {
      this._send('AUTHENTICATE XOAUTH ' + escape(this._options.xoauth),
                 fnReturn);
    }
    else if (this.capabilities.indexOf('AUTH=XOAUTH2') &&
             'xoauth2' in this._options) {
      this._send('AUTHENTICATE XOAUTH2 ' + escape(this._options.xoauth2),
                 fnReturn);
    }
    else if (this._options.username !== undefined &&
             this._options.password !== undefined) {
      this._send('LOGIN', ' "' + escape(this._options.username) + '" "'
                 + escape(this._options.password) + '"', fnReturn);
    } else {
      connErr = new Error('Unsupported authentication mechanism(s) detected. '
                          + 'Unable to login.');
      connErr.type = 'sucky-imap-server';
      connErr.serverResponse = 'CAPABILITIES: ' + this.capabilities.join(' ');
      cb(connErr);
      return;
    }
  }
};
ImapConnection.prototype._reset = function() {
  if (this._state.tmrKeepalive)
    clearTimeoutFunc(this._state.tmrKeepalive);
  if (this._state.tmrConn)
    clearTimeoutFunc(this._state.tmrConn);
  this._state.status = STATES.NOCONNECT;
  this._state.numCapRecvs = 0;
  this._state.requests = [];
  this._state.unsentRequests = [];
  this._state.isIdle = true;
  this._state.isReady = false;
  this._state.ext.idle.state = IDLE_NONE;
  this._state.ext.idle.timeWaited = 0;

  this.namespaces = { personal: [], other: [], shared: [] };
  this.delim = null;
  this.capabilities = [];
  this._resetBox();
};
ImapConnection.prototype._resetBox = function() {
  this._state.box._uidnext = 0;
  this._state.box.validity = 0;
  this._state.box.highestModSeq = null;
  this._state.box._flags = [];
  this._state.box._newKeywords = false;
  this._state.box.permFlags = [];
  this._state.box.keywords = [];
  this._state.box.name = null;
  this._state.box.messages.total = 0;
  this._state.box.messages.new = 0;
};
ImapConnection.prototype._noop = function() {
  if (this._state.status >= STATES.AUTH)
    this._send('NOOP', null);
};
// bypass=true means to not push a command.  This is used exclusively for the
// auto-idle functionality.  IDLE happens automatically when nothing else is
// going on and automatically refreshes every 29 minutes.
//
// dispatchFunc is a function to invoke when the command is actually dispatched;
// there was at least a potential state maintenance inconsistency with opening
// folders prior to this.
ImapConnection.prototype._send = function(
  cmdstr,
  cmddata,
  cb,
  dispatchFunc,
  bypass,
  fetchParams
) {

  var request;

  if (cmdstr !== undefined) {
    request = {
      prefix: null,
      command: cmdstr,
      cmddata: cmddata,
      callback: cb,
      dispatch: dispatchFunc,
      args: [],
      fetchParams: fetchParams,
      active: false
    };

    // don't queue bypassed requests
    if (!bypass) {
      this._state.requests.push(request);
      this._state.unsentRequests.push(request);
    }
  }

  // If we are currently transitioning to/from idle, then wait around for the
  // server's response before doing anything more.
  if (this._state.ext.idle.state === IDLE_WAIT ||
      this._state.ext.idle.state === DONE_WAIT) {
    return request;
  }

  if (bypass) {
    this._writeRequest(request);
    return request;
  }

  var unsentRequests = this._state.unsentRequests;

  // bail if nothing unsent
  if (unsentRequests.length === 0)
    return null;

  // If there are no active requests, dispatch immediately.
  if (this._state.activeRequests === 0) {
    this._writeRequest(unsentRequests.shift(), true);
  }
  // We can issue fetches in parallel, so if our last request was a fetch, then
  // try and issue all the fetches we can.
  if (
    this._state.lastRequest &&
    this._state.lastRequest.fetchParams
  ) {
    while (unsentRequests.length &&
           unsentRequests[0].fetchParams) {
      this._writeRequest(unsentRequests.shift(), true);
    }
  }

  return request;
};

ImapConnection.prototype._writeRequest = function(request, realRequest) {
  var prefix = '',
      cmd = request.command,
      data = request.cmddata,
      dispatch = request.dispatch;

  clearTimeoutFunc(this._state.tmrKeepalive);

  // If we are currently in IDLE, we need to exit it before we send the
  // actual command.  We mark it as a bypass so it does't mess with the
  // list of requests.
  if (this._state.ext.idle.state === IDLE_READY && cmd !== 'DONE') {
    this._send('DONE', null, undefined, undefined, true);
  }
  else if (cmd === 'IDLE') {
     // we use a different prefix to differentiate and disregard the tagged
     // response the server will send us when we issue DONE
    prefix = 'IDLE ';
    this._state.ext.idle.state = IDLE_WAIT;
  }
  else if (cmd === 'DONE') {
    this._state.ext.idle.state = DONE_WAIT;
  }
  if (cmd !== 'IDLE' && cmd !== 'DONE') {
    prefix = 'A' + ++this._state.curId + ' ';
    request.prefix = prefix;

    // just to infer what we can send next... FETCH/SEARCH can be sent in
    // parallel but nothing else should be send while that is ongoing and FETCH
    // should not be sent while other operations are ongoing (for now anyway)
    this._state.lastRequest = request;
  }

  if (dispatch)
    dispatch();

  // We want our send to happen in a single packet; nagle is disabled by
  // default and at least on desktop-class machines, we are sending out one
  // packet per send call.
  var iWrite = 0, iSrc;
  for (iSrc = 0; iSrc < prefix.length; iSrc++) {
    gSendBuf[iWrite++] = prefix.charCodeAt(iSrc);
  }
  for (iSrc = 0; iSrc < cmd.length; iSrc++) {
    gSendBuf[iWrite++] = cmd.charCodeAt(iSrc);
  }

  if (data) {
    // fits in buffer
    if (data.length < gSendBuf.length - 2) {
      if (typeof(data) === 'string') {
        for (iSrc = 0; iSrc < data.length; iSrc++) {
          gSendBuf[iWrite++] = data.charCodeAt(iSrc);
        }
      }
      else {
        gSendBuf.set(data, iWrite);
        iWrite += data.length;
      }
    }
    // does not fit in buffer, just do separate writes...
    else {
      this._state.conn.write(gSendBuf.subarray(0, iWrite));
      if (typeof(data) === 'string')
        this._state.conn.write(Buffer(data));
      else
        this._state.conn.write(data);
      this._state.conn.write(CRLF_BUFFER);
      // set to zero to tell ourselves we don't need to send...
      iWrite = 0;
    }
  }
  if (iWrite) {
    gSendBuf[iWrite++] = 13;
    gSendBuf[iWrite++] = 10;
    this._state.conn.write(gSendBuf.subarray(0, iWrite));
  }

  if (realRequest) {
    request.active = true;
    this._state.activeRequests++;
  }

  if (this._LOG) {
    this._LOG.cmd_begin(prefix, cmd, /^LOGIN$/.test(cmd) ? '***BLEEPING OUT LOGON***' : data);
  }
};

function ImapMessage() {}
util.inherits(ImapMessage, EventEmitter);
function ImapFetch() {}
util.inherits(ImapFetch, EventEmitter);

/****** Utility Functions ******/

function buildSearchQuery(options, extensions, isOrChild) {
  var searchargs = '';
  for (var i=0,len=options.length; i<len; i++) {
    var criteria = (isOrChild ? options : options[i]),
        args = null,
        modifier = (isOrChild ? '' : ' ');
    if (typeof criteria === 'string')
      criteria = criteria.toUpperCase();
    else if (Array.isArray(criteria)) {
      if (criteria.length > 1)
        args = criteria.slice(1);
      if (criteria.length > 0)
        criteria = criteria[0].toUpperCase();
    } else
      throw new Error('Unexpected search option data type. '
                      + 'Expected string or array. Got: ' + typeof criteria);
    if (criteria === 'OR') {
      if (args.length !== 2)
        throw new Error('OR must have exactly two arguments');
      searchargs += ' OR (' + buildSearchQuery(args[0], extensions, true) + ') ('
                    + buildSearchQuery(args[1], extensions, true) + ')'
    } else {
      if (criteria[0] === '!') {
        modifier += 'NOT ';
        criteria = criteria.substr(1);
      }
      switch(criteria) {
        // -- Standard criteria --
        case 'ALL':
        case 'ANSWERED':
        case 'DELETED':
        case 'DRAFT':
        case 'FLAGGED':
        case 'NEW':
        case 'SEEN':
        case 'RECENT':
        case 'OLD':
        case 'UNANSWERED':
        case 'UNDELETED':
        case 'UNDRAFT':
        case 'UNFLAGGED':
        case 'UNSEEN':
          searchargs += modifier + criteria;
        break;
        case 'BCC':
        case 'BODY':
        case 'CC':
        case 'FROM':
        case 'SUBJECT':
        case 'TEXT':
        case 'TO':
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          searchargs += modifier + criteria + ' "' + escape(''+args[0]) + '"';
        break;
        case 'BEFORE':
        case 'ON':
        case 'SENTBEFORE':
        case 'SENTON':
        case 'SENTSINCE':
        case 'SINCE':
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          else if (!(args[0] instanceof Date)) {
            // XXX although the timestamp is in UTC time, this conversion is
            // to our local timezone, so daylight savings time can be an issue.
            // There is also the issue of what timezone the server's internal
            // date operates in.  For now we are doing nothing about this,
            // and this might ultimately be a higher level issue...
            if ((args[0] = new Date(args[0])).toString() === 'Invalid Date')
              throw new Error('Search option argument must be a Date object'
                              + ' or a parseable date string');
          }
          // XXX/NB: We are currently providing UTC-quantized date values, so
          // we don't want time-zones to skew this and screw us over.
          searchargs += modifier + criteria + ' ' + args[0].getUTCDate() + '-'
                        + MONTHS[args[0].getUTCMonth()] + '-'
                        + args[0].getUTCFullYear();
        break;
        case 'KEYWORD':
        case 'UNKEYWORD':
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          searchargs += modifier + criteria + ' ' + args[0];
        break;
        case 'LARGER':
        case 'SMALLER':
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          var num = parseInt(args[0]);
          if (isNaN(num))
            throw new Error('Search option argument must be a number');
          searchargs += modifier + criteria + ' ' + args[0];
        break;
        case 'HEADER':
          if (!args || args.length !== 2)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          searchargs += modifier + criteria + ' "' + escape(''+args[0]) + '" "'
                        + escape(''+args[1]) + '"';
        break;
        case 'UID':
          if (!args)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          validateUIDList(args);
          searchargs += modifier + criteria + ' ' + args.join(',');
        break;
        // -- Extensions criteria --
        case 'X-GM-MSGID': // Gmail unique message ID
        case 'X-GM-THRID': // Gmail thread ID
          if (extensions.indexOf('X-GM-EXT-1') === -1)
            throw new Error('IMAP extension not available: ' + criteria);
          var val;
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          else {
            val = ''+args[0];
            if (!(/^\d+$/.test(args[0])))
              throw new Error('Invalid value');
          }
          searchargs += modifier + criteria + ' ' + val;
        break;
        case 'X-GM-RAW': // Gmail search syntax
          if (extensions.indexOf('X-GM-EXT-1') === -1)
            throw new Error('IMAP extension not available: ' + criteria);
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          searchargs += modifier + criteria + ' "' + escape(''+args[0]) + '"';
        break;
        case 'X-GM-LABELS': // Gmail labels
          if (extensions.indexOf('X-GM-EXT-1') === -1)
            throw new Error('IMAP extension not available: ' + criteria);
          if (!args || args.length !== 1)
            throw new Error('Incorrect number of arguments for search option: '
                            + criteria);
          searchargs += modifier + criteria + ' ' + args[0];
        break;
        default:
          throw new Error('Unexpected search option: ' + criteria);
      }
    }
    if (isOrChild)
      break;
  }
  console.log('searchargs:', searchargs);
  return searchargs;
}

function validateUIDList(uids) {
  for (var i=0,len=uids.length,intval; i<len; i++) {
    if (typeof uids[i] === 'string') {
      if (uids[i] === '*' || uids[i] === '*:*') {
        if (len > 1)
          uids = ['*'];
        break;
      } else if (/^(?:[\d]+|\*):(?:[\d]+|\*)$/.test(uids[i]))
        continue;
    }
    intval = parseInt(''+uids[i]);
    if (isNaN(intval)) {
      throw new Error('Message ID/number must be an integer, "*", or a range: '
                      + uids[i]);
    } else if (typeof uids[i] !== 'number')
      uids[i] = intval;
  }
}

/**
 * Parse a UID list string (which can include ranges) into an array of integers
 * (without ranges).  This should not be used in cases where "*" is allowed.
 */
function parseUIDListString(str) {
  var uids = [];
  if (!str.length)
    return uids;
  // the first character has to be a digit.
  var uidStart = 0, rangeStart = -1, rangeEnd, uid;
  for (var i = 1; i < str.length; i++) {
    var c = str.charCodeAt(i);
    // ':'
    if (c === 48) {
      rangeStart = parseInt(str.substring(uidStart, i));
      uidStart = ++i; // the next char must be a digit
    }
    // ','
    else if (c === '44') {
      if (rangeStart === -1) {
        uids.push(parseInt(str.substring(uidStart, i)));
      }
      else {
        rangeEnd = parseInt(str.substring(uidStart, i));
        for (uid = rangeStart; uid <= rangeEnd; uid++) {
          uids.push(uid);
        }
      }
      rangeStart = -1;
      start = ++i; // the next char must be a digit
    }
    // (digit!)
  }
  // we ran out of characters!  something must still be active
  if (rangeStart === -1) {
    uids.push(parseInt(str.substring(uidStart, i)));
  }
  else {
    rangeEnd = parseInt(str.substring(uidStart, i));
    for (uid = rangeStart; uid <= rangeEnd; uid++) {
      uids.push(uid);
    }
  }
  return uids;
}

function parseNamespaces(str, namespaces) {
  var result = parseExpr(str);
  for (var grp=0; grp<3; ++grp) {
    if (Array.isArray(result[grp])) {
      var vals = [];
      for (var i=0,len=result[grp].length; i<len; ++i) {
        var val = { prefix: result[grp][i][0], delim: result[grp][i][1] };
        if (result[grp][i].length > 2) {
          // extension data
          val.extensions = [];
          for (var j=2,len2=result[grp][i].length; j<len2; j+=2) {
            val.extensions.push({
              name: result[grp][i][j],
              flags: result[grp][i][j+1]
            });
          }
        }
        vals.push(val);
      }
      if (grp === 0)
        namespaces.personal = vals;
      else if (grp === 1)
        namespaces.other = vals;
      else if (grp === 2)
        namespaces.shared = vals;
    }
  }
}

function parseFetch(str, literalData, fetchData) {
  var key, idxNext, result = parseExpr(str);
  for (var i=0,len=result.length; i<len; i+=2) {
    if (result[i] === 'UID')
      fetchData.id = parseInt(result[i+1], 10);
    else if (result[i] === 'INTERNALDATE') {
      fetchData.rawDate = result[i+1];
      fetchData.date = parseImapDateTime(result[i+1]);
    }
    else if (result[i] === 'FLAGS') {
      // filter out empty flags and \Recent.  As RFC 3501 makes clear, the
      // \Recent flag is effectively useless because its semantics are that
      // only one connection will see it.  Accordingly, there's no need to
      // trouble consumers with it.
      fetchData.flags = result[i+1].filter(isNotEmptyOrRecent);
      // simplify comparison for downstream logic by sorting.
      fetchData.flags.sort();
    }
    // MODSEQ (####)
    else if (result[i] === 'MODSEQ')
      fetchData.modseq = result[i+1].slice(1, -1);
    else if (result[i] === 'BODYSTRUCTURE')
      fetchData.structure = parseBodyStructure(result[i+1]);
    else if (typeof result[i] === 'string') // simple extensions
      fetchData[result[i].toLowerCase()] = result[i+1];
    else if (Array.isArray(result[i]) && typeof result[i][0] === 'string' &&
             result[i][0].indexOf('HEADER') === 0 && literalData) {
      var mparser = new mailparser.MailParser();
      mparser._remainder = literalData;
      // invoke mailparser's logic in a fully synchronous fashion
      process.immediate = true;
      mparser._process(true);
      process.immediate = false;
      /*
      var headers = literalData.split(/\r\n(?=[\w])/), header;
      fetchData.headers = {};
      for (var j=0,len2=headers.length; j<len2; ++j) {
        header = headers[j].substring(0, headers[j].indexOf(': ')).toLowerCase();
        if (!fetchData.headers[header])
          fetchData.headers[header] = [];
        fetchData.headers[header].push(headers[j].substr(headers[j]
                                                 .indexOf(': ')+2)
                                                 .replace(/\r\n/g, '').trim());
      }
      */
      fetchData.msg = mparser._currentNode;
    }
  }
}

function parseBodyStructure(cur, prefix, partID) {
  var ret = [];
  if (prefix === undefined) {
    var result = (Array.isArray(cur) ? cur : parseExpr(cur));
    if (result.length)
      ret = parseBodyStructure(result, '', 1);
  } else {
    var part, partLen = cur.length, next;
    if (Array.isArray(cur[0])) { // multipart
      next = -1;
      while (Array.isArray(cur[++next])) {
        ret.push(parseBodyStructure(cur[next], prefix
                                               + (prefix !== '' ? '.' : '')
                                               + (partID++).toString(), 1));
      }
      part = { type: 'multipart', subtype: cur[next++].toLowerCase() };
      if (partLen > next) {
        if (Array.isArray(cur[next])) {
          part.params = {};
          for (var i=0,len=cur[next].length; i<len; i+=2)
            part.params[cur[next][i].toLowerCase()] = cur[next][i+1];
        } else
          part.params = cur[next];
        ++next;
      }
    } else { // single part
      next = 7;
      if (typeof cur[1] === 'string') {
        part = {
          // the path identifier for this part, useful for fetching specific
          // parts of a message
          partID: (prefix !== '' ? prefix : '1'),

          // required fields as per RFC 3501 -- null or otherwise
          type: cur[0].toLowerCase(), subtype: cur[1].toLowerCase(),
          params: null, id: cur[3], description: cur[4], encoding: cur[5],
          size: cur[6]
        }
      } else {
        // type information for malformed multipart body
        part = { type: cur[0].toLowerCase(), params: null };
        cur.splice(1, 0, null);
        ++partLen;
        next = 2;
      }
      if (Array.isArray(cur[2])) {
        part.params = {};
        for (var i=0,len=cur[2].length; i<len; i+=2)
          part.params[cur[2][i].toLowerCase()] = cur[2][i+1];
        if (cur[1] === null)
          ++next;
      }
      if (part.type === 'message' && part.subtype === 'rfc822') {
        // envelope
        if (partLen > next && Array.isArray(cur[next])) {
          part.envelope = {};
          for (var i=0,field,len=cur[next].length; i<len; ++i) {
            if (i === 0)
              part.envelope.date = cur[next][i];
            else if (i === 1)
              part.envelope.subject = cur[next][i];
            else if (i >= 2 && i <= 7) {
              var val = cur[next][i];
              if (Array.isArray(val)) {
                var addresses = [], inGroup = false, curGroup;
                for (var j=0,len2=val.length; j<len2; ++j) {
                  if (val[j][3] === null) { // start group addresses
                    inGroup = true;
                    curGroup = {
                      group: val[j][2],
                      addresses: []
                    };
                  } else if (val[j][2] === null) { // end of group addresses
                    inGroup = false;
                    addresses.push(curGroup);
                  } else { // regular user address
                    var info = {
                      name: val[j][0],
                      mailbox: val[j][2],
                      host: val[j][3]
                    };
                    if (inGroup)
                      curGroup.addresses.push(info);
                    else
                      addresses.push(info);
                  }
                }
                val = addresses;
              }
              if (i === 2)
                part.envelope.from = val;
              else if (i === 3)
                part.envelope.sender = val;
              else if (i === 4)
                part.envelope['reply-to'] = val;
              else if (i === 5)
                part.envelope.to = val;
              else if (i === 6)
                part.envelope.cc = val;
              else if (i === 7)
                part.envelope.bcc = val;
            } else if (i === 8)
              // message ID being replied to
              part.envelope['in-reply-to'] = cur[next][i];
            else if (i === 9)
              part.envelope['message-id'] = cur[next][i];
            else
              break;
          }
        } else
          part.envelope = null;
        ++next;

        // body
        if (partLen > next && Array.isArray(cur[next])) {
          part.body = parseBodyStructure(cur[next], prefix
                                                    + (prefix !== '' ? '.' : '')
                                                    + (partID++).toString(), 1);
        } else
          part.body = null;
        ++next;
      }
      if ((part.type === 'text'
           || (part.type === 'message' && part.subtype === 'rfc822'))
          && partLen > next)
        part.lines = cur[next++];
      if (typeof cur[1] === 'string' && partLen > next)
        part.md5 = cur[next++];
    }
    // add any extra fields that may or may not be omitted entirely
    parseStructExtra(part, partLen, cur, next);
    ret.unshift(part);
  }
  return ret;
}

function parseStructExtra(part, partLen, cur, next) {
  if (partLen > next) {
    // disposition
    // null or a special k/v list with these kinds of values:
    // e.g.: ['Foo', null]
    //       ['Foo', ['Bar', 'Baz']]
    //       ['Foo', ['Bar', 'Baz', 'Bam', 'Pow']]
    var disposition = { type: null, params: null };
    if (Array.isArray(cur[next])) {
      disposition.type = cur[next][0];
      if (Array.isArray(cur[next][1])) {
        disposition.params = {};
        for (var i=0,len=cur[next][1].length; i<len; i+=2)
          disposition.params[cur[next][1][i].toLowerCase()] = cur[next][1][i+1];
      }
    } else if (cur[next] !== null)
      disposition.type = cur[next];

    if (disposition.type === null)
      part.disposition = null;
    else
      part.disposition = disposition;

    ++next;
  }
  if (partLen > next) {
    // language can be a string or a list of one or more strings, so let's
    // make this more consistent ...
    if (cur[next] !== null)
      part.language = (Array.isArray(cur[next]) ? cur[next] : [cur[next]]);
    else
      part.language = null;
    ++next;
  }
  if (partLen > next)
    part.location = cur[next++];
  if (partLen > next) {
    // extension stuff introduced by later RFCs
    // this can really be any value: a string, number, or (un)nested list
    // let's not parse it for now ...
    part.extensions = cur[next];
  }
}

function stringExplode(string, delimiter, limit) {
  if (arguments.length < 3 || arguments[1] === undefined
      || arguments[2] === undefined
      || !delimiter || delimiter === '' || typeof delimiter === 'function'
      || typeof delimiter === 'object')
      return false;

  delimiter = (delimiter === true ? '1' : delimiter.toString());

  if (!limit || limit === 0)
    return string.split(delimiter);
  else if (limit < 0)
    return false;
  else if (limit > 0) {
    var splitted = string.split(delimiter);
    var partA = splitted.splice(0, limit - 1);
    var partB = splitted.join(delimiter);
    partA.push(partB);
    return partA;
  }

  return false;
}

function isNotEmpty(str) {
  return str.trim().length > 0;
}

const RE_RECENT = /^\\Recent$/i;
function isNotEmptyOrRecent(str) {
  var s = str.trim();
  return s.length > 0 && !RE_RECENT.test(s);
}

function escape(str) {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function unescape(str) {
  return str.replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

function up(str) {
  return str.toUpperCase();
}

function parseExpr(o, result, start) {
  start = start || 0;
  var inQuote = false, lastPos = start - 1, isTop = false;
  if (!result)
    result = new Array();
  if (typeof o === 'string') {
    var state = new Object();
    state.str = o;
    o = state;
    isTop = true;
  }
  for (var i=start,len=o.str.length; i<len; ++i) {
    if (!inQuote) {
      if (o.str[i] === '"')
        inQuote = true;
      else if (o.str[i] === ' ' || o.str[i] === ')' || o.str[i] === ']') {
        if (i - (lastPos+1) > 0)
          result.push(convStr(o.str.substring(lastPos+1, i)));
        if (o.str[i] === ')' || o.str[i] === ']')
          return i;
        lastPos = i;
      } else if (o.str[i] === '(' || o.str[i] === '[') {
        var innerResult = [];
        i = parseExpr(o, innerResult, i+1);
        lastPos = i;
        result.push(innerResult);
      }
    } else if (o.str[i] === '"' &&
               (o.str[i-1] &&
                (o.str[i-1] !== '\\' || (o.str[i-2] && o.str[i-2] === '\\'))))
      inQuote = false;
    if (i+1 === len && len - (lastPos+1) > 0)
      result.push(convStr(o.str.substring(lastPos+1)));
  }
  return (isTop ? result : start);
}

function convStr(str) {
  if (str[0] === '"')
    return str.substring(1, str.length-1);
  else if (str === 'NIL')
    return null;
  else if (/^\d+$/.test(str)) {
    // some IMAP extensions utilize large (64-bit) integers, which JavaScript
    // can't handle natively, so we'll just keep it as a string if it's too big
    var val = parseInt(str, 10);
    return (val.toString() === str ? val : str);
  } else
    return str;
}

// Very simple extend that meets our minimal use-cases because the jQuery one
// was not working correct in the worker and we don't really need much in the
// way of fanciness.
function extend(target, source, recurseInto) {
  for (var key in source) {
    if (recurseInto && key === recurseInto)
      extend(target[key], source[key]);
    else
      target[key] = source[key];
  }

  return target;
};

function bufferAppend(buf1, buf2) {
  var newBuf = new Buffer(buf1.length + buf2.length);
  buf1.copy(newBuf, 0, 0);
  if (Buffer.isBuffer(buf2))
    buf2.copy(newBuf, buf1.length, 0);
  else if (Array.isArray(buf2)) {
    for (var i=buf1.length, len=buf2.length; i<len; i++)
      newBuf[i] = buf2[i];
  }

  return newBuf;
};

/**
 * Split the contents of a buffer on CRLF pairs, retaining the CRLF's on all but
 * the first line. In other words, ret[1] through ret[ret.length-1] will have
 * CRLF's.  The last entry may or may not have a CRLF.  The last entry will have
 * a non-zero length.
 *
 * This logic is very specialized to its one caller...
 */
function customBufferSplitCRLF(buf) {
  var ret = [];
  var effLen = buf.length - 1, start = 0;
  for (var i = 0; i < effLen;) {
    if (buf[i] === 13 && buf[i + 1] === 10) {
      // do include the CRLF in the entry if this is not the first one.
      if (ret.length) {
        i += 2;
        ret.push(buf.slice(start, i));
      }
      else {
        ret.push(buf.slice(start, i));
        i += 2;
      }
      start = i;
    }
    else {
      i++;
    }
  }
  if (!ret.length)
    ret.push(buf);
  else if (start < buf.length)
    ret.push(buf.slice(start, buf.length));
  return ret;
}

function bufferIndexOfCRLF(buf, start) {
  // It's a 2 character sequence, pointless to check the last character,
  // especially since it would introduce additional boundary checks.
  var effLen = buf.length - 1;
  for (var i = start || 0; i < effLen; i++) {
    if (buf[i] === 13 && buf[i + 1] === 10)
      return i;
  }
  return -1;
}

var LOGFAB = exports.LOGFAB = $log.register(module, {
  ImapProtoConn: {
    type: $log.CONNECTION,
    subtype: $log.CLIENNT,
    events: {
      created: {},
      connect: {},
      connected: {},
      closed: {},
      sendData: { length: false },
      bypassCmd: { prefix: false, cmd: false },
      data: { length: false },
    },
    TEST_ONLY_events: {
      connect: { host: false, port: false },
      sendData: { data: false },
      // This may be a Buffer and therefore need to be coerced
      data: { data: $log.TOSTRING },
    },
    errors: {
      connError: { err: $log.EXCEPTION },
      bad: { msg: false },
      unknownResponse: { d0: false, d1: false, d2: false },
    },
    asyncJobs: {
      cmd: { prefix: false, cmd: false },
    },
    TEST_ONLY_asyncJobs: {
      cmd: { data: false },
    },
  },
}); // end LOGFAB

});

/**
 * Validates connection information for an account and verifies the server on
 * the other end is something we are capable of sustaining an account with.
 * Before growing this logic further, first try reusing/adapting/porting the
 * Thunderbird autoconfiguration logic.
 **/

define('mailapi/imap/probe',
  [
    'imap',
    'exports'
  ],
  function(
    $imap,
    exports
  ) {

/**
 * How many milliseconds should we wait before giving up on the connection?
 *
 * This really wants to be adaptive based on the type of the connection, but
 * right now we have no accurate way of guessing how good the connection is in
 * terms of latency, overall internet speed, etc.  Experience has shown that 10
 * seconds is currently insufficient on an unagi device on 2G on an AT&T network
 * in American suburbs, although some of that may be problems internal to the
 * device.  I am tripling that to 30 seconds for now because although it's
 * horrible to drag out a failed connection to an unresponsive server, it's far
 * worse to fail to connect to a real server on a bad network, etc.
 */
exports.CONNECT_TIMEOUT_MS = 30000;

/**
 * Right now our tests consist of:
 * - logging in to test the credentials
 *
 * If we succeed at that, we hand off the established connection to our caller
 * so they can reuse it.
 */
function ImapProber(credentials, connInfo, _LOG) {
  var opts = {
    host: connInfo.hostname,
    port: connInfo.port,
    crypto: connInfo.crypto,

    username: credentials.username,
    password: credentials.password,

    connTimeout: exports.CONNECT_TIMEOUT_MS,
  };
  if (_LOG)
    opts._logParent = _LOG;

  console.log("PROBE:IMAP attempting to connect to", connInfo.hostname);
  this._conn = new $imap.ImapConnection(opts);
  this._conn.connect(this.onLoggedIn.bind(this));
  this._conn.on('error', this.onError.bind(this));

  this.tzOffset = null;
  this.blacklistedCapabilities = null;

  this.onresult = null;
  this.error = null;
  this.errorDetails = { server: connInfo.hostname };
}
exports.ImapProber = ImapProber;
ImapProber.prototype = {
  onLoggedIn: function ImapProber_onLoggedIn(err) {
    if (err) {
      this.onError(err);
      return;
    }

    getTZOffset(this._conn, this.onGotTZOffset.bind(this));
  },

  onGotTZOffset: function ImapProber_onGotTZOffset(err, tzOffset) {
    if (err) {
      this.onError(err);
      return;
    }

    console.log('PROBE:IMAP happy, TZ offset:', tzOffset / (60 * 60 * 1000));
    this.tzOffset = tzOffset;

    exports.checkServerProblems(this._conn,
                                this.onServerProblemsChecked.bind(this));
  },

  onServerProblemsChecked: function(err, blacklistedCapabilities) {
    if (err) {
      this.onError(err);
      return;
    }

    this.blacklistedCapabilities = blacklistedCapabilities;

    var conn = this._conn;
    this._conn = null;

    if (!this.onresult)
      return;
    this.onresult(this.error, conn, this.tzOffset, blacklistedCapabilities);
    this.onresult = false;
  },

  onError: function ImapProber_onError(err) {
    if (!this.onresult)
      return;
    console.warn('PROBE:IMAP sad.', err && err.name, '|', err && err.type, '|',
                 err && err.message, '|', err && err.serverResponse);

    var normErr = normalizeError(err);
    this.error = normErr.name;

    // we really want to make sure we clean up after this dude.
    try {
      this._conn.die();
    }
    catch (ex) {
    }
    this._conn = null;

    this.onresult(this.error, null, this.errorDetails);
    // we could potentially see many errors...
    this.onresult = false;
  },
};

/**
 * Convert error objects from the IMAP connection to our internal error codes
 * as defined in `MailApi.js` for tryToCreateAccount.  This is used by the
 * probe during account creation and by `ImapAccount` during general connection
 * establishment.
 *
 * @return[@dict[
 *   @key[name String]
 *   @key[reachable Boolean]{
 *     Does this error indicate the server was reachable?  This is to be
 *     reported to the `BackoffEndpoint`.
 *   }
 *   @key[retry Boolean]{
 *     Should we retry the connection?  The answer is no for persistent problems
 *     or transient problems that are expected to be longer lived than the scale
 *     of our automatic retries.
 *   }
 *   @key[reportProblem Boolean]{
 *     Should we report this as a problem on the account?  We should do this
 *     if we expect this to be a persistent problem that requires user action
 *     to resolve and we expect `MailUniverse.__reportAccountProblem` to
 *     generate a specific user notification for the error.  If we're not going
 *     to bother the user with a popup, then we probably want to return false
 *     for this and leave it for the connection failure to cause the
 *     `BackoffEndpoint` to cause a problem to be logged via the listener
 *     mechanism.
 *   }
 * ]]
 */
var normalizeError = exports.normalizeError = function normalizeError(err) {
  var errName, reachable = false, retry = true, reportProblem = false;
  // We want to produce error-codes as defined in `MailApi.js` for
  // tryToCreateAccount.  We have also tried to make imap.js produce
  // error codes of the right type already, but for various generic paths
  // (like saying 'NO'), there isn't currently a good spot for that.
  switch (err.type) {
    // dovecot says after a delay and does not terminate the connection:
    //   NO [AUTHENTICATIONFAILED] Authentication failed.
    // zimbra 7.2.x says after a delay and DOES terminate the connection:
    //   NO LOGIN failed
    //   * BYE Zimbra IMAP server terminating connection
    // yahoo says after a delay and does not terminate the connection:
    //   NO [AUTHENTICATIONFAILED] Incorrect username or password.
  case 'NO':
  case 'no':
    reachable = true;
    if (!err.serverResponse) {
      errName = 'unknown';
      reportProblem = false;
    }
    else {
      // All of these require user action to resolve.
      reportProblem = true;
      retry = false;
      if (err.serverResponse.indexOf(
        '[ALERT] Application-specific password required') !== -1)
        errName = 'needs-app-pass';
      else if (err.serverResponse.indexOf(
            '[ALERT] Your account is not enabled for IMAP use.') !== -1 ||
          err.serverResponse.indexOf(
            '[ALERT] IMAP access is disabled for your domain.') !== -1)
        errName = 'imap-disabled';
      else
        errName = 'bad-user-or-pass';
    }
    break;
  case 'server-maintenance':
    errName = err.type;
    reachable = true;
    // do retry
    break;
  // An SSL error is either something we just want to report (probe), or
  // something that is currently probably best treated as a network failure.  We
  // could tell the user they may be experiencing a MITM attack, but that's not
  // really something they can do anything about and we have protected them from
  // it currently.
  case 'bad-security':
    errName = err.type;
    reachable = true;
    retry = false;
    break;
  case 'unresponsive-server':
  case 'timeout':
    errName = 'unresponsive-server';
    break;
  default:
    errName = 'unknown';
    break;
  }

  return {
    name: errName,
    reachable: reachable,
    retry: retry,
    reportProblem: reportProblem,
  };
};


/**
 * If a folder has no messages, then we need to default the timezone, and
 * California is the most popular!
 *
 * XXX DST issue, maybe vary this.
 */
var DEFAULT_TZ_OFFSET = -7 * 60 * 60 * 1000;

var extractTZFromHeaders = exports._extractTZFromHeaders =
    function extractTZFromHeaders(allHeaders) {
  for (var i = 0; i < allHeaders.length; i++) {
    var hpair = allHeaders[i];
    if (hpair.key !== 'received')
      continue;
    var tzMatch = / ([+-]\d{4})/.exec(hpair.value);
    if (tzMatch) {
      var tz =
        parseInt(tzMatch[1].substring(1, 3), 10) * 60 * 60 * 1000 +
        parseInt(tzMatch[1].substring(3, 5), 10) * 60 * 1000;
      if (tzMatch[1].substring(0, 1) === '-')
        tz *= -1;
      return tz;
    }
  }

  return null;
};

/**
 * Try and infer the current effective timezone of the server by grabbing the
 * most recent message as implied by UID (may be inaccurate), and then looking
 * at the most recent Received header's timezone.
 *
 * In order to figure out the UID to ask for, we do a dumb search to figure out
 * what UIDs are valid.
 */
var getTZOffset = exports.getTZOffset = function getTZOffset(conn, callback) {
  function gotInbox(err, box) {
    if (err) {
      callback(err);
      return;
    }
    if (!box.messages.total) {
      callback(null, DEFAULT_TZ_OFFSET);
      return;
    }
    searchRange(box._uidnext - 1);
  }
  function searchRange(highUid) {
    conn.search([['UID', Math.max(1, highUid - 49) + ':' + highUid]],
                gotSearch.bind(null, highUid - 50));
  }
  var viableUids = null;
  function gotSearch(nextHighUid, err, uids) {
    if (!uids.length) {
      if (nextHighUid < 0) {
        callback(null, DEFAULT_TZ_OFFSET);
        return;
      }
      searchRange(nextHighUid);
    }
    viableUids = uids;
    useUid(viableUids.pop());
  }
  function useUid(uid) {
    var fetcher = conn.fetch(
      [uid],
      {
        request: {
          headers: ['RECEIVED'],
          struct: false,
          body: false
        },
      });
    fetcher.on('message', function onMsg(msg) {
        msg.on('end', function onMsgEnd() {
            var tz = extractTZFromHeaders(msg.msg.headers);
            if (tz !== null) {
              callback(null, tz);
              return;
            }
            // If we are here, the message somehow did not have a Received
            // header.  Try again with another known UID or fail out if we
            // have run out of UIDs.
            if (viableUids.length)
              useUid(viableUids.pop());
            else // fail to the default.
              callback(null, DEFAULT_TZ_OFFSET);
          });
      });
    fetcher.on('error', function onFetchErr(err) {
      callback(err);
      return;
    });
  }
  var uidsTried = 0;
  conn.openBox('INBOX', true, gotInbox);
};

/**
 * Check for server problems and determine if they are fatal or if we can work
 * around them.  We run this as part of the probing step so we can avoid
 * creating the account at all if it's not going to work.
 *
 * This is our hit-list:
 *
 * - Broken SPECIAL-USE implementation.  We detect this and work-around it by
 *   blacklisting the SPECIAL-USE capability.  daum.net currently advertises
 *   SPECIAL-USE but its implementation is deeply broken.  From
 *   https://bugzilla.mozilla.org/show_bug.cgi?id=904022#c4 we have:
 *   - SPECIAL-USE does not actually seem to be listing any defined special-use
 *     flags
 *   - Our RETURN (SPECIAL-USE) command seems to be displaying folders that are
 *     hidden from the normal LIST command.  It seems like those folders should
 *     still be listed under a straight up 'LIST "" "*"' command.
 *   - The core bug here, 'LIST "" "*" RETURN (SPECIAL-USE)' is being
 *     interpreted as 'LIST (SPECIAL-USE) "" "*"' where only folders with
 *     SPECIAL-USE flags should be returned.  Of course, since no special use
 *     flags are actually returned, that's still buggy.
 *
 * Other notes:
 *
 * - We haven't seen a broken XLIST implementation yet so we're not checking it.
 *
 * @param conn {ImapConnection}
 * @param callback {Function(err, nullOrListOfBlacklistedCapabilities)}
 */
exports.checkServerProblems = function(conn, callback) {
  // If there is no SPECIAL-USE capability, there is nothing for us to check.
  if (!conn.hasCapability('SPECIAL-USE')) {
    callback(null, null);
  }

  function hasInbox(boxesRoot) {
    for (var boxName in boxesRoot) {
      if (boxName.toLowerCase() === 'inbox') {
        return true;
      }
    }
    return false;
  }

  // Our success metric is that if our SPECIAL-USE LIST invocation returns the
  // Inbox, then it's not broken.  This is the simplest and most straightforward
  // test because RFC 3501 demands that Inbox exists at that path, avoiding
  // namespace complications.  (The personal namespace can be rooted under
  // INBOX, but INBOX is still exists and is chock full of messages.)
  conn.getBoxes(function(err, boxesRoot) {
    // No inbox?  Let's turn off SPECIAL-USE and see if we find the Inbox.
    if (!hasInbox(boxesRoot)) {
      conn.blacklistCapability('SPECIAL-USE');
      conn.getBoxes(function(err, boxesRoot) {
        // Blacklist if we found an inbox.
        if (hasInbox(boxesRoot))
          callback(null, ['SPECIAL-USE']);
        // Fatally bad news.  Create a better IMAP error message and string if
        // we ever encounter a server that we actually can't support at all.
        else
          callback('server-problem', null);
      });
      return;
    }
    // Found the inbox; the server is fine.  Hooray for good IMAP servers!
    callback(null, null);
  });
};

}); // end define
;