'use strict';

(function(exports){
  function BaseCollection(props) {
    this.id = props.id || null;
    this.name = props.name;
  }

  function CategoryCollection(props) {
    BaseCollection.call(this, props);
    this.categoryId = props.categoryId;
    this.icons = props.icons;
  }

  CategoryCollection.prototype = {
    fromResponse: function cc_fromResponse(categoryIds, responseData) {
        function getIcon(iconId) {
          return responseData.icons[iconId];
        }

        var
        collections = [],
        categories = responseData.categories.filter(function _filter(cat) {
          return categoryIds.indexOf(cat.categoryId) > -1;
        });

        for (var i=0, l=categories.length; i < l; i++) {
          var
          cat = categories[i],
          collection = new CategoryCollection({
            name: cat.query,
            categoryId: cat.categoryId,
            icons: cat.appIds.map(getIcon)
          });

          collections.push(collection);
        }

        return collections;
      }

  }

  function QueryCollection(props) {
    BaseCollection.call(this, props);
    this.name = this.query = props.query;
  }

  exports.CategoryCollection = CategoryCollection;
  exports.QueryCollection = QueryCollection;

})(window);