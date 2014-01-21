'use strict';

/*
 * Run b2g-info in the device *synchronously*.
 *
 * This is because all the tests are synchronous.
 */

var fs = require('fs'),
    execSync = require('./exec-sync.js')

function b2ginfo() {
  var adb = execSync('adb shell b2g-info', true);
  return adb;
}

function isNotEmpty(str) {
  return str != '';
}

var MemInfo = {

  _meminfo: [],

  /* keys for fields */
  _keys: [],

  _currentLineNumber: 0,
  /* state in parser */
  _state: 'none', // 'ps', 'done'

  _parsePsLine: function MemInfo_parsePsLine(line, keys) {
    var fields = line.split(' ').filter(isNotEmpty);
    if (fields.length < keys.length) {
      console.error('Not enough fields given the number of keys.');
      return null;
    }

    var numKeys = keys.length;
    var last = fields.length - 1;
    var idx = last;
    var ps = {};
    while(Object.keys(ps).length < numKeys) {
      ps[keys[numKeys - 1 - (last - idx)]] = fields[idx];
      idx--;
    }

    // now fix the process name as we have some with spaces in it
    // oh the joy of parsing text output.
    if(idx >= 0) {
      fields.splice(idx + 1, fields.length);
      var s = '';
      fields.forEach(function (e) {
        s += (s.length ? ' ' : '') + e;
      });
      ps[keys[0]] = s + ' ' + ps[keys[0]];
    }
    return ps;
  },

  _processLine: function(line) {
    this._currentLineNumber++;
    if (this._state == 'done')
      return;

    if (this._currentLineNumber == 1)
      return; // skip first line. XXX maybe parse it to know the units.

    if (this._currentLineNumber == 2) {
      this._keys = line.split(' ').filter(isNotEmpty);
      this._state = 'ps';
      return;
    }

    if (this._state == 'ps') {
      if (line == '') {
        // an empty line means we are done with ps.
        // if we need more info change the state to something else.
        this._state = 'done';
        return;
      }

      var ps = this._parsePsLine(line, this._keys);
      if(ps != null) {
        this._meminfo.push(ps);
      }
    }
  },

  meminfo: function MemInfo_meminfo() {

    var output = b2ginfo().stdout;

    var i = 0;
    while (i < output.length) {
      // EOL is CRLF.
      var j = output.indexOf('\r\n', i);
      if (j == -1) {
        j = output.length;
      }
      this._processLine(output.substr(i, j - i));
      // skip 2 (CRLF)
      i = j + 2;
    }

    return this._meminfo;
  }

};

module.exports = MemInfo;

if(require.main === module) {
  console.log('Tested MemInfo');
  console.log(MemInfo.meminfo());
}

