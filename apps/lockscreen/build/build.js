/**
  Copyright 2012, Mozilla Foundation

  Licensed under the Apache License, Version 2.0 (the "License");
  you may not use this file except in compliance with the License.
  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
*/

/* global require, exports */
(function() {
  'use strict';

  var utils = require('utils'),
      Copy = require('./lib/copy.js');

  var Build = function(options) {
    this.setup(options);
  };

  Build.prototype.setup = function(options) {
    this.states = {
      buildOptions: options,
      copyList: {},
      copies: []
    };

    this.configs = {
      //relative path from the app directory.
      pathCopyList: utils.joinPath(
        options.APP_DIR, 'build', 'copylist.json')
    };
  };

  /**
   * To convert the relative path to absolute path.
   * It's idempotent. A converted path would not be fixed again.
   */
  Build.prototype.path = function(path) {
    if (null !== path.match(this.states.buildOptions.GAIA_DIR)) {
      return path;
    }
    return utils.joinPath(this.states.buildOptions.GAIA_DIR, path);
  };

  /**
   * Convert the path of copy from and to.
   */
  Build.prototype.pathCopy= function(from, to) {
    return {
      'from': this.path(utils.joinPath('apps', from)),
      'to': this.path(utils.joinPath('apps', 'lockscreen', to))
    };
  };

  Build.prototype.fetchCopyList = function() {
    var converted = {};
    this.states.copyList =
      utils.readJSONFromPath(this.configs.pathCopyList);
    for (var from in this.states.copyList) {
      // Convert both from and to to absolute path.
      var paths = this.pathCopy(from, this.states.copyList[from]);
      converted[paths.from] = paths.to;
    }
    this.states.copyList = converted;
  };

  Build.prototype.setupCopy = function() {
    for(var from in this.states.copyList) {
      this.states.copies.push(new Copy(from,
        this.states.copyList[from]));
    }
    this.states.copies.forEach(function(copy) {
      // It would throw error if the copy source
      // or the destination directory doesn't exist.
      copy.assertExists();
    });
  };

  Build.prototype.copy = function() {
    this.states.copies.forEach(function(copy) {
      copy.execute();
    });
  };

  Build.prototype.execute = function() {
    this.fetchCopyList();
    this.setupCopy();
    this.copy();
  };

  exports.execute = function(options) {
    (new Build(options)).execute();
  };
})();

