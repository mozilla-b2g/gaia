'use strict';

function MockMediaFrame(container) {
  this.container = container;
  MockMediaFrame.instances.push(this);
}

MockMediaFrame.instances = [];

MockMediaFrame.prototype.displayImage = function() {
};

MockMediaFrame.prototype.displayVideo = function() {
};
