'use strict';

(function(exports) {

  function SelectionBorder(options) {
    if (!options) {
      throw new Error('SelectionBorder requires an options object.');
    }
    this.multiple = options.multiple;
    this.forground = options.forground;
    this.container = options.container;
    this.selectedItems = [];
    this.borders = [];
  }

  SelectionBorder.MAX_SPARE_BORDERS = 5;

  SelectionBorder.prototype.select = function sb_select(dom, rect) {
    if (!dom) {
      return;
    }

    if (!this.multiple && this.selectedItems.length > 0) {
      this.deselectAll();
    }

    var border = this.requestBorder();

    var pos = rect ? rect : dom.getBoundingClientRect();
    var radius = getComputedStyle(dom).borderBottomLeftRadius;

    border.style.left = pos.left + 'px';
    border.style.top = pos.top + 'px';
    border.style.width = pos.width + 'px';
    border.style.height = pos.height + 'px';
    border.style.borderRadius = radius;
    this.selectedItems.push({ dom: dom, border: border });
  };

  SelectionBorder.prototype.selectRect = function sb_selectRect(rect) {
    if (!rect) {
      return;
    }

    if (!this.multiple && this.selectedItems.length > 0) {
      this.deselectAll();
    }

    var border = this.requestBorder();

    border.style.left = rect.x + 'px';
    border.style.top = rect.y + 'px';
    border.style.width = rect.w + 'px';
    border.style.height = rect.h + 'px';
    this.selectedItems.push({ rect: rect, border: border });
  };

  SelectionBorder.prototype.deselect = function sb_deselect(dom) {
    for (var i = 0; i < this.selectedItems.length; i++) {
      if (this.selectedItems[i].dom === dom) {
        this.selectedItems[i].border.hidden = true;
        this.borders.push(this.selectedItems[i].border);
        this.selectedItems.splice(i, 1);
        break;
      }
    }
  };

  SelectionBorder.prototype.deselectRect = function sb_deselectRect(rect) {
    for (var i = 0; i < this.selectedItems.length; i++) {
      if (this.selectedItems[i].rect.x === rect.x &&
          this.selectedItems[i].rect.y === rect.y &&
          this.selectedItems[i].rect.w === rect.w &&
          this.selectedItems[i].rect.h === rect.h) {
        this.releaseBorder(this.selectedItems[i].border);
        this.selectedItems.splice(i, 1);
        break;
      }
    }
  };

  SelectionBorder.prototype.deselectAll = function sb_deselectAll() {
    for (var i = 0; i < this.selectedItems.length; i++) {
      this.releaseBorder(this.selectedItems[i].border);
    }
    this.selectedItems = [];
  };

  SelectionBorder.prototype.releaseBorder = function sb_releaseBorder(border) {
    border.hidden = true;
    if (this.borders.length < SelectionBorder.MAX_SPARE_BORDERS) {
      this.borders.push(border);
    } else {
      this.container.removeChild(border);
    }
  };

  SelectionBorder.prototype.requestBorder = function sb_requestBorder() {
    var border = this.borders.pop();
    if (!border) {
      border = document.createElement('div');
      border.classList.add('selection-border');
      if (this.forground) {
        this.container.appendChild(border);
      } else {
        // we assume the container is the offset parent of dom.
        // We don't have this kind of assumption when we move it to system app.
        this.container.insertBefore(border, this.container.firstChild);
      }
    } else {
      border.hidden = false;
    }
    return border;
  };

  exports.SelectionBorder = SelectionBorder;

})(window);
