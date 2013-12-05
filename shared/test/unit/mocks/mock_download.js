
'use strict';

var DEFAULT_PARAMS = {
    totalBytes: 1800,
    currentBytes: 100,
    url: 'http://firefoxos.com/archivo.mp3',
    path: '//SDCARD/Downloads/archivo.mp3',
    state: 'downloading',
    contentType: 'audio/mpeg',
    startTime: new Date(),
    id: '1'
  };

function MockDownload(params) {
  params = params || {};
  this.id = params.id || '1';
  this.totalBytes = params.totalBytes || DEFAULT_PARAMS.totalBytes;
  this.currentBytes = params.currentBytes || DEFAULT_PARAMS.currentBytes;
  this.url = params.url || DEFAULT_PARAMS.url;
  this.path = params.path || DEFAULT_PARAMS.path;
  this.state = params.state || DEFAULT_PARAMS.state;
  this.contentType = params.contentType || DEFAULT_PARAMS.contentType;
  this.startTime = params.startTime || DEFAULT_PARAMS.startTime;
  this.id = params.id || DEFAULT_PARAMS.id;
}

MockDownload.prototype = {
  pause: function() {},
  resume: function() {}
};
