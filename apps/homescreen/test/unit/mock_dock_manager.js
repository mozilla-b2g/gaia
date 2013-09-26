'use strict';

var MockDockManager = {
  init: function mdm_init(container, page, tapThreshold) {
    if (page.olist)
      GridManager.addNodes(page.olist.children);
    this.page = page;
  },
  mSuiteSetup: function() {

  },
  goNextSet: function() {

  },
  goPreviousSet: function() {

  },
  onDragStart: function() {

  },
  onDragStop: function() {

  },
  isFull: function() {
    return false;
  },
  page: {
    getIconIndex: function() {
      return 1;
    }
  }
};
