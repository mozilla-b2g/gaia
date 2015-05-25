'use strict';
/**
 * @fileoverview A base class for WebApi objects like App that get shared
 *     between gecko and node.
 */

/**
 * @constructor
 */
function GeckoObject() {
}
module.exports = GeckoObject;


GeckoObject.prototype = {
  /**
   * Id for objects that allows them to be identified across gecko and node.
   * @type {string}
   * @private
   */
  _id: ''
};
