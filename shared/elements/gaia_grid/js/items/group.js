'use strict';
/* global GaiaGrid */

(function(exports) {

  /**
   * The relative size of icons when in a collapsed group.
   */
  const COLLAPSE_RATIO = 0.375;

  /**
   * Maximum number of icons that are visible in a collapsed group.
   */
  const COLLAPSED_GROUP_SIZE = 8;

  /**
   * Space to be reserved at the sides of collapsed group items, in pixels.
   */
  const COLLAPSED_GROUP_MARGIN = 4;

  /**
   * A replacement for the default Divider class that implements group
   * collapsing and provides convenience functions for group drag'n'drop.
   */
  function Group(detail) {
    this.detail = detail || {};
    this.detail.type = 'divider';
    this.detail.index = 0;
    this.detail.collapsed = !!this.detail.collapsed;
  }

  Group.prototype = {

    __proto__: GaiaGrid.GridItem.prototype,

    gridWidth: 4,

    /**
     * Height in pixels of the header part of the group.
     */
    headerHeight: 47,

    /**
     * Height in pixels of the background of the group.
     */
    backgroundHeight: 0,

    /**
     * Height in pixels of the separator at the bottom of the group.
     */
    separatorHeight: 0,

    /**
     * Height in pixels of the group. When collapsed, this includes the
     * icons associated with the group.
     */
    get pixelHeight() {
      return this.detail.collapsed ?
        this.backgroundHeight :
        this.separatorHeight;
    },

    get name() {
      return this.detail.name;
    },

    set name(value) {
      this.detail.name = value;
      this.updateTitle();
      window.dispatchEvent(new CustomEvent('gaiagrid-saveitems'));
    },

    /**
     * Returns the number of items in the group. Relies on the item index
     * being correct.
     */
    get size() {
      var size = 0;
      for (var i = this.detail.index - 1, items = this.grid.items;
           i >= 0 && items[i].detail.type !== 'divider'; i--) {
        size++;
      }
      return size;
    },

    /**
     * Creates the element and its children for this group item.
     */
    _createElement: function() {
      var group = this.element = document.createElement('div');
      group.className = 'divider group newly-created';

      // Create the background (only seen in edit mode)
      var span = document.createElement('span');
      span.className = 'background';
      group.appendChild(span);
      this.backgroundSpanElement = span;

      // Create the header (container for the move gripper, title and
      // expand/collapse toggle)
      span = document.createElement('span');
      span.className = 'header';
      group.appendChild(span);
      this.headerSpanElement = span;

      // Create the move gripper
      span = document.createElement('span');
      span.className = 'gripper';
      this.headerSpanElement.appendChild(span);

      // Create the title span
      span = document.createElement('span');
      span.className = 'title';
      span.textContent = this.name;
      this.headerSpanElement.appendChild(span);
      this.titleElement = span;

      // Create the expand/collapse toggle
      span = document.createElement('span');
      span.className = 'toggle';
      this.headerSpanElement.appendChild(span);
      this.toggleElement = span;

      // Create the group separator (only seen in non-edit mode)
      span = document.createElement('span');
      span.className = 'separator';
      group.appendChild(span);
      this.dividerSpanElement = span;

      // Create a child span for the separator to act as the indicator for
      // dropping icons/groups during editing.
      this.dividerSpanElement.appendChild(document.createElement('span'));

      this.grid.element.appendChild(group);
      this.separatorHeight = this.dividerSpanElement.clientHeight;
    },

    /**
     * Renders the apps within the group. If the group is not collapsed, this
     * just validates the style class of the group.
     */
    _renderChildren: function(nApps) {
      if (!this.detail.collapsed) {
        this.element.classList.remove('collapsed');
        return;
      }

      // If collapsed, we need to style and position the icons in the group
      // into one row.
      this.element.classList.add('collapsed');

      var y = this.y;
      var index = this.detail.index;

      var width = Math.round(
        (this.grid.layout.gridItemWidth * this.grid.layout.cols -
         COLLAPSED_GROUP_MARGIN * 2) / COLLAPSED_GROUP_SIZE);
      var x = COLLAPSED_GROUP_MARGIN +
        Math.round(Math.max(0, (COLLAPSED_GROUP_SIZE - nApps) * width / 2));
      y += this.headerHeight;

      for (var i = index - nApps; i < index; i++) {
        var item = this.grid.items[i];
        if (this.detail.collapsed) {
          item.scale = COLLAPSE_RATIO;

          var itemVisible = (i - (index - nApps)) < COLLAPSED_GROUP_SIZE;
          if (!itemVisible) {
            item.setCoordinates(x - width, y);
          } else {
            item.setCoordinates(x, y);
            x += width;
          }

          item.render();
          item.element.classList.add('collapsed');
          if (!itemVisible) {
            item.element.classList.add('hidden');
          }
        }
      }
    },

    /**
     * Renders the icon to the grid component.
     */
    render: function() {
      // Generate the content if we need to
      var createdElements = false;
      if (!this.element) {
        createdElements = true;
        this._createElement();
      }

      // Render children
      var nApps = this.size;
      this._renderChildren(nApps);

      // Calculate group position.
      // If we're not collapsed, the group's position will be underneath its
      // icons, but we want it to display above.
      var y = this.y;
      if (!this.detail.collapsed) {
        y = this.grid.items[this.detail.index - nApps].y -
          this.headerHeight;
      }

      // Place the header span
      this.headerSpanElement.style.transform =
        'translate(0px, ' + y + 'px)';

      // Calculate the height of the background span
      if (this.detail.collapsed) {
        this.backgroundHeight =
          Math.round(COLLAPSE_RATIO * this.grid.layout.gridIconSize * 1.5);
      } else {
        var height = Math.ceil(nApps / this.grid.layout.cols);
        this.backgroundHeight = (height || 1) * this.grid.layout.gridItemHeight;
      }
      this.backgroundHeight += this.headerHeight;

      // Place and size the background span element
      this.backgroundSpanElement.style.transform =
        'translate(0px, ' + y + 'px) scale(1, ' + this.backgroundHeight + ')';

      // Place the divider after this point
      this.dividerSpanElement.style.transform =
        'translate(0px, ' + (y + this.backgroundHeight) + 'px)';

      // Now include the separator in the background height
      this.backgroundHeight += this.separatorHeight;

      // Fade in newly-created groups
      if (createdElements) {
        // Force a reflow to make sure the transform transition doesn't play
        this.element.clientTop;
        this.element.classList.remove('newly-created');
      }
    },

    forEachItem: function(callback) {
      var nApps = this.size;
      var index = this.detail.index;
      for (var i = index - nApps; i < index; i++) {
        callback(this.grid.items[i]);
      }
    },

    setActive: function(active) {
      GaiaGrid.GridItem.prototype.setActive.call(this, active);

      // Mark our child items as active/inactive with us so they pick up the
      // right style when dragged.
      var callback = active ?
        function(item) { item.element.classList.add('active'); } :
        function(item) { item.element.classList.remove('active'); };
      this.forEachItem(callback);
    },

    collapse: function() {
      if (this.detail.collapsed) {
        return;
      }

      this.detail.collapsed = true;
      this.grid.render();

      var dragging = this.grid.dragdrop && this.grid.dragdrop.inDragAction;
      if (!dragging) {
        window.dispatchEvent(new CustomEvent('gaiagrid-saveitems'));
      }
    },

    expand: function() {
      if (!this.detail.collapsed) {
        return;
      }

      this.detail.collapsed = false;

      // Remove collapsed styling from all icons
      this.forEachItem(function(item) {
        item.scale = 1;
        if (item.element) {
          item.element.classList.remove('collapsed');
          item.element.classList.remove('hidden');
        }
      });

      this.grid.render();

      // If we're not dragging, save the collapsed state
      var dragging = this.grid.dragdrop && this.grid.dragdrop.inDragAction;
      if (!dragging) {
        window.dispatchEvent(new CustomEvent('gaiagrid-saveitems'));
      }
    },

    launch: function(target) {
      var inEditMode = this.grid.dragdrop && this.grid.dragdrop.inEditMode;
      if ((target === this.toggleElement) ||
          (target === this.headerSpanElement && !inEditMode) ||
          (target === this.backgroundSpanElement && this.detail.collapsed)) {
        if (this.detail.collapsed) {
          this.expand();
        } else {
          this.collapse();
        }
      } else if (target === this.headerSpanElement && inEditMode) {
        this.edit();
      }
    },

    remove: function() {
      if (this.element) {
        this.element.parentNode.removeChild(this.element);
      }
    },

    /**
     * It dispatches an edititem event.
     */
    edit: function() {
      this.grid.element.dispatchEvent(new CustomEvent('edititem', {
        detail: this
      }));
    },

    isDraggable: function() {
      return this.detail.collapsed;
    }
  };

  exports.GaiaGrid.Divider = Group; // Override the non-grouping divider

}(window));
