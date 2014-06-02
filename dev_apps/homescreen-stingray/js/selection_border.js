/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

(function(exports) {
  'use strict';

  /**
   *
   * SelectionBorder is a UI object which helps us to draw an border at
   * specified place.
   *
   * @class SelectionBorder
   * @param {Boolean} [multiple=false]
   *           enable multiple selection or not. The value 'true' is to enable
   *           multiple selection.
   */
  function SelectionBorder(multiple) {
    this.multiple = multiple;
    this.selectedItems = [];
    this.borders = [];
  }

  /**
   * The maximum spared borders
   * @memberof SelectionBorder
   */
  SelectionBorder.MAX_SPARE_BORDERS = 5;

  SelectionBorder.prototype = {
    /**
     * to select a DOM element
     * @param {DOMElement} dom the html dom element whose offsetParent must be
     *                         at the same position of container or be the same
     *                         of container.
     * @memberof SelectionBorder.prototype
     */
    select: function sb_select(dom) {
      if (!dom) {
        return;
      }

      if (!this.multiple && this.selectedItems.length > 0) {
        this.deselectAll();
      }

      var border = this._requestBorder();
      // The offset parent of border may be null at the newly created border.
      if (border.offsetParent !== dom.offsetParent) {
        // If offset parent is different, we moves the border the relative
        // position to its new offset parent. This improves the visual feedback
        // of the animation.
        var bounding = dom.offsetParent.getBoundingClientRect();
        var borderBounding = border.getBoundingClientRect();
        // moves to relative postion
        this._moveBorderTo(border, {
                                     left: borderBounding.left - bounding.left,
                                     top: borderBounding.top - bounding.top,
                                     width: border.offsetWidth,
                                     height: border.offsetHeight
                                   });
        // put to new offsetParent
        dom.offsetParent.appendChild(border);
      }
      // put to used list
      this.selectedItems.push({ dom: dom, border: border });
      // move border to dom's place.
      this._moveBorderTo(border, {
                                   left: dom.offsetLeft,
                                   top: dom.offsetTop,
                                   width: dom.offsetWidth,
                                   height: dom.offsetHeight
                                 });
    },
    /**
     * select a rectangle area
     * @param {DOMElement} container the container to host the border.
     * @param {Object} rect a rectangle object with left, top, width, height
     *                      properties.
     * @memberof SelectionBorder.prototype
     */
    selectRect: function sb_selectRect(container, rect) {
      if (!container || !rect) {
        return;
      }

      if (!this.multiple && this.selectedItems.length > 0) {
        this.deselectAll();
      }

      var border = this._requestBorder();
      if (border.parentElement !== container) {
        container.appendChild(border);  
      }

      this._moveBorderTo(border, rect);
      this.selectedItems.push({ rect: rect, border: border });
    },
    /**
     * deselect the DOM element if it is selected
     * @param {DOMElement} dom
     * @memberof SelectionBorder.prototype
     */
    deselect: function sb_deselect(dom) {
      for (var i = 0; i < this.selectedItems.length; i++) {
        if (this.selectedItems[i].dom === dom) {
          this.selectedItems[i].border.hidden = true;
          this.borders.push(this.selectedItems[i].border);
          this.selectedItems.splice(i, 1);
          break;
        }
      }
    },
    /**
     * deselect the rect area that this rect won't be the same object of the
     * argument of selectRect function call.
     * @param {Object} rect the rectangle object with left, top, width, height
     *                      properties.
     * @memberof SelectionBorder.prototype
     */
    deselectRect: function sb_deselectRect(rect) {
      for (var i = 0; i < this.selectedItems.length; i++) {
        if (this.selectedItems[i].rect.left === rect.left &&
            this.selectedItems[i].rect.top === rect.top &&
            this.selectedItems[i].rect.width === rect.width &&
            this.selectedItems[i].rect.height === rect.height) {
          this._releaseBorder(this.selectedItems[i].border);
          this.selectedItems.splice(i, 1);
          break;
        }
      }
    },
    /**
     * deselect all area
     * @memberof SelectionBorder.prototype
     */
    deselectAll: function sb_deselectAll() {
      for (var i = 0; i < this.selectedItems.length; i++) {
        this._releaseBorder(this.selectedItems[i].border);
      }
      this.selectedItems = [];
    },
    /**
     * removes all spare border and reset all variables
     * @memberof SelectionBorder.prototype
     */
    reset: function sb_reset() {
      this.deselectAll();
      var border;
      for (var i = 0; i < this.borders.length; i++) {
        border = this.border[i];
        if (border.parentElement) {
          border.parentElement.removeChild(border);
        }
      }
      
      this.borders = [];
    },
    _moveBorderTo: function sb__moveBorderTo(border, pos) {
      border.style.left = pos.left + 'px';
      border.style.top = pos.top + 'px';
      border.style.width = pos.width + 'px';
      border.style.height = pos.height + 'px';
    },

    _releaseBorder: function sb__releaseBorder(border) {
      if (this.borders.length < SelectionBorder.MAX_SPARE_BORDERS) {
        border.hidden = true;
        this.borders.push(border);
      } else if (border.parentElement) {
        // remove border when it has parent.
        border.parentElement.removeChild(border);
      }
    },
    _requestBorder: function sb__requestBorder() {
      var border = this.borders.pop();
      if (!border) {
        border = document.createElement('div');
        border.classList.add('selection-border');
      } else {
        border.hidden = false;
      }
      return border;
    }
  };

  exports.SelectionBorder = SelectionBorder;

})(window);
