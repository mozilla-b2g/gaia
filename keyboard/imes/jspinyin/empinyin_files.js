
(function() {

  if (typeof Module == 'undefined') Module = {};
  if (!Module['preRun']) Module['preRun'] = [];
  Module['preRun'].push(function() {
    function assert(check, msg) {
      if (!check) throw msg + new Error().stack;
    }

    Module['FS_createPath']('/', 'data', true, true);

    function DataRequest() {}
    DataRequest.prototype = {
      requests: {},
      open: function(mode, name) {
        this.requests[name] = this;
      },
      send: function() {}
    };
    var filePreload0 = new DataRequest();
    filePreload0.open('GET', 'data/dict.data', true);
    filePreload0.responseType = 'arraybuffer';
    filePreload0.onload = function() {
      var arrayBuffer = filePreload0.response;
      assert(arrayBuffer, 'Loading file data/dict.data failed.');
      var byteArray = !arrayBuffer.subarray ?
        new Uint8Array(arrayBuffer) : arrayBuffer;

      Module['FS_createPreloadedFile'](
        '/data', 'dict.data', byteArray, true, true, function() {
          Module['removeRunDependency']('fp data/dict.data');
        }
      );
    };
    Module['addRunDependency']('fp data/dict.data');
    filePreload0.send(null);

    if (!Module.expectedDataFileDownloads) {
      Module.expectedDataFileDownloads = 0;
      Module.finishedDataFileDownloads = 0;
    }
    Module.expectedDataFileDownloads++;

    var PACKAGE_NAME = 'empinyin_files.data';
    var REMOTE_PACKAGE_NAME =
    (Module['empinyin_files_path'] ? Module['empinyin_files_path'] + '/' : '') +
      'empinyin_files.data';

    var PACKAGE_UUID = '64577897-299a-4825-b6d2-4b93c3b6972d';

    function fetchRemotePackage(packageName, callback, errback) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', packageName, true);
      xhr.responseType = 'arraybuffer';
      xhr.onprogress = function(event) {
        var url = packageName;
        if (event.loaded && event.total) {
          if (!xhr.addedTotal) {
            xhr.addedTotal = true;
            if (!Module.dataFileDownloads) Module.dataFileDownloads = {};
            Module.dataFileDownloads[url] = {
              loaded: event.loaded,
              total: event.total
            };
          } else {
            Module.dataFileDownloads[url].loaded = event.loaded;
          }
          var total = 0;
          var loaded = 0;
          var num = 0;
          for (var download in Module.dataFileDownloads) {
          var data = Module.dataFileDownloads[download];
            total += data.total;
            loaded += data.loaded;
            num++;
          }
          total = Math.ceil(total * Module.expectedDataFileDownloads / num);
          Module['setStatus'](
            'Downloading data... (' + loaded + '/' + total + ')'
          );
        } else if (!Module.dataFileDownloads) {
          Module['setStatus']('Downloading data...');
        }
      };
      xhr.onload = function(event) {
        var packageData = xhr.response;
        callback(packageData);
      };
      xhr.send(null);
    };

    function processPackageData(arrayBuffer) {
      Module.finishedDataFileDownloads++;
      assert(arrayBuffer, 'Loading data file failed.');
      var byteArray = new Uint8Array(arrayBuffer);
      var curr;

        curr = DataRequest.prototype.requests['data/dict.data'];
        var data = byteArray.subarray(0, 1068442);
        var ptr = Module['_malloc'](1068442);
        Module['HEAPU8'].set(data, ptr);
        curr.response = Module['HEAPU8'].subarray(ptr, ptr + 1068442);
        curr.onload();
                Module['removeRunDependency']('datafile_empinyin_files.data');

    };
    Module['addRunDependency']('datafile_empinyin_files.data');

    function handleError(error) {
      console.error('package error:', error);
    };

    if (!Module.preloadResults)
      Module.preloadResults = {};

      Module.preloadResults[PACKAGE_NAME] = {fromCache: false};
      fetchRemotePackage(REMOTE_PACKAGE_NAME, processPackageData, handleError);
      });

})();

