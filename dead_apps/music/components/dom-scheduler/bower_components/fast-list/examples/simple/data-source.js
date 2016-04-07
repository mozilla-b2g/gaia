(function(exports) {
  var itemHeight = 88;

  var debug = 0 ? (...args) => console.log('[DataSource]', ...args) : ()=>{};

  exports.DataSource = function DataSource(items) {
    this.items = items;
    debug('initialized', items);
  };

  exports.DataSource.prototype = {
    populateItem: function(item, i) {
      debug('populate item', item);
      var title = item.firstChild;
      var body = title.nextSibling;
      var record = this.getRecordAt(i);

      title.firstChild.data = record.name;
      body.firstChild.data = record.metadata.artist;
    },

    getSections() {
      debug('get sections');
      return [''];
    },

    sectionHeaderHeight() {
      return 0;
    },

    fullSectionHeight() {
      var result = this.items.length * itemHeight;
      debug('full section height', result);
      return result;
    },

    fullSectionLength() {
      var result = this.items.length;
      debug('full section length', result);
      return result;
    },

    getSectionFor() {
      return '';
    },

    getRecordAt: function(index) {
      return this.items[index];
    },

    indexAtPosition: function(pos) {
      return Math.floor(pos / itemHeight);
    },

    positionForIndex: function(index) {
      return index * itemHeight;
    },

    fullLength: function() {
      return this.items.length;
    },

    itemHeight: function() {
      return itemHeight;
    },

    fullHeight: function() {
      this.items.length * itemHeight;
    },

    insertAtIndex: function(index, record, toSection) {
      return this.items.splice(index, 0, record);
    },

    replaceAtIndex: function(index, record) {
      return this.items.splice(index, 1)[0];
    }
  };
})(window);