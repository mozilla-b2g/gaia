
'use strict';

var DEFAULT_PARAMS = {
    totalBytes: 1800,
    currentBytes: 100,
    url: 'http://firefoxos.com/archivo.mp3',
    path: '//SDCARD/Downloads/archivo.mp3',
    state: 'downloading',
    contentType: 'audio/mpeg',
    started: new Date()
  };

function MockDownload(params) {
  this.totalBytes = params.totalBytes || DEFAULT_PARAMS.totalBytes;
  this.currentBytes = params.currentBytes || DEFAULT_PARAMS.currentBytes;
  this.url = params.url || DEFAULT_PARAMS.url;
  this.path = params.path || DEFAULT_PARAMS.path;
  this.state = params.state || DEFAULT_PARAMS.state;
  this.contentType = params.contentType || DEFAULT_PARAMS.contentType;
  this.started = params.started || DEFAULT_PARAMS.started;
}

MockAttachment.prototype = {
  get totalBytes() {
    return this.totalBytes;
  },
  get currentBytes() {
    return this.currentBytes;
  },
  get url() {
    return this.url;
  },
  get path() {
    return this.path;
  },
  get state() {
    return this.state;
  },
  get contentType() {
    return this.contentType;
  },
  get started() {
    return this.started;
  },
  cancel: function() {},
  pause: function() {},
  resume: function() {}
};
