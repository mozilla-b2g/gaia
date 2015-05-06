'use strict';
/* global GaiaGrid */

(function(exports) {

  /**
   * The relative size of icons when in a collapsed group.
   */
  const COLLAPSE_RATIO = 0.33;

  /**
   * Maximum number of icons that are visible in a collapsed group.
   */
  const COLLAPSED_GROUP_SIZE = 6;

  /**
   * Space to be reserved at the sides of collapsed group items, in pixels.
   */
  const COLLAPSED_GROUP_MARGIN_LEFT = 23;
  const COLLAPSED_GROUP_MARGIN_RIGHT = 53;

  /**
   * Time, in ms, before removing the 'toggling' class from the expand/collapse
   * toggle element.
   */
  const TOGGLE_TIMEOUT = 250;

  /**
   * A replacement for the default Divider class that implements group
   * collapsing and provides convenience functions for group drag'n'drop.
   */
  function Group(detail) {
    this.detail = detail || {};
    this.detail.type = 'divider';
    this.detail.index = 0;
    this.pendingCollapse = this.detail.collapsed = !!this.detail.collapsed;
  }

  Group.prototype = {

    __proto__: GaiaGrid.GridItem.prototype,

    gridWidth: 4,

    /**
     * Height in pixels of the header part of the group.
     */
    get headerHeight() {
      return this.detail.collapsed ? 20 : 30;
    },

    /**
     * The collapsed state. Used to defer the actual state change of
     * collapse/expand so that anything re-rendering the grid between setting
     * the state and the re-render caused by the state change doesn't cause
     * the group to be positioned incorrectly.
     */
    pendingCollapse: false,
    pendingCollapseTimeout: null,

    /**
     * Height in pixels of the background of the group.
     */
    backgroundHeight: 0,
    lastBackgroundHeight: null,

    /**
     * Height in pixels of the separator at the bottom of the group.
     */
    separatorHeight: 0,

    /**
     * The scale used for collapsed icons, taking into account column size.
     */
    collapseRatio: COLLAPSE_RATIO,

    /**
     * Height in pixels of the group. When collapsed, this includes the
     * icons associated with the group.
     */
    get pixelHeight() {
      return this.detail.collapsed ?
        this.backgroundHeight :
        this.separatorHeight;
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
      var group = this.element = document.createElement('section');
      group.className = 'divider group newly-created';

      // Create the background (only seen in edit mode)
      var span = document.createElement('span');
      span.className = 'background';
      group.appendChild(span);
      this.backgroundSpanElement = span;

      // Create an element for a drop-shadow (only seen when active)
      span = document.createElement('span');
      span.className = 'shadow';
      group.appendChild(span);
      this.shadowSpanElement = span;

      // Create the header (container for the move gripper and
      // expand/collapse toggle)
      span = document.createElement('span');
      span.className = 'header';
      group.appendChild(span);
      this.headerSpanElement = span;

      // Create the move gripper
      span = document.createElement('span');
      span.className = 'gripper';
      this.headerSpanElement.appendChild(span);

      // Create the expand/collapse toggle
      var button = document.createElement('button');
      button.className = 'toggle';
      button.dataset.l10nId = 'gaia-grid-toggle-expanded';
      this.headerSpanElement.appendChild(button);
      this.toggleElement = button;

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
      this.lastBackgroundHeight = null;
    },

    /**
     * Renders the apps within the group. If the group is not collapsed, this
     * just validates the style class of the group.
     */
    _renderChildren: function(nApps) {
      var isRTL = (document.documentElement.dir === 'rtl');
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
        (this.grid.layout.constraintSize -
         COLLAPSED_GROUP_MARGIN_LEFT - COLLAPSED_GROUP_MARGIN_RIGHT) /
        COLLAPSED_GROUP_SIZE);
      var x = isRTL ?
        (this.grid.layout.constraintSize - COLLAPSED_GROUP_MARGIN_RIGHT) :
        COLLAPSED_GROUP_MARGIN_LEFT;
      y += this.headerHeight;

      var maxGridItemWidth =
        this.grid.layout.constraintSize / this.grid.layout.minIconsPerRow;
      this.collapseRatio =
        (maxGridItemWidth / this.grid.layout.gridItemWidth) * COLLAPSE_RATIO;

      for (var i = index - nApps; i < index; i++) {
        var item = this.grid.items[i];
        if (this.detail.collapsed) {
          item.scale = this.collapseRatio;

          var itemVisible = (i - (index - nApps)) < COLLAPSED_GROUP_SIZE;
          if (!itemVisible) {
            item.setCoordinates(isRTL ? x + width : x - width, y);
          } else {
            item.setCoordinates(x, y);
            x += isRTL ? -width: width;
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
     * Gets the y-position of the group. When the group is expanded, its y
     * position is actually the y-position of the separator underneath the
     * group. This gets the visible y-position of the group.
     */
    getRealYPosition: function(nApps) {
      if (this.detail.collapsed) {
        return this.y;
      }
      return this.grid.items[this.detail.index - nApps].y -
             this.headerHeight;
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
      var y = this.getRealYPosition(nApps);

      if (y !== this.lastY) {
        // Place the header span
        this.headerSpanElement.style.transform =
          'translate(0px, ' + y + 'px)';
      }

      if (this.toggleElement) {
        var toggleLabel = this.detail.collapsed ? 'collapsed' : 'expanded';
        this.toggleElement.dataset.l10nId = 'gaia-grid-toggle-' + toggleLabel;
      }

      // Calculate the height of the background span
      if (this.detail.collapsed) {
        this.backgroundHeight =
          Math.round(this.collapseRatio * this.grid.layout.gridIconSize * 1.5);
      } else {
        var height = Math.ceil(nApps / this.grid.layout.cols);
        this.backgroundHeight = (height || 1) * this.grid.layout.gridItemHeight;
      }
      this.backgroundHeight += this.headerHeight;

      if (y != this.lastY ||
          this.backgroundHeight !== this.lastBackgroundHeight) {
        // Place and size the background span element
        this.backgroundSpanElement.style.transform =
          'translate(0px, ' + y + 'px) scale(1, ' + this.backgroundHeight + ')';

        // Place and size the shadow span element
        this.shadowSpanElement.style.transform =
          'translateY(' + y + 'px)';
        this.shadowSpanElement.style.height = this.backgroundHeight + 'px';

        // Place the divider after this point
        this.dividerSpanElement.style.transform =
          'translate(0px, ' + (y + this.backgroundHeight) + 'px)';
      }

      // Update the cached size values
      this.lastBackgroundHeight = this.backgroundHeight;
      this.lastY = y;

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

      // Make sure we're collapsed
      this.collapse();

      // Mark our child items as active/inactive with us so they pick up the
      // right style when dragged.
      var callback = active ?
        function(item) { item.element.classList.add('active'); } :
        function(item) { item.element.classList.remove('active'); };
      this.forEachItem(callback);
    },

    /*
     * As the start of a collapse/expand animation can involve a lot of work,
     * the response isn't always instant. To help alleviate this, we show a
     * quick response on the toggle element first before initiating the rest
     * of the work.
     */
    _rerenderOnToggle: function() {
      if (this.pendingCollapseTimeout) {
        clearTimeout(this.pendingCollapseTimeout);
        this.pendingCollapseTimeout = null;
      }

      if (this.toggleElement) {
        this.toggleElement.classList.add('toggling');
        setTimeout(() => { this.toggleElement.classList.remove('toggling'); },
                   TOGGLE_TIMEOUT);
      }

      // Ideally, this setTimeout would be a requestAnimationFrame, but the
      // above class-adding seems to end up coalesced with the code inside
      // requestAnimationFrame, rather than it happening on the next frame.
      // The same thing happens with any setTimeout lower than about 20ms too.
      this.pendingCollapseTimeout = setTimeout(() => {
        this.detail.collapsed = this.pendingCollapse;
        this.pendingCollapseTimeout = null;

        if (!this.detail.collapsed) {
          // Remove collapsed styling from all icons
          this.forEachItem(function(item) {
            item.scale = 1;
            if (item.element) {
              item.element.classList.remove('collapsed');
              item.element.classList.remove('hidden');
            }
          });
        }

        // If the item is active, re-render it so that its pixel-height is
        // correct when the rest of the grid is rendered.
        if (this.active) {
          this.render();
        }

        this.grid.render();

        var dragging = this.grid.dragdrop && this.grid.dragdrop.inDragAction;
        if (dragging) {
          // If we're dragging, make sure to reposition the icon in the correct
          // place, as the render call won't redraw us
          this.grid.dragdrop.updateIconPosition();
        } else {
          // If we're not dragging, save the collapsed state
          window.dispatchEvent(new CustomEvent('gaiagrid-saveitems'));

          // Request attention so that we're as visible as we can be after
          // expanding/collapsing
          this.requestAttention();
        }
      }, 20);
    },

    collapse: function() {
      if (this.detail.collapsed) {
        return;
      }

      this.pendingCollapse = true;
      this._rerenderOnToggle();
    },

    expand: function() {
      if (!this.detail.collapsed) {
        return;
      }

      this.pendingCollapse = false;
      this._rerenderOnToggle();
    },

    launch: function(target) {
      if (target !== this.toggleElement) {
        return;
      }

      if (this.detail.collapsed) {
        this.expand();
      } else {
        this.collapse();
      }
    },

    remove: function() {
      if (this.element) {
        this.element.parentNode.removeChild(this.element);
      }
    },

    isDraggable: function() {
      return true;
    },

    requestAttention: function() {
      var rect = {
        x: 0,
        y: this.getRealYPosition(this.size),
        width: this.gridWidth * this.grid.layout.gridItemWidth,
        height: this.backgroundHeight
      };

      this.grid.element.dispatchEvent(
        new CustomEvent('gaiagrid-attention', { detail: rect }));
    }
  };

  exports.GaiaGrid.Divider = Group; // Override the non-grouping divider

}(window));
