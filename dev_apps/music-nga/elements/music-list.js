(function(exports) {

/**
 * Dependencies
 */

var component = window['gaia-component'];
var FastList = window.FastList;

/**
 * Mini Logger
 */

var debug = 0 ? (...args) => console.log('[MusicList]', ...args) : ()=>{};

exports.MusicList = component.register('music-list', {
  created: function() {
    this.setupShadowRoot();

    this.els = {
      fastList: this.shadowRoot.querySelector('.fast-list')
    };

    this.config = {
      container: this.els.fastList,
      _itemHeight: 60,
      _headerHeight: 32
    };
  },

  setup: function() {
    var config = new Configuration(this.config);
    this.list = new FastList(config);
  },

  configure: function(config) {
    Object.assign(this.config, config);
  },

  template: `
    <section class="fast-list"></section>

    <style>
      * { margin: 0; font: inherit; }
      a { color: inherit; text-decoration: none; }

      :host {
        display: block;
        height: 100%;
      }

      .fast-list {
        height: 100%;
        position: relative;
      }

      .fast-list ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .fast-list ul h2 {
        position: sticky;
        position: -webkit-sticky;
        top: 0px;
        height: 32px;
        z-index: 100;

        margin: 0;
        padding: 0 6px;
        box-sizing: border-box;
        border-bottom: solid 1px var(--border-color);
        font-size: 0.9em;
        line-height: 32px;

        background: var(--background-minus);
        color: var(--highlight-color);
      }

      .fast-list ul .background {
        position: absolute;
        z-index: 0;
        width: 100%;

        background: linear-gradient(
          to top,
          var(--border-color),
          var(--border-color) 1px,
          transparent 1px,
          transparent);
        background-position: 0 -60px;
        background-size: 100% 60px;
        background-repeat: repeat-y;
      }

      .fast-list li {
        -moz-user-select: none;
        z-index: 10;

        box-sizing: border-box;
        width: 100%;
        height: 60px;
        padding: 9px 16px;
        font-size: 18px;
        font-weight: normal;
        font-style: normal;
        list-style-type: none;
        color: var(--text-color);
      }

      .fast-list li > a {
        display: flex;
        width: 100%;
        height: 100%;
        align-items: center;
      }

      .fast-list li > a > div {
        width: 100%;
      }

      .fast-list li h3 {
        margin: 0;
        font-size: inherit;
        font-weight: 400;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .fast-list li p {
        font-size: 0.7em;
        line-height: 1.35em;
      }

      .fast-list li > img {
        width: 60px;
        float: right;
      }
    </style>`,

  attrs: {
    model: {
      get: function() { return this.config.model; },
      set: function(value) {
        this.config.model = value;
        this.setup();
      }
    }
  }
});

function Configuration(config) {
  Object.assign(this, config);
  this.container = config.container;
  this.sections = group(this.model, config.getSectionName);
  debug('config init', this);
}

function group(data, getSection) {
  var hash = {};

  data.forEach(item => {
    var section = getSection(item);
    if (!hash[section]) hash[section] = [];
    hash[section].push(item);
  });

  return hash;
}

Configuration.prototype = {
  sectionTemplate: '<section><h2> </h2><div class="background"></div></section>',
  itemTemplate: '<li><a><div><h3> </h3><p> </p></div></a></li>',

  populateItem: function(el, i) {
    debug('populate item');
    var data = this.getRecordAt(i);
    this.populate(el, data);
  },

  populateSection: function(el, section) {
    var title = el.firstChild;
    var height = this.fullSectionHeight(section);
    var background = title.nextSibling;

    background.style.height = height + 'px';
    title.firstChild.data = section;
  },

  getSections: function() {
    return Object.keys(this.sections);
  },

  sectionHeaderHeight: function() {
    return this._headerHeight;
  },

  fullSectionHeight: function(key) {
    return this.sections[key].length * this.itemHeight();
  },

  fullSectionLength: function(key) {
    return this.sections[key].length;
  },

  getRecordAt: function(index) {
    return this.model[index];
  },

  getSectionFor: function(index) {
    var item = this.getRecordAt(index);
    return this.getSectionName(item);
  },

  indexAtPosition: function(pos) {
    debug('index at position', pos);
    var headerHeight = this.sectionHeaderHeight();
    var itemHeight = this.itemHeight();
    var index = 0;
    var items;

    for (var key in this.sections) {
      items = this.sections[key];


      pos -= headerHeight;
      var sectionHeight = items.length * itemHeight;

      if (pos > sectionHeight) {
        pos -= sectionHeight;
        index += items.length;
        continue;
      }

      for (var i = 0; i < items.length; i++) {
        pos -= itemHeight;
        index++;

        if (pos <= 0 || index === this.fullLength() - 1) {
          return index;
        }
      }
    }
  },

  positionForIndex: function(index) {
    var headerHeight = this.sectionHeaderHeight();
    var itemHeight = this.itemHeight();
    var top = 0;
    var items;

    for (var key in this.sections) {
      items = this.sections[key];
      top += headerHeight;

      if (index < items.length) {
        top += index * itemHeight;
        return top;
      }

      index -= items.length;
      top += items.length * itemHeight;
    }
  },

  fullLength: function() {
    debug('get full length', this.model.length);
    return this.model.length;
  },

  itemHeight: function() {
    return this._itemHeight;
  },

  fullHeight: function() {
    var headerHeight = this.sectionHeaderHeight();
    var itemHeight = this.itemHeight();
    var height = 0;
    var items;

    for (var key in this.sections) {
      items = this.sections[key];
      height += headerHeight + items.length * itemHeight;
    }

    return height;
  },

  insertAtIndex: function(index, record, toSection) {
    var items;

    this._cachedLength = null;

    for (var key in this.sections) {
      items = this.sections[key];

      if (index < items.length || key === toSection) {
        return items.splice(index, 0, record);
      }

      index -= items.length;
    }
  },

  replaceAtIndex: function(index, record) {
    for (var key in this.sections) {
      var items = this.sections[key];

      if (index < items.length) {
        return items.splice(index, 1, record);
      }

      index -= items.length;
    }
  },

  removeAtIndex: function(index) {
    this._cachedLength = null;

    for (var key in this.sections) {
      var items = this.sections[key];

      if (index < items.length) {
        return items.splice(index, 1)[0];
      }
      index -= items.length;
    }
  }
};

// function getter(path) {
//   return object => {
//     getDeep(object, path.split('.'));
//   };
// }

// function getDeep(item, parts) {
//   var part = parts.shift();
//   console.log(item[part], part);
//   return parts.length ? getDeep(item[part], parts) : item[part];
// }

})(window);