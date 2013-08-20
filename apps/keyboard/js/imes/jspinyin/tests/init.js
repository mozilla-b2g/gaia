'use strict';

const testRepeatCount = 10;

var Module = {};

window.addEventListener('load', function() {
  document.getElementById('status').textContent =
    'NOTE: please copy "../empinyin_files.*" and "../libpinyin.js" to this ' +
    '"tests" folder first.';
  document.getElementById('test2').value = 'test x ' + testRepeatCount;

  var script;

  script = document.createElement('script');
  script.src = 'empinyin_files.js';
  document.body.appendChild(script);

  initModule();

  script = document.createElement('script');
  script.src = 'libpinyin.js';
  document.body.appendChild(script);
});

function getLoggerTime() {
  var date = new Date();
  return date.getHours() + ':' + date.getMinutes() + ':' +
         date.getSeconds() + ':' + date.getMilliseconds();
}

function log(msg) {
  var divLog = document.getElementById('log');
  var p = document.createElement('p');
  p.innerHTML = getLoggerTime() + ' : ' + msg;
  divLog.insertBefore(p, divLog.firstChild);
}

function initModule() {
  Module['canvas'] = document.createElement('canvas');
  Module['stdout'] = null;

  Module['setStatus'] = function(status) {
    document.getElementById('status').textContent = status;
  };

  Module['_main'] = function() {
    var im_open_decoder =
      Module.cwrap('im_open_decoder', 'number', ['string', 'string']);
    var im_reset_search =
      Module.cwrap('im_reset_search', '', []);
    var im_search =
      Module.cwrap('im_search', 'number', ['string', 'number']);
    var im_get_candidate_char =
      Module.cwrap('im_get_candidate_char', 'string', ['number']);
    var im_get_predicts =
      Module.cwrap('im_get_predicts_utf8', 'number', ['string', 'number']);
    var im_get_predict_at =
      Module.cwrap('im_get_predict_at', 'string', ['number']);

    log('Data file is ready');
    log('Opening data/dict.data ....');

    if (im_open_decoder('data/dict.data', 'user.dict')) {
      log('Success to open data/dict.data!');
    } else {
      log('Failed to open data/dict.data!');
      return;
    }

    document.getElementById('test').onclick = function() {
      var keyword = document.getElementById('pinyin').value;

      try {
        log('search keyword ' + keyword);

        var startTime = new Date().getTime();
        var size = 0;

        for (var i = 0; i < 1; i++) {
          im_reset_search();
          size = im_search(keyword, keyword.length);
        }

        var endTime = new Date().getTime();

        log('total cost: ' + (endTime - startTime) + 'ms');
        log('length: ' + size);

        var candidates = [];
        for (var i = 0; i < size; i++) {
          candidates.push(im_get_candidate_char(i));
        }
        log('Candidates: ' + candidates.join(' '));

        startTime = new Date().getTime();
        var nPredicts = im_get_predicts(im_get_candidate_char(0));
        endTime = new Date().getTime();

        log('total cost: ' + (endTime - startTime) + 'ms');
        log('length: ' + nPredicts);

        var predicts = [];

        for (var i = 0; i < nPredicts; i++) {
          predicts.push(im_get_predict_at(i));
        }

        log('Predicts: ' + predicts.join(' '));
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

        for (var i = 0; i < testRepeatCount; i++) {
          im_reset_search();
          size = im_search(keyword, keyword.length);
        }

        var endTime = new Date().getTime();
        var period = endTime - startTime;

        log('total cost: ' + period + 'ms');
        log('average cost: ' + (period / testRepeatCount) + 'ms');
        log('length: ' + size);
      } catch (e) {
        log('error: ' + e);
      }
    };
  };
}
