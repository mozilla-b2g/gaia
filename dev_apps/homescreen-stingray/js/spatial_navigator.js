'use strict';
/* global evt */

(function(exports) {
  /**
   * SpatialNavigator Element
   *
   * An element that you want to let SpatialNavigator can navigate to.
   *
   * It can be a DOM element, custom element (with left/top/width/height
   * properties), array (with first 4 elements indicates
   * left/top/width/height) or any other types which you can describe its
   * position and size by {@link SpatialNavigatorRectCalcFunc}.
   *
   * @typedef {Object} SpatialNavigatorElement
   */

  /**
   * SpatialNavigator Rect Calculating Function
   *
   * A callback function which can describe the position and size of a
   * {@link SpatialNavigatorElement}.
   *
   * @callback SpatialNavigatorRectCalcFunc
   * @param {SpatialNavigatorElement} element
   * @return {Object} An object contains "left/top/width/height" properties or
   *                  "null" if you prefer using default rules of
   *                  SpatialNavigator.
   */

  /**
   * SpatialNavigator is a helper for simulating spatial navigation in
   * javascript level.
   *
   * Spatial navigation is the ability to navigate between focusable elements
   * within a structured document or user interface according to the spatial
   * location. It uses the arrow keys to navigate on the "2D plane" of the
   * interface.
   *
   * @class SpatialNavigator
   * @param {Array} [collection=[]]
   *        An initial set of {@link SpatialNavigatorElement} for traversal.
   * @param {SpatialNavigatorRectCalcFunc} [rectCalcFunc=null]
   *        A callback function which can describe the position and size of
   *        each {@link SpatialNavigatorElement}.
   */
  function SpatialNavigator(collection, rectCalcFunc) {
    this._collection = null;
    this._rectCalcFunc = null;
    this._focus = null;

    this.setRectCalcFunc(rectCalcFunc);
    this.setCollection(collection);
  }

  SpatialNavigator.prototype = evt({
    /**
     * Limit the navigating direction to vertical and horizontal only.
     * @type {Boolean}
     * @memberof SpatialNavigator.prototype
     */
    crossOnly: false,

    /**
     * Get the "rect" object from a {@link SpatialNavigatorElement}.
     *
     * It tries to calculate with {@link SpatialNavigatorRectCalcFunc} first. If
     * "rectCalcFunc" is omitted or returns "null", the fallback rules will be
     * involved then.
     *
     * @access private
     * @param  {SpatialNavigatorElement} elem The element you want to calculate.
     * @return {Object} A "rect" object which contains all coordinate-related
     *                  properties.
     * @memberof SpatialNavigator.prototype
     */
    _getRect: function snGetRect(elem) {
      var rect = null;

      if (this._rectCalcFunc) {
        rect = this._rectCalcFunc(elem);
      }

      if (!rect) {
        if (elem.getBoundingClientRect) {
          var cr = elem.getBoundingClientRect();
          rect = {
            left: cr.left,
            top: cr.top,
            width: cr.width,
            height: cr.height
          };
        } else if (elem.left || elem.top) {
          rect = {
            left: parseInt(elem.left || 0, 10),
            top: parseInt(elem.top || 0, 10),
            width: parseInt(elem.width || 0, 10),
            height: parseInt(elem.height || 0, 10)
          };
        } else if (Array.isArray(elem) && elem.length >= 4) {
          rect = {
            left: parseInt(elem[0], 10),
            top: parseInt(elem[1], 10),
            width: parseInt(elem[2], 10),
            height: parseInt(elem[3], 10)
          };
        } else {
          rect = {
            left: 0,
            top: 0,
            width: 0,
            height: 0
          };
        }
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
     * Get all "rect" objects from the collection.
     *
     * You can pass "exclusive_elem" as the first argument to ignore it from
     * calculating (usually pass the "target" element here).
     *
     * @access private
     * @param  {SpatialNavigatorElement} [exclusive_elem]
     *         The element you want to ignore from calculating.
     * @return {Array} An array contains all "rect" objects.
     * @memberof SpatialNavigator.prototype
     */
    _getAllRects: function snGetAllRects(exclusive_elem) {
      var self = this;
      var rects = [];

      this._collection.forEach(function(elem) {
        if (!exclusive_elem || exclusive_elem !== elem) {
          rects.push(self._getRect(elem));
        }
      });

      return rects;
    },

    /**
     * Partition all "rect" objects into nine groups based on "target_rect" as
     * below:
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
     * ("target_rect" will be located in group 4)
     *
     * @access private
     * @param  {Array} rects The "rect" objects that you want to partition.
     * @param  {Object} target_rect The groups will be partitioned base on this
     *                              "rect" object.
     * @return {Array} An array with nine elements which stand for nine groups.
     * @memberof SpatialNavigator.prototype
     */
    _partition: function snDemarcate(rects, target_rect) {
      var groups = [[], [], [], [], [], [], [], [], []];

      rects.forEach(function(rect) {
        var center = rect.center;
        var x, y, group_id;

        if (center.x < target_rect.left) {
          x = 0;
        } else if (center.x <= target_rect.right) {
          x = 1;
        } else {
          x = 2;
        }

        if (center.y < target_rect.top) {
          y = 0;
        } else if (center.y <= target_rect.bottom) {
          y = 1;
        } else {
          y = 2;
        }

        group_id = y * 3 + x;
        groups[group_id].push(rect);
      });

      return groups;
    },

    /**
     * A function set based on "target_rect" for calculating priority.
     *
     * @access private
     * @param  {Object} target_rect The formulas will refer to this "rect"
     *                              object.
     * @return {Object} A object contains each functions.
     * @memberof SpatialNavigator.prototype
     */
    _getDistanceFunction: function snGetDistanceFunction(target_rect) {
      return {
        /* Plumb Line: a vertical line through the center of the
           "target_rect". */
        nearPlumbLineIsBetter: function(rect) {
          var d;
          if (rect.center.x < target_rect.center.x) {
            d = target_rect.center.x - rect.right;
          } else {
            d = rect.left - target_rect.center.x;
          }
          return d < 0 ? 0 : d;
        },

        /* Horizon: a horizontal line through the center of the
           "target_rect". */
        nearHorizonIsBetter: function(rect) {
          var d;
          if (rect.center.y < target_rect.center.y) {
            d = target_rect.center.y - rect.bottom;
          } else {
            d = rect.top - target_rect.center.y;
          }
          return d < 0 ? 0 : d;
        },

        /* Target Left: a coincident line of the left edge of the
           "target_rect". */
        nearTargetLeftIsBetter: function(rect) {
          var d;
          if (rect.center.x < target_rect.center.x) {
            d = target_rect.left - rect.right;
          } else {
            d = rect.left - target_rect.left;
          }
          return d < 0 ? 0 : d;
        },

        /* Target Top: a coincident line of the top edge of the
           "target_rect". */
        nearTargetTopIsBetter: function(rect) {
          var d;
          if (rect.center.y < target_rect.center.y) {
            d = target_rect.top - rect.bottom;
          } else {
            d = rect.top - target_rect.top;
          }
          return d < 0 ? 0 : d;
        },

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
     * To pick out a "rect" object with highest priority.
     *
     * @access private
     * @param  {Array} priorities An order of priority set for traversal.
     * @return {Object} A "rect" object which has the highest priority.
     * @memberof SpatialNavigator.prototype
     */
    _prioritize: function snPrioritize(priorities) {
      var dest_group = null;
      var distance = [];

      for (var i = 0; i < priorities.length; i++) {
        var p = priorities[i];
        if (p.group.length) {
          dest_group = p.group;
          distance = p.distance;
          break;
        }
      }

      if (!dest_group) {
        return null;
      }

      dest_group.sort(function(a, b) {
        for (var i = 0; i < distance.length; i++) {
          var d = distance[i](a) - distance[i](b);
          if (d) {
            return d;
          }
        }
        return 0;
      });

      return dest_group[0];
    },

    /**
     * Set {@link SpatialNavigatorRectCalcFunc} for SpatialNavigator.
     *
     * @param  {SpatialNavigatorRectCalcFunc} [rectCalcFunc=null]
     *         A callback function that SpatialNavigator can calculate the
     *         position and size of any type of elements which you provide.
     * @memberof SpatialNavigator.prototype
     */
    setRectCalcFunc: function snSetRectCalcFunc(rectCalcFunc) {
      this._rectCalcFunc = rectCalcFunc || null;
    },

    /**
     * Set the collection for traversal.
     *
     * SpatialNavigator creates a new array to maintain the elements instead of
     * keeping the original array you passed in. the "unfocus" method will be
     * called automatically if there is a focused element.
     *
     * @param  {Array} [collection=[]]
     *         A collection of {@link SpatialNavigatorElement}.
     * @memberof SpatialNavigator.prototype
     */
    setCollection: function snSetCollection(collection) {
      this.unfocus();
      this._collection = collection ? [].concat(collection) : [];
    },

    /**
     * Add an element.
     *
     * @param  {SpatialNavigatorElement} elem
     * @return {Boolean} true if succeed.
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
     * Remove an element.
     *
     * the "unfocus" method will be called automatically if it is the current
     * focused element.
     *
     * @param  {SpatialNavigatorElement} elem
     * @return {Boolean} true if succeed. false if it doesn't exist.
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
     * Move focus to an exist element.
     *
     * It will trigger "focus" event. The first element will be focused if
     * the argument "elem" is omitted.
     *
     * @param  {SpatialNavigatorElement} [elem]
     * @return {Boolean} true if succeed. false if it doesn't exist.
     * @memberof SpatialNavigator.prototype
     */
    focus: function snFocus(elem) {
      if (!this._collection) {
        return false;
      }

      if (!elem) {
        elem = this._collection[0];
      } else if (this._collection.indexOf(elem) < 0) {
        return false;
      }

      this._focus = elem;
      this.fire('focus', elem);
      return true;
    },

    /**
     * Remove focus if any.
     *
     * It will trigger "unfocus" event.
     *
     * @return {Boolean} true if succeed.
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
     * Get the current focused element.
     *
     * The current focused element will be returned as it was passed.
     *
     * @return A {SpatialNavigatorElement} or "null" if nothing focused.
     * @memberof SpatialNavigator.prototype
     */
    getFocusedElement: function snGetFocusedElement() {
      return this._focus;
    },

    /**
     * Move to next element by direction.
     *
     * This method triggers "unfocus" event with the previous focused element
     * and then triggers "focus" event with the next focused one.
     *
     * @param {String} direction It should be "left", "right", "up" or "down".
     * @return {Boolean} true if succeed, false if nothing can be focused.
     * @memberof SpatialNavigator.prototype
     */
    move: function snMove(direction) {
      if (!this._focus) {
        this.focus();
      } else {
        var elem = this.navigate(this._focus, direction);
        if (!elem) {
          return false;
        }
        this.unfocus();
        this.focus(elem);
      }
      return true;
    },

    /**
     * To find an element who is nearest to the target element from the
     * specified direction.
     *
     * @param {SpatialNavigatorElement} target The origin of coordinates for
     *                                         traversal.
     * @param {String} direction It should be "left", "right", "up" or "down".
     * @return {SpatialNavigatorElement} The destination of the element which
     *                                   has the highest priority.
     * @memberof SpatialNavigator.prototype
     */
    navigate: function snNavigate(target, direction) {
      if (!target || !direction || !this._collection) {
        return null;
      }

      direction = direction.toLowerCase();

      var rects = this._getAllRects(target);
      var target_rect = this._getRect(target);

      /* These functions are formulas used to measure the priorities based on
         the distance between some specific edges. */
      var distance_function = this._getDistanceFunction(target_rect);

      /* Each "rect" will be distributed into nine regions based on its position
         relative to "target_rect". */
      var groups = this._partition(rects, target_rect);

      /* The "rects" in group 4, that means overlay with the "target_rect", will
         be further distributed into nine regions based on its position relative
         to the center of "target_rect". */
      var internal_groups = this._partition(groups[4], target_rect.center);

      /* "priorities" is an array contains several pre-defined priority set.
         When "_prioritize" is called, we will check the "group" member in the
         first set of "priorities" and sort the "rects" by "distance" rules we
         define here if there is at least one "rect". Otherwise, we pick next
         set and repeat. */
      var priorities;

      switch (direction) {
        case 'left':
          priorities = [
            {
              group: internal_groups[0].concat(internal_groups[3])
                                       .concat(internal_groups[6]),
              distance: [
                distance_function.nearPlumbLineIsBetter,
                distance_function.topIsBetter
              ]
            },
            {
              group: groups[3],
              distance: [
                distance_function.nearPlumbLineIsBetter,
                distance_function.topIsBetter
              ]
            },
            {
              group: groups[0].concat(groups[6]),
              distance: [
                distance_function.nearHorizonIsBetter,
                distance_function.rightIsBetter,
                distance_function.nearTargetTopIsBetter
              ]
            }
          ];
          break;
        case 'right':
          priorities = [
            {
              group: internal_groups[2].concat(internal_groups[5])
                                       .concat(internal_groups[8]),
              distance: [
                distance_function.nearPlumbLineIsBetter,
                distance_function.topIsBetter
              ]
            },
            {
              group: groups[5],
              distance: [
                distance_function.nearPlumbLineIsBetter,
                distance_function.topIsBetter
              ]
            },
            {
              group: groups[2].concat(groups[8]),
              distance: [
                distance_function.nearHorizonIsBetter,
                distance_function.leftIsBetter,
                distance_function.nearTargetTopIsBetter
              ]
            }
          ];
          break;
        case 'up':
          priorities = [
            {
              group: internal_groups[0].concat(internal_groups[1])
                                       .concat(internal_groups[2]),
              distance: [
                distance_function.nearHorizonIsBetter,
                distance_function.leftIsBetter
              ]
            },
            {
              group: groups[1],
              distance: [
                distance_function.nearHorizonIsBetter,
                distance_function.leftIsBetter
              ]
            },
            {
              group: groups[0].concat(groups[2]),
              distance: [
                distance_function.nearPlumbLineIsBetter,
                distance_function.bottomIsBetter,
                distance_function.nearTargetLeftIsBetter
              ]
            }
          ];
          break;
        case 'down':
          priorities = [
            {
              group: internal_groups[6].concat(internal_groups[7])
                                       .concat(internal_groups[8]),
              distance: [
                distance_function.nearHorizonIsBetter,
                distance_function.leftIsBetter
              ]
            },
            {
              group: groups[7],
              distance: [
                distance_function.nearHorizonIsBetter,
                distance_function.leftIsBetter
              ]
            },
            {
              group: groups[6].concat(groups[8]),
              distance: [
                distance_function.nearPlumbLineIsBetter,
                distance_function.topIsBetter,
                distance_function.nearTargetLeftIsBetter
              ]
            }
          ];
          break;
        default:
          return null;
      }

      if (this.crossOnly) {
        priorities.pop();
      }

      var dest = this._prioritize(priorities);
      if (!dest) {
        return null;
      }

      return dest.element;
    }
  });

  exports.SpatialNavigator = SpatialNavigator;
})(window);
