'use strict';
/* global CollectionsDatabase */
/* global CollectionIcon */
/* global Bookmark */
/* global Divider */
/* global SearchDedupe */

(function(exports){

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
    // returns a promise resolved when the db trx is done
    save: function save() {
      return CollectionsDatabase.put({
        id: this.id,
        name: this.name,
        query: this.query,
        categoryId: this.categoryId,
        webicons: this.webicons,
        pinned: this.pinned,
        background: this.background
      });
    },

    pin: function pin(icon) {
      this.pinned.push(icon);
      this.save();
    },

    addToGrid: function(results, grid) {
      // Add a dedupeId to each result
      results.forEach(function eachResult(item) {
        item.dedupeId = item.url;
      });

      results = this.dedupe.reduce(results, 'fuzzy');
      results.forEach(function render(result) {
        var icon = new Bookmark(result);
        grid.add(icon);
      });
    },

    render: function render(grid) {
      this.dedupe.reset();
      grid.clear();

      this.addToGrid(this.pinned, grid);

      if (!this.webResults.length) {
        return;
      }

      grid.add(new Divider());
      this.addToGrid(this.webResults, grid);
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
  exports.QueryCollection = QueryCollection;

})(window);
