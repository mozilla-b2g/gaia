
'use strict';

var DEFAULT_PARAMS = {
    id: '0',
    totalBytes: 1800,
    currentBytes: 100,
    url: 'http://firefoxos.com/archivo.mp3',
    path: '//SDCARD/Downloads/archivo.mp3',
    state: 'downloading',
    contentType: 'audio/mpeg',
    startTime: new Date(),
    error: null
  };

function MockDownload(params) {
  params = params || {};

  this.id = params.id || '0';
  this.totalBytes = params.totalBytes || DEFAULT_PARAMS.totalBytes;
  this.currentBytes = params.currentBytes || DEFAULT_PARAMS.currentBytes;
  this.url = params.url || DEFAULT_PARAMS.url;
  this.path = params.path || DEFAULT_PARAMS.path;
  this.state = params.state || DEFAULT_PARAMS.state;
  this.contentType = params.contentType || DEFAULT_PARAMS.contentType;
  this.startTime = params.startTime || DEFAULT_PARAMS.startTime;
  this.error = params.error || DEFAULT_PARAMS.error;

  this.listeners = [];
}

MockDownload.prototype = {
  addEventListener: function(type, listener) {
    if(this.listeners.indexOf(listener) == -1) {
      this.listeners.push(listener);
    }
  },

  removeEventListener: function(type, listener) {
    var index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  },

  pause: function() {
    return {
      then: function(success, error) { setTimeout(success, 0); }
    };
  },
  resume: function() {
    return {
      then: function(success, error) { setTimeout(success, 0); }
    };
  }
};
