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
 * Pointer abstractions
 */

var isTouch = 'ontouchstart' in window;
var touchcancel = isTouch ? 'touchcancel' : 'mousecancel';
var touchstart = isTouch ? 'touchstart' : 'mousedown';
var touchmove = isTouch ? 'touchmove' : 'mousemove';
var touchend = isTouch ? 'touchend' : 'mouseup';

/**
 * Mini Logger
 *
 * @type {Function}
 */
var debug = 0 ? (...args) => console.log('[GaiaFastList]', ...args) : () => {};

/**
 * Used to hide private properties behind.
 *
 * @type {Symbol}
 */
var keys = {
  internal: Symbol(),
  first: Symbol(),
  img: Symbol()
};

/**
 * Public prototype.
 *
 * @type {Object}
 */
var GaiaFastListProto = {
  extensible: false,

  /**
   * Called when the component is first created.
   *
   * @private
   */
  created() {
    debug('create');
    this.setupShadowRoot();

    this.caching = this.getAttribute('caching');
    this.offset = this.getAttribute('offset');
    this.picker = this.getAttribute('picker');
    this.bottom = this.getAttribute('bottom');
    this.top = this.getAttribute('top');

    this[keys.internal] = new Internal(this);
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
   * @public
   */
  configure(props) {
    debug('configure');
    this[keys.internal].configure(props);
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
    this[keys.internal].cachedHeight = null;
    this[keys.internal].updateCachedHeight();
  },

  /**
   * Clear cached height and html.
   *
   * @public
   */
  clearCache() {
    debug('clear cache');
    this[keys.internal].clearCache();
  },

  /**
   * Permanently destroy the component.
   *
   * @public
   */
  destroy() {
    this[keys.internal].destroy();
  },

  /**
   * Public attributes/properties configuration
   * used by gaia-component.js.
   *
   * @type {Object}
   */
  attrs: {
    model: {
      get() { return this[keys.internal].model; },
      set(value) { this[keys.internal].setModel(value); }
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
      get() { return this[keys.internal].fastList.scrollTop; },
      set(value) {
        var fastList = this[keys.internal].fastList;
        if (fastList) fastList.scrollInstantly(value);
        else this[keys.internal].initialScrollTop = value;
      }
    },

    minScrollHeight: {
      get() { return this[keys.internal].list.style.minHeight; },
      set(value) { this[keys.internal].list.style.minHeight = value; }
    },

    picker: {
      get() { return this._picker; },
      set(value) {
        value = value || value === '';
        if (value === this._picker) return;
        if (value) this.setAttr('picker', '');
        else this.removeAttr('picker');
        this._picker = value;
      }
    }
  },

  /*jshint ignore:start*/
  template: `
    <div class="inner">
      <div class="picker"><content select="[picker-item]"></content></div>
      <div class="overlay"><div class="text">X</div><div class="icon">search</div></div>
      <div class="fast-list">
        <ul><content></content></ul>
      </div>
    </div>

    <style>
      * { margin: 0; font: inherit; }

      :host {
        display: block;
        height: 100%;

        color: var(--text-color-minus);
      }

      .inner {
        position: relative;
        height: 100%;
      }

      .fast-list {
        position: absolute;
        left: 0; right: 0;
        top: 0; bottom: 0;

        padding: 0 17px;
        overflow: hidden !important;
      }

      [picker] .fast-list {
        offset-inline-end: 26px; /* picker width */
        padding-inline-end: 12px;
      }

      .fast-list.layerize {
        overflow-y: scroll !important;
      }

      .fast-list.empty {
        background-image:
          linear-gradient(
            to bottom,
            var(--border-color),
            var(--border-color) 2px,
            var(--background) 2px,
            var(--background) 10px,
            var(--background)),
          linear-gradient(
            to bottom,
            var(--border-color),
            var(--border-color) 1px,
            transparent 1px,
            transparent);

        background-position:
          17px 29px,
          17px 40px;

        background-size:
          calc(100% - 34px) 13px,
          calc(100% - 34px) 60px;

        background-repeat:
          no-repeat,
          repeat-y;
      }

      .fast-list ul {
        position: relative;

        padding: 0;
        margin: 0;

        list-style: none;
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
        position: absolute;
        left: 0; top: 0;
        z-index: 10;

        display: flex;
        flex-direction: column;
        justify-content: center;
        box-sizing: border-box;
        width: 100%;
        height: 60px;
        padding: 0 9px;

        list-style-type: none;
        text-decoration: none;
        will-change: initial !important;
        border-top: solid 1px var(--border-color, #e7e7e7);
      }

      ::content .gfl-item.first {
        border-top: 0;
      }

      :host(.layerize) ::content .gfl-item {
        will-change: transform !important;
      }

      ::content .image {
        position: absolute;
        top: 0;
        offset-inline-end: 0;

        width: 60px;
        height: 60px;

        background-color: var(--border-color);
      }

      ::content .image.round,
      ::content .image.round > img {
        width: 42px;
        height: 42px;
        border-radius: 50%;
      }

      ::content .gfl-item .image.round {
        top: 8.5px;
      }

      ::content .gfl-item img {
        position: absolute;
        left: 0; top: 0;

        width: 60px;
        height: 60px;

        opacity: 0;
        will-change: opacity;
      }

      ::content h3,
      ::content p {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }

      ::content .image ~ h3,
      ::content .image ~ p {
        padding-inline-end: 60px;
      }

      ::content .image.round ~ h3,
      ::content .image.round ~ p {
        padding-inline-end: 42px;
      }

      ::content h3 {
        margin: 0;

        font-size: 20px;
        font-weight: 400;
        color: var(--text-color);
      }

      ::content p {
        margin: 0;
        font-size: 15px;
        line-height: 1.35em;
      }

      .picker {
        display: none;
      }

      [picker] .picker {
        position: absolute;
        offset-inline-end: 0;
        top: 0;

        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        width: 35px;
        height: 100%;
        padding: 2px 0;
      }

      ::content [picker-item] {
        display: flex;
        justify-content: center;
        align-items: center;
        flex: 1;
        min-height: 0;
        text-decoration: none;
        text-align: center;
        color: inherit;
      }

      ::content [picker-item][data-icon] {
        font-size: 0; /* hide icon text-label */
      }

      ::content [picker-item]:before {
        font-size: 19px;
        -moz-user-select: none;
      }

      .picker a {
        display: flex;
        justify-content: center;
        align-items: center;
        flex: 1;

        text-decoration: none;
        text-align: center;
        font-size: 13px;
        color: inherit;

        text-transform: uppercase;
        -moz-user-select: none;
      }

      .overlay {
        position: absolute;
        left: 50%; top: 50%;
        z-index: 200;

        display: none;
        width: 1.8em;
        height: 1.8em;
        margin: -1em 0 0 -1em;

        font-size: 70px;
        text-align: center;
        line-height: 1.8;
        font-weight: 300;
        border-radius: 50%;

        color: #fff;
        background: var(--background-minus);
        pointer-events: none;
        opacity: 0;
        transition: opacity 400ms;
        text-transform: uppercase;
      }

      [picker] .overlay {
        display: block;
      }

      .overlay.visible {
        opacity: 1;
        transition: opacity 100ms;
      }

      .overlay > .icon {
        position: absolute;
        left: 0; top: 0; bottom: 0; right: 0;
        font-family: "gaia-icons";
        font-weight: 500;
        text-transform: none;
        text-rendering: optimizeLegibility;
      }
    </style>`,
  /*jshint ignore:end*/

  // test hooks
  FastList: FastList
};

/**
 * Private internals.
 * @param {GaiaFastList} el
 */
function Internal(el) {
  var shadow = el.shadowRoot;
  this.attrs = {};
  this.el = el;

  this.els = {
    list: shadow.querySelector('ul'),
    picker: shadow.querySelector('.picker'),
    overlay: shadow.querySelector('.overlay'),
    overlayIcon: shadow.querySelector('.overlay > .icon'),
    overlayText: shadow.querySelector('.overlay > .text'),
    container: shadow.querySelector('.fast-list'),
    listContent: shadow.querySelector('.fast-list content'),
    pickerItems: []
  };

  this.injectItemsFromCache();

  // define property names for FastList
  this.container = this.els.container;
  this.list = this.els.list;
  this.itemContainer = el;

  this.configureTemplates();
  this.setEmpty(!this.els.cached);
  this.setupPicker();

  debug('internal initialized');
}

Internal.prototype = {
  headerHeight: 40,
  itemHeight: 60,

  /**
   * Teardown `Picker` and `FastList`.
   *
   * @private
   */
  destroy() {
    debug('detached');
    this.teardownPicker();
    if (this.fastList) {
      this.fastList.destroy();
      delete this.fastList;
    }
  },

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

  setupPicker() {
    if (!this.el.picker) return;

    this.picker = new Picker(this.els.picker);
    this.onPickingStarted = this.onPickingStarted.bind(this);
    this.onPickingEnded = this.onPickingEnded.bind(this);
    this.onPicked = this.onPicked.bind(this);

    this.picker.addEventListener('started', this.onPickingStarted);
    this.picker.addEventListener('ended', this.onPickingEnded);
    this.picker.addEventListener('picked', this.onPicked);
    debug('picker setup');
  },

  teardownPicker() {
    if (!this.picker) return;

    this.picker.removeEventListener('picked', this.onPicked);
    this.picker.destroy();

    delete this.onPicked;
    delete this.onPickingEnded;
    delete this.onPickingStarted;
    delete this.picker;

    debug('picker torndown');
  },

  onPicked() {
    debug('on picked');
    var link = this.picker.selected;
    this.setOverlayContent(link.dataset.icon, link.textContent);
  },

  onPickingStarted() {
    this.els.overlay.classList.add('visible');
  },

  onPickingEnded() {
    debug('on picking ended');
    var link = this.picker.selected;
    var id = link.hash.substr(1);

    this.jumpToId(id);
    this.els.overlay.classList.remove('visible');
  },

  setOverlayContent(icon, text) {
    var letterNode = this.els.overlayText;
    var iconNode = this.els.overlayIcon;

    if (icon) {
      iconNode.firstChild.data = icon;
      letterNode.style.visibility = 'hidden';
      iconNode.style.visibility = 'visible';
    } else {
      letterNode.firstChild.data = text;
      iconNode.style.visibility = 'hidden';
      letterNode.style.visibility = 'visible';
    }
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

    this.hasSections = false;

    for (var i = 0, l = items.length; i < l; i++) {
      var item = items[i];
      var section = sectioned && this.getSectionName(item);

      // When a section is not defined, flag
      // first list items and skip logic
      if (!section) {
        if (i === 0) item[keys.first] = true;
        else if (item[keys.first]) delete item[keys.first];
        continue;
      }

      // When there is no section yet
      // we can assume that this item
      // is the first item in the section.
      if (!hash[section]) {
        hash[section] = [];
        item[keys.first] = true;

      // Make sure that any previously
      // assigned flags are removed as
      // order of items can be changed.
      } else if (item[keys.first]) {
        delete item[keys.first];
      }

      hash[section].push(item);
      this.hasSections = true;
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
      this.removeCachedRender();
      this.updateCachedHtml();
      setTimeout(() => this.layerize(), 360);
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
    el[keys.img] = el.querySelector('img');
    el.classList.add('gfl-item');
    return el;
  },

  /**
   * Called by FastList when it needs
   * to create a section element.
   *
   * @return {HTMLElement}
   */
  createSection(name) {
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
    section.id = `gfl-section-${name}`;

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

    el.classList.toggle('first', !!record[keys.first]);
  },

  /**
   * Populates the list-item image if one is
   * present in the template and the user
   * has configured `getItemImageSrc()`.
   *
   * .populateItemDetail() is run only when the
   * list is 'idle' (stopped or slow) so that
   * we don't harm scrolling performance.
   *
   * @param  {HTMLElement} el  list-item node
   * @param  {Number} i  index
   */
  populateItemDetail(el, i) {
    if (!this.getItemImageSrc) return;

    var img = el[keys.img];
    if (!img) return;

    var record = this.getRecordAt(i);
    Promise.resolve(this.getItemImageSrc(record, i))
      .then(src => {

        // There is a chance that the item
        // could have been recycled before
        // the user was able to fetch the image.
        // Abort here if that's the case.
        if (el.dataset.index != i) return debug('item recycled');

        // Abort if no src is returned
        if (!src) return;

        img.src = src;
        img.onload = () => {
          img.style.transition = 'opacity 250ms';
          img.style.opacity = 1;
        };
      });
  },

  /**
   * Hides the <img> ready for it to be
   * recycled for the next item.
   *
   * @param  {HTMLElement} el  list-item
   * @param  {Number} i  index
   */
  unpopulateItemDetail(el, i) {
    if (!this.getItemImageSrc) return;
    var img = el[keys.img];
    if (!img) return;
    img.style.transition = 'none';
    img.style.opacity = 0;
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

  getSectionHeaderHeight() {
    return this.hasSections ? this.headerHeight : 0;
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
    var itemHeight = this.itemHeight;
    var top = this.el.offset;
    var length;

    for (var name in sections) {
      length = sections[name].length;
      top += headerHeight;

      if (index < length) {
        top += index * itemHeight;
        break;
      }

      index -= length;
      top += length * itemHeight;
    }

    // debug('got position', top);
    return top;
  },

  /**
   * Jump scroll position to th top of a section.
   *
   * If a section of the given name is not
   * found the scroll postion will not
   * be changed.
   *
   * @param  {String} name
   * @private
   */
  jumpToId(id) {
    debug('jump to id', id);
    if (!id) return;

    var children = this.els.listContent.getDistributedNodes();
    var found = false;
    var offset = 0;

    for (var i = 0, l = children.length; i < l; i++) {
      var child = children[i];

      // Skip text-nodes
      if (!child.tagName) continue;

      if (child.id === id) {
        debug('found section', child);
        found = true;
        break;
      }

      // skip <style> and gfl-items
      if (child.tagName == 'STYLE') continue;
      if (child.classList.contains('.gfl-item')) continue;

      var height = child.style.height || child.offsetHeight;
      offset += parseInt(height);
    }

    if (found) this.el.scrollTop = offset;
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
    var maxViewportHeight = Math.max(window.innerWidth, window.innerHeight);
    var length = Math.ceil(maxViewportHeight / this.getItemHeight());
    var items = [].slice.call(this.el.querySelectorAll('.gfl-item'), 0, length);

    // remove any attributes to save bytes
    var itemsHtml = items.map(el => el.outerHTML)
      .join('')
      .replace(/style\=\"[^"]+\"/g, '')
      .replace(/data-tweak-delta=""/g, '');

    var sections = [].slice.call(this.el.querySelectorAll('.gfl-section'));
    var sectionsHtml = sections.map(el => el.outerHTML).join('');

    this.setCache('html', itemsHtml + sectionsHtml);
    debug('cached html', itemsHtml);
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
    if (!html) return;

    this.els.cached = document.createElement('div');
    this.els.cached.innerHTML = html;

    var items = [].slice.call(this.els.cached.querySelectorAll('.gfl-item'));
    items.forEach((el, i) => {
      el.style.transform = 'translateY(' + el.dataset.position + 'px)';
    });

    this.el.appendChild(this.els.cached);
  },

  /**
   * Removes the cached render overlay
   * to reveal the fully functional
   * list below.
   *
   * @private
   */
  removeCachedRender() {
    if (!this.els.cached) return;
    this.els.cached.remove();
    delete this.els.cached;
  },

  // Default header template overridden by
  // <template header> inside <gaia-fast-list>
  templateHeader: '<gaia-sub-header>${section}</gaia-sub-header>',

  // Default item template overridden by
  // <template item> inside <gaia-fast-list>
  templateItem: '<a href="${link}"><div class="text"><h3>${title}</h3>' +
    '<p>${body}</p></div><div class="image"><img src="${image}"/></div></a>'
};

function Picker(el) {
  this.el = el;
  this.els = {
    content: this.el.querySelector('content'),
    items: []
  };

  // bind so we can removeEventListener
  this.onTouchStart = this.onTouchStart.bind(this);
  this.onTouchMove = this.onTouchMove.bind(this);
  this.onTouchEnd = this.onTouchEnd.bind(this);
  this.onClick = this.onClick.bind(this);

  this.el.addEventListener(touchstart, this.onTouchStart);
  this.el.addEventListener('click', this.onClick, true);

  this.render();
  debug('created picker');
}

Picker.prototype = {
  render() {
    var letters = 'abcdefghijklmnopqrstuvwxyz#';
    var length = letters.length;

    for (var i = 0; i < length; i++) {
      var letter = letters[i];
      var el = document.createElement('a');
      el.textContent = letters[i];
      el.href = `#gfl-section-${letter}`;
      this.el.appendChild(el);
      this.els.items.push(el);
    }
  },

  addEventListener(name, fn) { this.el.addEventListener(name, fn); },
  removeEventListener(name, fn) { this.el.removeEventListener(name, fn); },

  onTouchStart(e) {
    debug('touch start');
    e.preventDefault();
    this.height = this.el.clientHeight;
    this.els.allItems = this.getAllItems();
    this.itemHeight = this.height / this.els.allItems.length;
    this.offset = this.els.allItems[0].getBoundingClientRect().top;

    scheduler.attachDirect(window, touchmove, this.onTouchMove);
    addEventListener(touchcancel, this.onTouchEnd);
    addEventListener(touchend, this.onTouchEnd);

    this.update(e);
    this.emit('started');
  },

  onTouchMove(e) {
    debug('touch move');
    e.preventDefault();
    var fast = (e.timeStamp - this.lastUpdate) < 50;
    if (!fast) this.update(e);
  },

  onTouchEnd(e) {
    debug('touch end');
    e.preventDefault();

    scheduler.detachDirect(window, touchmove, this.onTouchMove);
    removeEventListener(touchend, this.onTouchEnd);
    removeEventListener(touchend, this.onTouchEnd);

    this.update(e);
    this.emit('ended');
  },

  onClick(e) {
    e.preventDefault();
    e.stopPropagation();
  },

  update(e) {
    debug('update', this.offset);
    var allItems = this.els.allItems;
    var pageY = e.changedTouches ? e.changedTouches[0].pageY : e.pageY;
    var y = pageY - this.offset;
    var index = Math.floor(y / this.itemHeight);

    // clamp within index range
    index = Math.max(0, Math.min(allItems.length - 1, index));

    // abort if new index is same as current
    if (index === this.selectedIndex) return;

    this.selectedIndex = index;
    this.selected = allItems[index];
    this.lastUpdate = e.timeStamp;
    this.emit('picked');
  },

  getAllItems() {
    var light = [].slice.call(this.els.content.getDistributedNodes());
    var shadow = this.els.items;
    return light.concat(shadow);
  },

  emit(name) {
    this.el.dispatchEvent(new CustomEvent(name, { bubbles: false }));
  },

  destroy() {
    this.els.items.forEach(el => el.remove());
    this.el.removeEventListener(touchstart, this.onTouchStart);
    this.el.removeEventListener('click', this.onClick, true);
  }
};

/**
 * Exports
 */

module.exports = component.register('gaia-fast-list', GaiaFastListProto);

});})(typeof define=='function'&&define.amd?define
:(function(n,w){return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('GaiaFastList',this));