'use strict';

/* global KeyboardLayout */

(function(exports) {
  /**
   * KeyboardLayoutManager manages loading/unloading the layout definition
   * files.
   *
   * @class KeyboardLayoutManager
   */
  function KeyboardLayoutManager(app) {
    this._started = false;
    this.app = app;
  }

  /**
   * Path to layout definitions
   * @type {String}
   */
  KeyboardLayoutManager.prototype.LAYOUT_PATH = './layouts/';

  /**
   * Start the KeyboardLayoutManager instance.
   * @memberof KeyboardLayoutManager.prototype
   */
  KeyboardLayoutManager.prototype.start = function start() {
    if (this._started) {
      throw 'Instance should not be start()\'ed twice.';
    }

    this._started = true;
    this.loadedLayouts = {};
    this.rootPath = this.app.path ? this.app.path : '';
    this.xhrList = {};
  };

  /**
   * Stop the KeyboardLayoutManager instance.
   * @memberof KeyboardLayoutManager.prototype
   */
  KeyboardLayoutManager.prototype.stop = function stop() {
    if (!this._started) {
      throw 'Instance was never start()\'ed but stop() is called.';
    }
    this._started = false;
    this.loadedLayouts = null;

    for (var name in this.xhrList) {
      this.xhrList[name].abort();
      delete this.xhrList[name];
    }

    this.xhrList = null;
  };

  KeyboardLayoutManager.prototype.load = function load(name) {
    this.app.debug('load layout' + name);

    // Not to load the layout again if it is loaded
    if (name in this.loadedLayouts) {
      this.app.handleLayoutLoaded(name);
      return;
    }

    // The xhr has started, just ignore the new request
    if (name in this.xhrList) {
      return;
    }

    // If we have not already loaded the layout, load it now
    var layoutFile = this.LAYOUT_PATH  + name + '.json';

    var xhr = new XMLHttpRequest();
    xhr.addEventListener('error', this);
    xhr.addEventListener('load', this);

    // Add a property here for reverse lookup in handleEvent function
    xhr.layoutName = name;
    this.xhrList[name] = xhr;

    xhr.open('GET', layoutFile, true); // async
    xhr.responseType = 'json';
    xhr.send();
  };

  KeyboardLayoutManager.prototype.getLayout = function getLayout(layoutName) {
    return this.loadedLayouts[layoutName];
  };

  KeyboardLayoutManager.prototype.handleEvent = function handleEvent(evt) {
    var xhr = evt.currentTarget;

    switch(evt.type) {
      case 'load':
        if (!this._started) {
          return;
        }

        var name = xhr.layoutName;
        this.app.debug('layout loaded' + name);
        this.loadedLayouts[name] = new KeyboardLayout(xhr.response);
        delete this.xhrList[name];
        this.app.handleLayoutLoaded(name);
        break;

      case 'error':
        // If this happens, we have a misconfigured build and the
        // keyboard manifest does not match the layouts in js/layouts/
        console.error('Cannot load keyboard layout',
                      xhr.layoutName, xhr.statusText);
        delete this.xhrList[name];
        break;
    }
  };

  exports.KeyboardLayoutManager = KeyboardLayoutManager;
}(window));
