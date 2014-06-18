'use strict';
/* global eme */
/* global CollectionsDatabase */
/* global CollectionIcon */
/* global GaiaGrid */
/* global HomeIcons */
/* global SearchDedupe */
/* global GridIconRenderer */

(function(exports){

  // web result created from E.me API data
  function WebResult(data) {
    // use appUrl as the webresult identifier because:
    // 1. data.id is null for bing results
    // 2. using appUrl allows deduping vs bookmarks
    data.emeId = data.id;
    data.url = data.id = data.appUrl;

    data.renderer = GridIconRenderer.TYPE.CLIP;

    return {
      identifier: data.appUrl,
      type: 'webResult',
      data: data
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
    this.webicons = props.webicons || [];

    // A list of the web results for this collection view
    this.webResults = [];

    // an object containing data about the background image
    // {src: string, source: string, checksum: string}
    this.background = props.background || {};

    if (window.SearchDedupe) {
      this.dedupe = new SearchDedupe();
    }

    // for rendering pinned homescreen apps/bookmarks
    if (window.HomeIcons) {
      this.homeIcons = new HomeIcons();
      this.homeIcons.init();
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
    // get a fresh copy of editable properties from db
    // useful when a background task (like NativeInfo) updates the db while
    // a running process has a collection object reference
    refresh: function refresh() {
      return CollectionsDatabase.get(this.id).then(function create(fresh) {
        this.pinned = fresh.pinned;
      }.bind(this));
    },

    // returns a promise resolved when the db trx is done
    save: function save() {
      return CollectionsDatabase.put({
        id: this.id,
        name: this.name,
        query: this.query,
        categoryId: this.categoryId,
        cName: this.cName,
        webicons: this.webicons,
        pinned: this.pinned,
        background: this.background
      });
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

    addWebResults: function addWebResult(arrayOfData) {
      var results = arrayOfData.map(function each(data) {
        return new WebResult(data);
      });
      this.webResults = results;
    },

    isPinned: function isPinned(item) {
      return this.pinnedIdentifiers.indexOf(item.identifier) > -1;
    },

    isNotPinned: function isNotPinned(item) {
      return !this.isPinned(item);
    },

    get pinnedIdentifiers() {
      return this.pinned.map(function each(item) {
        return item.identifier;
      });
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

        var icon;
        if (item.type === 'homeIcon') {
          icon = this.homeIcons.get(item.identifier);
        } else if (item.type === 'webResult') {
          icon = new GaiaGrid.Bookmark(item.data);
        }

        if (icon) {
          grid.add(icon);
        }
      }, this);
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
      var icon = new CollectionIcon({
        iconSrcs: this.webicons,
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
  exports.PinnedHomeIcon = PinnedHomeIcon
  exports.QueryCollection = QueryCollection;

})(window);
