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

/* global require, module */
(function() {
  'use strict';
  var utils = require('utils');
  var Copy = function(from, to) {
    var toPaths = this.parse(to);
    this.states = {
      pathFrom: from,
      pathToParent: toPaths.dirname,
      nameFile: toPaths.basename,
      flagOverride: true
    };
  };

  Copy.prototype.parse = function(path) {
    return {
      dirname: utils.dirname(path),
      basename: utils.basename(path)
    };
  };

  Copy.prototype.assertExists = function() {
    var fromExists = utils.fileExists(this.states.pathFrom),
        toParentExists = utils.fileExists(this.states.pathToParent);
    if (!fromExists) {
      throw new Error('Copy source: ' +
        this.states.pathFrom + 'doesn\'t exist');
    }

    if (!toParentExists) {
      throw new Error('Copy destination: ' +
        this.states.pathToParent + '> ' +
        this.states.nameFile +
        'doesn\'t exist');
    }
  };

  Copy.prototype.execute = function() {
    utils.copyFileTo(
      this.states.pathFrom,
      this.states.pathToParent,
      this.states.nameFile,
      this.states.flagOverride);
  };

  module.exports = Copy;
})();
