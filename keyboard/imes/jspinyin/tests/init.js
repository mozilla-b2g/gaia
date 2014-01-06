'use strict';

const testRepeatCount = 10;

var emEngineWrapper = {
  _worker: null,
  _callback: null,
  _initialized: false,

  post: function(id, param, callback) {
    if (!this._initialized && id != 'init')
      throw 'Database not ready!';

    if (!this._callback[id])
      this._callback[id] = [];

    this._callback[id].push(callback);
    this._worker.postMessage({
      id: id,
      param: param
    });

    return true;
  },

  init: function(path, byteArray, callback) {
    if (this._initialized)
      callback(true);

    var self = this;

    this._callback = {};
    this._worker = new Worker(path + '/worker.js');

    this._worker.onmessage = function(e) {
      var data = e.data;

      switch (data.id) {
      case 'message':
        console.log('emEngineWrapper: ' + data.returnValue);
        break;
      default:
        var msgCallback = self._callback[data.id].shift();
        if (msgCallback)
          msgCallback(data.returnValue);
      }
    };

    this.post('init', {
      userDict: byteArray
    }, function(isOk) {
      if (isOk) {
        self._initialized = true;
      } else {
        self.uninit();
      }
      callback(isOk);
    });
  },

  uninit: function() {
    if (this._worker)
      this._worker.terminate();
    this._worker = null;
    this._callback = null;
    this._initialized = false;
  },

  isReady: function() {
    return this._initialized;
  }
};

window.addEventListener('load', function() {
  document.getElementById('status').textContent =
    'NOTE: please copy "../empinyin_files.*", "../libpinyin.js" and ' +
    '"worker.js" to this "tests" folder first.';
  document.getElementById('test2').value = 'test x ' + testRepeatCount;

  emEngineWrapper.init('.', null, function(isOk) {
    if (isOk) {
      document.getElementById('status').textContent = '';
      log('Engine ready!');
      initTest();
    } else {
      log('Load data failed!');
    }
  });
});

function log(msg) {
  var date = new Date();
  var loggerTime = date.getHours() + ':' + date.getMinutes() + ':' +
                   date.getSeconds() + ':' + date.getMilliseconds();

  var divLog = document.getElementById('log');
  var p = document.createElement('p');
  p.innerHTML = loggerTime + ' : ' + msg;
  divLog.insertBefore(p, divLog.firstChild);
}

function initTest() {
  document.getElementById('test').onclick = function() {
    var keyword = document.getElementById('pinyin').value;

    try {
      log('search keyword ' + keyword);

      var startTime = new Date().getTime();

      emEngineWrapper.post('im_search', {
        queryString: keyword,
        limit: -1
      }, function(returnValue) {
        var endTime = new Date().getTime();

        log('total cost: ' + (endTime - startTime) + 'ms');

        var size = returnValue.length;
        var candidates = returnValue.results;

        log('length: ' + size);
        log('Candidates: ' + candidates.join(' '));

        emEngineWrapper.post('im_choose', {
          candId: 0
        }, function(convertedText) {
          log('Choose: ' + convertedText);

          if (convertedText) {
            startTime = new Date().getTime();

            emEngineWrapper.post('im_search_predicts', {
              queryString: convertedText,
              limit: -1
            }, function(returnValue) {
              endTime = new Date().getTime();

              log('total cost: ' + (endTime - startTime) + 'ms');

              var nPredicts = returnValue.length;
              var predicts = returnValue.results;

              log('length: ' + nPredicts);
              log('Predicts: ' + predicts.join(' '));
            });
          }
        });
      });
    } catch (e) {
      log('error: ' + e);
    }
  };

  document.getElementById('test2').onclick = function() {
    var keyword = document.getElementById('pinyin').value;

    try {
      log('search ' + testRepeatCount + ' times keyword ' + keyword);

      var startTime = new Date().getTime();
      var size = 0;
      var counter = 0;

      var doTest = function() {
        emEngineWrapper.post('im_search', {
          queryString: keyword,
          limit: -1
        }, function(returnValue) {
          if (++counter == testRepeatCount) {
            var endTime = new Date().getTime();
            var period = endTime - startTime;

            log('total cost: ' + period + 'ms');
            log('average cost: ' + (period / testRepeatCount) + 'ms');
            log('length: ' + returnValue.length);
          } else {
            doTest();
          }
        });
      };

      doTest();
    } catch (e) {
      log('error: ' + e);
    }
  };
}
