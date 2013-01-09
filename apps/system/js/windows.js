'use strict';

(function(){
  var default_config = {
    frameType: 'window',
    name: '',
    frame: null,
    manifest: null,
    origin: '',
    manifestURL: '',
    launchTime: 0
  };

  window.Window = function Window(configuration) {
    for (var key in default_config) {
      this[key] = configuration[key] ? configuration[key] : default_config[key];
    }
  }

  Window.prototype.render = function render() {

  }

  Window.prototype.view = function view() {

  }

  Window.prototype.init = function init() {

  }
}(this));
