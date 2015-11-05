!(function(define){'use strict';define(function(require,exports,module){

/**
 * Mini logger
 *
 * @type {Function}
 */
var debug = 0 ? console.log.bind(console, '[FastList]') : function() {};

/**
 * Use the dom-scheduler if it's around,
 * else fallback to fake shim.
 *
 * @type {Object}
 */
var schedule = window.scheduler || schedulerShim();

/**
 * Exports
 */

exports = module.exports = FastList;
exports.scheduler = schedule;

function FastList(source) {
  debug('initialize');
  this._scrollStopTimeout = null;
  this.source = source;

  this.els = {
    itemContainer: source.itemContainer,
    container: source.container,
    list: source.list,
    sections: [],
    items: [],
    itemsInDOM: []
  };

  this.geometry = {
    topPosition: 0,
    forward: true,
    busy: false,
    idle: true,
    hasScrolled: false,
    itemHeight: source.getItemHeight(),
    viewportHeight: 0,
    maxItemCount: 0,
    switchWindow: 0
  };

  // TODO: Move this to fast-list-edit.js
  this.reorderingContext = {
    item: null,
    initialY: null,
    identifier: null,
    moveUp: null,
    moveDown: null,
  };

  // TODO: Move this out of core
  on(this.els.container, 'click', this);

  // Update geometry on resize
  on(window, 'resize', this);

  // Create a list element if one wasn't provided
  if (!this.els.list) this.els.list = document.createElement('ul');
  if (!this.els.itemContainer) this.els.itemContainer = this.els.list;

  // Phase1 renders just enough content
  // for the viewport (without detail).
  this.rendered = schedule
    .mutation(this.setupPhase1.bind(this));

  // Phase2 renders more list-items and detail
  this.complete = this.rendered
    .then(this.setupPhase2.bind(this));
}

FastList.prototype = {
  PRERENDER_MULTIPLIER: 3.5,

  /**
   * The first render of the list aims
   * to get content on the screen as
   * fast as possible.
   *
   * Only the list-items in the viewport
   * (critical) are rendered, and the
   * populateItemDetail() stage is
   * skipped to prevent expensive
   * render paths being hit.
   *
   * @private
   */
  setupPhase1: function() {
    debug('setup phase 1');
    var fragment = document.createDocumentFragment();
    var container = this.els.container;

    this.updateContainerGeometry();

    // Make the container scrollable
    container.style.overflowX = 'hidden';
    container.style.overflowY = 'scroll';
    this.updateListHeight();

    // If the list detached (created internally), attach it
    if (!this.els.list.parentNode) container.appendChild(this.els.list);

    // We can't set initial scrollTop
    // until the list has a height.
    // WARNING: Setting an initial scrollTop
    // before render forces an extra reflow!
    if (this.source.initialScrollTop) {
      container.scrollTop = this.source.initialScrollTop;
      this.geometry.topPosition = container.scrollTop;
    }

    // Using a fragment container means we only
    // endure one document mutation on inititalization
    this.updateSections({ fragment: fragment });

    // Lightweight render into fragment
    this.render({
      fragment: fragment,
      criticalOnly: true,
      skipDetail: true
    });

    // Inject the content fragment
    this.els.itemContainer.appendChild(fragment);

    // Bind scroll listeners after setting the
    // initialScrollTop to avoid triggering 'scroll'
    // handler. Setting the handler early means
    // we can render if the user or Gecko
    // changes the scrollTop before phase2.
    this.handleScroll = this.handleScroll.bind(this);
    schedule.attachDirect(
      this.els.container,
      'scroll',
      this.handleScroll
    );
  },

  /**
   * The second render phase completes
   * the initialization of the list.
   *
   * All list items will be rendered
   * and the detail (eg. images) will
   * be populated.
   *
   * .processScrollPosition() is called
   * before render to update the
   *
   * @return {Promise}
   * @private
   */
  setupPhase2: function() {
    return new Promise(function(resolve) {
      setTimeout(function() {
        debug('setup phase 2');
        var fragment = document.createDocumentFragment();
        this.render({ fragment: fragment });
        this.els.itemContainer.appendChild(fragment);
        resolve();
      }.bind(this), 360);
    }.bind(this));
  },

  /**
   * Updates the container geometry state needed for the rendering
   *
   * - viewport height
   * - number of items per screen
   * - maximum number of items in the dom
   * - window left for direction changes
   *
   * @private
   */
  updateContainerGeometry: function() {
    var geo = this.geometry;
    var viewportHeight = this.getViewportHeight();
    var itemPerScreen = viewportHeight / geo.itemHeight;

    geo.viewportHeight = viewportHeight;
    geo.maxItemCount = Math.floor(itemPerScreen * this.PRERENDER_MULTIPLIER);
    geo.switchWindow = Math.floor(itemPerScreen / 2);

    debug('maxItemCount: ' + geo.maxItemCount);
  },

  /**
   * Returns the height of the list container.
   *
   * Attempts to use user provided .getViewportHeight()
   * from the configuration, falling back to reflow
   * forcing .offsetHeight :(
   *
   * @return {Number}
   * @private
   */
  getViewportHeight: function() {
    return this.source.getViewportHeight
      ? this.source.getViewportHeight()
      : this.els.container.offsetHeight;
  },

  /**
   * Updates the rendering window geometry informations
   *
   * - top position
   * - busyness state
   * - idling state
   *
   * We monitor the distance traveled between 2 handled scroll events to
   * determine if we can do more expensive rendering (idle) or if we need
   * to skip rendering altogether (busy).
   *
   * @private
   */
  processScrollPosition: function(instant) {
    var position = this.els.container.scrollTop;
    var geo = this.geometry;

    // Don't compute lag on first reading
    if (!geo.hasScrolled) {
      geo.topPosition = position;
      geo.hasScrolled = true;
    }

    var viewportHeight = geo.viewportHeight;
    var previousTop = geo.topPosition;
    var delta = position - previousTop;

    geo.forward = isForward(geo.forward, delta);
    geo.topPosition = position;

    var onTop = geo.topPosition === 0;
    var topReached = onTop && previousTop !== 0;
    var fullHeight = this.source.getFullHeight();
    var maxScrollTop = fullHeight - viewportHeight;
    var atBottom = geo.topPosition === maxScrollTop;

    if (topReached) this.emit('top-reached');

    // Full stop, forcefuly idle
    if (onTop || atBottom || instant) {
      geo.busy = false;
      geo.idle = true;
      return;
    }

    var moved = Math.abs(delta);
    geo.busy = isBusy(geo.busy, moved, viewportHeight);
    geo.idle = isIdle(geo.idle, moved, viewportHeight);
  },

  /**
   * Places and populates the item
   * in the rendering window
   *
   * @param {Object} options
   * @param {Object} options.reload  forces the re-population of all items
   * @param {Object} options.fragment  optional fragment to insert items
   * @param {Object} options.changedIndex  flags item as new
   *   (for animated insertions)
   */
  render: function(options) {
    debug('render');

    options = options || {};
    var changedIndex = options.changedIndex;
    var criticalOnly = options.criticalOnly;
    var skipDetail = options.skipDetail;
    var fragment = options.fragment;
    var reload = options.reload;

    var itemContainer = fragment || this.els.itemContainer;
    var itemsInDOM = this.els.itemsInDOM;
    var items = this.els.items;
    var source = this.source;
    var geo = this.geometry;

    var indices = computeIndices(this.source, this.geometry);
    var criticalStart = indices.cStart;
    var criticalEnd = indices.cEnd;
    var startIndex = indices.start;
    var endIndex = indices.end;
    var self = this;

    // Only render the list-items visible
    // in the viewport (critical).
    if (criticalOnly) {
      startIndex = criticalStart;
      endIndex = criticalEnd;
    }

    var recyclableItems = recycle(
      items,
      criticalStart,
      criticalEnd,
      geo.forward ? endIndex : startIndex
    );

    if (geo.forward) {
      for (var i = startIndex; i <= endIndex; ++i) renderItem(i);
    } else {
      for (var j = endIndex; j >= startIndex; --j) renderItem(j);
    }

    // When the data changes we need to make sure we're not keeping
    // outdated pre-rendered content lying around
    if (reload) cleanUpPrerenderedItems(items, source);

    function findItemFor(index) {
      // debug('find item for', index, recyclableItems);
      var item;

      if (recyclableItems.length > 0) {
        var recycleIndex = recyclableItems.pop();
        item = items[recycleIndex];
        delete items[recycleIndex];
        debug('found node to recycle', recycleIndex, recyclableItems);
      } else if (itemsInDOM.length < geo.maxItemCount){
        item = self.createItem();
        itemContainer.appendChild(item);
        itemsInDOM.push(item);
      } else {
        console.warn('missing a cell');
        return;
      }

      items[index] = item;
      return item;
    }

    function renderItem(i) {
      // debug('render item', i);
      var item = items[i];

      if (!item) {
        item = findItemFor(i);

        var shouldUnpopulate = source.unpopulateItemDetail
          && item.dataset.detailPopulated === 'true';

        // Recycling, need to unpopulate and
        // populate with the new content
        if (shouldUnpopulate) {
          source.unpopulateItemDetail(item);
          item.dataset.detailPopulated = false;
        }

        tryToPopulate(item, i, source, true);
        item.classList.toggle('new', i === changedIndex);
      } else if (reload) {
        // Reloading, re-populating all items
        // We expect the DataSource to be ready to populate all items so not
        // going through |tryToPopulate|
        item.dataset.detailPopulated = false;
        source.populateItem(item, i);
        item.dataset.populated = true;
        if (item.style.display === 'none') {
          item.style.removeProperty('display');
        }
      } // else item is already populated

      var section = source.getSectionFor(i);
      placeItem(item, i, section, geo, source, reload);

      if (skipDetail || !source.populateItemDetail) return;

      // Populating the item detail when we're not too busy scrolling
      // Note: we're always settling back to an idle stage at some point where
      // we do all the pending detail populations
      if (!geo.idle) return;

      // Detail already populated, skipping
      if (item.dataset.detailPopulated === 'true') return;

      var result = source.populateItemDetail(item, i);
      if (result !== false) item.dataset.detailPopulated = true;
    }

    debugViewport(
      items,
      geo.forward,
      criticalStart,
      criticalEnd,
      startIndex,
      endIndex
    );
  },

  /**
   * Creates a list item.
   *
   * @return {HTMLElement}
   */
  createItem: function() {
    var el = this.source.createItem();
    el.style.position = 'absolute';
    el.style.left = el.style.top = 0;
    el.style.overflow = 'hidden';
    return el;
  },

  /**
   * Creates a list section.
   *
   * @return {HTMLElement}
   */
  createSection: function(name) {
    var el = this.source.createSection(name);
    el.classList.add('fl-section');
    return el;
  },

  reloadData: function() {
    return schedule.mutation(function() {
      this.updateSections();
      this.updateListHeight();
      this.render({ reload: true });
    }.bind(this));
  },

  updateSections: function(options) {
    debug('update sections');
    var fragment = (options && options.fragment);
    var nodes = this.els.itemContainer.querySelectorAll('.fl-section');
    var items = fragment || document.createDocumentFragment();
    var source = this.source;

    // remove any old sections
    for (var i = 0; i < nodes.length; i++) {
      var toRemove = nodes[i];
      toRemove.remove();
    }

    var headerHeight = source.getSectionHeaderHeight();
    var sections = this.source.getSections();

    // create new sections
    for (var j = 0; j < sections.length; j++) {
      var height = source.getFullSectionHeight(sections[j]);
      var el = this.createSection(sections[j]);

      el.style.height = headerHeight + height + 'px';
      this.source.populateSection(el, sections[j], j);
      items.appendChild(el);
    }

    // don't append the items if an outside fragment was given
    if (!fragment) this.els.itemContainer.appendChild(items);
  },

  /**
   * Scrolling
   */

  handleScroll: function(evt) {
    clearTimeout(this._scrollStopTimeout);

    this.processScrollPosition();
    if (this.geometry.busy) debug('[x] ---------- faaaaassssstttt');
    else this.render();

    if (this.geometry.idle) return;
    var self = this;

    // We just did a partial rendering
    // and need to make sure it won't
    // get stuck this way if the
    // scrolling comes to a hard stop.
    this._scrollStopTimeout = setTimeout(function() {
      self.processScrollPosition(true);
      self.render();
    }, 200);
  },

  updateListHeight: function() {
    this.els.list.style.height = this.source.getFullHeight() + 'px';
    debug('updated list height', this.els.list.style.height);
  },

  get scrollTop() {
    return this.geometry.topPosition;
  },

  scrollInstantly: function(position) {
    this.els.container.scrollTop = position;
    this.processScrollPosition(true);
    this.render();
  },

  /**
   * External Content Changes
   */

  insertedAtIndex: function(index) {
    debug('inserted at index', index);

    if (index !== 0) {
      //TODO: support any point of insertion
      return;
    }

    if (this.geometry.topPosition > this.geometry.itemHeight ||
        this.editing) {
      // No transition needed, just keep the scroll position
      this._insertOnTop(true);
      return;
    }

    var domItems = this.els.itemsInDOM;
    var list = this.els.itemContainer;

    list.classList.add('reordering');
    pushDown(domItems, this.geometry)
      .then(this._insertOnTop.bind(this, false))
      .then(cleanInlineStyles.bind(null, domItems))
      .then(reveal.bind(null, list))
      .then(function() {
        list.classList.remove('reordering');
      });
  },

  _insertOnTop: function(keepScrollPosition) {
    debug('insert on top', keepScrollPosition);
    return schedule.mutation((function() {
      this.els.items.unshift(null);
      delete this.els.items[0]; // keeping it sparse

      this.updateSections();

      if (keepScrollPosition) {
        var scrollTop = this.els.container.scrollTop;
        this.scrollInstantly(scrollTop + this.geometry.itemHeight);
        this.els.container.dispatchEvent(new CustomEvent('hidden-new-content'));
      } else {
        this.render({ changedIndex: 0 });
      }

      this.updateListHeight();
    }).bind(this));
  },

  handleEvent: function(evt) {
    switch (evt.type) {
      case 'resize':
        this.updateContainerGeometry();
        break;

      // TODO: Move out of core
      case 'click':
        if (this.editing) {
          break;
        }

        var li = evt.target;
        var index = this.els.items.indexOf(li);

        this.els.itemContainer.dispatchEvent(new CustomEvent('item-selected', {
          bubbles: true,
          detail: {
            index: index,
            clickEvt: evt,
          }
        }));
        break;
    }
  },

  /**
   * Attach a plugin to a list.
   *
   * @param  {Function} fn
   * @return {FastList}
   */
  plugin: function(fn) {
    fn(this);
    return this;
  },

  /**
   * Emit an event.
   *
   * @param  {String} name
   * @private
   */
  emit: function(name, detail) {
    var e = new CustomEvent(name, {
      bubbles: false,
      detail: detail
    });

    this.els.container.dispatchEvent(e);
  },

  /**
   * Permanently destroy the list.
   *
   * @public
   */
  destroy: function() {
    this.els.itemContainer.innerHTML = '';
    schedule.detachDirect(
      this.els.container,
      'scroll',
      this.handleScroll
    );
  }
};

/**
 * Internals
 */

/**
 * ASCII Art viewport debugging
 *
 * @param  {[type]} items   [description]
 * @param  {[type]} forward [description]
 * @param  {[type]} cStart  [description]
 * @param  {[type]} cEnd    [description]
 * @param  {[type]} start   [description]
 * @param  {[type]} end     [description]
 * @return {[type]}         [description]
 */
function debugViewport(items, forward, cStart, cEnd, start, end) {
  if (!debug.name) {
    return;
  }

  var str = '[' + (forward ? 'v' : '^') + ']';
  for (var i = 0; i < items.length; i++) {
    if (i == start) str += '|';
    if (i == cStart) str += '[';

    if (items[i]) str += 'x';
    else str += '-';

    if (i == cEnd) str += ']';
    if (i == end) str += '|';
  }

  debug(str);
}

/**
 * Computes the indices of the first and
 * and last list items to be rendered and
 * the indices of the first and last
 * 'critical' items within the viewport.
 *
 * @param  {Object} source
 * @param  {Object} geometry
 * @return {Object} {start, end, cStart, cEnd}
 */
function computeIndices(source, geometry) {
  debug('compute indices', geometry.topPosition);
  var criticalStart = source.getIndexAtPosition(geometry.topPosition);
  var criticalEnd = source.getIndexAtPosition(geometry.topPosition +
                                           geometry.viewportHeight);
  var canPrerender = geometry.maxItemCount -
                     (criticalEnd - criticalStart) - 1;
  var before = geometry.switchWindow;
  var after = canPrerender - before;
  var lastIndex = source.getFullLength() - 1;
  var startIndex;
  var endIndex;

  if (geometry.forward) {
    startIndex = criticalStart - before;
    endIndex = criticalEnd + after;
  } else {
    startIndex = criticalStart - after;
    endIndex = criticalEnd + before;
  }

  var extra;
  if (startIndex < 0) {
    extra = -startIndex;
    startIndex = 0;
    endIndex = Math.min(lastIndex, endIndex + extra);
  }

  if (endIndex > lastIndex) {
    extra = endIndex - lastIndex;
    endIndex = lastIndex;
    startIndex = Math.max(0, startIndex - extra);
  }

  return {
    cStart: criticalStart,
    cEnd: criticalEnd,
    start: startIndex,
    end: endIndex
  };
}

function recycle(items, start, end, action) {
  debug('recycle', start, end, action);
  var recyclableItems = [];

  for (var i in items) {
    if ((i < start) || (i > end)) recyclableItems.push(i);
  }

  // Put the items that are furthest away from the displayport edge
  // at the end of the array.
  recyclableItems.sort(function(a, b) {
    return Math.abs(a - action) - Math.abs(b - action);
  });

  return recyclableItems;
}

function cleanUpPrerenderedItems(items, source) {
  var fullLength = source.getFullLength();
  for (var idx in items) {
    if (idx >= fullLength) {
      var item = items[idx];
      item.dataset.populated = false;
      item.style.display = 'none';
    }
  }
}

function tryToPopulate(item, index, source, first) {
  // debug('try to populate');

    // The item was probably reused
  if (item.dataset.index != index && !first) return;

  // TODO: should be in a mutation block when !first
  var populateResult = source.populateItem(item, index);

  if (populateResult instanceof Promise) {
    item.dataset.populated = false;
    populateResult.then(
      tryToPopulate.bind(
        null,
        item,
        index,
        source
      )
    );

    return;
  }

  if (first) {
    item.dataset.populated = true;
    return;
  }

  // Promise-delayed population, once resolved

  // Doing any pending itemDetail population on it
  if (source.populateItemDetail && item.dataset.detailPopulated !== 'true') {
    source.populateItemDetail(item, index);
    item.dataset.detailPopulated = true;
  }

  // Revealing the populated item
  debug('revealing populated item');
  item.style.transition = 'opacity 0.2s linear';
  schedule.transition(function() {
    item.dataset.populated = true;
  }, item, 'transitionend').then(function() {
    debug('populated item revealed');
    item.style.transition = '';
  });
}

function placeItem(item, index, section, geometry, source, reload) {
  if (item.dataset.index == index && !reload) {
    // The item was probably reused
    // debug('abort: item resused');
    return;
  }

  item.dataset.position = source.getPositionForIndex(index);
  item.dataset.index = index;
  item.dataset.section = section;

  var tweakedBy = item.dataset.tweakDelta;
  if (tweakedBy) tweakTransform(item, tweakedBy);
  else resetTransform(item);
}

function resetTransform(item) {
  var position = item.dataset.position;
  var transform = 'translateY(' + position + 'px)';

  style(item, 'webkitTransform', transform);
  style(item, 'transform', transform);
}

function tweakTransform(item, delta) {
  debug('tweak transform', item, delta);
  var position = ~~item.dataset.position + ~~delta;
  var transform = 'translateY(' + position + 'px)';

  style(item, 'webkitTransform', transform);
  style(item, 'transform', transform);

  item.dataset.tweakDelta = delta;
}

/**
 * Internals
 */

function cleanInlineStyles(domItems) {
  return schedule.mutation(function() {
    for (var i = 0; i < domItems.length; i++) {
      var item = domItems[i];
      item.style.transition = '';
      item.style.webkitTransition = '';
      resetTransform(item);
    }
    domItems[0] && domItems[0].scrollTop; // flushing
  });
}

function pushDown(domItems, geometry) {
  if (!domItems.length) return Promise.resolve();

  return schedule.transition(function() {
    for (var i = 0; i < domItems.length; i++) {
      var item = domItems[i];
      item.style.transition = 'transform 0.15s ease-in';
      item.style.webkitTransition = '-webkit-transform 0.15s ease-in';
      tweakTransform(item, geometry.itemHeight);
    }
  }, domItems[0], 'transitionend');
}

function reveal(list) {
  var newEl = list.querySelector('li.new');

  return schedule.transition(function() {
    newEl.style.transition = 'opacity 0.25s ease-out';
    newEl.style.webkitTransition = 'opacity 0.25s ease-out';
    setTimeout(function() {
      newEl.classList.remove('new');
    });
  }, newEl, 'transitionend').then(function() {
    newEl.style.transition = '';
    newEl.style.webkitTransition = '';
  });
}

/**
 * Detects if scrolling appears 'blocked'.
 *
 * We're BUSY if:
 *
 * The scroll position moved more than
 * twice the height of the viewport
 * since the last 'scroll' event.
 *
 * We're NO LONGER BUSY if:
 *
 * The scroll position moved less than
 * *half* the viewport since the last
 * 'scroll' event.
 *
 * If neither of these conditions are
 * met we return the previous value.
 *
 * @param  {Boolean}  wasBusy
 * @param  {Number}  moved  distance since last 'scroll'
 * @param  {Number}  viewportHeight
 * @return {Boolean}
 */
function isBusy(wasBusy, moved, viewportHeight) {
  if (!wasBusy && moved > viewportHeight * 2) return true;
  else if (wasBusy && moved && moved < viewportHeight / 2) return false;
  else return wasBusy;
}

/**
 * Detects if scrolling appears 'idle';
 * meaning scrolling is slow or stopped.
 *
 * We're IDLE if:
 *
 * The scroll position moved less than
 * 16th of the height of the viewport
 * since the last 'scroll' event.
 *
 * We're NO LONGER IDLE if:
 *
 * The scroll position moved more than
 * a *quarter* of the viewport since
 * the last 'scroll' event.
 *
 * If neither of these conditions are
 * met we return the previous value.
 *
 * @param  {Boolean}  wasIdle
 * @param  {Number}  moved  distance since last 'scroll'
 * @param  {Number}  viewportHeight
 * @return {Boolean}
 */
function isIdle(wasIdle, moved, viewportHeight) {
  if (!wasIdle && moved && moved < viewportHeight / 16) return true;
  else if (wasIdle && moved && moved > viewportHeight / 4) return false;
  else return wasIdle;
}

/**
 * Detects if the scroll moved
 * forward or backwards.
 *
 * Sometimes the scoll position doesn't
 * move at all between renders, in
 * which case we just return the
 * last known direction.
 *
 * @param  {Boolean}  wasForward
 * @param  {Number}  delta
 * @return {Boolean}
 */
function isForward(wasForward, delta) {
  if (!delta) return wasForward;
  else return delta > 0;
}

/**
 * Utils
 */

function schedulerShim() {
  var raf = window.requestAnimationFrame;

  return {
    mutation: function(block) { return Promise.resolve().then(block); },
    transition: function(block, el, event, timeout) {
      block();
      return after(el, event, timeout || 500);
    },

    // Not sure if this should be different from .transition()
    feedback: function(block, el, event, timeout) {
      block();
      return after(el, event, timeout || 500);
    },

    attachDirect: function(el, event, fn) {
      fn._raffed = function(e) { raf(function() { fn(e); } ); };
      on(el, event, fn._raffed);
    },

    detachDirect: function(el, event, fn) {
      off(el, event, fn._raffed);
    }
  };

  function after(target, event, timeout) {
    return new Promise(function(resolve) {
      var timer = timeout && setTimeout(cb, timeout);
      on(target, event, cb);
      function cb() {
        off(target, event, cb);
        clearTimeout(timer);
        resolve();
      }
    });
  }
}

// Shorthand
function on(el, name, fn) { el.addEventListener(name, fn); }
function off(el, name, fn) { el.removeEventListener(name, fn); }

/**
 * Set a style property on an elements.
 *
 * First checks that the style property
 * doesn't already match the given value
 * to avoid Gecko doing unnecessary
 * style-recalc.
 *
 * @param  {HTMLElement} el
 * @param  {String} key
 * @param  {String} value
 */
function style(el, key, value) {
  if (el.style[key] !== value) el.style[key] = value;
}

});})((typeof define)[0]=='f'&&define.amd?define:(function(n,n2,w){'use strict';
return(typeof module)[0]=='o'?function(c){c(require,exports,module);}:
function(c){var m={exports:{}};c(function(n){w[n];},m.exports,m);
w[n]=w[n2]=m.exports;};})('FastList','fast-list',this));
