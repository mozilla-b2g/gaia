
describe("match-files", function(){

  var MatchFiles = require('match-files'),
      StepWrapper = require('step-object/lib/mock-step-object'),
      subject,
      fs = require('fs'),
      path = __dirname + '/files/';

  beforeEach(function(){
    subject = StepWrapper(MatchFiles.find);
    //Initializer
    spyOn(fs, 'stat');
    subject.queue(path);
  });

  describe("._relativePath", function(){
    var result, expected = 'directory/file.js';

    beforeEach(function(){
      result = subject._relativePath(path + expected);
    });

    it("should return a path relative to base path (without leading . or /)", function(){
      expect(result).toEqual(expected);
    });
  });

  describe("._matchesFilter", function(){

    var result, given, filter, willReturn = true,
        retTrue = function(path){ given = path;  return true},
        retFalse = function(path){ given = path; return false; },
        relative = 'directory/file.js';

    describe("without filters", function(){

      beforeEach(function(){
        result = subject._matchesFilter(path, 'directory');
      });

      it("has no filters", function(){
        expect(subject.options.filters).toBe(undefined);
      });

      it("returns true", function(){
        expect(result).toBe(true);
      });

    });

    describe("with filters", function(){

      describe("when filters return true", function(){

        beforeEach(function(){
          subject.queue(path + relative, {
            basepath: path,
            fileFilters: [retTrue, retTrue]
          });

          result = subject._matchesFilter(subject.path);
        });

        it("should return true", function(){
          expect(result).toBe(true);
        });

        it("should use relative path", function(){
          expect(given).toBe(relative);
        });

      });

      describe("when one filter return false", function(){

        beforeEach(function(){
          subject.queue(path + relative, {
            basepath: path,
            fileFilters: [retFalse, retTrue]
          });

          result = subject._matchesFilter(subject.path);
        });

        it("should return false", function(){
          expect(result).toBe(false);
        });

      });

    });

  });

  describe(".queue", function(){

    beforeEach(function(){
      subject.queue(path);
    });

    it("should queue fs.stat call with path", function(){
      expect(fs.stat).toHaveBeenCalledWith(path, subject);
    });

    it("should set .path", function(){
      expect(subject.path).toEqual(path);
    });

    describe(".options", function(){

      describe("default options", function(){

        it("should set options.files to an empty array", function(){
          expect(subject.options.files).toEqual([]);
        });

        it("should set options.basepath to path", function(){
          expect(subject.options.basepath).toEqual(path);
        });

      });

      describe("overwritten options", function(){

        var basepath = path + 'directory/', files = ['bla'];

        beforeEach(function(){
          subject.queue(path, {
            basepath: basepath,
            files: files
          });
        });

        it("should use given basepath", function(){
          expect(subject.options.basepath).toEqual(basepath);
        });

        it("should use given files array", function(){
          expect(subject.options.files).toEqual(files);
        });

      });

    });

  });

  describe(".stat", function(){
    var mockStat, result, isFile = true;

    beforeEach(function(){

      mockStat = {
        isDirectory: function(){ return !isFile; },
        isFile: function(){ return isFile }
      };

    });

    describe("when isDirectory()", function(){

      beforeEach(function(){
        spyOn(fs, 'readdir');
      })

      var result, callStat = function(isMatch){
        beforeEach(function(){
          isFile = false;
          spyOn(subject, '_matchesFilter').andReturn(isMatch);
          result = subject.stat(null, mockStat);
        });

        it("should have called _matchesFilter", function(){
          expect(subject._matchesFilter).toHaveBeenCalledWith(subject.path, 'directory');
        });

      };

      describe("with filter match", function(){
        callStat(true);

        it("should queue fs.readdir", function(){
          expect(fs.readdir).toHaveBeenCalledWith(path, subject);
        });

        it("should not return", function(){
          expect(result).toBe(undefined);
        });

      });

      describe("without filter match", function(){
        callStat(false);

        it("should not queue a fs.readdir", function(){
          expect(fs.readdir).not.toHaveBeenCalled();
        });

        it("should return false", function(){
          expect(result).toBe(false);
        });

      });

    });

    describe("when isFile()", function(){

      var result, callStat = function(isMatch){

        beforeEach(function(){
          isFile = true;
          spyOn(subject, '_matchesFilter').andReturn(isMatch);
          result = subject.stat(null, mockStat);
        });

        it("should return false", function(){
          expect(result).toBe(false);
        });

        it("should have called _matchesFilter", function(){
          expect(subject._matchesFilter).toHaveBeenCalledWith(subject.path, 'file');
        });

      };

      describe("with filter match", function(){

        callStat(true);

        it("should have added file to options.files", function(){
          expect(subject.options.files).toContain(path);
        });

      });

      describe("without filter match", function(){

        callStat(false);

        it("should not have added file to options.files", function(){
          expect(subject.options.files).not.toContain(path);
        });

      });

    });

    describe("on error", function(){

      it("should raise an error", function(){
        var error = new Error();
        expect(function(){
          subject.stat(error, 'bla');
        }).toThrow(error);
      });

    });

  });

  describe(".readdir", function(){
    var result;

    describe("when files are given", function(){
      var files = ['bla.js', 'other.js'];

      beforeEach(function(){
        spyOn(MatchFiles, 'find');
        subject.readdir(null, files);
      });

      it("should queue a MatchFile.find for each file", function(){
        expect(MatchFiles.find).toHaveBeenCalledWith(
          path + files[0], subject.options, subject.group
        );

        expect(MatchFiles.find).toHaveBeenCalledWith(
          path + files[1], subject.options, subject.group
        );
      });

    });

    describe("when false is given as files", function(){

      beforeEach(function(){
        result = subject.readdir(null, false);
      });

      it("should return false", function(){
        expect(result).toBe(false);
      });

    });

  });

  describe("on error", function(){

    it("should raise an error", function(){
      var error = new Error();

      expect(function(){
        subject.readdir(error, 'bla');
      }).toThrow(error);
    });

  });

  describe(".report", function(){

    it("should return options.files", function(){
      expect(subject.report()).toEqual(subject.options.files);
    });

  });

  describe("reading an entire directory", function(){

    var pathFor = function(file){
      return (path + file);
    };

    beforeEach(function(){
      fs.stat.andCallThrough();
    });

    describe("simple", function(){
      var expected = [
        pathFor('file.js'),
        pathFor('misc.md'),
        pathFor('nested/file.js'),
        pathFor('nested/directory/file.js')
      ].sort();

      it("should read the directory recursively until finished", function(done){
        MatchFiles.find(path, {}, function(err, files){
          expect(files.sort()).toEqual(expected);

          done();
        });
      });

    });

    describe("with filtering", function(){

      var expected = [
        pathFor('file.js'),
        pathFor('nested/file.js')
      ].sort();

      var filterDir = function(dir){
        return !dir.match(/directory/);
      };

      filterFile = function(path){
        return path.match(/\.js$/);
      };

      it("should filter by file and directory", function(done){
        MatchFiles.find(path, {
          fileFilters: [filterFile],
          directoryFilters: [filterDir]
        }, function(err, files){
          expect(files.sort()).toEqual(expected);
          done();
        });
      });
    
    });

  });

});
