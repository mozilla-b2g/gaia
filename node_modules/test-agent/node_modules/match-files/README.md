# MatchFiles

Simple (recursive) file finder. Designed to find files (not directories).
Has simple filtering functionality built in for filtering by file and directory.

## Examples

    /*Imagine this structure:

      lib/
        file.js
        other.md
        module/
          file.js
          other.js

    */



### Simple no filtering
    
    var MatchFiles = require('match-files');

    //1st is path, 2nd is options, 3rd is callback
    MatchFiles.find(__dirname + '/lib', {}, function(err, files){
      //following standard node conventions

      console.log(files);
      //will output (in absolute paths)
      //Paths are *not* sorted so they may not appear
      //in the order you expect
      //['lib/file.js', 'lib/other.md' 'lib/module/file.js', 'lib/module/other.js']
    });


### Filtering Options

    var MatchFiles = require('match-files');

    //You can filter by file and by directory.
    //If a directory is filtered files and directories under the
    //filtered directory will *not* be searched.

    function matchJsFiles(path){
      //paths are relative to the 'basepath' which is the initial
      //path set or the .basepath option given
    }

    function excludeModuleDir(path){
      //Exclude all directories named module (and their children)
      return !path.match(/\/module/);
    }

    MatchFiles.find(__dirname + '/lib', {
      fileFilters: [matchJsFiles], //always an array of functions
      directoryFilters: [excludeModuleDir]
    }, function(err, files){
      console.log(files);
      //['lib/file.js']
    });

## Options

Note: the object given for options will be modified.
I use file filters to exclude certain file types and
directory filters to exclude things like .svn or .git.

    {
      //String used to create relative paths for filters
      basepath: (default the path used for find) ,

      //Default an empty array. Used for recursion you can
      //pass an array of files to use as a base.
      files: [],

      //An array of functions that must return true for the 
      //file to be included in the results. Recieves a path relative to
      //base root as an argument.
      fileFilters: null,

      //An array of functions that must return true for the 
      //file to be included in the results. Recieves a path relative to
      //base root as an argument.
      directoryFilters: null

    }

## License

See LICENSE (MIT)
