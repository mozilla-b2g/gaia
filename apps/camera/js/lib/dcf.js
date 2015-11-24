define(function(require, exports, module) {
'use strict';

// This handles the logic pertaining to the naming of files according
// to the Design rule for Camera File System
// * http://en.wikipedia.org/wiki/Design_rule_for_Camera_File_system

/**
 * Dependencies
 */

var asyncStorage = require('asyncStorage');
var debug = require('debug')('dcf');
var format = require('format');

/**
 * Locals
 */

var dcfConfigLoaded = false;
var deferredArgs = null;
var defaultSeq = {file: 1, dir: 100};
var dcfConfig = {
  key: 'dcf_key',
  seq: null,
  postFix: 'MZLLA',
  prefix: {video: 'VID_', image: 'IMG_'},
  ext: {video: '3gp', image: 'jpg'}
};

exports.priv = {};
exports.init = function() {
  debug('initializing');
  asyncStorage.getItem(dcfConfig.key, function(value) {
    dcfConfigLoaded = true;
    dcfConfig.seq = value ? value : defaultSeq;

    // We have a previous call to createDCFFilename that is waiting for
    // a response, fire it again
    if (deferredArgs) {
      var args = deferredArgs;
      exports.createDCFFilename(args.storage, args.type, args.callback);
      deferredArgs = null;
    }

    debug('initialized');
  });
};

function nextSeqIndex(storage, filedir, seq) {

  var fileRe = new RegExp('\\w{4}(\\d{4})\\.\\w{3}\\b');

  var m;
  var highestSeq = 0;

  var c = storage.enumerate(filedir);
  c.onsuccess = function() {
    var file = this.result;

    m = fileRe.exec(file.name);
    if (m) {
      highestSeq = Math.max(parseInt(m[1], 10), highestSeq);
    }

    if (!this.done) {
      this.continue();
    }
  };

  if (highestSeq < seq.file) {
    highestSeq = seq.file;
  } else {
    highestSeq++;
  }
  return { file: highestSeq, dir: seq.dir };
}

// export it to test it.
exports.priv.nextSeqIndex = nextSeqIndex;

exports.createDCFFilename = function(storage, type, callback) {

  // We havent loaded the current counters from indexedDB yet, defer
  // the call
  if (!dcfConfigLoaded) {
    deferredArgs = {storage: storage, type: type, callback: callback};
    return;
  }

  var dir = 'DCIM/' + dcfConfig.seq.dir + dcfConfig.postFix + '/';
  var filename = dcfConfig.prefix[type] +
    format.padLeft(dcfConfig.seq.file, 4, '0') + '.' +
    dcfConfig.ext[type];
  var filepath = dir + filename;

  // A file with this name may have been written by the user or
  // our indexeddb sequence tracker was cleared, check we wont overwrite
  // anything
  var req = storage.get(filepath);

  // A file existed, we bump the directory then try to generate a
  // new filename
  req.onsuccess = function() {
    // XXX find the next file
    var nextSeq = nextSeqIndex(storage, dir, dcfConfig.seq);
    dcfConfig.seq.file = nextSeq.file;
    dcfConfig.seq.dir = nextSeq.dir;
    asyncStorage.setItem(dcfConfig.key, dcfConfig.seq, function() {
      exports.createDCFFilename(storage, type, callback);
    });
  };

  // No file existed, we are good to go
  req.onerror = function() {
    if (dcfConfig.seq.file < 9999) {
      dcfConfig.seq.file += 1;
    } else {
      dcfConfig.seq.file = 1;
      dcfConfig.seq.dir += 1;
    }
    asyncStorage.setItem(dcfConfig.key, dcfConfig.seq, function() {
      callback(filepath, filename, dir);
    });
  };
};

});
