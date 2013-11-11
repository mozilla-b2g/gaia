/*global define, setTimeout */

// This handles the logic pertaining to the naming of files according
// to the Design rule for Camera File System
// * http://en.wikipedia.org/wiki/Design_rule_for_Camera_File_system
define(function() {

  var api = {};

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

  api.init = function() {

    asyncStorage.getItem(dcfConfig.key, function(value) {

      dcfConfigLoaded = true;
      dcfConfig.seq = value ? value : defaultSeq;

      // We have a previous call to createDCFFilename that is waiting for
      // a response, fire it again
      if (deferredArgs) {
        var args = deferredArgs;
        api.createDCFFilename(args.storage, args.type, args.callback);
        deferredArgs = null;
      }
    });
  };

  api.createDCFFilename = function(storage, type, callback) {

    // We havent loaded the current counters from indexedDB yet, defer
    // the call
    if (!dcfConfigLoaded) {
      deferredArgs = {storage: storage, type: type, callback: callback};
      return;
    }

    var filepath = 'DCIM/' + dcfConfig.seq.dir + dcfConfig.postFix + '/';
    var filename = dcfConfig.prefix[type] +
      padLeft(dcfConfig.seq.file, 4) + '.' +
      dcfConfig.ext[type];

    // A file with this name may have been written by the user or
    // our indexeddb sequence tracker was cleared, check we wont overwrite
    // anything
    var req = storage.get(filepath + filename);

    // A file existed, we bump the directory then try to generate a
    // new filename
    req.onsuccess = function() {
      dcfConfig.seq.file = 1;
      dcfConfig.seq.dir += 1;
      asyncStorage.setItem(dcfConfig.key, dcfConfig.seq, function() {
        api.createDCFFilename(storage, type, callback);
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
        callback(filepath, filename);
      });
    };
  };

  return api;

});
