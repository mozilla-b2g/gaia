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
 * Cache to persist content.
 *
 * We open ASAP as we need the cached
 * HTML content for the first-paint.
 * As it's async it can be done in
 * the background.
 *
 * @type {Promise}
 */
var cachesOpen = caches.open('gfl');

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
   * Default store up to 5mb of images.
   *
   * @type {Number}
   */
  imageCacheSize: 5e6,

  /**
   * Default store up to 500 images
   * before entries start getting
   * discarded.
   *
   * @type {Number}
   */
  imageCacheLength: 500,

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
  cache() {
    debug('cache');
    if (!this.caching) return;
    this[keys.internal].cachedHeight = null;
    this[keys.internal].updateCache();
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
      get() { return this[keys.internal].getScrollTop(); },
      set(value) { this[keys.internal].setScrollTop(value); }
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

      :host {
        display: block;
        height: 100%;

        color: var(--text-color-minus);
        overflow: hidden;
        text-align: start;
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
      }

      [picker] .fast-list {
        offset-inline-end: 26px; /* picker width */
        padding-inline-end: 12px;
      }

      .fast-list ul {
        position: relative;

        padding: 0;
        margin: 0;

        list-style: none;
      }

      ::content .gfl-header {
        position: sticky;
        top: -20px;
        z-index: 100;

        margin: 0 !important;
        padding-top: 20px;
        padding-bottom: 1px;
        margin-bottom: -1px !important;
        width: calc(100% + 1px);
      }

      ::content .gfl-item {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        z-index: 10;

        display: flex;
        flex-direction: column;
        justify-content: center;
        height: 60px;
        padding: 0 9px;
        overflow: hidden;
        box-sizing: border-box;

        list-style-type: none;
        text-decoration: none;
        border-top: solid 1px var(--border-color, #e7e7e7);
        background: var(--background);
        -moz-user-select: none;
      }

      ::content .gfl-item.first {
        border-top-color: transparent;
      }

      ::content .image {
        position: absolute;
        top: 8px;
        offset-inline-end: 7px;

        width: 44px;
        height: 44px;
      }

      ::content .image.round,
      ::content .image.round > img {
        width: 42px;
        height: 42px;
        border-radius: 50%;
      }

      ::content .gfl-item .image.round {
        top: 8.5px;
        offset-inline-end: 0;
        background: var(--border-color);
      }

      ::content .gfl-item img {
        position: absolute;
        left: 0; top: 0;

        width: 44px;
        height: 44px;

        opacity: 0;
      }

      ::content .cached .gfl-item img {
        display: none;
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
        font-style: normal;
        color: var(--text-color);
      }

      ::content p {
        margin: 0;
        font-size: 15px;
        line-height: 1.35em;
      }

      ::content a {
        color: inherit;
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
  this.el = el;

  this.renderedCache = this.renderCache();
  var shadow = el.shadowRoot;
  this.images = {
    list: [],
    hash: {},
    bytes: 0
  };

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

  // define property names for FastList
  this.container = this.els.container;
  this.list = this.els.list;
  this.itemContainer = el;

  this.configureTemplates();
  this.setupPicker();

  // don't memory leak ObjectURLs
  addEventListener('pagehide', () => this.emptyImageCache());
  debug('initialized');
}

Internal.prototype = {
  headerHeight: 40,
  itemHeight: 60,

  /**
   * Permanently destroy the list.
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
    else this.reloadData();
  },

  /**
   * Reloading the list will completely
   * re-render the list.
   *
   * We must empty the image cache as data
   * may have changed or item indexed
   * may not longer map to new model.
   *
   * We must update the fast-gradient
   * as scrollHeight determines whether
   * fast-gradient needs to be painted.
   *
   * @private
   */
  reloadData() {
    return this.listCreated
      .then(() => {
        debug('reload data');
        this.emptyImageCache();
        return this.fastList.reloadData();
      })

      .then(() => this.updateFastGradient());
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
    var count = 0;
    var result = {};

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
      if (!result[section]) {
        result[section] = [];
        item[keys.first] = true;

      // Make sure that any previously
      // assigned flags are removed as
      // order of items can be changed.
      } else if (item[keys.first]) {
        delete item[keys.first];
      }

      result[section].push(item);
      count++;
    }

    this.hasSections = !!count;
    return this.hasSections && result;
  },

  /**
   * Creates the FastList.
   *
   * We add the fast-gradient last as it's
   * expensive to paint (50-80ms) and only
   * required for scrolling, not first paint.
   *
   * @return {Promise}
   * @private
   */
  createList() {
    return this.listCreated = this.renderedCache
      .then(() => {
        debug('create list');
        this.fastList = new this.el.FastList(this);
        return this.fastList.rendered;
      })

      .then(() => {
        this.firstRender();
        this.els.list.style.transform = '';
        this.removeCachedRender();
        return this.fastList.complete;
      })

      .then(() => this.updateFastGradient());
  },

  /**
   * Dispatches a 'rendered' event
   * to signal to the user that
   * the component is ready to
   * be revealed.
   *
   * We use events not Promises here
   * so that the user can attach
   * event listeners to a component
   * before it's been upgraded.
   *
   * @private
   */
  firstRender() {
    if (this.rendered) return;
    var event = new CustomEvent('rendered', { bubbles: false });
    this.el.dispatchEvent(event);
    this.rendered = true;
  },

  /**
   * Mixin properties/methods into the
   * 'data-source' object passed to FastList.
   *
   * @param  {Object} props
   */
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
    var section = document.createElement('div');

    header.classList.add('gfl-header');
    section.appendChild(header);
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
    poplar.populate(el, record);
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
   * @private
   */
  populateItemDetail(el, i) {
    if (!this.getItemImageSrc) return;
    debug('populate item detail', i);

    var img = el[keys.img];
    if (!img) return;

    var record = this.getRecordAt(i);
    var cached = this.getCachedImage(i);

    // if we have the image cached
    // we can just load it sync
    if (cached) {
      load(cached);
      return;
    }

    // if we don't have the image we
    // run the user's getter function
    Promise.resolve(this.getItemImageSrc(record, i))
      .then(result => {
        if (!result) return;

        // There is a chance that the item could have
        // been recycled before the user was able to
        // fetch the image. Abort here if that's the case.
        if (el.dataset.index != i) return debug('item recycled');

        var image = {
          src: normalizeImageSrc(result),
          bytes: result.size || result.length
        };

        this.cacheImage(image, i);
        load(image);
      }).catch(e => { throw e; });

    /**
     * Loads
     * @param  {[type]} image [description]
     * @return {[type]}       [description]
     */
    function load(image) {
      debug('load image', image);
      img.src = image.src;
      img.onload = () => {
        debug('image loaded', i);
        img.raf = requestAnimationFrame(() => {
          img.raf = null;
          img.style.transition = 'opacity 500ms';
          img.style.opacity = 1;
        });
      };
    }
  },

  /**
   * Hides the <img> ready for it to be
   * recycled for the next item.
   *
   * @param  {HTMLElement} el  list-item
   * @param  {Number} i  index
   * @private
   */
  unpopulateItemDetail(el, i) {
    if (!this.getItemImageSrc) return;
    debug('unpopulate item detail');

    var img = el[keys.img];
    if (!img) return;

    // Hide image instantly
    img.style.transition = 'none';
    img.style.opacity = 0;

    debug('raf', img.raf);

    // Clear any pending callbacks
    if (img.raf) cancelAnimationFrame(img.raf);
    img.onload = img.raf = null;
  },

  /**
   * Cache an image in memory so that
   * is can be quickly retrieved next
   * time the list-item needs to be
   * rendered.
   *
   * If the user has set the length/size
   * of the cache to falsy then we don't
   * do any caching.
   *
   * TODO: Some list items may share the
   * same image src. If we have a matching
   * src in already in the cache we could
   * reuse that object to save memory.
   *
   * Although this gets tricky when we want
   * to revokeObjectURL() and don't know how
   * many list-items depend on it.
   *
   * @param  {Number} index
   * @param  {Blob|String} raw
   * @return {Object}
   * @private
   */
  cacheImage(image, index) {
    if (!this.el.imageCacheLength) return;
    if (!this.el.imageCacheSize) return;
    this.images.hash[index] = image;
    this.images.list.push(index);
    this.images.bytes += image.bytes;
    this.checkImageCacheLimit();
    debug('image cached', image, this.images.bytes);
    return image;
  },

  /**
   * Attempt to fetch an image
   * for the given item index.
   *
   * @param  {Number} index
   * @return {Object|*}
   * @private
   */
  getCachedImage(index) {
    debug('get cached image', index);
    return this.images.hash[index];
  },

  /**
   * Check there is space remaining in
   * the image cache discarding entries
   * when we're full.
   *
   * The cache is full when either the
   * size (bytes) or the length is breached.
   * We use length as well as bytes as we
   * don't want to store 1000s of strings
   * in memory.
   *
   * When a limit is breached, we discard
   * half of the cached images not currently
   * in use, then we checkImageCacheLimit()
   * once more.
   *
   * We aim to keep a relatively full cache
   * to keep things fast, but don't want to
   * be discarding every time a new image
   * is loaded.
   *
   * @private
   */
  checkImageCacheLimit() {
    var cachedImages = this.images.list.length;
    var exceeded = this.images.bytes > this.el.imageCacheSize
      || cachedImages > this.el.imageCacheLength;

    if (!exceeded) return;

    debug('image cache limit exceeded', exceeded);
    var itemCount = this.fastList.geometry.maxItemCount;
    var toDiscard = (cachedImages - itemCount) / 2;

    // prevent infinite loop when
    // imageCacheLength < maxItemCount
    if (toDiscard <= 0) return;
    debug('discarding: ', toDiscard);

    while (toDiscard-- > 0) {
      this.discardOldestImage();
      debug('bytes used', this.images.bytes);
    }

    // double-check we've freed enough memory
    this.checkImageCacheLimit();
  },

  /**
   * Discard the oldest image in
   * the image cache.
   *
   * When an image has `bytes` we assume
   * it was a Blob and revokeObjectURL()
   * to make sure we don't memory leak.
   *
   * @return {Boolean} success/falure
   * @private
   */
  discardOldestImage() {
    debug('discard oldest image');
    if (!this.images.list.length) return false;
    var index = this.images.list.shift();
    var image = this.images.hash[index];

    if (image.bytes) {
      URL.revokeObjectURL(image.src);
      this.images.bytes -= image.bytes;
      debug('revoked url', image.src);
    }

    delete this.images.hash[index];
    return true;
  },

  /**
   * Completely empty the image cache.
   *
   * @private
   */
  emptyImageCache() {
    while (this.images.list.length) this.discardOldestImage();
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
    poplar.populate(title, { section: section });
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
   * NOTE: We use the innerHeight of the `parent`
   * window to prevent forcing a reflow when
   * gaia-fast-list is inside an iframe. This
   * means that offsets must be relative to
   * viewport *not* the closest window.
   *
   * @return {Number}
   */
  getViewportHeight() {
    debug('get viewport height');
    var bottom = this.el.bottom;
    var top = this.el.top;

    if (top != null && bottom != null) {
      return parent.innerHeight - top - bottom;
    }

    return parseInt(this.el.style.height)
      || this.el.clientHeight;
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
    var lastIndex = fullLength - 1;
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

    // Can't be more than the last index
    index = Math.min(index, lastIndex);
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
   * Jump scroll position to the top of a section.
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

  getFullLength() { return this.model.length; },
  getItemHeight() { return this.itemHeight; },

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
   * Set the scroll position of the list.
   *
   * It is common for users to want to set
   * an initial scrollTop before the real
   * list has actually rendered.
   *
   * To support this we transform the list element
   * and unset the transform once rendered.
   * This is to avoid reflowing an expensive
   * component.
   *
   * @param {Number} value
   */
  setScrollTop(value) {
    debug('set scroll top', value);
    if (this.fastList) {
      this.fastList.scrollInstantly(value);
    } else {
      this.els.list.style.transform = `translateY(${-value}px)`;
      this.initialScrollTop = value;
    }
  },

  /**
   * Get the list's current scroll position.
   *
   * Before FastList is created we
   * return the initialScrollTop
   * as the real scrollTop will
   * return `0` before the list
   * has a height.
   *
   * @return {Number}
   */
  getScrollTop() {
    debug('get scroll top');
    return this.fastList
      ? this.fastList.scrollTop
      : this.initialScrollTop;
  },

  /**
   * Programatically draws a gradient on
   * the background of the list element
   * so that when rendering can't keep
   * up, users will see a scrolling
   * gradient as a fallback.
   *
   * This is done programatically so that
   * we can size and position the gradient
   * in-line with item-height, header-height
   * and offset.
   *
   * Fast-gradients are not required when the
   * list is not scrollable.
   *
   * @private
   */
  updateFastGradient() {
    var viewportHeight = this.getViewportHeight();
    var fullHeight = this.getFullHeight();
    var style = this.els.list.style;

    // Fast gradient not required if not scrollable
    if (fullHeight <= viewportHeight) {
      style.backgroundImage = '';
      return;
    }

    var headerHeight = this.getSectionHeaderHeight();
    var itemHeight = this.getItemHeight();
    var offset = this.el.offset;

    style.backgroundImage =
      `linear-gradient(
        to bottom,
        var(--background),
        var(--background) 100%),
      linear-gradient(
        to bottom,
        transparent,
        transparent 20%,
        var(--border-color) 48%,
        var(--border-color) 52%,
        transparent 80%,
        transparent 100%)`;

    style.backgroundRepeat = 'no-repeat, repeat-y';
    style.backgroundPosition = `0 0, center ${headerHeight}px`;
    style.backgroundSize = `100% ${offset}px, 98% ${itemHeight}px`;
  },

  /**
   * The key used to store the
   * cached HTML and height under.
   *
   * When used with the `Cache` API
   * this end up being appended to
   * the current URL meaning we get
   * a unique cache key per page.
   *
   * 'example.com/page-a/gflCacheKey'
   * 'example.com/page-b/gflCacheKey'
   * 'example.com/page-c/gflCacheKey'
   *
   * @type {String}
   */
  cacheKey: 'gflCacheKey',

  /**
   * Get content from cache.
   *
   * @param  {String} key
   * @return {Array}
   * @private
   */
  getCache() {
    return cachesOpen.then(cache => {
      debug('get cache', this.cacheKey);
      return cache.match(new Request(this.cacheKey))
        .then(res => res && res.json());
    });
  },

  /**
   * Store some data in the cache.
   *
   * @param {Array} valuex
   * @private
   */
  setCache(data) {
    return cachesOpen.then(cache => {
      debug('set cache', data);
      var req = new Request(this.cacheKey);
      var res = new Response(JSON.stringify(data));
      return cache.put(req, res);
    });
  },

  /**
   * Clear the cache.
   *
   * @private
   */
  clearCache() {
    return cachesOpen.then(cache => {
      debug('clear cache');
      return cache.delete(this.cacheKey);
    });
  },

  /**
   * Creates a cache that contains HTML
   * for enough items to fill the viewport
   * and an integar representing the full
   * height.
   *
   * The cache always contains content
   * required to render scrollTop: 0.
   *
   * We have to dynamically create the items
   * to cache as the user may have scrolled
   * the list before .cache() is called,
   * meaning the items in the DOM may
   * not longer be for scrolTop: 0.
   *
   * @private
   */
  updateCache() {
    if (!this.el.caching) return;
    debug('update cache');
    var fullHeight = this.getFullHeight();
    var maxViewportHeight = Math.max(window.innerWidth, window.innerHeight);
    var length = Math.ceil(maxViewportHeight / this.getItemHeight());
    var html = '';

    for (var i = 0; i < length; i++) {
      var el = this.createItem();
      el.dataset.position = this.getPositionForIndex(i);
      this.populateItem(el, i);
      html += el.outerHTML;
    }

    var sections = this.el.querySelectorAll('.gfl-section');
    var height = 0;

    for (var j = 0, l = sections.length; j < l; j++) {
      html += sections[j].outerHTML;
      height += ~~sections[j].style.height;
      if (height >= maxViewportHeight) break;
    }

    this.setCache({
      height: fullHeight,
      html: html
    });

    debug('cached html', html);
  },

  /**
   * Render the cache into the DOM.
   *
   * From the users perspective this will
   * appear as though the list has rendered,
   * when in-fact it is more like a snapshot
   * of the list state last time they used it.
   *
   * As soon as the app sets `list.model` the
   * cached render will be destroyed and
   * the real list will take it's place.
   * Most of the time this transition
   * will be seamless.
   *
   * @return {Promise}
   */
  renderCache() {
    if (!this.el.caching) return Promise.resolve();
    debug('render cache');

    return this.getCache()
      .then(result => {
        debug('got cache');
        if (!result) return;

        var height = result.height;
        var html = result.html;

        this.els.cached = document.createElement('div');
        this.els.cached.className = 'cached';
        this.els.cached.innerHTML = html;

        var items = this.els.cached.querySelectorAll('.gfl-item');
        [].forEach.call(items, (el, i) => {
          el.style.transform = `translateY(${el.dataset.position}px)`;
        });

        // Insert the cached render as an 'overlay'
        this.el.appendChild(this.els.cached);

        // This gets accessed inside .getFullHeight()
        // so that FastList renders the *full*
        // cached height on the first render.
        this.cachedHeight = height;

        // Dispatch a 'rendered' event
        // so the user knows the list
        // is ready to be revealed.
        this.firstRender();
      });
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

  /**
   * Picker
   */

  setupPicker() {
    if (!this.el.picker) return;
    debug('setup picker');

    this.picker = new Picker(this.els.picker);
    this.onPickingStarted = this.onPickingStarted.bind(this);
    this.onPickingEnded = this.onPickingEnded.bind(this);
    this.onPicked = this.onPicked.bind(this);

    this.picker.addEventListener('started', this.onPickingStarted);
    this.picker.addEventListener('ended', this.onPickingEnded);
    this.picker.addEventListener('picked', this.onPicked);
  },

  teardownPicker() {
    if (!this.picker) return;
    debug('teardown picker');

    this.picker.removeEventListener('picked', this.onPicked);
    this.picker.destroy();

    delete this.onPicked;
    delete this.onPickingEnded;
    delete this.onPickingStarted;
    delete this.picker;
  },

  onPicked() {
    debug('on picked');
    var link = this.picker.selected;
    this.setOverlayContent(link.dataset.icon, link.textContent);
  },

  onPickingStarted() {
    debug('on picking started');
    this.els.overlay.classList.add('visible');
  },

  onPickingEnded() {
    debug('on picking ended');
    var link = this.picker.selected;
    var id = link.hash.substr(1);

    this.jumpToId(id);
    this.els.overlay.classList.remove('visible');
  },

  /**
   * Set the picker overlay content
   * prefering icons over text.
   *
   * The manipulation is done is such
   * a way that prevents reflow.
   *
   * @param {String} icon
   * @param {String} text
   */
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

  // Default header template overridden by
  // <template header> inside <gaia-fast-list>
  templateHeader: '<gaia-sub-header>${section}</gaia-sub-header>',

  // Default item template overridden by
  // <template item> inside <gaia-fast-list>
  templateItem: '<a href="${link}"><div class="text"><h3>${title}</h3>' +
    '<p>${body}</p></div><div class="image"><img src="${image}"/></div></a>'
};

/**
 * Initialize a new Alphabetical
 * Picker Column.
 *
 * @param {HTMLElement} el  picker element
 */
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
    e.stopPropagation();
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
    e.stopPropagation();
    e.preventDefault();
    var fast = (e.timeStamp - this.lastUpdate) < 50;
    if (!fast) this.update(e);
  },

  onTouchEnd(e) {
    debug('touch end');
    e.stopPropagation();
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
module.exports.Internal = Internal; // test hook

/**
 * Utils
 */

/**
* Normalizes supported image return
* value to a String.
*
* When Blobs are returned we createObjectURL,
* when the cache is discarded we revokeObjectURL
* later.
*
* @param  {Blob|String} src
* @return {Object}  {src, bytes}
*/
function normalizeImageSrc(src) {
  if (typeof src == 'string') return src;
  else if (src instanceof Blob) return URL.createObjectURL(src);
  else throw new Error('invalid image src');
}

});})(typeof define=='function'&&define.amd?define
:(function(n,w){return typeof module=='object'?function(c){
c(require,exports,module);}:function(c){var m={exports:{}};c(function(n){
return w[n];},m.exports,m);w[n]=m.exports;};})('GaiaFastList',this));