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

  meminfo: function MemInfo_meminfo() {

    var _meminfo = [];

    /* keys for fields */
    var _keys = [];

    /* state in parser */
    var _state = 'none'; // 'header', 'ps', 'done'

    function _parsePsLine(line, keys) {
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
    }

    function _processLine(line) {
      switch(_state) {

      case 'none':
        var regex = /bytes/;
        var r = line.match(regex);
        if(r) {
          _state = 'header';
        }
        return;

      case 'header':
        _keys = line.split(' ').filter(isNotEmpty);
        _state = 'ps';
        break;

      case 'ps':
        if (line == '') {
          // an empty line means we are done with ps.
          // if we need more info change the state to something else.
          _state = 'done';
          return;
        }

        var ps = _parsePsLine(line, _keys);
        if(ps != null) {
          _meminfo.push(ps);
        }
        break;

      case 'done':
        return;

      default:
        break;
      }
    }

    var output = b2ginfo().stdout;

    var i = 0;
    while (i < output.length) {
      // EOL is CRLF.
      var j = output.indexOf('\r\n', i);
      if (j == -1) {
        j = output.length;
      }
      _processLine(output.substr(i, j - i));
      // skip 2 (CRLF)
      i = j + 2;
    }
    return _meminfo;
  }

};

module.exports = MemInfo;

if(require.main === module) {
  console.log('Tested MemInfo');
  console.log(MemInfo.meminfo());
}

