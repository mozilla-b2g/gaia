/* global require, exports */
/* jshint loopfunc:true */
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

  var CSS_FONT =
     /src: (?:url\()?['"].*tv_shared\/([^\/]+)\/([^'"\s]+)['"](?:\))?.*;$/gm;

  var WEB_COMPONENT_PATH = 'components';
  var WEB_COMPONENT_EXCLUSIVE_LIST = [
    /^examples$/gm,// examples folder
    /^\..+/gm]; // invisible files

  exports.TVSharedHelper = {
    execute: function(options) {
      this.copiedWebComponents = [];
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
      files.filter(this.filterFiles.bind(this, 'json')).forEach(
        this.copyJson.bind(this));
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
          utils.copyFileTo(file, utils.dirname(target.path),
                           target.leafName, true);
        } catch (e) {
          throw new Error('Unable to add following file in stage: ' +
                          path + '\n' + e);
        }
      }
      // Case 2/ Directory
      else if (file.isDirectory()) {
        utils.copyDirTo(file, utils.dirname(target.path),
                        target.leafName, true);
      }
    },

    copyWebComponentToStage: function(file, target, component) {
      if (this.copiedWebComponents.indexOf(file.leafName) > -1) {
        // web component is already copied.
        return;
      }

      var files = utils.ls(file, false);
      files.forEach((function(wc) {
        var excluded = WEB_COMPONENT_EXCLUSIVE_LIST.some(function(regex) {
          return regex.test(wc.leafName);
        });
        if (excluded) {
          // file is in exclusive list, we don't need it.
          return;
        }

        var targetFile = target.clone();
        targetFile.append(wc.leafName);
        this.copyFileToStage(wc, targetFile);
      }).bind(this));
      this.copiedWebComponents.push(file.leafName);
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

        var patchs = matches[2].split('/');
        if (matches[1] === WEB_COMPONENT_PATH) {
          sourceFile.append(patchs[0]);
          targetFile.append(patchs[0]);
          this.copyWebComponentToStage(sourceFile, targetFile, patchs[0]);
        } else {
          patchs.forEach(function(segment) {
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
            if (sourceFile.exists()) {
              this.copyFileToStage(sourceFile, targetFile);
            }
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
      this.copyMatchedFilesToStage(CSS_FONT, content);
    },

    copyJson: function(file) {
      var content = utils.getFileContent(file);
      this.copyMatchedFilesToStage(SHARED_USAGE, content);
    },

    filterFiles: function(type, file) {
      var EXTENSIONS_WHITELIST = [type];
      var extension = utils.getExtension(file.leafName);
      return file.isFile() && EXTENSIONS_WHITELIST.indexOf(extension) !== -1;
    }

  };
})(exports);
