'use strict';

/* jshint node: true */
var utils = require('utils');

const jsSuffix = /\.js$/;
const htmlSuffix = /\.(html|htm)$/;
const cssSuffix = /\.css$/;

function removeFiles(stagePath, list) {
  list.forEach((fileName) => {
    fileName.unshift(stagePath);
    var filePath = utils.joinPath.apply(this, fileName);
    utils.log('preprocessor', 'remove file:', filePath);
    utils.deleteFile(filePath);
  });
}

function processContent(flag, enable, content, type) {
  var replaced;
  var regexp;
  if (enable) {
    if (type === 'html') {
      regexp = new RegExp(
        '<!--IFNDEF_' + flag + '[^]*?ENDIF_' + flag + '-->', 'mg'
      );
      replaced = content.replace(regexp, '');
      replaced = replaced.
        replace('<!--IFDEF_' + flag, '', 'g').
        replace('ENDIF_' + flag + '-->', '', 'g');
    } else if (type === 'js') {
      regexp = new RegExp(
        '//IFNDEF_' + flag + '[^]*?//ENDIF_' + flag, 'mg'
      );
      replaced = content.replace(regexp, '');
      replaced = replaced.
        replace('//IFDEF_' + flag, '', 'g').
        replace('//ENDIF_' + flag, '', 'g');
    } else if (type === 'css') {
      regexp = new RegExp(
        '/*IFNDEF_' + flag + '[^]*?/*ENDIF_' + flag, 'mg'
      );
      replaced = content.replace(regexp, '');
      replaced = replaced.
        replace('/*IFDEF_' + flag + '*/', '', 'g').
        replace('/*ENDIF_' + flag + '*/', '', 'g');
    }
  } else {
    if (type === 'html') {
      regexp = new RegExp(
        '<!--IFDEF_' + flag + '[^]*?ENDIF_' + flag + '-->', 'mg'
      );
      replaced = content.replace(regexp, '');
      replaced = replaced.
        replace('<!--IFNDEF_' + flag, '', 'g').
        replace('ENDIF_' + flag + '-->', '', 'g');
    } else if (type === 'js') {
      regexp = new RegExp(
        '//IFDEF_' + flag + '[^]*?//ENDIF_' + flag, 'mg'
      );
      replaced = content.replace(regexp, '');
      replaced = replaced.
        replace('//IFNDEF_' + flag, '', 'g').
        replace('//ENDIF_' + flag, '', 'g');
    } else if (type === 'css') {
      regexp = new RegExp(
        '\/\*IFDEF_' + flag + '\*\/[^]*?\/\*ENDIF_' + flag + '\*\/', 'mg'
      );
      replaced = content.replace(regexp, '');
      replaced = replaced.
        replace('/*IFNDEF_' + flag + '*/', '', 'g').
        replace('/*ENDIF_' + flag + '*/', '', 'g');
    }
  }

  return replaced;
}

function processFiles(flag, enable, list, stagePath) {
  list.forEach((fileName) => {
    fileName.unshift(stagePath);
    utils.log('preprocessor', flag, enable, fileName);
    var file = utils.getFile.apply(this, fileName);
    var fileContent = utils.getFileContent(file);
    var type;
    if (htmlSuffix.test(file.path)) {
      type = 'html';
    } else if (jsSuffix.test(file.path)) {
      type = 'js';
    } else if (cssSuffix.test(file.path)) {
      type = 'css';
    }
    var replacedContent = processContent(flag, enable, fileContent, type);
    utils.writeContent(file, replacedContent);
  });
}

/*
  Preprocessor module provides a C/C++ style preprocessor mechanism to
  customize HTML/Javascript/CSS source codes at build stage with a build flag.

  Here is the file list example:
  var fileList = {
    process:[ // Process all IFDEF/IFNDEF/ENDIF tag for each source code in
              // the array.
      ['index.html'],
      ['elements', 'root.html']
    ],
    remove:[ // Remove all files in the array when the flag is disabled.
      ['js', 'example.js'],
      ['elements', 'example.html']
    ]
  };

  // Enable:
  // $ EXAMPLE_FLAG=1 make
  preprocessor.execute(options, 'EXAMPLE_FLAG', fileList);
*/

exports.execute = function(options, flag, list) {
  var stagePath = options.STAGE_APP_DIR;
  var enable = options[flag] === '1';

  processFiles(flag, enable, list.process, stagePath);

  if (!enable && list.remove) {
    removeFiles(stagePath, list.remove);
  }
};
