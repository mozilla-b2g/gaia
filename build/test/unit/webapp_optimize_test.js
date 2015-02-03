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
  var hasAttributeFlag = {};
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
        get parent() {
          return getFile(filePath.substr(0, filePath.lastIndexOf('/')));
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
          return filePath.substr(filePath.lastIndexOf('/') + 1);
        },
        children: fileChildren,
        getCurrentPath: function() {
          return filePath;
        }
      };
    };
    mockUtils.getFile = getFile;

    mockUtils.gaia = {
      aggregatePrefix: 'gaia-test-prefix-',
    };

    mockUtils.isSubjectToBranding = function(path) {
      return isSubjectToBranding;
    };

    mockUtils.ls = function(files, recursiveFlag, exclusive) {
      files = files.children ?
        (files.children[files.getCurrentPath()] || []) : files;
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

    mockUtils.jsComparator = function() {
      return true;
    };

    mockConfig = {
      GAIA_DEFAULT_LOCALE: 'default-locale',
      GAIA_CONCAT_LOCALES: '1',
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
      this.ownerDocument = mockDoc;
      this.hasAttribute = function(attr) {
        return !!hasAttributeFlag[attr];
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
          getAST: function() {
            return function(docElt) {
              return {
                doc: docElt
              };
            };
          },
          bootstrap: function(file, localeBasedirFlag) {
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
    removedFilePath.length = 0;
    createdDOMs.length = 0;
    hasAttributeFlag = {};
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
      var writeASTsCalled = 0;

      webappOptimize.writeASTs = function() {
        writeASTsCalled++;
      };

      isFileExist = true;
      for (var i = 0; i < numOfFiles; i++) {
        webappOptimize.HTMLProcessed([mockFile]);
      }

      assert.equal(writeASTsCalled, 1,
        'HTMLProcessed should only be called once');
      // assert.equal(isFileRemoved, true, 'file should be removed');
    });

    test('writeASTs', function() {
      isFileExist = true;
      webappOptimize.config = mockConfig;

      var buildDirectoryFile = mockUtils.getFile('build_stage');
      webappOptimize.webapp = {
        buildDirectoryFile: buildDirectoryFile,
        asts: {'en-test': [{ $i: 'testId', $v: 'testIdContent'}]}
      };
      fileChildren[buildDirectoryFile.leafName + '/locales-obj'] = [
        mockUtils.getFile('en-test.json')
      ];
      webappOptimize.writeASTs();
      assert.equal(writeFileContent, '[{"$i":"testId","$v":"testIdContent"}]',
        'should write locale content');
      assert.equal(writeFile.leafName, 'en-test.json',
        'should write locale content to this path');
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
      assert.deepEqual(webappOptimize.webapp.asts, {},
        'should create an empty asts for webapp');
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
      htmlOptimizer = new app.HTMLOptimizer({
        htmlFile: htmlFile,
        webapp: {
          asts: {'en-test': []},
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
      htmlOptimizer._optimize = function() {
        _optimizeCalled = true;
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

    test('_proceedLocales, prepare JSON AST files', function() {
      htmlOptimizer.getAST = function(docElt) {
        return [{$i: 'test-id', $v: 'testIdContent'}];
      };
      mockWin.document.documentElement = {};
      htmlOptimizer._proceedLocales();
      assert.deepEqual(htmlOptimizer.asts,
        {'en-test': [{$i: 'test-id', $v: 'testIdContent'}]});
      assert.equal(htmlOptimizer.webapp.asts['en-test'][0].$v,
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

    test('concatL10nResources', function() {
      htmlOptimizer.concatL10nResources();
      assert.equal(createdDOMs[2].query,
        'document/link[rel="localization"]',
        'should modify document/link[rel="localization"]');
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
      // TODO should uncouple this from previous test
      htmlOptimizer.writeAggregatedContent(writeAggregatedConfig);
      assert.equal(createdDOMs[3].query, 'document/head/script[src]/' +
        'target-document/script/sibling-document/head/script[src]-nextSibling');
    });

    test('aggregateJsResources does not aggregate async scripts', function() {
      mockDoc.head = new MockDom(mockDoc.query + '/head');
      mockDoc.head.children = [
        new MockDom('script1'),
        new MockDom('script2')
      ];
      hasAttributeFlag.async = true;
      htmlOptimizer.getFileByRelativePath = function(path) {
        return {
          content: 'content-' + path
        };
      };
      htmlOptimizer.aggregateJsResources();
      assert.equal(createdDOMs[3].outerHTML,
        'script1-outerHTML',
        'should not change the script');
      assert.equal(createdDOMs[4].outerHTML,
        'script2-outerHTML',
        'should not change the script');
      assert.equal(createdDOMs[5].query, 'document/head/script[src]');
      assert.equal(createdDOMs[5].outerHTML,
        'document/head/script[src]-outerHTML',
        'should not change the script');
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
      mockUtils.serializeDocument = function(doc) {
        return '<!DOCTYPE docName PUBLIC publicId systemId>\n' +
          '<html testnodename="testnodevalue">\n' +
          '  document/documentElement-innerHTML\n' +
          '</html>\n';
      };
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
      var path = '/test/foo.html';
      var result = htmlOptimizer.getFileByRelativePath(path);
      assert.equal(result.file.getCurrentPath(),
                   'build_stage/test/official/foo.html');
    });
  });
});
