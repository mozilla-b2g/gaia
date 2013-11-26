
'use strict';

var currentPage;

var MockGridManager = {
  svPreviouslyInstalledApps: [],
  addPreviouslyInstalled: function(manifest) {
    if (!this.isPreviouslyInstalled(manifest)) {
      this.svPreviouslyInstalledApps.push({'manifest': manifest});
    }
  },
  isPreviouslyInstalled: function(manifest) {
    for (var i = 0, elemNum = this.svPreviouslyInstalledApps.length;
         i < elemNum; i++) {
      if (this.svPreviouslyInstalledApps[i].manifest === manifest) {
        return true;
      }
    }
    return false;
  },
  markDirtyState: function() {},
  localize: function() {},
  onDragStart: function() {},
  onDragStop: function() {},
  icons: {},
  init: function(page) {
    if (page && page.olist) {
      this.addNodes(page.olist.children);
      currentPage = page;
    }
  },
  addNodes: function(nodes) {
    for (var i = 0; i < nodes.length; i++) {
      this.icons[nodes[i].dataset.manifestURL] = {
        container: nodes[i],
        onDragStart: function() {

        },
        draggableElem: {
          dataset: nodes[i].dataset,
          style: {

          }
        },
        getLeft: function() {
          return this.container.getBoundingClientRect().left;
        },
        addClassToDragElement: function() {

        },
        removeClassToDragElement: function() {

        },
        onDragStop: function(callback) {
          callback();
        },
        loadRenderedIcon: function(callback) {
          callback('http://app.png');
        },
        remove: function() {
          this.container.parentNode.removeChild(this.container);
        }
      };
    }
  },
  getIcon: function(descriptor) {
    return this.icons[descriptor.manifestURL];
  },
  pageHelper: {
    getCurrent: function() {
      if (!currentPage) {
        var aux = {
          getIconIndex: function() {
            return 1;
          }
        };
        return aux;
      }
      return currentPage;
    },
    getCurrentPageNumber: function() {
      return 0;
    },
    getPage: function() {
      return currentPage;
    }
  },
  dirCtrl: {
    limitNext: function() {
      return false;
    },
    limitPrev: function() {
      return false;
    }
  },
  getBlobByDefault: function() {
    return null;
  }
};
