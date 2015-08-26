'use strict';

/**
 * The time, in ms, to wait for an animation to start in response to a state
 * change, before removing the associated style class.
 */
const STATE_CHANGE_TIMEOUT = 100;

/**
 * The time, in ms, to wait before initiating a drag-and-drop from a
 * long-press.
 */
const DEFAULT_DND_TIMEOUT = 200;

/**
 * The distance, in CSS pixels, in which a touch or mouse point can deviate
 * before it being discarded for initiation of a drag-and-drop action.
 */
const DND_THRESHOLD = 5;

/**
 * The minimum time between sending move events during drag-and-drop.
 */
const DND_MOVE_THROTTLE = 50;

window.GaiaContainer = (function(exports) {
  var proto = Object.create(HTMLElement.prototype);

  proto.createdCallback = function() {
    this._template = template.content.cloneNode(true);

    var shadow = this.createShadowRoot();
    shadow.appendChild(this._template);

    this._children = [];
    this._dnd = {
      // Whether drag-and-drop is enabled
      enabled: false,

      // The time, in ms, to wait before initiating a drag-and-drop from a
      // long-press
      delay: DEFAULT_DND_TIMEOUT,

      // Timeout used to initiate drag-and-drop actions
      timeout: null,

      // The child that was tapped/clicked
      child: null,

      // Whether a drag is active
      active: false,

      // The start point of the drag action
      start: { pageX: 0, pageY: 0, clientX: 0, clientY: 0 },

      // The last point of the drag action
      last: { pageX: 0, pageY: 0, clientX: 0, clientY: 0, timeStamp: 0 },

      // Timeout used to send drag-move events
      moveTimeout: null,

      // The last time a move event was fired
      lastMoveEventTime: 0,

      // Whether to capture the next click event
      clickCapture: false
    };

    var dndObserverCallback = (mutations) => {
      if (this._dnd.enabled !== this.dragAndDrop) {
        this._dnd.enabled = this.dragAndDrop;
        if (this._dnd.enabled) {
          this.addEventListener('touchstart', this);
          this.addEventListener('touchmove', this);
          this.addEventListener('touchcancel', this);
          this.addEventListener('touchend', this);
          this.addEventListener('mousedown', this);
          this.addEventListener('mousemove', this);
          this.addEventListener('mouseup', this);
          this.addEventListener('click', this, true);
          this.addEventListener('contextmenu', this, true);
        } else {
          this.cancelDrag();
          this.removeEventListener('touchstart', this);
          this.removeEventListener('touchmove', this);
          this.removeEventListener('touchcancel', this);
          this.removeEventListener('touchend', this);
          this.removeEventListener('mousedown', this);
          this.removeEventListener('mousemove', this);
          this.removeEventListener('mouseup', this);
          this.removeEventListener('click', this, true);
          this.removeEventListener('contextmenu', this, true);
        }
      }
    };
    this.dndObserver = new MutationObserver(dndObserverCallback);
    this.dndObserver.observe(this,
      { attributes: true, attributeFilter: ['drag-and-drop'] });
    dndObserverCallback(null);
  };

  Object.defineProperty(proto, 'children', {
    get: function() {
      return this._children.map((child) => {
        return child.element;
      });
    },
    enumerable: true
  });

  Object.defineProperty(proto, 'firstChild', {
    get: function() {
      return this._children.length ? this._children[0].element : null;
    },
    enumerable: true
  });

  Object.defineProperty(proto, 'lastChild', {
    get: function() {
      var length = this._children.length;
      return length ? this._children[length - 1].element : null;
    },
    enumerable: true
  });

  Object.defineProperty(proto, 'dragAndDrop', {
    get: function() {
      return this.getAttribute('drag-and-drop') !== null;
    },
    enumerable: true
  });

  Object.defineProperty(proto, 'dragAndDropTimeout', {
    get: function() {
      return this._dnd.delay;
    },
    set: function(timeout) {
      if (timeout > 0) {
        this._dnd.delay = timeout;
      }
    },
    enumerable: true
  });

  proto.realAppendChild = proto.appendChild;
  proto.appendChild = function(element, callback) {
    this.insertBefore(element, null, callback);
  };

  proto.realRemoveChild = proto.removeChild;
  proto.removeChild = function(element, callback) {
    var children = this._children;
    var childToRemove = null;

    for (var child of children) {
      if (child.element === element) {
        childToRemove = child;
        break;
      }
    }

    if (childToRemove === null) {
      throw 'removeChild called on unknown child';
    }

    this.changeState(childToRemove, 'removed', () => {
      this.realRemoveChild(childToRemove.container);
      this.realRemoveChild(childToRemove.master);

      // Find the child again. We need to do this in case the container was
      // manipulated between removing the child and this callback being reached.
      for (var i = 0, iLen = children.length; i < iLen; i++) {
        if (children[i] === childToRemove) {
          children.splice(i, 1);
          break;
        }
      }

      if (callback) {
        callback();
      }

      this.synchronise();
    });
  };

  proto.realReplaceChild = proto.replaceChild;
  proto.replaceChild = function(newElement, oldElement, callback) {
    if (!newElement || !oldElement) {
      throw 'replaceChild called with null arguments';
    }

    // Unparent the newElement if necessary (with support for gaia-container)
    if (newElement.parentNode) {
      newElement.parentNode.removeChild(newElement, () => {
        this.replaceChild(newElement, oldElement, callback);
      });
      if (newElement.parentNode) {
        return;
      }
    }

    // Remove the old child and add the new one, but don't run the removed/
    // added state changes.
    var children = this._children;

    for (var i = 0, iLen = children.length; i < iLen; i++) {
      var oldChild = children[i];
      if (oldChild.element === oldElement) {
        var newChild = new GaiaContainerChild(newElement);
        this.realInsertBefore(newChild.container, oldChild.container);
        this.realInsertBefore(newChild.master, oldChild.master);
        this.realRemoveChild(oldChild.container);
        this.realRemoveChild(oldChild.master);
        this.children.splice(i, 1, newChild);
        this.synchronise();

        if (callback) {
          callback();
        }
        return;
      }
    }

    throw 'removeChild called on unknown child';
  };

  /**
   * Reorders the given element to appear before referenceElement.
   */
  proto.reorderChild = function(element, referenceElement, callback) {
    if (!element) {
      throw 'reorderChild called with null element';
    }

    var children = this._children;
    var child = null;
    var childIndex = null;
    var referenceChild = null;
    var referenceChildIndex = null;

    for (var i = 0, iLen = children.length; i < iLen; i++) {
      if (children[i].element === element) {
        child = children[i];
        childIndex = i;
      } else if (children[i].element === referenceElement) {
        referenceChild = children[i];
        referenceChildIndex = i;
      }

      if (child && (referenceChild || !referenceElement)) {
        this.realRemoveChild(child.container);
        this.realRemoveChild(child.master);
        children.splice(childIndex, 1);

        if (referenceChild) {
          this.realInsertBefore(child.container, referenceChild.container);
          this.realInsertBefore(child.master, referenceChild.master);
        } else {
          (children.length === 0) ?
            this.realAppendChild(child.container) :
            this.realInsertBefore(child.container, children[0].master);
          this.realAppendChild(child.master);
        }

        referenceChild ?
          children.splice(
            referenceChildIndex - (childIndex < referenceChildIndex) ? 1 : 0,
            0, child) :
          children.splice(children.length, 0, child);

        this.synchronise();

        if (callback) {
          callback();
        }
        return;
      }
    }

    throw child ? 'reorderChild called on unknown reference element' :
                  'reorderChild called on unknown child';
  };

  proto.realInsertBefore = proto.insertBefore;
  proto.insertBefore = function(element, reference, callback) {
    var children = this._children;
    var childToInsert = new GaiaContainerChild(element);
    var referenceIndex = -1;

    if (reference !== null) {
      for (var i = 0, iLen = children.length; i < iLen; i++) {
        if (children[i].element === reference) {
          referenceIndex = i;
          break;
        }
      }
      if (referenceIndex === -1) {
        throw 'insertBefore called on unknown child';
      }
    }

    if (referenceIndex === -1) {
      (children.length === 0) ?
        this.realAppendChild(childToInsert.container) :
        this.realInsertBefore(childToInsert.container, children[0].master);
      this.realAppendChild(childToInsert.master);
      children.push(childToInsert);
    } else {
      this.realInsertBefore(childToInsert.container,
                            children[referenceIndex].container);
      this.realInsertBefore(childToInsert.master,
                            children[referenceIndex].master);
      children.splice(referenceIndex, 0, childToInsert);
    }

    this.changeState(childToInsert, 'added', callback);
    this.synchronise();
  };

  /**
   * Used to execute a state-change of a child that may possibly be animated.
   * @state will be added to the child's class-list. If an animation starts that
   * has the same name, that animation will complete and @callback will be
   * called. Otherwise, the class will be removed and @callback called on the
   * next frame.
   */
  proto.changeState = function(child, state, callback) {
    if (child.container.classList.contains(state)) {
      return;
    }

    var animStart = (e) => {
      if (e.animationName !== state) {
        return;
      }

      child.container.removeEventListener('animationstart', animStart);

      window.clearTimeout(child[state]);
      delete child[state];

      var self = this;
      child.container.addEventListener('animationend', function animEnd() {
        child.container.removeEventListener('animationend', animEnd);
        child.container.classList.remove(state);
        if (callback) {
          callback();
        }
        self.synchronise();
      });
    };

    child.container.addEventListener('animationstart', animStart);
    child.container.classList.add(state);

    child[state] = window.setTimeout(() => {
      delete child[state];
      child.container.removeEventListener('animationstart', animStart);
      child.container.classList.remove(state);
      if (callback) {
        callback();
      }
      this.synchronise();
    }, STATE_CHANGE_TIMEOUT);
  };

  proto.getChildOffsetRect = function(element) {
    var children = this._children;
    for (var i = 0, iLen = children.length; i < iLen; i++) {
      var child = children[i];
      if (child.element === element) {
        var top = child._lastMasterTop;
        var left = child._lastMasterLeft;
        var width = child._lastElementWidth;
        var height = child._lastElementHeight;

        return {
          top: top,
          left: left,
          width: width,
          height: height,
          right: left + width,
          bottom: top + height
        };
      }
    }

    throw 'getChildOffsetRect called on unknown child';
  };

  proto.getChildFromPoint = function(x, y) {
    var children = this._children;
    for (var parent = this.parentElement; parent;
         parent = parent.parentElement) {
      x += parent.scrollLeft - parent.offsetLeft;
      y += parent.scrollTop - parent.offsetTop;
    }
    for (var i = 0, iLen = children.length; i < iLen; i++) {
      var child = children[i];
      if (x >= child._lastMasterLeft &&
          y >= child._lastMasterTop &&
          x < child._lastMasterLeft + child._lastElementWidth &&
          y < child._lastMasterTop + child._lastElementHeight) {
        return child.element;
      }
    }

    return null;
  };

  proto.cancelDrag = function() {
    if (this._dnd.timeout !== null) {
      clearTimeout(this._dnd.timeout);
      this._dnd.timeout = null;
    }

    if (this._dnd.moveTimeout !== null) {
      clearTimeout(this._dnd.moveTimeout);
      this._dnd.moveTimeout = null;
    }

    if (this._dnd.active) {
      this._dnd.child.container.classList.remove('dragging');
      this._dnd.child.container.style.position = 'absolute';
      this._dnd.child.container.style.top = '0';
      this._dnd.child.container.style.left = '0';
      this._dnd.child.markDirty();
      this._dnd.child = null;
      this._dnd.active = false;
      this.synchronise();
      this._dnd.clickCapture = true;
      this.dispatchEvent(new CustomEvent('drag-finish'));
    }
  };

  proto.startDrag = function() {
    if (!this.dispatchEvent(new CustomEvent('drag-start',
        { cancelable: true,
          detail: { target: this._dnd.child.element,
                    pageX: this._dnd.start.pageX,
                    pageY: this._dnd.start.pageY,
                    clientX: this._dnd.start.clientX,
                    clientY: this._dnd.start.clientY } }))) {
      return;
    }

    this._dnd.active = true;
    this._dnd.child.container.classList.add('dragging');
    this._dnd.child.container.style.position = 'fixed';
    var rect = this.getBoundingClientRect();
    this._dnd.child.container.style.top = rect.top + 'px';
    this._dnd.child.container.style.left = rect.left + 'px';
  };

  proto.continueDrag = function() {
    if (!this._dnd.active) {
      return;
    }

    var left = this._dnd.child.master.offsetLeft +
      (this._dnd.last.pageX - this._dnd.start.pageX);
    var top = this._dnd.child.master.offsetTop +
      (this._dnd.last.pageY - this._dnd.start.pageY);
    this._dnd.child.container.style.transform =
      'translate(' + left + 'px, ' + top + 'px)';

    if (this._dnd.moveTimeout === null) {
      var delay = Math.max(0, DND_MOVE_THROTTLE -
        (this._dnd.last.timeStamp - this._dnd.lastMoveEventTime));
      this._dnd.moveTimeout = setTimeout(() => {
        this._dnd.moveTimeout = null;
        this._dnd.lastMoveEventTime = this._dnd.last.timeStamp;
        this.dispatchEvent(new CustomEvent('drag-move',
          { detail: { target: this._dnd.child.element,
                      pageX: this._dnd.last.pageX,
                      pageY: this._dnd.last.pageY,
                      clientX: this._dnd.last.clientX,
                      clientY: this._dnd.last.clientY } }));
      }, delay);
    }
  };

  proto.endDrag = function() {
    if (this._dnd.active) {
      var dropTarget = this.getChildFromPoint(this._dnd.last.clientX,
                                              this._dnd.last.clientY);

      if (this.dispatchEvent(new CustomEvent('drag-end',
          { cancelable: true,
            detail: { target: this._dnd.child.element,
                      dropTarget: dropTarget,
                      pageX: this._dnd.last.pageX,
                      pageY: this._dnd.last.pageY,
                      clientX: this._dnd.last.clientX,
                      clientY: this._dnd.last.clientY }}))) {
        var children = this._children;

        if (dropTarget && dropTarget !== this._dnd.child.element) {
          var dropChild = null;
          var dropIndex = -1;
          var childIndex = -1;
          var insertBefore = true;
          for (var i = 0, iLen = children.length; i < iLen; i++) {
            if (children[i] === this._dnd.child) {
              childIndex = i;
              if (!dropChild) {
                insertBefore = false;
              }
            }

            if (children[i].element === dropTarget) {
              dropChild = children[i];
              dropIndex = i;
            }

            if (dropIndex >= 0 && childIndex >= 0) {
              break;
            }
          }

          if (dropIndex >= 0 && childIndex >= 0) {
            // Default action, rearrange the dragged child to before or after
            // the child underneath the touch/mouse point.
            this.realRemoveChild(this._dnd.child.container);
            this.realRemoveChild(this._dnd.child.master);
            this.realInsertBefore(this._dnd.child.container,
              insertBefore ? dropChild.container :
                             dropChild.container.nextSibling);
            this.realInsertBefore(this._dnd.child.master,
              insertBefore ? dropChild.master :
                             dropChild.master.nextSibling);
            children.splice(dropIndex, 0,
              children.splice(childIndex, 1)[0]);
            this.dispatchEvent(new CustomEvent('drag-rearrange'));
          }
        }
      }
    } else if (this._dnd.timeout) {
      this.dispatchEvent(new CustomEvent('activate',
        { detail: { target: this._dnd.child.element } }));
    }

    this.cancelDrag();
  };

  proto.handleEvent = function(event) {
    switch (event.type) {
      case 'touchstart':
      case 'mousedown':
        if (this._dnd.active || this._dnd.timeout) {
          this.cancelDrag();
          break;
        }

        if (event instanceof MouseEvent) {
          this._dnd.start.pageX = event.pageX;
          this._dnd.start.pageY = event.pageY;
          this._dnd.start.clientX = event.pageX;
          this._dnd.start.clientY = event.pageY;
        } else {
          this._dnd.start.pageX = event.touches[0].pageX;
          this._dnd.start.pageY = event.touches[0].pageY;
          this._dnd.start.clientX = event.touches[0].clientX;
          this._dnd.start.clientY = event.touches[0].clientY;
        }

        this._dnd.last.pageX = this._dnd.start.pageX;
        this._dnd.last.pageY = this._dnd.start.pageY;
        this._dnd.last.clientX = this._dnd.start.clientX;
        this._dnd.last.clientY = this._dnd.start.clientY;
        this._dnd.last.timeStamp = event.timeStamp;

        var target = event.target;
        for (; target.parentNode !== this; target = target.parentNode) {
          if (target === this || !target.parentNode) {
            return;
          }
        }

        // Find the child
        var children = this._children;
        for (var child of children) {
          if (child.container === target) {
            this._dnd.child = child;
            break;
          }
        }

        if (!this._dnd.child) {
          return;
        }

        this._dnd.timeout = setTimeout(() => {
          this._dnd.timeout = null;
          this.startDrag();
        }, this._dnd.delay);
        break;

      case 'touchmove':
      case 'mousemove':
        var pageX, pageY, clientX, clientY;
        if (event instanceof MouseEvent) {
          pageX = event.pageX;
          pageY = event.pageY;
          clientX = event.clientX;
          clientY = event.clientY;
        } else {
          pageX = event.touches[0].pageX;
          pageY = event.touches[0].pageY;
          clientX = event.touches[0].clientX;
          clientY = event.touches[0].clientY;
        }

        if (this._dnd.timeout) {
          if (Math.abs(pageX - this._dnd.start.pageX) > DND_THRESHOLD ||
              Math.abs(pageY - this._dnd.start.pageY) > DND_THRESHOLD) {
            clearTimeout(this._dnd.timeout);
            this._dnd.timeout = null;
          }
        } else if (this._dnd.active) {
          event.preventDefault();
          this._dnd.last.pageX = pageX;
          this._dnd.last.pageY = pageY;
          this._dnd.last.clientX = clientX;
          this._dnd.last.clientY = clientY;
          this._dnd.last.timeStamp = event.timeStamp;
          this.continueDrag();
        }
        break;

      case 'touchcancel':
        this.cancelDrag();
        break;

      case 'touchend':
      case 'mouseup':
        if (this._dnd.active) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        this.endDrag();
        break;

      case 'click':
        if (this._dnd.clickCapture) {
          this._dnd.clickCapture = false;
          event.preventDefault();
          event.stopImmediatePropagation();
        }
        break;

      case 'contextmenu':
        if (this._dnd.active || this._dnd.timeout) {
          event.stopImmediatePropagation();
          event.preventDefault();
        }
        break;
    }
  };

  /**
   * Synchronise positions between the managed container and all children.
   * This is called automatically when adding/inserting or removing children,
   * but must be called manually if the managed container is manipulated
   * outside of these methods (for example, if style properties change, or
   * if it's resized).
   */
  proto.synchronise = function() {
    var child;
    for (child of this._children) {
      if (!this._dnd.active || child !== this._dnd.child) {
        child.synchroniseMaster();
      }
    }

    for (child of this._children) {
      if (!this._dnd.active || child !== this._dnd.child) {
        child.synchroniseContainer();
      }
    }
  };

  var template = document.createElement('template');

  template.innerHTML =
    `<style>gaia-container { position: relative; display: block; }</style>
     <content select='*'></content>`;

  function GaiaContainerChild(element) {
    this._element = element;
    this._lastElementWidth = 0;
    this._lastElementHeight = 0;
    this._lastElementDisplay = 0;
    this._lastMasterTop = 0;
    this._lastMasterLeft = 0;
  }

  GaiaContainerChild.prototype = {
    get element() {
      return this._element;
    },

    /**
     * The element that will contain the child element and control its position.
     */
    get container() {
      if (!this._container) {
        // Create container
        var container = document.createElement('div');
        container.classList.add('gaia-container-child');
        container.style.position = 'absolute';
        container.style.top = '0';
        container.style.left = '0';
        container.appendChild(this.element);
        this._container = container;
      }

      return this._container;
    },

    /**
     * The element that will be added to the container that will
     * control the element's transform.
     */
    get master() {
      if (!this._master) {
        // Create master
        var master = document.createElement('div');
        master.style.visibility = 'hidden';
        this._master = master;
      }

      return this._master;
    },

    /**
     * Clears any cached style properties. To be used if elements are
     * manipulated outside of the methods of this object.
     */
    markDirty() {
      this._lastElementWidth = null;
      this._lastElementHeight = null;
      this._lastElementDisplay = null;
      this._lastMasterTop = null;
      this._lastMasterLeft = null;
    },

    /**
     * Synchronise the size of the master with the managed child element.
     */
    synchroniseMaster() {
      var master = this.master;
      var element = this.element;

      var display = window.getComputedStyle(element).display;
      var width = element.offsetWidth;
      var height = element.offsetHeight;
      if (this._lastElementWidth !== width ||
          this._lastElementHeight !== height ||
          this._lastElementDisplay !== display) {
        this._lastElementWidth = width;
        this._lastElementHeight = height;
        this._lastElementDisplay = display;

        master.style.width = width + 'px';
        master.style.height = height + 'px';
        master.style.display = display;
      }
    },

    /**
     * Synchronise the container's transform with the position of the master.
     */
    synchroniseContainer() {
      var master = this.master;
      var container = this.container;

      var top = master.offsetTop;
      var left = master.offsetLeft;

      if (this._lastMasterTop !== top ||
          this._lastMasterLeft !== left) {
        this._lastMasterTop = top;
        this._lastMasterLeft = left;

        container.style.transform = 'translate(' + left + 'px, ' + top + 'px)';
      }
    }
  };

  exports.GaiaContainerChild = GaiaContainerChild;

  return document.registerElement('gaia-container', { prototype: proto });
})(window);
