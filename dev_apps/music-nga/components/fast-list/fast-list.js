!(function(define){'use strict';define(function(require,exports,module){

var debug = 0 ? console.log.bind(console, '[FastList]') : function() {};

var startEvent = ('ontouchstart' in window) ? 'touchstart' : 'mousedown';
var moveEvent = ('ontouchstart' in window) ? 'touchmove' : 'mousemove';
var endEvent = ('ontouchstart' in window) ? 'touchend' : 'mouseup';

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
  debug('initialize', source);
  this.editing = false;

  this.container = source.container;
  this.container.style.overflowX = 'hidden';
  this.container.style.overflowY = 'scroll';

  this.list = source.list;
  if (!this.list) {
    this.list = document.createElement('ul');
    this.container.appendChild(this.list);
  }

  this.itemContainer = source.itemContainer || this.list;

  this.source = source;

  this.geometry = {
    topPosition: 0,
    forward: true,

    viewportHeight: 0,
    itemHeight: 0,
    headerHeight: 0,
    maxItemCount: 0,
    switchWindow: 0
  };

  this._templateSection = elementify(source.sectionTemplate);
  this._templateSection.classList.add('fl-section');
  this.geometry.headerHeight = source.sectionHeaderHeight();

  var template = elementify(source.itemTemplate);
  template.style.position = 'absolute';
  template.style.left = template.style.top = 0;
  template.style.overflow = 'hidden';
  template.style.willChange = 'transform';
  this._template = template;

  this.geometry.itemHeight = source.itemHeight();
  this.updateContainerGeometry();

  if (debug.name) {
    if (this.geometry.itemHeight !== template.offsetHeight) {
      debug('Template height and source height are not the same.');
    }
  }

  this._rendered = false;
  this._previousTop = -1;
  this._previousFast = false;
  this._items = [];
  this._itemsInDOM = [];

  this.reorderingContext = {
    item: null,
    initialY: null,
    identifier: null,
    moveUp: null,
    moveDown: null,
  };

  schedule.attachDirect(
    this.container,
    'scroll',
    this.handleScroll.bind(this)
  );

  on(this.container, 'click', this);
  on(window, 'resize', this);

  schedule.mutation(function() {
    this.updateListHeight();
    this.updateSections();
    this.render();
  }.bind(this));
}

FastList.prototype = {

  /* Rendering
     ========= */
  updateContainerGeometry: function() {
    var geo = this.geometry;

    geo.viewportHeight = this.container.offsetHeight;
    var itemPerScreen = geo.viewportHeight / geo.itemHeight;
    // Taking into account the will-change budget multiplier from
    // layout/base/nsDisplayList.cpp#1193
    geo.maxItemCount = Math.floor(itemPerScreen * 2.8);
    geo.switchWindow = Math.floor(itemPerScreen / 2);

    debug('maxItemCount: ' + geo.maxItemCount);
  },

  // Returns true if we're fast scrolling
  updateViewportGeometry: function() {
    var geo = this.geometry;

    var position = this.container.scrollTop;

    // Don't compute velocity on first load
    if (this._previousTop === -1) {
      geo.topPosition = position;
    }

    this._previousTop = geo.topPosition;
    geo.topPosition = position;

    var distanceSinceLast = geo.topPosition - this._previousTop;

    if ((distanceSinceLast > 0) && !geo.forward) {
      geo.forward = true;
    }

    if ((distanceSinceLast < 0) && geo.forward) {
      geo.forward = false;
    }

    if (geo.topPosition === 0 && this._previousTop !== 0) {
      this.container.dispatchEvent(new CustomEvent('top-reached'));
    }

    var moved = Math.abs(distanceSinceLast);
    var fastScrolling = this._previousFast;
    if (!fastScrolling  && moved > geo.viewportHeight * 2) {
      fastScrolling = true;
    }
    if (fastScrolling && moved > 0 && moved < geo.viewportHeight * 0.5) {
      fastScrolling = false;
    }
    this._previousFast = fastScrolling;

    var onTop = position === 0;
    var atBottom = position === this.source.fullHeight() - geo.viewportHeight;

    return fastScrolling && !onTop && !atBottom;
  },

  render: function(reload, changedIndex) {
    debug('render');

    var source = this.source;
    var items = this._items;
    var itemsInDOM = this._itemsInDOM;
    var geo = this.geometry;
    var template = this._template;
    var list = this.itemContainer;

    var indices = computeIndices(this.source, this.geometry);
    var criticalStart = indices.cStart;
    var criticalEnd = indices.cEnd;
    var startIndex = indices.start;
    var endIndex = indices.end;

    debug('got indices', indices);

    // Initial render generating all dom nodes
    if (!this._rendered) {
      this._rendered = true;
      endIndex = Math.min(source.fullLength() - 1,
                          startIndex + this.geometry.maxItemCount - 1);
    }

    var recyclableItems = recycle(items, criticalStart, criticalEnd,
                                  geo.forward ? endIndex : startIndex);

    var findItemFor = function(index) {
      var item;

      if (recyclableItems.length > 0) {
        var recycleIndex = recyclableItems.pop();
        item = items[recycleIndex];
        delete items[recycleIndex];
      } else if (itemsInDOM.length < geo.maxItemCount){
        item = template.cloneNode(true);
        list.appendChild(item);
        itemsInDOM.push(item);
      } else {
        console.warn('missing a cell');
        return;
      }

      items[index] = item;
      return item;
    };

    var renderItem = function(i) {
      var item = items[i];
      if (!item) {
        item = findItemFor(i);
        tryToPopulate(item, i, source, true);
        item.classList.toggle('new', i === changedIndex);
      } else if (reload) {
        source.populateItem(item, i);
      }

      var section = source.getSectionFor(i);
      placeItem(item, i, section, geo, source, reload);
    };

    if (geo.forward) {
      for (var i = startIndex; i <= endIndex; ++i) {
        renderItem(i);
      }
    } else {
      for (var j = endIndex; j >= startIndex; --j) {
        renderItem(j);
      }
    }

    debugViewport(items, geo.forward, criticalStart, criticalEnd,
                  startIndex, endIndex);
  },

  /* Scrolling
     ========= */
  handleScroll: function(evt) {
    var fast = this.updateViewportGeometry();
    if (fast) {
      debug('[x] ---------- faaaaassssstttt');
    } else {
      this.render();
    }
  },

  updateListHeight: function() {
    this.list.style.height = this.source.fullHeight() + 'px';
    debug('updated list height', this.list.style.height);
  },

  get scrollTop() {
    return this.geometry.topPosition;
  },

  scrollInstantly: function(by) {
    this.container.scrollTop += by;
    this.updateViewportGeometry();
    this.render();
  },

  reloadData: function() {
    return schedule.mutation((function() {
      this.updateSections();
      this.render(true);
      this.updateListHeight();
    }).bind(this));
  },

  updateSections: function() {
    var nodes = this.itemContainer.querySelectorAll('.fl-section');
    var template = this._templateSection;
    var source = this.source;

    for (var i = 0; i < nodes.length; i++) {
      var toRemove = nodes[i];
      toRemove.remove();
    }

    var headerHeight = source.sectionHeaderHeight();
    var sections = this.source.getSections();

    sections.forEach(function(section, i) {
      var height = source.fullSectionHeight(section);

      var sectionNode = template.cloneNode(true);
      sectionNode.style.height = headerHeight + height + 'px';

      this.source.populateSection(sectionNode, section, i);
      this.itemContainer.appendChild(sectionNode);
    }, this);
  },

  /* Edit mode
     ========= */
  toggleEditMode: function() {
    this.editing = !this.editing;

    if (this.editing) {
      this._startTouchListeners();
    } else {
      this._stopTouchListeners();
    }

    return toggleEditClass(
      this.itemContainer,
      this._itemsInDOM,
      this.editing);
  },

  _startTouchListeners: function() {
    on(this.itemContainer, startEvent, this);
    on(this.itemContainer, endEvent, this);
  },

  _stopTouchListeners: function() {
    off(this.itemContainer, startEvent, this);
    off(this.itemContainer, endEvent, this);
  },

  /* Reordering
     ---------- */
  _reorderStart: function(evt) {
    debug('reorder start');
    var ctx = this.reorderingContext;

    // Already tracking an item, bailing out
    if (ctx.item) {
      return;
    }

    var li = evt.target.parentNode.parentNode;
    var touch = evt.touches && evt.touches[0] || evt;

    ctx.item = li;
    ctx.initialY = touch.pageY;
    ctx.identifier = touch.identifier;
    ctx.moveUp = new Set();
    ctx.moveDown = new Set();
    ctx.moveHandler = this._reorderMove.bind(this);

    var listenToMove = (function() {
      schedule.attachDirect(
        this.itemContainer,
        moveEvent,
        ctx.moveHandler);
    }).bind(this);

    setupForDragging(li, true)
      .then(listenToMove)
      .then(toggleDraggingClass.bind(null, li, true));
  },

  _reorderMove: function(evt) {
    debug('reorder move');
    var ctx = this.reorderingContext;
    if (!ctx.item) {
      return;
    }

    // Multi touch
    if (evt.touches && evt.touches.length > 1) {
      return;
    }

    var li = ctx.item;
    var touch = evt.touches && evt.touches[0] || evt;
    var position = touch.pageY;

    var delta = position - ctx.initialY;

    this._rearrange(delta);
    tweakTransform(li, delta);

    // TODO: scroll when close to the beginning/end of the viewport
  },

  _reorderEnd: function(evt) {
    debug('reorder end');

    var ctx = this.reorderingContext;
    if (!ctx.item) {
      return;
    }

    var li = ctx.item;
    schedule.detachDirect(
      this.itemContainer,
      moveEvent,
      ctx.moveHandler);

    var touch = evt.touches && evt.touches[0] || evt;
    if (touch.identifier == ctx.identifier) {
      var position = touch.pageY;
      var delta = position - ctx.initialY;
      computeChanges(ctx, this.geometry, this._itemsInDOM, delta);
    }

    Promise.all([
      applyChanges(ctx, this.geometry, this._itemsInDOM),
      moveInPlace(ctx, this.geometry)
    ]).then(this._reorderFinish.bind(this, li))
      .then(toggleDraggingClass.bind(null, li, false));
  },

  _reorderFinish: function(li) {
    return Promise.all([this._commitToDocument(),
                        setupForDragging(li, false)]);
  },

  _rearrange: function(delta) {
    var ctx = this.reorderingContext;
    var upCount = ctx.moveUp.size;
    var downCount = ctx.moveDown.size;

    computeChanges(this.reorderingContext, this.geometry,
                   this._itemsInDOM, delta);

    if (ctx.moveUp.size === upCount &&
        ctx.moveDown.size === downCount) {
      return;
    }

    applyChanges(this.reorderingContext,
                 this.geometry, this._itemsInDOM);
  },

  _commitToDocument: function() {
    var ctx = this.reorderingContext;
    var li = ctx.item;
    var itemsInDOM = this._itemsInDOM;
    var items = this._items;
    var source = this.source;

    return schedule.mutation((function() {
      // Nothing to do
      if (!ctx.moveUp && !ctx.moveDown) {
        return;
      }

      var index = items.indexOf(li);
      var section = li.dataset.section;
      var newIndex = index + ctx.moveUp.size - ctx.moveDown.size;

      items.splice(index, 1);
      items.splice(newIndex, 0, li);
      var c = source.removeAtIndex(index);
      source.insertAtIndex(newIndex, c, section);

      itemsInDOM.forEach(function(item) {
        resetTransition(item);
        resetTransform(item);
      });

      this.updateSections();
      this.render();

      ctx.item = null;
      ctx.initialY = null;
      ctx.identifier = null;
      ctx.moveUp = null;
      ctx.moveDown = null;
      ctx.moveHandler = null;
    }).bind(this));
  },

  /* External content changes
     ======================== */
  insertedAtIndex: function(index) {
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

    var domItems = this._itemsInDOM;
    var list = this.itemContainer;

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
    return schedule.mutation((function() {
      this._items.unshift(null);
      delete this._items[0]; // keeping it sparse

      this.updateSections();

      if (keepScrollPosition) {
        this.scrollInstantly(this.geometry.itemHeight);
        this.container.dispatchEvent(new CustomEvent('hidden-new-content'));
      } else {
        this.render(false, 0);
      }

      this.updateListHeight();
    }).bind(this));
  },

  handleEvent: function(evt) {
    switch (evt.type) {
      case 'resize':
        this.geometry.viewportHeight = this.container.offsetHeight;
        this.updateContainerGeometry();
        break;
      case startEvent:
        if (!evt.target.classList.contains('cursor')) {
          return;
        }
        evt.preventDefault();
        this._reorderStart(evt);
        break;
      case endEvent:
        if (!evt.target.classList.contains('cursor') &&
            endEvent === 'touchend') {
          return;
        }
        evt.preventDefault();
        this._reorderEnd(evt);
        break;
      case 'click':
        if (this.editing) {
          break;
        }

        var li = evt.target;
        var index = this._items.indexOf(li);

        this.itemContainer.dispatchEvent(new CustomEvent('item-selected', {
          bubbles: true,
          detail: {
            index: index,
            clickEvt: evt,
          }
        }));
        break;
    }
  }
};

/* Internals
   ========= */

/* ASCII Art viewport debugging
   ---------------------------- */
function debugViewport(items, forward, cStart, cEnd, start, end) {
  if (!debug.name) {
    return;
  }

  var str = '[' + (forward ? 'v' : '^') + ']';
  for (var i = 0; i < items.length; i++) {
    if (i == start) {
      str += '|';
    }
    if (i == cStart) {
      str += '[';
    }
    if (items[i]) {
      str += 'x';
    } else {
      str += '-';
    }
    if (i == cEnd) {
      str += ']';
    }
    if (i == end) {
      str += '|';
    }
  }

  debug(str);
}

function computeIndices(source, geometry) {
  var criticalStart = source.indexAtPosition(geometry.topPosition);
  var criticalEnd = source.indexAtPosition(geometry.topPosition +
                                           geometry.viewportHeight);
  var canPrerender = geometry.maxItemCount -
                     (criticalEnd - criticalStart) - 1;
  var before = geometry.switchWindow;
  var after = canPrerender - before;
  var lastIndex = source.fullLength() - 1;

  var startIndex;
  var endIndex;

  if (geometry.forward) {
    startIndex = Math.max(0, criticalStart - before);
    endIndex = Math.min(lastIndex,
                        criticalEnd + after);
  } else {
    startIndex = Math.max(0, criticalStart - after);
    endIndex = Math.min(lastIndex,
                        criticalEnd + before);
  }

  return {
    cStart: criticalStart,
    cEnd: criticalEnd,
    start: startIndex,
    end: endIndex
  };
}

function recycle(items, start, end, action) {
  var recyclableItems = [];
  for (var i in items) {
    if ((i < start) || (i > end)) {
      recyclableItems.push(i);
    }
  }

  // Put the items that are furthest away from the displayport edge
  // at the end of the array.
  recyclableItems.sort(function(a, b) {
    return Math.abs(a - action) - Math.abs(b - action);
  });

  return recyclableItems;
}

function tryToPopulate(item, index, source, first) {
  if (parseInt(item.dataset.index) !== index && !first) {
    // The item was probably reused
    return;
  }

  // TODO: should be in a mutation block when !first
  var populateResult = source.populateItem(item, index);

  if (populateResult instanceof Promise) {
    item.dataset.populated = false;
    populateResult.then(tryToPopulate.bind(null, item, index,
                                           source));
    return;
  }

  if (first) {
    item.dataset.populated = true;
    return;
  }

  // Revealing the populated item
  item.style.transition = 'opacity 0.2s linear';
  schedule.transition(function() {
    item.dataset.populated = true;
  }, item, 'transitionend').then(function() {
    item.style.transition = '';
  });
}

function placeItem(item, index, section, geometry, source, reload) {
  if (parseInt(item.dataset.index) === index && !reload) {
    // The item was probably reused
    return;
  }

  item.dataset.position = source.positionForIndex(index);
  item.dataset.index = index;
  item.dataset.section = section;

  var tweakedBy = parseInt(item.dataset.tweakDelta);
  if (tweakedBy) {
    tweakTransform(item, tweakedBy);
  } else {
    resetTransform(item);
  }
}

function resetTransform(item) {
  var position = parseInt(item.dataset.position);
  item.style.webkitTransform =
    item.style.transform = 'translate3d(0, ' + position + 'px, 0)';
  item.dataset.tweakDelta = '';
}

function tweakTransform(item, delta) {
  var position = parseInt(item.dataset.position) + delta;
  item.style.webkitTransform =
    item.style.transform = 'translate3d(0, ' + position + 'px, 0)';
  item.dataset.tweakDelta = delta;
}

function resetTransition(item) {
  item.style.transition = '';
  item.style.webkitTransition = '';
}

function tweakAndTransition(item, tweak) {
  return schedule.feedback(function() {
    item.style.transition = 'transform 0.15s ease';
    item.style.webkitTransition = '-webkit-transform 0.15s ease';
    if (tweak === 0) {
      setTimeout(resetTransform.bind(null, item));
      return;
    }
    setTimeout(tweakTransform.bind(null, item, tweak));
  }, item, 'transitionend')
  .then(resetTransition.bind(null, item));
}

function pushDown(domItems, geometry) {
  if (!domItems.length) {
    return Promise.resolve();
  }

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

function toggleEditClass(list, domItems, editing) {
  if (!domItems.length) {
    return Promise.resolve();
  }

  return schedule.feedback(function() {
    for (var i = 0; i < domItems.length; i++) {
      var item = domItems[i];
      var overlay = item.querySelector('.overlay');
      overlay.dataset.anim = editing ? 'reveal' : 'hide';
      item.classList.toggle('edit', editing);
    }
  }, list, 'animationend');
}

function setupForDragging(item, on) {
  return schedule.mutation(function() {
    item.parentNode.classList.toggle('reordering', on);
    item.style.zIndex = on ? '1000' : '';
    item.style.boxShadow = on ? '0 0 3px 1px #bcbcbc' : '';
  });
}

function toggleDraggingClass(item, on) {
  return schedule.feedback(function() {
    var overlay = item.querySelector('.overlay');
    overlay.dataset.anim = on ? 'hide' : 'reveal';
  }, item, 'animationend');
}

function computeChanges(context, geometry, domItems, delta) {
  if (!context.item) {
    return;
  }

  var draggedItem = context.item;
  var draggedOriginal = parseInt(draggedItem.dataset.position);
  var draggedTweaked = draggedOriginal + delta;

  for (var i = 0; i < domItems.length; i++) {
    var item = domItems[i];
    if (item === draggedItem) {
      continue;
    }

    // TODO: support re-ordering accross sections
    if (item.dataset.section !== draggedItem.dataset.section) {
      continue;
    }

    var itemOriginal = parseInt(item.dataset.position);
    var itemTweaked = itemOriginal + parseInt(item.dataset.tweakDelta);

    if ((itemOriginal < draggedOriginal) && (draggedTweaked < itemOriginal)) {
      context.moveDown.add(item);
    } else {
      if (draggedTweaked > itemTweaked) {
        context.moveDown.delete(item);
      }
    }

    if ((itemOriginal > draggedOriginal) && (draggedTweaked > itemOriginal)) {
      context.moveUp.add(item);
    } else {
      if (draggedTweaked < itemTweaked) {
        context.moveUp.delete(item);
      }
    }
  }
}

function applyChanges(context, geometry, domItems) {
  if (!context.item) {
    return Promise.resolve();
  }

  var itemHeight = geometry.itemHeight;
  var draggedItem = context.item;
  var promises = [];

  for (var i = 0; i < domItems.length; i++) {
    var item = domItems[i];
    if (item === draggedItem) {
      continue;
    }

    // Reset
    if (item.dataset.tweakDelta &&
       !context.moveUp.has(item) && !context.moveDown.has(item)) {

      promises.push(tweakAndTransition(item, 0));
    }

    // Moving down
    if (context.moveDown.has(item)) {
      if (parseInt(item.dataset.tweakDelta) !== itemHeight) {
        promises.push(tweakAndTransition(item, itemHeight));
      }
    }

    // Moving up
    if (context.moveUp.has(item)) {
      if (parseInt(item.dataset.tweakDelta) !== itemHeight * -1) {
        promises.push(tweakAndTransition(item, itemHeight * -1));
      }
    }
  }

  return Promise.all(promises);
}

function moveInPlace(context, geometry) {
  var li = context.item;

  // We're already in place
  if (!li.dataset.tweakDelta) {
    return Promise.resolve();
  }

  var position = parseInt(li.dataset.position);
  var taintedPosition = position + parseInt(li.dataset.tweakDelta);
  var itemHeight = geometry.itemHeight;
  var newPosition = position + context.moveUp.size * itemHeight -
                    context.moveDown.size * itemHeight;

  var duration = (Math.abs(taintedPosition - newPosition) / itemHeight) * 150;

  return schedule.feedback(function() {
    li.style.transition = 'transform ' + duration + 'ms linear';
    li.style.webkitTransition = '-webkit-transform ' + duration + 'ms linear';
    setTimeout(tweakTransform.bind(null, li, (newPosition - position)));
  }, li, 'transitionend');
}

/**
 * Utils
 */

function schedulerShim() {
  var raf = window.requestAnimationFrame;

  return {
    mutation: function(block) { return Promise.resolve(block()); },
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

function elementify(html) {
  var div = document.createElement('div');
  div.innerHTML = html;
  var content = div.firstElementChild;
  content.remove();
  return content;
}

// Shorthand
function on(el, name, fn) { el.addEventListener(name, fn); }
function off(el, name, fn) { el.removeEventListener(name, fn); }

});})((typeof define)[0]=='f'&&define.amd?define:(function(n,n2,w){'use strict';
return(typeof module)[0]=='o'?function(c){c(require,exports,module);}:
function(c){var m={exports:{}};c(function(n){w[n];},m.exports,m);
w[n]=w[n2]=m.exports;};})('FastList','fast-list',this));
