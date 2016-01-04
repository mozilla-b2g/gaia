'use strict';

/**
 * @constructor
 * @param {Host} host
 * @param {object} options
 */
function Session(host, options) {
  this.host = host;
  this.options = options;
}

Session.prototype.$rpc = {methods: ['destroy', 'checkError']};

module.exports = Session;
