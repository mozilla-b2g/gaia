var StepObject = require('step-object'),
    fs = require('fs'),
    path = require('path');

var MatchFiles = {};

MatchFiles.find = StepObject({

  /**
   * Returns a path relative to the basepath.
   * 
   * Assume basepath is:
   *
   * options.basepath = '/some/thing/'
   *
   * And your subject is: '/some/thing/other/thing.js'
   *
   * Then your result will be:
   *
   * 'other/thing.js'
   *
   *
   * @param {String} path
   * @return {String} relative path
   */
  _relativePath: function(path){
    return path.replace(this.options.basepath, '');
  },

  /**
   * Returns true when there are no filters or all filters return true.
   * 
   * NOTE:
   * If using the directoryFilters pass 'directory' as 'type' not directoryFilters.
   *
   * @param {String} path
   * @param {String} type
   * @return {Boolean}
   */
  _matchesFilter: function(path, type){
    var i, len, filters;

    path = this._relativePath(path);
    type = (type || 'file') + 'Filters';

    filters = this.options[type];

    if(!filters){
      return true;
    }

    for(i = 0, len = filters.length; i < len; i++){
      if(!filters[i](path)){
        return false;
      }
    }
    return true;
  },

  /**
   * Queue's path to be stated.
   *
   * Options:
   *
   * - basepath String
   * is not passed into options the
   * path will be used.
   *
   * - files Array
   * is not passed into options an empty
   * array will be used as a base.
   *
   * - fileFilters Array
   *   An array of functions to run vs a given file path.
   *
   * - directoryFilters Array
   *   An array of functions to run vs a given file path.
   *
   *
   * NOTE: options given are *directly* modified
   *
   * @param {String} path
   * @param {Object} options
   */
  queue: function(filePath, options){
    if(options === undefined){
      options = {};
    }

    this.options = options;
    this.path = filePath;

    if(options.filter && !options.filters){
      options.filters = [options.filter];
    }

    options.basepath  = path.join(options.basepath || this.path, '/');
    options.files = options.files || [];

    fs.stat(this.path, this);
  },

  stat: function(err, stat){
    if(err){
      throw err;
    }


    if(stat.isFile()){
      if(this._matchesFilter(this.path, 'file')){
        this.options.files.push(this.path);
      }

      //So next step will know this is not a directory
      return false;

    } else if(stat.isDirectory()){

      if(this._matchesFilter(this.path, 'directory')){
        fs.readdir(this.path, this);
      } else {
        //To skip reading the results
        return false;
      }
    }

  },

  readdir: function(err, files){
    var group, i, len;
    if(err){
      throw err;
    }

    if(!files || (files.length && files.length == 0)){
      return false;
    }

    group = this.group();

    for(i = 0, len = files.length; i < len; i++){
      MatchFiles.find(path.join(this.path, files[i]), this.options, group());
    }

  },

  report: function(){
    return this.options.files;
  }

}, ['queue', 'stat', 'readdir', 'report']);


module.exports = MatchFiles;
