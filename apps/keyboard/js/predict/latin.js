/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function (IMEController) {
  var _worker;
  var _dict;

  IMEController.suggestionEngines['latin'] = {
    init: function latin_init(glue) {
      var lang = glue.lang;
      var path = glue.path;

      // This needs a real fix.
      if (lang == "en")
        lang = "en_us";

      _worker = new Worker(path + 'latin-worker.js');
      _worker.onmessage = function(evt) {
        var data = evt.data;
        glue[data.cmd].apply(glue, data.args);
      }
      _worker.onerror = function(evt) {
        throw new Error(evt.message + ' (' + evt.filename + ':' + evt.lineno + ')');
      }

      var xhr = new XMLHttpRequest();
      xhr.open('GET', path + '../../dictionaries/' + lang + '.dict', true);
      xhr.responseType = "arraybuffer"; 
      xhr.onload = function(evt) {
        _worker.postMessage({ cmd: 'init', args: [lang, xhr.response] });
      }
      xhr.send();
    },
    click: function latin_click(keyCode, keyX, keyY) {
      _worker.postMessage({ cmd: 'key', args: [keyCode, keyX, keyY] });
    },
    select: function latin_select(textContent, data) {
      _worker.postMessage({ cmd: 'select', args: [textContent, data] });
    },
    setLayoutParams: function latin_setLayoutParams(params) {
      if (!params.keyArray)
        return; // keyArray not ready yet
      _worker.postMessage({ cmd: 'setLayoutParams', args: [params] });
    }
  };
})(IMEController);
