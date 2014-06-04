'use strict';
/* global CollectionsDatabase */
/* global CollectionIcon */
/* global Bookmark */

(function(exports){

  function BaseCollection(props) {
    // cf. BaseCollection.save
    this.id = props.id || null;
    this.name = props.name || '';
    this.icon = props.icon || null;
    this.pinned = props.pinned || [];
    this.webicons = props.webicons || [];
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
    save: function save() {
      CollectionsDatabase.put({
        id: this.id,
        name: this.name,
        query: this.query,
        categoryId: this.categoryId,
        webicons: this.webicons,
        pinned: this.pinned
      });
    },

    pin: function pin(icon) {
      this.pinned.push(icon);
      this.save();
    },

    render: function render(grid) {
      this.pinned.forEach(function render(pinned) {
        var icon = new Bookmark(pinned);
        grid.add(icon);
      });

      grid.render();
    },

    renderIcon: function renderIcon() {
      var icon = new CollectionIcon({
        iconSrcs: this.webicons,
        bgSrc: null  // TODO this.bgURL ...
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
