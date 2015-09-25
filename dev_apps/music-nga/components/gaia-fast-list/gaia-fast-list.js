;(function(define){define(function(require,exports,module){

/**
 * Dependencies
 */

var component = require('gaia-component');
var FastList = require('fast-list');
var scheduler = FastList.scheduler;
var poplar = require('poplar');
require('gaia-sub-header');

/**
 * Mini Logger
 */
var debug = 0 ? (...args) => console.log('[GaiaFastList]', ...args) : () => {};

/**
 * Used to hide private poperties behind.
 * @type {Symbol}
 */
var internal = Symbol();

/**
 * Public prototype.
 * @type {Object}
 */
var GaiaFastListProto = {
  extensible: false,

  created() {
    debug('create');
    this.setupShadowRoot();
    this.top = this.getAttribute('top');
    this.bottom = this.getAttribute('bottom');
    this.caching = this.getAttribute('caching');
    this.offset = this.getAttribute('offset');
    this[internal] = new Internal(this);
    debug('created');
  },

  /**
   * Used to define configuration passed
   * to internal FastList instantiation.
   *
   * NOTE: Must be called before `model`
   * if defined.
   *
   * @param  {Object} props
   */
  configure(props) {
    debug('configure');
    this[internal].configure(props);
  },

  /**
   * Should be called by the user when
   * they have finished incrementally
   * updating there model.
   *
   * This acts as an internal hook used
   * for updating caches.
   *
   * This only really concerns users
   * who are using caching and fetching
   * their model in chunks.
   *
   * @public
   */
  complete() {
    if (!this.caching) return;
    debug('complete');
    this[internal].cachedHeight = null;
    this[internal].updateCachedHeight();
  },

  /**
   * Clear cached height and html.
   *
   * @public
   */
  clearCache() {
    debug('clear cache');
    this[internal].clearCache();
  },

  /**
   * Public attributes/properties configuration
   * used by gaia-component.js.
   *
   * @type {Object}
   */
  attrs: {
    model: {
      get() { return this[internal].model; },
      set(value) { this[internal].setModel(value); }
    },

    top: {
      get() { return this._top; },
      set(value) {
        debug('set top', value);
        if (value == null) return;
        value = Number(value);
        if (value === this._top) return;
        this.setAttribute('top', value);
        this._top = value;
      }
    },

    bottom: {
      get() { return this._bottom; },
      set(value) {
        debug('set bottom', value);
        if (value == null) return;
        value = Number(value);
        if (value === this._bottom) return;
        this.setAttribute('bottom', value);
        this._bottom = value;
      }
    },

    caching: {
      get() { return this._caching; },
      set(value) {
        value = value || value === '';
        if (value === this._caching) return;
        if (value) this.setAttribute('caching', '');
        else this.removeAttribute('caching');
        this._caching = value;
      }
    },

    offset: {
      get() { return this._offset || 0; },
      set(value) {
        if (value == this._offset) return;
        if (value) this.setAttribute('offset', value);
        else this.removeAttribute('offset');
        this._offset = Number(value);
      }
    },

    scrollTop: {
      get() { return this[internal].fastList.scrollTop; },
      set(value) {
        if (this[internal].fastList) this[internal].container.scrollTop = value;
        else this[internal].initialScrollTop = value;
      }
    },

    minScrollHeight: {
      get() { return this[internal].list.style.minHeight; },
      set(value) { this[internal].list.style.minHeight = value; }
    }
  },

  template: `
    <section class="fast-list">
      <ul><content></content></ul>
    </section>

    <style>
      * { margin: 0; font: inherit; }

      :host {
        display: block;
        height: 100%;
        overflow: hidden;
      }

      .fast-list {
        position: absolute;
        left: 0;
        top: 0;

        box-sizing: border-box;
        height: 100%;
        width: 100%;
        padding: 0 17px;
        overflow: hidden !important;
      }

      .fast-list.layerize {
        overflow-y: scroll !important;
      }

      .fast-list.empty {
        background: repeating-linear-gradient(
          0deg,
          var(--background) 0px,
          var(--background) 59px,
          var(--border-color) 60px,
          var(--border-color) 60px);
        background-position: 0 1px;
      }

      .fast-list ul {
        position: relative;
        list-style: none;
        padding: 0;
        margin: 0;
      }

      .fast-list.empty:before {
        content: ''
        position: sticky;
        top: 0px;
        height: 40px;
        z-index: 100;

        display: block;

        background: var(--background-plus);
        color: var(--title-color);
      }

      ::content .gfl-section {
        position: relative;
        padding-top: 20px;
        box-sizing: border-box;
      }

      ::content .gfl-header {
        position: sticky;
        top: 0px;
        z-index: 100;

        margin: 0 !important;
      }

      ::content .background {
        position: absolute;
        z-index: 0;
        width: 100%;
      }

      ::content .gfl-item {
        z-index: 10;

        box-sizing: border-box;
        display: flex;
        width: 100%;
        height: 60px;
        padding: 9px 0;
        align-items: center;

        list-style-type: none;
        color: var(--text-color);
        -moz-user-select: none;
        text-decoration: none;
        will-change: initial !important;
      }

      :host(.layerize) ::content .gfl-item {
        will-change: transform !important;
      }

      ::content .gfl-item .text {
        flex: 1;
        min-width: 0;
      }

      ::content .gfl-item .image {
        width: 60px;
        height: 60px;
        background: var(--border-color);
        -moz-margin-start: 17px;
      }

      ::content .gfl-item .image.round {
        width: 44px;
        height: 44px;
        border-radius: 50%;
        overflow: hidden;
      }

      ::content .gfl-item .image > img {
        width: 100%;
        height: 100%;
      }

      ::content h3 {
        margin: 0;
        overflow: hidden;

        font-size: 20px;
        font-weight: 400;
        white-space: nowrap;
        text-overflow: ellipsis;
        color: var(--text-color);
        background: var(--background);
      }

      ::content p {
        margin: 0;
        font-size: 15px;
        line-height: 1.35em;
        color: var(--text-color-minus);
        background: var(--background);
      }
    </style>`,

  FastList: FastList // test hook
};

/**
 * Private internals.
 * @param {GaiaFastList} el
 */
function Internal(el) {
  this.el = el;
  this.items = this.injectItemsFromCache();
  this.container = el.shadowRoot.querySelector('.fast-list');
  this.list = el.shadowRoot.querySelector('ul');
  this.itemContainer = el;
  this.configureTemplates();
  this.setEmpty(!this.cacheRendered);
  debug('internal initialized');
}

Internal.prototype = {
  headerHeight: 40,
  itemHeight: 60,

  /**
   * Setting the model for the first
   * time creates a new FastList. Setting
   * it subsequent times rerenders
   * the FastList with the new data.
   *
   * @param {Array} model
   * @private
   */
  setModel(model) {
    debug('set model');
    if (!model) return;
    this.model = model;
    this.sections = this.sectionize(model);
    if (!this.fastList) this.createList();
    else this.fastList.reloadData();
    this.setEmpty(false);
  },

  /**
   * Toggle some basic placeholder styling
   * when we don't have any items to render.
   *
   * @param {Boolean} value
   */
  setEmpty(value) {
    this.container.classList.toggle('empty', value);
  },

  /**
   * Sorts items into sections using
   * the user provided getSectionName()
   *
   * @param  {Array} items
   * @return {Object}
   */
  sectionize(items) {
    debug('sectionize');
    var sectioned = !!this.getSectionName;
    var hash = {};

    for (var i = 0, l = items.length; i < l; i++) {
      var item = items[i];
      var section = sectioned && this.getSectionName(item);

      // When a section is not defined, flag
      // first list items and skip logic
      if (!section) {
        if (i === 0) item.gfl_isFirst = true;
        else if (item.gfl_isFirst) delete item.gfl_isFirst;
        continue;
      }

      // When there is no section yet
      // we can assume that this item
      // is the first item in the section.
      if (!hash[section]) {
        hash[section] = [];
        item.gfl_isFirst = true;

      // Make sure that any previously
      // assigned flags are removed as
      // order of items can be changed.
      } else if (item.gfl_isFirst) {
        delete item.gfl_isFirst;
      }

      hash[section].push(item);
    }

    return sectioned && hash;
  },

  /**
   * Creates the FastList and caches
   * the rendered content.
   *
   * Layerizing is the process of turning
   * each list-item into its own layer.
   * It's expensive so we defer it till
   * after the first-paint.
   *
   * @private
   */
  createList() {
    debug('create list');
    this.fastList = new this.el.FastList(this);
    this.fastList.rendered.then(() => {
      setTimeout(() => this.layerize(), 360);
      this.updateCachedHtml();
    });
  },

  /**
   * Makes the list scrollable and creates
   * a layer out of each list-item.
   *
   * @private
   */
  layerize() {
    this.el.classList.add('layerize');
    this.container.classList.add('layerize');
  },

  configure(props) {
    Object.assign(this, props);
  },

  /**
   * Defines the templates to be used
   * for the sections and items.
   *
   * Users can provide templates by
   * placing <template> in the root
   * of their <gaia-fast-list>
   *
   * @private
   */
  configureTemplates() {
    var templateHeader = this.el.querySelector('template[header]');
    var templateItem = this.el.querySelector('template[item]');
    var noTemplates = !templateItem && !templateHeader;

    // If no exact templates found, use unlabeled <template> for item
    if (noTemplates) templateItem = this.el.querySelector('template');

    if (templateHeader) {
      this.templateHeader = templateHeader.innerHTML;
      templateHeader.remove();
    }

    if (templateItem) {
      this.templateItem = templateItem.innerHTML;
      templateItem.remove();
    }
  },

  /**
   * Called by FastList when it needs
   * to create a list-item element.
   *
   * @return {HTMLElement}
   */
  createItem() {
    debug('create item');
    this.parsedItem = this.parsedItem || poplar.parse(this.templateItem);
    var el = poplar.create(this.parsedItem.cloneNode(true));
    el.classList.add('gfl-item');
    return el;
  },

  /**
   * Called by FastList when it needs
   * to create a section element.
   *
   * @return {HTMLElement}
   */
  createSection() {
    this.parsedSection = this.parsedSection
      || poplar.parse(this.templateHeader);

    var header = poplar.create(this.parsedSection.cloneNode(true));

    var section = document.createElement('section');
    var background = document.createElement('div');

    background.classList.add('background');
    header.classList.add('gfl-header');
    section.appendChild(header);
    section.appendChild(background);
    section.classList.add('gfl-section');

    return section;
  },

  /**
   * Populates a list-item with data.
   *
   * If items were inflated from the HTML cache
   * they won't yet be poplar elements; in
   * which case we have to replace them
   * before we can populate them with data.
   *
   * @param  {HTMLElement} el
   * @param  {Number} i
   */
  populateItem(el, i) {
    var record = this.getRecordAt(i);
    var successful = poplar.populate(el, record);

    if (!successful) {
      debug('not a poplar element');
      var replacement = this.fastList.createItem();
      this.fastList.replaceChild(replacement, el);
      return this.populateItem(replacement, i);
    }

    el.style.borderTop = !record.gfl_isFirst
      ? 'solid 1px var(--border-color, #e7e7e7)'
      : '0';
  },

  /**
   * Called by FastList when it needs
   * to populate a section with content.
   *
   * @param  {HTMLElement} el
   * @param  {String} section
   */
  populateSection(el, section) {
    var title = el.firstChild;
    var background = title.nextSibling;
    var height = this.getFullSectionHeight(section);

    poplar.populate(title, { section: section });
    background.style.height = height + 'px';
  },

  /**
   * Called by FastList when it needs to
   * know the height of the list viewport.
   *
   * If the user has provided `top` and `bottom`
   * attributes we can calculate this value
   * for free, else we must force a reflow
   * by using `clientHeight`.
   *
   * @return {Number}
   */
  getViewportHeight() {
    debug('get viewport height');
    var bottom = this.el.bottom;
    var top = this.el.top;

    return (top != null && bottom != null)
      ? window.innerHeight - top - bottom
      : this.el.clientHeight;
  },

  getSections() {
    return Object.keys(this.sections || {});
  },

  hasSections() {
    return !!this.getSections().length;
  },

  getSectionHeaderHeight() {
    return this.hasSections() ? this.headerHeight : 0;
  },

  getFullSectionHeight(key) {
    return this.sections[key].length * this.getItemHeight();
  },

  getFullSectionLength(key) {
    return this.sections[key].length;
  },

  getRecordAt(index) {
    return this.model[index];
  },

  // overwrite to create sections
  // IDEA: We could accept an Object
  // as a model and use the keys as
  // section names. This would probably
  // require the user do some additional
  // formatting before setting the model.
  getSectionName: undefined,

  getSectionFor(index) {
    var item = this.getRecordAt(index);
    return this.getSectionName && this.getSectionName(item);
  },

  eachSection(fn) {
    var sections = this.getSections();
    var result;

    if (sections.length) {
      for (var key in this.sections) {
        result = fn(key, this.sections[key]);
        if (result !== undefined) { return result; }
      }
    } else {
      return fn(null, this.model);
    }
  },

  getIndexAtPosition(pos) {
    // debug('get index at position', pos);
    var sections = this.sections || [this.model];
    var headerHeight = this.getSectionHeaderHeight();
    var itemHeight = this.getItemHeight();
    var fullLength = this.getFullLength();
    var index = 0;

    pos += this.el.offset;

    for (var name in sections) {
      var items = sections[name];
      var sectionHeight = items.length * itemHeight;

      pos -= headerHeight;

      // If not in this section, jump to next
      if (pos > sectionHeight) {
        pos -= sectionHeight;
        index += items.length;
        continue;
      }

      // Each item in section
      for (var i = 0; i < items.length; i++) {
        pos -= itemHeight;
        if (pos <= 0 || index === fullLength - 1) break; // found it!
        else index++; // continue
      }
    }

    // debug('got index', index);
    return index;
  },

  getPositionForIndex(index) {
    // debug('get position for index', index);
    var sections = this.sections || [this.model];
    var headerHeight = this.getSectionHeaderHeight();
    var itemHeight = this.getItemHeight();
    var top = this.el.offset;

    for (var name in sections) {
      var items = sections[name];
      top += headerHeight;

      if (index < items.length) {
        top += index * itemHeight;
        break;
      }

      index -= items.length;
      top += items.length * itemHeight;
    }

    // debug('got position', top);
    return top;
  },

  getFullLength() {
    return this.model.length;
  },

  getItemHeight() {
    return this.itemHeight;
  },

  getFullHeight() {
    debug('get full height', this.cachedHeight);
    var height = this.cachedHeight;
    if (height != null) return height;

    var headers = this.getSections().length * this.getSectionHeaderHeight();
    var items = this.getFullLength() * this.getItemHeight();
    return headers + items + this.el.offset;
  },

  insertAtIndex(index, record, toSection) {
    this._cachedLength = null;
    return this.eachSection(function(key, items) {
      if (index < items.length || key === toSection) {
        return items.splice(index, 0, record);
      }

      index -= items.length;
    });
  },

  replaceAtIndex(index, record) {
    return this.eachSection(function(key, items) {
      if (index < items.length) return items.splice(index, 1, record);
      index -= items.length;
    });
  },

  removeAtIndex(index) {
    this._cachedLength = null;
    return this.eachSection(function(key, items) {
      if (index < items.length) return items.splice(index, 1)[0];
      index -= items.length;
    });
  },

  /**
   * Get a some cached data by key.
   *
   * @param  {String} key
   * @return {String}
   */
  getCache(key) {
    return localStorage.getItem(`${this.getCacheKey()}:${key}`);
  },

  /**
   * Store some data in the cache.
   *
   * The scheduler.mutation() block means that
   * it won't interupt user scrolling.
   *
   * @param {String} key
   * @param {String} value
   */
  setCache(key, value) {
    debug('set cache (sync)', key);
    setTimeout(() => {
      scheduler.mutation(() => {
        localStorage.setItem(`${this.getCacheKey()}:${key}`, value);
        debug('set cache (async)', key);
      });
    }, 500);
  },

  /**
   * Clear all caches.
   */
  clearCache() {
    debug('clear cache');
    var prefix = this.getCacheKey();
    localStorage.removeItem(`${prefix}:html`);
    localStorage.removeItem(`${prefix}:height`);
  },

  /**
   * Attempts to generate a storage
   * key prefix unique to this list.
   *
   * Assuming two unique lists don't
   * use caching on the same url, if
   * this feature is required, they
   * must be given unique id attributes.
   *
   * @return {String}
   */
  getCacheKey() {
    return `${this.el.tagName}:${this.el.id}:${location}`;
  },

  /**
   * Gets the currently rendered list-item and section
   * HTML and then persists it to localStorage later
   * in time to prevent blocking the remaining
   * fast-list setup.
   */
  updateCachedHtml() {
    if (!this.el.caching) return;
    debug('update cached html');
    var items = this.el.querySelectorAll('.gfl-item, .gfl-section');
    var html = [].map.call(items, el => el.outerHTML).join('');
    this.setCache('html', html);
  },

  updateCachedHeight() {
    if (!this.el.caching) return;
    debug('update cached height');
    this.setCache('height', this.getFullHeight());
  },

  injectItemsFromCache() {
    if (!this.el.caching) return;
    debug('injecting items from cache');

    var height = this.getCache('height');
    if (height) this.cachedHeight = height;

    var html = this.getCache('html');
    if (html) {
      this.el.insertAdjacentHTML('beforeend', html);
      this.cacheRendered = true;
      return [].slice.call(this.el.querySelectorAll('.gfl-item'));
    }
  },

  // Default header template overridden by
  // <template header> inside <gaia-fast-list>
  templateHeader: '<gaia-sub-header>${section}</gaia-sub-header>',

  // Default item template overridden by
  // <template item> inside <gaia-fast-list>
  templateItem: '<a href="${link}"><div class="text"><h3>${title}</h3>' +
    '<p>${body}</p></div><div class="image"><img src="${image}"/></div></a>'
};

/**
 * Exports
 */

module.exports = component.register('gaia-fast-list', GaiaFastListProto);

});})(typeof define=='function'&&define.amd?define
:(function(n,w){return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('GaiaFastList',this));