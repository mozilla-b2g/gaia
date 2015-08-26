/**
 * template 0.0.1
 * Copyright (c) 2013-2015, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/element for details
 */
/*jshint browser: true, strict: false */
/*globals define, requirejs */
define(function(require, exports, module) {
  var template, fetchText,
      isReady = false,
      readyQueue = [],
      tagRegExp = /<(\w+-[\w-]+)(\s|>)/g,
      commentRegExp = /<!--*.?-->/g,
      attrIdRegExp = /\s(hrefid|srcid)="([^"]+)"/g,
      buildProtocol = 'build:',
      moduleConfig = module.config(),
      depPrefix = 'element!',
      buildMap = {},
      tagToId = function(tag) { return tag; };

  // Referencing element module to make sure
  // document.register shim is in place. Over time,
  // as browsers implement it, this require call
  // can be removed.
  require('element');

  if (moduleConfig.hasOwnProperty('depPrefix')) {
    depPrefix = moduleConfig.depPrefix;
  }
  if (moduleConfig.hasOwnProperty('tagToId')) {
    tagToId = moduleConfig.tagToId;
  }

  /**
   * Handles converting <template id="body"> template
   * into a real body content, and calling back
   * template.ready listeners.
   */
  function onReady() {
    isReady = true;

    // The template#body is on purpose. Do not want to get
    // other element that may be #body if the page decides
    // to not use the template tag to avoid FOUC.
    var bodyTemplate = document.querySelector('template#body');

    if (bodyTemplate) {
      bodyTemplate.parentNode.removeChild(bodyTemplate);
      document.body.innerHTML = bodyTemplate.innerHTML;
    }

    readyQueue.forEach(function(fn) {
      fn();
    });
    readyQueue = [];
  }

  /**
   * For hrefid and srcid resolution, need full IDs.
   * This method takes care of creating full IDs. It
   * could be improved by removing extraneous ./ and
   * ../ references.
   * @param  {String} id    possible local, relative ID
   * @param  {String} refId ID to use as a basis for the
   * the local ID.
   * @return {String} full ID
   */
  function makeFullId(id, refId) {
    if (id.indexOf('.') === 0 && refId) {
      // Trim off the last segment of the refId, as we want
      // the "directory" level of the ID
      var parts = refId.split('/');
      parts.pop();
      refId = parts.join('/');

      id = (refId ? refId + '/' : '') + id;
    }

    return id;
  }

  /**
   * Supports cached internal nodes if data-cached is set to a truthy
   * value.
   */
  function templateCreatedCallback() {
      if (this.dataset.cached === 'cached' || this.template) {
        if (this.dataset.cached !== 'cached' && this.template) {
          // Clear out previous contents. If they were needed, they
          // would have been consumed by the this.template.fn() call.
          this.innerHTML = '';

          this.appendChild(this.template());
        }

        if (this.templateInsertedCallback) {
          this.templateInsertedCallback();
        }
      }
  }

  if (typeof XMLHttpRequest !== 'undefined') {
    // browser loading
    fetchText = function(url, onload, onerror) {
      var xhr = new XMLHttpRequest();

      xhr.open('GET', url, true);
      xhr.onreadystatechange = function() {
        var status, err;

        if (xhr.readyState === 4) {
          status = xhr.status;
          if (status > 399 && status < 600) {
            //An http 4xx or 5xx error. Signal an error.
            err = new Error(url + ' HTTP status: ' + status);
            err.xhr = xhr;
            onerror(err);
          } else {
            onload(xhr.responseText);
          }
        }
      };
      xhr.responseType = 'text';
      xhr.send(null);
    };
  } else {
    // Likely a build scenario. Cheat a bit and use
    // an r.js helper. This could be modified to support
    // more AMD loader tools though in the future.
    fetchText = function(url, onload) {
      onload(requirejs._readFile(url));
    };
  }

  template = {
    fetchText: fetchText,

    /**
     * Register a function to be run once element dependency
     * tracing and registration has finished.
     * @param  {Function} fn
     */
    ready: function(fn) {
      if (isReady) {
        setTimeout(fn);
      } else {
        readyQueue.push(fn);
      }
    },

    makeFullId: makeFullId,

    /**
     * Makes a template function for use as the template object
     * used in a fully realized custom element.
     * @param  {String} text string of HTML
     * @return {Function} by calling this function, creates a
     * clone of the DocumentFragment from template.
     */
    makeTemplateFn: function(text) {
      return function() {
        var e,
            frag = document.createDocumentFragment(),
            // Use a fresh div for each creation, otherwise run into failures
            // with templates that have nested custom elements.
            templateDiv = document.createElement('div');

        // For the security conscious: the contents of `text` comes from the
        // require('template!...') calls that exercises this module's
        // functionality as a loader plugin to load UI fragments from .html
        // files via XHR calls to paths the application can reach, or from a \
        // built resource that was constructed from a similar XHR-type call, but
        // done at application build time. This means that dynamic calls to
        // require('template!...') are the source of risk for injection of
        // hostile HTML.
        templateDiv.innerHTML = text;

        while ((e = templateDiv.firstChild)) {
          frag.appendChild(e);
        }
        return frag;
      };
    },

    /**
     * Replaces hrefid and srcid with href and src, using
     * require.toUrl(id) to convert the IDs to paths.
     * @param  {String} text  string of HTML
     * @param  {String} refId the reference module ID to use,
     * which is normallly the module ID associated with the
     * HTML string given as input.
     * @return {String} converted HTML string.
     */
    idsToUrls: function(text, refId) {
      text = text
              .replace(attrIdRegExp, function(match, type, id) {
                id = makeFullId(id, refId);
                var attr = type === 'hrefid' ? 'href' : 'src';

                return ' ' + attr + '="' + require.toUrl(id) + '"';
              });
      return text;
    },

    /**
     * Gives and array of 'element!'-based module IDs for
     * any custom elements found in the string of HTML.
     * So if the HTML has <some-thing> in it, the returned
     * dependency array will have 'element!some-thing' in it.
     * @param  {String} text string of HTML
     * @return {Array} array of dependencies. Could be zero
     * length if no dependencies found.
     */
    depsFromText: function(text) {
      var match, noCommentText,
          deps = [];

      // Remove comments so only legit tags are found
      noCommentText = text.replace(commentRegExp, '');

      tagRegExp.lastIndex = 0;
      while ((match = tagRegExp.exec(noCommentText))) {
        deps.push(depPrefix + tagToId(match[1]));
      }

      return deps;
    },

    /**
     * Converts a string of HTML into a full template
     * object that is used for a custom element's
     * prototype `template` property.
     * @param  {String} text string of HTML
     * @param  {String} id module ID for the custom
     * element associated with this template.
     * @param  {Boolean} skipTranslateIds for build
     * concerns, want to avoid the work that translate
     * IDs until runtime, when more state is known
     * about final path information. If that is the
     * case, then pass true for this value.
     * @return {Object} template object.
     */
    textToTemplate: function(text, id, skipTranslateIds) {
      var obj,
          deps = template.depsFromText(text);

      obj = {
        id: id,
        deps: deps,
        text: text
      };

      if (!skipTranslateIds) {
        obj.text = template.idsToUrls(text, id);
        // Cannot reliably create the template function
        // until IDs are translated, so wait on that
        // step until later.
        obj.fn = template.makeTemplateFn(obj.text);
      }

      return obj;
    },

    /**
     * Turns a template object, created via build, into
     * a template function.
     * @param  {Object} obj the object created by a build.
     * @return {Function}   a function to call to get a
     * DOM object for insertion into the document.
     */
    objToFn: function(obj) {
      var text = template.idsToUrls(obj.text, obj.id);
      return template.makeTemplateFn(text);
    },

    templateCreatedCallback: templateCreatedCallback,

    /**
     * AMD loader plugin API. Loads the resource. Called by an
     * AMD loader.
     * @param  {String} id     resource ID to load.
     * @param  {Function} req    context-specific `require` function.
     * @param  {Function} onload called when loading is complete.
     * @param  {Object} config config object, normally just has
     * config.isBuild to indicate build scenario.
     */
    load: function(id, req, onload, config) {
      var isBuild = config.isBuild;

      // If a build directive, load those files and scan
      // for dependencies, loading them all.
      if (id.indexOf(buildProtocol) === 0 && isBuild) {
        id = id.substring(buildProtocol.length);

        var idList = id.split(','),
            count = 0,
            buildIdDone = function() {
              count += 1;
              if (count === idList.length) {
                onload();
              }
            };

        // Set buildIdDone as executable by the build
        buildIdDone.__requireJsBuild = true;

        // Allow for multiple files separated by commas
        id.split(',').forEach(function(moduleId) {
          var path = req.toUrl(moduleId);

          // Leverage r.js optimizer special method for reading
          // files synchronously.
          require(template.depsFromText(requirejs._readFile(path)),
                  buildIdDone);
        });
      } else {
        fetchText(req.toUrl(id), function(text) {
          var templateObj = template.textToTemplate(text, id, isBuild);

          req(templateObj.deps, function() {
            if (isBuild) {
              buildMap[id] = templateObj;
            }
            onload({
              createdCallback: templateCreatedCallback,
              template: templateObj.fn
            });
          });
        }, onload.error);
      }
    },

    /**
     * AMD loader plugin API. Called by a build tool, to give
     * this plugin the opportunity to write a resource to
     * a build file.
     * @param  {String} pluginName ID of this module, according
     * to what the loader thinks the ID is.
     * @param  {String} id         resource ID handled by plugin.
     * @param  {Function} write      Used to write output to build file.
     */
    write: function(pluginName, id, write) {
      if (buildMap.hasOwnProperty(id)) {
        var obj = buildMap[id],
            depString = JSON.stringify(obj.deps);

        depString = depString.replace(/^\s*\[/, '').replace(/\]\s*$/, '')
                             .trim();
        if (depString) {
          depString = ', ' + depString;
        }

        write.asModule(pluginName + '!' + id,
          'define([\'' + module.id + '\'' + depString +
          '], function(template) { return {\n' +
          'createdCallback: template.templateCreatedCallback,\n' +
          'template: template.objToFn(' + JSON.stringify(buildMap[id]) +
          ')}; });\n');
      }
    }
  };

  if (typeof document !== 'undefined') {
    // This section wires up processing of the initial document DOM.
    // In a real document.register browser, this would not be possible
    // to do, as document.register would grab all the tags before this
    // would likely run. Also, onDomDone just a hack related to
    // DOMContentLoaded not firing.
    var onDom, onDomDone = false;
    onDom = function() {
      if (onDomDone) {
        return;
      }
      onDomDone = true;

      // Collect all the tags already in the DOM
      var converted = template.textToTemplate(document.body.innerHTML);

      require(converted.deps, onReady);
    };


    if (document.readyState === 'interactive' ||
        document.readyState === 'complete') {
      onDom();
    } else {
      window.addEventListener('DOMContentLoaded', onDom);
    }
  }

  return template;
});
