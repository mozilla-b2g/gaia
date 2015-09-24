!(function(define){'use strict';define(function(require,exports,module){

/**
 * Mini logger
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
  this.source = source;

  // List elements aren't required
  if (!source.list) {
    source.list = document.createElement('ul');
    source.container.appendChild(source.list);
  }

  this.els = {
    itemContainer: source.itemContainer || source.list,
    container: source.container,
    list: source.list,
    sections: [],
    items: source.items || [],
    itemsInDOM: [].concat(source.items || [])
  };

  this.els.container.style.overflowX = 'hidden';
  this.els.container.style.overflowY = 'scroll';

  this.geometry = {
    topPosition: -1,
    forward: true,
    busy: false,
    idle: true,
    viewportHeight: 0,
    itemHeight: 0,
    headerHeight: 0,
    maxItemCount: 0,
    switchWindow: 0
  };

  this.geometry.headerHeight = source.getSectionHeaderHeight();
  this.geometry.itemHeight = source.getItemHeight();

  this._rendered = false;

  this.reorderingContext = {
    item: null,
    initialY: null,
    identifier: null,
    moveUp: null,
    moveDown: null,
  };

  on(this.els.container, 'click', this);
  on(window, 'resize', this);

  this.rendered = schedule.mutation(function() {
    this.updateContainerGeometry();
    this.updateListHeight();

    // We can't set initial scrollTop
    // until the list has a height
    if (source.initialScrollTop) {
      this.els.container.scrollTop = source.initialScrollTop;
    }

    this.updateSections();
    this.render();

    // Bind context early so that is can be detached later
    this.handleScroll = this.handleScroll.bind(this);

    // Bind scroll listeners after setting
    // the initialScrollTop to avoid
    // triggering 'scroll' handler
    schedule.attachDirect(
      this.els.container,
      'scroll',
      this.handleScroll
    );
  }.bind(this));
}

FastList.prototype = {
  plugin: function(fn) {
    fn(this);
    return this;
  },

  /**
   * Updates the container geometry state needed for the rendering
   *
   * - viewport height
   * - number of items per screen
   * - maximum number of items in the dom
   * - window left for direction changes
   *
   */
  updateContainerGeometry: function() {
    var geo = this.geometry;

    geo.viewportHeight = this.getViewportHeight();
    var itemPerScreen = geo.viewportHeight / geo.itemHeight;
    // Taking into account the will-change budget multiplier from
    // layout/base/nsDisplayList.cpp#1193
    geo.maxItemCount = Math.floor(itemPerScreen * 2.7);
    geo.switchWindow = Math.floor(itemPerScreen / 2);

    debug('maxItemCount: ' + geo.maxItemCount);
  },

  /**
   * Returns the height of the list container.
   *
   * Attempts to use user provided .getViewportHeight()
   * from the configuration, falling back to sync
   * reflow .offsetHeight :(
   *
   * @return {Number}
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
   */
  updateRenderingWindow: function() {
    var geo = this.geometry;

    var position = this.els.container.scrollTop;

    // Don't compute lag on first load
    if (geo.topPosition === -1) {
      geo.topPosition = position;
    }

    var previousTop = geo.topPosition;
    geo.topPosition = position;

    var distanceSinceLast = geo.topPosition - previousTop;

    if ((distanceSinceLast > 0) && !geo.forward) {
      geo.forward = true;
    }

    if ((distanceSinceLast < 0) && geo.forward) {
      geo.forward = false;
    }

    if (geo.topPosition === 0 && previousTop !== 0) {
      this.els.container.dispatchEvent(new CustomEvent('top-reached'));
    }

    var onTop = geo.topPosition === 0;
    var atBottom = geo.topPosition ===
      (this.source.getFullHeight() - geo.viewportHeight);

    // Full stop, forcefuly idle
    if (onTop || atBottom) {
      geo.busy = false;
      geo.idle = true;
      return;
    }

    var moved = Math.abs(distanceSinceLast);

    var previousBusy = geo.busy;
    var previousIdle = geo.idle;

    if (!previousBusy  && moved > geo.viewportHeight * 2) {
      geo.busy = true;
    }

    if (previousBusy && moved > 0 && moved < geo.viewportHeight * 0.5) {
      geo.busy = false;
    }

    if (!previousIdle  && moved && moved < geo.viewportHeight / 16) {
      geo.idle = true;
    }

    if (previousIdle && moved && moved > geo.viewportHeight * 0.25) {
      geo.idle = false;
    }
  },

  /**
   * Places and populates the item in the rendering window
   *
   * @param {Bool} reload forces the re-population of all items
   * @param {Number} changedIndex flags an item as new (for animated insertions)
   */
  render: function(reload, changedIndex) {
    debug('render');

    var source = this.source;
    var items = this.els.items;
    var itemsInDOM = this.els.itemsInDOM;
    var geo = this.geometry;
    var list = this.els.itemContainer;

    var indices = computeIndices(this.source, this.geometry);
    var criticalStart = indices.cStart;
    var criticalEnd = indices.cEnd;
    var startIndex = indices.start;
    var endIndex = indices.end;
    var self = this;

    // Initial render generating all dom nodes
    if (!this._rendered) {
      this._rendered = true;
      endIndex = Math.min(
        source.getFullLength() - 1,
        startIndex + this.geometry.maxItemCount - 1
      );
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

    function findItemFor(index) {
      debug('find item for', index, recyclableItems);
      var item;

      if (recyclableItems.length > 0) {
        var recycleIndex = recyclableItems.pop();
        item = items[recycleIndex];
        delete items[recycleIndex];
        debug('found node to recycle', recycleIndex, recyclableItems);
      } else if (itemsInDOM.length < geo.maxItemCount){
        debug('need to create new node');
        item = self.createItem();
        list.appendChild(item);
        itemsInDOM.push(item);
      } else {
        console.warn('missing a cell');
        return;
      }

      items[index] = item;
      return item;
    }

    function renderItem(i) {
      var item = items[i];

      if (!item) {
        item = findItemFor(i);
        // Recycling, need to unpopulate and populate with the new content
        source.unpopulateItemDetail && source.unpopulateItemDetail(item);
        item.dataset.detailPopulated = false;
        tryToPopulate(item, i, source, true);
        item.classList.toggle('new', i === changedIndex);
      } else if (reload) {
        // Reloading, re-populating all items
        item.dataset.detailPopulated = false;
        source.populateItem(item, i);
      } // else item is already populated

      // There is a chance that the user may
      // have called .replaceChild() inside the
      // .populateItem() hook. We redefine `item`
      // here to make sure we have the latest node.
      item = items[i];

      var section = source.getSectionFor(i);
      placeItem(item, i, section, geo, source, reload);

      if (!source.populateItemDetail) return;

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

  createItem: function() {
    var el = this.source.createItem();
    el.style.position = 'absolute';
    el.style.left = el.style.top = 0;
    el.style.overflow = 'hidden';
    el.style.willChange = 'transform';
    return el;
  },

  createSection: function(name) {
    var el = this.source.createSection(name);
    el.classList.add('fl-section');
    return el;
  },

  replaceChild: function(replacement, child) {
    debug('replace child', replacement, child);
    var itemsInDOM = this.els.itemsInDOM;
    var items = this.els.items;

    items[items.indexOf(child)] = replacement;
    itemsInDOM[itemsInDOM.indexOf(child)] = replacement;
    this.els.itemContainer.replaceChild(replacement, child);
  },

  reloadData: function() {
    return this.rendered = schedule.mutation(function() {
      this.updateSections();
      this.updateListHeight();
      this.render(true);
    }.bind(this));
  },

  updateSections: function() {
    debug('update sections');

    var nodes = this.els.itemContainer.querySelectorAll('.fl-section');
    var source = this.source;

    for (var i = 0; i < nodes.length; i++) {
      var toRemove = nodes[i];
      toRemove.remove();
    }

    var headerHeight = source.getSectionHeaderHeight();
    var sections = this.source.getSections();

    for (var j = 0; j < sections.length; j++) {
      var height = source.getFullSectionHeight(sections[j]);
      var el = this.createSection(sections[j]);

      el.style.height = headerHeight + height + 'px';
      this.source.populateSection(el, sections[j], j);
      this.els.itemContainer.appendChild(el);
    }
  },

  /**
   * Scrolling
   */

  handleScroll: function(evt) {
    this.updateRenderingWindow();

    if (this.geometry.busy) debug('[x] ---------- faaaaassssstttt');
    else this.render();
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
    this.updateRenderingWindow();
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
        this.render(false, 0);
      }

      this.updateListHeight();
    }).bind(this));
  },

  handleEvent: function(evt) {
    switch (evt.type) {
      case 'resize':
        this.updateContainerGeometry();
        break;
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

function computeIndices(source, geometry) {
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
    endIndex = Math.max(0, startIndex + extra);
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

function tryToPopulate(item, index, source, first) {
  debug('try to populate');

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
    debug('abort: item resused');
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
  item.style.webkitTransform =
    item.style.transform = 'translate3d(0, ' + position + 'px, 0)';
  item.dataset.tweakDelta = '';
}

function tweakTransform(item, delta) {
  var position = ~~item.dataset.position + ~~delta;
  item.style.webkitTransform =
    item.style.transform = 'translate3d(0, ' + position + 'px, 0)';
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

});})((typeof define)[0]=='f'&&define.amd?define:(function(n,n2,w){'use strict';
return(typeof module)[0]=='o'?function(c){c(require,exports,module);}:
function(c){var m={exports:{}};c(function(n){w[n];},m.exports,m);
w[n]=w[n2]=m.exports;};})('FastList','fast-list',this));
