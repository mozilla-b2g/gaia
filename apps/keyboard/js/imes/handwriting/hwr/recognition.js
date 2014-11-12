'use strict';

const MAX_STROKE_NUM = 1000;

self.onmessage = function(e) {
  var data = e.data;

  if (data.id == 'setLang') {
    var ret = Recognition.setLang(data.param);
    post('setLang', ret);
  }
  if (data.id == 'recognize') {
    var words = Recognition.recognize(JSON.parse(data.param));
    post('recognize', JSON.stringify(words));
  }
};

var Recognition = {
  _inited: false,

  setLang: function(lang) {
    if (!this._lang) {
      this._lang = lang;
      return this._init(lang);
    }
    if (this._lang != lang) {
      this._lang = lang;
      this._uinit();
      return this._init(lang);
    }
    return true;
  },

  recognize: function(points) {
    if (!this._inited) {
      return [];
    }

    var strokes = points.slice(0, 2 * MAX_STROKE_NUM);
    // Append [-1, -1] to strokes.
    strokes.push.apply(strokes, [-1, -1]);
    this._strokeBuffer.set(strokes);
    return this._CharacterRecognize(this._strokeBuffer.byteOffset);
  },

  _init: function(lang) {
    this._inited = false;
    var model = '';

    if (lang == 'zh-Hans') {
      model = 'zh_Hans.model';
    }
    if (lang == 'zh-Hant') {
      model = 'zh_Hant.model';
    }

    if (!Module.ccall('InitRecog',
                      'number',
                      ['string', 'number', 'number'],
                      [model, 140, 140])) {
      return false;
    }

    this._CharacterRecognize =
      Module.cwrap('CharacterRecognize', 'string', ['number']);

    var buf = Module._malloc((MAX_STROKE_NUM + 1) * 4);
    this._strokeBuffer =
      new Int16Array(Module.HEAPU8.buffer, buf, (MAX_STROKE_NUM + 1) * 2);

    this._inited = true;
    return true;
  },

  _uinit: function() {
    Module._free(this._strokeBuffer.byteOffset);
    Module.ccall('ExitRecog', '', [], []);
  },

  _strokeBuffer: null,
  _CharacterRecognize: null,
  _lang: ''
};

var Module = {
  filePackagePrefixURL: './',
  canvas: {},
  stdout: null,
  _main: function() {
    post('init', true);
  }
};

function post(id, value) {
  postMessage({
    id: id,
    value: value
  });
}
