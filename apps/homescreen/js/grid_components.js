'use strict';

var GridItemsFactory = {
  TYPE: {
    APP: 'app',
    BOOKMARK: 'bookmark',
    COLLECTION: 'collection'
  },
  create: function gif_create(params, cb) {
    var item = Bookmark;
    if (params.type === GridItemsFactory.TYPE.COLLECTION) {
      item = Collection;
    }

    return new item(params, cb);
  }
};

var GridItemManifests = {};

var GridItem = function GridItem(params) {
  this.type = GridItemsFactory.TYPE.APP;

  // Grid components are removable by default
  this.removable = true;

  this.iconable = 'iconable' in params ? params.iconable : true;

  this.id = params.id || '';
  this.url = this.origin = this.bookmarkURL = params.bookmarkURL;

  this.manifest = {
    name: params.name,
    default_locale: 'en-US'
  };

  if (params.icon) {
    this.manifest.icons = {
      60: params.icon
    };
  }

  this.useAsyncPanZoom = 'useAsyncPanZoom' in params && params.useAsyncPanZoom;
};

GridItem.prototype = {
  launch: function gc_launch() {
    // This method should be implemented by extensions
  },

  uninstall: function gc_uninstall() {
    GridManager.uninstall(this);
  },

  getFeatures: function gc_getFeatures() {
    return {
      id: this.id,
      name: this.manifest.name,
      icon: this.manifest.icons && this.manifest.icons['60'],
      remote: true,
      useAsyncPanZoom: this.useAsyncPanZoom
    };
  }
};

var Collection = function Collection(params, cb) {
  GridItem.call(this, params);

  this.iconable = false;
  this.type = GridItemsFactory.TYPE.COLLECTION;
  this.isEmpty = params.isEmpty; // only a collection can be empty
  this.hideFromGrid = !!params.hideFromGrid;
  this.providerId = params.provider_id || params.id;

  cb = cb || function() {};
  this.processManifest(cb);
};

Collection.prototype = {
  __proto__: GridItem.prototype,

  launch: function sc_launch() {
    var features = this.getFeatures();
    // Enriching features...
    features.id = this.id;

    window.dispatchEvent(new CustomEvent('collectionlaunch', {
      'detail': features
    }));
  },

  processManifest: function sc_processManifest(cb) {
    var manifest = GridItemManifests[this.url];
    if (manifest) {
      this.setManifest(manifest);
      cb(this);
      return;
    }

    var xhr = new XMLHttpRequest();
    xhr.overrideMimeType('application/json');
    xhr.open('GET', this.url, true);
    xhr.send(null);

    var self = this;
    xhr.onload = function _xhrOnLoad(evt) {
      try {
        manifest = GridItemManifests[self.url] = JSON.parse(xhr.responseText);
        self.setManifest(manifest);
        cb(self);
      } catch (e) {
        console.error('Error parsing the manifest ' + self.url, e.message);
        cb(self);
      }
    };

    xhr.onerror = function _xhrOnLoad(evt) {
      console.error('Error getting the manifest ' + self.url, evt.type);
      cb(self);
    };
  },

  setManifest: function sc_setManifest(manifest) {
    // Icons provided by caller are preferential
    if (this.manifest.icons) {
      manifest.icons = this.manifest.icons;
    }
    this.manifest = manifest;
  }
};
