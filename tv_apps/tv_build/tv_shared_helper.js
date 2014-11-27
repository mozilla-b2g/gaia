/* global require, exports */
'use strict';

(function(exports) {
  var utils = require('utils');
  // regex for finding script/link in html
  var SHARED_USAGE =
         /<(?:script|link).+=['"]\.?\.?\/?tv_shared\/([^\/]+)\/([^'"\s]+)['"]/g;
  // regex for remove comments from css files
  var COMMENTED =
          /(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm;
  // regex for finding import in css
  var CSS_IMPORT =
     /@import (?:url\()?['"].*tv_shared\/([^\/]+)\/([^'"\s]+)['"](?:\))?.*;$/gm;

  exports.TVSharedHelper = {
    execute: function(options) {
      this.sourceDir = utils.getFile(options.APP_DIR);
      this.stageDir = utils.getFile(options.STAGE_APP_DIR);
      this.tvSharedDir = utils.getFile(options.GAIA_DIR, 'tv_apps',
                                       'tv_shared');
      this.copyTVShared();
    },

    copyTVShared: function() {
      var files = utils.ls(this.sourceDir, true);
      files.filter(this.filterFiles.bind(this, 'html')).forEach(
        this.analyzeHtml.bind(this));
      files.filter(this.filterFiles.bind(this, 'css')).forEach(
        this.analyzeCss.bind(this));
    },

    copyFileToStage: function(file, target) {
      if (file.isHidden()) {
        return;
      }
      var path = file.path;
      if (!file.exists()) {
        throw new Error('Can\'t add inexistent file to  : ' + path);
      }

      // Case 1/ Regular file
      if (file.isFile()) {
        try {
          utils.copyFileTo(file, utils.dirname(target.path), target.leafName, true);
        } catch (e) {
          throw new Error('Unable to add following file in stage: ' +
                          path + '\n' + e);
        }
      }
      // Case 2/ Directory
      else if (file.isDirectory()) {
        utils.copyDirTo(file, utils.dirname(target.path), target.leafName, true);
      }
    },

    copyMatchedFilesToStage: function(regex, content) {
      var matches = null;
      var sourceFile = null;
      var targetFile = null;
      while ((matches = regex.exec(content)) !== null) {
        // construct nsIFile object
        sourceFile = this.tvSharedDir.clone();
        targetFile = this.stageDir.clone();
        targetFile.append('tv_shared');
        sourceFile.append(matches[1]);
        targetFile.append(matches[1]);
        matches[2].split('/').forEach(function(segment) {
          sourceFile.append(segment);
          targetFile.append(segment);
        });
        // copy to stage
        this.copyFileToStage(sourceFile, targetFile);
        // check other html and css files
        if (matches[2].endsWith('.html')) {
          this.analyzeHtml(sourceFile);
        } else if (matches[2].endsWith('.css')) {
          this.analyzeCss(sourceFile);

          // copy corresponding directory of css (if exists)
          sourceFile = sourceFile.parent;
          targetFile = targetFile.parent;
          var cssDirectory = matches[2].slice(0, -4);
          sourceFile.append(cssDirectory);
          targetFile.append(cssDirectory);
          dump(sourceFile.path + '\n');
          dump(sourceFile.exists() + '\n\n');
          if (sourceFile.exists()) {
            this.copyFileToStage(sourceFile, targetFile);
          }
        }
      }
    },

    analyzeHtml: function(file) {
      var content = utils.getFileContent(file);
      this.copyMatchedFilesToStage(SHARED_USAGE, content);
    },

    analyzeCss: function(file) {
      var content = utils.getFileContent(file).replace(COMMENTED, '');
      this.copyMatchedFilesToStage(CSS_IMPORT, content);
    },

    filterFiles: function(type, file) {
      var EXTENSIONS_WHITELIST = [type];
      var extension = utils.getExtension(file.leafName);
      return file.isFile() && EXTENSIONS_WHITELIST.indexOf(extension) !== -1;
    }

  };
})(exports);
