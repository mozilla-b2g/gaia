/* globals sinon */
'use strict';


var MockAppWidget = function(config) {
  this.toggleExpand = sinon.stub();
  this.focus = sinon.stub();
};
MockAppWidget.prototype = {
};
