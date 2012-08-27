/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function (IMEController) {
  var _path = null;
  var _language = null;
  var _worker = null;

  IMEController.suggestionEngines['latin'] = {
    init: function latin_init(glue) {
      // Remember the path, we will use this to load the dictionary.
      _path = glue.path;

      // Spin up the worker thread. The prediction engine runs in its own
      // work to isolate GC pause times and avoid blocking the event loop.
      _worker = new Worker(_path + 'latin-worker.js');
      _worker.onmessage = function(evt) {
        var data = evt.data;
        glue[data.cmd].apply(glue, data.args);
      }
      _worker.onerror = function(evt) {
        throw new Error(evt.message + ' (' + evt.filename + ':' + evt.lineno + ')');
      }

      // Set the prediction language. This will also initialize the prediction
      // engine and load the dictionary.
      this.setLanguage(glue.language);
    },
    click: function latin_click(keyCode, keyX, keyY) {
      if (!_worker)
        return;
      _worker.postMessage({ cmd: 'key', args: [keyCode, keyX, keyY] });
    },
    select: function latin_select(textContent, data) {
      if (!_worker)
        return;
      _worker.postMessage({ cmd: 'select', args: [textContent, data] });
    },
    setLayoutParams: function latin_setLayoutParams(params) {
      if (!_worker || !params.keyArray)
        return; // no worker or keyArray not ready yet
      _worker.postMessage({ cmd: 'setLayoutParams', args: [params] });
    },
    setLanguage: function latin_setLanguage(language) {
      if (language == _language)
        return;

      // Our dictionaries are named a bit differently.
      var dictname = language.replace('-', '_').toLowerCase();
      console.log('loading ' + dictname + ' dictionary');

      // Loading the dictionary from within the worker doesn't seem to work, so
      // do it here.
      var xhr = new XMLHttpRequest();
      xhr.open('GET', _path + '../../dictionaries/' + dictname + '.dict', true);
      xhr.responseType = 'arraybuffer';
      xhr.onload = function(evt) {
        _language = language;
        _worker.postMessage({ cmd: 'setLanguage', args: [language, xhr.response] });
      }
      xhr.send();
    }
  };
})(IMEController);
