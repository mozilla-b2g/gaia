'use strict';

var assert = require('chai').assert;
var proxyquire = require('proxyquire');
var path = require('path');
var mockUtils = require('./mock_utils.js');
var CrossCompatPromise = require('es6-promise').Promise;

suite('webapp-optimize.js', function() {
  var app;
  var mockConfig;
  var mockJsmin;
  var mockL20n;
  var mockFile;
  var isFileRemoved = false;
  var removedFilePath = [];
  var isFileExist = false;
  var writeFile = null;
  var writeFileContent = null;
  var fileChildren = {};
  var mockDoc;
  var MockDom;
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

    mockL20n = {
      getView: function() {
        return {
          serializeResources: function() {
            return CrossCompatPromise.resolve(
              [{$i: 'test-id', $v: 'testIdContent'}]);
          }
        };
      }
    };

    app = proxyquire.noCallThru().load(
      '../../webapp-optimize', {
        './l10n/l20n': mockL20n,
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

    mockUtils.getOsType = function() {
      return 'Unix';
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

    mockoptimizeConfig = {
      'CONCAT_LOCALES_BLACKLIST': {
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
          buildDirectoryFilePath: buildDirectoryFile.path
        },
        locales: ['en-test']
      });
      assert.equal(webappOptimize.numOfFiles, 2,
        'should have two file left');
      assert.equal(processFiles[0].leafName, 'test.html',
        'should process all html file');
    });
  });

  suite('HTMLOptimizer', function() {
    var htmlOptimizer;
    var writeAggregatedConfig;
    setup(function() {
      var htmlFile = mockUtils.getFile('index.html');
      htmlOptimizer = new app.HTMLOptimizer({
        htmlFile: htmlFile,
        entries: {'en-test': []},
        webapp: {
          buildDirectoryFilePath: 'build_stage'
        },
        config: mockConfig,
        locales: ['en-test'],
        optimizeConfig: mockoptimizeConfig
      });
    });

    teardown(function() {
    });

    test('serializeL10nResources, prepare JSON AST files', function(done) {
      mockDoc.documentElement = {};
      htmlOptimizer.serializeL10nResources().then(function() {
        assert.deepEqual(htmlOptimizer.entries,
          {'en-test': [{$i: 'test-id', $v: 'testIdContent'}]});
        assert.equal(htmlOptimizer.entries['en-test'][0].$v,
          'testIdContent');
      }).then(done, done);
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
        'gaia-test-prefix-index.js',
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
      assert.equal(writeFile.path, 'index.html');
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

    test('writeASTs', function() {
      isFileExist = true;
      var buildDirectoryFile = mockUtils.getFile('build_stage');
      htmlOptimizer.webapp.buildDirectoryFilePath = buildDirectoryFile.path;
      htmlOptimizer.entries =
        {'en-test': [{ $i: 'testId', $v: 'testIdContent'}]};
      fileChildren[buildDirectoryFile.leafName + '/locales-obj'] = [
        mockUtils.getFile('index.en-test.json')
      ];
      htmlOptimizer.writeAST();
      assert.equal(writeFileContent, '[{"$i":"testId","$v":"testIdContent"}]',
        'should write locale content');
      assert.equal(writeFile.leafName, 'index.en-test.json',
        'should write locale content to this path');
    });
  });
});
