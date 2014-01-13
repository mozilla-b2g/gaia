'use strict';

var GridItemsFactory = {
  TYPE: {
    APP: 'app',
    BOOKMARK: 'bookmark',
    COLLECTION: 'collection'
  },
  create: function gif_create(params) {
    var item = Bookmark;
    if (params.type === GridItemsFactory.TYPE.COLLECTION) {
      item = Collection;
    }

    return new item(params);
  }
};

var GridItem = function GridItem(params) {
  this.type = GridItemsFactory.TYPE.APP;

  // Grid components are removable by default
  this.removable = true;

  this.iconable = 'iconable' in params ? params.iconable : true;

  this.id = params.id || '';
  this.url = this.origin = this.bookmarkURL = params.bookmarkURL;
  this.features = params.features || '';

  this.manifest = {
    name: params.name,
    default_locale: 'en-US'
  };

  if (params.icon) {
    this.manifest.icons = {
      60: params.icon
    };
  }

  if (params.apps) {
    this.manifest.apps = params.apps;
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
      useAsyncPanZoom: this.useAsyncPanZoom,
      features: this.features
    };
  }
};

var Collection = function Collection(params, cb) {
  GridItem.call(this, params);

  this.iconable = false;
  this.type = GridItemsFactory.TYPE.COLLECTION;
  this.hideFromGrid = !!params.hideFromGrid;
  this.providerId = params.provider_id || params.id;
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
  }
};
