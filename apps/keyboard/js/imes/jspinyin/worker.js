/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Module;
var emEngine;
var procFunction;

self.onmessage = function(e) {
  var data = e.data;

  if (data.id == 'init') {
    initModule(data.id, data.param);
  } else if (procFunction[data.id]) {
    var result = procFunction[data.id](data.param);
    post(data.id, result);
  } else {
    log('echo: ' + JSON.stringify(e.data));
  }
};

function initModule(msgId, param) {
  Module = {
    canvas: {},
    stdout: null,
    setStatus: log,
    preRun: [function() {
      if (param.userDict) {
        Module['addRunDependency']('fp data/user_dict.data');
        Module['FS_createPreloadedFile'](
            '/data', 'user_dict.data', param.userDict, true, true, function() {
          Module['removeRunDependency']('fp data/user_dict.data');
        });
      }
    }],
    _main: function() {
      emEngine = {
        openDecoder:
          Module.cwrap('im_open_decoder', 'number', ['string', 'string']),
        closeDecoder:
          Module.cwrap('im_close_decoder', '', []),
        search:
          Module.cwrap('im_search', 'number', ['string', 'number']),
        resetSearch:
          Module.cwrap('im_reset_search', '', []),
        getCandidateAt:
          Module.cwrap('im_get_candidate_char', 'string', ['number']),
        getPredicts:
          Module.cwrap('im_get_predicts_utf8', 'number', ['string', 'number']),
        getPredictAt:
          Module.cwrap('im_get_predict_at', 'string', ['number']),
        choose:
          Module.cwrap('im_choose', 'number', ['number']),
        getSplStart:
          Module.cwrap('im_get_spl_start', 'number', []),
        getSplStartAt:
          Module.cwrap('im_get_spl_start_at', 'number', ['number']),
        getFixedLen:
          Module.cwrap('im_get_fixed_len', 'number', []),
        flushCache:
          Module.cwrap('im_flush_cache', '', [])
      };

      if (emEngine.openDecoder('data/dict.data', 'data/user_dict.data')) {
        initProcFunctions();
        post(msgId, true);
      } else {
        post(msgId, false);
      }
    }
  };

  try {
    importScripts('empinyin_files.js');
    importScripts('libpinyin.js');
  } catch (e) {
    log(e.toString());
    post(msgId, false);
  }
}

function initProcFunctions() {
  var getSearchResult = function(emEngineGetAt, param) {
    var start = param.start;
    var count = param.count;
    var results = [];
    for (var i = start; i < count; i++) {
      results.push(emEngineGetAt(i));
    }
    return results;
  };

  var search = function(emEngineSearch, emEngineGetAt, param) {
    var query = param.queryString;
    var numberToReturn = param.limit;
    var resultLen = emEngineSearch(query, query.length);
    var results;
    if (numberToReturn) {
      if (numberToReturn < 0 || numberToReturn > resultLen)
        numberToReturn = resultLen;
      results = getSearchResult(emEngineGetAt, {
        start: 0,
        count: numberToReturn
      });
    }
    return {
      length: resultLen,
      results: results
    };
  };

  procFunction = {};

  procFunction['im_search'] =
    search.bind(this, emEngine.search, emEngine.getCandidateAt);

  procFunction['im_get_candidates'] =
    getSearchResult.bind(this, emEngine.getCandidateAt);

  procFunction['im_search_predicts'] =
    search.bind(this, emEngine.getPredicts, emEngine.getPredictAt);

  procFunction['im_get_predicts'] =
    getSearchResult.bind(this, emEngine.getPredictAt);

  procFunction['im_flush_cache'] =
    emEngine.flushCache;

  procFunction['im_choose'] = function(param) {
    var candsNum = emEngine.choose(param.candId);
    if (candsNum == 1 && emEngine.getFixedLen() == emEngine.getSplStart()) {
      var convertedText = emEngine.getCandidateAt(0);
      emEngine.resetSearch();
      return convertedText;
    }
    return null;
  };

  procFunction['im_get_pending_symbols_info'] = function() {
    var fixedLen = emEngine.getFixedLen();
    var splStartLen = emEngine.getSplStart();
    var splStart = [];
    for (var i = 0; i <= splStartLen; i++) {
      splStart.push(emEngine.getSplStartAt(i));
    }
    return {
      fixedLen: fixedLen,
      splStart: splStart
    };
  };

  procFunction['im_get_user_dict_data'] = function() {
    if (!Module['FS'])
      return null;

    emEngine.flushCache();
    return Module['FS'].findObject('data/user_dict.data').contents;
  };
}

function post(id, returnValue) {
  postMessage({
    id: id,
    returnValue: returnValue
  });
}

function log(message) {
  post('message', message);
}
