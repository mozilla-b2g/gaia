'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var path = require('path');
var mockUtils =
  require('./mock_utils.js');

suite('webapp-optimize.js', function() {
  var app;
  var mockConfig;
  var mockJsmin;
  var mockFile;
  var mockDictionary;
  var isFileRemoved = false;
  var removedFilePath = [];
  var isFileExist = false;
  var writeFile = null;
  var writeFileContent = null;
  var fileChildren = {};
  var mockDoc;
  var MockDom;
  var mockWin;
  var mockoptimizeConfig;
  var createdDOMs = [];
  var modifiedDOMs = [];
  var hasAttributeFlag = true;
  var domDataSet = {};
  var removeDomChildren = [];
  var isSubjectToBranding = false;
  setup(function() {
    mockJsmin = function(content) {
      return {
        code: 'minified-' + content
      };
    };

    app = proxyquire.noCallThru().load(
            '../../webapp-optimize', {
              './utils': mockUtils,
              './jsmin': mockJsmin
            });

    mockFile = {
      remove: function(recursive) {
        isFileExist = false;
        isFileRemoved = true;
      },
      exists: function() {
        return isFileExist;
      }
    };

    var getFile = function() {
      var filePath = path.join.apply(this, arguments);
      return {
        remove: function() {
          isFileRemoved = true;
          removedFilePath.push(filePath);
        },
        clone: function() {
          return getFile(filePath);
        },
        append: function(subPath) {
          filePath += '/' + subPath;
        },

        setFileExists: function(flag) {
          isFileExist = flag || true;
        },

        exists: function() {
          return isFileExist;
        },
        path: filePath,
        get leafName() {
          return filePath;
        },
        children: fileChildren,
        getCurrentPath: function() {
          return filePath;
        }
      };
    };
    mockUtils.getFile = getFile;

    mockUtils.gaia = {
      getInstance: function(config) {
        return {
          aggregatePrefix: 'gaia-test-prefix-'
        };
      }
    };

    mockUtils.isSubjectToBranding = function(path) {
      return isSubjectToBranding;
    };

    mockUtils.ls = function(files, recursiveFlag, exclusive) {
      files = files.children ?
        (files.children[files.leafName] || []) : files;
      return files.filter(function(file) {
        if (exclusive) {
          return !exclusive.test(file.leafName);
        } else {
          return true;
        }
      });
    };

    mockUtils.writeContent = function(file, content) {
      writeFileContent = content;
      writeFile = file;
    };

    mockUtils.getFileContent = function(file) {
      return file.content || file.path;
    };

    mockUtils.ensureFolderExists = function() {};

    mockUtils.getExtension = function(path) {
      return path.split('.').pop();
    };

    mockUtils.cloneJSON = function(obj) {
      return JSON.parse(JSON.stringify(obj));
    };

    mockUtils.getFileAsDataURI = function(file) {
      return file.path + '-dataURI';
    };

    mockConfig = {
      GAIA_DEFAULT_LOCALE: 'default-locale',
      GAIA_CONCAT_LOCALES: '1',
      GAIA_INLINE_LOCALES: '1',
      GAIA_OPTIMIZE: '1',
      stageDir: 'testStageDir',
      DEBUG: '0',
      BUILD_APP_NAME: 'testAppName',
      OFFICIAL: '1',
      LOCALES_FILE: 'locale_file',
      GAIA_DIR: 'gaia_dir',
      BUILD_DEBUG: '0'
    };

    MockDom = function(query){
      this.query = query;
      this.href = query + '-href';
      this.parentNode = this;
      this.parent = this;
      this.children = [];
      this.content = query + '-content';
      this.getAttribute = function(attr) {
        return query + '-' + attr;
      };
      this.innerHTML = query + '-innerHTML';
      this.removeAttribute = function(attr) {
        this.removedAttribute = attr;
      };
      this.querySelector = function(pat) {
        var dom = new MockDom(query + '/' + pat);
        dom.parent = this;
        return dom;
      };
      this.querySelectorAll = function(pat) {
        var dom = new MockDom(query + '/' + pat);
        // push this dom as default
        this.children.push(dom);
        return this.children;
      };
      this.appendChild = function(dom) {
        this.children.push(dom);
      };
      this.removeChild = function(dom) {
        removeDomChildren.push(dom);
      };
      this.hasAttribute = function(attr) {
        return hasAttributeFlag;
      };
      this.outerHTML = query + '-outerHTML';
      this.children = [];
      this.dataset = domDataSet;
      this.type = query + '-type';
      this.src = query + '-src';
      this.insertBefore = function(ele, pos) {
        modifiedDOMs.push(ele);
        return new MockDom(query + '/target-' + ele.query +'/sibling-' +
          (typeof pos === 'string' ? pos : pos.query));
      };
      this.nextSibling = query +'-nextSibling';
      createdDOMs.push(this);
    };

    mockDoc = new MockDom('document');
    mockDoc.createElement = function(tag) {
      return new MockDom(mockDoc.query + '/' + tag);
    };
    mockDoc.doctype = {
      name: 'docName',
      publicId: 'publicId',
      systemId: 'systemId'
    };
    mockDoc.documentElement =
      new MockDom(mockDoc.query + '/documentElement');
    mockUtils.getDocument = function(content) {
      return mockDoc;
    };

    mockWin = {
      document: mockDoc,
      navigator: {
        mozL10n: {
          language: {
            code: 'testlangcode',
            direction: 'testleft'
          },
          getDictionary: function() {
            return function(docElt) {
              return {
                doc: docElt
              };
            };
          },
          bootstrap: function(callback, localeBasedirFlag) {
            callback(true);
          },
          ctx: {
            requestLocales: function(locale) {
              mockWin.navigator.mozL10n.language.code = locale;
            }
          }
        }
      }
    };
    mockoptimizeConfig = {
      'L10N_OPTIMIZATION_BLACKLIST': {
        'ignoreL10nOptimizeApp': '*'
      },
      'JS_AGGREGATION_BLACKLIST': {
        'jsAggregationBlackListApp': '*'
      },
      'INLINE_GLOBAL_VAR_WHITELIST': {
        'inlineWhiteListApp': ['test.html']
      },
      'INLINE_OPTIMIZE_WHITELIST': {
        'inlineWhiteListApp': ['test.html']
      },
      'CSS_AGGREGATION_BLACKLIST': {}
    };
  });

  teardown(function() {
    isFileRemoved = false;
    isFileExist = false;
    fileChildren = {};
    writeFile = null;
    writeFileContent = null;
    mockDictionary = null;
    removedFilePath.length = 0;
    createdDOMs.length = 0;
    hasAttributeFlag = true;
    domDataSet = {};
    removeDomChildren.length = 0;
    modifiedDOMs.length = 0;
    isSubjectToBranding = false;
  });

  suite('WebappOptimize', function() {
    var webappOptimize;

    setup(function() {
      webappOptimize = new app.WebappOptimize();
    });

    test('HTMLProcessed, when all HTMLs have been proceeded ', function() {
      var numOfFiles = webappOptimize.numOfFiles = 10;
      var writeDictionariesCalled = 0;

      webappOptimize.writeDictionaries = function() {
        writeDictionariesCalled++;
      };

      isFileExist = true;
      for (var i = 0; i < numOfFiles; i++) {
        webappOptimize.HTMLProcessed([mockFile]);
      }

      assert.equal(writeDictionariesCalled, 1,
        'HTMLProcessed should only be called once');
      // assert.equal(isFileRemoved, true, 'file should be removed');
    });

    test('writeDictionaries', function() {
      isFileExist = true;
      webappOptimize.config = mockConfig;

      var buildDirectoryFile = mockUtils.getFile('build_stage');
      webappOptimize.webapp = {
        buildDirectoryFile: buildDirectoryFile,
        dictionary: {'en-test': { testId: 'testIdContent'}}
      };
      fileChildren[buildDirectoryFile.leafName + '/locales-obj'] = [
        mockUtils.getFile('en-test.json')
      ];
      webappOptimize.writeDictionaries();
      assert.equal(writeFileContent, '{"testId":"testIdContent"}',
        'should write locale content');
      assert.equal(writeFile.leafName, 'build_stage/locales-obj/en-test.json',
        'should write locale content to this path');
      assert.deepEqual(removedFilePath,
        ['en-test.json', 'build_stage/locales', 'build_stage/shared/locales'],
        'should remove locale.json and locales folder');
    });

    test('execute, main function of webappOptimize', function() {
      var processFiles = [];
      webappOptimize.processFile = function(file) {
        processFiles.push(file);
      };
      var buildDirectoryFile =  mockUtils.getFile('build_stage');
      fileChildren[buildDirectoryFile.leafName] = [
        mockUtils.getFile('test.html'),
        mockUtils.getFile('test.nothtml')
      ];
      fileChildren[buildDirectoryFile.leafName + '/shared/pages'] = [
        mockUtils.getFile('testshared.html'),
      ];
      webappOptimize.execute({
        config: mockConfig,
        webapp: {
          sourceDirectoryName: mockConfig.BUILD_APP_NAME,
          buildDirectoryFile: buildDirectoryFile
        },
        locales: ['en-test']
      });
      assert.deepEqual(webappOptimize.webapp.dictionary, {},
        'should create an empty dictionary for webapp');
      assert.equal(webappOptimize.numOfFiles, 2,
        'should have two file left');
      assert.equal(processFiles[0].leafName, 'test.html',
        'should process all html file');
    });
  });

  suite('HTMLOptimizer', function() {
    var htmlOptimizer;
    var doneFiles;
    var writeAggregatedConfig;
    setup(function() {
      var htmlFile = mockUtils.getFile('test-index.html');
      htmlFile.parent = mockUtils.getFile('test-parent-index.html');
      htmlOptimizer = new app.HTMLOptimizer({
        htmlFile: htmlFile,
        webapp: {
          dictionary: {'en-test': {}},
          buildDirectoryFile: mockUtils.getFile('build_stage')
        },
        config: mockConfig,
        win: mockWin,
        locales: ['en-test'],
        optimizeConfig: mockoptimizeConfig,
        callback: function(files) {
          doneFiles = files;
        }
      });
    });

    teardown(function() {
    });

    test('process', function() {
      var _optimizeCalled;
      htmlOptimizer.webapp.sourceDirectoryName = 'ignoreL10nOptimizeApp';
      htmlOptimizer.mockWinObj = function() {};
      htmlOptimizer._optimize = function(called) {
        _optimizeCalled = called;
      };
      htmlOptimizer.files = ['test'];
      htmlOptimizer.process();
      assert.deepEqual(doneFiles, htmlOptimizer.files,
        'should return file list when all files are processed');
      mockoptimizeConfig
        .L10N_OPTIMIZATION_BLACKLIST.ignoreL10nOptimizeApp = false;
      htmlOptimizer.process();
      assert.equal(_optimizeCalled, true,
        'should call callback of mozL10n.bootstrap');
    });

    test('_proceedLocales, prepare dictionary files', function() {
      htmlOptimizer.getDictionary = function(docElt) {
        return {'test-id': 'testIdContent'};
      };
      mockWin.document.documentElement = {};
      htmlOptimizer._proceedLocales();
      assert.deepEqual(htmlOptimizer.fullDict,
        {'en-test': {'test-id': 'testIdContent'}});
      assert.equal(htmlOptimizer.webapp.dictionary['en-test']['test-id'],
        'testIdContent');
    });

    test('embedHtmlImports', function() {
      htmlOptimizer.getFileByRelativePath = function(path) {
        return {
          content: 'content-' + path,
          file: mockUtils.getFile(path)
        };
      };
      htmlOptimizer.embedHtmlImports();
      assert.equal(createdDOMs[0].query, 'document',
        'should get document element first');
      assert.equal(createdDOMs[1].query, 'document/documentElement',
        'should get document element first');
      assert.equal(createdDOMs[2].query, 'document/link[rel="import"]',
        'should query [rel="import"]');
      assert.equal(createdDOMs[3].query, 'document/element',
        'should query element');
      assert.equal(createdDOMs[4].query, 'document/link[rel="import"]/template',
        'should remove child from [rel="import]');
      assert.equal(createdDOMs[5].query, 'document/element/template',
        'should query template from element');
      assert.equal(createdDOMs[6].removedAttribute, 'is',
        'should query [is]');
      assert.equal(createdDOMs[6].removedAttribute, 'is',
        'should remove is attribute');
    });

    test('embedGlobals', function() {
      htmlOptimizer.webapp.sourceDirectoryName = 'inlineWhiteListApp';
      htmlOptimizer.htmlFile = mockUtils.getFile('test.html');
      htmlOptimizer.embededGlobals();
      assert.equal(createdDOMs[2].query, 'document/script',
        'should modify document/script');
      assert.equal(createdDOMs[2].innerHTML,
        'window.SYSTEM_MANIFEST="app://system.undefined/manifest.webapp";',
        'should modify its innerHTML');
    });

    test('embed10nResources', function() {
      htmlOptimizer.subDict = {
        'test-lang': {
          'testkey': 'testContent'
        }
      };
      htmlOptimizer.embed10nResources();
      assert.equal(createdDOMs[2].query, 'document/script',
        'should modify document/script');
      assert.equal(createdDOMs[2].innerHTML,
        '\n  ' + JSON.stringify(htmlOptimizer.subDict['test-lang']) + '\n',
        'should embed stringify l10ned object');
      assert.equal(createdDOMs[2].lang, 'test-lang',
        'should modify script.lang');
      assert.equal(createdDOMs[2].type, 'application/l10n',
        'should have application/l10n type');
    });

    test('concatL10nResources', function() {
      hasAttributeFlag = false;
      htmlOptimizer.concatL10nResources();
      assert.equal(createdDOMs[2].query,
        'document/link[type="application/l10n"]',
        'should modify document/link[type="application/l10n"]');
      assert.equal(createdDOMs[3].query, 'document/link');
      assert.equal(createdDOMs[3].href, '/locales-obj/{{locale}}.json');
      assert.equal(createdDOMs[3].type, 'application/l10n');
      assert.equal(createdDOMs[3].rel, 'prefetch');
    });

    test('aggregateJsResources', function() {
      mockDoc.head = new MockDom(mockDoc.query + '/head');
      htmlOptimizer.getFileByRelativePath = function(path) {
        return {
          content: 'content-' + path
        };
      };
      htmlOptimizer.writeAggregatedContent = function(conf) {
        writeAggregatedConfig = conf;
      };
      htmlOptimizer.aggregateJsResources();
      assert.equal(createdDOMs[3].query, 'document/head/script[src]');
      assert.equal(createdDOMs[3].outerHTML,
        '<!-- document/head/script[src]-outerHTML -->',
        'should mark the original script link in html');
      assert.equal(writeAggregatedConfig.fileType, 'script');
      assert.equal(writeAggregatedConfig.content,
        'minified-; /* "document/head/script[src]-outerHTML ' +
        '"*/\n\ncontent-document/head/script[src]-src',
        'should write minified js content');
      assert.equal(writeAggregatedConfig.name,
        'gaia-test-prefix-test-index.js',
        'should name js with prefix');
    });

    test('writeAggregatedContent', function() {
      htmlOptimizer.writeAggregatedContent(writeAggregatedConfig);
      assert.equal(createdDOMs[3].query, 'document/head/script[src]/' +
        'target-document/script/sibling-document/head/script[src]-nextSibling');
    });

    test('inlineJsResources', function() {
      htmlOptimizer.webapp.sourceDirectoryName = 'inlineWhiteListApp';
      htmlOptimizer.htmlFile = mockUtils.getFile('test.html');
      htmlOptimizer.getFileByRelativePath = function(path) {
        return {
          content: 'content-' + path
        };
      };
      htmlOptimizer.inlineJsResources();
      assert.equal(createdDOMs[3].innerHTML,
        'minified-content-document/script[src]-src');
      assert.equal(removeDomChildren[0].query, 'document/script[src]');
    });

    test('inlineCSSResources', function() {
      htmlOptimizer.webapp.sourceDirectoryName = 'inlineWhiteListApp';
      htmlOptimizer.htmlFile = mockUtils.getFile('test.html');
      htmlOptimizer.getFileByRelativePath = function(path) {
        return {
          content: 'content-' + path,
          file: mockUtils.getFile(path)
        };
      };
      htmlOptimizer.inlineCSSResources();
      assert.equal(createdDOMs[4].query, 'document/link[rel="stylesheet"]' +
        '/target-document/style/sibling-document/link[rel="stylesheet"]');
      assert.equal(modifiedDOMs[0].innerHTML,
        'content-document/link[rel="stylesheet"]-href');
    });

    test('serializeNewHTMLDocumentOutput', function() {
      mockDoc.documentElement.attributes = [{
        nodeName: 'TestNodeName',
        nodeValue: 'testnodevalue'
      }];
      htmlOptimizer.serializeNewHTMLDocumentOutput();
      assert.equal(writeFile.path, 'test-index.html');
      assert.equal(writeFileContent,
        '<!DOCTYPE docName PUBLIC publicId systemId>\n' +
        '<html testnodename="testnodevalue">\n' +
        '  document/documentElement-innerHTML\n' +
        '</html>\n');
    });

    test('getFileByRelativePath', function() {
      isSubjectToBranding = true;
      var path = '/test';
      var result = htmlOptimizer.getFileByRelativePath(path);
      assert.equal(result.file.getCurrentPath(), 'build_stage/test/official');
    });
  });
});
