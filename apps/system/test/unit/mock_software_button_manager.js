'use strict';
/* exported MockSoftwareButtonManager */

function MockSoftwareButtonManager() {

  this.height = 0;

  this.mTeardown = function() {
    this.height = 0;
  };

}

MockSoftwareButtonManager.prototype.start = function() {};

/**
 * A pre-instantiated mock.
 */
window.MocksoftwareButtonManager = new MockSoftwareButtonManager();
