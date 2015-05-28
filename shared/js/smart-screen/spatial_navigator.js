'use strict';
/* global evt */

(function(exports) {
  /**
   * SpatialNavigator simulates four-direction navigation in Javascript level.
   *
   * Navigation is the ability to navigate between focusable elements
   * within a structured document or user interface according to the spatial
   * location. Users are assumed navigating among elements on a 2D plane by
   * arrow keys (up/down/left/right).
   *
   * SpatialNavigator keeps a 'focused' element by itself. When navigating,
   * focus/unfocus events are triggered automatically. Notice the focus is just
   * an internal state rather than actual focus of DOM Element. User should
   * add event listeners of those events, and design required behaviors.
   *
   * @class SpatialNavigator
   * @param {Array.<SpatialNavigatorElement>} [collection=[]]
   *        An initial set of traversable elements.
   * @param {Object} [config]
   *        An initial set of configurations.
   */
  /**
   * SpatialNavigatorElement is a navigable element which can be traversed
   * by {@link SpatialNavigator}. Valid types are as follows:
   *
   *  1. a standard HTMLElement.
   *  2. an Object contains at least 4 properties: left, top, width, and height.
   *  3. an Object implementing getBoundingRect() which returns an object of 2.
   *
   * @typedef {Object} SpatialNavigatorElement
   */
  /**
   * Fired when an element is focused.
   * @event SpatialNavigator#focus
   * @property {SpatialNavigatorElement} elem    The element which got focus.
   */
  /**
   * Fired when an element is unfocused.
   * @event SpatialNavigator#unfocus
   * @property {SpatialNavigatorElement} elem    The element which lost focus.
   */
  function SpatialNavigator(collection, config) {
    this._focus = null;
    this._previous = null;

    this.setCollection(collection);

    if (config) {
      for (var key in config) {
        this[key] = config[key];
      }
    }
  }

  SpatialNavigator.prototype = evt({
    /**
     * Limit the navigating direction to vertical and horizontal only. Targets
     * in oblique (left-top, right-top, left-bottom, and right-bottom)
     * directions are always ignored.
     * @type {Boolean}
     * @default false
     * @memberof SpatialNavigator.prototype
     */
    straightOnly: false,

    /**
     * This threshold is used to determine whether an element is considered in
     * straight (vertical or horizontal) directions. Valid number is between 0
     * to 1.0. Setting it to 0.3 means an element is counted in the straight
     * directions if it overlaps the straight area at least 0.3x of width of the
     * area.
     * @type {Number}
     * @default 0.5
     * @memberof SpatialNavigator.prototype
     */
    straightOverlapThreshold: 0.5,

    /**
     * Ignore elements with style "display: none" or "visibility: hidden".
     * @type {Boolean}
     * @default false
     * @memberof SpatialNavigator.prototype
     */
    ignoreHiddenElement: false,

    /**
     * The previous focused element has high priority to be chosen as the next
     * candidate.
     * @type {Boolean}
     * @default false
     * @memberof SpatialNavigator.prototype
     */
    rememberSource: false,

    /**
     * Rect represents position and dimension of a 2D object.
     * @typedef {Object} Rect
     * @property {Integer} left     Left position
     * @property {Integer} top      Top position
     * @property {Integer} right    Right position
     * @property {Integer} bottom   Bottom position
     * @property {Integer} width    Width dimension
     * @property {Integer} height   Height dimension
     * @property {Rect}    [center] Center position
     * @property {Integer} [x]      same as left
     * @property {Integer} [y]      same as top
     * @access private
     * @memberof SpatialNavigator.prototype
     */
    /**
     * Get {@link Rect} of a {@link SpatialNavigatorElement}.
     *
     * @param {SpatialNavigatorElement} elem
     *
     * @return {Rect} dimension of elem.
     *
     * @access private
     * @memberof SpatialNavigator.prototype
     */
    _getRect: function snGetRect(elem) {
      var rect = null;

      if (this.ignoreHiddenElement && elem instanceof HTMLElement) {
        var computedStyle = window.getComputedStyle(elem);
        if (computedStyle.getPropertyValue('visibility') == 'hidden' ||
            computedStyle.getPropertyValue('display') == 'none') {
          return null;
        }
      }

      if (elem.getBoundingClientRect) {
        var cr = elem.getBoundingClientRect();
        rect = {
          left: cr.left,
          top: cr.top,
          width: cr.width,
          height: cr.height
        };
      } else if (elem.left !== undefined) {
        rect = {
          left: parseInt(elem.left || 0, 10),
          top: parseInt(elem.top || 0, 10),
          width: parseInt(elem.width || 0, 10),
          height: parseInt(elem.height || 0, 10)
        };
      } else {
        return null;
      }

      rect.element = elem;
      rect.right = rect.left + rect.width;
      rect.bottom = rect.top + rect.height;
      rect.center = {
        x: rect.left + Math.floor(rect.width / 2),
        y: rect.top + Math.floor(rect.height / 2)
      };
      rect.center.left = rect.center.right = rect.center.x;
      rect.center.top = rect.center.bottom = rect.center.y;

      return rect;
    },

    /**
     * Get all {@link Rect} objects from the collection.
     *
     * @param {SpatialNavigatorElement} [excludedElem]
     *        You can pass excludedElem here to ignore it from calculating.
     *        (most likely, the currently focused element is passed).
     *
     * @return {Array.<Rect>} {@link Rect} objects of all traversable elements.
     *
     * @access private
     * @memberof SpatialNavigator.prototype
     */
    _getAllRects: function snGetAllRects(excludedElem) {
      var rects = [];

      this._collection.forEach(function(elem) {
        if (!excludedElem || excludedElem !== elem) {
          var rect = this._getRect(elem);
          if (rect) {
            rects.push(rect);
          }
        }
      }, this);

      return rects;
    },

    /**
     * Given a set of {@link Rect} array, divide them into 9 groups with
     * respect to the position of targetRect. Rects centered inside targetRect
     * are grouped as 4th group; straight left as 3rd group; straight right as
     * 5th group; ..... and so on. See below for the corresponding group number:
     *
     * <pre>
     *  |---+---+---|
     *  | 0 | 1 | 2 |
     *  |---+---+---|
     *  | 3 | 4 | 5 |
     *  |---+---+---|
     *  | 6 | 7 | 8 |
     *  |---+---+---|
     * </pre>
     *
     * @param {Array.<Rect>} rects
     *        {@link RectS} to be divided.
     * @param {Rect} targetRect
     *         Reference position for groups.
     *
     * @return {Array.Array.<SpatialNavigatorElement>}
     *         A 9-elements array of array, where rects are categorized into
     *         these 9 arrays by their group number.
     *
     * @access private
     * @memberof SpatialNavigator.prototype
     *
     */
    _partition: function snDemarcate(rects, targetRect) {
      var groups = [[], [], [], [], [], [], [], [], []];

      var threshold = this.straightOverlapThreshold;
      if (threshold > 1 || threshold < 0) {
        // Fallback to default value
        threshold = 0.5;
      }

      rects.forEach(function(rect) {
        var center = rect.center;
        var x, y, groupId;

        if (center.x < targetRect.left) {
          x = 0;
        } else if (center.x <= targetRect.right) {
          x = 1;
        } else {
          x = 2;
        }

        if (center.y < targetRect.top) {
          y = 0;
        } else if (center.y <= targetRect.bottom) {
          y = 1;
        } else {
          y = 2;
        }

        groupId = y * 3 + x;
        groups[groupId].push(rect);

        // Although a rect is in the oblique directions, we categorize it in
        // the straight area as well if it overlaps the straight directions more
        // than a specified threshold (0.5 by default).
        if ([0, 2, 6, 8].indexOf(groupId) !== -1) {
          if (rect.left <= targetRect.right - targetRect.width * threshold) {
            if (groupId === 2) {
              groups[1].push(rect);
            } else if (groupId === 8) {
              groups[7].push(rect);
            }
          }

          if (rect.right >= targetRect.left + targetRect.width * threshold) {
            if (groupId === 0) {
              groups[1].push(rect);
            } else if (groupId === 6) {
              groups[7].push(rect);
            }
          }

          if (rect.top <= targetRect.bottom - targetRect.height * threshold) {
            if (groupId === 6) {
              groups[3].push(rect);
            } else if (groupId === 8) {
              groups[5].push(rect);
            }
          }

          if (rect.bottom >= targetRect.top + targetRect.height * threshold) {
            if (groupId === 0) {
              groups[3].push(rect);
            } else if (groupId === 2) {
              groups[5].push(rect);
            }
          }
        }
      });

      return groups;
    },

    /**
     * Bind targetRect to a set of distance functions for ranking. These
     * functions work with another {@link Rect} object passed to get a ranking
     * value relative to targetRect.
     *
     * @param {Rect} targetRect
     *
     * @return {Object.<function>}
     *         An object containing a bunch of functions bound with targetRect.
     *
     * @access private
     * @memberof SpatialNavigator.prototype
     */
    _getDistanceFunction: function snGetDistanceFunction(targetRect) {
      return {
        /* Plumb Line: a vertical line through the center of the
           targetRect. */
        nearPlumbLineIsBetter: function(rect) {
          var d;
          if (rect.center.x < targetRect.center.x) {
            d = targetRect.center.x - rect.right;
          } else {
            d = rect.left - targetRect.center.x;
          }
          return d < 0 ? 0 : d;
        },

        /* Horizon: a horizontal line through the center of the
           "targetRect". */
        nearHorizonIsBetter: function(rect) {
          var d;
          if (rect.center.y < targetRect.center.y) {
            d = targetRect.center.y - rect.bottom;
          } else {
            d = rect.top - targetRect.center.y;
          }
          return d < 0 ? 0 : d;
        },

        /* Target Left: a coincident line of the left edge of the
           "targetRect". */
        nearTargetLeftIsBetter: function(rect) {
          var d;
          if (rect.center.x < targetRect.center.x) {
            d = targetRect.left - rect.right;
          } else {
            d = rect.left - targetRect.left;
          }
          return d < 0 ? 0 : d;
        },

        /* Target Top: a coincident line of the top edge of the
           "targetRect". */
        nearTargetTopIsBetter: function(rect) {
          var d;
          if (rect.center.y < targetRect.center.y) {
            d = targetRect.top - rect.bottom;
          } else {
            d = rect.top - targetRect.top;
          }
          return d < 0 ? 0 : d;
        },

        /* top, bottom, left, and right: Just ranking by absolute coordinate
           without respect to targetRect. Usually they are used as fallback
           rules when ranks above are draw. */
        topIsBetter: function(rect) {
          return rect.top;
        },
        bottomIsBetter: function(rect) {
          return -1 * rect.bottom;
        },
        leftIsBetter: function(rect) {
          return rect.left;
        },
        rightIsBetter: function(rect) {
          return -1 * rect.right;
        }
      };
    },

    /**
     * PrioritySet contains a set of elements with distance functions that
     * should be used to rank them (obtained from {@link
     * SpatialNavigator#_getDistanceFunction}).
     *
     * @typedef PrioritySet
     * @property {Array.<Rects>} group
     *           {@link Rects} of elements that need to be prioritized.
     * @property {Array.<function>} distance
     *           Distance functions. Primary ranking rule should be put in index
     *           0; secondary in index 1 (fallback rule when primary rule draws
     *           ); and so on.
     * @access private
     * @memberof SpatialNavigator.prototype
     */
    /**
     * Pick a {@link Rect} with highest priority.
     *
     * @param {Array.<PrioritySet>} priorities
     *        An array of {@link PrioritySet} that need to be prioritized. The
     *        set with lowest index containing non-empty {PrioritySet.group}
     *        would be prioritized.
     * @param {SpatialNavigatorElement} target
     *        The origin of coordinates for traversal.
     * @param {String} direction
     *        It should be "left", "right", "up" or "down".
     *
     * @return {Rect} the {@link Rect} of highest priority.
     *
     * @access private
     * @memberof SpatialNavigator.prototype
     */
    _prioritize: function snPrioritize(priorities, target, direction) {
      var destPriority = priorities.find(function(p) {
        return !!p.group.length;
      });

      if (!destPriority) {
        return null;
      }

      if (this.rememberSource &&
          this._previous &&
          target == this._previous.destination &&
          direction == this._previous.reverse) {

        var source = this._previous.source;
        var found = destPriority.group.find(function(dest) {
          return dest.element == source;
        });
        if (found) {
          return found;
        }
      }

      destPriority.group.sort(function(a, b) {
        return destPriority.distance.reduce(function(answer, distance) {
          return answer || (distance(a) - distance(b));
        }, 0);
      });

      return destPriority.group[0];
    },

    /**
     * Replace the set of traversable elements.
     *
     * @param  {Array.<SpatialNavigatorElement>} [collection=[]]
               elements to be replaced. The array is deep-copied and never
               be changed directly by SpatialNavigator.
     *
     * @fires SpatialNavigator#unfocus
     * @memberof SpatialNavigator.prototype
     */
    setCollection: function snSetCollection(collection) {
      this.unfocus();
      this._collection = [];
      if (collection) {
        this.multiAdd(collection);
      }
    },

    /**
     * Add an element to traversable set.
     *
     * @param  {SpatialNavigatorElement} elem
     * @return {Boolean} true if succeed.
     *
     * @memberof SpatialNavigator.prototype
     */
    add: function snAdd(elem) {
      var index = this._collection.indexOf(elem);
      if (index >= 0) {
        return false;
      }
      this._collection.push(elem);
      return true;
    },

    /**
     * Add a bunch of elements to traversable set.
     *
     * @param  {Array.<SpatialNavigatorElement>} elements
     * @return {Boolean} true if all elements are added successfully.
     *
     * @memberof SpatialNavigator.prototype
     */
    multiAdd: function snMultiAdd(elements) {
      return Array.from(elements).every(this.add, this);
    },

    /**
     * Remove an element from traversable set.
     *
     * @param {SpatialNavigatorElement} elem
     * @return {Boolean} true if succeed. false if elem does not exist.
     *
     * @fires SpatialNavigator#unfocus
     * @memberof SpatialNavigator.prototype
     */
    remove: function snRemove(elem) {
      var index = this._collection.indexOf(elem);
      if (index < 0) {
        return false;
      }

      if (this._focus === elem) {
        this.unfocus();
      }

      this._collection.splice(index, 1);
      return true;
    },

    /**
     * Remove a bunch of elements to traversable set.
     *
     * @param  {Array.<SpatialNavigatorElement>} elements
     * @return {Boolean} true if all elements are removed successfully.
     *
     * @memberof SpatialNavigator.prototype
     */
    multiRemove: function snMultiRemove(elements) {
      return Array.from(elements).every(this.remove, this);
    },

    /**
     * Move focus to an existing element.
     *
     * @param  {SpatialNavigatorElement} [elem]
     *         when omitted, it focused the first element.
     *
     * @return {Boolean} true if succeed. false if element doesn't exist.
     *
     * @fires SpatialNavigator#focus
     * @fires SpatialNavigator#unfocus
     * @memberof SpatialNavigator.prototype
     */
    focus: function snFocus(elem) {
      if (this.focusSilently(elem)) {
        this.fire('focus', this._focus);
        return true;
      } else {
        return false;
      }
    },

    /**
     * Move focus to an existing element but without firing any events. Can be
     * used on initializing.
     *
     * @param  {SpatialNavigatorElement} [elem]
     *         when omitted, it focused the first element.
     *
     * @return {Boolean} true if succeed. false if element doesn't exist.
     *
     * @memberof SpatialNavigator.prototype
     */
    focusSilently: function snFocusSliently(elem) {
      if (!this._collection) {
        return false;
      }

      if (!elem) {
        elem = this._collection[0];
      } else if (this._collection.indexOf(elem) < 0) {
        return false;
      }

      this.unfocus();
      this._focus = elem;
      return true;
    },

    /**
     * Remove focus if any.
     *
     * It will trigger "unfocus" event.
     *
     * @return {Boolean} succeed or not.
     *
     * @fires SpatialNavigator#unfocus
     * @memberof SpatialNavigator.prototype
     */
    unfocus: function snUnfocus() {
      if (this._focus) {
        var elem = this._focus;
        this._focus = null;
        this.fire('unfocus', elem);
      }
      return true;
    },

    /**
     * Get the currently focused element.
     *
     * @return {SpatialNavigatorElement} or null if nothing focused.
     *
     * @memberof SpatialNavigator.prototype
     */
    getFocusedElement: function snGetFocusedElement() {
      return this._focus;
    },

    /**
     * Given a direction, find the element nearest to the focus element in that
     * direction. This is equivalent to {@link SpatialNavigator#navigate} with
     * focused element passed as target.
     *
     * @param {String} direction
     *        It should be "left", "right", "up" or "down".
     *
     * @return {Boolean} true if succeed, false if nothing can be focused.
     *
     * @memberof SpatialNavigator.prototype
     */
    move: function snMove(direction) {
      var reverse = {
          'left': 'right',
          'up': 'down',
          'right': 'left',
          'down': 'up'
      };

      if (!this._focus) {
        this._previous = null;
        this.focus();
      } else {
        var elem = this.navigate(this._focus, direction);
        if (!elem) {
          return false;
        }
        if (this.rememberSource) {
          this._previous = {
            source: this._focus,
            destination: elem,
            reverse: reverse[direction.toLowerCase()]
          };
        }
        this.unfocus();
        this.focus(elem);
      }
      return true;
    },

    /**
     * Given a direction, find an element nearest to the target element in that
     * direction.
     *
     * @param {SpatialNavigatorElement} target
     *        The origin of coordinates for traversal.
     * @param {String} direction
     *        It should be "left", "right", "up" or "down".
     *
     * @return {SpatialNavigatorElement}
     *         The destination of the element which has the highest priority.
     *
     * @memberof SpatialNavigator.prototype
     */
    navigate: function snNavigate(target, direction) {
      if (!target || !direction || !this._collection) {
        return null;
      }

      direction = direction.toLowerCase();

      var rects = this._getAllRects(target);
      var targetRect = this._getRect(target);
      if (!targetRect || !rects.length) {
        return null;
      }

      /* Get distance functions for ranking priorities relative to targetRect */
      var distanceFunction = this._getDistanceFunction(targetRect);

      /* Candidate {@link Rect}s are divided into nine regions based on its
         position with respect to targetRect. */
      var groups = this._partition(rects, targetRect);

      /* {@link Rect}s in group 4 overlaps with targetRect. We distribute them
         further into 9 regions based on its position with respect to the
         center point of targetRect. */
      var internalGroups = this._partition(groups[4], targetRect.center);

      /* priorities: This big array carrys candidate elements with related
       * distance functions by appropriate priority we want. Depenging on the
       * direction, 3 kinds of elements are added separately in the following
       * order:
       *
       *   - 1st: candidates centered inside targetRect (group 4)
       *          (so we pick up corresponding internalGroups).
       *   - 2nd: in groups of straight direction (group 1, 3, 5, 7).
       *   - 3rd: in groups of oblique direction (group 0, 2, 6, 8).
       *
       * For each kind of element above, ranking is performed by the following
       * rules (distance functions) in order:
       *
       *   - 1st: distance between candidate and target.
       *   - 2nd: absolute coordinate of candidates.
       *   - 3rd: distance of left or top coordinate between candidate and
       *          target (for oblique direction only)
       *
       * The switch...case block below is just to construct this array.
       * We just pick the required order into array here, then call
       * {SpatialNavigator#_prioritize} to do the trick.
       */
      var priorities;

      switch (direction) {
        case 'left':
          priorities = [
            {
              group: internalGroups[0].concat(internalGroups[3])
                                       .concat(internalGroups[6]),
              distance: [
                distanceFunction.nearPlumbLineIsBetter,
                distanceFunction.topIsBetter
              ]
            },
            {
              group: groups[3],
              distance: [
                distanceFunction.nearPlumbLineIsBetter,
                distanceFunction.topIsBetter
              ]
            },
            {
              group: groups[0].concat(groups[6]),
              distance: [
                distanceFunction.nearHorizonIsBetter,
                distanceFunction.rightIsBetter,
                distanceFunction.nearTargetTopIsBetter
              ]
            }
          ];
          break;
        case 'right':
          priorities = [
            {
              group: internalGroups[2].concat(internalGroups[5])
                                       .concat(internalGroups[8]),
              distance: [
                distanceFunction.nearPlumbLineIsBetter,
                distanceFunction.topIsBetter
              ]
            },
            {
              group: groups[5],
              distance: [
                distanceFunction.nearPlumbLineIsBetter,
                distanceFunction.topIsBetter
              ]
            },
            {
              group: groups[2].concat(groups[8]),
              distance: [
                distanceFunction.nearHorizonIsBetter,
                distanceFunction.leftIsBetter,
                distanceFunction.nearTargetTopIsBetter
              ]
            }
          ];
          break;
        case 'up':
          priorities = [
            {
              group: internalGroups[0].concat(internalGroups[1])
                                       .concat(internalGroups[2]),
              distance: [
                distanceFunction.nearHorizonIsBetter,
                distanceFunction.leftIsBetter
              ]
            },
            {
              group: groups[1],
              distance: [
                distanceFunction.nearHorizonIsBetter,
                distanceFunction.leftIsBetter
              ]
            },
            {
              group: groups[0].concat(groups[2]),
              distance: [
                distanceFunction.nearPlumbLineIsBetter,
                distanceFunction.bottomIsBetter,
                distanceFunction.nearTargetLeftIsBetter
              ]
            }
          ];
          break;
        case 'down':
          priorities = [
            {
              group: internalGroups[6].concat(internalGroups[7])
                                       .concat(internalGroups[8]),
              distance: [
                distanceFunction.nearHorizonIsBetter,
                distanceFunction.leftIsBetter
              ]
            },
            {
              group: groups[7],
              distance: [
                distanceFunction.nearHorizonIsBetter,
                distanceFunction.leftIsBetter
              ]
            },
            {
              group: groups[6].concat(groups[8]),
              distance: [
                distanceFunction.nearPlumbLineIsBetter,
                distanceFunction.topIsBetter,
                distanceFunction.nearTargetLeftIsBetter
              ]
            }
          ];
          break;
        default:
          return null;
      }

      if (this.straightOnly) {
        // Ignore candidates in oblique direction.
        priorities.pop();
      }

      var dest = this._prioritize(priorities, target, direction);
      if (!dest) {
        return null;
      }

      return dest.element;
    }
  });

  exports.SpatialNavigator = SpatialNavigator;
})(window);
