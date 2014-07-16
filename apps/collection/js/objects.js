'use strict';
/* global eme */
/* global CollectionsDatabase */
/* global CollectionIcon */
/* global GaiaGrid */
/* global HomeIcons */
/* global SearchDedupe */
/* global GridIconRenderer */

(function(exports) {

  // web result created from E.me API data
  function WebResult(data, gridItemFeatures) {
    // use appUrl as the webresult identifier because:
    // 1. data.id is null for bing results
    // 2. using appUrl allows deduping vs bookmarks
    data.emeId = data.id;
    data.url = data.id = data.appUrl;

    data.renderer = GridIconRenderer.TYPE.CLIP;

    return {
      identifier: data.appUrl,
      type: 'webResult',
      data: data,
      features: gridItemFeatures
    };
  }

  // pinned GaiaGrid.MozApps or GaiaGrid.Bookmark
  // use same identifiers as in GaiaGrid
  function PinnedHomeIcon(identifier) {
    return {
      identifier: identifier,
      type: 'homeIcon'
    };
  }

  function BaseCollection(props) {
    // cf. BaseCollection.save
    this.id = props.id || null;
    this.name = props.name || '';
    this.icon = props.icon || null;
    this.pinned = props.pinned || [];

    // A list of the web results for this collection view
    this.webResults = [];

    // list of base64 icon data for webResults from E.me api
    // these icons are NOT ROUNDED
    this.webicons = props.webicons || [];

    // an object containing data about the background image
    // {src: string, source: string, checksum: string}
    this.background = props.background || {};

    // save copy of original properties so we can tell when to re-render the
    // collection icon
    this.originalProps = props;

    if (window.SearchDedupe) {
      this.dedupe = new SearchDedupe();
    }
  }

  BaseCollection.create = function create(data) {
    if (data.categoryId) {
      return new CategoryCollection(data);
    } else if (data.query) {
      return new QueryCollection(data);
    }
    return null;
  };

  BaseCollection.prototype = {

    get localizedName() {
      // l10n prefix taken from /shared/locales/collection_categories
      var l10nId = 'collection-categoryId-' + this.categoryId;
      return navigator.mozL10n.get(l10nId) || this.name;
    },

    // get a fresh copy of editable properties from db
    // useful when a background task (like NativeInfo) updates the db while
    // a running process has a collection object reference
    refresh: function refresh() {
      return CollectionsDatabase.get(this.id).then(function create(fresh) {
        this.pinned = fresh.pinned || [];
      }.bind(this));
    },

    /**
     * Updates the CollectionsDatabase record with the current data.
     * If we need to re-render an icon, we do so before saving.
     * Returns a promise resolved when the db trx is done.
     * @param {String} method Method to use for saving. Either add or put.
     */
    save: function save(method) {
      if (this.iconDirty) {
        return this.renderIcon().then(this.write.bind(this, method));
      } else {
        return this.write(method);
      }
    },

    /**
     * Writes the current collection to the CollectionsDatabase datastore.
     * @param {String} method Method to use for saving. Either add or put.
     */
    write: function write(method) {
      method = method || 'put';
      var toSave = {
        id: this.id,
        name: this.name,
        query: this.query,
        categoryId: this.categoryId,
        cName: this.cName,
        webicons: this.webicons,
        pinned: this.pinned,
        background: this.background,
        icon: this.icon
      };
      return CollectionsDatabase[method](toSave).then(() => {
        this.id = toSave.id;
      });
    },

    /**
     * Lets us know if we need to re-render the collection. The icon is
     * re-rendered under these circumstances:
     * - The first three apps change inside the collection.
     * - The background image changes.
     */
    get iconDirty() {
      var numAppIcons = CollectionIcon.numAppIcons;
      var before = this.originalProps;
      try {
        // background
        if (before.background.src !== this.background.src) {
          this.originalProps.background = this.background;
          return true;
        }

        // apps
        var first = this.pinned.concat(this.webResults).slice(0, numAppIcons);
        var oldFirst =
          before.pinned.concat(before.webResults).slice(0, numAppIcons);

        for (var i = 0; i < numAppIcons; i++) {
          if (first[i].identifier !== oldFirst[i].identifier) {
            before.pinned = this.pinned;
            return true;
          }
        }

        if (first.length !== before.length) {
          before.pinned = this.pinned;
          return true;
        }

      } catch (e) {}
      return false;
    },

    /*
      pin 1 or more objects to the collection
      use pin(item) or pin(items) where item is an object with:
      (string) identifier: manifestURL/bookmarkURL/appUrl
      (string) type: homeIcon or webResult
      (object) bookarkDetail: (for web results only)
     */
    pin: function pin() {
      var arg = arguments[0];
      var items = Array.isArray(arg) ? arg : [arg];

      var newItems = items.filter(this.isNotPinned.bind(this));

      if (newItems.length) {
        this.pinned = this.pinned.concat(newItems);
        this.save();
        eme.log(newItems.length, 'new pinned to', this.name);
      }
    },

    pinHomeIcons: function pinHomeIcons(identifiers) {
      var items = identifiers.map(function each(identifier) {
        return new PinnedHomeIcon(identifier);
      });
      this.pin(items);
    },

    pinWebResult: function pinWebResult(data) {
      this.pin(new WebResult(data));
    },

    unpin: function unpin(identifier) {
      var idx = this.pinnedIdentifiers.indexOf(identifier);
      if (idx !== -1) {
        this.pinned.splice(idx, 1);
        return this.save()
               .then(() => eme.log('removed pinned item', identifier));
      }
    },

    addWebResults: function addWebResult(arrayOfData) {
      var results = arrayOfData.map(function each(data) {
        return new WebResult(data, {
          isDraggable: false,
          isRemovable: false
        });
      });
      this.webResults = results;

      this.webicons = arrayOfData.slice(0, CollectionIcon.numAppIcons)
        .map(app => app.icon);
    },

    isPinned: function isPinned(item) {
      return this.pinnedIdentifiers.indexOf(item.identifier) > -1;
    },

    isNotPinned: function isNotPinned(item) {
      return !this.isPinned(item);
    },

    setPinned: function setPinned(identifiers) {
      // reflect the new sorting on this.pinned
      this.pinned = identifiers
      // array of all grid items, cut down to pinned only
      .slice(0, this.pinned.length)
        .map(function(identifier) {
          // find index of item in this.pinned
          var idx = this.pinnedIdentifiers.indexOf(identifier);
          // return the item
          return this.pinned[idx];
        }.bind(this));
      this.save();
    },

    get pinnedIdentifiers() {
      return this.pinned.map(function each(item) {
        return item.identifier;
      });
    },

    removeBookmark: function removeBookmark(identifier) {
      window.dispatchEvent(
        new CustomEvent('collection-remove-webresult', {
          detail: {
            identifier: identifier
          }
        })
      );
    },

    /**
     * Turns a stored result into a GaiaGrid grid item.
     */
    toGridObject: function(item) {
      var icon;
      if (item.type === 'homeIcon') {
        if (!HomeIcons.ready) {
          eme.warn('HomeIcons not ready, pinned apps may not render properly');
        }

        icon = HomeIcons.get(item.identifier);
      } else if (item.type === 'webResult') {
        item.features = item.features || {};
        item.features.isEditable = false;
        item.features.search = true;
        icon = new GaiaGrid.Bookmark(item.data, item.features);

        // override remove method (original sends activity)
        if (icon.isRemovable) {
          icon.remove = () => this.removeBookmark(item.identifier);
        }
      }

      return icon;
    },

    addToGrid: function addToGrid(items, grid) {
      // Add a dedupeId to each result
      items.forEach(function eachResult(item) {
        item.dedupeId = item.identifier;
      });

      items = this.dedupe.reduce(items, 'fuzzy');
      items.forEach(function render(item) {
        if (!item || !item.identifier) {
          return;
        }

        var icon = this.toGridObject(item);
        if (icon) {
          grid.add(icon);
        }
      }, this);
    },

    addItemToGrid: function addItemToGrid(item, grid, position) {
      this.pinned.splice(position, 1, new PinnedHomeIcon(item.identifier));

      grid.add(this.toGridObject(item), position);

      // Add a divider if it's our first pinned result.
      if (this.pinned.length === 1) {
        grid.add(new GaiaGrid.Divider(), 1);
      }

      grid.render();
      this.renderIcon();
    },

    renderWebResults: function render(grid) {
      if (!this.webResults.length) {
        return;
      }

      grid.add(new GaiaGrid.Divider());
      this.addToGrid(this.webResults, grid);

      grid.render({
        from: this.pinned.length
      });
    },

    render: function render(grid) {
      this.dedupe.reset();
      grid.clear();

      this.addToGrid(this.pinned, grid);

      if (this.webResults.length) {
        grid.add(new GaiaGrid.Divider());
        this.addToGrid(this.webResults, grid);
      }

      grid.render();
    },

    renderIcon: function renderIcon() {

      // Build the small icons from pinned, then webicons
      var numAppIcons = CollectionIcon.numAppIcons;
      var iconSrcs = this.pinned.slice(0, numAppIcons)
                         .map((item) => this.toGridObject(item).icon);

      if (iconSrcs.length < numAppIcons) {
        var moreIcons =
          this.webicons
          // bug 1028674: deupde
          .filter((webicon) => iconSrcs.indexOf(webicon) === -1)
          .slice(0, numAppIcons - iconSrcs.length);

        iconSrcs = iconSrcs.concat(moreIcons);
      }

      var icon = new CollectionIcon({
        iconSrcs: iconSrcs,
        bgSrc: this.background ? this.background.src : null
      });

      // return a promise
      return icon.render().then(function success(canvas) {
        this.icon = canvas.toDataURL();
        return this.icon;
      }.bind(this));
    }
  };



  function CategoryCollection(props) {
    BaseCollection.call(this, props);
    this.categoryId = props.categoryId;
    // 1. cNames are the only collection identifier we can use for NativeInfo
    // 2. back to the future!
    // in vertical-home-next (bug 1024336) we will only support canonicalName
    // save it to make the future migration easier
    this.cName = props.cName;
  }

  CategoryCollection.prototype = {
    __proto__: BaseCollection.prototype
  };

  CategoryCollection.fromResponse =
    function cc_fromResponse(categoryIds, responseData) {

      function getIcon(iconId) {
        return responseData.icons[iconId];
      }

      var collections = [];
      var categories = responseData.categories.filter(function _filter(cat) {
        return categoryIds.indexOf(cat.categoryId) > -1;
      });

      for (var i = 0, l = categories.length; i < l; i++) {
        var cat = categories[i];
        var collection = new CategoryCollection({
          name: cat.query,
          categoryId: cat.categoryId,
          cName: cat.canonicalName,
          webicons: cat.appIds.map(getIcon)
        });

        collections.push(collection);
      }

      return collections;
  };


  function QueryCollection(props) {
    BaseCollection.call(this, props);
    this.name = this.query = props.query;
  }

  QueryCollection.prototype = {
    __proto__: BaseCollection.prototype
  };

  exports.BaseCollection = BaseCollection;
  exports.CategoryCollection = CategoryCollection;
  exports.PinnedHomeIcon = PinnedHomeIcon;
  exports.QueryCollection = QueryCollection;
  exports.WebResult = WebResult;

})(window);
