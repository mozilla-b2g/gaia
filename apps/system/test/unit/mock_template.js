'use strict';

function MockTemplate(idOrNode) {
  if (!(this instanceof Template)) {
    return new Template(idOrNode);
  }
}

MockTemplate.prototype.interpolate = function(data, options) {
  return data;
};
