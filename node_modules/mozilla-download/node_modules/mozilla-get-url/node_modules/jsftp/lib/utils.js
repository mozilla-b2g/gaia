var Parser = require("parse-listing");
var async = require("async");

var RE_RES = /^(\d\d\d)\s(.*)/;
var RE_MULTI = /^(\d\d\d)-/;
var RE_SERVER_RESPONSE = /^(\d\d\d)(.*)/;

var Utils = module.exports = {
  // Codes from 100 to 200 are FTP marks
  isMark: function(code) {
    code = parseInt(code, 10);
    return code > 100 && code < 200;
  },

  /**
   * Parse raw output of a file listing, trying in to clean up broken listings in
   * the process
   * @param {String} listing Raw file listing coming from a 'list' or 'stat'
   * @returns {Object[]}
   */
  parseEntry: function(listing) {
    var t, parsedEntry;
    var i = 0;
    var parsed = [];
    var splitEntries = listing.split(/\r\n|\n/);
    async.eachSeries(splitEntries, function(entry, next) {
      function _next() {
        i += 1;
        next();
      }

      // Some servers include an official code-multiline sign at the beginning of
      // every string. We must strip it if that's the case.
      if (RE_MULTI.test(entry))
        entry = entry.substr(3);

      entry = entry.trim();

      // Filter file-listing results from 'STAT' command, since they include
      // server responses before and after the file listing.
      // Issue: https://github.com/sergi/jsftp/issues/3
      if (RE_SERVER_RESPONSE.test(entry) ||
        RE_RES.test(entry) || RE_MULTI.test(entry)) {
        return _next();
      }

      parsedEntry = Parser.parseEntry(entry);
      if (parsedEntry === null) {
        if (splitEntries[i + 1]) {
          t = Parser.parseEntry(entry + splitEntries[i + 1]);
          if (t !== null) {
            splitEntries[i + 1] = entry + splitEntries[i + 1];
            return _next();
          }
        }

        if (splitEntries[i - 1] && parsed.length > 0) {
          t = Parser.parseEntry(splitEntries[i - 1] + entry);
          if (t !== null) {
            parsed[parsed.length - 1] = t;
          }
        }
      }
      else {
        if (parsedEntry)
          parsed.push(parsedEntry)
      }
      _next();
    });

    return parsed;
  },

  getPasvPort: function(text) {
    var RE_PASV = /([-\d]+,[-\d]+,[-\d]+,[-\d]+),([-\d]+),([-\d]+)/;
    var match = RE_PASV.exec(text);
    if (!match) return false;

    // Array containing the passive host and the port number
    return [match[1].replace(/,/g, "."),
      (parseInt(match[2], 10) & 255) * 256 + (parseInt(match[3], 10) & 255)];
  },

  /**
   * Cleans up commands with potentially insecure data in them, such as
   * passwords, personal info, etc.
   *
   * @param cmd {String} Command to be sanitized
   * @returns {String} Sanitized command
   */
  sanitize: function(cmd) {
    if (!cmd) return "";

    var _cmd = cmd.slice(0, 5);
    if (_cmd === "pass ")
      cmd = _cmd + Array(cmd.length - 5).join("*");

    return cmd;
  }
}

