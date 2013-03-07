
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
define('net',['require','exports','module','util','events'],function(require, exports, module) {

var util = require('util'),
    EventEmitter = require('events').EventEmitter;

function NetSocket(port, host, crypto) {
  this._host = host;
  this._port = port;
  this._actualSock = navigator.mozTCPSocket.open(
    host, port, { useSSL: crypto, binaryType: 'arraybuffer' });
  EventEmitter.call(this);

  this._actualSock.onopen = this._onconnect.bind(this);
  this._actualSock.onerror = this._onerror.bind(this);
  this._actualSock.ondata = this._ondata.bind(this);
  this._actualSock.onclose = this._onclose.bind(this);

  this.destroyed = false;
}
exports.NetSocket = NetSocket;
util.inherits(NetSocket, EventEmitter);
NetSocket.prototype.setTimeout = function() {
};
NetSocket.prototype.setKeepAlive = function(shouldKeepAlive) {
};
NetSocket.prototype.write = function(buffer) {
  this._actualSock.send(buffer);
};
NetSocket.prototype.end = function() {
  this._actualSock.close();
  this.destroyed = true;
};

NetSocket.prototype._onconnect = function(event) {
  this.emit('connect', event.data);
};
NetSocket.prototype._onerror = function(event) {
  this.emit('error', event.data);
};
NetSocket.prototype._ondata = function(event) {
  var buffer = Buffer(event.data);
  this.emit('data', buffer);
};
NetSocket.prototype._onclose = function(event) {
  this.emit('close', event.data);
  this.emit('end', event.data);
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
  this._options = extend(true, this._options, options);
  // The Date.now thing is to assign a random/unique value as a logging stop-gap
  this._LOG = (this._options._logParent ? LOGFAB.ImapProtoConn(this, this._options._logParent, Date.now() % 1000) : null);
  if (this._LOG) this._LOG.created();
  this.delim = null;
  this.namespaces = { personal: [], other: [], shared: [] };
  this.capabilities = [];
  this.enabledCapabilities = [];
};
util.inherits(ImapConnection, EventEmitter);
exports.ImapConnection = ImapConnection;

ImapConnection.prototype.hasCapability = function(name) {
  return this.capabilities.indexOf(name) !== -1;
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
    clearTimeoutFunc(self._state.tmrConn);
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
      processData(buffer);
    }
    catch (ex) {
      console.error('Explosion while processing data', ex);
      if ('stack' in ex)
        console.error('Stack:', ex.stack);
      throw ex;
    }
  });
  /**
   * Process up to one thing.  Generally:
   * - If we are processing a literal, we make sure we have the data for the
   *   whole literal, then we process it.
   * - If we are not in a literal, we buffer until we have one newline.
   * - If we have leftover data, we invoke ourselves in a quasi-tail-recursive
   *   fashion or in subsequent ticks.  It's not clear that the logic that
   *   defers to future ticks is sound.
   */
  function processData(data) {
    if (data.length === 0) return;
    var idxCRLF = null, literalInfo;

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
      var curReq = self._state.requests[0];
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
            processData(data);
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

        var curReq = self._state.requests[0],
            type = /BODY\[(.*)\](?:\<\d+\>)?/.exec(strdata),
            msg = new ImapMessage(),
            desc = strdata.substring(strdata.indexOf('(')+1).trim();
        msg.seqno = parseInt(literalInfo[1], 10);
        type = type[1];
        curReq._desc = desc;
        curReq._msg = msg;

        curReq._fetcher.emit('message', msg);

        curReq._msgtype = (type.indexOf('HEADER') === 0 ? 'headers' : 'body');
        // This library buffers headers, so allocate a buffer to hold the literal.
        if (curReq._msgtype === 'headers') {
          self._state.curData = new Buffer(self._state.curExpected);
          curReq.curPos = 0;
        }
        if (self._LOG) self._LOG.data(strdata.length, strdata);
        // (If it's not headers, then it's body, and we generate 'data' events.)
        processData(data.slice(idxCRLF + 2));
        return;
      }
    }

    if (data.length === 0)
      return;
    data = customBufferSplitCRLF(data);
    // Defer any extra server responses found in the incoming data
    for (var i=1,len=data.length; i<len; ++i) {
      process.nextTick(processData.bind(null, data[i]));
    }

    data = data[0].toString('ascii');
    if (self._LOG) self._LOG.data(data.length, data);
    data = stringExplode(data, ' ', 3);

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
                  if (self._state.requests.length &&
                      self._state.requests[0].command.indexOf('FETCH') > -1) {
                    var curReq = self._state.requests[0];
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
        return process.nextTick(function() { self._send(); });
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

      if (self._state.requests[0].command.indexOf('RENAME') > -1) {
        self._state.box.name = self._state.box._newName;
        delete self._state.box._newName;
        sendBox = true;
      }

      if (typeof self._state.requests[0].callback === 'function') {
        var err = null;
        var args = self._state.requests[0].args,
            cmd = self._state.requests[0].command;
        if (data[0] === '+') {
          if (cmd.indexOf('APPEND') !== 0) {
            err = new Error('Unexpected continuation');
            err.type = 'continuation';
            err.serverResponse = '';
            err.request = cmd;
          } else
            return self._state.requests[0].callback();
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
        self._state.requests[0].callback.apply({}, args);
      }


      var recentReq = self._state.requests.shift();
      if (!recentReq) {
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
        // detect an nsISSLStatus instance by an unusual property.
        if ('isNotValidAtThisTime' in err) {
          err = new Error('SSL error');
          errType = err.type = 'bad-security';
        }
      }
      clearTimeoutFunc(self._state.tmrConn);
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
  // NB: there's still a lot of events that could happen, but this is only
  // being used by unit tests right now.
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
      self._state.conn.send(Buffer(data + CRLF));
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
  extend(true, opts, options);

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

  var extensions = '';
  if (this.capabilities.indexOf('X-GM-EXT-1') > -1)
    extensions = 'X-GM-THRID X-GM-MSGID X-GM-LABELS ';
  // google is mutually exclusive with QRESYNC
  else if (this.enabledCapabilities.indexOf('QRESYNC') > -1)
    extensions = 'MODSEQ ';

  this._send(which + 'FETCH', ' ' + uids.join(',') + ' (' + extensions
             + 'UID FLAGS INTERNALDATE'
             + (opts.request.struct ? ' BODYSTRUCTURE' : '')
             + (typeof toFetch === 'string' ? ' BODY'
             + (!opts.markSeen ? '.PEEK' : '')
             + '[' + toFetch + ']' + bodyRange : '') + ')', function(e) {
               var fetcher = self._state.requests[0]._fetcher;
               if (e && fetcher)
                 fetcher.emit('error', e);
               else if (e && !fetcher)
                 self.emit('error', e);
               else if (fetcher)
                 fetcher.emit('end');
             }
  );
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
ImapConnection.prototype._send = function(cmdstr, cmddata, cb, dispatchFunc,
                                          bypass) {
  if (cmdstr !== undefined && !bypass)
    this._state.requests.push(
      {
        prefix: null,
        command: cmdstr,
        cmddata: cmddata,
        callback: cb,
        dispatch: dispatchFunc,
        args: []
      });
  // If we are currently transitioning to/from idle, then wait around for the
  // server's response before doing anything more.
  if (this._state.ext.idle.state === IDLE_WAIT ||
      this._state.ext.idle.state === DONE_WAIT)
    return;
  // only do something if this was 1) an attempt to kick us to run the next
  // command, 2) the first/only command (none are pending), or 3) a bypass.
  if ((cmdstr === undefined && this._state.requests.length) ||
      this._state.requests.length === 1 || bypass) {
    var prefix = '', cmd = (bypass ? cmdstr : this._state.requests[0].command),
        data = (bypass ? null : this._state.requests[0].cmddata),
        dispatch = (bypass ? null : this._state.requests[0].dispatch);
    clearTimeoutFunc(this._state.tmrKeepalive);
    // If we are currently in IDLE, we need to exit it before we send the
    // actual command.  We mark it as a bypass so it does't mess with the
    // list of requests.
    if (this._state.ext.idle.state === IDLE_READY && cmd !== 'DONE')
      return this._send('DONE', null, undefined, undefined, true);
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
      if (!bypass)
        this._state.requests[0].prefix = prefix;
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

    if (this._LOG) { if (!bypass) this._LOG.cmd_begin(prefix, cmd, /^LOGIN$/.test(cmd) ? '***BLEEPING OUT LOGON***' : data); else this._LOG.bypassCmd(prefix, cmd);}

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

/**
 * Adopted from jquery's extend method. Under the terms of MIT License.
 *
 * http://code.jquery.com/jquery-1.4.2.js
 *
 * Modified by Brian White to use Array.isArray instead of the custom isArray
 * method
 */
function extend() {
  // copy reference to target object
  var target = arguments[0] || {},
      i = 1,
      length = arguments.length,
      deep = false,
      options,
      name,
      src,
      copy;

  // Handle a deep copy situation
  if (typeof target === "boolean") {
    deep = target;
    target = arguments[1] || {};
    // skip the boolean and the target
    i = 2;
  }

  // Handle case when target is a string or something (possible in deep copy)
  if (typeof target !== "object" && !typeof target === 'function')
    target = {};

  var isPlainObject = function(obj) {
    // Must be an Object.
    // Because of IE, we also have to check the presence of the constructor
    // property.
    // Make sure that DOM nodes and window objects don't pass through, as well
    if (!obj || toString.call(obj) !== "[object Object]" || obj.nodeType
        || obj.setInterval)
      return false;

    var has_own_constructor = hasOwnProperty.call(obj, "constructor");
    var has_is_prop_of_method = hasOwnProperty.call(obj.constructor.prototype,
                                                    "isPrototypeOf");
    // Not own constructor property must be Object
    if (obj.constructor && !has_own_constructor && !has_is_prop_of_method)
      return false;

    // Own properties are enumerated firstly, so to speed up,
    // if last one is own, then all properties are own.

    var last_key;
    for (var key in obj)
      last_key = key;

    return last_key === undefined || hasOwnProperty.call(obj, last_key);
  };


  for (; i < length; i++) {
    // Only deal with non-null/undefined values
    if ((options = arguments[i]) !== null) {
      // Extend the base object
      for (name in options) {
        src = target[name];
        copy = options[name];

        // Prevent never-ending loop
        if (target === copy)
            continue;

        // Recurse if we're merging object literal values or arrays
        if (deep && copy && (isPlainObject(copy) || Array.isArray(copy))) {
          var clone = src && (isPlainObject(src) || Array.isArray(src)
                              ? src : (Array.isArray(copy) ? [] : {}));

          // Never move original objects, clone them
          target[name] = extend(deep, clone, copy);

        // Don't bring in undefined values
        } else if (copy !== undefined)
          target[name] = copy;
      }
    }
  }

  // Return the modified object
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
 * Error-handling/backoff logic.
 *
 * - All existing-account network-accessing functionality uses this module to
 *   track the state of accounts and resources within accounts that are may
 *   experience some type of time-varying failures.
 * - Account autoconfiguration probing logic does not use this module; it just
 *   checks whether there is a network connection.
 *
 * - Accounts define 'endpoints' with us when they are instantiated for each
 *   server connection type they have.  For IMAP, this means an SMTP endpoint
 *   and an IMAP endpoint.
 * - These 'endpoints' may have internal 'resources' which may manifest failures
 *   of their own if-and-only-if it is expected that there could be transient
 *   failures within the endpoint.  For IMAP, it is possible for IMAP servers to
 *   not let us into certain folders because there are other active connections
 *   inside them.  If something can't fail, there is no need to name it as a
 *   resource.
 *
 * - All endpoints have exactly one status: 'healthy', 'unreachable', or
 *   'broken'.  Unreachable implies we are having trouble talking with the
 *   endpoint because of network issues.  Broken implies that although we can
 *   talk to the endpoint, it doesn't want to talk to us for reasons of being
 *   offline for maintenance or account migration or something like that.
 * - Endpoint resources can only be 'broken' and are only tracked if they are
 *   broken.
 *
 * - If we encounter a network error for an otherwise healthy endpoint then we
 *   try again once right away, as a lot of network errors only become evident
 *   once we have a new, good network.
 * - On subsequent network errors for the previously healthy endpoint where we
 *   have already retried, we try after a ~1 second delay and then a ~5 second
 *   delay.  Then we give up and put the endpoint in the unreachable or broken
 *   state, as appropriate.  These choice of delays are entirely arbitrary.
 *
 * - We only try once to connect to endpoints that are in a degraded state.  We
 *   do not retry because that would be wasteful.
 *
 * - Once we put an endpoint in a degraded (unreachable or broken) state, this
 *   module never does anything to try and probe for the endpoint coming back
 *   on its own.  We rely on the existing periodic synchronization logic or
 *   user actions to trigger a new attempt.  WE MAY NEED TO CHANGE THIS AT
 *   SOME POINT since it's possible that the user may have queued an email for
 *   sending that they want delivered sooner than the cron logic triggers, but
 *   that's way down the road.
 **/

define('mailapi/errbackoff',
  [
    './date',
    'rdcommon/log',
    'module',
    'exports'
  ],
  function(
    $date,
    $log,
    $module,
    exports
  ) {

var BACKOFF_DURATIONS = exports.BACKOFF_DURATIONS = [
  { fixedMS: 0,    randomMS: 0 },
  { fixedMS: 800,  randomMS: 400 },
  { fixedMS: 4500, randomMS: 1000 },
];

var BAD_RESOURCE_RETRY_DELAYS_MS = [
  1000,
  60 * 1000,
  2 * 60 * 1000,
];

var setTimeoutFunc = window.setTimeout.bind(window);

exports.TEST_useTimeoutFunc = function(func) {
  setTimeoutFunc = func;
  for (var i = 0; i < BACKOFF_DURATIONS.length; i++) {
    BACKOFF_DURATIONS[i].randomMS = 0;
  }
};

/**
 * @args[
 *   @param[listener @dict[
 *     @key[onEndpointStateChange @func[
 *       @args[state]
 *     ]]
 *   ]]
 * ]
 */
function BackoffEndpoint(name, listener, parentLog) {
  /** @oneof[
   *    @case['healthy']
   *    @case['unreachable']
   *    @case['broken']
   *    @case['shutdown']{
   *      We are shutting down; ignore any/all errors and avoid performing
   *      activities that would result in new network traffic, etc.
   *    }
   *  ]
   */
  this.state = 'healthy';
  this._iNextBackoff = 0;
  this._LOG = LOGFAB.BackoffEndpoint(this, parentLog, name);
  this._LOG.state(this.state);

  this._badResources = {};

  this.listener = listener;
}
BackoffEndpoint.prototype = {
  _setState: function(newState) {
    if (this.state === newState)
      return;
    this.state = newState;
    this._LOG.state(newState);
    if (this.listener)
      this.listener.onEndpointStateChange(newState);
  },

  noteConnectSuccess: function() {
    this._setState('healthy');
    this._iNextBackoff = 0;
  },

  /**
   * Logs a connection failure and returns true if a retry attempt should be
   * made.
   *
   * @args[
   *   @param[reachable Boolean]{
   *     If true, we were able to connect to the endpoint, but failed to login
   *     for some reason.
   *   }
   * ]
   * @return[shouldRetry Boolean]{
   *   Returns true if we should retry creating the connection, false if we
   *   should give up.
   * }
   */
  noteConnectFailureMaybeRetry: function(reachable) {
    this._LOG.connectFailure(reachable);
    if (this.state === 'shutdown')
      return false;

    if (reachable) {
      this._setState('broken');
      return false;
    }

    if (this._iNextBackoff > 0)
      this._setState(reachable ? 'broken' : 'unreachable');

    // (Once this saturates, we never perform retries until the connection is
    // healthy again.  We do attempt re-connections when triggered by user
    // activity or synchronization logic; they just won't get retries.)
    if (this._iNextBackoff >= BACKOFF_DURATIONS.length)
      return false;

    return true;
  },

  /**
   * Logs a connection problem where we can talk to the server but we are
   * confident there is no reason retrying.  In some cases, like bad
   * credentials, this is part of what you want to do, but you will still also
   * want to put the kibosh on additional requests at a higher level since
   * servers can lock people out if they make repeated bad authentication
   * requests.
   */
  noteBrokenConnection: function() {
    this._LOG.connectFailure(true);
    this._setState('broken');

    this._iNextBackoff = BACKOFF_DURATIONS.length;
  },

  scheduleConnectAttempt: function(connectFunc) {
    if (this.state === 'shutdown')
      return;

    // If we have already saturated our retries then there won't be any
    // automatic retries and this request is assumed to want us to try and
    // create a connection right now.
    if (this._iNextBackoff >= BACKOFF_DURATIONS.length) {
      connectFunc();
      return;
    }

    var backoff = BACKOFF_DURATIONS[this._iNextBackoff++],
        delay = backoff.fixedMS +
                Math.floor(Math.random() * backoff.randomMS);
    setTimeoutFunc(connectFunc, delay);
  },

  noteBadResource: function(resourceId) {
    var now = $date.NOW();
    if (!this._badResources.hasOwnProperty(resourceId)) {
      this._badResources[resourceId] = { count: 1, last: now };
    }
    else {
      var info = this._badResources[resourceId];
      info.count++;
      info.last = now;
    }
  },

  resourceIsOkayToUse: function(resourceId) {
    if (!this._badResources.hasOwnProperty(resourceId))
      return true;
    var info = this._badResources[resourceId], now = $date.NOW();
  },

  shutdown: function() {
    this._setState('shutdown');
  },
};

exports.createEndpoint = function(name, listener, parentLog) {
  return new BackoffEndpoint(name, listener, parentLog);
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  BackoffEndpoint: {
    type: $log.TASK,
    subtype: $log.CLIENT,
    stateVars: {
      state: false,
    },
    events: {
      connectFailure: { reachable: true },
    },
    errors: {
    }
  },
});

}); // end define
;
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
    this.error = null;

    var conn = this._conn;
    this._conn = null;

    if (!this.onresult)
      return;
    this.onresult(this.error, conn, tzOffset);
    this.onresult = false;
  },

  onError: function ImapProber_onError(err) {
    if (!this.onresult)
      return;
    console.warn('PROBE:IMAP sad', err);

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
    var tzMatch = /([+-]\d{4})/.exec(hpair.value);
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

}); // end define
;
/**
 * Abstractions for dealing with the various mutation operations.
 *
 * NB: Moves discussion is speculative at this point; we are just thinking
 * things through for architectural implications.
 *
 * == Speculative Operations ==
 *
 * We want our UI to update as soon after requesting an operation as possible.
 * To this end, we have logic to locally apply queued mutation operations.
 * Because we may want to undo operations when we are offline (and have not
 * been able to talk to the server), we also need to be able to reflect these
 * changes locally independent of telling the server.
 *
 * In the case of moves/copies, we issue a(n always locally created) id for the
 * message immediately and just set the server UID (srvid) to 0 to be populated
 * by the sync process.
 *
 * == Data Integrity ==
 *
 * Our strategy is always to avoid server data-loss, so data-destruction actions
 * must always take place after successful confirmation of persistence actions.
 * (Just keeping the data in-memory is not acceptable because we could crash,
 * etc.)
 *
 * This is in contrast to our concern about losing simple, frequently performed
 * idempotent user actions in a crash.  We assume that A) crashes will be
 * rare, B) the user will not be surprised or heart-broken if a message they
 * marked read a second before a crash needs to manually be marked read after
 * restarting the app/device, and C) there are performance/system costs to
 * saving the state which makes this a reasonable trade-off.
 *
 * It is also our strategy to avoid cluttering up the place as a side-effect
 * of half-done things.  For example, if we are trying to move N messages,
 * but only copy N/2 because of a timeout, we want to make sure that we
 * don't naively retry and then copy those first N/2 messages a second time.
 * This means that we track sub-steps explicitly, and that operations that we
 * have issued and may or may not have been performed by the server will be
 * checked before they are re-attempted.  (Although IMAP batch operations
 * are atomic, and our IndexedDB commits are atomic, they are atomic independent
 * of each other and so we could have been notified that the copy completed
 * but not persisted the fact to our database.)
 *
 * In the event we restore operations from disk that were enqueued but
 * apparently not run, we compel them to run a check operation before they are
 * performed because it's possible (depending on the case) for us to have run
 * them without saving the account state first.  This is a trade-off between the
 * cost of checking and the cost of issuing commits to the database frequently
 * based on the expected likelihood of a crash on our part.  Per comments above,
 * we expect crashes to be rare and not particularly correlated with operations,
 * so it's better for the device (both flash and performance) if we don't
 * continually checkpoint our state.
 *
 * All non-idempotent operations / operations that could result in data loss or
 * duplication require that we save our account state listing the operation.  In
 * the event of a crash, this allows us to know that we have to check the state
 * of the operation for completeness before attempting to run it again and
 * allowing us to finish half-done things.  For particular example, because
 * moves consist of a copy followed by flagging a message deleted, it is of the
 * utmost importance that we don't get in a situation where we have copied the
 * messages but not deleted them and we crash.  In that case, if we failed to
 * persist our plans, we will have duplicated the message (and the IMAP server
 * would have no reason to believe that was not our intent.)
 **/

define('mailapi/imap/jobs',
  [
    'rdcommon/log',
    '../jobmixins',
    'module',
    'exports'
  ],
  function(
    $log,
    $jobmixins,
    $module,
    exports
  ) {

/**
 * The evidence suggests the job has not yet been performed.
 */
var CHECKED_NOTYET = 'checked-notyet';
/**
 * The operation is idempotent and atomic, just perform the operation again.
 * No checking performed.
 */
var UNCHECKED_IDEMPOTENT = 'idempotent';
/**
 * The evidence suggests that the job has already happened.
 */
var CHECKED_HAPPENED = 'happened';
/**
 * The job is no longer relevant because some other sequence of events
 * have mooted it.  For example, we can't change tags on a deleted message
 * or move a message between two folders if it's in neither folder.
 */
var CHECKED_MOOT = 'moot';
/**
 * A transient error (from the checker's perspective) made it impossible to
 * check.
 */
var UNCHECKED_BAILED = 'bailed';
/**
 * The job has not yet been performed, and the evidence is that the job was
 * not marked finished because our database commits are coherent.  This is
 * appropriate for retrieval of information, like the downloading of
 * attachments.
 */
var UNCHECKED_COHERENT_NOTYET = 'coherent-notyet';

/**
 * @typedef[MutationState @dict[
 *   @key[suidToServerId @dictof[
 *     @key[SUID]
 *     @value[ServerID]
 *   ]]{
 *     Tracks the server id (UID on IMAP) for an account as it is currently
 *     believed to exist on the server.  We persist this because the actual
 *     header may have been locally moved to another location already, so
 *     there may not be storage for the information in the folder when
 *     subsequent non-local operations run (such as another move or adding
 *     a tag).
 *
 *     This table is entirely populated by the actual (non-local) move
 *     operations.  Entries remain in this table until they are mooted by a
 *     subsequent move or the table is cleared once all operations for the
 *     account complete.
 *   }
 *   @key[moveMap @dictof[
 *     @key[oldSuid SUID]
 *     @value[newSuid SUID]
 *   ]]{
 *     Expresses the relationship between moved messages by local-operations.
 *   }
 * ]]
 *
 * @typedef[MutationStateDelta @dict[
 *   @key[serverIdMap @dictof[
 *     @key[suid SUID]
 *     @value[srvid @oneof[null ServerID]]
 *   ]]{
 *     New values for `MutationState.suidToServerId`; set/updated by by
 *     non-local operations once the operation has been performed.  A null
 *     `srvid` is used to convey the header no longer exists at the previous
 *     name.
 *   }
 *   @key[moveMap @dictof[
 *     @key[oldSuid SUID]
 *     @value[newSuid SUID]
 *   ]]{
 *     Expresses the relationship between moved messages by local-operations.
 *   }
 * ]]{
 *   A set of attributes that can be set on an operation to cause changes to
 *   the `MutationState` for the account.  This forms part of the interface
 *   of the operations.  The operations don't manipulate the table directly
 *   to reduce code duplication, ease debugging, and simplify unit testing.
 * }
 **/

function ImapJobDriver(account, state, _parentLog) {
  this.account = account;
  this.resilientServerIds = false;
  this._heldMutexReleasers = [];

  this._LOG = LOGFAB.ImapJobDriver(this, _parentLog, this.account.id);

  this._state = state;
  // (we only need to use one as a proxy for initialization)
  if (!state.hasOwnProperty('suidToServerId')) {
    state.suidToServerId = {};
    state.moveMap = {};
  }

  this._stateDelta = {
    serverIdMap: null,
    moveMap: null,
  };
}
exports.ImapJobDriver = ImapJobDriver;
ImapJobDriver.prototype = {
  /**
   * Request access to an IMAP folder to perform a mutation on it.  This
   * acquires a write mutex on the FolderStorage and compels the ImapFolderConn
   * in question to acquire an IMAP connection if it does not already have one.
   *
   * The callback will be invoked with the folder and raw connections once
   * they are available.  The raw connection will be actively in the folder.
   *
   * There is no need to explicitly release the connection when done; it will
   * be automatically released when the mutex is released if desirable.
   *
   * This will ideally be migrated to whatever mechanism we end up using for
   * mailjobs.
   *
   * @args[
   *   @param[folderId]
   *   @param[needConn Boolean]{
   *     True if we should try and get a connection from the server.  Local ops
   *     should pass false.
   *   }
   *   @param[callback @func[
   *     @args[
   *       @param[folderConn ImapFolderConn]
   *       @param[folderStorage FolderStorage]
   *     ]
   *   ]]
   *   @param[deathback Function]
   *   @param[label String]{
   *     The label to identify this usage for debugging purposes.
   *   }
   * ]
   */
  _accessFolderForMutation: function(folderId, needConn, callback, deathback,
                                     label) {
    var storage = this.account.getFolderStorageForFolderId(folderId),
        self = this;
    storage.runMutexed(label, function(releaseMutex) {
      self._heldMutexReleasers.push(releaseMutex);
      var syncer = storage.folderSyncer;
      if (needConn && !syncer.folderConn._conn) {
        syncer.folderConn.acquireConn(callback, deathback, label);
      }
      else {
        try {
          callback(syncer.folderConn, storage);
        }
        catch (ex) {
          self._LOG.callbackErr(ex);
        }
      }
    });
  },

  _partitionAndAccessFoldersSequentially:
    $jobmixins._partitionAndAccessFoldersSequentially,

  /**
   * Request access to a connection for some type of IMAP manipulation that does
   * not involve a folder known to the system (which should then be accessed via
   * _accessfolderForMutation).
   *
   * The connection will be automatically released when the operation completes,
   * there is no need to release it directly.
   */
  _acquireConnWithoutFolder: function(label, callback, deathback) {
    this._LOG.acquireConnWithoutFolder_begin(label);
    var self = this;
    this.account.__folderDemandsConnection(
      null, label,
      function(conn) {
        self._LOG.acquireConnWithoutFolder_end(label);
        self._heldMutexReleasers.push(function() {
          self.account.__folderDoneWithConnection(conn, false, false);
        });
        try {
          callback(conn);
        }
        catch (ex) {
          self._LOG.callbackErr(ex);
        }
      },
      deathback
    );
  },

  postJobCleanup: $jobmixins.postJobCleanup,

  allJobsDone: $jobmixins.allJobsDone,

  //////////////////////////////////////////////////////////////////////////////
  // download: Download one or more attachments from a single message

  local_do_download: $jobmixins.local_do_download,

  do_download: $jobmixins.do_download,

  check_download: $jobmixins.check_download,

  local_undo_download: $jobmixins.local_undo_download,

  undo_download: $jobmixins.undo_download,

  //////////////////////////////////////////////////////////////////////////////
  // modtags: Modify tags on messages

  local_do_modtags: $jobmixins.local_do_modtags,

  do_modtags: function(op, jobDoneCallback, undo) {
    var addTags = undo ? op.removeTags : op.addTags,
        removeTags = undo ? op.addTags : op.removeTags;

    var aggrErr = null;

    this._partitionAndAccessFoldersSequentially(
      op.messages, true,
      function perFolder(folderConn, storage, serverIds, namers, callWhenDone) {
        var modsToGo = 0;
        function tagsModded(err) {
          if (err) {
            console.error('failure modifying tags', err);
            aggrErr = 'unknown';
            return;
          }
          op.progress += (undo ? -serverIds.length : serverIds.length);
          if (--modsToGo === 0)
            callWhenDone();
        }
        var uids = [];
        for (var i = 0; i < serverIds.length; i++) {
          var srvid = serverIds[i];
          // The header may have disappeared from the server, in which case the
          // header is moot.
          if (srvid)
            uids.push(srvid);
        }
        // Be done if all of the headers were moot.
        if (!uids.length) {
          callWhenDone();
          return;
        }
        if (addTags) {
          modsToGo++;
          folderConn._conn.addFlags(uids, addTags, tagsModded);
        }
        if (removeTags) {
          modsToGo++;
          folderConn._conn.delFlags(uids, removeTags, tagsModded);
        }
      },
      function allDone() {
        jobDoneCallback(aggrErr);
      },
      function deadConn() {
        aggrErr = 'aborted-retry';
      },
      /* reverse if we're undoing */ undo,
      'modtags');
  },

  check_modtags: function(op, callback) {
    callback(null, UNCHECKED_IDEMPOTENT);
  },

  local_undo_modtags: $jobmixins.local_undo_modtags,

  undo_modtags: function(op, callback) {
    // Undoing is just a question of flipping the add and remove lists.
    return this.do_modtags(op, callback, true);
  },

  //////////////////////////////////////////////////////////////////////////////
  // delete: Delete messages

  local_do_delete: $jobmixins.local_do_delete,

  /**
   * Move the message to the trash folder.  In Gmail, there is no move target,
   * we just delete it and gmail will (by default) expunge it immediately.
   */
  do_delete: function(op, doneCallback) {
    var trashFolder = this.account.getFirstFolderWithType('trash');
    this.do_move(op, doneCallback, trashFolder.id);
  },

  check_delete: function(op, doneCallback) {
    var trashFolder = this.account.getFirstFolderWithType('trash');
    this.check_move(op, doneCallback, trashFolder.id);
  },

  local_undo_delete: $jobmixins.local_undo_delete,

  undo_delete: function(op, doneCallback) {
  },

  //////////////////////////////////////////////////////////////////////////////
  // move: Move messages between folders (in a single account)
  //
  // ## General Strategy ##
  //
  // Local Do:
  //
  // - Move the header to the target folder's storage, updating the op with the
  //   message-id header of the message for each message so that the check
  //   operation has them available.
  //
  //   This requires acquiring a write mutex to the target folder while also
  //   holding one on the source folder.  We are assured there is no deadlock
  //   because only operations are allowed to manipulate multiple folders at
  //   once, and only one operation is in-flight per an account at a time.
  //   (And cross-account moves are not handled by this operation.)
  //
  //   Insertion is done using the INTERNALDATE (which must be maintained by the
  //   COPY operation) and a freshly allocated id, just like if we had heard
  //   about the header from the server.
  //
  // Do:
  //
  // - Acquire a connection to the target folder so that we can know the UIDNEXT
  //   value prior to performing the copy.  FUTURE: Don't do this if the server
  //   supports UIDPLUS.
  //
  // (Do the following in a loop per-source folder)
  //
  // - Copy the messages to the target folder via COPY.
  //
  // - Figure out the UIDs of our moved messages.  FUTURE: If the server is
  //   UIDPLUS, we already know these from the results of the previous command.
  //   NOW: Issue a fetch on the message-id headers of the messages in the
  //   range UIDNEXT:*.  Use these results to map the UIDs to the messages we
  //   copied above.  In the event of duplicate message-id's, ordering doesn't
  //   matter, we just pick the first one.  Update our UIDNEXT value in case
  //   there is another pass through the loop.
  //
  // - Issue deletes on the messages from the source folder.
  //
  // Check: XXX TODO POSTPONED FOR PRELIMINARY LANDING
  //
  // NB: Our check implementation actually is a correcting check implemenation;
  // we will make things end up the way they should be.  We do this because it
  // is simpler than
  //
  // - Acquire a connection to the target folder.  Issue broad message-id
  //   header searches to find if the messages appear to be in the folder
  //   already, note which are already present.  This needs to take the form
  //   of a SEARCH followed by a FETCH to map UIDs to message-id's.  In theory
  //   the IMAP copy command should be atomic, but I'm not sure we can trust
  //   that and we also have the problem where there could already be duplicate
  //   message-id headers in the target which could confuse us if our check is
  //   insufficiently thorough.  The FETCH needs to also retrieve the flags
  //   for the message so we can track deletion state.
  //
  // (Do the following in a loop per source folder)
  //
  // - Acquire connections for each source folder.  Issue message-id searches
  //   like we did for the target including header results.  In theory we might
  //   remember the UIDs for check acceleration purposes, but that would not
  //   cover if we tried to perform an undo, so we go for thorough.
  //
  // -
  //
  // ## Possible Problems and their Solutions ##
  //
  // Moves are fairly complicated in terms of moving parts, so let's enumate the
  // way things could go wrong so we can make sure we address them and describe
  // how we address them.  Note that it's a given that we will have run our
  // local modifications prior to trying to talk to the server, which reduces
  // the potential badness.
  //
  // #1: We attempt to resynchronize the source folder for a move prior to
  //     running the operation against the server, resulting in us synchronizing
  //     a duplicate header into existence that will not be detected until the
  //     next resync of the time range (which will be strictly after when we
  //     actually run the mutation.
  //
  // #2: Operations scheduled against speculative headers.  It is quite possible
  //     for the user to perform actions against one of the locally /
  //     speculatively moved headers while we are offline/have not yet played
  //     the operation/are racing the UI while playing the operation.  We
  //     obviously want these changes to succeed.
  //
  // Our solutions:
  //
  // #1: Prior to resynchronizing a folder, we check if there are any operations
  //     that block synchronization.  An un-run move with a source of that
  //     folder counts as such an operation.  We can determine this by either
  //     having sufficient knowledge to inspect an operation or have operations
  //     directly modify book-keeping structures in the folders as part of their
  //     actions.  (Add blocker on local_(un)do, remove on (un)do.)  We choose
  //     to implement the inspection operation by having all operations
  //     implement a simple helper to tell us if the operation blocks entry.
  //     The theory is this will be less prone to bugs since it will be clear
  //     that operations need to implement the method, whereas it would be less
  //     clear that operations need to do call the folder-state mutating
  //     options.
  //
  // #2: Operations against speculative headers are a concern only from a naming
  //     perspective for operations.  Operations are strictly run in the order
  //     they are enqueued, so we know that the header will have been moved and
  //     be in the right folder.  Additionally, because both the UI and
  //     operations name messages using an id we issue rather than the server
  //     UID, there is no potential for naming inconsistencies.  The UID will be
  //     resolved at operation run-time which only requires that the move
  //     operation either was UIDPLUS or we manually sussed out the target id
  //     (which we do for simplicity).
  //
  // XXX problem: repeated moves and UIDs.
  // what we do know:
  // - in order to know about a message, we must have a current UID of the
  //   message on the server where it currently lives.
  // what we could do:
  // - have successor move operations moot/replace their predecessor.  So a
  //   move from A to B, and then from B to C will just become a move from A to
  //   C from the perspective of the online op that will eventually be run.  We
  //   could potentially build this on top of a renaming strategy.  So if we
  //   move z-in-A to z-in-B, and then change a tag on z-in-B, and then move
  //   z-in-B to z-in-C, renaming and consolidatin would make this a move of
  //   z-in-A to z-in-C followed by a tag change on z-in-C.
  // - produce micro-IMAP-ops as a byproduct of our local actions that are
  //   stored on the operation.  So in the A/move to B/tag/move to C case above,
  //   we would not consolidate anything, just produce a transaction journal.
  //   The A-move-to-B case would be covered by serializing the information
  //   for the IMAP COPY and deletion.  In the UIDPLUS case, we have an
  //   automatic knowledge of the resulting new target UID; in the non-UIDPLUS
  //   case we can open the target folder and find out the new UID as part of
  //   the micro-op.  The question here is then how we chain these various
  //   results together in the multi-move case, or when we write the result to
  //   the target:
  //   - maintain an output value map for the operations.  When there is just
  //     the one move, the output for the UID for each move is the current
  //     header name of the message, which we will load and write the value
  //     into.  When there are multiple moves, the output map is adjusted and
  //     used to indicate that we should stash the UID in quasi-persistent
  //     storage for a subsequent move operation.  (This could be thought of
  //     as similar to the renaming logic, but explicit.)


  local_do_move: $jobmixins.local_do_move,

  do_move: function(op, jobDoneCallback, targetFolderId) {
    var state = this._state, stateDelta = this._stateDelta, aggrErr = null;
    if (!stateDelta.serverIdMap)
      stateDelta.serverIdMap = {};
    if (!targetFolderId)
      targetFolderId = op.targetFolder;

    this._partitionAndAccessFoldersSequentially(
      op.messages, true,
      function perFolder(folderConn, sourceStorage, serverIds, namers,
                         perFolderDone){
        // XXX process UIDPLUS output when present, avoiding this step.
        var guidToNamer = {}, waitingOnHeaders = namers.length,
            reportedHeaders = 0, retriesLeft = 3, targetConn;

        // - got the target folder conn, now do the copies
        function gotTargetConn(targetConn, targetStorage) {
          var uidnext = targetConn.box._uidnext;
          folderConn._conn.copy(serverIds, targetStorage.folderMeta.path,
                                copiedMessages_reselect);

          function copiedMessages_reselect() {
            // Force a re-select of the folder to try and force the server to
            // perceive the move.  This was necessary for me at least on my
            // dovceot test setup.  Although we had heard that the COPY
            // completed, our FETCH was too fast, although an IDLE did report
            // the new messages after that.

            // We need to use a callback here because imap.js's state
            // checking is immediate, so it's very possible to race the folder
            // selection and lose.
            targetConn.reselectBox(copiedMessages_findNewUIDs);
          }
          // - copies are done, find the UIDs
          function copiedMessages_findNewUIDs() {
            var fetcher = targetConn._conn.fetch(
              uidnext + ':*',
              {
                request: {
                  headers: ['MESSAGE-ID'],
                  struct: false,
                  body: false
                }
              });
            // because we aren't waiting for body data, we can just process the
            // 'message' event directly without registering for an 'end' event
            // on it.
            fetcher.on('message', function(msg) {
              msg.on('end', fetchedMessageData);
            });
            // We don't need to wait for 'end' since we know how many of these
            // we care about.
            fetcher.on('error', function(err) {
              aggrErr = err;
              perFolderDone();
            });
            fetcher.on('end', function() {
              if (reportedHeaders < namers.length) {
                // If we didn't hear about all the headers, let's retry in
                // a little bit.
                if (--retriesLeft === 0) {
                  aggrErr = 'aborted-retry';
                  perFolderDone();
                  return;
                }

                window.setTimeout(copiedMessages_findNewUIDs, 500);
              }
            });
          }
          function fetchedMessageData(msg) {
            var guid = msg.msg.meta.messageId;
            if (!guidToNamer.hasOwnProperty(guid))
              return;
            reportedHeaders++;
            var namer = guidToNamer[guid];
            stateDelta.serverIdMap[namer.suid] = msg.id;
            uidnext = msg.id + 1;
            var newSuid = state.moveMap[namer.suid];
            var newId =
                  parseInt(newSuid.substring(newSuid.lastIndexOf('/') + 1));
            targetStorage.updateMessageHeader(
              namer.date, newId, false,
              function(header) {
                // If the header isn't there because it got moved, then null
                // will be returned and it's up to the next move operation
                // to fix this up.
                if (header)
                  header.srvid = msg.id;
                else
                  console.warn('did not find header for', namer.suid,
                               newSuid, namer.date, newId);
                if (--waitingOnHeaders === 0)
                  foundUIDs_deleteOriginals();
                return true;
              });
          }
        }

        function foundUIDs_deleteOriginals() {
          folderConn._conn.addFlags(serverIds, ['\\Deleted'],
                                    deletedMessages);
        }
        function deletedMessages(err) {
          if (err)
            aggrErr = true;
          perFolderDone();
        }

        // Build a guid-to-namer map and deal with any messages that no longer
        // exist on the server.  Do it backwards so we can splice.
        for (var i = namers.length - 1; i >= 0; i--) {
          var srvid = serverIds[i];
          if (!srvid) {
            serverIds.splice(i, 1);
            namers.splice(i, 1);
            continue;
          }
          var namer = namers[i];
          guidToNamer[namer.guid] = namer;
        }
        // it's possible all the messages could be gone, in which case we
        // are done with this folder already!
        if (serverIds.length === 0) {
          perFolderDone();
          return;
        }

        if (sourceStorage.folderId === targetFolderId) {
          if (op.type === 'move') {
            // A move from a folder to itself is a no-op.
            processNext();
          }
          else { // op.type === 'delete'
            // If the op is a delete and the source and destination folders
            // match, we're deleting from trash, so just perma-delete it.
            foundUIDs_deleteOriginals();
          }
        }
        else {
          // Resolve the target folder again.
          this._accessFolderForMutation(targetFolderId, true, gotTargetConn,
                                        function targetFolderDead() {},
                                        'move target');
        }
      }.bind(this),
      function() {
        jobDoneCallback(aggrErr);
      },
      null,
      false,
      'local move source');
  },

  /**
   * See section block comment for more info.
   *
   * XXX implement checking logic for move
   */
  check_move: function(op, doneCallback, targetFolderId) {
    // get a connection in the target folder
    // do a search on message-id's to check if the messages got copied across.
    doneCallback(null, 'moot');
  },

  local_undo_move: $jobmixins.local_undo_move,

  /**
   * Move the message back to its original folder.
   *
   * - If the source message has not been expunged, remove the Deleted flag from
   *   the source folder.
   * - If the source message was expunged, copy the message back to the source
   *   folder.
   * - Delete the message from the target folder.
   *
   * XXX implement undo functionality for move
   */
  undo_move: function(op, doneCallback, targetFolderId) {
    doneCallback('moot');
  },

  //////////////////////////////////////////////////////////////////////////////
  // append: Add a message to a folder
  //
  // Message should look like:
  // {
  //    messageText: the message body,
  //    date: the date to use as the INTERNALDATE of the message,
  //    flags: the initial set of flags for the message
  // }

  local_do_append: function(op, doneCallback) {
    doneCallback(null);
  },

  /**
   * Append a message to a folder.
   */
  do_append: function(op, callback) {
    var folderConn, self = this,
        storage = this.account.getFolderStorageForFolderId(op.folderId),
        folderMeta = storage.folderMeta,
        iNextMessage = 0;

    var gotFolderConn = function gotFolderConn(_folderConn) {
      if (!_folderConn) {
        done('unknown');
        return;
      }
      folderConn = _folderConn;
      if (folderConn._conn.hasCapability('MULTIAPPEND'))
        multiappend();
      else
        append();
    };
    var deadConn = function deadConn() {
      callback('aborted-retry');
    };
    var multiappend = function multiappend() {
      iNextMessage = op.messages.length;
      folderConn._conn.multiappend(op.messages, appended);
    };
    var append = function append() {
      var message = op.messages[iNextMessage++];
      folderConn._conn.append(
        message.messageText,
        message, // (it will ignore messageText)
        appended);
    };
    var appended = function appended(err) {
      if (err) {
        console.error('failure appending message', err);
        done('unknown');
        return;
      }
      if (iNextMessage < op.messages.length)
        append();
      else
        done(null);
    };
    var done = function done(errString) {
      if (folderConn)
        folderConn = null;
      callback(errString);
    };

    this._accessFolderForMutation(op.folderId, true, gotFolderConn, deadConn,
                                  'append');
  },

  /**
   * Check if the message ended up in the folder.
   *
   * TODO implement
   */
  check_append: function(op, doneCallback) {
    // XXX search on the message-id in the folder to verify its presence.
    doneCallback(null, 'moot');
  },

  // TODO implement
  local_undo_append: function(op, doneCallback) {
    doneCallback(null);
  },

  // TODO implement
  undo_append: function(op, doneCallback) {
    doneCallback('moot');
  },

  //////////////////////////////////////////////////////////////////////////////
  // syncFolderList
  //
  // Synchronize our folder list.  This should always be an idempotent operation
  // that makes no sense to undo/redo/etc.

  local_do_syncFolderList: function(op, doneCallback) {
    doneCallback(null);
  },

  do_syncFolderList: function(op, doneCallback) {
    var account = this.account, reported = false;
    this._acquireConnWithoutFolder(
      'syncFolderList',
      function gotConn(conn) {
        account._syncFolderList(conn, function(err) {
            if (!err)
              account.meta.lastFolderSyncAt = Date.now();
            // request an account save
            if (!reported)
              doneCallback(err ? 'aborted-retry' : null, null, !err);
            reported = true;
          });
      },
      function deadConn() {
        if (!reported)
          doneCallback('aborted-retry');
        reported = true;
      });
  },

  check_syncFolderList: function(op, doneCallback) {
    doneCallback('idempotent');
  },

  local_undo_syncFolderList: function(op, doneCallback) {
    doneCallback('moot');
  },

  undo_syncFolderList: function(op, doneCallback) {
    doneCallback('moot');
  },

  //////////////////////////////////////////////////////////////////////////////
  // createFolder: Create a folder

  local_do_createFolder: function(op, doneCallback) {
    // we never locally perform this operation.
    doneCallback(null);
  },

  do_createFolder: function(op, callback) {
    var path, delim, parentFolderId = null;
    if (op.parentFolderId) {
      if (!this.account._folderInfos.hasOwnProperty(op.parentFolderId))
        throw new Error("No such folder: " + op.parentFolderId);
      var parentFolder = this.account._folderInfos[op.parentFolderId];
      delim = parentFolder.$meta.delim;
      path = parentFolder.$meta.path + delim;
      parentFolderId = parentFolder.$meta.id;
    }
    else {
      path = '';
      delim = this.account.meta.rootDelim;
    }
    if (typeof(op.folderName) === 'string')
      path += op.folderName;
    else
      path += op.folderName.join(delim);
    if (op.containOnlyOtherFolders)
      path += delim;

    var rawConn = null, self = this;
    function gotConn(conn) {
      // create the box
      rawConn = conn;
      rawConn.addBox(path, addBoxCallback);
    }
    function addBoxCallback(err) {
      if (err) {
        // If the folder already exists, we are done.
        if (err.serverResponse &&
            /\[ALREADYEXISTS\]/.test(err.serverResponse)) {
          done(null);
          return;
        }
        console.error('Error creating box:', err);
        // XXX implement the already-exists check...
        done('unknown');
        return;
      }
      // Do a list on the folder so that we get the right attributes and any
      // magical case normalization performed by the server gets observed by
      // us.
      rawConn.getBoxes('', path, gotBoxes);
    }
    function gotBoxes(err, boxesRoot) {
      if (err) {
        console.error('Error looking up box:', err);
        done('unknown');
        return;
      }
      // We need to re-derive the path.  The hierarchy will only be that
      // required for our new folder, so we traverse all children and create
      // the leaf-node when we see it.
      var folderMeta = null;
      function walkBoxes(boxLevel, pathSoFar, pathDepth) {
        for (var boxName in boxLevel) {
          var box = boxLevel[boxName],
              boxPath = pathSoFar ? (pathSoFar + boxName) : boxName;
          if (box.children) {
            walkBoxes(box.children, boxPath + box.delim, pathDepth + 1);
          }
          else {
            var type = self.account._determineFolderType(box, boxPath);
            folderMeta = self.account._learnAboutFolder(
              boxName, boxPath, parentFolderId, type, box.delim, pathDepth);
          }
        }
      }
      walkBoxes(boxesRoot, '', 0);
      if (folderMeta)
        done(null, folderMeta);
      else
        done('unknown');
    }
    function done(errString, folderMeta) {
      if (rawConn)
        rawConn = null;
      if (callback)
        callback(errString, folderMeta);
    }
    function deadConn() {
      callback('aborted-retry');
    }
    this._acquireConnWithoutFolder('createFolder', gotConn, deadConn);
  },

  check_createFolder: function(op, doneCallback) {
  },

  local_undo_createFolder: function(op, doneCallback) {
    doneCallback(null);
  },

  // TODO: port deleteFolder to be an op and invoke it here
  undo_createFolder: function(op, doneCallback) {
    doneCallback('moot');
  },

  //////////////////////////////////////////////////////////////////////////////
  // purgeExcessMessages

  local_do_purgeExcessMessages: function(op, doneCallback) {
    this._accessFolderForMutation(
      op.folderId, false,
      function withMutex(_ignoredConn, storage) {
        storage.purgeExcessMessages(function(numDeleted, cutTS) {
          // Indicate that we want a save performed if any messages got deleted.
          doneCallback(null, null, numDeleted > 0);
        });
      },
      null,
      'purgeExcessMessages');
  },

  do_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  check_purgeExcessMessages: function(op, doneCallback) {
    // this is a local-only modification, so this doesn't really matter
    return UNCHECKED_IDEMPOTENT;
  },

  local_undo_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  undo_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  //////////////////////////////////////////////////////////////////////////////
};

function HighLevelJobDriver() {
}
HighLevelJobDriver.prototype = {
  /**
   * Perform a cross-folder move:
   *
   * - Fetch the entirety of a message from the source location.
   * - Append the entirety of the message to the target location.
   * - Delete the message from the source location.
   */
  do_xmove: function() {
  },

  check_xmove: function() {

  },

  /**
   * Undo a cross-folder move.  Same idea as for normal undo_move; undelete
   * if possible, re-copy if not.  Delete the target once we're confident
   * the message made it back into the folder.
   */
  undo_xmove: function() {
  },

  /**
   * Perform a cross-folder copy:
   * - Fetch the entirety of a message from the source location.
   * - Append the message to the target location.
   */
  do_xcopy: function() {
  },

  check_xcopy: function() {
  },

  /**
   * Just delete the message from the target location.
   */
  undo_xcopy: function() {
  },
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  ImapJobDriver: {
    type: $log.DAEMON,
    asyncJobs: {
      acquireConnWithoutFolder: { label: false },
    },
    errors: {
      callbackErr: { ex: $log.EXCEPTION },
    },
  },
});

}); // end define
;
/**
 *
 **/

define('mailapi/imap/account',
  [
    'imap',
    'rdcommon/log',
    '../a64',
    '../allback',
    '../accountmixins',
    '../errbackoff',
    '../mailslice',
    '../searchfilter',
    '../util',
    './probe',
    './folder',
    './jobs',
    'module',
    'exports'
  ],
  function(
    $imap,
    $log,
    $a64,
    $allback,
    $acctmixins,
    $errbackoff,
    $mailslice,
    $searchfilter,
    $util,
    $imapprobe,
    $imapfolder,
    $imapjobs,
    $module,
    exports
  ) {
var bsearchForInsert = $util.bsearchForInsert;
var allbackMaker = $allback.allbackMaker;

function cmpFolderPubPath(a, b) {
  return a.path.localeCompare(b.path);
}

/**
 * Account object, root of all interaction with servers.
 *
 * Passwords are currently held in cleartext with the rest of the data.  Ideally
 * we would like them to be stored in some type of keyring coupled to the TCP
 * API in such a way that we never know the API.  Se a vida e.
 *
 */
function ImapAccount(universe, compositeAccount, accountId, credentials,
                     connInfo, folderInfos,
                     dbConn,
                     _parentLog, existingProtoConn) {
  this.universe = universe;
  this.compositeAccount = compositeAccount;
  this.id = accountId;
  this.accountDef = compositeAccount.accountDef;

  this.enabled = true;

  this._LOG = LOGFAB.ImapAccount(this, _parentLog, this.id);

  this._credentials = credentials;
  this._connInfo = connInfo;
  this._db = dbConn;

  /**
   * The maximum number of connections we are allowed to have alive at once.  We
   * want to limit this both because we generally aren't sophisticated enough
   * to need to use many connections at once (unless we have bugs), and because
   * servers may enforce a per-account connection limit which can affect both
   * us and other clients on other devices.
   *
   * Thunderbird's default for this is 5.
   *
   * gmail currently claims to have a limit of 10 connections per account:
   * http://support.google.com/mail/bin/answer.py?hl=en&answer=97150
   *
   * I am picking 3 right now because it should cover the "I just sent a
   * messages from the folder I was in and then switched to another folder",
   * where we could have stuff to do in the old folder, new folder, and sent
   * mail folder.  I have also seem claims of connection limits of 3 for some
   * accounts out there, so this avoids us needing logic to infer a need to
   * lower our connection limit.
   */
  this._maxConnsAllowed = 3;
  /**
   * The `ImapConnection` we are attempting to open, if any.  We only try to
   * open one connection at a time.
   */
  this._pendingConn = null;
  this._ownedConns = [];
  /**
   * @listof[@dict[
   *   @key[folderId]
   *   @key[callback]
   * ]]{
   *   The list of requested connections that have not yet been serviced.  An
   * }
   */
  this._demandedConns = [];
  this._backoffEndpoint = $errbackoff.createEndpoint('imap:' + this.id, this,
                                                     this._LOG);
  this._boundMakeConnection = this._makeConnection.bind(this);

  if (existingProtoConn)
    this._reuseConnection(existingProtoConn);

  // Yes, the pluralization is suspect, but unambiguous.
  /** @dictof[@key[FolderId] @value[ImapFolderStorage] */
  var folderStorages = this._folderStorages = {};
  /** @dictof[@key[FolderId] @value[ImapFolderMeta] */
  var folderPubs = this.folders = [];

  /**
   * The list of dead folder id's that we need to nuke the storage for when
   * we next save our account status to the database.
   */
  this._deadFolderIds = null;

  /**
   * The canonical folderInfo object we persist to the database.
   */
  this._folderInfos = folderInfos;
  /**
   * @dict[
   *   @param[nextFolderNum Number]{
   *     The next numeric folder number to be allocated.
   *   }
   *   @param[nextMutationNum Number]{
   *     The next mutation id to be allocated.
   *   }
   *   @param[lastFolderSyncAt DateMS]{
   *     When was the last time we ran `syncFolderList`?
   *   }
   *   @param[capability @listof[String]]{
   *     The post-login capabilities from the server.
   *   }
   *   @param[rootDelim String]{
   *     The root hierarchy delimiter.  It is possible for servers to not
   *     support hierarchies, but we just declare that those servers are not
   *     acceptable for use.
   *   }
   * ]{
   *   Meta-information about the account derived from probing the account.
   *   This information gets flushed on database upgrades.
   * }
   */
  this.meta = this._folderInfos.$meta;
  /**
   * @listof[SerializedMutation]{
   *   The list of recently issued mutations against us.  Mutations are added
   *   as soon as they are requested and remain until evicted based on a hard
   *   numeric limit.  The limit is driven by our unit tests rather than our
   *   UI which currently only allows a maximum of 1 (high-level) undo.  The
   *   status of whether the mutation has been run is tracked on the mutation
   *   but does not affect its presence or position in the list.
   *
   *   Right now, the `MailUniverse` is in charge of this and we just are a
   *   convenient place to stash the data.
   * }
   */
  this.mutations = this._folderInfos.$mutations;
  this.tzOffset = compositeAccount.accountDef.tzOffset;
  for (var folderId in folderInfos) {
    if (folderId[0] === '$')
      continue;
    var folderInfo = folderInfos[folderId];

    folderStorages[folderId] =
      new $mailslice.FolderStorage(this, folderId, folderInfo, this._db,
                                   $imapfolder.ImapFolderSyncer, this._LOG);
    folderPubs.push(folderInfo.$meta);
  }
  this.folders.sort(function(a, b) {
    return a.path.localeCompare(b.path);
  });

  this._jobDriver = new $imapjobs.ImapJobDriver(
                          this, this._folderInfos.$mutationState, this._LOG);

  /**
   * Flag to allow us to avoid calling closeBox to close a folder.  This avoids
   * expunging deleted messages.
   */
  this._TEST_doNotCloseFolder = false;

  // Ensure we have an inbox.  This is a folder that must exist with a standard
  // name, so we can create it without talking to the server.
  var inboxFolder = this.getFirstFolderWithType('inbox');
  if (!inboxFolder) {
    // XXX localized inbox string (bug 805834)
    this._learnAboutFolder('INBOX', 'INBOX', null, 'inbox', '/', 0, true);
  }
}
exports.Account = exports.ImapAccount = ImapAccount;
ImapAccount.prototype = {
  type: 'imap',
  toString: function() {
    return '[ImapAccount: ' + this.id + ']';
  },

  get isGmail() {
    return this.meta.capability.indexOf('X-GM-EXT-1') !== -1;
  },

  /**
   * Make a given folder known to us, creating state tracking instances, etc.
   */
  _learnAboutFolder: function(name, path, parentId, type, delim, depth,
                              suppressNotification) {
    var folderId = this.id + '/' + $a64.encodeInt(this.meta.nextFolderNum++);
    var folderInfo = this._folderInfos[folderId] = {
      $meta: {
        id: folderId,
        name: name,
        type: type,
        path: path,
        parentId: parentId,
        delim: delim,
        depth: depth,
        lastSyncedAt: 0
      },
      $impl: {
        nextId: 0,
        nextHeaderBlock: 0,
        nextBodyBlock: 0,
      },
      accuracy: [],
      headerBlocks: [],
      bodyBlocks: [],
      serverIdHeaderBlockMapping: null, // IMAP does not need the mapping
    };
    this._folderStorages[folderId] =
      new $mailslice.FolderStorage(this, folderId, folderInfo, this._db,
                                   $imapfolder.ImapFolderSyncer, this._LOG);

    var folderMeta = folderInfo.$meta;
    var idx = bsearchForInsert(this.folders, folderMeta, cmpFolderPubPath);
    this.folders.splice(idx, 0, folderMeta);

    if (!suppressNotification)
      this.universe.__notifyAddedFolder(this, folderMeta);
    return folderMeta;
  },

  _forgetFolder: function(folderId, suppressNotification) {
    var folderInfo = this._folderInfos[folderId],
        folderMeta = folderInfo.$meta;
    delete this._folderInfos[folderId];
    var folderStorage = this._folderStorages[folderId];
    delete this._folderStorages[folderId];
    var idx = this.folders.indexOf(folderMeta);
    this.folders.splice(idx, 1);
    if (this._deadFolderIds === null)
      this._deadFolderIds = [];
    this._deadFolderIds.push(folderId);
    folderStorage.youAreDeadCleanupAfterYourself();

    if (!suppressNotification)
      this.universe.__notifyRemovedFolder(this, folderMeta);
  },

  /**
   * We are being told that a synchronization pass completed, and that we may
   * want to consider persisting our state.
   */
  __checkpointSyncCompleted: function() {
    this.saveAccountState();
  },

  /**
   * Save the state of this account to the database.  This entails updating all
   * of our highly-volatile state (folderInfos which contains counters, accuracy
   * structures, and our block info structures) as well as any dirty blocks.
   *
   * This should be entirely coherent because the structured clone should occur
   * synchronously during this call, but it's important to keep in mind that if
   * that ever ends up not being the case that we need to cause mutating
   * operations to defer until after that snapshot has occurred.
   */
  saveAccountState: function(reuseTrans, callback) {
    var perFolderStuff = [], self = this;
    for (var iFolder = 0; iFolder < this.folders.length; iFolder++) {
      var folderPub = this.folders[iFolder],
          folderStorage = this._folderStorages[folderPub.id],
          folderStuff = folderStorage.generatePersistenceInfo();
      if (folderStuff)
        perFolderStuff.push(folderStuff);
    }
    this._LOG.saveAccountState();
    var trans = this._db.saveAccountFolderStates(
      this.id, this._folderInfos, perFolderStuff,
      this._deadFolderIds,
      function stateSaved() {
        // NB: we used to log when the save completed, but it ended up being
        // annoying to the unit tests since we don't block our actions on
        // the completion of the save at this time.
        if (callback)
          callback();
      },
      reuseTrans);
    this._deadFolderIds = null;
    return trans;
  },

  /**
   * Delete an existing folder WITHOUT ANY ABILITY TO UNDO IT.  Current UX
   * does not desire this, but the unit tests do.
   *
   * Callback is like the createFolder one, why not.
   */
  deleteFolder: function(folderId, callback) {
    if (!this._folderInfos.hasOwnProperty(folderId))
      throw new Error("No such folder: " + folderId);

    if (!this.universe.online) {
      if (callback)
        callback('offline');
      return;
    }

    var folderMeta = this._folderInfos[folderId].$meta;

    var rawConn = null, self = this;
    function gotConn(conn) {
      rawConn = conn;
      rawConn.delBox(folderMeta.path, deletionCallback);
    }
    function deletionCallback(err) {
      if (err)
        done('unknown');
      else
        done(null);
    }
    function done(errString) {
      if (rawConn) {
        self.__folderDoneWithConnection(rawConn, false, false);
        rawConn = null;
      }
      if (!errString) {
        self._LOG.deleteFolder(folderMeta.path);
        self._forgetFolder(folderId);
      }
      if (callback)
        callback(errString, folderMeta);
    }
    this.__folderDemandsConnection(null, 'deleteFolder', gotConn);
  },

  getFolderStorageForFolderId: function(folderId) {
    if (this._folderStorages.hasOwnProperty(folderId))
      return this._folderStorages[folderId];
    throw new Error('No folder with id: ' + folderId);
  },

  getFolderStorageForMessageSuid: function(messageSuid) {
    var folderId = messageSuid.substring(0, messageSuid.lastIndexOf('/'));
    if (this._folderStorages.hasOwnProperty(folderId))
      return this._folderStorages[folderId];
    throw new Error('No folder with id: ' + folderId);
  },

  getFolderMetaForFolderId: function(folderId) {
    if (this._folderInfos.hasOwnProperty(folderId))
      return this._folderInfos[folderId].$meta;
    return null;
  },

  /**
   * Create a view slice on the messages in a folder, starting from the most
   * recent messages and synchronizing further as needed.
   */
  sliceFolderMessages: function(folderId, bridgeHandle) {
    var storage = this._folderStorages[folderId],
        slice = new $mailslice.MailSlice(bridgeHandle, storage, this._LOG);

    storage.sliceOpenMostRecent(slice);
  },

  searchFolderMessages: function(folderId, bridgeHandle, phrase, whatToSearch) {
    var storage = this._folderStorages[folderId],
        slice = new $searchfilter.SearchSlice(bridgeHandle, storage, phrase,
                                              whatToSearch, this._LOG);
    // the slice is self-starting, we don't need to call anything on storage
  },

  shutdown: function() {
    // - kill all folder storages (for their loggers)
    for (var iFolder = 0; iFolder < this.folders.length; iFolder++) {
      var folderPub = this.folders[iFolder],
          folderStorage = this._folderStorages[folderPub.id];
      folderStorage.shutdown();
    }

    this._backoffEndpoint.shutdown();

    // - close all connections
    for (var i = 0; i < this._ownedConns.length; i++) {
      var connInfo = this._ownedConns[i];
      connInfo.conn.die();
    }

    this._LOG.__die();
  },

  checkAccount: function(listener) {
    var self = this;
    this._makeConnection(listener, null, 'check');
  },

  //////////////////////////////////////////////////////////////////////////////
  // Connection Pool-ish stuff

  get numActiveConns() {
    return this._ownedConns.length;
  },

  /**
   * Mechanism for an `ImapFolderConn` to request an IMAP protocol connection.
   * This is to potentially support some type of (bounded) connection pooling
   * like Thunderbird uses.  The rationale is that many servers cap the number
   * of connections we are allowed to maintain, plus it's hard to justify
   * locally tying up those resources.  (Thunderbird has more need of watching
   * multiple folders than ourselves, but we may still want to synchronize a
   * bunch of folders in parallel for latency reasons.)
   *
   * The provided connection will *not* be in the requested folder; it's up to
   * the folder connection to enter the folder.
   *
   * @args[
   *   @param[folderId #:optional FolderId]{
   *     The folder id of the folder that will be using the connection.  If
   *     it's not a folder but some task, then pass null (and ideally provide
   *     a useful `label`).
   *   }
   *   @param[label #:optional String]{
   *     A human readable explanation of the activity for debugging purposes.
   *   }
   *   @param[callback @func[@args[@param[conn]]]]{
   *     The callback to invoke once the connection has been established.  If
   *     there is a connection present in the reuse pool, this may be invoked
   *     immediately.
   *   }
   *   @param[deathback Function]{
   *     A callback to invoke if the connection dies or we feel compelled to
   *     reclaim it.
   *   }
   *   @param[dieOnConnectFailure #:optional Boolean]{
   *     Should we invoke the deathback for this request if we fail to establish
   *     a connection in a timely manner?  This will be immediately invoked if
   *     we are offline or if we exhaust our retries for establishing
   *     connections with the server.
   *   }
   * ]
   */
  __folderDemandsConnection: function(folderId, label, callback, deathback,
                                      dieOnConnectFailure) {
    // If we are offline, invoke the deathback soon and don't bother trying to
    // get a connection.
    if (dieOnConnectFailure && !this.universe.online) {
      window.setZeroTimeout(deathback);
      return;
    }

    var demand = {
      folderId: folderId,
      label: label,
      callback: callback,
      deathback: deathback,
      dieOnConnectFailure: Boolean(dieOnConnectFailure)
    };
    this._demandedConns.push(demand);

    // No line-cutting; bail if there was someone ahead of us.
    if (this._demandedConns.length > 1)
      return;

    // - try and reuse an existing connection
    if (this._allocateExistingConnection())
      return;

    // - we need to wait for a new conn or one to free up
    this._makeConnectionIfPossible();

    return;
  },

  /**
   * Trigger the deathbacks for all connection demands where dieOnConnectFailure
   * is true.
   */
  _killDieOnConnectFailureDemands: function() {
    for (var i = 0; i < this._demandedConns.length; i++) {
      var demand = this._demandedConns[i];
      if (demand.dieOnConnectFailure) {
        demand.deathback.call(null);
        this._demandedConns.splice(i--, 1);
      }
    }
  },

  /**
   * Try and find an available connection and assign it to the first connection
   * demand.
   *
   * @return[Boolean]{
   *   True if we allocated a demand to a conncetion, false if we did not.
   * }
   */
  _allocateExistingConnection: function() {
    if (!this._demandedConns.length)
      return false;
    var demandInfo = this._demandedConns[0];

    var reusableConnInfo = null;
    for (var i = 0; i < this._ownedConns.length; i++) {
      var connInfo = this._ownedConns[i];
      // It's concerning if the folder already has a connection...
      if (demandInfo.folderId && connInfo.folderId === demandInfo.folderId)
        this._LOG.folderAlreadyHasConn(demandInfo.folderId);

      if (connInfo.inUseBy)
        continue;

      connInfo.inUseBy = demandInfo;
      this._demandedConns.shift();
      this._LOG.reuseConnection(demandInfo.folderId, demandInfo.label);
      demandInfo.callback(connInfo.conn);
      return true;
    }

    return false;
  },

  /**
   * Close all connections that aren't currently in use.
   */
  closeUnusedConnections: function() {
    for (var i = this._ownedConns.length - 1; i >= 0; i--) {
      var connInfo = this._ownedConns[i];
      if (connInfo.inUseBy)
        continue;
      // this eats all future notifications, so we need to splice...
      connInfo.conn.die();
      this._ownedConns.splice(i, 1);
      this._LOG.deadConnection();
    }
  },

  _makeConnectionIfPossible: function() {
    if (this._ownedConns.length >= this._maxConnsAllowed) {
      this._LOG.maximumConnsNoNew();
      return;
    }
    if (this._pendingConn)
      return;

    this._pendingConn = true;
    this._backoffEndpoint.scheduleConnectAttempt(this._boundMakeConnection);
  },

  _makeConnection: function(listener, whyFolderId, whyLabel) {
    this._LOG.createConnection(whyFolderId, whyLabel);
    var opts = {
      host: this._connInfo.hostname,
      port: this._connInfo.port,
      crypto: this._connInfo.crypto,

      username: this._credentials.username,
      password: this._credentials.password,
    };
    if (this._LOG) opts._logParent = this._LOG;
    var conn = this._pendingConn = new $imap.ImapConnection(opts);
    var connectCallbackTriggered = false;
    // The login callback should get invoked in all cases, but a recent code
    // inspection for the prober suggested that there may be some cases where
    // things might fall-through, so let's just convert them.  We need some
    // type of handler since imap.js currently calls the login callback and
    // then the 'error' handler, generating an error if there is no error
    // handler.
    conn.on('error', function(err) {
      if (!connectCallbackTriggered)
        loginCb(err);
    });
    var loginCb;
    conn.connect(loginCb = function(err) {
      connectCallbackTriggered = true;
      this._pendingConn = null;
      if (err) {
        var normErr = $imapprobe.normalizeError(err);
        console.error('Connect error:', normErr.name, 'formal:', err, 'on',
                      this._connInfo.hostname, this._connInfo.port);
        if (normErr.reportProblem)
          this.universe.__reportAccountProblem(this.compositeAccount,
                                               normErr.name);


        if (listener)
          listener(normErr.name);
        conn.die();

        // track this failure for backoff purposes
        if (normErr.retry) {
          if (this._backoffEndpoint.noteConnectFailureMaybeRetry(
                                      normErr.reachable))
            this._makeConnectionIfPossible();
          else
            this._killDieOnConnectFailureDemands();
        }
        else {
          this._backoffEndpoint.noteBrokenConnection();
          this._killDieOnConnectFailureDemands();
        }
      }
      else {
        this._bindConnectionDeathHandlers(conn);
        this._backoffEndpoint.noteConnectSuccess();
        this._ownedConns.push({
          conn: conn,
          inUseBy: null,
        });
        this._allocateExistingConnection();
        if (listener)
          listener(null);
        // Keep opening connections if there is more work to do (and possible).
        if (this._demandedConns.length)
          this._makeConnectionIfPossible();
      }
    }.bind(this));
  },

  /**
   * Treat a connection that came from the IMAP prober as a connection we
   * created ourselves.
   */
  _reuseConnection: function(existingProtoConn) {
    // We don't want the probe being kept alive and we certainly don't need its
    // listeners.
    existingProtoConn.removeAllListeners();
    this._ownedConns.push({
        conn: existingProtoConn,
        inUseBy: null,
      });
    this._bindConnectionDeathHandlers(existingProtoConn);
  },

  _bindConnectionDeathHandlers: function(conn) {
    // on close, stop tracking the connection in our list of live connections
    conn.on('close', function() {
      for (var i = 0; i < this._ownedConns.length; i++) {
        var connInfo = this._ownedConns[i];
        if (connInfo.conn === conn) {
          this._LOG.deadConnection(connInfo.inUseBy &&
                                   connInfo.inUseBy.folderId);
          if (connInfo.inUseBy && connInfo.inUseBy.deathback)
            connInfo.inUseBy.deathback(conn);
          connInfo.inUseBy = null;
          this._ownedConns.splice(i, 1);
          return;
        }
      }
      this._LOG.unknownDeadConnection();
    }.bind(this));
    conn.on('error', function(err) {
      this._LOG.connectionError(err);
      // this hears about connection errors too
      console.warn('Conn steady error:', err, 'on',
                   this._connInfo.hostname, this._connInfo.port);
    }.bind(this));
  },

  __folderDoneWithConnection: function(conn, closeFolder, resourceProblem) {
    for (var i = 0; i < this._ownedConns.length; i++) {
      var connInfo = this._ownedConns[i];
      if (connInfo.conn === conn) {
        if (resourceProblem)
          this._backoffEndpoint(connInfo.inUseBy.folderId);
        this._LOG.releaseConnection(connInfo.inUseBy.folderId,
                                    connInfo.inUseBy.label);
        connInfo.inUseBy = null;
        // (this will trigger an expunge if not read-only...)
        if (closeFolder && !resourceProblem && !this._TEST_doNotCloseFolder)
          conn.closeBox(function() {});
        return;
      }
    }
    this._LOG.connectionMismatch();
  },

  /**
   * We receive this notification from our _backoffEndpoint.
   */
  onEndpointStateChange: function(state) {
    switch (state) {
      case 'healthy':
        this.universe.__removeAccountProblem(this.compositeAccount,
                                             'connection');
        break;
      case 'unreachable':
      case 'broken':
        this.universe.__reportAccountProblem(this.compositeAccount,
                                             'connection');
        break;
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  // Folder synchronization

  /**
   * Helper in conjunction with `_syncFolderComputeDeltas` for use by the
   * syncFolderList operation/job.  The op is on the hook for the connection's
   * lifecycle.
   */
  _syncFolderList: function(conn, callback) {
    conn.getBoxes(this._syncFolderComputeDeltas.bind(this, conn, callback));
  },
  _determineFolderType: function(box, path) {
    var type = null;
    // NoSelect trumps everything.
    if (box.attribs.indexOf('NOSELECT') !== -1) {
      type = 'nomail';
    }
    else {
      // Standards-ish:
      // - special-use: http://tools.ietf.org/html/rfc6154
      //   IANA registrations:
      //   http://www.iana.org/assignments/imap4-list-extended
      // - xlist:
      //   https://developers.google.com/google-apps/gmail/imap_extensions

      // Process the attribs for goodness.
      for (var i = 0; i < box.attribs.length; i++) {
        switch (box.attribs[i]) {
          case 'ALL': // special-use
          case 'ALLMAIL': // xlist
          case 'ARCHIVE': // special-use
            type = 'archive';
            break;
          case 'DRAFTS': // special-use xlist
            type = 'drafts';
            break;
          case 'FLAGGED': // special-use
            type = 'starred';
            break;
          case 'IMPORTANT': // (undocumented) xlist
            type = 'important';
            break;
          case 'INBOX': // xlist
            type = 'inbox';
            break;
          case 'JUNK': // special-use
            type = 'junk';
            break;
          case 'SENT': // special-use xlist
            type = 'sent';
            break;
          case 'SPAM': // xlist
            type = 'junk';
            break;
          case 'STARRED': // xlist
            type = 'starred';
            break;

          case 'TRASH': // special-use xlist
            type = 'trash';
            break;

          case 'HASCHILDREN': // 3348
          case 'HASNOCHILDREN': // 3348

          // - standard bits we don't care about
          case 'MARKED': // 3501
          case 'UNMARKED': // 3501
          case 'NOINFERIORS': // 3501
            // XXX use noinferiors to prohibit folder creation under it.
          // NOSELECT

          default:
        }
      }

      // heuristic based type assignment based on the name
      if (!type) {
        switch (box.displayName.toUpperCase()) {
          case 'DRAFT':
          case 'DRAFTS':
            type = 'drafts';
            break;
          case 'INBOX':
            type = 'inbox';
            break;
          // Yahoo provides "Bulk Mail" for yahoo.fr.
          case 'BULK MAIL':
          case 'JUNK':
          case 'SPAM':
            type = 'junk';
            break;
          case 'SENT':
            type = 'sent';
            break;
          case 'TRASH':
            type = 'trash';
            break;
          // This currently only exists for consistency with Thunderbird, but
          // may become useful in the future when we need an outbox.
          case 'UNSENT MESSAGES':
            type = 'queue';
            break;
        }
      }

      if (!type)
        type = 'normal';
    }
    return type;
  },
  _syncFolderComputeDeltas: function(conn, callback, err, boxesRoot) {
    var self = this;
    if (err) {
      callback(err);
      return;
    }

    // - build a map of known existing folders
    var folderPubsByPath = {};
    var folderPub;
    for (var iFolder = 0; iFolder < this.folders.length; iFolder++) {
      folderPub = this.folders[iFolder];
      folderPubsByPath[folderPub.path] = folderPub;
    }

    // - walk the boxes
    function walkBoxes(boxLevel, pathSoFar, pathDepth, parentId) {
      for (var boxName in boxLevel) {
        var box = boxLevel[boxName], meta,
            path = pathSoFar ? (pathSoFar + boxName) : boxName,
            folderId;

        // - normalize jerk-moves
        var type = self._determineFolderType(box, path);
        // gmail finds it amusing to give us the localized name/path of its
        // inbox, but still expects us to ask for it as INBOX.
        if (type === 'inbox')
          path = 'INBOX';

        // - already known folder
        if (folderPubsByPath.hasOwnProperty(path)) {
          // Because we speculatively create the Inbox, both its display name
          // and delimiter may be incorrect and need to be updated.
          meta = folderPubsByPath[path];
          meta.name = box.displayName;
          meta.delim = box.delim;

          // mark it with true to show that we've seen it.
          folderPubsByPath[path] = true;
        }
        // - new to us!
        else {
          meta = self._learnAboutFolder(box.displayName, path, parentId, type,
                                        box.delim, pathDepth);
        }

        if (box.children)
          walkBoxes(box.children, pathSoFar + boxName + box.delim,
                    pathDepth + 1, meta.id);
      }
    }
    walkBoxes(boxesRoot, '', 0, null);

    // - detect deleted folders
    // track dead folder id's so we can issue a
    var deadFolderIds = [];
    for (var folderPath in folderPubsByPath) {
      folderPub = folderPubsByPath[folderPath];
      // (skip those we found above)
      if (folderPub === true)
        continue;
      // It must have gotten deleted!
      this._forgetFolder(folderPub.id);
    }

    callback(null);
  },

  /**
   * Create the essential Sent and Trash folders if they do not already exist.
   *
   * XXX Our folder type detection logic probably needs to get more multilingual
   * and us as well.  When we do this, we can steal the localized strings from
   * Thunderbird to bootstrap.
   */
  ensureEssentialFolders: function(callback) {
    var trashFolder = this.getFirstFolderWithType('trash'),
        sentFolder = this.getFirstFolderWithType('sent');

    if (trashFolder && sentFolder) {
      callback(null);
      return;
    }

    var callbacks = allbackMaker(
      ['sent', 'trash'],
      function foldersCreated(results) {
        callback(null);
      });

    if (!sentFolder)
      this.universe.createFolder(this.id, null, 'Sent', false);
    else
      callbacks.sent(null);

    if (!trashFolder)
      this.universe.createFolder(this.id, null, 'Trash', false);
    else
      callbacks.trash(null);
  },

  scheduleMessagePurge: function(folderId, callback) {
    this.universe.purgeExcessMessages(this.compositeAccount, folderId,
                                      callback);
  },

  //////////////////////////////////////////////////////////////////////////////

  runOp: $acctmixins.runOp,
  getFirstFolderWithType: $acctmixins.getFirstFolderWithType,
};

/**
 * While gmail deserves major props for providing any IMAP interface, everyone
 * is much better off if we treat it specially.  EVENTUALLY.
 */
function GmailAccount() {
}
GmailAccount.prototype = {
  type: 'gmail-imap',

};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  ImapAccount: {
    type: $log.ACCOUNT,
    events: {
      createFolder: {},
      deleteFolder: {},

      createConnection: {},
      reuseConnection: {},
      releaseConnection: {},
      deadConnection: {},
      connectionMismatch: {},

      saveAccountState: {},

      /**
       * The maximum connection limit has been reached, we are intentionally
       * not creating an additional one.
       */
      maximumConnsNoNew: {},
    },
    TEST_ONLY_events: {
      deleteFolder: { path: false },

      createConnection: { folderId: false, label: false },
      reuseConnection: { folderId: false, label: false },
      releaseConnection: { folderId: false, label: false },
      deadConnection: { folderId: false },
      connectionMismatch: {},
    },
    errors: {
      unknownDeadConnection: {},
      connectionError: {},
      folderAlreadyHasConn: { folderId: false },
      opError: { mode: false, type: false, ex: $log.EXCEPTION },
    },
    asyncJobs: {
      runOp: { mode: true, type: true, error: false, op: false },
    },
    TEST_ONLY_asyncJobs: {
    },
  },
});

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
define('simplesmtp/lib/starttls',['require','exports','module','crypto','tls'],function (require, exports, module) {
// SOURCE: https://gist.github.com/848444

// Target API:
//
//  var s = require('net').createStream(25, 'smtp.example.com');
//  s.on('connect', function() {
//   require('starttls')(s, options, function() {
//      if (!s.authorized) {
//        s.destroy();
//        return;
//      }
//
//      s.end("hello world\n");
//    });
//  });
//
//

/**
 * @namespace Client STARTTLS module
 * @name starttls
 */
module.exports.starttls = starttls;

/**
 * <p>Upgrades a socket to a secure TLS connection</p>
 * 
 * @memberOf starttls
 * @param {Object} socket Plaintext socket to be upgraded
 * @param {Function} callback Callback function to be run after upgrade
 */
function starttls(socket, callback) {
    var sslcontext, pair, cleartext;
    
    socket.removeAllListeners("data");
    sslcontext = require('crypto').createCredentials();
    pair = require('tls').createSecurePair(sslcontext, false);
    cleartext = pipe(pair, socket);

    pair.on('secure', function() {
        var verifyError = (pair._ssl || pair.ssl).verifyError();

        if (verifyError) {
            cleartext.authorized = false;
            cleartext.authorizationError = verifyError;
        } else {
            cleartext.authorized = true;
        }

        callback(cleartext);
    });

    cleartext._controlReleased = true;
    return pair;
}

function forwardEvents(events, emitterSource, emitterDestination) {
    var map = [], name, handler;
    
    for(var i = 0, len = events.length; i < len; i++) {
        name = events[i];

        handler = forwardEvent.bind(emitterDestination, name);
        
        map.push(name);
        emitterSource.on(name, handler);
    }
    
    return map;
}

function forwardEvent() {
    this.emit.apply(this, arguments);
}

function removeEvents(map, emitterSource) {
    for(var i = 0, len = map.length; i < len; i++){
        emitterSource.removeAllListeners(map[i]);
    }
}

function pipe(pair, socket) {
    pair.encrypted.pipe(socket);
    socket.pipe(pair.encrypted);

    pair.fd = socket.fd;
    
    var cleartext = pair.cleartext;
  
    cleartext.socket = socket;
    cleartext.encrypted = pair.encrypted;
    cleartext.authorized = false;

    function onerror(e) {
        if (cleartext._controlReleased) {
            cleartext.emit('error', e);
        }
    }

    var map = forwardEvents(["timeout", "end", "close", "drain", "error"], socket, cleartext);
  
    function onclose() {
        socket.removeListener('error', onerror);
        socket.removeListener('close', onclose);
        removeEvents(map,socket);
    }

    socket.on('error', onerror);
    socket.on('close', onclose);

    return cleartext;
}
});
define('xoauth2',['require','exports','module'],function(require, exports, module) {
});

define('simplesmtp/lib/client',['require','exports','module','stream','util','net','tls','os','./starttls','xoauth2','crypto'],function (require, exports, module) {
// TODO:
// * Lisada timeout serveri ühenduse jaoks

var Stream = require('stream').Stream,
    utillib = require('util'),
    net = require('net'),
    tls = require('tls'),
    oslib = require('os'),
    starttls = require('./starttls').starttls,
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
 *     <li><b>secureConnection</b> - use SSL</li>
 *     <li><b>name</b> - the name of the client server</li>
 *     <li><b>auth</b> - authentication object <code>{user:"...", pass:"..."}</code>
 *     <li><b>ignoreTLS</b> - ignore server support for STARTTLS</li>
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
    
    this.port = port || (this.options.secureConnection ? 465 : 25);
    this.host = host || "localhost";
    
    this.options.secureConnection = !!this.options.secureConnection;
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
    
    if(this.options.ignoreTLS || this.options.secureConnection){
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

    if(this.options.secureConnection){
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
    this._ignoreData = true;
    starttls(this.socket, (function(socket){
        this.socket = socket;
        this._ignoreData = false;
        this._secureMode = true;
        this.socket.on("data", this._onData.bind(this));
            
        return callback(null, true);
    }).bind(this));
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
        // Try HELO instead
        this._currentAction = this._actionHELO;
        this.sendCommand("HELO "+this.options.name);
        return;
    }
    
    // Detect if the server supports STARTTLS
    if(!this._secureMode && str.match(/[ \-]STARTTLS\r?$/mi)){
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
    if(str.charAt(0) != "2"){
        // Try HELO instead
        this._currentAction = this._actionHELO;
        this.sendCommand("HELO "+this.options.name);
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
 *
 **/

define('mailapi/smtp/account',
  [
    'rdcommon/log',
    'simplesmtp/lib/client',
    'module',
    'exports'
  ],
  function(
    $log,
    $simplesmtp,
    $module,
    exports
  ) {

function SmtpAccount(universe, compositeAccount, accountId, credentials,
                     connInfo, _parentLog) {
  this.universe = universe;
  this.compositeAccount = compositeAccount;
  this.accountId = accountId;
  this.credentials = credentials;
  this.connInfo = connInfo;

  this._LOG = LOGFAB.SmtpAccount(this, _parentLog, accountId);

  this._activeConnections = [];
}
exports.Account = exports.SmtpAccount = SmtpAccount;
SmtpAccount.prototype = {
  type: 'smtp',
  toString: function() {
    return '[SmtpAccount: ' + this.id + ']';
  },

  get numActiveConns() {
    return this._activeConnections.length;
  },

  _makeConnection: function() {
    var conn = $simplesmtp(
      this.connInfo.port, this.connInfo.hostname,
      {
        secureConnection: this.connInfo.crypto === true,
        ignoreTLS: this.connInfo.crypto === false,
        auth: {
          user: this.credentials.username,
          pass: this.credentials.password
        },
        debug: false,
      });
    return conn;
  },

  shutdown: function(callback) {
    // (there should be no live connections during a unit-test initiated
    // shutdown.)
    this._LOG.__die();
  },

  /**
   * Asynchronously send an e-mail message.  Does not provide retries, offline
   * remembering of the command, or any follow-on logic like appending the
   * message to the sent folder.
   *
   * @args[
   *   @param[composedMessage MailComposer]{
   *     A mailcomposer instance that has already generated its message payload
   *     to its _outputBuffer field.  We previously used streaming generation,
   *     but have abandoned this for now for IMAP Sent folder saving purposes.
   *     Namely, our IMAP implementation doesn't support taking a stream for
   *     APPEND right now, and there's no benefit to doing double the work and
   *     generating extra garbage.
   *   }
   *   @param[callback @func[
   *     @args[
   *       @param[error @oneof[
   *         @case[null]{
   *           No error, message sent successfully.
   *         }
   *         @case['auth']{
   *           Authentication problem.  This should probably be escalated to
   *           the user so they can fix their password.
   *         }
   *         @case['bad-sender']{
   *           We logged in, but it didn't like our sender e-mail.
   *         }
   *         @case['bad-recipient']{
   *           There were one or more bad recipients; they are listed in the
   *           next argument.
   *         }
   *         @case['bad-message']{
   *           It failed during the sending of the message.
   *         }
   *         @case['server-maybe-offline']{
   *           The server won't let us login, maybe because of a bizarre offline
   *           for service strategy?  (We've seen this with IMAP before...)
   *
   *           This should be considered a fatal problem during probing or if
   *           it happens consistently.
   *         }
   *         @case['insecure']{
   *           We couldn't establish a secure connection.
   *         }
   *         @case['connection-lost']{
   *           The connection went away, we don't know why.  Could be a
   *           transient thing, could be a jerky server, who knows.
   *         }
   *         @case['unknown']{
   *           Some other error.  Internal error reporting/support should
   *           ideally be logging this somehow.
   *         }
   *       ]]
   *       @param[badAddresses @listof[String]]
   *     ]
   *   ]
   * ]
   */
  sendMessage: function(composer, callback) {
    var conn = this._makeConnection(), bailed = false, sendingMessage = false;
    this._activeConnections.push(conn);

    // - Optimistic case
    // Send the envelope once the connection is ready (fires again after
    // ready too.)
    conn.once('idle', function() {
        conn.useEnvelope(composer.getEnvelope());
      });
    // Then send the actual message if everything was cool
    conn.on('message', function() {
        if (bailed)
          return;
        sendingMessage = true;
        composer.withMessageBuffer({ includeBcc: false }, function(buffer) {
          conn.write(buffer);
          conn.end();
        });
      });
    // And close the connection and be done once it has been sent
    conn.on('ready', function() {
        bailed = true;
        conn.close();
        callback(null);
      });

    // - Error cases
    // It's possible for the server to decide some, but not all, of the
    // recipients are gibberish.  Since we are a mail client and talking to
    // a smarthost and not the final destination (most of the time), this
    // is not super likely.
    //
    // We upgrade this to a full failure to send
    conn.on('rcptFailed', function(addresses) {
        // nb: this gets called all the time, even without any failures
        if (addresses.length) {
          bailed = true;
          // simplesmtp does't view this as fatal, so we have to close it ourself
          conn.close();
          callback('bad-recipient', addresses);
        }
      });
    conn.on('error', function(err) {
        if (bailed) // (paranoia, this shouldn't happen.)
          return;
        var reportAs = null;
        switch (err.name) {
          // no explicit error type is given for: a bad greeting, failure to
          // EHLO/HELO, bad login sequence, OR a data problem during send.
          // The first 3 suggest a broken server or one that just doesn't want
          // to talk to us right now.
          case 'Error':
            if (sendingMessage)
              reportAs = 'bad-message';
            else
              reportAs = 'server-maybe-offline';
            break;
          case 'AuthError':
            reportAs = 'auth';
            break;
          case 'UnknownAuthError':
            reportAs = 'server-maybe-offline';
            break;
          case 'TLSError':
            reportAs = 'insecure';
            break;

          case 'SenderError':
            reportAs = 'bad-sender';
            break;
          // no recipients (bad message on us) or they all got rejected
          case 'RecipientError':
            reportAs = 'bad-recipient';
            break;

          default:
            reportAs = 'unknown';
            break;
        }
        bailed = true;
        callback(reportAs, null);
        // the connection gets automatically closed.
      });
      conn.on('end', function() {
        var idx = this._activeConnections.indexOf(conn);
        if (idx !== -1)
          this._activeConnections.splice(idx, 1);
        else
          console.error('Dead unknown connection?');
        if (bailed)
          return;
        callback('connection-lost', null);
        bailed = true;
        // (the connection is already closed if we are here)
      }.bind(this));
  },


};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  SmtpAccount: {
    type: $log.ACCOUNT,
    events: {
    },
    TEST_ONLY_events: {
    },
    errors: {
      folderAlreadyHasConn: { folderId: false },
    },
  },
});

}); // end define
;
/**
 * Configurator for fake
 **/

define('mailapi/composite/account',
  [
    'rdcommon/log',
    '../accountcommon',
    '../a64',
    '../accountmixins',
    '../imap/account',
    '../smtp/account',
    'exports'
  ],
  function(
    $log,
    $accountcommon,
    $a64,
    $acctmixins,
    $imapacct,
    $smtpacct,
    exports
  ) {

var PIECE_ACCOUNT_TYPE_TO_CLASS = {
  'imap': $imapacct.ImapAccount,
  'smtp': $smtpacct.SmtpAccount,
  //'gmail-imap': GmailAccount,
};

/**
 * Composite account type to expose account piece types with individual
 * implementations (ex: imap, smtp) together as a single account.  This is
 * intended to be a very thin layer that shields consuming code from the
 * fact that IMAP and SMTP are not actually bundled tightly together.
 */
function CompositeAccount(universe, accountDef, folderInfo, dbConn,
                          receiveProtoConn,
                          _LOG) {
  this.universe = universe;
  this.id = accountDef.id;
  this.accountDef = accountDef;

  // Currently we don't persist the disabled state of an account because it's
  // easier for the UI to be edge-triggered right now and ensure that the
  // triggering occurs once each session.
  this._enabled = true;
  this.problems = [];

  // XXX for now we are stealing the universe's logger
  this._LOG = _LOG;

  this.identities = accountDef.identities;

  if (!PIECE_ACCOUNT_TYPE_TO_CLASS.hasOwnProperty(accountDef.receiveType)) {
    this._LOG.badAccountType(accountDef.receiveType);
  }
  if (!PIECE_ACCOUNT_TYPE_TO_CLASS.hasOwnProperty(accountDef.sendType)) {
    this._LOG.badAccountType(accountDef.sendType);
  }

  this._receivePiece =
    new PIECE_ACCOUNT_TYPE_TO_CLASS[accountDef.receiveType](
      universe, this,
      accountDef.id, accountDef.credentials, accountDef.receiveConnInfo,
      folderInfo, dbConn, this._LOG, receiveProtoConn);
  this._sendPiece =
    new PIECE_ACCOUNT_TYPE_TO_CLASS[accountDef.sendType](
      universe, this,
      accountDef.id, accountDef.credentials,
      accountDef.sendConnInfo, dbConn, this._LOG);

  // expose public lists that are always manipulated in place.
  this.folders = this._receivePiece.folders;
  this.meta = this._receivePiece.meta;
  this.mutations = this._receivePiece.mutations;
  this.tzOffset = accountDef.tzOffset;
}
exports.Account = exports.CompositeAccount = CompositeAccount;
CompositeAccount.prototype = {
  toString: function() {
    return '[CompositeAccount: ' + this.id + ']';
  },
  toBridgeWire: function() {
    return {
      id: this.accountDef.id,
      name: this.accountDef.name,
      type: this.accountDef.type,

      enabled: this.enabled,
      problems: this.problems,

      syncRange: this.accountDef.syncRange,

      identities: this.identities,

      credentials: {
        username: this.accountDef.credentials.username,
        // no need to send the password to the UI.
      },

      servers: [
        {
          type: this.accountDef.receiveType,
          connInfo: this.accountDef.receiveConnInfo,
          activeConns: this._receivePiece.numActiveConns,
        },
        {
          type: this.accountDef.sendType,
          connInfo: this.accountDef.sendConnInfo,
          activeConns: this._sendPiece.numActiveConns,
        }
      ],
    };
  },
  toBridgeFolder: function() {
    return {
      id: this.accountDef.id,
      name: this.accountDef.name,
      path: this.accountDef.name,
      type: 'account',
    };
  },

  get enabled() {
    return this._enabled;
  },
  set enabled(val) {
    this._enabled = this._receivePiece.enabled = val;
  },

  saveAccountState: function(reuseTrans) {
    return this._receivePiece.saveAccountState(reuseTrans);
  },

  /**
   * Check that the account is healthy in that we can login at all.
   */
  checkAccount: function(callback) {
    // Since we use the same credential for both cases, we can just have the
    // IMAP account attempt to establish a connection and forget about SMTP.
    this._receivePiece.checkAccount(callback);
  },

  /**
   * Shutdown the account; see `MailUniverse.shutdown` for semantics.
   */
  shutdown: function() {
    this._sendPiece.shutdown();
    this._receivePiece.shutdown();
  },

  deleteFolder: function(folderId, callback) {
    return this._receivePiece.deleteFolder(folderId, callback);
  },

  sliceFolderMessages: function(folderId, bridgeProxy) {
    return this._receivePiece.sliceFolderMessages(folderId, bridgeProxy);
  },

  searchFolderMessages: function(folderId, bridgeHandle, phrase, whatToSearch) {
    return this._receivePiece.searchFolderMessages(
      folderId, bridgeHandle, phrase, whatToSearch);
  },

  syncFolderList: function(callback) {
    return this._receivePiece.syncFolderList(callback);
  },

  sendMessage: function(composer, callback) {
    return this._sendPiece.sendMessage(
      composer,
      function(err, errDetails) {
        // We need to append the message to the sent folder if we think we sent
        // the message okay and this is not gmail.  gmail automatically crams
        // the message in the sent folder for us, so if we do it, we're just
        // going to create duplicates.
        if (!err && !this._receivePiece.isGmail) {
          composer.withMessageBuffer({ includeBcc: true }, function(buffer) {
            var message = {
              messageText: buffer,
              // do not specify date; let the server use its own timestamping
              // since we want the approximate value of 'now' anyways.
              flags: ['Seen'],
            };

            var sentFolder = this.getFirstFolderWithType('sent');
            if (sentFolder)
              this.universe.appendMessages(sentFolder.id,
                                           [message]);
          }.bind(this));
        }
        callback(err, errDetails, null);
      }.bind(this));
  },

  getFolderStorageForFolderId: function(folderId) {
    return this._receivePiece.getFolderStorageForFolderId(folderId);
  },

  getFolderMetaForFolderId: function(folderId) {
    return this._receivePiece.getFolderMetaForFolderId(folderId);
  },

  runOp: function(op, mode, callback) {
    return this._receivePiece.runOp(op, mode, callback);
  },

  ensureEssentialFolders: function(callback) {
    return this._receivePiece.ensureEssentialFolders(callback);
  },

  getFirstFolderWithType: $acctmixins.getFirstFolderWithType,
};

}); // end define;
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
      secureConnection: connInfo.crypto === true,
      ignoreTLS: connInfo.crypto === false,
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
      // detect an nsISSLStatus instance by an unusual property.
      if ('isNotValidAtThisTime' in err) {
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
      console.warn('PROBE:SMTP sad. error: |' + err + '|');
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
/**
 * Configurator for imap+smtp
 **/

define('mailapi/composite/configurator',
  [
    'rdcommon/log',
    '../accountcommon',
    '../a64',
    '../allback',
    './account',
    '../imap/probe',
    '../smtp/probe',
    'exports'
  ],
  function(
    $log,
    $accountcommon,
    $a64,
    $allback,
    $account,
    $imapprobe,
    $smtpprobe,
    exports
  ) {

var allbackMaker = $allback.allbackMaker;

exports.account = $account;
exports.configurator = {
  tryToCreateAccount: function cfg_is_ttca(universe, userDetails, domainInfo,
                                           callback, _LOG) {
    var credentials, imapConnInfo, smtpConnInfo;
    if (domainInfo) {
      credentials = {
        username: domainInfo.incoming.username,
        password: userDetails.password,
      };
      imapConnInfo = {
        hostname: domainInfo.incoming.hostname,
        port: domainInfo.incoming.port,
        crypto: domainInfo.incoming.socketType === 'SSL',
      };
      smtpConnInfo = {
        hostname: domainInfo.outgoing.hostname,
        port: domainInfo.outgoing.port,
        crypto: domainInfo.outgoing.socketType === 'SSL',
      };
    }

    var self = this;
    var callbacks = allbackMaker(
      ['imap', 'smtp'],
      function probesDone(results) {
        // -- both good?
        if (results.imap[0] === null && results.smtp[0] === null) {
          var account = self._defineImapAccount(
            universe,
            userDetails, credentials,
            imapConnInfo, smtpConnInfo, results.imap[1],
            results.imap[2],
            callback);
        }
        // -- either/both bad
        else {
          // clean up the imap connection if it was okay but smtp failed
          if (results.imap[0] === null) {
            results.imap[1].die();
            // Failure was caused by SMTP, but who knows why
            callback(results.smtp[0], null, results.smtp[1]);
          } else {
            callback(results.imap[0], null, results.imap[2]);
          }
          return;
        }
      });

    var imapProber = new $imapprobe.ImapProber(credentials, imapConnInfo,
                                               _LOG);
    imapProber.onresult = callbacks.imap;

    var smtpProber = new $smtpprobe.SmtpProber(credentials, smtpConnInfo,
                                               _LOG);
    smtpProber.onresult = callbacks.smtp;
  },

  recreateAccount: function cfg_is_ra(universe, oldVersion, oldAccountInfo,
                                      callback) {
    var oldAccountDef = oldAccountInfo.def;

    var credentials = {
      username: oldAccountDef.credentials.username,
      password: oldAccountDef.credentials.password,
    };
    var accountId = $a64.encodeInt(universe.config.nextAccountNum++);
    var accountDef = {
      id: accountId,
      name: oldAccountDef.name,

      type: 'imap+smtp',
      receiveType: 'imap',
      sendType: 'smtp',

      syncRange: oldAccountDef.syncRange,

      credentials: credentials,
      receiveConnInfo: {
        hostname: oldAccountDef.receiveConnInfo.hostname,
        port: oldAccountDef.receiveConnInfo.port,
        crypto: oldAccountDef.receiveConnInfo.crypto,
      },
      sendConnInfo: {
        hostname: oldAccountDef.sendConnInfo.hostname,
        port: oldAccountDef.sendConnInfo.port,
        crypto: oldAccountDef.sendConnInfo.crypto,
      },

      identities: $accountcommon.recreateIdentities(universe, accountId,
                                     oldAccountDef.identities),
      // this default timezone here maintains things; but people are going to
      // need to create new accounts at some point...
      tzOffset: oldAccountInfo.tzOffset !== undefined ?
                  oldAccountInfo.tzOffset : -7 * 60 * 60 * 1000,
    };

    this._loadAccount(universe, accountDef,
                      oldAccountInfo.folderInfo, function (account) {
      callback(null, account, null);
    });
  },

  /**
   * Define an account now that we have verified the credentials are good and
   * the server meets our minimal functionality standards.  We are also
   * provided with the protocol connection that was used to perform the check
   * so we can immediately put it to work.
   */
  _defineImapAccount: function cfg_is__defineImapAccount(
                        universe,
                        userDetails, credentials, imapConnInfo, smtpConnInfo,
                        imapProtoConn, tzOffset, callback) {
    var accountId = $a64.encodeInt(universe.config.nextAccountNum++);
    var accountDef = {
      id: accountId,
      name: userDetails.accountName || userDetails.emailAddress,

      type: 'imap+smtp',
      receiveType: 'imap',
      sendType: 'smtp',

      syncRange: 'auto',

      credentials: credentials,
      receiveConnInfo: imapConnInfo,
      sendConnInfo: smtpConnInfo,

      identities: [
        {
          id: accountId + '/' +
                $a64.encodeInt(universe.config.nextIdentityNum++),
          name: userDetails.displayName,
          address: userDetails.emailAddress,
          replyTo: null,
          signature: null
        },
      ],
      tzOffset: tzOffset,
    };

    this._loadAccount(universe, accountDef, null,
                      imapProtoConn, function (account) {
      callback(null, account, null);
    });
  },

  /**
   * Save the account def and folder info for our new (or recreated) account and
   * then load it.
   */
  _loadAccount: function cfg_is__loadAccount(universe, accountDef,
                                             oldFolderInfo, imapProtoConn,
                                             callback) {
    // XXX: Just reload the old folders when applicable instead of syncing the
    // folder list again, which is slow.
    var folderInfo = {
      $meta: {
        nextFolderNum: 0,
        nextMutationNum: 0,
        lastFolderSyncAt: 0,
        capability: (oldFolderInfo && oldFolderInfo.$meta.capability) ||
                    imapProtoConn.capabilities,
        rootDelim: (oldFolderInfo && oldFolderInfo.$meta.rootDelim) ||
                   imapProtoConn.delim,
      },
      $mutations: [],
      $mutationState: {},
    };
    universe.saveAccountDef(accountDef, folderInfo);
    universe._loadAccount(accountDef, folderInfo, imapProtoConn, callback);
  },
};

}); // end define
;