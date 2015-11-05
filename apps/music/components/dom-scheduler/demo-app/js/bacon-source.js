(function(exports) {
  var listSize = 1042;
  var sectionCount = 25;

  var headerHeight = 32;
  var itemHeight = 88;

  function makeContent(prefix, name) {
    return {
      title: prefix + ' Bacon ipsum dolor ' +
             Date.now().toString().slice(7, -1),
      body: 'Turkey pig boudin ' + name.toLowerCase() +
            ' de mignon drums and all ' + prefix + '.'
    }
  }

  exports.BaconSource = function BaconSource() {
    this.sections = [];
    this.contentMap = new Map();
    this._cachedLength = null;

    for (var i = 0; i < sectionCount; i++) {
      this.sections.push('Section ' + i);
    }

    this.sections.forEach(function(name) {
      var content = [];
      for (var i = 0; i < (Math.random() * listSize); i++) {
        content.push(makeContent(i, name));
      }
      this.contentMap.set(name, content);
    }, this);
  };

  exports.BaconSource.prototype = {
    populateItem: function(item, i) {
      // Simulates the data source not being ready to populate
      /*if (parseInt(Date.now() / 10) % 8 === 0) {*/
        /*return new Promise(function(resolve, reject) {*/
          /*setTimeout(resolve, Math.random() * 1000);*/
        /*});*/
      /*}*/

      var title = item.firstChild;
      var body = title.nextSibling;
      var record = this.getRecordAt(i);

      title.firstChild.data = record.title;
      body.firstChild.data = record.body;
    },

    getSections: function() {
      return this.contentMap.keys();
    },

    sectionHeaderHeight: function() {
      return headerHeight;
    },

    fullSectionHeight: function(key) {
      return this.contentMap.get(key).length * itemHeight;
    },

    fullSectionLength: function(key) {
      return this.contentMap(key).length;
    },

    getRecordAt: function(index) {
      for (var section of this.contentMap.values()) {
        if (index < section.length) {
          return section[index];
        }
        index -= section.length;
      }
    },

    getSectionFor: function(index) {
      for (var entry of this.contentMap.entries()) {
        if (index < entry[1].length) {
          return entry[0];
        }
        index -= entry[1].length;
      }
    },

    indexAtPosition: function(pos) {
      var index = 0;
      for (var section of this.contentMap.values()) {
        pos -= headerHeight;
        var sectionHeight = section.length * itemHeight;
        if (pos > sectionHeight) {
          pos -= sectionHeight;
          index += section.length;
          continue;
        }
        for (var item of section) {
          pos -= itemHeight;
          index++;
          if (pos <= 0 || index === this.fullLength() - 1) {
            return index;
          }
        }
      }
    },

    positionForIndex: function(index) {
      var top = 0;
      for (var section of this.contentMap.values()) {
        top += headerHeight;
        if (index < section.length) {
          top += index * itemHeight;
          return top;
        }
        index -= section.length;
        top += section.length * itemHeight;
      }
    },

    fullLength: function() {
      if (this._cachedLength) {
        return this._cachedLength;
      }

      var length = 0;
      for (var section of this.contentMap.values()) {
        length += section.length;
      }
      this._cachedLength = length;
      return length;
    },

    itemHeight: function() {
      return itemHeight;
    },

    fullHeight: function() {
      var height = 0;
      for (var section of this.contentMap.values()) {
        height += headerHeight + section.length * itemHeight;
      }
      return height;
    },

    insertAtIndex: function(index, record, toSection) {
      this._cachedLength = null;
      for (var entry of this.contentMap.entries()) {
        if (index < entry[1].length || entry[0] === toSection) {
          return entry[1].splice(index, 0, record);
        }
        index -= entry[1].length;
      }
    },

    replaceAtIndex: function(index, record) {
      for (var section of this.contentMap.values()) {
        if (index < section.length) {
          return section.splice(index, 1, record);
        }
        index -= section.length;
      }
    },

    removeAtIndex: function(index) {
      this._cachedLength = null;

      for (var section of this.contentMap.values()) {
        if (index < section.length) {
          return section.splice(index, 1)[0];
        }
        index -= section.length;
      }
    }
  };
})(window);

