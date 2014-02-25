
/**
 * alameda 0.0.3+ Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/alameda for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true, nomen: true, regexp: true */
/*global setTimeout, process, document, navigator, importScripts */

var requirejs, require, define;
(function (global, undef) {
    var prim, topReq, dataMain,
        bootstrapConfig = requirejs || require,
        hasOwn = Object.prototype.hasOwnProperty,
        contexts = {},
        queue = [],
        currDirRegExp = /^\.\//,
        urlRegExp = /^\/|\:|\?|\.js$/,
        commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/;

    if (typeof requirejs === 'function') {
        return;
    }

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function getOwn(obj, prop) {
        return obj && hasProp(obj, prop) && obj[prop];
    }

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }

    /**
     * Mixes in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value !== 'string') {
                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    //Allow getting a global that expressed in
    //dot notation, like 'a.b.c'.
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        value.split('.').forEach(function (part) {
            g = g[part];
        });
        return g;
    }

    //START prim
    /**
     * Changes from baseline prim
     * - no hasProp or hasOwn (already defined in this file)
     * - no hideResolutionConflict, want early errors, trusted code.
     * - each() changed to Array.forEach
     * - removed UMD registration
     */
    /**
     * prim 0.0.2 Copyright (c) 2012-2013, The Dojo Foundation All Rights Reserved.
     * Available via the MIT or new BSD license.
     * see: http://github.com/requirejs/prim for details
     */

    /*global setImmediate, process, setTimeout */
    (function () {
        'use strict';
        var waitingId,
            waiting = [];

        function check(p) {
            if (hasProp(p, 'e') || hasProp(p, 'v')) {
                throw new Error('nope');
            }
            return true;
        }

        function callWaiting() {
            waitingId = 0;
            var w = waiting;
            waiting = [];
            while (w.length) {
                w.shift()();
            }
        }

        function asyncTick(fn) {
            waiting.push(fn);
            if (!waitingId) {
                waitingId = setTimeout(callWaiting, 0);
            }
        }

        function notify(ary, value) {
            prim.nextTick(function () {
                ary.forEach(function (item) {
                    item(value);
                });
            });
        }

        prim = function prim() {
            var p,
                ok = [],
                fail = [];

            return (p = {
                callback: function (yes, no) {
                    if (no) {
                        p.errback(no);
                    }

                    if (hasProp(p, 'v')) {
                        prim.nextTick(function () {
                            yes(p.v);
                        });
                    } else {
                        ok.push(yes);
                    }
                },

                errback: function (no) {
                    if (hasProp(p, 'e')) {
                        prim.nextTick(function () {
                            no(p.e);
                        });
                    } else {
                        fail.push(no);
                    }
                },

                finished: function () {
                    return hasProp(p, 'e') || hasProp(p, 'v');
                },

                rejected: function () {
                    return hasProp(p, 'e');
                },

                resolve: function (v) {
                    if (check(p)) {
                        p.v = v;
                        notify(ok, v);
                    }
                    return p;
                },
                reject: function (e) {
                    if (check(p)) {
                        p.e = e;
                        notify(fail, e);
                    }
                    return p;
                },

                start: function (fn) {
                    p.resolve();
                    return p.promise.then(fn);
                },

                promise: {
                    then: function (yes, no) {
                        var next = prim();

                        p.callback(function (v) {
                            try {
                                if (yes && typeof yes === 'function') {
                                    v = yes(v);
                                }

                                if (v && typeof v.then === 'function') {
                                    v.then(next.resolve, next.reject);
                                } else {
                                    next.resolve(v);
                                }
                            } catch (e) {
                                next.reject(e);
                            }
                        }, function (e) {
                            var err;

                            try {
                                if (!no || typeof no !== 'function') {
                                    next.reject(e);
                                } else {
                                    err = no(e);

                                    if (err && typeof err.then === 'function') {
                                        err.then(next.resolve, next.reject);
                                    } else {
                                        next.resolve(err);
                                    }
                                }
                            } catch (e2) {
                                next.reject(e2);
                            }
                        });

                        return next.promise;
                    },

                    fail: function (no) {
                        return p.promise.then(null, no);
                    },

                    end: function () {
                        p.errback(function (e) {
                            throw e;
                        });
                    }
                }
            });
        };

        prim.serial = function (ary) {
            var result = prim().resolve().promise;
            ary.forEach(function (item) {
                result = result.then(function () {
                    return item();
                });
            });
            return result;
        };

        prim.nextTick = typeof setImmediate === 'function' ? setImmediate :
            (typeof process !== 'undefined' && process.nextTick ?
                process.nextTick : (typeof setTimeout !== 'undefined' ?
                    asyncTick : function (fn) {
            fn();
        }));
    }());
    //END prim

    function newContext(contextName) {
        var req, main, makeMap, callDep, handlers, loadTimeId, load, context,
            defined = {},
            waiting = {},
            config = {
                //Defaults. Do not set a default for map
                //config to speed up normalize(), which
                //will run faster if there is no default.
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                pkgs: {},
                shim: {},
                config: {}
            },
            requireDeferreds = [],
            deferreds = {},
            calledDefine = {},
            calledPlugin = {},
            loadCount = 0,
            startTime = (new Date()).getTime(),
            errCount = 0,
            trackedErrors = {},
            urlFetched = {};

        /**
         * Trims the . and .. from an array of path segments.
         * It will keep a leading path segment if a .. will become
         * the first path segment, to help with module name lookups,
         * which act like paths, but can be remapped. But the end result,
         * all paths that use this function should look normalized.
         * NOTE: this method MODIFIES the input array.
         * @param {Array} ary the array of path segments.
         */
        function trimDots(ary) {
            var i, part;
            for (i = 0; ary[i]; i += 1) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                        //End of the line. Keep at least one non-dot
                        //path segment at the front so it can be mapped
                        //correctly to disk. Otherwise, there is likely
                        //no path mapping for a path starting with '..'.
                        //This can still fail, but catches the most reasonable
                        //uses of ..
                        break;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @param {Boolean} applyMap apply the map config to the value. Should
         * only be done if this normalization is for a dependency ID.
         * @returns {String} normalized name
         */
        function normalize(name, baseName, applyMap) {
            var pkgName, pkgConfig, mapValue, nameParts, i, j, nameSegment,
                foundMap, foundI, foundStarMap, starI,
                baseParts = baseName && baseName.split('/'),
                normalizedBaseParts = baseParts,
                map = applyMap && config.map,
                starMap = map && map['*'];

            //Adjust any relative paths.
            if (name && name.charAt(0) === '.') {
                //If have a base name, try to normalize against it,
                //otherwise, assume it is a top-level require that will
                //be relative to baseUrl in the end.
                if (baseName) {
                    if (getOwn(config.pkgs, baseName)) {
                        //If the baseName is a package name, then just treat it as one
                        //name to concat the name with.
                        normalizedBaseParts = baseParts = [baseName];
                    } else {
                        //Convert baseName to array, and lop off the last part,
                        //so that . matches that 'directory' and not name of the baseName's
                        //module. For instance, baseName of 'one/two/three', maps to
                        //'one/two/three.js', but we want the directory, 'one/two' for
                        //this normalization.
                        normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    }

                    name = normalizedBaseParts.concat(name.split('/'));
                    trimDots(name);

                    //Some use of packages may use a . path to reference the
                    //'main' module name, so normalize for that.
                    pkgConfig = getOwn(config.pkgs, (pkgName = name[0]));
                    name = name.join('/');
                    if (pkgConfig && name === pkgName + '/' + pkgConfig.main) {
                        name = pkgName;
                    }
                } else if (name.indexOf('./') === 0) {
                    // No baseName, so this is ID is resolved relative
                    // to baseUrl, pull off the leading dot.
                    name = name.substring(2);
                }
            }

            //Apply map config if available.
            if (applyMap && (baseParts || starMap) && map) {
                nameParts = name.split('/');

                for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                            //baseName segment has config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
                                if (mapValue) {
                                    //Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break;
                                }
                            }
                        }
                    }

                    if (foundMap) {
                        break;
                    }

                    //Check for a star map match, but just hold on to it,
                    //if there is a shorter segment match later in a matching
                    //config, then favor over this star map.
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            return name;
        }


        function makeShimExports(value) {
            function fn() {
                var ret;
                if (value.init) {
                    ret = value.init.apply(global, arguments);
                }
                return ret || (value.exports && getGlobal(value.exports));
            }
            return fn;
        }

        function takeQueue(anonId) {
            var i, id, args, shim;
            for (i = 0; i < queue.length; i += 1) {
                //Peek to see if anon
                if (typeof queue[i][0] !== 'string') {
                    if (anonId) {
                        queue[i].unshift(anonId);
                        anonId = undef;
                    } else {
                        //Not our anon module, stop.
                        break;
                    }
                }
                args = queue.shift();
                id = args[0];
                i -= 1;

                if (!hasProp(defined, id) && !hasProp(waiting, id)) {
                    if (hasProp(deferreds, id)) {
                        main.apply(undef, args);
                    } else {
                        waiting[id] = args;
                    }
                }
            }

            //if get to the end and still have anonId, then could be
            //a shimmed dependency.
            if (anonId) {
                shim = getOwn(config.shim, anonId) || {};
                main(anonId, shim.deps || [], shim.exportsFn);
            }
        }

        function makeRequire(relName, topLevel) {
            var req = function (deps, callback, errback, alt) {
                var name, cfg;

                if (topLevel) {
                    takeQueue();
                }

                if (typeof deps === "string") {
                    if (handlers[deps]) {
                        return handlers[deps](relName);
                    }
                    //Just return the module wanted. In this scenario, the
                    //deps arg is the module name, and second arg (if passed)
                    //is just the relName.
                    //Normalize module name, if it contains . or ..
                    name = makeMap(deps, relName, true).id;
                    if (!hasProp(defined, name)) {
                        throw new Error('Not loaded: ' + name);
                    }
                    return defined[name];
                } else if (deps && !Array.isArray(deps)) {
                    //deps is a config object, not an array.
                    cfg = deps;
                    deps = undef;

                    if (Array.isArray(callback)) {
                        //callback is an array, which means it is a dependency list.
                        //Adjust args if there are dependencies
                        deps = callback;
                        callback = errback;
                        errback = alt;
                    }

                    if (topLevel) {
                        //Could be a new context, so call returned require
                        return req.config(cfg)(deps, callback, errback);
                    }
                }

                //Support require(['a'])
                callback = callback || function () {};

                //Simulate async callback;
                prim.nextTick(function () {
                    //Grab any modules that were defined after a
                    //require call.
                    takeQueue();
                    main(undef, deps || [], callback, errback, relName);
                });

                return req;
            };

            req.isBrowser = typeof document !== 'undefined' &&
                typeof navigator !== 'undefined';

            req.nameToUrl = function (moduleName, ext) {
                var paths, pkgs, pkg, pkgPath, syms, i, parentModule, url,
                    parentPath;

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
                //or ends with .js, then assume the user meant to use an url and not a module id.
                //The slash is important for protocol-less URLs as well as full paths.
                if (urlRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext || '');
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;
                    pkgs = config.pkgs;

                    syms = moduleName.split('/');
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');
                        pkg = getOwn(pkgs, parentModule);
                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            //If an array, it means there are a few choices,
                            //Choose the one that is desired
                            if (Array.isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        } else if (pkg) {
                            //If module name is just the package name, then looking
                            //for the main module.
                            if (moduleName === pkg.name) {
                                pkgPath = pkg.location + '/' + pkg.main;
                            } else {
                                pkgPath = pkg.location;
                            }
                            syms.splice(0, i, pkgPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join('/');
                    url += (ext || (/\?/.test(url) ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }

                return config.urlArgs ? url +
                                        ((url.indexOf('?') === -1 ? '?' : '&') +
                                         config.urlArgs) : url;
            };

            /**
             * Converts a module name + .extension into an URL path.
             * *Requires* the use of a module name. It does not support using
             * plain URLs like nameToUrl.
             */
            req.toUrl = function (moduleNamePlusExt) {
                var index = moduleNamePlusExt.lastIndexOf('.'),
                    ext = null;

                if (index !== -1) {
                    ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                    moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                }

                return req.nameToUrl(normalize(moduleNamePlusExt, relName), ext);
            };

            req.defined = function (id) {
                return hasProp(defined, makeMap(id, relName, true).id);
            };

            req.specified = function (id) {
                id = makeMap(id, relName, true).id;
                return hasProp(defined, id) || hasProp(deferreds, id);
            };

            return req;
        }

        function resolve(name, d, value) {
            if (name) {
                defined[name] = value;
            }
            d.resolve(value);
        }

        function makeNormalize(relName) {
            return function (name) {
                return normalize(name, relName, true);
            };
        }

        function defineModule(d) {
            var name = d.map.id,
                ret = d.factory.apply(defined[name], d.values);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports.
                //After that, favor a non-undefined return
                //value over exports use.
                if (d.cjsModule && d.cjsModule.exports !== undef &&
                        d.cjsModule.exports !== defined[name]) {
                    ret = d.cjsModule.exports;
                } else if (ret === undef && d.usingExports) {
                    ret = defined[name];
                }
                resolve(name, d, ret);
            } else {
                d.resolve();
            }
        }

        //This method is attached to every module deferred,
        //so the "this" in here is the module deferred object.
        function depFinished(val, i) {
            if (!this.rejected() && !this.depDefined[i]) {
                this.depDefined[i] = true;
                this.depCount += 1;
                this.values[i] = val;
                if (this.depCount === this.depMax) {
                    defineModule(this);
                }
            }
        }

        function makeDefer(name) {
            var d = prim();
            d.map = name ? makeMap(name, null, true) : {};
            d.depCount = 0;
            d.depMax = 0;
            d.values = [];
            d.depDefined = [];
            d.depFinished = depFinished;
            if (d.map.pr) {
                //Plugin resource ID, implicitly
                //depends on plugin. Track it in deps
                //so cycle breaking can work
                d.deps = [makeMap(d.map.pr)];
            }
            return d;
        }

        function getDefer(name) {
            var d;
            if (name) {
                d = hasProp(deferreds, name) && deferreds[name];
                if (!d) {
                    d = deferreds[name] = makeDefer(name);
                }
            } else {
                d = makeDefer();
                requireDeferreds.push(d);
            }
            return d;
        }

        function makeErrback(d, name) {
            return function (err) {
                if (!d.rejected()) {
                    if (!err.dynaId) {
                        err.dynaId = 'id' + (errCount += 1);
                        err.requireModules = [name];
                    }
                    d.reject(err);
                }
            };
        }

        function waitForDep(depMap, relName, d, i) {
            d.depMax += 1;

            //Do the fail at the end to catch errors
            //in the then callback execution.
            callDep(depMap, relName).then(function (val) {
                d.depFinished(val, i);
            }, makeErrback(d, depMap.id)).fail(makeErrback(d, d.map.id));
        }

        function makeLoad(id) {
            var fromTextCalled;
            function load(value) {
                //Protect against older plugins that call load after
                //calling load.fromText
                if (!fromTextCalled) {
                    resolve(id, getDefer(id), value);
                }
            }

            load.error = function (err) {
                getDefer(id).reject(err);
            };

            load.fromText = function (text, textAlt) {
                /*jslint evil: true */
                var d = getDefer(id),
                    map = makeMap(makeMap(id).n),
                    plainId = map.id;

                fromTextCalled = true;

                //Set up the factory just to be a return of the value from
                //plainId.
                d.factory = function (p, val) {
                    return val;
                };

                //As of requirejs 2.1.0, support just passing the text, to reinforce
                //fromText only being called once per resource. Still
                //support old style of passing moduleName but discard
                //that moduleName in favor of the internal ref.
                if (textAlt) {
                    text = textAlt;
                }

                //Transfer any config to this other module.
                if (hasProp(config.config, id)) {
                    config.config[plainId] = config.config[id];
                }

                try {
                    req.exec(text);
                } catch (e) {
                    throw new Error('fromText eval for ' + plainId +
                                    ' failed: ' + e);
                }

                //Execute any waiting define created by the plainId
                takeQueue(plainId);

                //Mark this as a dependency for the plugin
                //resource
                d.deps = [map];
                waitForDep(map, null, d, d.deps.length);
            };

            return load;
        }

        load = typeof importScripts === 'function' ?
                function (map) {
                    var url = map.url;
                    if (urlFetched[url]) {
                        return;
                    }
                    urlFetched[url] = true;

                    //Ask for the deferred so loading is triggered.
                    //Do this before loading, since loading is sync.
                    getDefer(map.id);
                    importScripts(url);
                    takeQueue(map.id);
                } :
                function (map) {
                    var script,
                        id = map.id,
                        url = map.url;

                    if (urlFetched[url]) {
                        return;
                    }
                    urlFetched[url] = true;

                    script = document.createElement('script');
                    script.setAttribute('data-requiremodule', id);
                    script.type = config.scriptType || 'text/javascript';
                    script.charset = 'utf-8';
                    script.async = true;

                    loadCount += 1;

                    script.addEventListener('load', function () {
                        loadCount -= 1;
                        takeQueue(id);
                    }, false);
                    script.addEventListener('error', function () {
                        loadCount -= 1;
                        var err,
                            pathConfig = getOwn(config.paths, id),
                            d = getOwn(deferreds, id);
                        if (pathConfig && Array.isArray(pathConfig) && pathConfig.length > 1) {
                            script.parentNode.removeChild(script);
                            //Pop off the first array value, since it failed, and
                            //retry
                            pathConfig.shift();
                            d.map = makeMap(id);
                            load(d.map);
                        } else {
                            err = new Error('Load failed: ' + id + ': ' + script.url);
                            err.requireModules = [id];
                            getDefer(id).reject(err);
                        }
                    }, false);

                    script.src = url;

                    document.head.appendChild(script);
                };

        function callPlugin(plugin, map, relName) {
            plugin.load(map.n, makeRequire(relName), makeLoad(map.id), {});
        }

        callDep = function (map, relName) {
            var args,
                name = map.id,
                shim = config.shim[name];

            if (hasProp(waiting, name)) {
                args = waiting[name];
                delete waiting[name];
                main.apply(undef, args);
            } else if (!hasProp(deferreds, name)) {
                if (map.pr) {
                    return callDep(makeMap(map.pr)).then(function (plugin) {
                        //Redo map now that plugin is known to be loaded
                        var newMap = makeMap(name, relName, true),
                            newId = newMap.id,
                            shim = getOwn(config.shim, newId);

                        //Make sure to only call load once per resource. Many
                        //calls could have been queued waiting for plugin to load.
                        if (!hasProp(calledPlugin, newId)) {
                            calledPlugin[newId] = true;
                            if (shim && shim.deps) {
                                req(shim.deps, function () {
                                    callPlugin(plugin, newMap, relName);
                                });
                            } else {
                                callPlugin(plugin, newMap, relName);
                            }
                        }
                        return getDefer(newId).promise;
                    });
                } else if (shim && shim.deps) {
                    req(shim.deps, function () {
                        load(map);
                    });
                } else {
                    load(map);
                }
            }

            return getDefer(name).promise;
        };

        //Turns a plugin!resource to [plugin, resource]
        //with the plugin being undefined if the name
        //did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        /**
         * Makes a name map, normalizing the name, and using a plugin
         * for normalization if necessary. Grabs a ref to plugin
         * too, as an optimization.
         */
        makeMap = function (name, relName, applyMap) {
            if (typeof name !== 'string') {
                return name;
            }

            var plugin, url,
                parts = splitPrefix(name),
                prefix = parts[0];

            name = parts[1];

            if (prefix) {
                prefix = normalize(prefix, relName, applyMap);
                plugin = hasProp(defined, prefix) && defined[prefix];
            }

            //Normalize according
            if (prefix) {
                if (plugin && plugin.normalize) {
                    name = plugin.normalize(name, makeNormalize(relName));
                } else {
                    name = normalize(name, relName, applyMap);
                }
            } else {
                name = normalize(name, relName, applyMap);
                parts = splitPrefix(name);
                prefix = parts[0];
                name = parts[1];

                url = req.nameToUrl(name);
            }

            //Using ridiculous property names for space reasons
            return {
                id: prefix ? prefix + '!' + name : name, //fullName
                n: name,
                pr: prefix,
                url: url
            };
        };

        function makeConfig(name) {
            return function () {
                return config.config[name] || {};
            };
        }

        handlers = {
            require: function (name) {
                return makeRequire(name);
            },
            exports: function (name) {
                var e = defined[name];
                if (typeof e !== 'undefined') {
                    return e;
                } else {
                    return (defined[name] = {});
                }
            },
            module: function (name) {
                return {
                    id: name,
                    uri: '',
                    exports: defined[name],
                    config: makeConfig(name)
                };
            }
        };

        function breakCycle(d, traced, processed) {
            var id = d.map.id;

            traced[id] = true;
            if (!d.finished() && d.deps) {
                d.deps.forEach(function (depMap) {
                    var depIndex,
                        depId = depMap.id,
                        dep = !hasProp(handlers, depId) && getDefer(depId);

                    //Only force things that have not completed
                    //being defined, so still in the registry,
                    //and only if it has not been matched up
                    //in the module already.
                    if (dep && !dep.finished() && !processed[depId]) {
                        if (hasProp(traced, depId)) {
                            d.deps.some(function (depMap, i) {
                                if (depMap.id === depId) {
                                    depIndex = i;
                                    return true;
                                }
                            });
                            d.depFinished(defined[depId], depIndex);
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
            }
            processed[id] = true;
        }

        function check() {
            loadTimeId = 0;

            var err,
                reqDefs = [],
                noLoads = [],
                waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (startTime + waitInterval) < (new Date()).getTime();

            if (loadCount === 0) {
                reqDefs = requireDeferreds.filter(function (d) {
                    //Only want deferreds that have not finished.
                    return !d.finished();
                });

                if (reqDefs.length) {
                    //Something is not resolved. Dive into it.
                    eachProp(deferreds, function (d) {
                        if (!d.finished()) {
                            noLoads.push(d);
                        }
                    });

                    if (noLoads.length) {
                        reqDefs.forEach(function (d) {
                            breakCycle(d, {}, {});
                        });
                    }
                }
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if (expired) {
                //If wait time expired, throw error of unloaded modules.
                noLoads = noLoads.map(function (d) {
                    return d.map.id;
                });
                err = new Error('Timeout for modules: ' + noLoads);
                err.requireModules = noLoads;
                req.onError(err);
            } else if (loadCount || reqDefs.length) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if (!loadTimeId) {
                    loadTimeId = prim.nextTick(check);
                }
            }
        }

        //Used to break out of the promise try/catch chains.
        function delayedError(e) {
            prim.nextTick(function () {
                if (!e.dynaId || !trackedErrors[e.dynaId]) {
                    trackedErrors[e.dynaId] = true;
                    req.onError(e);
                }
            });
        }

        main = function (name, deps, factory, errback, relName) {
            //Only allow main calling once per module.
            if (name && hasProp(calledDefine, name)) {
                return;
            }
            calledDefine[name] = true;

            var d = getDefer(name);

            //This module may not have dependencies
            if (deps && !Array.isArray(deps)) {
                //deps is not an array, so probably means
                //an object literal or factory function for
                //the value. Adjust args.
                factory = deps;
                deps = [];
            }

            d.promise.fail(errback || delayedError);

            //Use name if no relName
            relName = relName || name;

            //Call the factory to define the module, if necessary.
            if (typeof factory === 'function') {

                if (!deps.length && factory.length) {
                    //Remove comments from the callback string,
                    //look for require calls, and pull them into the dependencies,
                    //but only if there are function args.
                    factory
                        .toString()
                        .replace(commentRegExp, '')
                        .replace(cjsRequireRegExp, function (match, dep) {
                            deps.push(dep);
                        });

                    //May be a CommonJS thing even without require calls, but still
                    //could use exports, and module. Avoid doing exports and module
                    //work though if it just needs require.
                    //REQUIRES the function to expect the CommonJS variables in the
                    //order listed below.
                    deps = (factory.length === 1 ?
                            ['require'] :
                            ['require', 'exports', 'module']).concat(deps);
                }

                //Save info for use later.
                d.factory = factory;
                d.deps = deps;

                deps.forEach(function (depName, i) {
                    var depMap;
                    deps[i] = depMap = makeMap(depName, relName, true);
                    depName = depMap.id;

                    //Fast path CommonJS standard dependencies.
                    if (depName === "require") {
                        d.values[i] = handlers.require(name);
                    } else if (depName === "exports") {
                        //CommonJS module spec 1.1
                        d.values[i] = handlers.exports(name);
                        d.usingExports = true;
                    } else if (depName === "module") {
                        //CommonJS module spec 1.1
                        d.values[i] = d.cjsModule = handlers.module(name);
                    } else {
                        waitForDep(depMap, relName, d, i);
                    }
                });

                //Some modules just depend on the require, exports, modules, so
                //trigger their definition here if so.
                if (d.depCount === d.depMax) {
                    defineModule(d);
                }
            } else if (name) {
                //May just be an object definition for the module. Only
                //worry about defining if have a module name.
                resolve(name, d, factory);
            }

            startTime = (new Date()).getTime();

            if (!name) {
                check();
            }
        };

        req = makeRequire(null, true);

        /*
         * Just drops the config on the floor, but returns req in case
         * the config return value is used.
         */
        req.config = function (cfg) {
            if (cfg.context && cfg.context !== contextName) {
                return newContext(cfg.context).config(cfg);
            }

            //Make sure the baseUrl ends in a slash.
            if (cfg.baseUrl) {
                if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                    cfg.baseUrl += '/';
                }
            }

            //Save off the paths and packages since they require special processing,
            //they are additive.
            var primId,
                pkgs = config.pkgs,
                shim = config.shim,
                objs = {
                    paths: true,
                    config: true,
                    map: true
                };

            eachProp(cfg, function (value, prop) {
                if (objs[prop]) {
                    if (prop === 'map') {
                        if (!config.map) {
                            config.map = {};
                        }
                        mixin(config[prop], value, true, true);
                    } else {
                        mixin(config[prop], value, true);
                    }
                } else {
                    config[prop] = value;
                }
            });

            //Merge shim
            if (cfg.shim) {
                eachProp(cfg.shim, function (value, id) {
                    //Normalize the structure
                    if (Array.isArray(value)) {
                        value = {
                            deps: value
                        };
                    }
                    if ((value.exports || value.init) && !value.exportsFn) {
                        value.exportsFn = makeShimExports(value);
                    }
                    shim[id] = value;
                });
                config.shim = shim;
            }

            //Adjust packages if necessary.
            if (cfg.packages) {
                cfg.packages.forEach(function (pkgObj) {
                    var location;

                    pkgObj = typeof pkgObj === 'string' ? { name: pkgObj } : pkgObj;
                    location = pkgObj.location;

                    //Create a brand new object on pkgs, since currentPackages can
                    //be passed in again, and config.pkgs is the internal transformed
                    //state for all package configs.
                    pkgs[pkgObj.name] = {
                        name: pkgObj.name,
                        location: location || pkgObj.name,
                        //Remove leading dot in main, so main paths are normalized,
                        //and remove any trailing .js, since different package
                        //envs have different conventions: some use a module name,
                        //some use a file name.
                        main: (pkgObj.main || 'main')
                              .replace(currDirRegExp, '')
                              .replace(jsSuffixRegExp, '')
                    };
                });

                //Done with modifications, assing packages back to context config
                config.pkgs = pkgs;
            }

            //If want prim injected, inject it now.
            primId = config.definePrim;
            if (primId) {
                waiting[primId] = [primId, [], function () { return prim; }];
            }

            //If a deps array or a config callback is specified, then call
            //require with those args. This is useful when require is defined as a
            //config object before require.js is loaded.
            if (cfg.deps) {
                req(cfg.deps, cfg.callback);
            }

            return req;
        };

        req.onError = function (err) {
            throw err;
        };

        context = {
            id: contextName,
            defined: defined,
            waiting: waiting,
            config: config,
            deferreds: deferreds
        };

        contexts[contextName] = context;

        return req;
    }

    requirejs = topReq = newContext('_');

    if (typeof require !== 'function') {
        require = topReq;
    }

    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a better, environment-specific call. Only used for transpiling
     * loader plugins, not for plain JS modules.
     * @param {String} text the text to execute/evaluate.
     */
    topReq.exec = function (text) {
        /*jslint evil: true */
        return eval(text);
    };

    topReq.contexts = contexts;

    define = function () {
        queue.push([].slice.call(arguments, 0));
    };

    define.amd = {
        jQuery: true
    };

    if (bootstrapConfig) {
        topReq.config(bootstrapConfig);
    }

    //data-main support.
    if (topReq.isBrowser) {
        dataMain = document.querySelectorAll('script[data-main]')[0];
        dataMain = dataMain && dataMain.getAttribute('data-main');
        if (dataMain) {
            //Strip off any trailing .js since dataMain is now
            //like a module name.
            dataMain = dataMain.replace(jsSuffixRegExp, '');
            topReq([dataMain]);
        }
    }
}(this));

define("alameda", function(){});

var window = self;

function consoleHelper() {
  var msg = arguments[0] + ':';
  for (var i = 1; i < arguments.length; i++) {
    msg += ' ' + arguments[i];
  }
  msg += '\x1b[0m\n';
  dump(msg);
}
window.console = {
  log: consoleHelper.bind(null, '\x1b[32mWLOG'),
  error: consoleHelper.bind(null, '\x1b[31mWERR'),
  info: consoleHelper.bind(null, '\x1b[36mWINF'),
  warn: consoleHelper.bind(null, '\x1b[33mWWAR')
};

var document = { cookie: null };

define("mailapi/worker-bootstrap", function(){});

// set location of dynamically loaded layers.
require.config({
  baseUrl: '..',
  paths: {
    // mailcomposer is in the mailapi/composer layer.
    mailcomposer: 'mailapi/composer',

    // Point activesync protocol modules to their layer
    'wbxml': 'mailapi/activesync/protocollayer',
    'activesync/codepages': 'mailapi/activesync/protocollayer',
    'activesync/protocol': 'mailapi/activesync/protocollayer',

    // activesync/codepages is split across two layers. If
    // activesync/protocol loads first (for autoconfig work on account setup),
    // then indicate the parts of codepages that are in activesync/configurator
    'activesync/codepages/FolderHierarchy':
                                      'mailapi/activesync/configurator',
    'activesync/codepages/ComposeMail':
                                      'mailapi/activesync/configurator',
    'activesync/codepages/AirSync':
                                      'mailapi/activesync/configurator',
    'activesync/codepages/AirSyncBase':
                                      'mailapi/activesync/configurator',
    'activesync/codepages/ItemEstimate':
                                      'mailapi/activesync/configurator',
    'activesync/codepages/Email':
                                      'mailapi/activesync/configurator',
    'activesync/codepages/ItemOperations':
                                      'mailapi/activesync/configurator',
    'activesync/codepages/Move':
                                      'mailapi/activesync/configurator',

    // Point chew methods to the chew layer
    'mailapi/htmlchew': 'mailapi/chewlayer',
    'mailapi/quotechew': 'mailapi/chewlayer',
    'mailapi/mailchew': 'mailapi/chewlayer',
    'mailapi/imap/imapchew': 'mailapi/chewlayer',

    // Imap body fetching / parsing / sync
    'mailapi/imap/protocol/sync': 'mailapi/imap/protocollayer',
    'mailapi/imap/protocol/textparser': 'mailapi/imap/protocollayer',
    'mailapi/imap/protocol/snippetparser': 'mailapi/imap/protocollayer',
    'mailapi/imap/protocol/bodyfetcher': 'mailapi/imap/protocollayer',

    // 'tls' is actually in both the SMTP probe and IMAP probe, but the SMTP
    // probe is much smaller, so if someone requests it outright, just use that.
    'tls': 'mailapi/smtp/probe',

    // The imap probe layer also contains the imap module
    'imap': 'mailapi/imap/probe',

    // The smtp probe layer also contains the simpleclient
    'simplesmtp/lib/client': 'mailapi/smtp/probe'
  },
  scriptType: 'application/javascript;version=1.8',
  definePrim: 'prim'
});

// q shim for rdcommon/log, just enough for it to
// work. Just uses defer, promise, resolve and reject.
define('q', ['prim'], function (prim) {
  return {
    defer: prim
  };
});


define("config", function(){});

/**
 * Look like node's Buffer implementation as far as our current callers require
 * using typed arrays.  Derived from the node.js implementation as copied out of
 * the node-browserify project.
 *
 * Be careful about assuming the meaning of encoders and decoders here; we are
 * using the nomenclature of the StringEncoding spec.  So:
 *
 * - encode: JS String --> ArrayBufferView
 * - decode: ArrayBufferView ---> JS String
 **/
define('buffer',['require','exports','module'],function(require, exports, module) {

function coerce(length) {
  // Coerce length to a number (possibly NaN), round up
  // in case it's fractional (e.g. 123.456) then do a
  // double negate to coerce a NaN to 0. Easy, right?
  length = ~~Math.ceil(+length);
  return length < 0 ? 0 : length;
}

var ENCODER_OPTIONS = { fatal: false };

/**
 * Safe atob-variant that does not throw exceptions and just ignores characters
 * that it does not know about.  This is an attempt to mimic node's
 * implementation so that we can parse base64 with newlines present as well
 * as being tolerant of complete gibberish people throw at us.  Since we are
 * doing this by hand, we also take the opportunity to put the output directly
 * in a typed array.
 *
 * In contrast, window.atob() throws Exceptions for all kinds of angry reasons.
 */
function safeBase64DecodeToArray(s) {
  var bitsSoFar = 0, validBits = 0, iOut = 0,
      arr = new Uint8Array(Math.ceil(s.length * 3 / 4));
  for (var i = 0; i < s.length; i++) {
    var c = s.charCodeAt(i), bits;
    if (c >= 65 && c <= 90) // [A-Z]
      bits = c - 65;
    else if (c >= 97 && c <= 122) // [a-z]
      bits = c - 97 + 26;
    else if (c >= 48 && c <= 57) // [0-9]
      bits = c - 48 + 52;
    else if (c === 43) // +
      bits = 62;
    else if (c === 47) // /
      bits = 63;
    else if (c === 61) { // =
      validBits = 0;
      continue;
    }
    // ignore all other characters!
    else
      continue;
    bitsSoFar = (bitsSoFar << 6) | bits;
    validBits += 6;
    if (validBits >= 8) {
      validBits -= 8;
      arr[iOut++] = bitsSoFar >> validBits;
      if (validBits === 2)
        bitsSoFar &= 0x3;
      else if (validBits === 4)
        bitsSoFar &= 0xf;
    }
  }

  if (iOut < arr.length)
    return arr.subarray(0, iOut);
  return arr;
}

/**
 * Encode a unicode string into a (Uint8Array) byte array with the given
 * encoding. Wraps TextEncoder to provide hex and base64 "encoding" (which it
 * does not provide).
 */
function encode(string, encoding) {
  var buf, i;
  switch (encoding) {
    case 'base64':
      buf = safeBase64DecodeToArray(string);
      return buf;
    case 'binary':
      buf = new Uint8Array(string.length);
      for (i = 0; i < string.length; i++) {
        buf[i] = string.charCodeAt(i);
      }
      return buf;
    case 'hex':
      buf = new Uint8Array(string.length * 2);
      for (i = 0; i < string.length; i++) {
        var c = string.charCodeAt(i), nib;
        nib = c >> 4;
        buf[i*2] = (nib < 10) ? (nib + 48) : (nib - 10 + 97);
        nib = c & 0xf;
        buf[i*2 + 1] = (nib < 10) ? (nib + 48) : (nib - 10 + 97);
      }
      return buf;
    // need to normalize the name (for now at least)
    case 'utf8':
      encoding = 'utf-8';
    default:
      if (!encoding)
        encoding = 'utf-8';
      return TextEncoder(encoding, ENCODER_OPTIONS).encode(string);
  }
}

/**
 * Decode a Uint8Array/DataView into a unicode string given the encoding of the
 * byte stream.  Wrap TextDecoder to provide hex and base64 decoding (which it
 * does not provide).
 */
function decode(view, encoding) {
  var sbits, i;
  switch (encoding) {
    case 'base64':
      // base64 wants a string, so go through binary first...
    case 'binary':
      sbits = new Array(view.length);
      for (i = 0; i < view.length; i++) {
        sbits[i] = String.fromCharCode(view[i]);
      }
      // (btoa is binary JS string -> base64 ASCII string)
      if (encoding === 'base64')
        return window.btoa(sbits.join(''));
      return sbits.join('');
    case 'hex':
      sbits = new Array(view.length / 2);
      for (i = 0; i < view.length; i += 2) {
        var nib = view[i], c;
        if (nib <= 57)
          c = 16 * (nib - 48);
        else if (nib < 97)
          c = 16 * (nib - 64 + 10);
        else
          c = 16 * (nib - 97 + 10);
        nib = view[i+1];
        if (nib <= 57)
          c += (nib - 48);
        else if (nib < 97)
          c += (nib - 64 + 10);
        else
          c += (nib - 97 + 10);
        sbits.push(String.fromCharCode(c));
      }
      return sbits.join('');
    // need to normalize the name (for now at least)
    case 'utf8':
      encoding = 'utf-8';
    default:
      if (!encoding)
        encoding = 'utf-8';
      return TextDecoder(encoding, ENCODER_OPTIONS).decode(view);
  }
}

/**
 * Create a buffer which is really a typed array with some methods annotated
 * on.
 */
function Buffer(subject, encoding, offset) {
  // The actual buffer that will become 'this'.
  var buf;
  var type;

  // Are we slicing?
  if (typeof offset === 'number') {
    // create a sub-view
    buf = subject.subarray(offset, coerce(encoding) + offset);
  } else {
    // Find the length
    switch (type = typeof subject) {
      case 'number':
        buf = new Uint8Array(coerce(subject));
        break;

      case 'string':
        buf = encode(subject, encoding);
        break;

      case 'object': // Assume object is an array
        // only use it verbatim if it's a buffer and we see it as such (aka
        // it's from our compartment)
        if (buf instanceof Uint8Array)
          buf = subject;
        else
          buf = new Uint8Array(subject);
        break;

      default:
        throw new Error('First argument needs to be a number, ' +
                        'array or string.');
    }
  }

  // Return the mixed-in Uint8Array to be our 'this'!
  return buf;
}
exports.Buffer = Buffer;

Buffer.byteLength = function Buffer_byteLength(string, encoding) {
  var buf = encode(string, encoding);
  return buf.length;
};

Buffer.isBuffer = function Buffer_isBuffer(obj) {
  return ((obj instanceof Uint8Array) &&
          obj.copy === BufferPrototype.copy);
};

// POSSIBLY SUBTLE AND DANGEROUS THING: We are actually clobbering stuff onto
// the Uint8Array prototype.  We do this because we're not allowed to mix our
// contributions onto the instance types, leaving us only able to mess with
// the prototype.  This obviously may affect other consumers of Uint8Array
// operating in the same global-space.
var BufferPrototype = Uint8Array.prototype;

BufferPrototype.copy = function(target, target_start, start, end) {
  var source = this;
  start || (start = 0);
  end || (end = this.length);
  target_start || (target_start = 0);

  if (end < start) throw new Error('sourceEnd < sourceStart');

  // Copy 0 bytes; we're done
  if (end === start) return;
  if (target.length == 0 || source.length == 0) return;

  if (target_start < 0 || target_start >= target.length) {
    throw new Error('targetStart out of bounds');
  }

  if (start < 0 || start >= source.length) {
    throw new Error('sourceStart out of bounds');
  }

  if (end < 0 || end > source.length) {
    throw new Error('sourceEnd out of bounds');
  }

  // Are we oob?
  if (end > this.length) {
    end = this.length;
  }

  if (target.length - target_start < end - start) {
    end = target.length - target_start + start;
  }

  for (var i = start; i < end; i++) {
    target[i + target_start] = this[i];
  }
};

BufferPrototype.slice = function(start, end) {
  if (end === undefined) end = this.length;

  if (end > this.length) {
    throw new Error('oob');
  }
  if (start > end) {
    throw new Error('oob');
  }
  return Buffer(this, end - start, +start);
};

/**
 * Your buffer has some binary data in it; create a string from that data using
 * the specified encoding.  For example, toString("base64") will hex-encode
 * the contents of the buffer.
 */
BufferPrototype.toString = function(encoding, start, end) {
  encoding = String(encoding || 'utf-8').toLowerCase();
  start = +start || 0;
  if (typeof end == 'undefined') end = this.length;

  // Fastpath empty strings
  if (+end == start) {
    return '';
  }
  if (start === 0 && end === this.length)
    return decode(this, encoding);
  else
    return decode(this.subarray(start, end), encoding);
  // In case things get slow again, comment the above block and uncomment:
/*
var rval, before = Date.now();
  if (start === 0 && end === this.length)
    rval = decode(this, encoding);
  else
    rval = decode(this.subarray(start, end), encoding);
  var delta = Date.now() - before;
  if (delta > 2)
    console.error('SLOWDECODE', delta, end - start, encoding);
  return rval;
*/
};

BufferPrototype.write  = function(string, offset, length, encoding) {
  // Support both (string, offset, length, encoding)
  // and the legacy (string, encoding, offset, length)
  if (isFinite(offset)) {
    if (!isFinite(length)) {
      encoding = length;
      length = undefined;
    }
  } else {  // legacy
    var swap = encoding;
    encoding = offset;
    offset = length;
    length = swap;
  }

  offset = +offset || 0;
  var remaining = this.length - offset;
  if (!length) {
    length = remaining;
  } else {
    length = +length;
    if (length > remaining) {
      length = remaining;
    }
  }
  encoding = String(encoding || 'utf-8').toLowerCase();

  var encoded = encode(string, encoding);
  for (var i = 0; i < encoded.length; i++)
    this[i + offset] = encoded[i];

  return encoded.length;
};

});

/**
 * Do the required global namespace clobbering for our node binding friends.
 **/

(function () {

// Like setTimeout, but only takes a function argument.  There's
// no time argument (always zero) and no arguments (you have to
// use a closure).
function setZeroTimeout(fn) {
  setTimeout(fn);
}

// Add the one thing we want added to the window object.
window.setZeroTimeout = setZeroTimeout;

window.process = {
  immediate: false,
  nextTick: function(cb) {
    if (this.immediate)
      cb();
    else
      window.setZeroTimeout(cb);
  }
};

}());

define('mailapi/shim-sham',
  [
    'buffer',
  ],
  function(
    $buffer
  ) {

window.Buffer = $buffer.Buffer;


}); // end define
;
define('event-queue',['require'],function (require) {
  // hackish hookup to MAGIC_ERROR_TRAPPER for unit testing; this also has the
  //  nice side-effect of cutting down on RequireJS errors at startup when
  //  Q is loading.
  return {
    enqueue: function(task) {
      setTimeout(function() {
        try {
          task();
        }
        catch(ex) {
          console.error("exception in enqueued task: " + ex);
          if (MAGIC_ERROR_TRAPPER)
            MAGIC_ERROR_TRAPPER.yoAnError(ex);
          // and re-throw it in case the platform can pick it up.
          throw ex;
        }
      }, 0);
    },
  };
});

define('microtime',['require'],function (require) {
  // workers won't have this, of course...
  if (window && window.performance && window.performance.now) {
    return {
      now: function () {
        return window.performance.now() * 1000;
      }
    };
  }

  return {
    now: function () {
      return Date.now() * 1000;
    }
  };
});

/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at:
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Raindrop Code.
 *
 * The Initial Developer of the Original Code is
 *   The Mozilla Foundation
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andrew Sutherland <asutherland@asutherland.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Exception transformation/normalization logic from the soon-to-be-dead
 *  jstut "esther" speculative test framework.  (Loggest and ArbPL are descended
 *  replacements for it.)
 *
 * This defines a "defineStackTrace" method on Error as a side-effect which
 *  means no one else but us is allowed to try that trick.  It's unclear what
 *  impact this has on the node default handlers... although I'm sure it will
 *  become obvious real quick.
 **/

define('rdcommon/extransform',
  [
    'require',
    'exports'
  ],
  function(
    require,
    exports
  ) {

var baseUrl;
// XXX previous requirejs web magic...
if (false) {
  baseUrl = require.s.contexts._.config.baseUrl;
  if (baseUrl.length > 3 && baseUrl.substring(0, 3) === "../") {
    var targUrl = document.location.origin + document.location.pathname;
    // strip down to the parent directory (lose file or just trailing "/")
    targUrl = targUrl.substring(0, targUrl.lastIndexOf("/"));
    // eat the relative bits of the baseUrl
    while (baseUrl.length >= 3 && baseUrl.substring(0, 3) === "../") {
      targUrl = targUrl.substring(0, targUrl.lastIndexOf("/"));
      baseUrl = baseUrl.substring(3);
    }
    baseUrl = targUrl + baseUrl + "/";
    console.log("baseUrl", baseUrl);
  }
}
else {
  // XXX ALMOND hack; don't even try and find node path where there is none
  /*
  require(['path'], function($path) {
    baseUrl = $path.resolve('../..');
  });
  */
}



function uneval(x) {
  return JSON.stringify(x);
}

function simplifyFilename(filename) {
  if (!filename)
    return filename;
  // simple hack to eliminate jetpack ridiculousness where we have
  //  "LONGPATH -> LONGPATH -> LONGPATH -> actualThing.js"
  if (filename.length > 96) {
    var lastSlash = filename.lastIndexOf('/');
    if (lastSlash !== -1)
      return filename.substring(lastSlash+1);
  }
  // can we reduce it?
  if (baseUrl && filename.substring(0, baseUrl.length) === baseUrl) {
    // we could take this a step further and do path analysis.
    return filename.substring(baseUrl.length);
  }
  return filename;
}

// Thunk the stack format in v8
Error.prepareStackTrace = function(e, frames) {
  var o = [];
  for (var i = 0; i < frames.length; i++) {
    var frame = frames[i];
    o.push({
      filename: simplifyFilename(frame.getFileName()),
      lineNo: frame.getLineNumber(),
      funcName: frame.getFunctionName(),
    });
  }
  return o;
};
// raise the limit in case of super-nested require()s
//Error.stackTraceLimit = 64;

// XXX not sure if this even works since Error is not supposed to be
//  configurable... provide a captureStackTrace method
// nb: and obviously, in independent sandboxes, this does jack...
if (!Error.captureStackTrace) {
  Error.captureStackTrace = function(who, errType) {
    try {
      throw new Error();
    }
    catch(ex) {
      var sframes = ex.stack.split("\n"), frames = who.stack = [], match;
      for (var i = 0; i < sframes.length; i++) {
        if ((match = SM_STACK_FORMAT.exec(sframes[i]))) {
          frames.push({
                        filename: simplifyFilename(match[2]),
                        lineNo: match[3],
                        funcName: match[1],
                      });
        }
      }
    }
  };
}

var SM_STACK_FORMAT = /^(.*)@(.+):(\d+)$/;

// this is biased towards v8/chromium for now
/**
 *
 */
exports.transformException = function transformException(e) {
  // it's conceivable someone
  if (!(e instanceof Error) &&
      // under jetpack, we are losing hard, probably because of the sandbox
      //  issue where everybody gets their own fundamentals, so check for stack.
      (!e || typeof(e) !== "object" || !("stack" in e))) {
    return {
      n: "Object",
      m: "" + e,
      f: [],
    };
  }

  var stack = e.stack;
  // evidence of v8 thunk?
  if (Array.isArray(stack)) {
    return {
      n: e.name,
      m: e.message,
      f: stack,
    };
  }

  // handle the spidermonkey case, XXX maybe
  var o = {
    n: e.name,
    m: e.message,
    f: [],
  };
  if (stack) {
    var sframes = stack.split("\n"), frames = o.f, match;
    for (var i = 0; i < sframes.length; i++) {
      if ((match = SM_STACK_FORMAT.exec(sframes[i]))) {
        frames.push({
          filename: simplifyFilename(match[2]),
          lineNo: match[3],
          funcName: match[1],
        });
      }
    }
  }
  // otherwise this is probably an XPConnect exception...
  else if (e.filename) {
    o.f.push({
      filename: e.filename,
      lineNo: e.lineNumber,
      funcName: '',
    });
  }
  return o;
};

}); // end define
;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at:
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Raindrop Code.
 *
 * The Initial Developer of the Original Code is
 *   The Mozilla Foundation
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andrew Sutherland <asutherland@asutherland.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Raindrop-specific testing/logging setup; right now holds initial 'loggest'
 *  implementation details that should get refactored out into their own
 *  thing.
 *
 * The permutations of logger logic is getting a bit ugly and may be burning
 *  more cycles than is strictly necessary.  The long-term plan is some kind
 *  of simple (runtime) code generation.  The biggest win for that is considered
 *  that it will simplify our code in here and generate an obvious byproduct
 *  that is easily understood.  In cases where startup time is a concern, the
 *  generated code can also be persisted (like via RequireJS optimizer stage).
 *  This is not happening yet.
 *
 *
 * There is a need for raindrop-specific logging logic because names tend to
 *  be application specific things as well as the determination of what is
 *  interesting.
 *
 * @typedef[ListyLogEntry @list[
 *   @param[eventName String]
 *   @rest[Object]
 * ]]{
 *   The current format is meant to be generally human-readable.  We put the
 *   name of the event at the front because it most concisely expresses what
 *   is happening.  We put the details of the event after that, with the
 *   timestamp second from last and the global sequence number last.  The timing
 *   information goes last because the timestamp (uS) is going to tend to be a
 *   big number that is hard for a human to process, but serves as a nice visual
 *   delimiter for the sequence id that comes after that humans can understand.
 *   It is not useful to have it earlier because it would offset the details of
 *   the event too far from the event name.
 * }
 * @typedef[ActorUniqueName Number]{
 *   A positive (> 0) unique value for the effective namespace.
 * }
 * @typedef[ThingUniqueName Number]{
 *   A negative (< 0) unique value for the effective namespace.
 * }
 * @typedef[UniqueName @oneof[ActorUniqueName ThingUniqueName]]{
 *   Actor/logger names are positive, thing names are negative.  We do this so
 *   that even without resolving the identifiers we can present a human
 *   comprehensible understanding of semantic identifiers.
 * }
 * @typedef[SemanticIdent @oneof[
 *   @case[String]{
 *     A human readable string with no special significance.
 *   }
 *   @case[@listof[@oneof[UniqueName String]]]{
 *     A list containing human-readable strings with interspersed references to
 *     loggers/actors and things.  When displayed, the unique name references
 *     should be replaced with custom display objects (possibly just hyperlinks)
 *     which should include a human-understandable representation of what the
 *     name is referencing.  Entries in the list should be joined so that
 *     whitespace is inserted if the adjacent object is not a string or the
 *     string does not already contain whitespace or punctuation that does not
 *     require whitespace at the given point.  More specifically, the "inside"
 *     of parentheses/brackets/braces and the left side of
 *     colons/semicolons/commas do not require whitespace.  We also
 *     automatically insert commas-with-whitespace between consecutive named
 *     references.
 *
 *     String literals must not be adjacent to other string literals; you must
 *     coalesce them.  The whitespace logic can optimize based on this
 *     assumption.
 *   }
 * ]]
 * @typedef[HierLogFrag @dict[
 *   @key[loggerIdent String]{
 *     The schema name that defines this logger; the key in the dictionary
 *     passed to `register`.
 *   }
 *   @key[semanticIdent SemanticIdent]{
 *     Explains to humans what this logger is about.  It is not required to be
 *     unique, but if code always passes in the same constant string, it's
 *     probably not being super helpful.
 *
 *     Examples include:
 *     - Test case names.
 *     - Parameterized test steps. (Client A sending a message to Client B.)
 *     - Parameterized connections. (Server A talking to Server B.)
 *   }
 *   @key[uniqueName UniqueName]{
 *     A unique identifier not previously used in the effective namespace
 *     of the root HierLogFrag for this tree and all its descendents.
 *   }
 *   @key[born #:optional TimestampUS]{
 *     Timestamp of when this logger was instantiated.
 *   }
 *   @key[died #:optional TimestampUS]{
 *     Timestamp of when this logger was marked dead.
 *   }
 *   @key[entries @listof[ListyLogEntry]]{
 *     The log entries for this logger this time-slice.
 *   }
 *   @key[kids #:optional @listof[HierLogFrag]]{
 *     Log fragments of loggers deemed to be conceptually children of the logger
 *     that produced this logger.  For example, an HTTP server would have a
 *     logger and its connection workers would be loggers that are children of
 *     the server.
 *   }
 * ]]{
 *   Loggers are organized into hierarchies
 * }
 * @typedef[HierLogTimeSlice @dict[
 *   @key[begin TimestampUS]
 *   @key[end TimestampUS]
 *   @key[logFrag HierLogFrag]
 * ]]{
 *
 * }
 *
 * @typedef[ActorLifecycleNotifFunc @func[
 *   @args[
 *     @param[event @oneof["attach" "dead"]]
 *     @param[instance Object]{
 *       The instance associated with the logger.
 *     }
 *     @param[logger Logger]
 *   ]
 * ]]{
 *   Notification function to be invoked when an actor gets attached to its
 *   matching logger.
 * }
 *
 * == Original Brainstorming ==
 *  + Unit Test Understanding
 *    - Want to know what the participants are and the high-level messages that
 *       are being exchanged, plus the ability to drill down into the messages.
 *      => logging should expose the actor (with type available)
 *      => message transmission should optionally have high-level logging
 *          associated in a way that provides us with the message or lets us
 *          sniff the payload
 *  + Unit Test Failure Diagnosis
 *    - Want to know what a good run looked like, and the differences between
 *       this run and that run.
 *      => the viewer has access to a data-store.
 *  + Debugging (General)
 *    - Want to be able to trace message delivery and related activities
 *       across the system.
 *      => Use global names where possible, perhaps identity key and message
 *          hashes and TCP endpoint identifiers should allow reconstitution.
 *      x> Having clients pass around extra identifiers seems dangerous.  (Do
 *          not provide attackers with anything they do not already have,
 *          although debugging tools will of course make making use of that
 *          info easier.)
 *  + System Understanding (Initial, non-live, investigative)
 *    - Likely want what unit test understanding provides but with higher level
 *       capabilities.
 *  + System Understanding (Steady-state with testing system)
 *    - Likely want initial understanding unit test-level data but with only
 *       the traffic information and no ability to see the (private) data.
 *  + Automated Performance Runs / Regression Detection
 *    - Want timestamps of progress of message delivery.
 *    - Want easily comparable data.
 *  + At Scale Performance Understanding
 *    - Want to know throughput, latency of the various parts of the system,
 *       plus the ability to sample specific trace timelines.
 *  + At Scale Debugging of specific failures (ex: 1 user having trouble)
 *    - Want to be able to enable logging for the specific user, trace
 *       across the system.
 *
 *  + General
 *    - Want to be able to easily diff for notable changes...
 *      => Markup or something should indicate values that will vary between
 *          runs.  (Maybe as part of context?)
 *
 *  + Logging efficiency
 *    - Want minimal impact when not enabled.
 *      - But willing to accept some hit for the benefit of logging.
 *      - Assume JITs can try and help us out if we help them.
 *    - Don't want to clutter up the code with logging code.
 *    - Don't want debugging logging code that can compromise privacy
 *       accidentally active.
 *      => Use decoration/monkeypatching for debugging logging, isolated in
 *          a sub-tree that can be completely excluded from the production
 *          build process.  Have the decoration/monkeypatching be loud
 *          about what it's doing or able to fail, etc.
 *    - Nice if it's obvious that we can log/trace at a point.
 *    => Place always-on event logging in the code at hand.
 *    => Use (pre-computed) conditionals or maybe alternate classes for
 *        runtime optional logging.
 *
 *  + Storage / Transit efficiency
 *    - Want logging for test runs broken up into initialization logging and
 *       per-test compartments.
 *    => Time-bucketing (per "channel") likely sufficient for debugging logging
 *        purposes.
 *    => Performance stuff that can't be reduced to time-series probably wants
 *        its own channel, and its data should be strongly biased to aggregates.
 **/

define('rdcommon/log',
  [
    'q',
    'microtime',
    './extransform',
    'exports'
  ],
  function(
    $Q,
    $microtime,
    $extransform,
    exports
  ) {

/**
 * Per-thread/process sequence identifier to provide unambiguous ordering of
 *  logging events in the hopeful event we go faster than the timestamps can
 *  track.
 *
 * The long-term idea is that this gets periodically reset in an unambiguous
 *  fashion.  Because we also package timestamps in the logs, right now we
 *  can get away with just making sure not to reset the sequence more than
 *  once in a given timestamp unit (currently 1 microsecond).  This seems
 *  quite do-able.
 *
 * Note: Timestamp granularity was initially millisecond level, which was when
 *  this really was important.
 */
var gSeq = 0;

exports.getCurrentSeq = function() {
  return gSeq;
};

/**
 * Per-thread/process next unique actor/logger name to allocate.
 */
var gUniqueActorName = 1;
/**
 * Per-thread/process next unique thing name to allocate.
 */
var gUniqueThingName = -1;

var ThingProto = exports.ThingProto = {
  get digitalName() {
    return this.__diginame;
  },
  set digitalName(val) {
    this.__diginame = val;
  },
  toString: function() {
    return '[Thing:' + this.__type + ']';
  },
  toJSON: function() {
    var o = {
      type: this.__type,
      name: this.__name,
      dname: this.__diginame,
      uniqueName: this._uniqueName,
    };
    if (this.__hardcodedFamily)
      o.family = this.__hardcodedFamily;
    return o;
  },
};

/**
 * Create a thing with the given type, name, and prototype hierarchy and which
 *  is allocated with a unique name.
 *
 * This should not be called directly by user code; it is being surfaced for use
 *  by `testcontext.js` in order to define things with names drawn from an
 *  over-arching global namespace.  The caller needs to take on the
 *  responsibility of exposing the thing via a logger or the like.
 */
exports.__makeThing = function makeThing(type, humanName, digitalName, proto) {
  var thing;
  if (proto === undefined)
    proto = ThingProto;
  thing = Object.create(proto);

  thing.__type = type;
  thing.__name = humanName;
  thing.__diginame = digitalName;
  thing.__hardcodedFamily = null;
  thing._uniqueName = gUniqueThingName--;
  return thing;
};

function NOP() {
}

/**
 * Dummy logger prototype; instances gather statistics but do not generate
 *  detailed log events.
 */
var DummyLogProtoBase = {
  _kids: undefined,
  logLevel: 'dummy',
  toString: function() {
    return '[DummyLog]';
  },
  toJSON: function() {
    // will this actually break JSON.stringify or just cause it to not use us?
    throw new Error("I WAS NOT PLANNING ON BEING SERIALIZED");
  },
  __die: NOP,
  __updateIdent: NOP,
};

/**
 * Full logger prototype; instances accumulate log details but are intended by
 *  policy to not log anything considered user-private.  This differs from
 *  `TestLogProtoBase` which, in the name of debugging and system understanding
 *  can capture private data but which should accordingly be test data.
 */
var LogProtoBase = {
  /**
   * For use by `TestContext` to poke things' names in.  Actors'/loggers' names
   *  are derived from the list of kids.  An alternate mechanism might be in
   *  order for this, since it is so extremely specialized.  This was
   *  determined better than adding yet another generic logger mechanism until
   *  a need is shown or doing monkeypatching; at least for the time-being.
   */
  _named: null,
  logLevel: 'safe',
  toJSON: function() {
    var jo = {
      loggerIdent: this.__defName,
      semanticIdent: this._ident,
      uniqueName: this._uniqueName,
      born: this._born,
      died: this._died,
      events: this._eventMap,
      entries: this._entries,
      kids: this._kids
    };
    if (this.__latchedVars.length) {
      var latchedVars = this.__latchedVars, olv = {};
      for (var i = 0; i < latchedVars.length; i++) {
        olv[latchedVars[i]] = this[':' + latchedVars[i]];
      }
      jo.latched = olv;
    }
    if (this._named)
      jo.named = this._named;
    return jo;
  },
  __die: function() {
    this._died = $microtime.now();
    if (this.__FAB._onDeath)
      this.__FAB._onDeath(this);
  },
  __updateIdent: function(ident) {
    // NOTE: you need to update useSemanticIdent if you change this.
    // normalize all object references to unique name references.
    if (Array.isArray(ident)) {
      var normIdent = [];
      for (var i = 0; i < ident.length; i++) {
        var identBit = ident[i];
        if (typeof(identBit) !== "object" || identBit == null)
          normIdent.push(identBit);
        else
          normIdent.push(identBit._uniqueName);
      }
      ident = normIdent;
    }
    this._ident = ident;
  },
};

/**
 * Test (full) logger prototype; instances generate notifications for actor
 *  expectation checking on all calls and observe arguments that may contain
 *  user-private data (but which should only contain definitively non-private
 *  test data.)
 *
 * For simplicity of implementation, this class currently just takes the
 *  functions implemented by LogProtoBase and wraps them with a parameterized
 *  decorator.
 */
var TestLogProtoBase = Object.create(LogProtoBase);
TestLogProtoBase.logLevel = 'dangerous';
TestLogProtoBase.__unexpectedEntry = function(iEntry, unexpEntry) {
  var entry = ['!unexpected', unexpEntry];
  this._entries[iEntry] = entry;
};

TestLogProtoBase.__mismatchEntry = function(iEntry, expected, actual) {
  var entry = ['!mismatch', expected, actual];
  this._entries[iEntry] = entry;
};

TestLogProtoBase.__failedExpectation = function(exp) {
  var entry = ['!failedexp', exp, $microtime.now(), gSeq++];
  this._entries.push(entry);
};

TestLogProtoBase.__die = function() {
  this._died = $microtime.now();
  var testActor = this._actor;
  if (testActor) {
    if (testActor._expectDeath) {
      testActor._expectDeath = false;
      testActor.__loggerFired();
    }
    if (testActor._lifecycleListener)
      testActor._lifecycleListener.call(null, 'dead', this.__instance, this);
  }
};

var DIED_EVENTNAME = '(died)', DIED_EXP = [DIED_EVENTNAME];

var TestActorProtoBase = {
  toString: function() {
    return '[Actor ' + this.__defName + ': ' + this.__name + ']';
  },
  toJSON: function() {
    return {
      actorIdent: this.__defName,
      semanticIdent: this.__name,
      uniqueName: this._uniqueName,
      parentUniqueName: this._parentUniqueName,
      loggerUniqueName: this._logger ? this._logger._uniqueName : null,
    };
  },

  /**
   * Invoked to attach a logger to an instance; exists to provide the
   *  possibility to generate a notification event.
   */
  __attachToLogger: function(logger) {
    logger._actor = this;
    this._logger = logger;
    if (this._lifecycleListener)
      this._lifecycleListener.call(null, 'attach', logger.__instance, logger);
  },

  /**
   * Invoke a notification function when this actor gets attached to its
   *  matching logger.  This function should be invoked as soon as possible
   *  after the creation of the actor.
   *
   * @args[
   *   @param[func ActorLifecycleNotifFunc]
   * ]
   */
  attachLifecycleListener: function(func) {
    this._lifecycleListener = func;
  },

  /**
   * Indicate that the caller is going to schedule some test events
   *  asynchronously while the step is running, so we should make sure to
   *  forbid our actor from resolving itself before a matching call to
   *  `asyncEventsAllDoneDoResolve` is made.
   */
  asyncEventsAreComingDoNotResolve: function() {
    if (!this._activeForTestStep)
      throw new Error("Attempt to set expectations on an actor (" +
                      this.__defName + ": " + this.__name + ") that is not " +
                      "participating in this test step!");
    if (this._resolved)
      throw new Error("Attempt to add expectations when already resolved!");

    // (sorta evil-hack)
    // We can reuse the _expectDeath flag as a means to ensure that we don't
    //  resolve the promise prematurely, although it's semantically suspect.
    //  (And bad things will happen if the test logger does actually die...)
    if (this._expectDeath)
      throw new Error("death expectation incompatible with async events");
    this._expectDeath = true;
  },

  /**
   * Indiate that the caller is all done dynamically scheduling test events
   *  while a test step is running, and that accordingly we can allow our
   *  test actor to resolve its promise when all the events have completed.
   */
  asyncEventsAllDoneDoResolve: function() {
    // stop saying we are expecting our death; new events will trigger
    //  resolution
    this._expectDeath = false;
    // pretend something happened to potentially trigger things now.
    this.__loggerFired();
  },

  /**
   * Expect nothing to be logged this turn, and therefore also that no
   * expectations will be added.
   */
  expectNothing: function() {
    if (this._expectations.length)
      throw new Error("Already expecting something this turn! " +
                      JSON.stringify(this._expectations[0]));
    this._expectNothing = true;
  },

  /**
   * Indicate that the only expectation we have on this actor is that its
   *  logger will die during this step.
   */
  expectOnly__die: function() {
    if (!this._activeForTestStep)
      throw new Error("Attempt to set expectations on an actor (" +
                      this.__defName + ": " + this.__name + ") that is not " +
                      "participating in this test step!");
    if (this._resolved)
      throw new Error("Attempt to add expectations when already resolved!");

    if (this._expectDeath)
      throw new Error("Already expecting our death!  " +
                      "Are you using asyncEventsAreComingDoNotResolve?");
    this._expectDeath = true;
  },

  /**
   * Set this actor to use 'set' matching for only this round; the list of
   *  expectations will be treated as an unordered set of expectations to
   *  match instead of an ordered list that must be matched exactly in order.
   *  Failures will still be generated if an entry is encountered that does not
   *  have a corresponding entry in the expectation list.
   *
   * One side-effect of this mode is that we no longer can detect what
   *  constitutes a mismatch, so we call everything unexpected that doesn't
   *  match.
   */
  expectUseSetMatching: function() {
    this._unorderedSetMode = true;
  },

  /**
   * Prepare for activity in a test step.  If we do not already have a paired
   *  logger, this will push us onto the tracking list so we will be paired when
   *  the logger is created.
   */
  __prepForTestStep: function(testRuntimeContext) {
    if (!this._logger)
      testRuntimeContext.reportPendingActor(this);
    // we should have no expectations going into a test step.
    if (this._activeForTestStep)
      this.__resetExpectations();
    this._activeForTestStep = true;
    // and also all current entries should not be considered for expectations
    // (We originally considered that we could let loggers accumulate entries
    //  in the background and then specify expectations about them in a
    //  subsequent step.  That seems confusing.  Seems far better for us to
    //  just slice a single step into multiple perspectives...)
    if (this._logger)
      this._iEntry = this._logger._entries.length;
  },

  /**
   * Issue a promise that will be resolved when all expectations of this actor
   *  have been resolved.  If no expectations have been issued, just return
   *  null.
   */
  __waitForExpectations: function() {
    if (this._expectNothing &&
        (this._expectations.length || this._iExpectation))
      return false;
    // Fail immediately if a synchronous check already failed.  (It would
    // have tried to generate a rejection, but there was no deferral at the
    // time.)
    if (!this._expectationsMetSoFar)
      return false;
    if ((this._iExpectation >= this._expectations.length) &&
        (this._expectDeath ? (this._logger && this._logger._died) : true)) {
      this._resolved = true;
      return this._expectationsMetSoFar;
    }

    if (!this._deferred)
      this._deferred = $Q.defer();
    return this._deferred.promise;
  },

  __stepCleanup: null,

  /**
   * Cleanup state at the end of the step; also, check if we moved into a
   *  failure state after resolving our promise.
   *
   * @return["success" Boolean]{
   *   True if everything is (still) satisfied, false if a failure occurred
   *   at some point.
   * }
   */
  __resetExpectations: function() {
    if (this.__stepCleanup)
      this.__stepCleanup();

    var expectationsWereMet = this._expectationsMetSoFar;
    this._expectationsMetSoFar = true;
    // kill all processed entries.
    this._iExpectation = 0;
    this._ignore = null;
    this._expectations.splice(0, this._expectations.length);
    this._expectNothing = false;
    this._expectDeath = false;
    this._unorderedSetMode = false;
    this._deferred = null;
    this._resolved = false;
    this._activeForTestStep = false;
    return expectationsWereMet;
  },

  __failUnmetExpectations: function() {
    if (this._iExpectation < this._expectations.length && this._logger) {
      for (var i = this._iExpectation; i < this._expectations.length; i++) {
        this._logger.__failedExpectation(this._expectations[i]);
      }
    }
    if (this._expectDeath && !this._logger._died)
      this._logger.__failedExpectation(DIED_EXP);
  },

  /**
   * Invoked by the test-logger associated with this actor to let us know that
   *  something has been logged so that we can perform an expectation check and
   *  fulfill our promise/reject our promise, as appropriate.
   */
  __loggerFired: function() {
    // we can't do anything if we don't have an actor.
    var entries = this._logger._entries, expy, entry;
    // -- unordered mode
    if (this._unorderedSetMode) {

      while (this._iExpectation < this._expectations.length &&
             this._iEntry < entries.length) {
        entry = entries[this._iEntry++];
        // ignore meta-entries (which are prefixed with a '!')
        if (entry[0][0] === "!")
          continue;
        // ignore ignored entries
        if (this._ignore && this._ignore.hasOwnProperty(entry[0]))
          continue;

        // - try all the expectations for a match
        var foundMatch = false;
        for (var iExp = this._iExpectation; iExp < this._expectations.length;
             iExp++) {
          expy = this._expectations[iExp];

          // - on matches, reorder the expectation and bump our pointer
          if (expy[0] === entry[0] &&
              this['_verify_' + expy[0]](expy, entry)) {
            if (iExp !== this._iExpectation) {
              this._expectations[iExp] = this._expectations[this._iExpectation];
              this._expectations[this._iExpectation] = expy;
            }
            this._iExpectation++;
            foundMatch = true;
            break;
          }
        }
        if (!foundMatch) {
          this._logger.__unexpectedEntry(this._iEntry - 1, entry);
          this._expectationsMetSoFar = false;
          if (this._deferred)
            this._deferred.reject([this.__defName, expy, entry]);
        }
      }

      // - generate an unexpected failure if we ran out of expectations
      if ((this._iExpectation === this._expectations.length) &&
          (entries.length > this._iEntry)) {
        // note: as below, there is no point trying to generate a rejection
        //  at this stage.
        this._expectationsMetSoFar = false;
        // no need to -1 because we haven't incremented past the entry.
        this._logger.__unexpectedEntry(this._iEntry, entries[this._iEntry]);
        // do increment past...
        this._iEntry++;
      }
      // - generate success if we have used up our expectations
      else if ((this._iExpectation >= this._expectations.length) &&
               this._deferred &&
               (this._expectDeath ? (this._logger && this._logger._died)
                                  : true)) {
        this._resolved = true;
        this._deferred.resolve();
      }
      return;
    }

    // -- ordered mode
    while (this._iExpectation < this._expectations.length &&
           this._iEntry < entries.length) {
      expy = this._expectations[this._iExpectation];
      entry = entries[this._iEntry++];

      // ignore meta-entries (which are prefixed with a '!')
      if (entry[0][0] === "!")
        continue;
        // ignore ignored entries
      if (this._ignore && this._ignore.hasOwnProperty(entry[0]))
        continue;

      // Currently, require exact pairwise matching between entries and
      //  expectations.
      if (expy[0] !== entry[0]) {
        this._logger.__unexpectedEntry(this._iEntry - 1, entry);
        // (fallout, triggers error)
      }
      else if (!this['_verify_' + expy[0]](expy, entry)) {
        this._logger.__mismatchEntry(this._iEntry - 1, expy, entry);
        // things did line up correctly though, so boost the expecation number
        //  so we don't convert subsequent expectations into unexpected ones.
        this._iExpectation++;
        // (fallout, triggers error)
      }
      else {
        this._iExpectation++;
        continue;
      }
      // (only bad cases fall out without hitting a continue)
      if (this._expectationsMetSoFar) {
        this._expectationsMetSoFar = false;
        if (this._deferred)
          this._deferred.reject([this.__defName, expy, entry]);
      }
      return;
    }
    // - unexpected log events should count as failure
    // We only care if: 1) we were marked active, 2) we had at least one
    //  expectation this step OR we were explicitly marked to have no
    //  expectations this step.
    // Because we will already have resolved() our promise if we get here,
    //  it's up to the test driver to come back and check us for this weird
    //  failure, possibly after waiting a tick to see if any additional events
    //  come in.
    if (this._activeForTestStep &&
        ((this._expectations.length &&
          (this._iExpectation === this._expectations.length) &&
          (entries.length > this._iEntry)) ||
         (!this._expectations.length &&
          this._expectNothing))) {
      // Only get upset if this is not an ignored event.
      if (!this._ignore ||
          !this._ignore.hasOwnProperty(entries[this._iEntry][0])) {
        this._expectationsMetSoFar = false;
        this._logger.__unexpectedEntry(this._iEntry, entries[this._iEntry]);
      }
      // We intentionally increment iEntry because otherwise we'll keep marking
      // the same entry as unexpected when that is in fact not what we desire.
      // In previous parts of this function it made sense not to increment, but
      // here it just causes confusion.
      this._iEntry++;
    }

    if ((this._iExpectation >= this._expectations.length) && this._deferred &&
        (this._expectDeath ? (this._logger && this._logger._died) : true)) {
      this._resolved = true;
      this._deferred.resolve();
    }
  },
};
exports.TestActorProtoBase = TestActorProtoBase;

/**
 * Recursive traverse objects looking for (and eliding) very long strings.  We
 *  do this because our logs are getting really large (6 megs!), and a likely
 *  source of useless bloat are the encrypted message strings.  Although we
 *  care how big the strings get, the reality is that until we switch to
 *  avro/a binary encoding, they are going to bloat horribly under JSON,
 *  especially when nested levels of encryption and JSON enter the picture.
 *
 * We will go a maximum of 3 layers deep.  Because this complicates having an
 *  efficient fast-path where we detect that we don't need to clone-and-modify,
 *  we currently always just clone-and-modify.
 */
function simplifyInsaneObjects(obj, dtype, curDepth) {
  if (obj == null || typeof(obj) !== "object")
    return obj;
  if (!curDepth)
    curDepth = 0;
  var nextDepth = curDepth + 1;
  var limitStrings = 64;

  if (dtype) {
    if (dtype === 'tostring') {
      if (Array.isArray(obj))
        return obj.join('');
      else if (typeof(obj) !== 'string')
        return obj.toString();
    }
  }

  var oot = {};
  for (var key in obj) {
    var val = obj[key];
    switch (typeof(val)) {
      case "string":
        if (limitStrings && val.length > limitStrings) {
          oot[key] = "OMITTED STRING, originally " + val.length +
                       " bytes long";
        }
        else {
          oot[key] = val;
        }
        break;
      case "object":
        if (val == null ||
            Array.isArray(val) ||
            ("toJSON" in val) ||
            curDepth >= 2) {
          oot[key] = val;
        }
        else {
          oot[key] = simplifyInsaneObjects(val, null, nextDepth);
        }
        break;
      default:
        oot[key] = val;
        break;
    }
  }
  return oot;
}

/**
 * Maximum comparison depth for argument equivalence in expectation checking.
 *  This value gets bumped every time I throw something at it that fails that
 *  still seems reasonable to me.
 */
var COMPARE_DEPTH = 6;
function boundedCmpObjs(a, b, depthLeft) {
  var aAttrCount = 0, bAttrCount = 0, key, nextDepth = depthLeft - 1;

  if ('toJSON' in a)
    a = a.toJSON();
  if ('toJSON' in b)
    b = b.toJSON();

  for (key in a) {
    aAttrCount++;
    if (!(key in b))
      return false;

    if (depthLeft) {
      if (!smartCompareEquiv(a[key], b[key], nextDepth))
        return false;
    }
    else {
      if (a[key] !== b[key])
        return false;
    }
  }
  // the theory is that if every key in a is in b and its value is equal, and
  //  there are the same number of keys in b, then they must be equal.
  for (key in b) {
    bAttrCount++;
  }
  if (aAttrCount !== bAttrCount)
    return false;
  return true;
}

/**
 * @return[Boolean]{
 *   True when equivalent, false when not equivalent.
 * }
 */
function smartCompareEquiv(a, b, depthLeft) {
  var ta = typeof(a), tb = typeof(b);
  if (ta !== 'object' || (tb !== ta) || (a == null) || (b == null))
    return a === b;
  // fast-path for identical objects
  if (a === b)
    return true;
  if (Array.isArray(a)) {
    if (!Array.isArray(b))
      return false;
    if (a.length !== b.length)
      return false;
    for (var iArr = 0; iArr < a.length; iArr++) {
      if (!smartCompareEquiv(a[iArr], b[iArr], depthLeft - 1))
        return false;
    }
    return true;
  }
  return boundedCmpObjs(a, b, depthLeft);
}
exports.smartCompareEquiv = smartCompareEquiv;

function makeIgnoreFunc(name) {
  return function ignoreFunc() {
    if (!this._ignore)
      this._ignore = {};
    this._ignore[name] = true;
  };
};

/**
 * Builds the logging and testing helper classes for the `register` driver.
 *
 * It operates in a similar fashion to wmsy's ProtoFab mechanism; state is
 *  provided to helpers by lexically closed over functions.  No code generation
 *  is used, but it's intended to be an option.
 */
function LoggestClassMaker(moduleFab, name) {
  this.moduleFab = moduleFab;
  this.name = name;

  this._latchedVars = [];

  // steady-state minimal logging logger (we always want statistics!)
  var dummyProto = this.dummyProto = Object.create(DummyLogProtoBase);
  dummyProto.__defName = name;
  dummyProto.__latchedVars = this._latchedVars;
  dummyProto.__FAB = this.moduleFab;

  // full-logging logger
  var logProto = this.logProto = Object.create(LogProtoBase);
  logProto.__defName = name;
  logProto.__latchedVars = this._latchedVars;
  logProto.__FAB = this.moduleFab;

  // testing full-logging logger
  var testLogProto = this.testLogProto = Object.create(TestLogProtoBase);
  testLogProto.__defName = name;
  testLogProto.__latchedVars = this._latchedVars;
  testLogProto.__FAB = this.moduleFab;

  // testing actor for expectations, etc.
  var testActorProto = this.testActorProto = Object.create(TestActorProtoBase);
  testActorProto.__defName = name;

  /** Maps helper names to their type for collision reporting by `_define`. */
  this._definedAs = {};
}
LoggestClassMaker.prototype = {
  /**
   * Name collision detection helper; to be invoked prior to defining a name
   *  with the type of name being defined so we can tell you both types that
   *  are colliding.
   */
  _define: function(name, type) {
    if (this._definedAs.hasOwnProperty(name)) {
      throw new Error("Attempt to define '" + name + "' as a " + type +
                      " when it is already defined as a " +
                      this._definedAs[name] + "!");
    }
    this._definedAs[name] = type;
  },

  /**
   * Wrap a logProto method to be a testLogProto invocation that generates a
   *  constraint checking thing.
   */
  _wrapLogProtoForTest: function(name) {
    var logFunc = this.logProto[name];
    this.testLogProto[name] = function() {
      var rval = logFunc.apply(this, arguments);
      var testActor = this._actor;
      if (testActor)
        testActor.__loggerFired();
      return rval;
    };
  },

  addStateVar: function(name) {
    this._define(name, 'state');

    this.dummyProto[name] = NOP;

    var stateStashName = ':' + name;
    this.logProto[name] = function(val) {
      var oldVal = this[stateStashName];
      // only log the transition if it's an actual transition
      if (oldVal === val)
        return;
      this[stateStashName] = val;
      this._entries.push([name, val, $microtime.now(), gSeq++]);
    };

    this._wrapLogProtoForTest(name);

    this.testActorProto['expect_' + name] = function(val) {
      if (!this._activeForTestStep)
        throw new Error("Attempt to set expectations on an actor (" +
                        this.__defName + ": " + this.__name + ") that is not " +
                        "participating in this test step!");
      if (this._resolved)
        throw new Error("Attempt to add expectations when already resolved!");

      this._expectations.push([name, val]);
      return this;
    };
    this.testActorProto['ignore_' + name] = makeIgnoreFunc(name);
    this.testActorProto['_verify_' + name] = function(exp, entry) {
      return smartCompareEquiv(exp[1], entry[1], COMPARE_DEPTH);
    };
  },
  /**
   * Dubious mechanism to allow logger objects to be used like a task
   *  construct that can track success/failure or some other terminal state.
   *  Contrast with state-vars which are intended to track an internal state
   *  for analysis but not to serve as a summarization of the application
   *  object's life.
   * This is being brought into being for the unit testing framework so that
   *  we can just use the logger hierarchy as the actual result hierarchy.
   *  This may be a horrible idea.
   *
   * This currently does not generate or support the expectation subsystem
   *  since the only use right now is the testing subsystem.
   */
  addLatchedState: function(name) {
    this._define(name, 'latchedState');
    this._latchedVars.push(name);
    var latchedName = ':' + name;

    this.testLogProto[name] = this.logProto[name] = this.dummyProto[name] =
        function(val) {
      this[latchedName] = val;
    };
  },
  addEvent: function(name, args, testOnlyLogArgs) {
    this._define(name, 'event');

    var numArgs = 0, useArgs = [];
    for (var key in args) {
      numArgs++;
      useArgs.push(args[key]);
    }

    this.dummyProto[name] = function() {
      this._eventMap[name] = (this._eventMap[name] || 0) + 1;
    };

    this.logProto[name] = function() {
      this._eventMap[name] = (this._eventMap[name] || 0) + 1;
      var entry = [name];
      for (var iArg = 0; iArg < numArgs; iArg++) {
        if (useArgs[iArg] === EXCEPTION) {
          var arg = arguments[iArg];
          entry.push($extransform.transformException(arg));
        }
        else {
          entry.push(arguments[iArg]);
        }
      }
      entry.push($microtime.now());
      entry.push(gSeq++);
      this._entries.push(entry);
    };

    if (!testOnlyLogArgs) {
      this._wrapLogProtoForTest(name);
    }
    else {
      var numTestOnlyArgs = 0, useTestArgs = [];
      for (key in testOnlyLogArgs) {
        numTestOnlyArgs++;
        useTestArgs.push(testOnlyLogArgs[key]);
      }
      this.testLogProto[name] = function() {
        this._eventMap[name] = (this._eventMap[name] || 0) + 1;
        var entry = [name], iArg;
        for (iArg = 0; iArg < numArgs; iArg++) {
          if (useArgs[iArg] === EXCEPTION) {
            var arg = arguments[iArg];
            entry.push($extransform.transformException(arg));
          }
          else {
            entry.push(arguments[iArg]);
          }
        }
        entry.push($microtime.now());
        entry.push(gSeq++);
        // ++ new bit
        for (var iEat=0; iEat < numTestOnlyArgs; iEat++, iArg++) {
          entry.push(simplifyInsaneObjects(arguments[iArg], useTestArgs[iEat]));
        }
        // -- end new bit
        this._entries.push(entry);
        // ++ firing bit...
        var testActor = this._actor;
        if (testActor)
          testActor.__loggerFired();
      };
    }

    this.testActorProto['expect_' + name] = function() {
      if (!this._activeForTestStep)
        throw new Error("Attempt to set expectations on an actor (" +
                        this.__defName + ": " + this.__name + ") that is not " +
                        "participating in this test step!");
      if (this._resolved)
        throw new Error("Attempt to add expectations when already resolved!");

      var exp = [name];
      for (var iArg = 0; iArg < arguments.length; iArg++) {
        if (useArgs[iArg] && useArgs[iArg] !== EXCEPTION) {
          exp.push(arguments[iArg]);
        }
      }
      this._expectations.push(exp);
      return this;
    };
    this.testActorProto['ignore_' + name] = makeIgnoreFunc(name);
    this.testActorProto['_verify_' + name] = function(tupe, entry) {
      // only check arguments we had expectations for.
      for (var iArg = 1; iArg < tupe.length; iArg++) {
        if (!smartCompareEquiv(tupe[iArg], entry[iArg], COMPARE_DEPTH))
          return false;
      }
      return true;
    };
  },
  addAsyncJob: function(name, args, testOnlyLogArgs) {
    var name_begin = name + '_begin', name_end = name + '_end';
    this.dummyProto[name_begin] = NOP;
    this.dummyProto[name_end] = NOP;

    var numArgs = 0, numTestOnlyArgs = 0, useArgs = [], useTestArgs = [];
    for (var key in args) {
      numArgs++;
      useArgs.push(args[key]);
    }

    this.logProto[name_begin] = function() {
      this._eventMap[name_begin] = (this._eventMap[name_begin] || 0) + 1;
      var entry = [name_begin];
      for (var iArg = 0; iArg < numArgs; iArg++) {
        if (useArgs[iArg] === EXCEPTION) {
          var arg = arguments[iArg];
          entry.push($extransform.transformException(arg));
        }
        else {
          entry.push(arguments[iArg]);
        }
      }
      entry.push($microtime.now());
      entry.push(gSeq++);
      this._entries.push(entry);
    };
    this.logProto[name_end] = function() {
      this._eventMap[name_end] = (this._eventMap[name_end] || 0) + 1;
      var entry = [name_end];
      for (var iArg = 0; iArg < numArgs; iArg++) {
        if (useArgs[iArg] === EXCEPTION) {
          var arg = arguments[iArg];
          entry.push($extransform.transformException(arg));
        }
        else {
          entry.push(arguments[iArg]);
        }
      }
      entry.push($microtime.now());
      entry.push(gSeq++);
      this._entries.push(entry);
    };

    if (!testOnlyLogArgs) {
      this._wrapLogProtoForTest(name_begin);
      this._wrapLogProtoForTest(name_end);
    }
    else {
      for (key in testOnlyLogArgs) {
        numTestOnlyArgs++;
        useTestArgs.push(testOnlyLogArgs[key]);
      }
      // cut-paste-modify of the above...
      this.testLogProto[name_begin] = function() {
        this._eventMap[name_begin] = (this._eventMap[name_begin] || 0) + 1;
        var entry = [name_begin];
        for (var iArg = 0; iArg < numArgs; iArg++) {
          if (useArgs[iArg] === EXCEPTION) {
            var arg = arguments[iArg];
            entry.push($extransform.transformException(arg));
          }
          else {
            entry.push(arguments[iArg]);
          }
        }
        entry.push($microtime.now());
        entry.push(gSeq++);
        // ++ new bit
        for (var iEat=0; iEat < numTestOnlyArgs; iEat++, iArg++) {
          entry.push(simplifyInsaneObjects(arguments[iArg], useTestArgs[iEat]));
        }
        // -- end new bit
        this._entries.push(entry);
        // ++ firing bit...
        var testActor = this._actor;
        if (testActor)
          testActor.__loggerFired();
      };
      this.testLogProto[name_end] = function() {
        this._eventMap[name_end] = (this._eventMap[name_end] || 0) + 1;
        var entry = [name_end];
        for (var iArg = 0; iArg < numArgs; iArg++) {
          if (useArgs[iArg] === EXCEPTION) {
            var arg = arguments[iArg];
            entry.push($extransform.transformException(arg));
          }
          else {
            entry.push(arguments[iArg]);
          }
        }
        entry.push($microtime.now());
        entry.push(gSeq++);
        // ++ new bit
        for (var iEat=0; iEat < numTestOnlyArgs; iEat++, iArg++) {
          entry.push(simplifyInsaneObjects(arguments[iArg], useTestArgs[iEat]));
        }
        // -- end new bit
        this._entries.push(entry);
        // ++ firing bit...
        var testActor = this._actor;
        if (testActor)
          testActor.__loggerFired();
      };
    }

    this.testActorProto['expect_' + name_begin] = function() {
      if (!this._activeForTestStep)
        throw new Error("Attempt to set expectations on an actor (" +
                        this.__defName + ": " + this.__name + ") that is not " +
                        "participating in this test step!");
      if (this._resolved)
        throw new Error("Attempt to add expectations when already resolved!");

      var exp = [name_begin];
      for (var iArg = 0; iArg < arguments.length; iArg++) {
        if (useArgs[iArg] && useArgs[iArg] !== EXCEPTION)
          exp.push(arguments[iArg]);
      }
      this._expectations.push(exp);
      return this;
    };
    this.testActorProto['ignore_' + name_begin] = makeIgnoreFunc(name_begin);
    this.testActorProto['expect_' + name_end] = function() {
      if (!this._activeForTestStep)
        throw new Error("Attempt to set expectations on an actor (" +
                        this.__defName + ": " + this.__name + ") that is not " +
                        "participating in this test step!");
      if (this._resolved)
        throw new Error("Attempt to add expectations when already resolved!");

      var exp = [name_end];
      for (var iArg = 0; iArg < arguments.length; iArg++) {
        if (useArgs[iArg] && useArgs[iArg] !== EXCEPTION)
          exp.push(arguments[iArg]);
      }
      this._expectations.push(exp);
      return this;
    };
    this.testActorProto['ignore_' + name_end] = makeIgnoreFunc(name_end);
    this.testActorProto['_verify_' + name_begin] =
        this.testActorProto['_verify_' + name_end] = function(tupe, entry) {
      // only check arguments we had expectations for.
      for (var iArg = 1; iArg < tupe.length; iArg++) {
        if (!smartCompareEquiv(tupe[iArg], entry[iArg], COMPARE_DEPTH))
          return false;
      }
      return true;
    };
  },
  /**
   * Call like: loggedCall(logArg1, ..., logArgN, useAsThis, func,
   *                       callArg1, ... callArgN);
   */
  addCall: function(name, logArgs, testOnlyLogArgs) {
    this._define(name, 'call');

    var numLogArgs = 0, numTestOnlyArgs = 0, useArgs = [], useTestArgs = [];
    for (var key in logArgs) {
      numLogArgs++;
      useArgs.push(logArgs[key]);
    }

    this.dummyProto[name] = function() {
      var rval;
      try {
        rval = arguments[numLogArgs+1].apply(
          arguments[numLogArgs], Array.prototype.slice.call(arguments,
                                                            numLogArgs+2));
      }
      catch(ex) {
        // (call errors are events)
        this._eventMap[name] = (this._eventMap[name] || 0) + 1;
        rval = ex;
      }
      return rval;
    };

    this.logProto[name] = function() {
      var rval, iArg;
      var entry = [name];
      for (iArg = 0; iArg < numLogArgs; iArg++) {
        entry.push(arguments[iArg]);
      }
      entry.push($microtime.now());
      entry.push(gSeq++);
      // push this prior to the call for ordering reasons (the call can log
      //  entries too!)
      this._entries.push(entry);
      try {
        rval = arguments[numLogArgs+1].apply(
          arguments[numLogArgs], Array.prototype.slice.call(arguments, iArg+2));
        entry.push($microtime.now());
        entry.push(gSeq++);
        entry.push(null);
      }
      catch(ex) {
        entry.push($microtime.now());
        entry.push(gSeq++);
        // We can't push the exception directly because its "arguments" payload
        //  can have rich object references that will cause issues during JSON
        //  serialization.  We most care that it can create circular references,
        //  but also are not crazy about serializing potentially huge object
        //  graphs.  This might be a great place to perform some logHelper
        //  style transformations.
        entry.push($extransform.transformException(ex));
        // (call errors are events)
        this._eventMap[name] = (this._eventMap[name] || 0) + 1;
        rval = ex;
      }

      return rval;
    };

    if (!testOnlyLogArgs) {
      this._wrapLogProtoForTest(name);
    }
    else {
      for (key in testOnlyLogArgs) {
        numTestOnlyArgs++;
        useTestArgs.push(testOnlyLogArgs[key]);
      }
      // cut-paste-modify of the above...
      this.testLogProto[name] = function() {
        var rval, iArg;
        var entry = [name];
        for (iArg = 0; iArg < numLogArgs; iArg++) {
          entry.push(arguments[iArg]);
        }
        entry.push($microtime.now());
        entry.push(gSeq++);
        // push this prior to the call for ordering reasons (the call can log
        //  entries too!)
        this._entries.push(entry);
        try {
          rval = arguments[numLogArgs+1].apply(
            arguments[numLogArgs], Array.prototype.slice.call(arguments, iArg+2));
          entry.push($microtime.now());
          entry.push(gSeq++);
          entry.push(null);
          // ++ new bit
          iArg += 2;
          for (var iEat=0; iEat < numTestOnlyArgs; iEat++, iArg++) {
            entry.push(simplifyInsaneObjects(arguments[iArg], useTestArgs[iEat]));
          }
          // -- end new bit
        }
        catch(ex) {
          entry.push($microtime.now());
          entry.push(gSeq++);
          // We can't push the exception directly because its "arguments" payload
          //  can have rich object references that will cause issues during JSON
          //  serialization.  We most care that it can create circular references,
          //  but also are not crazy about serializing potentially huge object
          //  graphs.  This might be a great place to perform some logHelper
          //  style transformations.
          entry.push($extransform.transformException(ex));
          // ++ new bit
          iArg += 2;
          for (var iEat=0; iEat < numTestOnlyArgs; iEat++, iArg++) {
            entry.push(simplifyInsaneObjects(arguments[iArg], useTestArgs[iEat]));
          }
          // -- end new bit
          // (call errors are events)
          this._eventMap[name] = (this._eventMap[name] || 0) + 1;
          rval = ex;
        }

        // ++ firing bit...
        var testActor = this._actor;
        if (testActor)
          testActor.__loggerFired();
        return rval;
      };
    }

    // XXX we have no way to indicate we expect/desire an assertion
    //  (we will just explode on any logged exception)
    this.testActorProto['expect_' + name] = function() {
      if (!this._activeForTestStep)
        throw new Error("Attempt to set expectations on an actor (" +
                        this.__defName + ": " + this.__name + ") that is not " +
                        "participating in this test step!");
      if (this._resolved)
        throw new Error("Attempt to add expectations when already resolved!");

      var exp = [name];
      for (var iArg = 0; iArg < arguments.length; iArg++) {
        if (useArgs[iArg])
          exp.push(arguments[iArg]);
      }
      this._expectations.push(exp);
      return this;
    };
    this.testActorProto['ignore_' + name] = makeIgnoreFunc(name);
    this.testActorProto['_verify_' + name] = function(tupe, entry) {
      // report failure if an exception was returned!
      if (entry.length > numLogArgs + numTestOnlyArgs + 6) {
        return false;
      }
      // only check arguments we had expectations for.
      for (var iArg = 1; iArg < tupe.length; iArg++) {
        if (!smartCompareEquiv(tupe[iArg], entry[iArg], COMPARE_DEPTH))
          return false;
      }
      return true;
    };
  },
  addError: function(name, args) {
    this._define(name, 'error');

    var numArgs = 0, useArgs = [];
    for (var key in args) {
      numArgs++;
      useArgs.push(args[key]);
    }

    this.dummyProto[name] = function() {
      this._eventMap[name] = (this._eventMap[name] || 0) + 1;
    };

    this.logProto[name] = function() {
      this._eventMap[name] = (this._eventMap[name] || 0) + 1;
      var entry = [name];
      for (var iArg = 0; iArg < numArgs; iArg++) {
        if (useArgs[iArg] === EXCEPTION) {
          var arg = arguments[iArg];
          entry.push($extransform.transformException(arg));
        }
        else {
          entry.push(arguments[iArg]);
        }
      }
      entry.push($microtime.now());
      entry.push(gSeq++);
      this._entries.push(entry);
    };

    this._wrapLogProtoForTest(name);

    this.testActorProto['expect_' + name] = function() {
      if (!this._activeForTestStep)
        throw new Error("Attempt to set expectations on an actor (" +
                        this.__defName + ": " + this.__name + ") that is not " +
                        "participating in this test step!");
      if (this._resolved)
        throw new Error("Attempt to add expectations when already resolved!");

      var exp = [name];
      for (var iArg = 0; iArg < arguments.length; iArg++) {
        if (useArgs[iArg] && useArgs[iArg] !== EXCEPTION)
          exp.push(arguments[iArg]);
      }
      this._expectations.push(exp);
      return this;
    };
    this.testActorProto['ignore_' + name] = makeIgnoreFunc(name);
    this.testActorProto['_verify_' + name] = function(tupe, entry) {
      // only check arguments we had expectations for.
      for (var iArg = 1; iArg < tupe.length; iArg++) {
        if (!smartCompareEquiv(tupe[iArg], entry[iArg], COMPARE_DEPTH))
          return false;
      }
      return true;
    };
  },
  /**
   * Process the description of how to map the semantic ident list.  Currently
   *  we do absolutely nothing with this on the generation side, but the blob
   *  is used by log processing logic to stitch stuff together in the UI.
   *
   * We might end up using this on the generation side when under test so
   *  that we can better link loggers with actors in the face of potential
   *  ambiguity about who goes with which actor.  The counter-argument to that
   *  idea is that during functional testing we don't want that much activity
   *  going on.  When performance testing, we would want that, but in that
   *  case we won't be running with actors anyways.
   */
  useSemanticIdent: function(args) {
  },

  makeFabs: function() {
    var moduleFab = this.moduleFab;

    var dummyCon = function dummyConstructor() {
      this._eventMap = {};
    };
    dummyCon.prototype = this.dummyProto;

    var loggerCon = function loggerConstructor(ident) {
      this.__updateIdent(ident);
      this._uniqueName = gUniqueActorName++;
      this._eventMap = {};
      this._entries = [];
      this._born = $microtime.now();
      this._died = null;
      this._kids = null;
    };
    loggerCon.prototype = this.logProto;

    var testerCon = function testerLoggerConstructor(ident) {
      loggerCon.call(this, ident);
      this._actor = null;
    };
    testerCon.prototype = this.testLogProto;

    var testActorCon = function testActorConstructor(name, _parentUniqueName) {
      this.__name = name;
      this._uniqueName = gUniqueActorName++;
      this._parentUniqueName = _parentUniqueName;
      // initially undefined, goes null when we register for pairing, goes to
      //  the logger instance when paired.
      this._logger = undefined;
      this._ignore = null;
      this._expectations = [];
      this._expectationsMetSoFar = true;
      this._expectNothing = false;
      this._expectDeath = false;
      this._unorderedSetMode = false;
      this._activeForTestStep = false;
      this._iEntry = this._iExpectation = 0;
      this._lifecycleListener = null;
    };
    testActorCon.prototype = this.testActorProto;
    this.moduleFab._actorCons[this.name] = testActorCon;

    /**
     * Determine what type of logger to create, whether to tell other things
     *  in the system about it, etc.
     */
    var loggerDecisionFab = function loggerDecisionFab(implInstance,
                                                       parentLogger, ident) {
      var logger, tester;
      // - Testing
      if ((tester = (moduleFab._underTest || loggerDecisionFab._underTest))) {
//console.error("MODULE IS UNDER TEST FOR: " + testerCon.prototype.__defName);
        if (typeof(parentLogger) === "string")
          throw new Error("A string can't be a logger => not a valid parent");
        logger = new testerCon(ident);
        logger.__instance = implInstance;
        parentLogger = tester.reportNewLogger(logger, parentLogger);
      }
      // - Logging
      else if (moduleFab._generalLog || testerCon._generalLog) {
//console.error("general logger for: " + testerCon.prototype.__defName);
        logger = new loggerCon(ident);
      }
      // - Statistics Only
      else {
//console.error("statistics only for: " + testerCon.prototype.__defName);
        return new dummyCon();
      }

      if (parentLogger) {
        if (parentLogger._kids === undefined) {
        }
        else if (parentLogger._kids === null) {
          parentLogger._kids = [logger];
        }
        else {
          parentLogger._kids.push(logger);
        }
      }
      return logger;
    };
    this.moduleFab[this.name] = loggerDecisionFab;
  },
};

var LEGAL_FABDEF_KEYS = [
  'implClass', 'type', 'subtype', 'topBilling', 'semanticIdent', 'dicing',
  'stateVars', 'latchState', 'events', 'asyncJobs', 'calls', 'errors',
  'TEST_ONLY_calls', 'TEST_ONLY_events', 'TEST_ONLY_asyncJobs',
  'LAYER_MAPPING',
];

function augmentFab(mod, fab, defs) {
  var testActors = fab._testActors, rawDefs = fab._rawDefs;

  for (var defName in defs) {
    var key, loggerDef = defs[defName], testOnlyMeta;
    rawDefs[defName] = loggerDef;

    for (key in loggerDef) {
      if (LEGAL_FABDEF_KEYS.indexOf(key) === -1) {
        throw new Error("key '" + key + "' is not a legal log def key");
      }
    }

    var maker = new LoggestClassMaker(fab, defName);

    if ("semanticIdent" in loggerDef) {
      maker.useSemanticIdent(loggerDef.semanticIdent);
    }
    if ("stateVars" in loggerDef) {
      for (key in loggerDef.stateVars) {
        maker.addStateVar(key);
      }
    }
    if ("latchState" in loggerDef) {
      for (key in loggerDef.latchState) {
        maker.addLatchedState(key);
      }
    }
    if ("events" in loggerDef) {
      var testOnlyEventsDef = null;
      if ("TEST_ONLY_events" in loggerDef)
        testOnlyEventsDef = loggerDef.TEST_ONLY_events;
      for (key in loggerDef.events) {
        testOnlyMeta = null;
        if (testOnlyEventsDef && testOnlyEventsDef.hasOwnProperty(key))
          testOnlyMeta = testOnlyEventsDef[key];
        maker.addEvent(key, loggerDef.events[key], testOnlyMeta);
      }
    }
    if ("asyncJobs" in loggerDef) {
      var testOnlyAsyncJobsDef = null;
      if ("TEST_ONLY_asyncJobs" in loggerDef)
        testOnlyAsyncJobsDef = loggerDef.TEST_ONLY_asyncJobs;
      for (key in loggerDef.asyncJobs) {
        testOnlyMeta = null;
        if (testOnlyAsyncJobsDef && testOnlyAsyncJobsDef.hasOwnProperty(key))
          testOnlyMeta = testOnlyAsyncJobsDef[key];
        maker.addAsyncJob(key, loggerDef.asyncJobs[key], testOnlyMeta);
      }
    }
    if ("calls" in loggerDef) {
      var testOnlyCallsDef = null;
      if ("TEST_ONLY_calls" in loggerDef)
        testOnlyCallsDef = loggerDef.TEST_ONLY_calls;
      for (key in loggerDef.calls) {
        testOnlyMeta = null;
        if (testOnlyCallsDef && testOnlyCallsDef.hasOwnProperty(key))
          testOnlyMeta = testOnlyCallsDef[key];
        maker.addCall(key, loggerDef.calls[key], testOnlyMeta);
      }
    }
    if ("errors" in loggerDef) {
      for (key in loggerDef.errors) {
        maker.addError(key, loggerDef.errors[key]);
      }
    }

    maker.makeFabs();
  }

  return fab;
};
exports.__augmentFab = augmentFab;

var ALL_KNOWN_FABS = [];

/**
 * Do not turn on event-logging without an explicit call to
 * `enableGeneralLogging`.  This is done because logging is a memory leak
 * without a known consumer.
 */
var GENERAL_LOG_DEFAULT = false;
var UNDER_TEST_DEFAULT = false;

exports.register = function register(mod, defs) {
  var fab = {
    _generalLog: GENERAL_LOG_DEFAULT,
    _underTest: UNDER_TEST_DEFAULT,
    _actorCons: {},
    _rawDefs: {},
    _onDeath: null
  };
  ALL_KNOWN_FABS.push(fab);
  return augmentFab(mod, fab, defs);
};

/**
 * Provide schemas for every logger that has been registered.
 */
exports.provideSchemaForAllKnownFabs = function schemaForAllKnownFabs() {
  var schema = {};
  for (var i = 0; i < ALL_KNOWN_FABS.length; i++) {
    var rawDefs = ALL_KNOWN_FABS[i]._rawDefs;
    for (var key in rawDefs) {
      schema[key] = rawDefs[key];
    }
  }
  return schema;
};

var BogusTester = {
  reportNewLogger: function(logger, parentLogger) {
    // No one cares, this is just a way to get the tester constructors
    //  triggered.
    return parentLogger;
  },
};

/**
 * Turn on logging at an event granularity.
 */
exports.enableGeneralLogging = function() {
  GENERAL_LOG_DEFAULT = true;
  for (var i = 0; i < ALL_KNOWN_FABS.length; i++) {
    var logfab = ALL_KNOWN_FABS[i];
    logfab._generalLog = true;
  }
};

/**
 * Mark all logfabs under test so we get full log data; DO NOT USE THIS UNDER
 *  NON-DEVELOPMENT PURPOSES BECAUSE USER DATA CAN BE ENTRAINED AND THAT IS VERY
 *  BAD.
 *
 * Note: No effort is made to avoid marking any logfabs as under test.  This
 *  would be a problem if used while the testing subsystem is active, but you
 *  shouldn't do that.
 */
exports.DEBUG_markAllFabsUnderTest = function() {
  UNDER_TEST_DEFAULT = BogusTester;
  for (var i = 0; i < ALL_KNOWN_FABS.length; i++) {
    var logfab = ALL_KNOWN_FABS[i];

    logfab._underTest = BogusTester;
  }
};

/**
 * Evolutionary stopgap debugging helper to be able to put a module/logfab into
 *  a mode of operation where it dumps all of its loggers' entries to
 *  console.log when they die.
 */
exports.DEBUG_dumpEntriesOnDeath = function(logfab) {
  logfab._generalLog = true;
  logfab._onDeath = function(logger) {
    console.log("!! DIED:", logger.__defName, logger._ident);
    console.log(JSON.stringify(logger._entries, null, 2));
  };
};

exports.DEBUG_dumpAllFabEntriesOnDeath = function() {
  for (var i = 0; i < ALL_KNOWN_FABS.length; i++) {
    var logfab = ALL_KNOWN_FABS[i];
    exports.DEBUG_dumpEntriesOnDeath(logfab);
  }
};

// role information
exports.CONNECTION = 'connection';
exports.SERVER = 'server';
exports.CLIENT = 'client';
exports.TASK = 'task';
exports.DAEMON = 'daemon';
exports.DATABASE = 'database';
exports.CRYPTO = 'crypto';
exports.QUERY = 'query';
exports.ACCOUNT = 'account';
exports.LOGGING = 'log';

exports.TEST_DRIVER = 'testdriver';
exports.TEST_GROUP = 'testgroup';
exports.TEST_CASE = 'testcase';
exports.TEST_PERMUTATION = 'testperm';
exports.TEST_STEP = 'teststep';
exports.TEST_LAZY = 'testlazy';

exports.TEST_SYNTHETIC_ACTOR = 'test:synthactor';

// argument information
var EXCEPTION = exports.EXCEPTION = 'exception';
/**
 * In short, something that we can JSON.stringify without throwing an exception
 *  and that is strongly expected to have a reasonable, bounded size.  This
 *  value is *not* snapshotted when it is provided, and so should be immutable
 *  for this to not turn out confusing.
 */
var JSONABLE = exports.JSONABLE = 'jsonable';
var TOSTRING = exports.TOSTRING = 'tostring';
/**
 * XXX speculative, we currently are just using JSON.stringify and putting
 *  toJSON methods on complex objects that there is no benefit from recursively
 *  traversing.
 *
 * An object that could be anything, including resulting in deep or cyclic
 *  data structures.  We will serialize type information where available.  This
 *  will necessarily be more expensive to serialize than a `JSONABLE` data
 *  structure.  This type of data *is snapshotted* when logged, allowing it to
 *  be used on mutable data structures.
 *
 * A data-biased raw-object will just report the type of instances it encounters
 *  unless they have a toJSON method, in which case it will invoke that.
 */
var RAWOBJ_DATABIAS = exports.RAWOBJ_DATABIAS = 'jsonable'; //'rawobj:databias';

////////////////////////////////////////////////////////////////////////////////
// State/Delta Representation Support
//
// Specialized schema support to allow, by convention, the log viewer to
//  visualize simple containment hierarchies and display annotations on those
//  hierarchies.  Each entry in the hierarchy requires a unique name.
//
// The reconstruction mechanism works like so:
// - For each logger, we latch any STATEREP we observe as the current state.
// - Statereps are visualized as a simple hierarchy.
// - Annotations (STATEANNO) affect display by colorizing/exposing a string on
//    the object indexed by name.  For now, we use numbers to convey
//    semantic colorization desires: -1 is deletion/red, 0 is notable/yellow,
//    1 is addition/green.
// - Deltas combine an annotation entry relevant to the prior state, the new
//    state, and annotations relevant to the new state.  For example,
//    expressing a deletion and an addition would have us annotate the
//    deleted item in the pre-state and the added item in the post-state.

/**
 * Simple state representation.
 */
var STATEREP = exports.STATEREP = 'staterep';
var STATEANNO = exports.STATEANNO = 'stateanno';
var STATEDELTA = exports.STATEDELTA = 'statedelta';

////////////////////////////////////////////////////////////////////////////////

}); // end define
;
/**
 *
 **/

define('mailapi/util',
  [
    'exports'
  ],
  function(
    exports
  ) {

/**
 * Header info comparator that orders messages in order of numerically
 * decreasing date and UIDs.  So new messages come before old messages,
 * and messages with higher UIDs (newer-ish) before those with lower UIDs
 * (when the date is the same.)
 */
var cmpHeaderYoungToOld = exports.cmpHeaderYoungToOld =
    function cmpHeaderYoungToOld(a, b) {
  var delta = b.date - a.date;
  if (delta)
    return delta;
  // favor larger UIDs because they are newer-ish.
  return b.id - a.id;
}

/**
 * Perform a binary search on an array to find the correct insertion point
 *  in the array for an item.  From deuxdrop; tested in
 *  deuxdrop's `unit-simple-algos.js` test.
 *
 * @return[Number]{
 *   The correct insertion point in the array, thereby falling in the inclusive
 *   range [0, arr.length].
 * }
 */
var bsearchForInsert = exports.bsearchForInsert =
    function bsearchForInsert(list, seekVal, cmpfunc) {
  if (!list.length)
    return 0;
  var low  = 0, high = list.length - 1,
      mid, cmpval;
  while (low <= high) {
    mid = low + Math.floor((high - low) / 2);
    cmpval = cmpfunc(seekVal, list[mid]);
    if (cmpval < 0)
      high = mid - 1;
    else if (cmpval > 0)
      low = mid + 1;
    else
      break;
  }
  if (cmpval < 0)
    return mid; // insertion is displacing, so use mid outright.
  else if (cmpval > 0)
    return mid + 1;
  else
    return mid;
};

var bsearchMaybeExists = exports.bsearchMaybeExists =
    function bsearchMaybeExists(list, seekVal, cmpfunc, aLow, aHigh) {
  var low  = ((aLow === undefined)  ? 0                 : aLow),
      high = ((aHigh === undefined) ? (list.length - 1) : aHigh),
      mid, cmpval;
  while (low <= high) {
    mid = low + Math.floor((high - low) / 2);
    cmpval = cmpfunc(seekVal, list[mid]);
    if (cmpval < 0)
      high = mid - 1;
    else if (cmpval > 0)
      low = mid + 1;
    else
      return mid;
  }
  return null;
};

/**
 * Partition a list of messages (identified by message namers, aka the suid and
 * date of the message) by the folder they belong to.
 *
 * @args[
 *   @param[messageNamers @listof[MessageNamer]]
 * ]
 * @return[@listof[@dict[
 *   @key[folderId FolderID]
 *   @key[messages @listof[MessageNamer]]
 * ]
 */
exports.partitionMessagesByFolderId =
    function partitionMessagesByFolderId(messageNamers) {
  var results = [], foldersToMsgs = {};
  for (var i = 0; i < messageNamers.length; i++) {
    var messageNamer = messageNamers[i],
        messageSuid = messageNamer.suid,
        idxLastSlash = messageSuid.lastIndexOf('/'),
        folderId = messageSuid.substring(0, idxLastSlash);

    if (!foldersToMsgs.hasOwnProperty(folderId)) {
      var messages = [messageNamer];
      results.push({
        folderId: folderId,
        messages: messages,
      });
      foldersToMsgs[folderId] = messages;
    }
    else {
      foldersToMsgs[folderId].push(messageNamer);
    }
  }
  return results;
};

exports.formatAddresses = function(nameAddrPairs) {
  var addrstrings = [];
  for (var i = 0; i < nameAddrPairs.length; i++) {
    var pair = nameAddrPairs[i];
    // support lazy people providing only an e-mail... or very careful
    // people who are sure they formatted things correctly.
    if (typeof(pair) === 'string') {
      addrstrings.push(pair);
    }
    else if (!pair.name) {
      addrstrings.push(pair.address);
    }
    else {
      addrstrings.push(
        '"' + pair.name.replace(/["']/g, '') + '" <' +
          pair.address + '>');
    }
  }

  return addrstrings.join(', ');
};

}); // end define
;
// asuth.

/**
 * ASCII-encoding tricks, particularly ordered-base64 encoding for
 * lexicographically ordered things like IndexedDB or 64-bit number support that
 * we can't use JS numbers for.
 *
 * The math logic is by me (asuth); hopefully it's not too embarassing.
 **/

define('mailapi/a64',
  [
    'exports'
  ],
  function(
    exports
  ) {

/**
 * A lexicographically ordered base64 encoding.  Our two extra characters are {
 * and } because they are at the top of the ordering space and have a clear (to
 * JS coders) ordering which makes it tractable to eyeball an encoded value and
 * not be completely confused/misled.
 */
var ORDERED_ARBITRARY_BASE64_CHARS = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
  'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
  'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd',
  'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
  'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
  'y', 'z', '{', '}'
];
/**
 * Zero padding to get us up to the maximum encoding length of a 64-bit value in
 * our encoding (11) or for decimal re-conversion (16).
 */
var ZERO_PADDING = '0000000000000000';

/**
 * Encode a JS int in our base64 encoding.
 */
function encodeInt(v, padTo) {
  var sbits = [];
  do {
    // note: bitwise ops are 32-bit only.
    // so, this is fine:
    sbits.push(ORDERED_ARBITRARY_BASE64_CHARS[v & 0x3f]);
    // but this can't be >>> 6 and has to be a divide.
    v = Math.floor(v / 64);
  } while (v > 0);
  sbits.reverse();
  var estr = sbits.join('');
  if (padTo && estr.length < padTo)
    return ZERO_PADDING.substring(0, padTo - estr.length) + estr;
  return estr;
}
exports.encodeInt = encodeInt;

/**
 * 10^14 >> 14 so that its 'lowest' binary 1 ends up in the one's place.  It
 * is encoded in 33 bits itself.
 */
var E10_14_RSH_14 = Math.pow(10, 14) / Math.pow(2, 14),
      P2_14 = Math.pow(2, 14),
      P2_22 = Math.pow(2, 22),
      P2_32 = Math.pow(2, 32),
      P2_36 = Math.pow(2, 36),
      MASK32 = 0xffffffff;

/**
 * Convert a decimal uint64 string to a compact string representation that can
 * be compared using our helper method `cmpUI64`.  We could do direct straight
 * string comparison if we were willing to pad all strings out to 11 characters,
 * but that's a lot of overhead considering that we expect a lot of our values
 * to be muuuuch smaller.  (Appropriate padding can be requested for cases
 * where the ordering is explicitly desired, like IndexedDB keys.  Just only
 * request as many bits as you really need!)
 *
 * JS can handle up to 2^53 reliably which means that for numbers larger than
 * that we will have to do a second parse.  For that to work (easily), we need
 * to pick a power of 10 to cut at where the smallest '1' in its binary encoding
 * is at least in the 14th bit so we can pre-shift off 13 bits so when we
 * multiply by 10 we don't go floating point, as it were.  (We also need to add
 * in the relevant bits from the lower parse appropriately shifted.)
 */
exports.parseUI64 = function p(s, padTo) {
  // 2^53 is 16 digits long, so any string shorter than that can be handled
  // by the built-in logic.
  if (s.length < 16) {
    return encodeInt(parseInt(s, 10));
  }

  var lowParse = parseInt(s.substring(s.length - 14), 10),
      highParse = parseInt(s.substring(0, s.length - 14), 10),
      // multiply the high parse by our scaled power of 10
      rawHighBits = highParse * E10_14_RSH_14;

  // Now lowParse's low 14 bits are valid, but everything above that needs to
  // be mixed (by addition) with rawHighBits.  We'll mix in 22 bits from
  // rawHighBits to get lowBits to 36 useful bits.  The main thing is to lop off
  // the higher bits in rawHighBits that we don't want so they don't go float.
  // We do want the 37rd bit if there was addition overflow to carry to the
  // upper calculation.
  var lowBitsAdded = (((rawHighBits % P2_36) * P2_14) % P2_36 +
                      lowParse % P2_36),
      lowBits = lowBitsAdded % P2_36,
      overflow = Math.floor(lowBitsAdded / P2_36) % 2;

  // We can lop off the low 22-bits of the high bits (since lowBits is taking
  // care of that) and combine that with the bits of low above 36.
  var highBits = Math.floor(rawHighBits / P2_22) +
                 Math.floor(lowParse / P2_36) + overflow;

  var outStr = encodeInt(highBits) + encodeInt(lowBits, 6);
  if (padTo && outStr.length < padTo)
    return ZERO_PADDING.substring(0, padTo - outStr.length) + outStr;
  return outStr;
};

exports.cmpUI64 = function(a, b) {
  // longer equals bigger!
  var c = a.length - b.length;
  if (c !== 0)
    return c;

  if (a < b)
    return -1;
  else if (a > b)
    return 1;
  return 0;
};

/**
 * Convert the output of `parseUI64` back into a decimal string.
 */
exports.decodeUI64 = function d(es) {
  var iNonZero = 0;
  for (;es.charCodeAt(iNonZero) === 48; iNonZero++) {
  }
  if (iNonZero)
    es = es.substring(iNonZero);

  var v, i;
  // 8 characters is 48 bits, JS can do that internally.
  if (es.length <= 8) {
    v = 0;
    for (i = 0; i < es.length; i++) {
      v = v * 64 + ORDERED_ARBITRARY_BASE64_CHARS.indexOf(es[i]);
    }
    return v.toString(10);
  }

  // upper-string gets 28 bits (that could hold 30), lower-string gets 36 bits.
  // This is how we did things in encoding is why.
  var ues = es.substring(0, es.length - 6), uv = 0,
      les = es.substring(es.length - 6), lv = 0;

  for (i = 0; i < ues.length; i++) {
    uv = uv * 64 + ORDERED_ARBITRARY_BASE64_CHARS.indexOf(ues[i]);
  }
  for (i = 0; i < les.length; i++) {
    lv = lv * 64 + ORDERED_ARBITRARY_BASE64_CHARS.indexOf(les[i]);
  }

  // Do the division to figure out the "high" string from our encoding (a whole
  // number.)  Then subtract that whole number off our effective number, leaving
  // us dealing with <53 bits so we can just hand it off to the JS engine.

  var rsh14val = (uv * P2_22 + Math.floor(lv / P2_14)),
      uraw = rsh14val / E10_14_RSH_14,
      udv = Math.floor(uraw),
      uds = udv.toString();

  var rsh14Leftover = rsh14val - udv * E10_14_RSH_14,
      lowBitsRemoved = rsh14Leftover * P2_14 + lv % P2_14;

  var lds = lowBitsRemoved.toString();
  if (lds.length < 14)
    lds = ZERO_PADDING.substring(0, 14 - lds.length) + lds;

  return uds + lds;
};
//d(p('10000000000000000'));
//d(p('18014398509481984'));
//d(p('1171221845949812801'));

}); // end define
;
/**
 * Simple coordination logic that might be better handled by promises, although
 * we probably have the edge in comprehensibility for now.
 **/

define('mailapi/allback',
  [
    'exports',
    'prim'
  ],
  function(
    exports,
    prim
  ) {

/**
 * Create multiple named callbacks whose results are aggregated and a single
 * callback invoked once all the callbacks have returned their result.  This
 * is intended to provide similar benefit to $Q.all in our non-promise world
 * while also possibly being more useful.
 *
 * Example:
 * @js{
 *   var callbacks = allbackMaker(['foo', 'bar'], function(aggrData) {
 *       console.log("Foo's result was", aggrData.foo);
 *       console.log("Bar's result was", aggrData.bar);
 *     });
 *   asyncFooFunc(callbacks.foo);
 *   asyncBarFunc(callbacks.bar);
 * }
 *
 * Protection against a callback being invoked multiple times is provided as
 * an anti-foot-shooting measure.  Timeout logic and other protection against
 * potential memory leaks is not currently provided, but could be.
 */
exports.allbackMaker = function allbackMaker(names, allDoneCallback) {
  var aggrData = {}, callbacks = {}, waitingFor = names.concat();

  names.forEach(function(name) {
    // (build a consistent shape for aggrData regardless of callback ordering)
    aggrData[name] = undefined;
    callbacks[name] = function anAllback(callbackResult) {
      var i = waitingFor.indexOf(name);
      if (i === -1) {
        console.error("Callback '" + name + "' fired multiple times!");
        throw new Error("Callback '" + name + "' fired multiple times!");
      }
      waitingFor.splice(i, 1);
      if (arguments.length > 1)
        aggrData[name] = arguments;
      else
        aggrData[name] = callbackResult;
      if (waitingFor.length === 0 && allDoneCallback)
        allDoneCallback(aggrData);
    };
  });

  return callbacks;
};


/**
 * A lightweight deferred 'run-all'-like construct for waiting for
 * multiple callbacks to finish executing, with a final completion
 * callback at the end. Neither promises nor Q provide a construct
 * quite like this; Q.all and Promise.all tend to either require all
 * promises to be created up front, or they return when the first
 * error occurs. This is designed to allow you to wait for an unknown
 * number of callbacks, with the knowledge that they're going to
 * execute anyway -- no sense trying to abort early.
 *
 * Results passed to each callback can be passed along to the final
 * result by adding a `name` parameter when calling latch.defer().
 *
 * Example usage:
 *
 * var latch = allback.latch();
 * setTimeout(latch.defer('timeout1'), 200);
 * var cb = latch.defer('timeout2');
 * cb('foo');
 * latch.then(function(results) {
 *   console.log(results.timeout2[0]); // => 'foo'
 * });
 *
 * The returned latch is an A+ Promises-compatible thennable, so you
 * can chain multiple callbacks to the latch.
 *
 * The promise will never fail; it will always succeed. Each
 * `.defer()` call can be passed a `name`; if a name is provided, that
 * callback's arguments will be made available as a key on the result
 * object.
 *
 * NOTE: The latch will not actually fire completion until you've
 * attached a callback handler. This way, you can create the latch
 * before you know how many callbacks you'll need; when you've called
 * .defer() as many times as necessary, you can call `then()` to
 * actually fire the completion function (when they have all
 * completed).
 */
exports.latch = function() {
  var ready = false;
  var deferred = prim();
  var results = {};
  var count = 0;
  function defer(name) {
    count++;
    var resolved = false;
    return function resolve() {
      if (resolved) { return; }
      if (name) {
        results[name] = Array.slice(arguments);
      }
      if (--count === 0) {
        setZeroTimeout(function() {
          deferred.resolve(results);
        });
      }
    };
  }
  var unlatch = defer();
  return {
    defer: defer,
    then: function () {
      var ret = deferred.promise.then.apply(deferred.promise, arguments);
      if (!ready) {
        ready = true;
        unlatch();
      }
      return ret;
    }
  };
}

}); // end define
;
define('mailapi/date',
  [
    'module',
    'exports'
  ],
  function(
    $module,
    exports
  ) {

////////////////////////////////////////////////////////////////////////////////
// Time
//
// == JS Dates
//
// We primarily deal in UTC timestamps.  When we need to talk dates with IMAP
// (see next section), we need these timestamps to line up with midnight for
// a given day.  We do not need to line up with weeks, months, or years,
// saving us a lot of complexity.
//
// Day algebra is straightforward because JS Date objects have no concept of
// leap seconds.  We don't need to worry that a leap second will cause adding
// a day to be less than or more than a day.  Hooray!
//
// == IMAP and Time
//
// The stock IMAP SEARCH command's SINCE and BEFORE predicates only operate on
// whole-dates (and ignore the non-date time parts).  Additionally, SINCE is
// inclusive and BEFORE is exclusive.
//
// We use JS millisecond timestamp values throughout, and it's important to us
// that our date logic is consistent with IMAP's time logic where relevant.
// All of our IMAP-exposed time-interval related logic operates on day
// granularities.  Our timestamp/date values are always normalized to midnight
// which happily works out with intuitive range operations.
//
// Observe the pretty ASCII art where as you move to the right you are moving
// forward in time.
//
//             ________________________________________
//      BEFORE)| midnight (0 millis) ... 11:59:59:999 |
// ON_OR_BEFORE]
//             [SINCE......................................
//              (AFTER.....................................
//
// Our date range comparisons (noting that larger timestamps are 'younger') are:
// SINCE analog:  (testDate >= comparisonDate)
//   testDate is as-recent-as or more-recent-than the comparisonDate.
// BEFORE analog: (testDate < comparisonDate)
//   testDate is less-recent-than the comparisonDate
//
// Because "who is the test date and who is the range value under discussion"
// can be unclear and the numerical direction of time is not always intuitive,
// I'm introducing simple BEFORE and SINCE helper functions to try and make
// the comparison logic ridiculously explicit as well as calling out where we
// are being consistent with IMAP.
//
// Not all of our time logic is consistent with IMAP!  Specifically, use of
// exclusive time bounds without secondary comparison keys means that ranges
// defined in this way cannot spread messages with the same timestamp over
// multiple ranges.  This allows for pathological data structure situations
// where there's too much data in a data block, etc.
// Our date ranges are defined by 'startTS' and 'endTS'.  Using math syntax, our
// IMAP-consistent time ranges end up as: [startTS, endTS).  It is always true
// that BEFORE(startTS, endTS) and SINCE(endTS, startTS) in these cases.
//
// As such, I've also created an ON_OR_BEFORE helper that allows equivalence and
// STRICTLY_AFTER that does not check equivalence to round out all possibilities
// while still being rather explicit.


/**
 * IMAP-consistent date comparison; read this as "Is `testDate` BEFORE
 * `comparisonDate`"?
 *
 * !BEFORE(a, b) === SINCE(a, b)
 */
var BEFORE = exports.BEFORE =
      function BEFORE(testDate, comparisonDate) {
  // testDate is numerically less than comparisonDate, so it is chronologically
  // before it.
  return testDate < comparisonDate;
};

var ON_OR_BEFORE = exports.ON_OR_BEFORE =
      function ON_OR_BEFORE(testDate, comparisonDate) {
  return testDate <= comparisonDate;
};

/**
 * IMAP-consistent date comparison; read this as "Is `testDate` SINCE
 * `comparisonDate`"?
 *
 * !SINCE(a, b) === BEFORE(a, b)
 */
var SINCE = exports.SINCE =
      function SINCE(testDate, comparisonDate) {
  // testDate is numerically greater-than-or-equal-to comparisonDate, so it
  // chronologically after/since it.
  return testDate >= comparisonDate;
};

var STRICTLY_AFTER = exports.STRICTLY_AFTER =
      function STRICTLY_AFTER(testDate, comparisonDate) {
  return testDate > comparisonDate;
};

var IN_BS_DATE_RANGE = exports.IN_BS_DATE_RANGE =
      function IN_BS_DATE_RANGE(testDate, startTS, endTS) {
  return testDate >= startTS && testDate < endTS;
};

var PASTWARDS = 1, FUTUREWARDS = -1;
/**
 * Check if `testDate` is "beyond" the comparison date given the `dir`.  If
 * the direction is pastwards, we will return true if testDate happened
 * chronologically before comparisonDate.  If the direction is futurewards,
 * we will return true if testDate happened chronologically after
 * comparisonDate.
 */
var TIME_DIR_AT_OR_BEYOND = exports.TIME_DIR_AT_OR_BEYOND =
      function TIME_DIR_AT_OR_BEYOND(dir, testDate, comparisonDate) {
  if (dir === PASTWARDS)
    return testDate <= comparisonDate;
  // we use null as a sentinel value for 'the future'/'now'
  else if (comparisonDate === null)
    return testDate >= NOW();
  else // FUTUREWARDS
    return testDate >= comparisonDate;
};
/**
 * Compute the delta of the `testDate` relative to the `comparisonDate` where
 * a positive value indicates `testDate` is beyond the `comparisonDate` in
 * the given direction and a negative value indicates it is before it.
 */
var TIME_DIR_DELTA = exports.TIME_DIR_DELTA =
      function TIME_DIR_DELTA(dir, testDate, comparisonDate) {
  if (dir === PASTWARDS)
    return testDate - comparisonDate;
  else // FUTUREWARDS
    return comparisonDate - testDate;
};
/**
 * Add `time` to the `baseDate` in the given direction.  So if the direction
 * is `PASTWARDS`, then we add the date, otherwise we subtract it.
 */
var TIME_DIR_ADD = exports.TIME_DIR_ADD =
      function TIME_DIR_ADD(dir, baseDate, time) {
  if (dir === PASTWARDS)
    return baseDate + time;
  else // FUTUREWARDS
    return baseDate - time;
};

//function DATE_RANGES_OVERLAP(A_startTS, A_endTS, B_startTS, B_endTS) {
//}

var HOUR_MILLIS = exports.HOUR_MILLIS = 60 * 60 * 1000;
var DAY_MILLIS = exports.DAY_MILLIS = 24 * 60 * 60 * 1000;

/**
 * Testing override that when present replaces use of Date.now().
 */
var TIME_WARPED_NOW = null;

/**
 * Pretend that 'now' is actually a fixed point in time for the benefit of
 * unit tests using canned message stores.
 */
exports.TEST_LetsDoTheTimewarpAgain = function(fakeNow) {
  if (fakeNow === null) {
    TIME_WARPED_NOW = null;
    return;
  }
  if (typeof(fakeNow) !== 'number')
    fakeNow = fakeNow.valueOf();
  TIME_WARPED_NOW = fakeNow;
};

var NOW = exports.NOW =
      function NOW() {
  return TIME_WARPED_NOW || Date.now();
};

/**
 * Make a timestamp some number of days in the past, quantized to midnight of
 * that day.  This results in rounding up; if it's noon right now and you
 * ask for 2 days ago, you really get 2.5 days worth of time.
 */
var makeDaysAgo = exports.makeDaysAgo =
      function makeDaysAgo(numDays, tzOffset) {
  var past = quantizeDate((TIME_WARPED_NOW || Date.now()) + tzOffset) -
               numDays * DAY_MILLIS;
  return past;
};
var makeDaysBefore = exports.makeDaysBefore =
      function makeDaysBefore(date, numDaysBefore, tzOffset) {
  if (date === null)
    return makeDaysAgo(numDaysBefore - 1, tzOffset);
  return quantizeDate(date) - numDaysBefore * DAY_MILLIS;
};
/**
 * Quantize a date to midnight on that day.
 */
var quantizeDate = exports.quantizeDate =
      function quantizeDate(date) {
  if (date === null)
    return null;
  if (typeof(date) === 'number')
    date = new Date(date);
  return date.setUTCHours(0, 0, 0, 0).valueOf();
};

/**
 * If a date is already lined up with midnight of its day, then return that,
 * otherwise round up to the midnight of the next day.
 */
var quantizeDateUp = exports.quantizeDateUp =
      function quantizeDateUp(date) {
  if (typeof(date) === 'number')
    date = new Date(date);
  var truncated = date.setUTCHours(0, 0, 0, 0).valueOf();
  if (date.valueOf()  === truncated)
    return truncated;
  return truncated + DAY_MILLIS;
};


}); // end define
;
define('mailapi/syncbase',
  [
    './date',
    'exports'
  ],
  function(
    $date,
    exports
  ) {

////////////////////////////////////////////////////////////////////////////////
// IMAP time constants

/**
 * How recently synchronized does a time range have to be for us to decide that
 * we don't need to refresh the contents of the time range when opening a slice?
 * If the last full synchronization is more than this many milliseconds old, we
 * will trigger a refresh, otherwise we will skip it.
 */
exports.OPEN_REFRESH_THRESH_MS = 10 * 60 * 1000;

/**
 * How recently synchronized does a time range have to be for us to decide that
 * we don't need to refresh the contents of the time range when growing a slice?
 * If the last full synchronization is more than this many milliseconds old, we
 * will trigger a refresh, otherwise we will skip it.
 */
exports.GROW_REFRESH_THRESH_MS = 60 * 60 * 1000;

////////////////////////////////////////////////////////////////////////////////
// Database Block constants
//
// Used to live in mailslice.js, but they got out of sync with the below which
// caused problems.

exports.EXPECTED_BLOCK_SIZE = 8;

/**
 * What is the maximum number of bytes a block should store before we split
 * it?
 */
exports.MAX_BLOCK_SIZE = exports.EXPECTED_BLOCK_SIZE * 1024,
/**
 * How many bytes should we target for the small part when splitting 1:2?
 */
exports.BLOCK_SPLIT_SMALL_PART = (exports.EXPECTED_BLOCK_SIZE / 3) * 1024,
/**
 * How many bytes should we target for equal parts when splitting 1:1?
 */
exports.BLOCK_SPLIT_EQUAL_PART = (exports.EXPECTED_BLOCK_SIZE / 2) * 1024,
/**
 * How many bytes should we target for the large part when splitting 1:2?
 */
exports.BLOCK_SPLIT_LARGE_PART = (exports.EXPECTED_BLOCK_SIZE / 1.5) * 1024;


////////////////////////////////////////////////////////////////////////////////
// Block Purging Constants (IMAP only)
//
// These values are all intended for resource-constrained mobile devices.  A
// more powerful tablet-class or desktop-class app would probably want to crank
// the values way up.

/**
 * Every time we create this many new body blocks, queue a purge job for the
 * folder.
 *
 * Body sizes are most variable and should usually take up more space than their
 * owning header blocks, so it makes sense for this to be the proxy we use for
 * disk space usage/growth.
 *
 * This used to be 4 when EXPECTED_BLOCK_SIZE was 96, it's now 8.  A naive
 * scaling would be by 12 to 48, but that doesn't handle that blocks can be
 * over the limit, so we want to aim a little lower, so 32.
 */
exports.BLOCK_PURGE_EVERY_N_NEW_BODY_BLOCKS = 32;

/**
 * How much time must have elapsed since the given messages were last
 * synchronized before purging?  Our accuracy ranges are updated whenever we are
 * online and we attempt to display messages.  So before we purge messages, we
 * make sure that the accuracy range covering the messages was updated at least
 * this long ago before deciding to purge.
 */
exports.BLOCK_PURGE_ONLY_AFTER_UNSYNCED_MS = 14 * $date.DAY_MILLIS;

/**
 * What is the absolute maximum number of blocks we will store per folder for
 * each block type?  If we have more blocks than this, we will discard them
 * regardless of any time considerations.
 *
 * The hypothetical upper bound for disk uage per folder is:
 * X 'number of blocks' * 2 'types of blocks' * 8k 'maximum block size'.  In
 * reality, blocks can be larger than their target if they have very large
 * bodies.
 *
 * This was 128 when our target size was 96k for a total of 24 megabytes.  Now
 * that our target size is 8k we're only scaling up by 8 instead of 12 because
 * of the potential for a large number of overage blocks.  This takes us to a
 * max of 1024 blocks.
 *
 * This is intended to protect people who have ridiculously high message
 * densities from time-based heuristics not discarding things fast enough.
 */
exports.BLOCK_PURGE_HARD_MAX_BLOCK_LIMIT = 1024;

////////////////////////////////////////////////////////////////////////////////
// POP3 Sync Constants

/**
 * As we're syncing with POP3, pause every N messages to save state to disk.
 * This value was chosen somewhat arbitrarily.
 */
exports.POP3_SAVE_STATE_EVERY_N_MESSAGES = 50;


/**
 * The maximum number of messages to retrieve during a single POP3
 * sync operation. If the number of unhandled messages left in the
 * spool exceeds this value, leftover messages will be filtered out of
 * this sync operation. They can later be downloaded through a
 * "download more messages..." option as per
 * <https://bugzil.la/939375>.
 *
 * This value (initially 100) is selected to be large enough that most
 * POP3 users won't exceed this many new messages in a given sync, but
 * small enough that we won't get completely overwhelmed that we have
 * to download this many headers.
 */
exports.POP3_MAX_MESSAGES_PER_SYNC = 100;

////////////////////////////////////////////////////////////////////////////////
// General Sync Constants

/**
 * How frequently do we want to automatically synchronize our folder list?
 * Currently, we think that once a day is sufficient.  This is a lower bound,
 * we may sync less frequently than this.
 */
exports.SYNC_FOLDER_LIST_EVERY_MS = $date.DAY_MILLIS;

/**
 * How many messages should we send to the UI in the first go?
 */
exports.INITIAL_FILL_SIZE = 15;

/**
 * How many days in the past should we first look for messages.
 *
 * IMAP only.
 */
exports.INITIAL_SYNC_DAYS = 3;

/**
 * When growing our synchronization range, what should be the initial number of
 * days we should scan?
 */
exports.INITIAL_SYNC_GROWTH_DAYS = 3;

/**
 * What should be multiple the current number of sync days by when we perform
 * a sync and don't find any messages?  There are upper bounds in
 * `ImapFolderSyncer.onSyncCompleted` that cap this and there's more comments
 * there.  Note that we keep moving our window back as we go.
 *
 * This was 1.6 for a while, but it was proving to be a bit slow when the first
 * messages start a ways back.  Also, once we moved to just syncing headers
 * without bodies, the cost of fetching more than strictly required went way
 * down.
 *
 * IMAP only.
 */
exports.TIME_SCALE_FACTOR_ON_NO_MESSAGES = 2;

/**
 * What is the furthest back in time we are willing to go?  This is an
 * arbitrary choice to avoid our logic going crazy, not to punish people with
 * comprehensive mail collections.
 *
 * All of our sync range timestamps are quantized UTC days, so we are sure to
 * use an already UTC-quantized timestamp here.
 *
 * IMAP only.
 */
exports.OLDEST_SYNC_DATE = Date.UTC(1990, 0, 1);

/**
 * Don't bother with iterative deepening if a folder has less than this many
 * messages; just sync the whole thing.  The trade-offs here are:
 *
 * - Not wanting to fetch more messages than we need.
 * - Because header envelope fetches are done in a batch and IMAP servers like
 *   to sort UIDs from low-to-high, we will get the oldest messages first.
 *   This can be mitigated by having our sync logic use request windowing to
 *   offset this.
 * - The time required to fetch the headers versus the time required to
 *   perform deepening.  Because of network and disk I/O, deepening can take
 *   a very long time
 *
 * IMAP only.
 */
exports.SYNC_WHOLE_FOLDER_AT_N_MESSAGES = 40;

/**
 * If we issued a search for a date range and we are getting told about more
 * than the following number of messages, we will try and reduce the date
 * range proportionately (assuming a linear distribution) so that we sync
 * a smaller number of messages.  This will result in some wasted traffic
 * but better a small wasted amount (for UIDs) than a larger wasted amount
 * (to get the dates for all the messages.)
 *
 * IMAP only.
 */
exports.BISECT_DATE_AT_N_MESSAGES = 60;

/**
 * What's the maximum number of messages we should ever handle in a go and
 * where we should start failing by pretending like we haven't heard of the
 * excess messages?  This is a question of message time-density and not a
 * limitation on the number of messages in a folder.
 *
 * This could be eliminated by adjusting time ranges when we know the
 * density is high (from our block indices) or by re-issuing search results
 * when the server is telling us more than we can handle.
 *
 * IMAP only.
 */
exports.TOO_MANY_MESSAGES = 2000;


////////////////////////////////////////////////////////////////////////////////
// Size Estimate Constants

/**
 * The estimated size of a `HeaderInfo` structure.  We are using a constant
 * since there is not a lot of variability in what we are storing and this
 * is probably good enough.
 *
 * Our estimate is based on guesses based on presumed structured clone encoding
 * costs for each field using a reasonable upper bound for length.  Our
 * estimates are trying not to factor in compressability too much since our
 * block size targets are based on the uncompressed size.
 * - id: 4: integer less than 64k
 * - srvid: 40: 38 char uuid with {}'s, (these are uuid's on hotmail)
 * - suid: 13: 'xx/xx/xxxxx' (11)
 * - guid: 80: 66 character (unquoted) message-id from gmail, 48 from moco.
 *         This is unlikely to compress well and there could be more entropy
 *         out there, so guess high.
 * - author: 70: 32 for the e-mail address covers to 99%, another 32 for the
 *           display name which will usually be shorter than 32 but could
 *           involve encoded characters that bloat the utf8 persistence.
 * - date: 9: double that will be largely used)
 * - flags: 32: list which should normally top out at ['\Seen', '\Flagged'], but
 *              could end up with non-junk markers, etc. so plan for at least
 *              one extra.
 * - hasAttachments: 2: boolean
 * - subject: 80
 * - snippet: 100 (we target 100, it will come in under)
 */
exports.HEADER_EST_SIZE_IN_BYTES = 430;


////////////////////////////////////////////////////////////////////////////////
// Error / Retry Constants

/**
 * What is the maximum number of tries we should give an operation before
 * giving up on the operation as hopeless?  Note that in some suspicious
 * error cases, the try cont will be incremented by more than 1.
 *
 * This value is somewhat generous because we do assume that when we do
 * encounter a flakey connection, there is a high probability of the connection
 * being flakey in the short term.  The operations will not be excessively
 * penalized for this since IMAP connections have to do a lot of legwork to
 * establish the connection before we start the operation (CAPABILITY, LOGIN,
 * CAPABILITY).
 */
exports.MAX_OP_TRY_COUNT = 10;

/**
 * The value to increment the operation tryCount by if we receive an
 * unexpected error.
 */
exports.OP_UNKNOWN_ERROR_TRY_COUNT_INCREMENT = 5;

/**
 * If we need to defer an operation because the folder/resource was not
 * available, how long should we defer for?
 */
exports.DEFERRED_OP_DELAY_MS = 30 * 1000;

////////////////////////////////////////////////////////////////////////////////
// General defaults

/**
 * We use an enumerated set of sync values for UI localization reasons; time
 * is complex and we don't have/use a helper library for this.
 */
exports.CHECK_INTERVALS_ENUMS_TO_MS = {
  'manual': 0, // 0 disables; no infinite checking!
  '3min': 3 * 60 * 1000,
  '5min': 5 * 60 * 1000,
  '10min': 10 * 60 * 1000,
  '15min': 15 * 60 * 1000,
  '30min': 30 * 60 * 1000,
  '60min': 60 * 60 * 1000,
};

/**
 * Default to not automatically checking for e-mail for reasons to avoid
 * degrading the phone experience until we are more confident about our resource
 * usage, etc.
 */
exports.DEFAULT_CHECK_INTERVAL_ENUM = 'manual';

var DAY_MILLIS = 24 * 60 * 60 * 1000;

/**
 * Map the ActiveSync-limited list of sync ranges to milliseconds.  Do NOT
 * add additional values to this mapping unless you make sure that our UI
 * properly limits ActiveSync accounts to what the protocol supports.
 */
exports.SYNC_RANGE_ENUMS_TO_MS = {
  // This choice is being made for IMAP.
  'auto': 30 * DAY_MILLIS,
    '1d': 1 * DAY_MILLIS,
    '3d': 3 * DAY_MILLIS,
    '1w': 7 * DAY_MILLIS,
    '2w': 14 * DAY_MILLIS,
    '1m': 30 * DAY_MILLIS,
   'all': 30 * 365 * DAY_MILLIS,
};


////////////////////////////////////////////////////////////////////////////////
// Unit test support

/**
 * Override individual syncbase values for unit testing. Any key in
 * syncbase can be overridden.
 */
exports.TEST_adjustSyncValues = function TEST_adjustSyncValues(syncValues) {

  // Legacy values: This function used to accept a mapping that didn't
  // match one-to-one with constant names, but was changed to map
  // directly to constant names for simpler grepping.
  var legacyKeys = {
    fillSize: 'INITIAL_FILL_SIZE',
    days: 'INITIAL_SYNC_DAYS',
    growDays: 'INITIAL_SYNC_GROWTH_DAYS',
    bisectThresh: 'BISECT_DATE_AT_N_MESSAGES',
    tooMany: 'TOO_MANY_MESSAGES',
    scaleFactor: 'TIME_SCALE_FACTOR_ON_NO_MESSAGES',
    openRefreshThresh: 'OPEN_REFRESH_THRESH_MS',
    growRefreshThresh: 'GROW_REFRESH_THRESH_MS',
  };

  for (var key in syncValues) if (syncValues.hasOwnProperty(key)) {
    var outKey = legacyKeys[key] || key;
    if (exports.hasOwnProperty(outKey)) {
      exports[outKey] = syncValues[key];
    } else {
      // In the future (after we have a chance to review all calls to
      // this function), we could make this throw an exception
      // instead.
      console.warn('Invalid key for TEST_adjustSyncValues: ' + key);
    }
  }
};

}); // end define
;
/**
 * Presents a message-centric view of a slice of time from IMAP search results.
 *
 * == Use-case assumptions
 *
 * - We are backing a UI showing a list of time-ordered messages.  This can be
 *   the contents of a folder, on-server search results, or the
 *   (server-facilitated) list of messages in a conversation.
 * - We want to fetch more messages as the user scrolls so that the entire
 *   contents of the folder/search results list are available.
 * - We want to show the message as soon as possible.  So we can show a message
 *   in the list before we have its snippet.  However, we do want the
 *   bodystructure before we show it so we can accurately know if it has
 *   attachments.
 * - We want to update the state of the messages in real-time as we hear about
 *   changes from the server, such as another client starring a message or
 *   marking the message read.
 * - We will synchronize some folders with either a time and/or message count
 *   threshold.
 * - We want mutations made locally to appear as if they are applied
 *   immediately, even if we are operating offline.
 *
 * == Efficiency desires
 *
 * - Avoid redundant network traffic by caching our results using IndexedDB.
 * - Keep the I/O burden and overhead low from caching/sync.  We know our
 *   primary IndexedDB implementation is backed by SQLite with full
 *   transaction commits corresponding to IndexedDB transaction commits.
 *   We also know that all IndexedDB work gets marshaled to another thread.
 *   Since the server is the final word in state, except for mutations we
 *   trigger, we don't need to be aggressive about persisting state.
 *   Accordingly, let's persist our data in big blocks only on major
 *   transitions (folder change) or when our memory usage is getting high.
 *   (If we were using LevelDB, large writes would probably be less
 *   desirable.)
 *
 * == Of slices, folders, and gmail
 *
 * It would be silly for a slice that is for browsing the folder unfiltered and
 * a slice that is a result of a search to act as if they were dealing with
 * different messages.  Similarly, it would be silly in gmail for us to fetch
 * a message that we know is the same message across multiple (labels as)
 * folders.  So we abstract away the storage details to `FolderStorage`.
 *
 * == Latency, offline access, and IMAP
 *
 * The fundamental trade-off is between delaying showing things in the UI and
 * showing them and then having a bunch of stuff happen a split-second later.
 * (Messages appearing, disappearing, having their status change, etc.)
 *
 **/

define('mailapi/mailslice',
  [
    'rdcommon/log',
    './util',
    './a64',
    './allback',
    './date',
    './syncbase',
    'module',
    'exports'
  ],
  function(
    $log,
    $util,
    $a64,
    $allback,
    $date,
    $sync,
    $module,
    exports
  ) {
var bsearchForInsert = $util.bsearchForInsert,
    bsearchMaybeExists = $util.bsearchMaybeExists,
    cmpHeaderYoungToOld = $util.cmpHeaderYoungToOld,
    allbackMaker = $allback.allbackMaker,
    BEFORE = $date.BEFORE,
    ON_OR_BEFORE = $date.ON_OR_BEFORE,
    SINCE = $date.SINCE,
    STRICTLY_AFTER = $date.STRICTLY_AFTER,
    IN_BS_DATE_RANGE = $date.IN_BS_DATE_RANGE,
    HOUR_MILLIS = $date.HOUR_MILLIS,
    DAY_MILLIS = $date.DAY_MILLIS,
    NOW = $date.NOW,
    quantizeDate = $date.quantizeDate,
    quantizeDateUp = $date.quantizeDateUp;

var PASTWARDS = 1, FUTUREWARDS = -1;

// What do we think the post-snappy compression overhead of the structured clone
// persistence rep will be for various things?  These are total guesses right
// now.  Keep in mind we do want the pre-compression size of the data in all
// cases and we just hope it will compress a bit.  For the attributes we are
// including the attribute name as well as any fixed-overhead for its payload,
// especially numbers which may or may not be zig-zag encoded/etc.
var OBJ_OVERHEAD_EST = 2, STR_ATTR_OVERHEAD_EST = 5,
    NUM_ATTR_OVERHEAD_EST = 10, LIST_ATTR_OVERHEAD_EST = 4,
    NULL_ATTR_OVERHEAD_EST = 2, LIST_OVERHEAD_EST = 4,
    NUM_OVERHEAD_EST = 8, STR_OVERHEAD_EST = 4;

/**
 * Intersects two objects each defining tupled ranges of the type
 * { startTS, startUID, endTS, endUID }, like block infos and mail slices.
 * This is exported for unit testing purposes and because no state is closed
 * over.
 */
var tupleRangeIntersectsTupleRange = exports.tupleRangeIntersectsTupleRange =
    function tupleRangeIntersectsTupleRange(a, b) {
  if (BEFORE(a.endTS, b.startTS) ||
      STRICTLY_AFTER(a.startTS, b.endTS))
    return false;
  if ((a.endTS === b.startTS && a.endUID < b.startUID) ||
      (a.startTS === b.endTS && a.startTS > b.endUID))
    return false;
  return true;
};

/**
 * How much progress in the range [0.0, 1.0] should we report for just having
 * started the synchronization process?  The idea is that by having this be
 * greater than 0, our progress bar indicates that we are doing something or
 * at least know we should be doing something.
 */
var SYNC_START_MINIMUM_PROGRESS = 0.02;

/**
 * Book-keeping and limited agency for the slices.
 *
 * === Batching ===
 * Headers are removed, added, or modified using the onHeader* methods.
 * The updates are sent to 'SliceBridgeProxy' which batches updates and
 * puts them on the event loop. We batch so that we can minimize the number of
 * reflows and painting on the DOM side. This also enables us to batch data 
 * received in network packets around the smae time without having to handle it in 
 * each protocol's logic.
 *
 * Currently, we only batch updates that are done between 'now' and the next time
 * a zeroTimeout can fire on the event loop.  In order to keep the UI responsive,
 * We force flushes if we have more than 5 pending slices to send.
 */
function MailSlice(bridgeHandle, storage, _parentLog) {
  this._bridgeHandle = bridgeHandle;
  bridgeHandle.__listener = this;
  this._storage = storage;
  this._LOG = LOGFAB.MailSlice(this, _parentLog, bridgeHandle._handle);

  // The time range of the headers we are looking at right now.
  this.startTS = null;
  this.startUID = null;
  // If the end values line up with the most recent message known about for this
  // folder, then we will grow to encompass more recent messages.
  this.endTS = null;
  this.endUID = null;

  /**
   * A string value for hypothetical debugging purposes, but which is coerced
   * to a Boolean value for some of our slice notifications as both the
   * userRequested/moreExpected values, although they aren't super important.
   */
  this.waitingOnData = false;

  /**
   * If true, don't add any headers.  This is used by ActiveSync during its
   * synchronization step to wait until all headers have been retrieved and
   * then the slice is populated from the database.  After this initial sync,
   * ignoreHeaders is set to false so that updates and (hopefully small
   * numbers of) additions/removals can be observed.
   */
  this.ignoreHeaders = false;

  /**
   * @listof[HeaderInfo]
   */
  this.headers = [];
  this.desiredHeaders = $sync.INITIAL_FILL_SIZE;
}
exports.MailSlice = MailSlice;
MailSlice.prototype = {
  set atTop(val) {
    if (this._bridgeHandle)
      this._bridgeHandle.atTop = val;
    return val;
  },
  set atBottom(val) {
    if (this._bridgeHandle)
      this._bridgeHandle.atBottom = val;
    return val;
  },
  set userCanGrowUpwards(val) {
    if (this._bridgeHandle)
      this._bridgeHandle.userCanGrowUpwards = val;
    return val;
  },
  set userCanGrowDownwards(val) {
    if (this._bridgeHandle)
      this._bridgeHandle.userCanGrowDownwards = val;
    return val;
  },

  _updateSliceFlags: function() {
    var flagHolder = this._bridgeHandle;
    flagHolder.atTop = this._storage.headerIsYoungestKnown(this.endTS,
                                                           this.endUID);
    flagHolder.atBottom = this._storage.headerIsOldestKnown(this.startTS,
                                                            this.startUID);
    if (flagHolder.atTop)
      flagHolder.userCanGrowUpwards = !this._storage.syncedToToday();
    else
      flagHolder.userCanGrowUpwards = false;

    if (flagHolder.atBottom)
      flagHolder.userCanGrowDownwards = !this._storage.syncedToDawnOfTime();
    else
      flagHolder.userCanGrowDownwards = false;
  },

  /**
   * Reset the state of the slice, clearing out any known headers.
   */
  reset: function() {
    if (!this._bridgeHandle)
      return;

    if (this.headers.length) {
      this._bridgeHandle.sendSplice(0, this.headers.length, [], false, true);
      this.headers.splice(0, this.headers.length);

      this.startTS = null;
      this.startUID = null;
      this.endTS = null;
      this.endUID = null;
    }
  },

  /**
   * Force an update of our current date range.
   */
  refresh: function() {
    this._storage.refreshSlice(this);
  },

  reqNoteRanges: function(firstIndex, firstSuid, lastIndex, lastSuid) {
    if (!this._bridgeHandle)
      return;

    var i;
    // - Fixup indices if required
    if (firstIndex >= this.headers.length ||
        this.headers[firstIndex].suid !== firstSuid) {
      firstIndex = 0; // default to not splicing if it's gone
      for (i = 0; i < this.headers.length; i++) {
        if (this.headers[i].suid === firstSuid) {
          firstIndex = i;
          break;
        }
      }
    }
    if (lastIndex >= this.headers.length ||
        this.headers[lastIndex].suid !== lastSuid) {
      for (i = this.headers.length - 1; i >= 0; i--) {
        if (this.headers[i].suid === lastSuid) {
          lastIndex = i;
          break;
        }
      }
    }

    // - Perform splices as required
    // (high before low to avoid index changes)
    if (lastIndex + 1 < this.headers.length) {
      this.atBottom = false;
      this.userCanGrowDownwards = false;
      var delCount = this.headers.length - lastIndex  - 1;
      this.desiredHeaders -= delCount;
      this._bridgeHandle.sendSplice(
        lastIndex + 1, delCount, [],
        // This is expected; more coming if there's a low-end splice
        true, firstIndex > 0);
      this.headers.splice(lastIndex + 1, this.headers.length - lastIndex - 1);
      var lastHeader = this.headers[lastIndex];
      this.startTS = lastHeader.date;
      this.startUID = lastHeader.id;
    }
    if (firstIndex > 0) {
      this.atTop = false;
      this.userCanGrowUpwards = false;
      this.desiredHeaders -= firstIndex;
      this._bridgeHandle.sendSplice(0, firstIndex, [], true, false);
      this.headers.splice(0, firstIndex);
      var firstHeader = this.headers[0];
      this.endTS = firstHeader.date;
      this.endUID = firstHeader.id;
    }

    this._storage.sliceShrunk(this);
  },

  reqGrow: function(dirMagnitude, userRequestsGrowth) {
    if (dirMagnitude === -1)
      dirMagnitude = -$sync.INITIAL_FILL_SIZE;
    else if (dirMagnitude === 1)
      dirMagnitude = $sync.INITIAL_FILL_SIZE;
    this._storage.growSlice(this, dirMagnitude, userRequestsGrowth);
  },

  sendEmptyCompletion: function() {
    this.setStatus('synced', true, false);
  },

  setStatus: function(status, requested, moreExpected, flushAccumulated,
                      progress, newEmailCount) {
    if (!this._bridgeHandle)
      return;

    switch (status) {
      case 'synced':
      case 'syncfailed':
        this._updateSliceFlags();
        break;
    }
    this._bridgeHandle.sendStatus(status, requested, moreExpected, progress,
                                    newEmailCount);
  },

  /**
   * Update our sync progress with a value in the range [0.0, 1.0].  We leave
   * it up to the specific protocol to determine how it maps values.
   */
  setSyncProgress: function(value) {
    if (!this._bridgeHandle)
      return;
    this._bridgeHandle.sendSyncProgress(value);
  },

  /**
   * @args[
   *   @param[headers @listof[MailHeader]]
   *   @param[insertAt @oneof[
   *     @case[-1]{
   *       Append to the end of the list
   *     }
   *     @case[Number]{
   *       Insert the headers at the given index.
   *     }
   *   ]]
   *   @param[moreComing Boolean]
   * ]
   */
  batchAppendHeaders: function(headers, insertAt, moreComing) {
    if (!this._bridgeHandle)
      return;

    this._LOG.headersAppended(headers);
    if (insertAt === -1)
      insertAt = this.headers.length;
    this.headers.splice.apply(this.headers, [insertAt, 0].concat(headers));

    // XXX this can obviously be optimized to not be a loop
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      if (this.startTS === null ||
          BEFORE(header.date, this.startTS)) {
        this.startTS = header.date;
        this.startUID = header.id;
      }
      else if (header.date === this.startTS &&
               header.id < this.startUID) {
        this.startUID = header.id;
      }
      if (this.endTS === null ||
          STRICTLY_AFTER(header.date, this.endTS)) {
        this.endTS = header.date;
        this.endUID = header.id;
      }
      else if (header.date === this.endTS &&
               header.id > this.endUID) {
        this.endUID = header.id;
      }
    }

    this._updateSliceFlags();
    this._bridgeHandle.sendSplice(insertAt, 0, headers,
                                  true, moreComing);
  },

  /**
   * Tell the slice about a header it should be interested in.  This should
   * be unconditionally called by a sync populating this slice, or conditionally
   * called when the header is in the time-range of interest and a refresh,
   * cron-triggered sync, or IDLE/push tells us to do so.
   */
  onHeaderAdded: function(header, syncDriven, messageIsNew) {
    if (!this._bridgeHandle)
      return;

    var idx = bsearchForInsert(this.headers, header, cmpHeaderYoungToOld);
    var hlen = this.headers.length;
    // Don't append the header if it would expand us beyond our requested amount
    // and there is no subsequent step, like accumulate flushing, that would get
    // rid of the excess.  Note that this does not guarantee that we won't
    // end up with more headers than originally planned; if we get told about
    // headers earlier than the last slot, we will insert them and grow without
    // forcing a removal of something else to offset.
    if (hlen >= this.desiredHeaders && idx === hlen)
      return;
    // If we are inserting (not at the end) then be sure to grow
    // the number of desired headers to be consistent with the number of headers
    // we have.
    if (hlen >= this.desiredHeaders)
      this.desiredHeaders++;

    if (this.startTS === null ||
        BEFORE(header.date, this.startTS)) {
      this.startTS = header.date;
      this.startUID = header.id;
    }
    else if (header.date === this.startTS &&
             header.id < this.startUID) {
      this.startUID = header.id;
    }
    if (this.endTS === null ||
        STRICTLY_AFTER(header.date, this.endTS)) {
      this.endTS = header.date;
      this.endUID = header.id;
    }
    else if (header.date === this.endTS &&
             header.id > this.endUID) {
      this.endUID = header.id;
    }

    this._LOG.headerAdded(idx, header);
    this._bridgeHandle.sendSplice(idx, 0, [header],
                                  Boolean(this.waitingOnData),
                                  Boolean(this.waitingOnData));
    this.headers.splice(idx, 0, header);
  },

  /**
   * Tells the slice that a header it should know about has changed.  (If
   * this is a search, it's okay for it not to know...)
   */
  onHeaderModified: function(header) {
    if (!this._bridgeHandle)
      return;

    // this can only affect flags which will not affect ordering
    var idx = bsearchMaybeExists(this.headers, header, cmpHeaderYoungToOld);
    if (idx !== null) {
      // There is no identity invariant to ensure this is already true.
      this.headers[idx] = header;
      this._LOG.headerModified(idx, header);
      this._bridgeHandle.sendUpdate([idx, header]);
    }
  },

  /**
   * Tells the slice that a header it should know about has been removed.
   */
  onHeaderRemoved: function(header) {
    if (!this._bridgeHandle)
      return;

    var idx = bsearchMaybeExists(this.headers, header, cmpHeaderYoungToOld);
    if (idx !== null) {
      this._LOG.headerRemoved(idx, header);
      this._bridgeHandle.sendSplice(idx, 1, [],
                                    Boolean(this.waitingOnData),
                                    Boolean(this.waitingOnData));
      this.headers.splice(idx, 1);

      // update time-ranges if required...
      if (header.date === this.endTS && header.id === this.endUID) {
        if (!this.headers.length) {
          this.endTS = null;
          this.endUID = null;
        }
        else {
          this.endTS = this.headers[0].date;
          this.endUID = this.headers[0].id;
        }
      }
      if (header.date === this.startTS && header.id === this.startUID) {
        if (!this.headers.length) {
          this.startTS = null;
          this.startUID = null;
        }
        else {
          var lastHeader = this.headers[this.headers.length - 1];
          this.startTS = lastHeader.date;
          this.startUID = lastHeader.id;
        }
      }
    }
  },

  die: function() {
    this._bridgeHandle = null;
    this.desiredHeaders = 0;
    this._storage.dyingSlice(this);
    this._LOG.__die();
  },

  get isDead() {
    return this._bridgeHandle === null;
  },
};

/**
 * Per-folder message caching/storage; issues per-folder `MailSlice`s and keeps
 * them up-to-date.  Access is mediated through the use of mutexes which must be
 * acquired for write access and are advisable for read access that requires
 * access to more than a single message.
 *
 * ## Naming and Ordering
 *
 * Messages in the folder are named and ordered by the tuple of the message's
 * received date and a "sufficiently unique identifier" (SUID) we allocate.
 *
 * The SUID is actually a concatenation of an autoincrementing per-folder 'id'
 * to our folder id, which in turn contains the account id.  Internally, we only
 * care about the 'id' since the rest is constant for the folder.  However, all
 * APIs layered above us need to deal in SUIDs since we will eventually have
 * `MailSlice` instances that aggregate the contents so it is important that the
 * extra information always be passed around.
 *
 * Because the SUID has no time component and for performance we want a total
 * ordering on the messages, messages are first ordered on their 'received'
 * date.  For IMAP this is the message's INTERNALDATE.  For ActiveSync this is
 * the email:DateReceived element.  Accordingly, when performing a lookup, we
 * either need the exact date of the message or a reasonable bounded time range
 * in which it could fall (which should be a given for date range scans).
 *
 * ## Storage, Caching, Cache Flushing
 *
 * Storage is done using IndexedDB, with message header information and message
 * body information stored in separate blocks of information.  See the
 * `maildb.js` file and `MailDB` class for more detailed information.
 *
 * Blocks are loaded from disk on demand and cached, although preferably hints
 * are received so we can pre-load information.  Blocks are discarded from the
 * cache automatically when a mutex is released or when explicitly invoked by
 * the code currently holding the mutex.  Code that can potentially cause a
 * large number of blocks to be loaded is responsible for periodically
 * triggering cache evictions and/or writing of dirty blocks to disk so that
 * cache evictions are possible.
 *
 * We avoid automatic cache eviction in order to avoid the class of complex bugs
 * that might arise.  While well-written code should not run afoul of automatic
 * cache eviction were it to exist, buggy code happens.  We can more reliably
 * detect potentially buggy code this way by simply reporting whenever the
 * number of loaded blocks exceeds some threshold.
 *
 * When evicting blocks from cache, we try and keep blocks around that contain
 * messages referenced by active `MailSlice` instances in order to avoid the
 * situation where we discard blocks just to reload them with the next user
 * action, and with added latency.
 *
 * If WeakMap were standardized, we would instead move blocks into a WeakMap,
 * but it's not, so we don't.
 *
 * ## Block Purging (IMAP)
 *
 * For account types like IMAP where we can incrementally grow the set of
 * messages we have synchronized from the server, our entire database is
 * effectively a cache of the server state.  This is in contrast to ActiveSync
 * where we synchronize a fixed time-window of messages and so the exact set of
 * messages we should know about is well-defined and bounded.  As a result, we
 * need to be able to purge old messages that the user no longer appears to
 * care about so that our disk usage does not grow without bound.
 *
 * We currently trigger block purging as the result of block growth in a folder.
 * Specifically
 *
 * Messages are discarded from storage when experiencing storage pressure.  We
 * figure it's better to cache what we have until it's known useless (deleted
 * messages) or we definitely need the space for something else.
 *
 * ## Concurrency and I/O
 *
 * The logic in this class can operate synchronously as long as the relevant
 * header/body blocks are in-memory.  For simplicity, we (asynchronously) defer
 * execution of calls that mutate state while loads are in-progress; callers
 * will not block.  This simplifies our implementation and thinking about our
 * implementation without making life for our users much worse.
 *
 * Specifically, all UI requests for data will be serviced immediately if the
 * data is available.  If the data is not available, the wait would have
 * happened anyways.  Mutations will be enqueued, but are always speculatively
 * assumed to succeed by the UI anyways so when they are serviced is not
 * exceedingly important other than a burden on us to surface in the UI that
 * we still have some state to synchronize to the server so the user does
 * not power-off their phone quite yet.
 *
 * ## Types
 *
 * @typedef[AccuracyRangeInfo @dict[
 *   @key[endTS DateMS]{
 *     This value is exclusive in keeping with IMAP BEFORE semantics.
 *   }
 *   @key[startTS DateMS]{
 *     This value is inclusive in keeping with IMAP SINCE semantics.
 *   }
 *   @key[fullSync @dict[
 *     @key[highestModseq #:optional String]{
 *       The highest modseq for this range, if we have one.  This would be the
 *       value reported on folder entry, plus any maximization that occurs if we
 *       utilized IDLE or some other mechanism to keep the range up-to-date.
 *       On servers without highestmodseq, this will be null.
 *     }
 *     @key[updated DateMS]{
 *       What was our local timestamp the last time we synchronized this range?
 *       This is speculative and probably just for debugging unless we have the
 *       UI reflect that in offline mode it knows what it is showing you could
 *       be fairly out of date.
 *     }
 *   }
 *   ]]{
 *     Did we fully synchronize this time range (because of a date scan)?  If
 *     false, the implication is that we know about the messages in this range
 *     because of some type of search.
 *   }
 * ]]{
 *   Describes the provenance of the data we have for a given time range.
 *   Tracked independently of the block data because there doesn't really seem
 *   to be an upside to coupling them.
 *
 *   This lets us know when we have sufficiently valid data to display messages
 *   without needing to talk to the server, allows us to size checks for
 *   new messages in time ranges, and should be a useful debugging aid.
 * }
 * @typedef[FolderBlockInfo @dict[
 *   @key[blockId BlockId]{
 *     The name of the block for storage access.
 *   }
 *   @key[startTS DateMS]{
 *     The timestamp of the last and therefore (possibly equally) oldest message
 *     in this block.  Forms the first part of a composite key with `startUID`.
 *   }
 *   @key[startUID UID]{
 *     The UID of the last and therefore (possibly equally) oldest message
 *     in this block.  Forms the second part of a composite key with `startTS`.
 *   }
 *   @key[endTS DateMS]{
 *     The timestamp of the first and therefore (possibly equally) newest
 *     message in this block.  Forms the first part of a composite key with
 *     `endUID`.
 *   }
 *   @key[endUID UID]{
 *     The UID of the first and therefore (possibly equally) newest message
 *     in this block.  Forms the second part of a composite key with `endTS`.
 *   }
 *   @key[count Number]{
 *     The number of messages in this bucket.
 *   }
 *   @key[estSize Number]{
 *     The estimated size in bytes all of the messages in this bucket use.  This
 *     is to assist us in known when to split/merge blocks.
 *   }
 * ]]{
 *   The directory entries for our `HeaderBlock` and `BodyBlock` instances.
 *   Currently, these are always stored in memory since they are small and
 *   there shouldn't be a tremendous number of them.
 *
 *   These
 * }
 * @typedef[EmailAddress String]
 * @typedef[NameAddressPair @dict[
 *   @key[address EmailAddress]
 *   @key[name String]
 * ]]
 * @typedef[HeaderInfo @dict[
 *   @key[id]{
 *     An id allocated by the back-end that names the message within the folder.
 *     We use this instead of the server-issued UID because if we used the UID
 *     for this purpose then we would still need to issue our own temporary
 *     speculative id's for offline operations and would need to implement
 *     renaming and it all gets complicated.
 *   }
 *   @key[srvid]{
 *     The server-issued UID for the folder, or 0 if the folder is an offline
 *     header.
 *   }
 *   @key[suid]{
 *     Basically "account id/folder id/message id", although technically the
 *     folder id includes the account id.
 *   }
 *   @key[guid String]{
 *     This is the message-id header value of the message.
 *   }
 *   @key[author NameAddressPair]
 *   @key[date DateMS]
 *   @key[flags @listof[String]]
 *   @key[hasAttachments Boolean]
 *   @key[subject String]
 *   @key[snippet @oneof[
 *     @case[null]{
 *       We haven't tried to generate a snippet yet.
 *     }
 *     @case['']{
 *       We tried to generate a snippet, but got nothing useful.  Note that we
 *       may try and generate a snippet from a partial body fetch; this does not
 *       indicate that we should avoid computing a better snippet.  Whenever the
 *       snippet is falsey and we have retrieved more body data, we should
 *       always try and derive a snippet.
 *     }
 *     @case[String]{
 *       A non-empty string means we managed to produce some snippet data.  It
 *        is still appropriate to regenerate the snippet if more body data is
 *        fetched since our snippet may be a fallback where we chose quoted text
 *        instead of authored text, etc.
 *     }
 *   ]]
 * ]]
 * @typedef[HeaderBlock @dict[
 *   @key[ids @listof[ID]]{
 *     The issued-by-us-id's of the headers in the same order (not the IMAP
 *     UID).  This is intended as a fast parallel search mechanism.  It can be
 *     discarded if it doesn't prove useful.
 *
 *     XXX We want to rename this to be "ids" in a refactoring pass in the
 *     future.
 *   }
 *   @key[headers @listof[HeaderInfo]]{
 *     Headers in numerically decreasing time and issued-by-us-ID order.  The
 *     header at index 0 should correspond to the 'end' characteristics of the
 *     blockInfo and the header at n-1 should correspond to the start
 *     characteristics.
 *   }
 * ]]
 * @typedef[AttachmentInfo @dict[
 *   @key[name String]{
 *     The filename of the attachment, if any.
 *   }
 *   @key[contentId String]{
 *     The content-id of the attachment if this is a related part for inline
 *     display.
 *   }
 *   @key[type String]{
 *     The (full) mime-type of the attachment.
 *   }
 *   @key[part String]{
 *     The IMAP part number for fetching the attachment.
 *   }
 *   @key[encoding String]{
 *     The encoding of the attachment so we know how to decode it.
 *   }
 *   @key[sizeEstimate Number]{
 *     Estimated file size in bytes.  Gets updated to be the correct size on
 *     attachment download.
 *   }
 *   @key[file @oneof[
 *     @case[null]{
 *       The attachment has not been downloaded, the file size is an estimate.
 *     }
 *     @case[@list["device storage type" "file path"]{
 *       The DeviceStorage type (ex: pictures) and the path to the file within
 *       device storage.
 *     }
 *     @case[HTMLBlob]{
 *       The Blob that contains the attachment.  It can be thought of as a
 *       handle/name to access the attachment.  IndexedDB in Gecko stores the
 *       blobs as (quota-tracked) files on the file-system rather than inline
 *       with the record, to the attachments don't need to count against our
 *       block size since they are not part of the direct I/O burden for the
 *       block.
 *     }
 *   ]]
 *   @key[charset @oneof[undefined String]]{
 *     The character set, for example "ISO-8859-1".  If not specified, as is
 *     likely for binary attachments, this should be null.
 *   }
 *   @key[textFormat @oneof[undefined String]]{
 *     The text format, for example, "flowed" for format=flowed.  If not
 *     specified, as is likely for binary attachments, this should be null.
 *   }
 * ]]
 * @typedef[BodyInfo @dict[
 *   @key[date DateMS]{
 *     Redundantly stored date info for block splitting purposes.  We pretty
 *     much need this no matter what because our ordering is on the tuples of
 *     dates and UIDs, so we could have trouble efficiently locating our header
 *     from the body without this.
 *   }
 *   @key[size Number]
 *   @key[to @listof[NameAddressPair]]
 *   @key[cc @listof[NameAddressPair]]
 *   @key[bcc @listof[NameAddressPair]]
 *   @key[replyTo NameAddressPair]
 *   @key[attachments @listof[AttachmentInfo]]{
 *     Proper attachments for explicit downloading.
 *   }
 *   @key[relatedParts @oneof[null @listof[AttachmentInfo]]]{
 *     Attachments for inline display in the contents of the (hopefully)
 *     multipart/related message.
 *   }
 *   @key[references @oneof[null @listof[String]]]{
 *     The contents of the references header as a list of de-quoted ('<' and
 *     '>' removed) message-id's.  If there was no header, this is null.
 *   }
 *   @key[bodyReps @listof[@oneof[String Array]]]{
 *     This is a list where each two consecutive elements describe a body
 *     representation.  The even indices are the body rep types which are
 *     either 'plain' or 'html'.  The odd indices are the actual
 *     representations.
 *
 *     The representation for 'plain' values is a `quotechew.js` processed
 *     body representation (which is itself a similar pair-wise list except
 *     that the identifiers are packed integers).
 *
 *     The body representation for 'html' values is an already sanitized and
 *     already quote-normalized String representation that could be directly
 *     fed into innerHTML safely if you were so inclined.  See `htmlchew.js`
 *     for more on that process.
 *   }
 * ]]{
 *   Information on the message body that is only for full message display.
 *   The to/cc/bcc information may get moved up to the header in the future,
 *   but our driving UI doesn't need it right now.
 * }
 * @typedef[BodyBlock @dict[
 *   @key[ids @listof[ID]]{
 *     The issued-by-us id's of the messages; the order is parallel to the order
 *     of `bodies.`
 *   }
 *   @key[bodies @dictof[
 *     @key["unique identifier" ID]
 *     @value[BodyInfo]
 *   ]]
 * ]]
 */
function FolderStorage(account, folderId, persistedFolderInfo, dbConn,
                       FolderSyncer, _parentLog) {
  /** Our owning account. */
  this._account = account;
  this._imapDb = dbConn;

  this.folderId = folderId;
  this.folderMeta = persistedFolderInfo.$meta;
  this._folderImpl = persistedFolderInfo.$impl;

  this._LOG = LOGFAB.FolderStorage(this, _parentLog, folderId);

  /**
   * @listof[AccuracyRangeInfo]{
   *   Newest-to-oldest sorted list of accuracy range info structures that are
   *   keyed by their IMAP-consistent startTS (inclusive) and endTS (exclusive)
   *   on a per-day granularity.
   * }
   */
  this._accuracyRanges = persistedFolderInfo.accuracy;
  /**
   * @listof[FolderBlockInfo]{
   *   Newest-to-oldest (numerically decreasing time and ID) sorted list of
   *   header folder block infos.  They are keyed by a composite key consisting
   *   of messages' "date" and "id" fields.
   * }
   */
  this._headerBlockInfos = persistedFolderInfo.headerBlocks;
  /**
   * @listof[FolderBlockInfo]{
   *   Newest-to-oldest (numerically decreasing time and ID) sorted list of
   *   body folder block infos.  They are keyed by a composite key consisting
   *   of messages' "date" and "id" fields.
   * }
   */
  this._bodyBlockInfos = persistedFolderInfo.bodyBlocks;

  /**
   * @oneof[null @dictof[
   *   @key[ServerID]{
   *     The "srvid" value of a header entry.
   *   }
   *   @value[BlockID]{
   *     The block the header is stored in.
   *   }
   * ]]
   */
  this._serverIdHeaderBlockMapping =
    persistedFolderInfo.serverIdHeaderBlockMapping;

  /**
   * @dictof[@key[BlockId] @value[HeaderBlock]]{
   *   In-memory cache of header blocks.
   * }
   */
  this._headerBlocks = {};
  /**
   * @listof[FolderBlockInfo]{
   *   The block infos of all the header blocks in `_headerBlocks`.  Exists so
   *   that we don't need to map blocks back to their block infos when we are
   *   considering flushing things.  This could also be used for most recently
   *   loaded tracking.
   * }
   */
  this._loadedHeaderBlockInfos = [];
  /**
   * @dictof[@key[BlockId] @value[BodyBlock]]{
   *   In-memory cache of body blocks.
   * }
   */
  this._bodyBlocks = {};
  /**
   * @listof[FolderBlockInfo]{
   *   The block infos of all the body blocks in `_bodyBlocks`.  Exists so
   *   that we don't need to map blocks back to their block infos when we are
   *   considering flushing things.  This could also be used for most recently
   *   loaded tracking.
   * }
   */
  this._loadedBodyBlockInfos = [];

  this._bound_makeHeaderBlock = this._makeHeaderBlock.bind(this);
  this._bound_insertHeaderInBlock = this._insertHeaderInBlock.bind(this);
  this._bound_splitHeaderBlock = this._splitHeaderBlock.bind(this);
  this._bound_deleteHeaderFromBlock = this._deleteHeaderFromBlock.bind(this);

  this._bound_makeBodyBlock = this._makeBodyBlock.bind(this);
  this._bound_insertBodyInBlock = this._insertBodyInBlock.bind(this);
  this._bound_splitBodyBlock = this._splitBodyBlock.bind(this);
  this._bound_deleteBodyFromBlock = this._deleteBodyFromBlock.bind(this);

  /**
   * Has our internal state altered at all and will need to be persisted?
   */
  this._dirty = false;
  /** @dictof[@key[BlockId] @value[HeaderBlock]] */
  this._dirtyHeaderBlocks = {};
  /** @dictof[@key[BlockId] @value[BodyBlock]] */
  this._dirtyBodyBlocks = {};

  /**
   * @listof[AggrBlockId]
   */
  this._pendingLoads = [];
  /**
   * @dictof[
   *   @key[AggrBlockId]
   *   @key[@listof[@func]]
   * ]
   */
  this._pendingLoadListeners = {};

  /**
   * @listof[@func[]]{
   *   A list of fully-bound functions to drain when the last pending load gets
   *   loaded, at least until a new load goes pending.
   * }
   */
  this._deferredCalls = [];

  /**
   * @listof[@dict[
   *   @key[name String]{
   *     A string describing the operation to be performed for debugging
   *     purposes.  This string must not include any user data.
   *   }
   *   @key[func @func[@args[callWhenDone]]]{
   *     The function to be invoked.
   *   }
   * ]]{
   *   The list of mutexed call operations queued.  The first entry is the
   *   currently executing entry.
   * }
   */
  this._mutexQueue = [];

  /**
   * Active view slices on this folder.
   */
  this._slices = [];
  /**
   * The slice that is driving our current synchronization and wants to hear
   * about all header modifications/notes as they occur.  This will be null
   * when performing a refresh sync.
   */
  this._curSyncSlice = null;

  this._messagePurgeScheduled = false;
  this.folderSyncer = FolderSyncer && new FolderSyncer(account, this,
                                                       this._LOG);
}
exports.FolderStorage = FolderStorage;
FolderStorage.prototype = {
  get hasActiveSlices() {
    return this._slices.length > 0;
  },

  /**
   * Reset all active slices.
   */
  resetAndRefreshActiveSlices: function() {
    if (!this._slices.length)
      return;
    // This will splice out slices as we go, so work from the back to avoid
    // processing any slice more than once.  (Shuffling of processed slices
    // will occur, but we don't care.)
    for (var i = this._slices.length - 1; i >= 0; i--) {
      var slice = this._slices[i];
      slice.reset();
      slice.desiredHeaders = $sync.INITIAL_FILL_SIZE;
      this._resetAndResyncSlice(slice, true, null);
    }
  },

  /**
   * Called by our owning account to generate lists of dirty blocks to be
   * persisted to the database if we have any dirty blocks.
   *
   * We trigger a cache flush after clearing the set of dirty blocks because
   * this is the first time we can flush the no-longer-dirty blocks and this is
   * an acceptable/good time to clear the cache since we must not be in a mutex.
   */
  generatePersistenceInfo: function() {
    if (!this._dirty)
      return null;
    var pinfo = {
      id: this.folderId,
      headerBlocks: this._dirtyHeaderBlocks,
      bodyBlocks: this._dirtyBodyBlocks,
    };
    this._dirtyHeaderBlocks = {};
    this._dirtyBodyBlocks = {};
    this._dirty = false;
    this.flushExcessCachedBlocks('persist');
    return pinfo;
  },

  _invokeNextMutexedCall: function() {
    var callInfo = this._mutexQueue[0], self = this, done = false;
    this._mutexedCallInProgress = true;
    this._LOG.mutexedCall_begin(callInfo.name);

    try {
      callInfo.func(function mutexedOpDone() {
        if (done) {
          self._LOG.tooManyCallbacks(callInfo.name);
          return;
        }
        self._LOG.mutexedCall_end(callInfo.name);
        done = true;
        if (self._mutexQueue[0] !== callInfo) {
          self._LOG.mutexInvariantFail(callInfo.name, self._mutexQueue[0].name);
          return;
        }
        self._mutexQueue.shift();
        self.flushExcessCachedBlocks('mutex');
        // Although everything should be async, avoid stack explosions by
        // deferring the execution to a future turn of the event loop.
        if (self._mutexQueue.length)
          window.setZeroTimeout(self._invokeNextMutexedCall.bind(self));
        else if (self._slices.length === 0)
          self.folderSyncer.allConsumersDead();
      });
    }
    catch (ex) {
      this._LOG.mutexedOpErr(ex);
    }
  },

  /**
   * If you want to modify the state of things in the FolderStorage, or be able
   * to view the state of the FolderStorage without worrying about some other
   * logic mutating its state, then use this to schedule your function to run
   * with (notional) exclusive write access.  Because everything is generally
   * asynchronous, it's assumed your function is still doing work until it calls
   * the passed-in function to indicate it is done.
   *
   * This mutex should not be held longer than required.  Specifically, if error
   * handling determines that we should wait a few seconds to retry a network
   * operation, then the function should mark itself completed and issue a call
   * to runMutexed again in the future once the timeout has elapsed.
   *
   * Keep in mind that there is nothing actually stopping other code from trying
   * to manipulate the database.
   *
   * It's okay to issue reads against the FolderStorage if the value is
   * immutable or there are other protective mechanisms in place.  For example,
   * fetching a message body should always be safe even if a block load needs
   * to occur.  But if you wanted to fetch a header, mutate it, and write it
   * back, then you would want to do all of that with the mutex held; reading
   * the header before holding the mutex could result in a race.
   *
   * @args[
   *   @param[name String]{
   *     A short name to identify what operation this is for debugging purposes.
   *     No private user data or sensitive data should be included in the name.
   *   }
   *   @param[func @func[@args[@param[callWhenDone Function]]]]{
   *     The function to run with (notional) exclusive access to the
   *     FolderStorage.
   *   }
   * ]
   */
  runMutexed: function(name, func) {
    var doRun = this._mutexQueue.length === 0;
    this._mutexQueue.push({ name: name, func: func });

    if (doRun)
      this._invokeNextMutexedCall();
  },

  _issueNewHeaderId: function() {
    return this._folderImpl.nextId++;
  },

  /**
   * Create an empty header `FolderBlockInfo` and matching `HeaderBlock`.  The
   * `HeaderBlock` will be inserted into the block map, but it's up to the
   * caller to insert the returned `FolderBlockInfo` in the right place.
   */
  _makeHeaderBlock: function ifs__makeHeaderBlock(
      startTS, startUID, endTS, endUID, estSize, ids, headers) {
    var blockId = $a64.encodeInt(this._folderImpl.nextHeaderBlock++),
        blockInfo = {
          blockId: blockId,
          startTS: startTS,
          startUID: startUID,
          endTS: endTS,
          endUID: endUID,
          count: ids ? ids.length : 0,
          estSize: estSize || 0,
        },
        block = {
          ids: ids || [],
          headers: headers || [],
        };
    this._dirty = true;
    this._headerBlocks[blockId] = block;
    this._dirtyHeaderBlocks[blockId] = block;

    // Update the server id mapping if we are maintaining one.
    if (this._serverIdHeaderBlockMapping && headers) {
      var srvMapping = this._serverIdHeaderBlockMapping;
      for (var i = 0; i < headers.length; i++) {
        var header = headers[i];
        if (header.srvid)
          srvMapping[header.srvid] = blockId;
      }
    }

    return blockInfo;
  },

  _insertHeaderInBlock: function ifs__insertHeaderInBlock(header, uid, info,
                                                          block) {
    var idx = bsearchForInsert(block.headers, header, cmpHeaderYoungToOld);
    block.ids.splice(idx, 0, header.id);
    block.headers.splice(idx, 0, header);
    this._dirty = true;
    this._dirtyHeaderBlocks[info.blockId] = block;
    // Insertion does not need to update start/end TS/UID because the calling
    // logic is able to handle it.
  },

  _deleteHeaderFromBlock: function ifs__deleteHeaderFromBlock(uid, info, block) {
    var idx = block.ids.indexOf(uid), header;
    // - remove, update counts
    block.ids.splice(idx, 1);
    block.headers.splice(idx, 1);
    info.estSize -= $sync.HEADER_EST_SIZE_IN_BYTES;
    info.count--;

    this._dirty = true;
    this._dirtyHeaderBlocks[info.blockId] = block;

    // - update endTS/endUID if necessary
    if (idx === 0 && info.count) {
      header = block.headers[0];
      info.endTS = header.date;
      info.endUID = header.id;
    }
    // - update startTS/startUID if necessary
    if (idx === info.count && idx > 0) {
      header = block.headers[idx - 1];
      info.startTS = header.date;
      info.startUID = header.id;
    }
  },

  /**
   * Split the contents of the given header block into a newer and older block.
   * The newer info block will be mutated in place; the older block info will
   * be created and returned.  The newer block is filled with data until it
   * first overflows newerTargetBytes.  This method is responsible for updating
   * the actual containing blocks as well.
   */
  _splitHeaderBlock: function ifs__splitHeaderBlock(splinfo, splock,
                                                    newerTargetBytes) {
    // We currently assume a fixed size, so this is easy.
    var numHeaders = Math.ceil(newerTargetBytes /
                               $sync.HEADER_EST_SIZE_IN_BYTES);
    if (numHeaders > splock.headers.length)
      throw new Error("No need to split!");

    var olderNumHeaders = splock.headers.length - numHeaders,
        olderEndHeader = splock.headers[numHeaders],
        // (This will update the server id mappings for the headers too)
        olderInfo = this._makeHeaderBlock(
                      // Take the start info from the block, because it may have
                      // been extended beyond the header (for an insertion if
                      // we change back to inserting after splitting.)
                      splinfo.startTS, splinfo.startUID,
                      olderEndHeader.date, olderEndHeader.id,
                      olderNumHeaders * $sync.HEADER_EST_SIZE_IN_BYTES,
                      splock.ids.splice(numHeaders, olderNumHeaders),
                      splock.headers.splice(numHeaders, olderNumHeaders));

    var newerStartHeader = splock.headers[numHeaders - 1];
    splinfo.count = numHeaders;
    splinfo.estSize = numHeaders * $sync.HEADER_EST_SIZE_IN_BYTES;
    splinfo.startTS = newerStartHeader.date;
    splinfo.startUID = newerStartHeader.id;
    // this._dirty is already touched by makeHeaderBlock when it dirties the
    // block it creates.
    this._dirtyHeaderBlocks[splinfo.blockId] = splock;

    return olderInfo;
  },

  /**
   * Create an empty header `FolderBlockInfo` and matching `BodyBlock`.  The
   * `BodyBlock` will be inserted into the block map, but it's up to the
   * caller to insert the returned `FolderBlockInfo` in the right place.
   */
  _makeBodyBlock: function ifs__makeBodyBlock(
      startTS, startUID, endTS, endUID, size, ids, bodies) {
    var blockId = $a64.encodeInt(this._folderImpl.nextBodyBlock++),
        blockInfo = {
          blockId: blockId,
          startTS: startTS,
          startUID: startUID,
          endTS: endTS,
          endUID: endUID,
          count: ids ? ids.length : 0,
          estSize: size || 0,
        },
        block = {
          ids: ids || [],
          bodies: bodies || {},
        };
    this._dirty = true;
    this._bodyBlocks[blockId] = block;
    this._dirtyBodyBlocks[blockId] = block;

    if (this._folderImpl.nextBodyBlock %
          $sync.BLOCK_PURGE_EVERY_N_NEW_BODY_BLOCKS === 0 &&
        !this._messagePurgeScheduled) {
      this._messagePurgeScheduled = true;
      this._account.scheduleMessagePurge(this.folderId);
    }

    return blockInfo;
  },

  _insertBodyInBlock: function ifs__insertBodyInBlock(body, id, info, block) {
    function cmpBodyByID(aID, bID) {
      var aDate = (aID === id) ? body.date : block.bodies[aID].date,
          bDate = (bID === id) ? body.date : block.bodies[bID].date,
          d = bDate - aDate;
      if (d)
        return d;
      d = bID - aID;
      return d;
    }

    var idx = bsearchForInsert(block.ids, id, cmpBodyByID);
    block.ids.splice(idx, 0, id);
    block.bodies[id] = body;
    this._dirty = true;
    this._dirtyBodyBlocks[info.blockId] = block;
    // Insertion does not need to update start/end TS/UID because the calling
    // logic is able to handle it.
  },

  _deleteBodyFromBlock: function ifs__deleteBodyFromBlock(id, info, block) {
    // - delete
    var idx = block.ids.indexOf(id);
    var body = block.bodies[id];
    if (idx === -1 || !body) {
      this._LOG.bodyBlockMissing(id, idx, !!body);
      return;
    }
    block.ids.splice(idx, 1);
    delete block.bodies[id];
    info.estSize -= body.size;
    info.count--;

    this._dirty = true;
    this._dirtyBodyBlocks[info.blockId] = block;

    // - update endTS/endUID if necessary
    if (idx === 0 && info.count) {
      info.endUID = id = block.ids[0];
      info.endTS = block.bodies[id].date;
    }
    // - update startTS/startUID if necessary
    if (idx === info.count && idx > 0) {
      info.startUID = id = block.ids[idx - 1];
      info.startTS = block.bodies[id].date;
    }
  },

  /**
   * Split the contents of the given body block into a newer and older block.
   * The newer info block will be mutated in place; the older block info will
   * be created and returned.  The newer block is filled with data until it
   * first overflows newerTargetBytes.  This method is responsible for updating
   * the actual containing blocks as well.
   */
  _splitBodyBlock: function ifs__splitBodyBlock(splinfo, splock,
                                                newerTargetBytes) {
    // Save off the start timestamp/uid; these may have been extended beyond the
    // delimiting bodies because of the insertion triggering the split.  (At
    // least if we start inserting after splitting again in the future.)
    var savedStartTS = splinfo.startTS, savedStartUID = splinfo.startUID;

    var newerBytes = 0, ids = splock.ids, newDict = {}, oldDict = {},
        inNew = true, numHeaders = null, i, id, body,
        idxLast = ids.length - 1;
    // loop for new traversal; picking a split-point so that there is at least
    // one item in each block.
    for (i = 0; i < idxLast; i++) {
      id = ids[i],
      body = splock.bodies[id];
      newerBytes += body.size;
      newDict[id] = body;
      if (newerBytes >= newerTargetBytes) {
        i++;
        break;
      }
    }
    // mark the breakpoint; i is pointing at the first old-block message
    splinfo.count = numHeaders = i;
    // and these values are from the last processed new-block message
    splinfo.startTS = body.date;
    splinfo.startUID = id;
    // loop for old traversal
    for (; i < ids.length; i++) {
      id = ids[i];
      oldDict[id] = splock.bodies[id];
    }

    var oldEndUID = ids[numHeaders];
    var olderInfo = this._makeBodyBlock(
      savedStartTS, savedStartUID,
      oldDict[oldEndUID].date, oldEndUID,
      splinfo.estSize - newerBytes,
      // (the older block gets the uids the new/existing block does not want,
      //  leaving `uids` containing only the d
      ids.splice(numHeaders, ids.length - numHeaders),
      oldDict);
    splinfo.estSize = newerBytes;
    splock.bodies = newDict;
    // _makeBodyBlock dirties the block it creates and touches _dirty
    this._dirtyBodyBlocks[splinfo.blockId] = splock;

    return olderInfo;
  },

  /**
   * Flush cached blocks that are unlikely to be used again soon.  Our
   * heuristics for deciding what to keep is simple:
   * - Dirty blocks are always kept; this is required for correctness.
   * - Blocks that overlap with live `MailSlice` instances are kept.
   *
   * It could also make sense to support some type of MRU tracking, but the
   * complexity is not currently justified since the live `MailSlice` should
   * lead to a near-perfect hit rate on immediate actions and the UI's
   * pre-emptive slice growing should insulate it from any foolish discards
   * we might make.
   */
  flushExcessCachedBlocks: function(debugLabel) {
    var slices = this._slices;
    function blockIntersectsAnySlice(blockInfo) {
      for (var i = 0; i < slices.length; i++) {
        var slice = slices[i];
        if (tupleRangeIntersectsTupleRange(slice, blockInfo)) {
          // Here is some useful debug you can uncomment!
          /*
          console.log('  slice intersect. slice:',
                      slice.startTS, slice.startUID,
                      slice.endTS, slice.endUID, '  block:',
                      blockInfo.startTS, blockInfo.startUID,
                      blockInfo.endTS, blockInfo.endUID);
           */
          return true;
        }
      }
      return false;
    }
    function maybeDiscard(blockType, blockInfoList, loadedBlockInfos,
                          blockMap, dirtyMap) {
      // console.warn('!! flushing', blockType, 'blocks because:', debugLabel);
      for (var i = 0; i < loadedBlockInfos.length; i++) {
        var blockInfo = loadedBlockInfos[i];
        // do not discard dirty blocks
        if (dirtyMap.hasOwnProperty(blockInfo.blockId)) {
          // console.log('  dirty block:', blockInfo.blockId);
          continue;
        }
        // do not discard blocks that overlap mail slices
        if (blockIntersectsAnySlice(blockInfo))
          continue;
        // console.log('discarding', blockType, 'block', blockInfo.blockId);
        delete blockMap[blockInfo.blockId];
        loadedBlockInfos.splice(i--, 1);
      }
    }

    maybeDiscard(
      'header', this._headerBlockInfos, this._loadedHeaderBlockInfos,
      this._headerBlocks, this._dirtyHeaderBlocks);
    maybeDiscard(
      'body', this._bodyBlockInfos, this._loadedBodyBlockInfos,
      this._bodyBlocks, this._dirtyBodyBlocks);
  },

  /**
   * Discard the cached block that contains the message header or body in
   * question.  This is intended to be used in cases where we want to re-read
   * a header or body from disk to get IndexedDB file-backed Blobs to replace
   * our (likely) memory-backed Blobs.
   *
   * This will log, but not throw, an error in the event the block in question
   * is currently tracked as a dirty block or there is no block that contains
   * the named message.  Both cases indicate an assumption that is being
   * violated.  This should cause unit tests to fail but not break us if this
   * happens out in the real-world.
   *
   * If the block is not currently loaded, no error is triggered.
   *
   * This method executes synchronously.
   *
   * @method _discardCachedBlockUsingDateAndID
   * @param type {'header'|'body'}
   * @param date {Number}
   *   The timestamp of the message in question.
   * @param id {Number}
   *   The folder-local id we allocated for the message.  Not the SUID, not the
   *   server-id.
   */
  _discardCachedBlockUsingDateAndID: function(type, date, id) {
    var blockInfoList, loadedBlockInfoList, blockMap, dirtyMap;
    this._LOG.discardFromBlock(type, date, id);
    if (type === 'header') {
      blockInfoList = this._headerBlockInfos;
      loadedBlockInfoList = this._loadedHeaderBlockInfos;
      blockMap = this._headerBlocks;
      dirtyMap = this._dirtyHeaderBlocks;
    }
    else {
      blockInfoList = this._bodyBlockInfos;
      loadedBlockInfoList = this._loadedBodyBlockInfos;
      blockMap = this._bodyBlocks;
      dirtyMap = this._dirtyBodyBlocks;
    }

    var infoTuple = this._findRangeObjIndexForDateAndID(blockInfoList,
                                                        date, id),
        iInfo = infoTuple[0], info = infoTuple[1];
    // Asking to discard something that does not exist in a block is a
    // violated assumption.  Log an error.
    if (!info) {
      this._LOG.badDiscardRequest(type, date, id);
      return;
    }

    var blockId = info.blockId;
    // Nothing to do if the block isn't present
    if (!blockMap.hasOwnProperty(blockId))
      return;

    // Violated assumption if the block is dirty
    if (dirtyMap.hasOwnProperty(blockId)) {
      this._LOG.badDiscardRequest(type, date, id);
      return;
    }

    // Discard the block
    delete blockMap[blockId];
    var idxLoaded = loadedBlockInfoList.indexOf(info);
    // Something is horribly wrong if this is -1.
    if (idxLoaded !== -1)
      loadedBlockInfoList.splice(idxLoaded, 1);
  },

  /**
   * Purge messages from disk storage for size and/or time reasons.  This is
   * only used for IMAP folders and we fast-path out if invoked on ActiveSync.
   *
   * This method is invoked as a result of new block allocation as a job /
   * operation run inside a mutex.  This means that we won't be run unless a
   * synchronization job triggers us and that we won't run until that
   * synchronization job completes.  This is important because it means that
   * if a user doesn't use the mail app for a long time it's not like a cron
   * process will purge our synchronized state for everything so that when they
   * next use the mail app all the information will be gone.  Likewise, if the
   * user is disconnected from the net, we won't purge their cached stuff that
   * they are still looking at.  The non-obvious impact on 'archive' folders
   * whose first messages are quite some ways in the past is that the accuracy
   * range for archive folders will have been updated with the current date for
   * at least whatever the UI needed, so we won't go completely purging archive
   * folders.
   *
   * Our strategy is to pick cut points based on a few heuristics and then go
   * with the deepest cut.  Cuts are time-based and always quantized to the
   * subsequent local (timezone compensated) midnight for the server in order to
   * line up with our sync boundaries.  The cut point defines an exclusive range
   * of [0, cutTS).
   *
   * The heuristics are:
   *
   * - Last (online) access: scan accuracy ranges from the oldest until we run
   *   into one that is less than `$sync.BLOCK_PURGE_ONLY_AFTER_UNSYNCED_MS`
   *   milliseconds old.  We clip this against the 'syncRange' interval for the
   *   account.
   *
   * - Hard block limits: If there are more than
   *   `$sync.BLOCK_PURGE_HARD_MAX_BLOCK_LIMIT` header or body blocks, then we
   *   issue a cut-point of the start date of the block at that index.  The date
   *   will then be quantized, which may effectively result in more blocks being
   *   discarded.
   *
   * Deletion is performed by asynchronously, iteratively:
   * - Making sure the oldest header block is loaded.
   * - Checking the oldest header in the block.  If it is more recent than our
   *   cut point, then we are done.
   *
   * What we *do not* do:
   * - We do not do anything about attachments saved to DeviceStorage.  We leave
   *   those around and it's on the user to clean those up from the gallery.
   * - We do not currently take the size of downloaded embedded images into
   *   account.
   *
   * @args[
   *   @param[callback @func[
   *     @args[
   *       @param[numDeleted Number]{
   *         The number of messages deleted.
   *       }
   *       @param[cutTS DateMS]
   *     ]
   *   ]]
   * ]
   */
  purgeExcessMessages: function(callback) {
    this._messagePurgeScheduled = false;
    var cutTS = Math.max(
      this._purge_findLastAccessCutPoint(),
      this._purge_findHardBlockCutPoint(this._headerBlockInfos),
      this._purge_findHardBlockCutPoint(this._bodyBlockInfos));

    if (cutTS === 0) {
      callback(0, cutTS);
      return;
    }

    // Quantize to the subsequent UTC midnight, then apply the timezone
    // adjustment that is what our IMAP database lookup does to account for
    // skew.  (See `ImapFolderConn.syncDateRange`)
    cutTS = quantizeDate(cutTS + DAY_MILLIS) - this._account.tzOffset;

    // Update the accuracy ranges by nuking accuracy ranges that are no longer
    // relevant and updating any overlapped range.
    var aranges = this._accuracyRanges;
    var splitInfo = this._findFirstObjIndexForDateRange(aranges, cutTS, cutTS);
    // we only need to update a range if there was in fact some overlap.
    if (splitInfo[1]) {
      splitInfo[1].startTS = cutTS;
      // then be sure not to splice ourselves...
      aranges.splice(splitInfo[0] + 1, aranges.length - splitInfo[0]);
    }
    else {
      // do splice things at/after
      aranges.splice(splitInfo[0], aranges.length - splitInfo[0]);
    }

    var headerBlockInfos = this._headerBlockInfos,
        headerBlocks = this._headerBlocks,
        deletionCount = 0,
        // These variables let us detect if the deletion happened fully
        // synchronously and thereby avoid blowing up the stack.
        callActive = false, deleteTriggered = false;
    var deleteNextHeader = function() {
      // if things are happening synchronously, bail out
      if (callActive) {
        deleteTriggered = true;
        return;
      }

      while (true) {
        // - bail if we ran out of blocks somehow
        if (!headerBlockInfos.length) {
          callback(deletionCount, cutTS);
          return;
        }
        // - load the last header block if not currently loaded
        var blockInfo = headerBlockInfos[headerBlockInfos.length - 1];
        if (!this._headerBlocks.hasOwnProperty(blockInfo.blockId)) {
          this._loadBlock('header', blockInfo, deleteNextHeader);
          return;
        }
        // - get the last header, check it
        var headerBlock = this._headerBlocks[blockInfo.blockId],
            lastHeader = headerBlock.headers[headerBlock.headers.length - 1];
        if (SINCE(lastHeader.date, cutTS)) {
          // all done! header is more recent than the cut date
          callback(deletionCount, cutTS);
          return;
        }
        deleteTriggered = false;
        callActive = true;
        deletionCount++;
        this.deleteMessageHeaderAndBodyUsingHeader(lastHeader,
                                                   deleteNextHeader);
        callActive = false;
        if (!deleteTriggered)
          return;
      }
    }.bind(this);
    deleteNextHeader();
  },

  _purge_findLastAccessCutPoint: function() {
    var aranges = this._accuracyRanges,
        cutoffDate = $date.NOW() - $sync.BLOCK_PURGE_ONLY_AFTER_UNSYNCED_MS;
    // When the loop terminates, this is the block we should use to cut, so
    // start with an invalid value.
    var iCutRange;
    for (iCutRange = aranges.length; iCutRange >= 1; iCutRange--) {
      var arange = aranges[iCutRange - 1];
      // We can destroy things that aren't fully synchronized.
      // NB: this case was intended for search-on-server which is not yet
      // implemented.
      if (!arange.fullSync)
        continue;
      if (arange.fullSync.updated > cutoffDate)
        break;
    }
    if (iCutRange === aranges.length)
      return 0;

    var cutTS = aranges[iCutRange].endTS,
        syncRangeMS = $sync.SYNC_RANGE_ENUMS_TO_MS[
                        this._account.accountDef.syncRange] ||
                      $sync.SYNC_RANGE_ENUMS_TO_MS['auto'],
        // Determine the sync horizon, but then subtract an extra day off so
        // that the quantization does not take a bite out of the sync range
        syncHorizonTS = $date.NOW() - syncRangeMS - DAY_MILLIS;

    // If the proposed cut is more recent than our sync horizon, use the sync
    // horizon.
    if (STRICTLY_AFTER(cutTS, syncHorizonTS))
      return syncHorizonTS;
    return cutTS;
  },

  _purge_findHardBlockCutPoint: function(blockInfoList) {
    if (blockInfoList.length <= $sync.BLOCK_PURGE_HARD_MAX_BLOCK_LIMIT)
      return 0;
    return blockInfoList[$sync.BLOCK_PURGE_HARD_MAX_BLOCK_LIMIT].startTS;
  },

  /**
   * Find the first object that contains date ranges whose date ranges contains
   * the provided date.  For use to find the right index in `_accuracyRanges`,
   * `_headerBlockInfos`, and `_bodyBlockInfos`, all of which are pre-sorted.
   *
   * @return[@list[
   *   @param[index Number]{
   *     The index of the Object that contains the date, or if there is no such
   *     structure, the index that it should be inserted at.
   *   }
   *   @param[inside Object]
   * ]]
   */
  _findRangeObjIndexForDate: function ifs__findRangeObjIndexForDate(
      list, date) {
    var i;
    // linear scan for now; binary search later
    for (i = 0; i < list.length; i++) {
      var info = list[i];
      // - Stop if we will never find a match if we keep going.
      // If our date is after the end of this range, then it will never fall
      // inside any subsequent ranges, because they are all chronologically
      // earlier than this range.
      if (SINCE(date, info.endTS))
        return [i, null];
      // therefore BEFORE(date, info.endTS)

      if (SINCE(date, info.startTS))
        return [i, info];
      // (Older than the startTS, keep going.)
    }

    return [i, null];
  },

  /**
   * Find the first object that contains date ranges whose date ranges contains
   * the provided composite date/UID.  For use to find the right index in
   * `_headerBlockInfos`, and `_bodyBlockInfos`, all of which are pre-sorted.
   *
   * @return[@list[
   *   @param[index Number]{
   *     The index of the Object that contains the date, or if there is no such
   *     structure, the index that it should be inserted at.
   *   }
   *   @param[inside Object]
   * ]]
   */
  _findRangeObjIndexForDateAndID: function ifs__findRangeObjIndexForDateAndID(
      list, date, uid) {
    var i;
    // linear scan for now; binary search later
    for (i = 0; i < list.length; i++) {
      var info = list[i];
      // - Stop if we will never find a match if we keep going.
      // If our date is after the end of this range, then it will never fall
      // inside any subsequent ranges, because they are all chronologically
      // earlier than this range.
      // If our date is the same and our UID is higher, then likewise we
      // shouldn't go further because IDs decrease too.
      if (STRICTLY_AFTER(date, info.endTS) ||
          (date === info.endTS && uid > info.endUID))
        return [i, null];
      // therefore BEFORE(date, info.endTS) ||
      //           (date === info.endTS && uid <= info.endUID)
      if (STRICTLY_AFTER(date, info.startTS) ||
          (date === info.startTS && uid >= info.startUID))
        return [i, info];
      // (Older than the startTS, keep going.)
    }

    return [i, null];
  },


  /**
   * Find the first object that contains date ranges that overlaps the provided
   * date range.  Scans from the present into the past.  If endTS is null, get
   * treat it as being a date infinitely far in the future.
   */
  _findFirstObjIndexForDateRange: function ifs__findFirstObjIndexForDateRange(
      list, startTS, endTS) {
    var i;
    // linear scan for now; binary search later
    for (i = 0; i < list.length; i++) {
      var info = list[i];
      // - Stop if we will never find a match if we keep going.
      // If our comparison range starts AFTER the end of this range, then it
      // does not overlap this range and will never overlap any subsequent
      // ranges because they are all chronologically earlier than this range.
      //
      // nb: We are saying that there is no overlap if one range starts where
      // the other one ends.  This is consistent with the inclusive/exclusive
      // definition of since/before and our ranges.
      if (STRICTLY_AFTER(startTS, info.endTS))
        return [i, null];
      // therefore ON_OR_BEFORE(startTS, info.endTS)

      // nb: SINCE(endTS, info.startTS) is not right here because the equals
      // case does not result in overlap because endTS is exclusive.
      if (endTS === null || STRICTLY_AFTER(endTS, info.startTS))
        return [i, info];
      // (no overlap yet)
    }

    return [i, null];
  },

  /**
   * Find the last object that contains date ranges that overlaps the provided
   * date range.  Scans from the past into the present.
   */
  _findLastObjIndexForDateRange: function ifs__findLastObjIndexForDateRange(
      list, startTS, endTS) {
    var i;
    // linear scan for now; binary search later
    for (i = list.length - 1; i >= 0; i--) {
      var info = list[i];
      // - Stop if we will never find a match if we keep going.
      // If our comparison range ends ON OR BEFORE the end of this range, then
      // it does not overlap this range and will never overlap any subsequent
      // ranges because they are all chronologically later than this range.
      //
      // nb: We are saying that there is no overlap if one range starts where
      // the other one ends.  This is consistent with the inclusive/exclusive
      // definition of since/before and our ranges.
      if (ON_OR_BEFORE(endTS, info.startTS))
        return [i + 1, null];
      // therefore STRICTLY_AFTER(endTS, info.startTS)

      // we match in this entry if the start stamp is before the range's end
      if (BEFORE(startTS, info.endTS))
        return [i, info];

      // (no overlap yet)
    }

    return [0, null];
  },


  /**
   * Find the first object in the list whose `date` falls inside the given
   * IMAP style date range.  If `endTS` is null, find the first object whose
   * `date` is at least `startTS`.
   */
  _findFirstObjForDateRange: function ifs__findFirstObjForDateRange(
      list, startTS, endTS) {
    var i;
    var dateComparator = endTS === null ? SINCE : IN_BS_DATE_RANGE;
    for (i = 0; i < list.length; i++) {
      var date = list[i].date;
      if (dateComparator(date, startTS, endTS))
        return [i, list[i]];
    }
    return [i, null];
  },

  /**
   * Find the right block to insert a header/body into using its date and UID.
   * This is an asynchronous operation because we potentially need to load
   * blocks from disk.
   *
   * == Usage patterns
   *
   * - In initial-sync cases and scrolling down through the list, we will
   *   generate messages from a younger-to-older direction.  The insertion point
   *   will then likely occur after the last block.
   * - In update-sync cases, we should be primarily dealing with new mail which
   *   is still retrieved endTS to startTS.  The insertion point will start
   *   before the first block and then move backwards within that block.
   * - Update-sync cases may also encounter messages moved into the folder
   *   from other folders since the last sync.  An archive folder is the
   *   most likely case for this, and we would expect random additions with a
   *   high degree of clustering on message date.
   * - Update-sync cases may experience a lot of apparent message deletion due
   *   to actual deletion or moves to other folders.  These can shrink blocks
   *   and we need to consider block merges to avoid pathological behavior.
   * - Forgetting messages that are no longer being kept alive by sync settings
   *   or apparent user interest.  There's no benefit to churn for the sake of
   *   churn, so we can just forget messages in blocks wholesale when we
   *   experience disk space pressure (from ourselves or elsewhere).  In that
   *   case we will want to traverse from the startTS messages, dropping them and
   *   consolidating blocks as we go until we have freed up enough space.
   *
   * == General strategy
   *
   * - If we fall in an existing block and it won't overflow, use it.
   * - If we fall in an existing block and it would overflow, split it.
   * - If we fall outside existing blocks, check older and newer blocks in that
   *   order for a non-overflow fit.  If we would overflow, pick the existing
   *   block further from the center to perform a split.
   * - If there are no existing blocks at all, create a new one.
   * - When splitting, if we are the first or last block, split 2/3 towards the
   *   center and 1/3 towards the edge.  The idea is that growth is most likely
   *   to occur near the edges, so concentrate the empty space there without
   *   leaving the center blocks so overloaded they can't accept random
   *   additions without further splits.
   * - When splitting, otherwise, split equally-ish.
   *
   * == Block I/O
   *
   * While we can make decisions about where to insert things, we need to have
   * blocks in memory in order to perform the actual splits.  The outcome
   * of splits can't be predicted because the size of things in blocks is
   * only known when the block is loaded.
   *
   * @args[
   *   @param[type @oneof['header' 'body']]
   *   @param[date DateMS]
   *   @param[estSizeCost Number]{
   *     The rough byte cost of whatever we want to stick in a block.
   *   }
   *   @param[thing Object]
   *   @param[blockPickedCallback @func[
   *     @args[
   *       @param[blockInfo FolderBlockInfo]
   *       @param[block @oneof[HeaderBlock BodyBlock]]
   *     ]
   *   ]]{
   *     Callback function to invoke once we have found/created/made-room-for
   *     the thing in the block.  This needs to be a callback because if we need
   *     to perform any splits, we require that the block be loaded into memory
   *     first.  (For consistency and simplicity, we then made us always return
   *     the block.)
   *   }
   * ]
   */
  _insertIntoBlockUsingDateAndUID: function ifs__pickInsertionBlocks(
      type, date, uid, srvid, estSizeCost, thing, blockPickedCallback) {
    var blockInfoList, loadedBlockInfoList, blockMap, makeBlock, insertInBlock,
        splitBlock, serverIdBlockMapping;
    if (type === 'header') {
      blockInfoList = this._headerBlockInfos;
      loadedBlockInfoList = this._loadedHeaderBlockInfos;
      blockMap = this._headerBlocks;
      serverIdBlockMapping = this._serverIdHeaderBlockMapping;
      makeBlock = this._bound_makeHeaderBlock;
      insertInBlock = this._bound_insertHeaderInBlock;
      splitBlock = this._bound_splitHeaderBlock;
    }
    else {
      blockInfoList = this._bodyBlockInfos;
      loadedBlockInfoList = this._loadedBodyBlockInfos;
      blockMap = this._bodyBlocks;
      serverIdBlockMapping = null; // only headers have the mapping
      makeBlock = this._bound_makeBodyBlock;
      insertInBlock = this._bound_insertBodyInBlock;
      splitBlock = this._bound_splitBodyBlock;
    }

    // -- find the current containing block / insertion point
    var infoTuple = this._findRangeObjIndexForDateAndID(blockInfoList,
                                                        date, uid),
        iInfo = infoTuple[0], info = infoTuple[1];

    // -- not in a block, find or create one
    if (!info) {
      // - Create a block if no blocks exist at all.
      if (blockInfoList.length === 0) {
        info = makeBlock(date, uid, date, uid);
        blockInfoList.splice(iInfo, 0, info);
        loadedBlockInfoList.push(info);
      }
      // - Is there a trailing/older dude and we fit?
      else if (iInfo < blockInfoList.length &&
               (blockInfoList[iInfo].estSize + estSizeCost <
                 $sync.MAX_BLOCK_SIZE)) {
        info = blockInfoList[iInfo];

        // We are chronologically/UID-ically more recent, so check the end range
        // for expansion needs.
        if (STRICTLY_AFTER(date, info.endTS)) {
          info.endTS = date;
          info.endUID = uid;
        }
        else if (date === info.endTS &&
                 uid > info.endUID) {
          info.endUID = uid;
        }
      }
      // - Is there a preceding/younger dude and we fit?
      else if (iInfo > 0 &&
               (blockInfoList[iInfo - 1].estSize + estSizeCost <
                  $sync.MAX_BLOCK_SIZE)) {
        info = blockInfoList[--iInfo];

        // We are chronologically less recent, so check the start range for
        // expansion needs.
        if (BEFORE(date, info.startTS)) {
          info.startTS = date;
          info.startUID = uid;
        }
        else if (date === info.startTS &&
                 uid < info.startUID) {
          info.startUID = uid;
        }
      }
      // Any adjacent blocks at this point are overflowing, so it's now a
      // question of who to split.  We pick the one further from the center that
      // exists.
      // - Preceding (if possible and) suitable OR the only choice
      else if ((iInfo > 0 && iInfo < blockInfoList.length / 2) ||
               (iInfo === blockInfoList.length)) {
        info = blockInfoList[--iInfo];
        // We are chronologically less recent, so check the start range for
        // expansion needs.
        if (BEFORE(date, info.startTS)) {
          info.startTS = date;
          info.startUID = uid;
        }
        else if (date === info.startTS &&
                 uid < info.startUID) {
          info.startUID = uid;
        }
      }
      // - It must be the trailing dude
      else {
        info = blockInfoList[iInfo];
        // We are chronologically/UID-ically more recent, so check the end range
        // for expansion needs.
        if (STRICTLY_AFTER(date, info.endTS)) {
          info.endTS = date;
          info.endUID = uid;
        }
        else if (date === info.endTS &&
                 uid > info.endUID) {
          info.endUID = uid;
        }
      }
    }
    // (info now definitely exists and is definitely in blockInfoList)

    function processBlock(block) { // 'this' gets explicitly bound
      // -- perform the insertion
      // We could do this after the split, but this makes things simpler if
      // we want to factor in the newly inserted thing's size in the
      // distribution of bytes.
      info.estSize += estSizeCost;
      info.count++;
      insertInBlock(thing, uid, info, block);

      // -- split if necessary
      if (info.count > 1 && info.estSize >= $sync.MAX_BLOCK_SIZE) {
        // - figure the desired resulting sizes
        var firstBlockTarget;
        // big part to the center at the edges (favoring front edge)
        if (iInfo === 0)
          firstBlockTarget = $sync.BLOCK_SPLIT_SMALL_PART;
        else if (iInfo === blockInfoList.length - 1)
          firstBlockTarget = $sync.BLOCK_SPLIT_LARGE_PART;
        // otherwise equal split
        else
          firstBlockTarget = $sync.BLOCK_SPLIT_EQUAL_PART;


        // - split
        var olderInfo;
        olderInfo = splitBlock(info, block, firstBlockTarget);
        blockInfoList.splice(iInfo + 1, 0, olderInfo);
        loadedBlockInfoList.push(olderInfo);

        // - figure which of the blocks our insertion went in
        if (BEFORE(date, olderInfo.endTS) ||
            ((date === olderInfo.endTS) && (uid <= olderInfo.endUID))) {
          iInfo++;
          info = olderInfo;
          block = blockMap[info.blockId];
        }
      }
      // otherwise, no split necessary, just use it
      if (serverIdBlockMapping && srvid)
        serverIdBlockMapping[srvid] = info.blockId;

      if (blockPickedCallback) {
        blockPickedCallback(info, block);
      }
    }

    if (blockMap.hasOwnProperty(info.blockId))
      processBlock.call(this, blockMap[info.blockId]);
    else
      this._loadBlock(type, info, processBlock.bind(this));
  },

  runAfterDeferredCalls: function(callback) {
    if (this._deferredCalls.length)
      this._deferredCalls.push(callback);
    else
      callback();
  },

  /**
   * Run deferred calls until we run out of deferred calls or _pendingLoads goes
   * non-zero again.
   */
  _runDeferredCalls: function ifs__runDeferredCalls() {
    while (this._deferredCalls.length && this._pendingLoads.length === 0) {
      var toCall = this._deferredCalls.shift();
      try {
        toCall();
      }
      catch (ex) {
        this._LOG.callbackErr(ex);
      }
    }
  },

  _findBlockInfoFromBlockId: function(type, blockId) {
    var blockInfoList;
    if (type === 'header')
      blockInfoList = this._headerBlockInfos;
    else
      blockInfoList = this._bodyBlockInfos;

    for (var i = 0; i < blockInfoList.length; i++) {
      var blockInfo = blockInfoList[i];
      if (blockInfo.blockId === blockId)
        return blockInfo;
    }
    return null;
  },

  /**
   * Request the load of the given block and the invocation of the callback with
   * the block when the load completes.
   */
  _loadBlock: function ifs__loadBlock(type, blockInfo, callback) {
    var blockId = blockInfo.blockId;
    var aggrId = type + blockId;
    if (this._pendingLoads.indexOf(aggrId) !== -1) {
      this._pendingLoadListeners[aggrId].push(callback);
      return;
    }

    var index = this._pendingLoads.length;
    this._pendingLoads.push(aggrId);
    this._pendingLoadListeners[aggrId] = [callback];

    var self = this;
    function onLoaded(block) {
      if (!block)
        self._LOG.badBlockLoad(type, blockId);
      self._LOG.loadBlock_end(type, blockId, block);
      if (type === 'header') {
        self._headerBlocks[blockId] = block;
        self._loadedHeaderBlockInfos.push(blockInfo);
      }
      else {
        self._bodyBlocks[blockId] = block;
        self._loadedBodyBlockInfos.push(blockInfo);
      }
      self._pendingLoads.splice(self._pendingLoads.indexOf(aggrId), 1);
      var listeners = self._pendingLoadListeners[aggrId];
      delete self._pendingLoadListeners[aggrId];
      for (var i = 0; i < listeners.length; i++) {
        try {
          listeners[i](block);
        }
        catch (ex) {
          self._LOG.callbackErr(ex);
        }
      }

      if (self._pendingLoads.length === 0)
        self._runDeferredCalls();
    }

    this._LOG.loadBlock_begin(type, blockId);
    if (type === 'header')
      this._imapDb.loadHeaderBlock(this.folderId, blockId, onLoaded);
    else
      this._imapDb.loadBodyBlock(this.folderId, blockId, onLoaded);
  },

  _deleteFromBlock: function ifs__deleteFromBlock(type, date, id, callback) {
    var blockInfoList, loadedBlockInfoList, blockMap, deleteFromBlock;
    this._LOG.deleteFromBlock(type, date, id);
    if (type === 'header') {
      blockInfoList = this._headerBlockInfos;
      loadedBlockInfoList = this._loadedHeaderBlockInfos;
      blockMap = this._headerBlocks;
      deleteFromBlock = this._bound_deleteHeaderFromBlock;
    }
    else {
      blockInfoList = this._bodyBlockInfos;
      loadedBlockInfoList = this._loadedBodyBlockInfos;
      blockMap = this._bodyBlocks;
      deleteFromBlock = this._bound_deleteBodyFromBlock;
    }

    var infoTuple = this._findRangeObjIndexForDateAndID(blockInfoList,
                                                        date, id),
        iInfo = infoTuple[0], info = infoTuple[1];
    // If someone is asking for us to delete something, there should definitely
    // be a block that includes it!
    if (!info) {
      this._LOG.badDeletionRequest(type, date, id);
      return;
    }

    function processBlock(block) {
      // The delete function is in charge of updating the start/end TS/ID info
      // because it knows about the internal block structure to do so.
      deleteFromBlock(id, info, block);

      // - Nuke the block if it's empty
      if (info.count === 0) {
        blockInfoList.splice(iInfo, 1);
        delete blockMap[info.blockId];
        loadedBlockInfoList.splice(loadedBlockInfoList.indexOf(info), 1);

        this._dirty = true;
        if (type === 'header')
          this._dirtyHeaderBlocks[info.blockId] = null;
        else
          this._dirtyBodyBlocks[info.blockId] = null;
      }
      if (callback)
        callback();
    }
    if (blockMap.hasOwnProperty(info.blockId))
      processBlock.call(this, blockMap[info.blockId]);
    else
      this._loadBlock(type, info, processBlock.bind(this));
  },

  /**
   * Track a new slice that wants to start from the most recent messages we know
   * about in the folder.
   *
   * If we have previously synchronized the folder, we will return the known
   * messages from the database.  If we are also online, we will trigger a
   * refresh covering the time range of the messages.
   *
   * If we have not previously synchronized the folder, we will initiate
   * synchronization starting from 'now'.
   *
   * For IMAP, an important ramification is that merely opening a slice may not
   * cause us to synchronize all the way up to 'now'.  The slice's consumer will
   * need to keep checking 'atTop' and 'userCanGrowUpwards' and trigger
   * synchronizations until they both go false.  For consumers that really only
   * want us to synchronize the most recent messages, they should either
   * consider purging our storage first or creating a new API that deals with
   * the change in invariants so that gaps in synchronized intervals can exist.
   *
   * Note: previously, we had a function called "sliceOpenFromNow" that would
   * provide guarantees that the slice was accurate and grown from 'now'
   * backwards, but at the very high cost of potentially requiring the user to
   * wait until some amount of synchronization was required.  This resulted in
   * bad UX from a latency perspective and also actually increased
   * synchronization complexity because we had to implement multiple sync
   * heuristics.  Our new approach is much better from a latency perspective but
   * may result in UI complications since we can be so far behind 'now'.
   *
   * @args[
   *   @param[forceRefresh #:optional Boolean]{
   *     Should we ensure that we try and perform a refresh if we are online?
   *     Without this flag, we may decide not to attempt to trigger a refresh
   *     if our data is sufficiently recent.
   *   }
   * ]
   */
  sliceOpenMostRecent: function fs_sliceOpenMostRecent(slice, forceRefresh) {
    // Set the status immediately so that the UI will convey that the request is
    // being processed, even though it might take a little bit to acquire the
    // mutex.
    slice.setStatus('synchronizing', false, true, false,
                    SYNC_START_MINIMUM_PROGRESS);
    this.runMutexed(
      'sync',
      this._sliceOpenMostRecent.bind(this, slice, forceRefresh));
  },
  _sliceOpenMostRecent: function fs__sliceOpenMostRecent(slice, forceRefresh,
                                                         releaseMutex) {
    // We only put the slice in the list of slices now that we have the mutex
    // in order to avoid having the slice have data fed into it if there were
    // other synchronizations already in progress.
    this._slices.push(slice);
    var doneCallback = function doneSyncCallback(err, reportSyncStatusAs,
                                                 moreExpected) {
      if (!reportSyncStatusAs) {
        if (err)
          reportSyncStatusAs = 'syncfailed';
        else
          reportSyncStatusAs = 'synced';
      }
      if (moreExpected === undefined)
        moreExpected = false;

      slice.waitingOnData = false;
      slice.setStatus(reportSyncStatusAs, true, moreExpected, true);
      this._curSyncSlice = null;

      releaseMutex();
    }.bind(this);

    // -- grab from database if we have ever synchronized this folder
    // OR if it's synthetic
    if (this._accuracyRanges.length || this.folderMeta.type === 'localdrafts') {
      // We can only trigger a refresh if we are online.  Our caller may want to
      // force the refresh, ignoring recency data.  (This logic was too ugly as
      // a straight-up boolean/ternarny combo.)
      var triggerRefresh;
      if (this._account.universe.online && this.folderSyncer.syncable &&
          this.folderMeta.type !== 'localdrafts'
         ) {
        if (forceRefresh)
          triggerRefresh = 'force';
        else
          triggerRefresh = true;
      }
      else {
        triggerRefresh = false;
      }

      slice.waitingOnData = 'db';
      this.getMessagesInImapDateRange(
        0, null, $sync.INITIAL_FILL_SIZE, $sync.INITIAL_FILL_SIZE,
        // trigger a refresh if we are online
        this.onFetchDBHeaders.bind(
          this, slice, triggerRefresh,
          doneCallback, releaseMutex)
      );
      return;
    }
    // (we have never synchronized this folder)

    // -- no work to do if we are offline or synthetic folder
    if (!this._account.universe.online || this.folderMeta.type === 'localdrafts') {
      doneCallback();
      return;
    }
    // If the folder can't be synchronized right now, just report the sync as
    // blocked. We'll update it soon enough.
    if (!this.folderSyncer.syncable) {
      console.log('Synchronization is currently blocked; waiting...');
      doneCallback(null, 'syncblocked', true);
      return;
    }

    // -- Bad existing data, issue a sync
    var progressCallback = slice.setSyncProgress.bind(slice);
    var syncCallback = function syncCallback(syncMode,
                                             ignoreHeaders) {
      slice.waitingOnData = syncMode;
      if (ignoreHeaders) {
        slice.ignoreHeaders = true;
      }
      this._curSyncSlice = slice;
    }.bind(this);

    // The slice flags are not yet valid; we are primarily interested in having
    // atTop be true when splice notifications for generated as headers are
    // added.
    slice._updateSliceFlags();
    this.folderSyncer.initialSync(
      slice, $sync.INITIAL_SYNC_DAYS,
      syncCallback, doneCallback, progressCallback);
  },

  /**
   * The slice wants more headers.  Grab from the database and/or sync as
   * appropriate to get more headers.  If there is a cost, require an explicit
   * request to perform the sync.
   *
   * We can think of there existing ~2 classes of headers that we might return
   * and our returned headers will always consist of only 1 of these classes at
   * a time.
   *
   * 1a) Headers from the database that are known to be up-to-date because they
   * were recently synchronized or refreshed.
   *
   * 1b) Headers from the database that need to be refreshed because our
   * information is old enough that we might be out of sync with the server.
   * For ActiveSync, no messages will ever be in this state.  For IMAP, this
   * is determined by checking the accuracy ranges and the REFRESH_THRESH_MS
   * constant.  Logic related to this lives in `ImapFolderSyncer`.
   *
   * 2) Headers that we need to synchronize with a growSync.  This only exists
   * for IMAP.
   *
   *
   * The steps we actually perform:
   *
   * - Try and get messages from the database.  If the database knows about
   * any, we will add them to the slice.
   *
   * - If there were any messages and `FolderSyncer.canGrowSync` is true, check
   * the time-span covered by the messages from the database.  If any of the
   * time-span is not sufficiently recently refreshed, issue a refresh over the
   * required time interval to bring those messages up-to-date.
   *
   * - Return if there were any headers.
   *
   * - Issue a grow request.  Start with the day adjacent to the furthest known
   *   message in the direction of growth.  We could alternately try and use
   *   the accuracy range to start even further away.  However, our growth
   *   process likes to keep going until it hits a message, and that's when
   *   it would commit its sync process, so the accuracy range is unlikely
   *   to buy us anything additional at the current time.
   */
  growSlice: function ifs_growSlice(slice, dirMagnitude, userRequestsGrowth) {
    // If the user requested synchronization, provide UI feedback immediately,
    // otherwise, let the method set this state if/when we actually decide to
    // talk to the server.
    if (userRequestsGrowth)
      slice.setStatus('synchronizing', false, true, false,
                      SYNC_START_MINIMUM_PROGRESS);
    this.runMutexed(
      'grow',
      this._growSlice.bind(this, slice, dirMagnitude, userRequestsGrowth));
  },
  _growSlice: function ifs__growSlice(slice, dirMagnitude, userRequestsGrowth,
                                      releaseMutex) {
    var dir, desiredCount;

    var batchHeaders = [];
    // --- process messages
    var gotMessages = function gotMessages(headers, moreExpected) {
      if (headers.length === 0) {
        // no array manipulation required
      }
      if (dir === PASTWARDS) {
        batchHeaders = batchHeaders.concat(headers);
      }
      else { // dir === FUTUREWARDS
        batchHeaders = headers.concat(batchHeaders);
      }

      if (moreExpected)
        return;

      // -- callbacks which may or may not get used
      var doneCallback = function doneGrowCallback(err) {
        // In a refresh, we may have asked for more than we know about in case
        // of a refresh at the edge where the database didn't have all the
        // headers we wanted, so latch it now.
        slice.desiredHeaders = slice.headers.length;
        slice.waitingOnData = false;
        slice.setStatus(err ? 'syncfailed' : 'synced', true, false, true);
        this._curSyncSlice = null;

        releaseMutex();
      }.bind(this);

      var progressCallback = slice.setSyncProgress.bind(slice);

      // -- Handle already-known headers
      if (batchHeaders.length) {
        var refreshInterval;

        // - compute refresh interval, if needed
            // offline? don't need a refresh!
        if (!this._account.universe.online ||
            // disabled account? don't need a refresh!
            !this._account.enabled ||
            // can't incrementally refresh? don't need a refresh!
            !this.folderSyncer.canGrowSync) {
          refreshInterval = null;
        }
        else {
          // - Figure out refresh range.
          // We want to make sure that our refresh covers any gaps between the
          // last message in our slice and the first message that we retrieved.

          // NB: endTS is exclusive, so we need to pad it out by a day relative
          // to a known message if we want to make sure it gets covered by the
          // sync range.

          // NB: We quantize to whole dates, but compensate for server timezones
          // so that our refresh actually lines up with the messages we are
          // interested in.  (We want the date in the server's timezone, so we
          // add the timezone to be relative to that timezone.)  We do adjust
          // startTS for the timezone offset in here rather than in the
          // quantization blow below because we do not timezone adjust the oldest
          // full sync date because it's already in the right 'units'.

          var highestLegalEndTS;
          // If we hit the highestLegalEndTS, flag that we should mark endTS as
          // open-ended if we decide we do need to refresh.
          var openEndTS = false;

          var startTS, endTS;
          if (dir === PASTWARDS) {
            var oldestHeader = batchHeaders[batchHeaders.length - 1];
            // If we were always going to sync the entire day, we could
            // subtract an entire day off of slice.startTS, but we are planning
            // to start grabbing less than whole days, so we want to leave it
            // up to checkAccuracyCoverageNeedingRefresh to get rid of any
            // redundant coverage of what we are currently looking at.
            //
            // We do want to cap the date so that we don't re-refresh today and
            // any other intervening days spuriously.  When we sync we only use
            // an endTS of tz-adjusted NOW(), so our rounding up can be too
            // aggressive otherwise and prevent range shrinking.  We call
            // quantizeDateUp afterwards so that if any part of the day is still
            // covered we will have our refresh cover it.
            //
            // NB: We use OPEN_REFRESH_THRESH_MS here because since we are
            // growing past-wards, we don't really care about refreshing things
            // in our future.  This is not the case for FUTUREWARDS.
            highestLegalEndTS = NOW() - $sync.OPEN_REFRESH_THRESH_MS +
                                  this._account.tzOffset;
            endTS = slice.startTS + $date.DAY_MILLIS + this._account.tzOffset;

            if (this.headerIsOldestKnown(oldestHeader.date, oldestHeader.id))
              startTS = this.getOldestFullSyncDate();
            else
              startTS = oldestHeader.date + this._account.tzOffset;
          }
          else { // dir === FUTUREWARDS
            // Unlike PASTWARDS, we do want to be more aggressively up-to-date
            // about the future, so only subtract off the grow range coverage.
            // (If we didn't subtract anything off, quick scrolling back and
            // forth could cause us to refresh more frequently than
            // GROW_REFRESH_THRESH_MS, which is not what we want.)
            highestLegalEndTS = NOW() - $sync.GROW_REFRESH_THRESH_MS +
                                  this._account.tzOffset;

            var youngestHeader = batchHeaders[0];
            // see the PASTWARDS case for why we don't add a day to this
            startTS = slice.endTS + this._account.tzOffset;
            endTS = youngestHeader.date + $date.DAY_MILLIS +
                      this._account.tzOffset;
          }
          // We do not want this clamped/saturated case quantized, but we do
          // want all the (other) future-dated endTS cases quantized.
          if (STRICTLY_AFTER(endTS, highestLegalEndTS)) {
            endTS = highestLegalEndTS;
            openEndTS = true;
          }
          else {
            endTS = quantizeDate(endTS);
          }

          // Now, it's not super-likely, but it is possible that because of
          // clock skew or what not that our startTS could end up after our
          // endTS, which we do not want.  Now, we could just clamp this,
          // but since we know the result would be a zero-coverage range,
          // we can just set the refreshInterval to null and be done.
          if (SINCE(startTS, endTS))
            refreshInterval = null;
          else
            refreshInterval = this.checkAccuracyCoverageNeedingRefresh(
              quantizeDate(startTS),
              endTS, // quantized above except when it would go into the future.
              $sync.GROW_REFRESH_THRESH_MS);
        }

        // We could also send the headers in as they come across the wire,
        // but we expect to be dealing in bite-sized requests, so that could
        // be overkill.
        slice.batchAppendHeaders(
          batchHeaders, dir === PASTWARDS ? -1 : 0,
          // !!refreshInterval is more efficient, but this way we can reuse
          // doneCallback() below in the else case simply.
          true);
        // If the database had fewer headers than are requested, it's possible
        // the refresh may give us extras, so allow those to be reported.
        slice.desiredHeaders = Math.max(slice.headers.length, desiredCount);

        if (refreshInterval &&
            // If the values are the same, by definition we have nothing to do,
            // but more importantly, the rounding might not improve the
            // situation, which could result in pathological sync failure on
            // gmail where it returns all the messages it knows about.
            refreshInterval.startTS !== refreshInterval.endTS) {

          // If growth was not requested, make sure we convey server traffic is
          // happening.
          if (!userRequestsGrowth)
            slice.setStatus('synchronizing', false, true, false,
                            SYNC_START_MINIMUM_PROGRESS);

          this.folderSyncer.refreshSync(
            slice, dir,
            quantizeDate(refreshInterval.startTS),
            // If we didn't shrink the endTS and we flagged to be open-ended, then
            // use null.  But if we did shrink the range, then there's no need to
            // go open-ended.
            (openEndTS && refreshInterval.endTS === highestLegalEndTS) ? null
              : quantizeDateUp(refreshInterval.endTS),
            /* origStartTS */ null,
            doneCallback, progressCallback);
        }
        else {
          doneCallback();
        }

        return;
      }

      // -- grow!
      // - do not grow if offline / no support / no user request
      if (!this._account.universe.online ||
          !this.folderSyncer.canGrowSync ||
          !userRequestsGrowth) {
        if (this.folderSyncer.syncable)
          slice.sendEmptyCompletion();
        releaseMutex();
        return;
      }

      if (!userRequestsGrowth)
        slice.setStatus('synchronizing', false, true, false,
                        SYNC_START_MINIMUM_PROGRESS);
      this._curSyncSlice = slice;
      slice.waitingOnData = 'grow';
      // We only add the desired count now that we are sure we are growing; if
      // we did it earlier we might boost the desiredHeaders count and then
      // not sync, resulting in the next time we do grow fetching more than we
      // want.
      slice.desiredHeaders += desiredCount;

      // TODO: when we support partial day sync, these growth steps will need
      // to be adjusted by 1-day if day covering the edge message has not been
      // fully synchronized.
      this.folderSyncer.growSync(
        slice, dir,
        dir === PASTWARDS ? quantizeDate(slice.startTS)
                          : quantizeDate(slice.endTS + $date.DAY_MILLIS),
        $sync.INITIAL_SYNC_GROWTH_DAYS,
        doneCallback, progressCallback);
    }.bind(this);

    // --- request messages
    if (dirMagnitude < 0) {
      dir = FUTUREWARDS;
      desiredCount = -dirMagnitude;

      this.getMessagesAfterMessage(
        slice.endTS, slice.endUID, desiredCount, gotMessages);
    }
    else {
      dir = PASTWARDS;
      desiredCount = dirMagnitude;

      this.getMessagesBeforeMessage(
        slice.startTS, slice.startUID, desiredCount, gotMessages);
    }
  },

  /**
   * A notification from a slice that it is has reduced the span of time that it
   * covers.  We use this to run a cache eviction if there is not currently a
   * mutex held.
   */
  sliceShrunk: function fs_sliceShrunk(slice) {
    if (this._mutexQueue.length === 0)
      this.flushExcessCachedBlocks('shrunk');
  },

  /**
   * Refresh our understanding of the time range covered by the messages
   * contained in the slice, plus expansion to the bounds of our known sync
   * date boundaries if the messages are the first/last known message.
   *
   * In other words, if the most recently known message is from a week ago and
   * that is the most recent message the slice is displaying, then we will
   * expand our sync range to go all the way through today.  Likewise, if the
   * oldest known message is from two weeks ago and is in the slice, but we
   * scanned for messages all the way back to 1990 then we will query all the
   * way back to 1990.  And if we have no messages in the slice, then we use the
   * full date bounds.
   */
  refreshSlice: function fs_refreshSlice(slice) {
    // Set the status immediately so that the UI will convey that the request is
    // being processed, even though it might take a little bit to acquire the
    // mutex.
    slice.setStatus('synchronizing', false, true, false, 0.0);
    this.runMutexed(
      'refresh',
      this._refreshSlice.bind(this, slice, false));
  },
  _refreshSlice: function fs__refreshSlice(slice, checkOpenRecency,
                                           releaseMutex) {
    slice.waitingOnData = 'refresh';

    var startTS = slice.startTS, endTS = slice.endTS,
        // In the event we grow the startTS to the dawn of time, then we want
        // to also provide the original startTS so that the bisection does not
        // need to scan through years of empty space.
        origStartTS = null,
        // If we are refreshing through 'now', we will count the new messages we
        // hear about and update this.newEmailCount once the sync completes.  If
        // we are performing any othe sync, the value will not be updated.
        newEmailCount = null;

    // - Grow endTS
    // If the endTS lines up with the most recent known message for the folder,
    // then remove the timestamp constraint so it goes all the way to now.
    // OR if we just have no known messages
    if (this.headerIsYoungestKnown(endTS, slice.endUID)) {
      var prevTS = endTS;
      newEmailCount = 0;

      /**
       * Increment our new email count if the following conditions are met:
       * 1. This header is younger than the youngest one before sync
       * 2. and this hasn't already been seen.
       * @param {HeaderInfo} header The header being added.
       */
      slice._onAddingHeader = function(header, currentSlice) {
        if (SINCE(header.date, prevTS) &&
            (!header.flags || header.flags.indexOf('\\Seen') === -1)) {
          newEmailCount += 1;
          if (slice.onNewHeader)
            slice.onNewHeader(header);
        }
      }.bind(this);

      endTS = null;
    }
    else {
      // We want the range to include the day; since it's an exclusive range
      // quantized to midnight, we need to adjust forward a day and then
      // quantize.  We also need to compensate for the timezone; we want this
      // time in terms of server time, so we add the timezone offset.
      endTS = quantizeDate(endTS + DAY_MILLIS + this._account.tzOffset);
    }

    // - Grow startTS
    // Grow the start-stamp to include the oldest continuous accuracy range
    // coverage date.  Keep original date around for bisect per above.
    if (this.headerIsOldestKnown(startTS, slice.startUID)) {
      origStartTS = quantizeDate(startTS + this._account.tzOffset);
      startTS = this.getOldestFullSyncDate();
    }
    // If we didn't grow based on the accuracy range, then apply the time-zone
    // adjustment so that our day coverage covers the actual INTERNALDATE day
    // of the start message.
    else {
      startTS += this._account.tzOffset;
    }

    // quantize the start date
    if (startTS)
      startTS = quantizeDate(startTS);

    var doneCallback = function refreshDoneCallback(err, bisectInfo,
                                                    numMessages) {
      slice._onAddingHeader = null;

      var reportSyncStatusAs = 'synced';
      switch (err) {
        case 'aborted':
        case 'unknown':
          reportSyncStatusAs = 'syncfailed';
          break;
      }

      releaseMutex();
      slice.waitingOnData = false;
      slice.setStatus(reportSyncStatusAs, true, false, false, null,
                      newEmailCount);
      return undefined;
    }.bind(this);


    // In the initial open case, we support a constant that allows us to
    // fast-path out without bothering the server.
    if (checkOpenRecency) {
      // We use now less the refresh threshold as the accuracy range end-post;
      // since markSyncRange uses NOW() when 'null' is provided (which it will
      // be for a sync through now), this all works out consistently.
      if (this.checkAccuracyCoverageNeedingRefresh(
             startTS,
             endTS ||
               NOW() - $sync.OPEN_REFRESH_THRESH_MS + this._account.tzOffset,
             $sync.OPEN_REFRESH_THRESH_MS) === null) {
        doneCallback();
        return;
      }
    }

    // The choice of PASTWARDS/FUTUREWARDS impacts the direction our chunks
    // happen if we have to bisect (if that happens) and (eventually) the
    // direction new bodies are fetched.
    //
    // There are arguments for both choices:
    //
    // Initial slice open refresh:
    // - PASTWARDS: Show the user the newest messages, but at the cost of a
    //   gap between the known messages and these new messages we are
    //   synchronizing in.  The gap is potentially confusing and ordering could
    //   also be confusing to the user.
    // - FUTUREWARDS: Avoid that gap, having the scrolling make sense.
    //   There is a pathological case here where we are ridiculously out-of-date
    //   and it would take the user a loooong time to sync all the way back up
    //   to now and it would be better to just restart with an initial deepening
    //   sync and/or throw things away.  Arguably, these are cases that should
    //   be explicitly handled outside of us.
    //
    // Manual refresh:
    // - PASTWARDS: Newest first.
    // - FUTUREWARDS: Have the messages show up in the order they were received.
    //
    // We currently choose FUTUREWARDS to avoid the gap and have messages show
    // up chronologically.
    this.folderSyncer.refreshSync(
      slice, FUTUREWARDS, startTS, endTS, origStartTS,
      doneCallback, slice.setSyncProgress.bind(slice));
  },

  _resetAndResyncSlice: function(slice, forceRefresh, releaseMutex) {
    this._slices.splice(this._slices.indexOf(slice), 1);
    if (releaseMutex)
      this._sliceOpenMostRecent(slice, forceRefresh, releaseMutex);
    else
      this.sliceOpenMostRecent(slice, forceRefresh);
  },

  dyingSlice: function ifs_dyingSlice(slice) {
    var idx = this._slices.indexOf(slice);
    this._slices.splice(idx, 1);

    if (this._slices.length === 0 && this._mutexQueue.length === 0)
      this.folderSyncer.allConsumersDead();
  },

  /**
   * Receive messages directly from the database (streaming).
   */
  onFetchDBHeaders: function(slice, triggerRefresh, doneCallback, releaseMutex,
                             headers, moreMessagesComing) {
    var triggerNow = false;
    if (!moreMessagesComing && triggerRefresh) {
      moreMessagesComing = true;
      triggerNow = true;
    }

    if (headers.length) {
      // Claim there are more headers coming since we will trigger setStatus
      // right below and we want that to be the only edge transition.
      slice.batchAppendHeaders(headers, -1, true);
    }

    if (!moreMessagesComing) {
      slice.desiredHeaders = slice.headers.length;
      doneCallback();
    }
    else if (triggerNow) {
      slice.desiredHeaders = slice.headers.length;
      // refreshSlice expects this to be null for two reasons:
      // 1) Invariant about only having one sync-like thing happening at a time.
      // 2) We want to generate header deltas rather than initial filling,
      //    and this is keyed off of whether the slice is the current sync
      //    slice.
      this._curSyncSlice = null;
      // We want to have the refresh check its refresh recency range unless we
      // have been explicitly told to force a refresh.
      var checkOpenRecency = triggerRefresh !== 'force';
      this._refreshSlice(slice, checkOpenRecency, releaseMutex);
    }
  },

  sliceQuicksearch: function ifs_sliceQuicksearch(slice, searchParams) {
  },

  getYoungestMessageTimestamp: function() {
    if (!this._headerBlockInfos.length)
      return 0;
    return this._headerBlockInfos[0].endTS;
  },

  /**
   * Return true if the identified header is the most recent known message for
   * this folder as part of our fully-synchronized time-span.  Messages known
   * because of sparse searches do not count.  If null/null is passed and there
   * are no known headers, we will return true.
   */
  headerIsYoungestKnown: function(date, uid) {
    // NB: unlike oldest known, this should not actually be impacted by messages
    // found by search.
    if (!this._headerBlockInfos.length)
      return (date === null && uid === null);
    var blockInfo = this._headerBlockInfos[0];

    return (date === blockInfo.endTS &&
            uid === blockInfo.endUID);
  },

  getOldestMessageTimestamp: function() {
    if (!this._headerBlockInfos.length)
      return 0;
    return this._headerBlockInfos[this._headerBlockInfos.length - 1].startTS;
  },

  /**
   * Return true if the identified header is the oldest known message for this
   * folder as part of our fully-synchronized time-span.  Messages known because
   * of sparse searches do not count.  If null/null is passed and there are no
   * known headers, we will return true.
   */
  headerIsOldestKnown: function(date, uid) {
    // TODO: when we implement search, this logic will need to be more clever
    // to check our full-sync range since we may indeed have cached messages
    // from way in the past.
    if (!this._headerBlockInfos.length)
      return (date === null && uid === null);

    var blockInfo = this._headerBlockInfos[this._headerBlockInfos.length - 1];
    return (date === blockInfo.startTS &&
            uid === blockInfo.startUID);
  },

  /**
   * What is the most recent date we have fully synchronized through?
   */
  getNewestFullSyncDate: function() {
    // If we have any accuracy range, it should be what we want.
    if (this._accuracyRanges.length)
      return this._accuracyRanges[0].endTS;
    // If we have no accuracy ranges, then 0 at least safely indicates we are
    // not up-to-date.
    return 0;
  },

  /**
   * What is the oldest date we have fully synchronized through per our
   * accuracy information?
   */
  getOldestFullSyncDate: function() {
    // Start at the oldest index and run towards the newest until we find a
    // fully synced range or run out of ranges.
    //
    // We used to start at the newest and move towards the oldest since this
    // checked our fully-synced-from-now invariant, but that invariant has now
    // gone by the wayside and is not required for correctness for the purposes
    // of us/our callers.
    var idxAR = this._accuracyRanges.length - 1;
    // Run futurewards in time until we find one without a fullSync or run out
    while (idxAR >= 0 &&
           !this._accuracyRanges[idxAR].fullSync) {
      idxAR--;
    }
    // Sanity-check, use.
    var syncTS;
    if (idxAR >= 0)
      syncTS = this._accuracyRanges[idxAR].startTS;
    else
      syncTS = NOW();
    return syncTS;
  },

  /**
   * Are we synchronized close enough to 'now' so that a refresh of the time
   * interval will include new message received today?  This relies on our
   * IMAP sync generally operating on day granularities.
   */
  syncedToToday: function() {
    if (!this.folderSyncer.canGrowSync)
      return true;

    var newestSyncTS = this.getNewestFullSyncDate();
    return SINCE(newestSyncTS, quantizeDate(NOW() + this._account.tzOffset));
  },

  /**
   * Are we synchronized as far back in time as we are able to synchronize?
   *
   * If true, this means that a refresh of the oldest known message should
   * result in the refresh also covering through `$sync.OLDEST_SYNC_DATE.`
   * Once this becomes true for a folder, it will remain true unless we
   * perform a refresh through the dawn of time that needs to be bisected.  In
   * that case we will drop the through-the-end-of-time coverage via
   * `clearSyncedToDawnOfTime`.
   */
  syncedToDawnOfTime: function() {
    if (!this.folderSyncer.canGrowSync)
      return true;

    var oldestSyncTS = this.getOldestFullSyncDate();
    // We add a day to the oldest sync date to allow for some timezone-related
    // slop.  This is done defensively.  Unit tests ensure that our refresh of
    // synced-to-the-dawn-of-time does not result in date drift that would cause
    // the date to slowly move in and escape the slop.
    return ON_OR_BEFORE(oldestSyncTS, $sync.OLDEST_SYNC_DATE + $date.DAY_MILLIS);
  },

  /**
   * Tally and return the number of messages we believe to exist in the folder.
   */
  getKnownMessageCount: function() {
    var count = 0;
    for (var i = 0; i < this._headerBlockInfos.length; i++) {
      var blockInfo = this._headerBlockInfos[i];
      count += blockInfo.count;
    }
    return count;
  },

  /**
   * Retrieve the (ordered list) of messages covering a given IMAP-style date
   * range that we know about.  Use `getMessagesBeforeMessage` or
   * `getMessagesAfterMessage` to perform iteration relative to a known
   * message.
   *
   * @args[
   *   @param[startTS DateMS]{
   *     SINCE-evaluated start timestamp (inclusive).
   *   }
   *   @param[endTS DateMS]{
   *     BEFORE-evaluated end timestamp (exclusive).  If endTS is null, get all
   *     messages since startTS.
   *   }
   *   @param[minDesired #:optional Number]{
   *     The minimum number of messages to return.  We will keep loading blocks
   *     from disk until this limit is reached.
   *   }
   *   @param[maxDesired #:optional Number]{
   *     The maximum number of messages to return.  If there are extra messages
   *     available in a header block after satisfying `minDesired`, we will
   *     return them up to this limit.
   *   }
   *   @param[messageCallback @func[
   *     @args[
   *       @param[headers @listof[HeaderInfo]]
   *       @param[moreMessagesComing Boolean]]
   *     ]
   *   ]
   * ]
   */
  getMessagesInImapDateRange: function ifs_getMessagesInDateRange(
      startTS, endTS, minDesired, maxDesired, messageCallback) {
    var toFill = (minDesired != null) ? minDesired : $sync.TOO_MANY_MESSAGES,
        maxFill = (maxDesired != null) ? maxDesired : $sync.TOO_MANY_MESSAGES,
        self = this,
        // header block info iteration
        iHeadBlockInfo = null, headBlockInfo;

    // find the first header block with the data we want
    var headerPair = this._findFirstObjIndexForDateRange(
                       this._headerBlockInfos, startTS, endTS);
    iHeadBlockInfo = headerPair[0];
    headBlockInfo = headerPair[1];
    if (!headBlockInfo) {
      // no blocks equals no messages.
      messageCallback([], false);
      return;
    }

    function fetchMore() {
      while (true) {
        // - load the header block if required
        if (!self._headerBlocks.hasOwnProperty(headBlockInfo.blockId)) {
          self._loadBlock('header', headBlockInfo, fetchMore);
          return;
        }
        var headerBlock = self._headerBlocks[headBlockInfo.blockId];
        // - use up as many headers in the block as possible
        // (previously used destructuring, but we want uglifyjs to work)
        var headerTuple = self._findFirstObjForDateRange(
                            headerBlock.headers,
                            startTS, endTS),
            iFirstHeader = headerTuple[0], header = headerTuple[1];
        // aw man, no usable messages?!
        if (!header) {
          messageCallback([], false);
          return;
        }
        // (at least one usable message)

        var iHeader = iFirstHeader;
        for (; iHeader < headerBlock.headers.length && maxFill;
             iHeader++, maxFill--) {
          header = headerBlock.headers[iHeader];
          // (we are done if we have found a header earlier than what we want)
          if (BEFORE(header.date, startTS))
            break;
        }
        // (iHeader is pointing at the index of message we don't want)
        // There is no further processing to do if we bailed early.
        if (maxFill && iHeader < headerBlock.headers.length)
          toFill = 0;
        else
          toFill -= iHeader - iFirstHeader;

        if (!toFill) {
        }
        // - There may be viable messages in the next block, check.
        else if (++iHeadBlockInfo >= self._headerBlockInfos.length) {
          // Nope, there are no more messages, nothing left to do.
          toFill = 0;
        }
        else {
          headBlockInfo = self._headerBlockInfos[iHeadBlockInfo];
          // We may not want to go back any farther
          if (STRICTLY_AFTER(startTS, headBlockInfo.endTS))
            toFill = 0;
        }
        // generate the notifications fo what we did create
        messageCallback(headerBlock.headers.slice(iFirstHeader, iHeader),
                        Boolean(toFill));
        if (!toFill)
          return;
        // (there must be some overlap, keep going)
      }
    }

    fetchMore();
  },

  /**
   * Batch/non-streaming version of `getMessagesInDateRange` using an IMAP
   * style date-range for syncing.
   *
   * @args[
   *   @param[allCallback @func[
   *     @args[
   *       @param[headers @listof[HeaderInfo]]
   *     ]
   *   ]
   * ]
   */
  getAllMessagesInImapDateRange: function ifs_getAllMessagesInDateRange(
      startTS, endTS, allCallback) {
    var allHeaders = null;
    function someMessages(headers, moreHeadersExpected) {
      if (allHeaders)
        allHeaders = allHeaders.concat(headers);
      else
        allHeaders = headers;
      if (!moreHeadersExpected)
        allCallback(allHeaders);
    }
    this.getMessagesInImapDateRange(startTS, endTS, null, null, someMessages);
  },

  /**
   * Fetch up to `limit` messages chronologically before the given message
   * (in the direction of 'start').
   *
   * If date/id are null, it as if the date/id of the most recent message
   * are passed.
   */
  getMessagesBeforeMessage: function(date, id, limit, messageCallback) {
    var toFill = (limit != null) ? limit : $sync.TOO_MANY_MESSAGES, self = this;

    var headerPair, iHeadBlockInfo, headBlockInfo;
    if (date) {
      headerPair = this._findRangeObjIndexForDateAndID(
                     this._headerBlockInfos, date, id);
      iHeadBlockInfo = headerPair[0];
      headBlockInfo = headerPair[1];
    }
    else {
      iHeadBlockInfo = 0;
      headBlockInfo = this._headerBlockInfos[0];
    }

    if (!headBlockInfo) {
      // The iteration request is somehow not current; log an error and return
      // an empty result set.
      this._LOG.badIterationStart(date, id);
      messageCallback([], false);
      return;
    }

    var iHeader = null;
    function fetchMore() {
      while (true) {
        // - load the header block if required
        if (!self._headerBlocks.hasOwnProperty(headBlockInfo.blockId)) {
          self._loadBlock('header', headBlockInfo, fetchMore);
          return;
        }
        var headerBlock = self._headerBlocks[headBlockInfo.blockId];

        // Null means find it by id...
        if (iHeader === null) {
          if (id !== null)
            iHeader = headerBlock.ids.indexOf(id);
          else
            iHeader = 0;
          if (iHeader === -1) {
            self._LOG.badIterationStart(date, id);
            toFill = 0;
          }
          iHeader++;
        }
        // otherwise we know we are starting at the front of the block.
        else {
          iHeader = 0;
        }

        var useHeaders = Math.min(
              headerBlock.headers.length - iHeader,
              toFill);
        if (iHeader >= headerBlock.headers.length)
          useHeaders = 0;
        toFill -= useHeaders;

        // If there's nothing more to...
        if (!toFill) {
        }
        // - There may be viable messages in the next block, check.
        else if (++iHeadBlockInfo >= self._headerBlockInfos.length) {
          // Nope, there are no more messages, nothing left to do.
          toFill = 0;
        }
        else {
          headBlockInfo = self._headerBlockInfos[iHeadBlockInfo];
        }
        // generate the notifications for what we did create
        messageCallback(headerBlock.headers.slice(iHeader,
                                                  iHeader + useHeaders),
                        Boolean(toFill));
        if (!toFill)
          return;
        // (there must be some overlap, keep going)
      }
    }

    fetchMore();
  },

  /**
   * Fetch up to `limit` messages chronologically after the given message (in
   * the direction of 'end').
   */
  getMessagesAfterMessage: function(date, id, limit, messageCallback) {
    var toFill = (limit != null) ? limit : $sync.TOO_MANY_MESSAGES, self = this;

    var headerPair = this._findRangeObjIndexForDateAndID(
                       this._headerBlockInfos, date, id);
    var iHeadBlockInfo = headerPair[0];
    var headBlockInfo = headerPair[1];

    if (!headBlockInfo) {
      // The iteration request is somehow not current; log an error and return
      // an empty result set.
      this._LOG.badIterationStart(date, id);
      messageCallback([], false);
      return;
    }

    var iHeader = null;
    function fetchMore() {
      while (true) {
        // - load the header block if required
        if (!self._headerBlocks.hasOwnProperty(headBlockInfo.blockId)) {
          self._loadBlock('header', headBlockInfo, fetchMore);
          return;
        }
        var headerBlock = self._headerBlocks[headBlockInfo.blockId];

        // Null means find it by id...
        if (iHeader === null) {
          iHeader = headerBlock.ids.indexOf(id);
          if (iHeader === -1) {
            self._LOG.badIterationStart(date, id);
            toFill = 0;
          }
          iHeader--;
        }
        // otherwise we know we are starting at the end of the block (and
        // moving towards the front)
        else {
          iHeader = headerBlock.headers.length - 1;
        }

        var useHeaders = Math.min(iHeader + 1, toFill);
        if (iHeader < 0)
          useHeaders = 0;
        toFill -= useHeaders;

        // If there's nothing more to...
        if (!toFill) {
        }
        // - There may be viable messages in the previous block, check.
        else if (--iHeadBlockInfo < 0) {
          // Nope, there are no more messages, nothing left to do.
          toFill = 0;
        }
        else {
          headBlockInfo = self._headerBlockInfos[iHeadBlockInfo];
        }
        // generate the notifications for what we did create
        var messages = headerBlock.headers.slice(iHeader - useHeaders + 1,
                                                 iHeader + 1);
        messageCallback(messages, Boolean(toFill));
        if (!toFill)
          return;
        // (there must be some overlap, keep going)
      }
    }

    fetchMore();
  },


  /**
   * Mark a given time range as synchronized.  Timestamps are currently UTC
   * day-quantized values that indicate the day range that we have fully
   * synchronized with the server.  The actual time-range of the synchronized
   * messages will be offset by the effective timezone of the server.
   *
   * To re-state in another way: if you take these timestamps and represent them
   * in UTC-0, that's the date we talk to the IMAP server with in terms of SINCE
   * and BEFORE.
   *
   * Note: I did consider doing timezones the right way where we would compute
   * things in the time-zone of the server.  The problem with that is that our
   * timezone for the server is just a guess and the server's timezone can
   * actually change.  And if the timezone changes, then all the dates would end
   * up shifted by a day when quantized, which is distinctly not what we want to
   * happen.
   *
   * @args[
   *   @param[startTS DateMS]
   *   @param[endTS DateMS]
   *   @param[modseq]
   *   @param[updated DateMS]
   * ]
   */
  markSyncRange: function(startTS, endTS, modseq, updated) {
    // If our range was marked open-ended, it's really accurate through now.
    // But we don't want true UTC now, we want the now of the server in terms of
    // IMAP's crazy SINCE/BEFORE quantized date-range.  If it's already tomorrow
    // as far as the server is concerned date-wise, then we need to reflect that
    // here.
    //
    // To really spell it out, let's say that it's currently daylight savings
    // time, we live on the east coast (utc-4), and our server is in Europe
    // (utc+2).
    //
    // Let's say it's 7pm, which is 11pm at utc-0 and 1am at utc+2.  NOW() is
    // going to net us the 11pm value; we need to add the timezone offset of
    // +2 to get to 1am, which is then what we want to use for markSyncRange.
    //
    if (!endTS)
      endTS = NOW() + this._account.tzOffset;
    if (startTS > endTS)
      throw new Error('Your timestamps are switched!');

    var aranges = this._accuracyRanges;
    function makeRange(start, end, modseq, updated) {
      return {
        startTS: start, endTS: end,
        // let an existing fullSync be passed in instead...
        fullSync: (typeof(modseq) === 'string') ?
          { highestModseq: modseq, updated: updated } :
          { highestModseq: modseq.fullSync.highestModseq,
            updated: modseq.fullSync.updated },
      };
    }

    var newInfo = this._findFirstObjIndexForDateRange(aranges, startTS, endTS),
        oldInfo = this._findLastObjIndexForDateRange(aranges, startTS, endTS),
        newSplits, oldSplits;
    // We need to split the new block if we overlap a block and our end range
    // is not 'outside' the range.
    newSplits = newInfo[1] && STRICTLY_AFTER(newInfo[1].endTS, endTS);
    // We need to split the old block if we overlap a block and our start range
    // is not 'outside' the range.
    oldSplits = oldInfo[1] && BEFORE(oldInfo[1].startTS, startTS);

    var insertions = [],
        delCount = oldInfo[0] - newInfo[0];
    if (oldInfo[1])
      delCount++;

    if (newSplits) {
      // should this just be an effective merge with our insertion?
      if (newInfo[1].fullSync &&
          newInfo[1].fullSync.highestModseq === modseq &&
          newInfo[1].fullSync.updated === updated)
        endTS = newInfo[1].endTS;
      else
        insertions.push(makeRange(endTS, newInfo[1].endTS, newInfo[1]));
    }
    insertions.push(makeRange(startTS, endTS, modseq, updated));
    if (oldSplits) {
      // should this just be an effective merge with what we just inserted?
      if (oldInfo[1].fullSync &&
          oldInfo[1].fullSync.highestModseq === modseq &&
          oldInfo[1].fullSync.updated === updated)
        insertions[insertions.length-1].startTS = oldInfo[1].startTS;
      else
        insertions.push(makeRange(oldInfo[1].startTS, startTS, oldInfo[1]));
    }

    // - merges
    // Consider a merge if there is an adjacent accuracy range in the given dir.
    var newNeighbor = newInfo[0] > 0 ? aranges[newInfo[0] - 1] : null,
        oldAdjust = oldInfo[1] ? 1 : 0,
        oldNeighbor = oldInfo[0] < (aranges.length - oldAdjust) ?
                        aranges[oldInfo[0] + oldAdjust] : null;
    // We merge if our starts and ends line up...
    if (newNeighbor &&
       insertions[0].endTS === newNeighbor.startTS &&
        newNeighbor.fullSync &&
        newNeighbor.fullSync.highestModseq === modseq &&
        newNeighbor.fullSync.updated === updated) {
      insertions[0].endTS = newNeighbor.endTS;
      newInfo[0]--;
      delCount++;
    }
    if (oldNeighbor &&
        insertions[insertions.length-1].startTS === oldNeighbor.endTS &&
        oldNeighbor.fullSync &&
        oldNeighbor.fullSync.highestModseq === modseq &&
        oldNeighbor.fullSync.updated === updated) {
      insertions[insertions.length-1].startTS = oldNeighbor.startTS;
      delCount++;
    }

    aranges.splice.apply(aranges, [newInfo[0], delCount].concat(insertions));

    /*lastSyncedAt depends on current timestamp of the client device
     should not be added timezone offset*/
    this.folderMeta.lastSyncedAt = NOW();
    if (this._account.universe)
      this._account.universe.__notifyModifiedFolder(this._account,
                                                    this.folderMeta);
  },

  /**
   * Mark that the most recent sync is believed to have synced all the messages
   * in the folder.  For ActiveSync, this always happens and is effectively
   * meaningless; it's only an artifact of previous hacks that it calls this at
   * all.  For IMAP, this is an inference that depends on us being up-to-date
   * with the rest of the folder.  However it is also a self-correcting
   * inference since it causes our refreshes to include that time range since we
   * believe it to be safely empty.
   */
  markSyncedToDawnOfTime: function() {
    this._LOG.syncedToDawnOfTime();

    // We can just expand the first accuracy range structure to stretch to the
    // dawn of time and nuke the rest.
    var aranges = this._accuracyRanges;
    // (If aranges is the empty list, there are deep invariant problems and
    // the exception is desired.)
    aranges[aranges.length - 1].startTS = $sync.OLDEST_SYNC_DATE;
  },

  /**
   * Clear our indication that we have synced the entire folder through the dawn
   * of time, truncating the time coverage of the oldest accuracy range or
   * dropping it entirely.  It is assumed/required that a call to markSyncRange
   * will follow this call within the same transaction, so the key thing is that
   * we lose the dawn-of-time bit without throwing away useful endTS values.
   */
  clearSyncedToDawnOfTime: function(newOldestTS) {
    var aranges = this._accuracyRanges;
    if (!aranges.length)
      return;
    var lastRange = aranges[aranges.length - 1];
    // Only update the startTS if it leaves a valid accuracy range
    if (STRICTLY_AFTER(lastRange.endTS, newOldestTS)) {
      lastRange.startTS = newOldestTS;
    }
    // Otherwise, pop the range to get rid of the info.  This is a defensive
    // programming thing; we do not expect this case to happen, so we log.
    else {
      this._LOG.accuracyRangeSuspect(lastRange);
      aranges.pop();
    }
  },

  /**
   * Given a time range, check if we have fully-synchronized data covering
   * that range or part of that range.  Return the smallest possible single
   * range covering all areas that are unsynchronized or were not synchronized
   * recently enough.
   *
   * We only return one range, so in the case we have valid data for Tuesday to
   * Thursday but the requested range is Monday to Friday, we still have to
   * return Monday to Friday because 1 range can't capture Monday to Monday and
   * Friday to Friday at the same time.
   *
   * @args[
   *   @param[startTS DateMS]{
   *     Inclusive range start.
   *   }
   *   @param[endTS DateMS]{
   *     Exclusive range start; consistent with accuracy range rep.
   *   }
   *   @param[threshMS Number]{
   *     The number of milliseconds to use as the threshold value for
   *     determining if a time-range is recent enough.
   *   }
   * ]
   * @return[@oneof[
   *   @case[null]{
   *     Everything is sufficiently up-to-date.  No refresh required.
   *   }
   *   @case[@dict[
   *     @key[startTS DateMS]{
   *       Inclusive start date.
   *     }
   *     @key[endTS DateMS]{
   *       Exclusive end date.
   *     }
   *   ]]
   * ]]
   */
  checkAccuracyCoverageNeedingRefresh: function(startTS, endTS, threshMS) {
    var aranges = this._accuracyRanges, arange,
        newInfo = this._findFirstObjIndexForDateRange(aranges, startTS, endTS),
        oldInfo = this._findLastObjIndexForDateRange(aranges, startTS, endTS),
        recencyCutoff = NOW() - threshMS;
    var result = { startTS: startTS, endTS: endTS };
    if (newInfo[1]) {
      // - iterate from the 'end', trying to push things as far as we can go.
      var i;
      for (i = newInfo[0]; i <= oldInfo[0]; i++) {
        arange = aranges[i];
        // skip out if this range would cause a gap (will not happen in base
        // case.)
        if (BEFORE(arange.endTS, result.endTS))
          break;
        // skip out if this range was not fully updated or the data is too old
        if (!arange.fullSync ||
            BEFORE(arange.fullSync.updated, recencyCutoff))
          break;
        // if the range covers all of us or further than we need, we are done.
        if (ON_OR_BEFORE(arange.startTS, result.startTS))
          return null;
        // the range only partially covers us; shrink our range and keep going
        result.endTS = arange.startTS;
      }
      // - iterate from the 'start', trying to push things as far as we can go.
      // (if we are here, we must not completely cover the range.)
      for (i = oldInfo[0]; i >= 0; i--) {
        arange = aranges[i];
        // skip out if this range would cause a gap
        if (STRICTLY_AFTER(arange.startTS, result.startTS))
          break;
        // skip out if this range was not fully updated or the data is too old
        if (!arange.fullSync ||
            BEFORE(arange.fullSync.updated, recencyCutoff))
          break;
        // the range only partially covers us; shrink our range and keep going
        result.startTS = arange.endTS;
      }
    }
    return result;
  },

  /**
   * Retrieve a full message (header/body) by suid & date. If either the body or
   * header is not present res will be null.
   *
   *    folderStorage.getMessage(suid, date, function(res) {
   *      if (!res) {
   *        // don't do anything
   *      }
   *
   *      res.header;
   *      res.body;
   *    });
   *
   */
  getMessage: function(suid, date, options, callback) {
    if (typeof(options) === 'function') {
      callback = options;
      options = undefined;
    }

    var header;
    var body;
    var pending = 2;

    function next() {
      if (!--pending) {
        if (!body || !header) {
          return callback(null);
        }

        callback({ header: header, body: body });
      }
    }

    this.getMessageHeader(suid, date, function(_header) {
      header = _header;
      next();
    });

    var gotBody = function gotBody(_body) {
      body = _body;
      next();
    };

    if (options && options.withBodyReps) {
      this.getMessageBodyWithReps(suid, date, gotBody);
    } else {
      this.getMessageBody(suid, date, gotBody);
    }
  },

  /**
   * Retrieve a message header by its SUID and date; you would do this if you
   * only had the SUID and date, like in a 'job'.
   */
  getMessageHeader: function ifs_getMessageHeader(suid, date, callback) {
    var id = parseInt(suid.substring(suid.lastIndexOf('/') + 1)),
        posInfo = this._findRangeObjIndexForDateAndID(this._headerBlockInfos,
                                                      date, id);

    if (posInfo[1] === null) {
      this._LOG.headerNotFound();
      try {
        callback(null);
      }
      catch (ex) {
        this._LOG.callbackErr(ex);
      }
      return;
    }
    var headerBlockInfo = posInfo[1], self = this;
    if (!(this._headerBlocks.hasOwnProperty(headerBlockInfo.blockId))) {
      this._loadBlock('header', headerBlockInfo, function(headerBlock) {
          var idx = headerBlock.ids.indexOf(id);
          var headerInfo = headerBlock.headers[idx] || null;
          if (!headerInfo)
            self._LOG.headerNotFound();
          try {
            callback(headerInfo);
          }
          catch (ex) {
            self._LOG.callbackErr(ex);
          }
        });
      return;
    }
    var block = this._headerBlocks[headerBlockInfo.blockId],
        idx = block.ids.indexOf(id),
        headerInfo = block.headers[idx] || null;
    if (!headerInfo)
      this._LOG.headerNotFound();
    try {
      callback(headerInfo);
    }
    catch (ex) {
      this._LOG.callbackErr(ex);
    }
  },

  /**
   * Retrieve multiple message headers.
   */
  getMessageHeaders: function ifs_getMessageHeaders(namers, callback) {
    var pending = namers.length;

    var headers = [];
    var gotHeader = function gotHeader(header) {
      if (header) {
        headers.push(header);
      }

      if (!--pending) {
        callback(headers);
      }
    };
    for (var i = 0; i < namers.length; i++) {
      var namer = namers[i];
      this.getMessageHeader(namer.suid, namer.date, gotHeader);
    }
  },

  /**
   * Add a new message to the database, generating slice notifications.
   */
  addMessageHeader: function ifs_addMessageHeader(header, callback) {
    if (header.id == null || header.suid == null) {
      throw new Error('No valid id: ' + header.id + ' or suid: ' + header.suid);
    }

    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.addMessageHeader.bind(
                                 this, header, callback));
      return;
    }
    this._LOG.addMessageHeader(header.date, header.id, header.srvid);

    if (this._curSyncSlice && !this._curSyncSlice.ignoreHeaders)
      this._curSyncSlice.onHeaderAdded(header, true, true);
    // - Generate notifications for (other) interested slices
    if (this._slices.length > (this._curSyncSlice ? 1 : 0)) {
      var date = header.date, uid = header.id;
      for (var iSlice = 0; iSlice < this._slices.length; iSlice++) {
        var slice = this._slices[iSlice];
        if (slice === this._curSyncSlice)
          continue;

        // Note: the following control flow is to decide when to bail; if we
        // make it through the conditionals, the header gets reported to the
        // slice.

        // (if the slice is empty, it cares about any header, so keep going)
        if (slice.startTS !== null) {
          // We never automatically grow a slice into the past if we are full,
          // but we do allow it if not full.
          if (BEFORE(date, slice.startTS)) {
            if (slice.headers.length >= slice.desiredHeaders) {
              continue;
            }
          }
          // We do grow a slice into the present if it's already up-to-date.
          // We do count messages from the same second as our
          else if (SINCE(date, slice.endTS)) {
            // !(covers most recently known message)
            if(!(this._headerBlockInfos.length &&
                 slice.endTS === this._headerBlockInfos[0].endTS &&
                 slice.endUID === this._headerBlockInfos[0].endUID))
              continue;
          }
          else if ((date === slice.startTS &&
                    uid < slice.startUID) ||
                   (date === slice.endTS &&
                    uid > slice.endUID)) {
            continue;
          }
        }
        else {
          // Make sure to increase the number of desired headers so the
          // truncating heuristic won't rule the header out.
          slice.desiredHeaders++;
        }

        if (slice._onAddingHeader)
          slice._onAddingHeader(header);

        slice.onHeaderAdded(header, false, true);
      }
    }


    this._insertIntoBlockUsingDateAndUID(
      'header', header.date, header.id, header.srvid,
      $sync.HEADER_EST_SIZE_IN_BYTES, header, callback);
  },

  /**
   * Update an existing mesage header in the database, generating slice
   * notifications and dirtying its containing block to cause eventual database
   * writeback.
   *
   * A message header gets updated ONLY because of a change in its flags.  We
   * don't consider this change large enough to cause us to need to split a
   * block.
   *
   * This function can either be used to replace the header or to look it up
   * and then call a function to manipulate the header.
   */
  updateMessageHeader: function ifs_updateMessageHeader(date, id, partOfSync,
                                                        headerOrMutationFunc,
                                                        callback) {
    // (While this method can complete synchronously, we want to maintain its
    // perceived ordering relative to those that cannot be.)
    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.updateMessageHeader.bind(
                                 this, date, id, partOfSync,
                                 headerOrMutationFunc, callback));
      return;
    }

    // We need to deal with the potential for the block having been discarded
    // from memory thanks to the potential asynchrony due to pending loads or
    // on the part of the caller.
    var infoTuple = this._findRangeObjIndexForDateAndID(
                      this._headerBlockInfos, date, id),
        iInfo = infoTuple[0], info = infoTuple[1], self = this;
    function doUpdateHeader(block) {
      var idx = block.ids.indexOf(id), header;
      if (idx === -1) {
        // Call the mutation func with null to let it know we couldn't find the
        // header.
        if (headerOrMutationFunc instanceof Function)
          headerOrMutationFunc(null);
        else
          throw new Error('Failed to find ID ' + id + '!');
      }
      else if (headerOrMutationFunc instanceof Function) {
        // If it returns false it means that the header did not change and so
        // there is no need to mark anything dirty and we can leave without
        // notifying anyone.
        if (!headerOrMutationFunc((header = block.headers[idx])))
          header = null;
      }
      else {
        header = block.headers[idx] = headerOrMutationFunc;
      }
      // only dirty us and generate notifications if there is a header
      if (header) {
        self._dirty = true;
        self._dirtyHeaderBlocks[info.blockId] = block;

        self._LOG.updateMessageHeader(header.date, header.id, header.srvid);

        if (self._slices.length > (self._curSyncSlice ? 1 : 0)) {
          for (var iSlice = 0; iSlice < self._slices.length; iSlice++) {
            var slice = self._slices[iSlice];
            if (partOfSync && slice === self._curSyncSlice)
              continue;
            if (BEFORE(date, slice.startTS) ||
                STRICTLY_AFTER(date, slice.endTS))
              continue;
            if ((date === slice.startTS &&
                 id < slice.startUID) ||
                (date === slice.endTS &&
                 id > slice.endUID))
              continue;
            slice.onHeaderModified(header);
          }
        }
      }
      if (callback)
        callback();
    }
    if (!info) {
      if (headerOrMutationFunc instanceof Function)
        headerOrMutationFunc(null);
      else
        throw new Error('Failed to find block containing header with date: ' +
                        date + ' id: ' + id);
    }
    else if (!this._headerBlocks.hasOwnProperty(info.blockId))
      this._loadBlock('header', info, doUpdateHeader);
    else
      doUpdateHeader(this._headerBlocks[info.blockId]);
  },

  /**
   * Retrieve and update a header by locating it
   */
  updateMessageHeaderByServerId: function(srvid, partOfSync,
                                          headerOrMutationFunc) {
    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.updateMessageHeaderByServerId.bind(
        this, srvid, partOfSync, headerOrMutationFunc));
      return;
    }

    var blockId = this._serverIdHeaderBlockMapping[srvid];
    if (srvid === undefined) {
      this._LOG.serverIdMappingMissing(srvid);
      return;
    }

    var findInBlock = function findInBlock(headerBlock) {
      var headers = headerBlock.headers;
      for (var i = 0; i < headers.length; i++) {
        var header = headers[i];
        if (header.srvid === srvid) {
          // future work: this method will duplicate some work to re-locate
          // the header; we could try and avoid doing that.
          this.updateMessageHeader(
            header.date, header.id, partOfSync, headerOrMutationFunc);
          return;
        }
      }
    }.bind(this);

    if (this._headerBlocks.hasOwnProperty(blockId)) {
      findInBlock(this._headerBlocks[blockId]);
    }
    else {
      var blockInfo = this._findBlockInfoFromBlockId('header', blockId);
      this._loadBlock('header', blockInfo, findInBlock);
    }
  },

  /**
   * A notification that an existing header is still up-to-date.
   */
  unchangedMessageHeader: function ifs_unchangedMessageHeader(header) {
    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.unchangedMessageHeader.bind(this, header));
      return;
    }
    // (no block update required)
    if (this._curSyncSlice && !this._curSyncSlice.ignoreHeaders)
      this._curSyncSlice.onHeaderAdded(header, true, false);
  },

  hasMessageWithServerId: function(srvid) {
    if (!this._serverIdHeaderBlockMapping)
      throw new Error('Server ID mapping not supported for this storage!');

    var blockId = this._serverIdHeaderBlockMapping[srvid];
    if (srvid === undefined) {
      this._LOG.serverIdMappingMissing(srvid);
      return false;
    }

    return !!blockId;
  },

  deleteMessageHeaderAndBody: function(suid, date, callback) {
    this.getMessageHeader(suid, date, function(header) {
      if (header)
        this.deleteMessageHeaderAndBodyUsingHeader(header, callback);
      else
        callback();
    }.bind(this));
  },

  deleteMessageHeaderUsingHeader: function(header, callback) {
    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.deleteMessageHeaderUsingHeader.bind(
                               this, header, callback));
      return;
    }

    if (this._curSyncSlice && !this._curSyncSlice.ignoreHeaders)
      this._curSyncSlice.onHeaderRemoved(header);
    if (this._slices.length > (this._curSyncSlice ? 1 : 0)) {
      for (var iSlice = 0; iSlice < this._slices.length; iSlice++) {
        var slice = this._slices[iSlice];
        if (slice === this._curSyncSlice)
          continue;
        if (BEFORE(header.date, slice.startTS) ||
            STRICTLY_AFTER(header.date, slice.endTS))
          continue;
        if ((header.date === slice.startTS &&
             header.id < slice.startUID) ||
            (header.date === slice.endTS &&
             header.id > slice.endUID))
          continue;
        slice.onHeaderRemoved(header);
      }
    }

    if (this._serverIdHeaderBlockMapping && header.srvid)
      delete this._serverIdHeaderBlockMapping[header.srvid];

    this._deleteFromBlock('header', header.date, header.id, callback);
  },

  deleteMessageHeaderAndBodyUsingHeader: function(header, callback) {
    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.deleteMessageHeaderAndBodyUsingHeader.bind(
                               this, header, callback));
      return;
    }
    this.deleteMessageHeaderUsingHeader(header, function() {
      this._deleteFromBlock('body', header.date, header.id, callback);
    }.bind(this));
  },

  /**
   * Delete a message header and its body using only the server id for the
   * message.  This requires that `serverIdHeaderBlockMapping` was enabled.
   * Currently, the mapping is a naive, always-in-memory (at least as long as
   * the FolderStorage is in memory) map.
   */
  deleteMessageByServerId: function(srvid) {
    if (!this._serverIdHeaderBlockMapping)
      throw new Error('Server ID mapping not supported for this storage!');

    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.deleteMessageByServerId.bind(this, srvid));
      return;
    }

    var blockId = this._serverIdHeaderBlockMapping[srvid];
    if (srvid === undefined) {
      this._LOG.serverIdMappingMissing(srvid);
      return;
    }

    var findInBlock = function findInBlock(headerBlock) {
      var headers = headerBlock.headers;
      for (var i = 0; i < headers.length; i++) {
        var header = headers[i];
        if (header.srvid === srvid) {
          this.deleteMessageHeaderAndBodyUsingHeader(header);
          return;
        }
      }
    }.bind(this);

    if (this._headerBlocks.hasOwnProperty(blockId)) {
      findInBlock(this._headerBlocks[blockId]);
    }
    else {
      var blockInfo = this._findBlockInfoFromBlockId('header', blockId);
      this._loadBlock('header', blockInfo, findInBlock);
    }
  },

  /**
   * Add a message body to the system; you must provide the header associated
   * with the body.
   */
  addMessageBody: function ifs_addMessageBody(header, bodyInfo, callback) {
    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.addMessageBody.bind(
                                 this, header, bodyInfo, callback));
      return;
    }
    this._LOG.addMessageBody(header.date, header.id, header.srvid);

    // crappy size estimates where we assume the world is ASCII and so a UTF-8
    // encoding will take exactly 1 byte per character.
    var sizeEst = OBJ_OVERHEAD_EST + NUM_ATTR_OVERHEAD_EST +
                    4 * NULL_ATTR_OVERHEAD_EST;
    function sizifyAddrs(addrs) {
      sizeEst += LIST_ATTR_OVERHEAD_EST;
      if (!addrs)
        return;
      for (var i = 0; i < addrs.length; i++) {
        var addrPair = addrs[i];
        sizeEst += OBJ_OVERHEAD_EST + 2 * STR_ATTR_OVERHEAD_EST +
                     (addrPair.name ? addrPair.name.length : 0) +
                     (addrPair.address ? addrPair.address.length : 0);
      }
    }
    function sizifyAttachments(atts) {
      sizeEst += LIST_ATTR_OVERHEAD_EST;
      if (!atts)
        return;
      for (var i = 0; i < atts.length; i++) {
        var att = atts[i];
        sizeEst += OBJ_OVERHEAD_EST + 2 * STR_ATTR_OVERHEAD_EST +
                     att.name.length + att.type.length +
                     NUM_ATTR_OVERHEAD_EST;
      }
    }
    function sizifyStr(str) {
      sizeEst += STR_ATTR_OVERHEAD_EST + str.length;
    }
    function sizifyStringList(strings) {
      sizeEst += LIST_OVERHEAD_EST;
      if (!strings)
        return;
      for (var i = 0; i < strings.length; i++) {
        sizeEst += STR_ATTR_OVERHEAD_EST + strings[i].length;
      }
    }
    function sizifyBodyRep(rep) {
      sizeEst += LIST_OVERHEAD_EST +
                   NUM_OVERHEAD_EST * (rep.length / 2) +
                   STR_OVERHEAD_EST * (rep.length / 2);
      for (var i = 1; i < rep.length; i += 2) {
        if (rep[i])
          sizeEst += rep[i].length;
      }
    };
    function sizifyBodyReps(reps) {
      if (!reps)
        return;


      sizeEst += STR_OVERHEAD_EST * (reps.length / 2);
      for (var i = 0; i < reps.length; i++) {
        var rep = reps[i];
        if (rep.type === 'html') {
          sizeEst += STR_OVERHEAD_EST + rep.amountDownloaded;
        } else {
          rep.content && sizifyBodyRep(rep.content);
        }
      }
    };

    if (bodyInfo.to)
      sizifyAddrs(bodyInfo.to);
    if (bodyInfo.cc)
      sizifyAddrs(bodyInfo.cc);
    if (bodyInfo.bcc)
      sizifyAddrs(bodyInfo.bcc);
    if (bodyInfo.replyTo)
      sizifyStr(bodyInfo.replyTo);


    sizifyAttachments(bodyInfo.attachments);
    sizifyAttachments(bodyInfo.relatedParts);
    sizifyStringList(bodyInfo.references);
    sizifyBodyReps(bodyInfo.bodyReps);

    bodyInfo.size = sizeEst;

    this._insertIntoBlockUsingDateAndUID(
      'body', header.date, header.id, header.srvid, bodyInfo.size, bodyInfo,
      callback);
  },

  /**
   * Determines if the bodyReps of a given body have been downloaded...
   *
   *
   *    storage.messageBodyRepsDownloaded(bodyInfo) => true/false
   *
   */
  messageBodyRepsDownloaded: function(bodyInfo) {
    // no reps its as close to downloaded as its going to get.
    if (!bodyInfo.bodyReps || !bodyInfo.bodyReps.length)
      return true;

    return bodyInfo.bodyReps.every(function(rep) {
      return rep.isDownloaded;
    });
  },

  /**
   * Identical to getMessageBody but will attempt to download all body reps
   * prior to firing its callback .
   */
  getMessageBodyWithReps: function(suid, date, callback) {
    var self = this;
    // try to get the body without any magic
    this.getMessageBody(suid, date, function(bodyInfo) {
      if (!bodyInfo) {
        return callback(bodyInfo);
      }
      if (self.messageBodyRepsDownloaded(bodyInfo)) {
        return callback(bodyInfo);
      }

      // queue a job and return bodyInfo after it completes..
      self._account.universe.downloadMessageBodyReps(suid, date,
                                                     function(err, bodyInfo) {
        // the err (if any) will be logged by the job.
        callback(bodyInfo);
      });
    });
  },

  getMessageBody: function ifs_getMessageBody(suid, date, callback) {
    var id = parseInt(suid.substring(suid.lastIndexOf('/') + 1)),
        posInfo = this._findRangeObjIndexForDateAndID(this._bodyBlockInfos,
                                                      date, id);
    if (posInfo[1] === null) {
      this._LOG.bodyNotFound();
      try {
        callback(null);
      }
      catch (ex) {
        this._LOG.callbackErr(ex);
      }
      return;
    }
    var bodyBlockInfo = posInfo[1], self = this;
    if (!(this._bodyBlocks.hasOwnProperty(bodyBlockInfo.blockId))) {
      this._loadBlock('body', bodyBlockInfo, function(bodyBlock) {
          var bodyInfo = bodyBlock.bodies[id] || null;
          if (!bodyInfo)
            self._LOG.bodyNotFound();
          try {
            callback(bodyInfo);
          }
          catch (ex) {
            self._LOG.callbackErr(ex);
          }
        });
      return;
    }
    var block = this._bodyBlocks[bodyBlockInfo.blockId],
        bodyInfo = block.bodies[id] || null;
    if (!bodyInfo)
      this._LOG.bodyNotFound();
    try {
      callback(bodyInfo);
    }
    catch (ex) {
      this._LOG.callbackErr(ex);
    }
  },

  /**
   * Update a message body; this should only happen because of attachments /
   * related parts being downloaded or purged from the system.  This is an
   * asynchronous operation.
   *
   * Right now it is assumed/required that this body was retrieved via
   * getMessageBody while holding a mutex so that the body block must still
   * be around in memory.
   *
   * Additionally the final argument allows you to send an event to any client
   * listening for changes on a given body.
   *
   *    // client listening for a body change event
   *
   *    // ( body is a MessageBody )
   *    body.onchange = function(detail, bodyInfo) {
   *      // detail => { changeDetails: { bodyReps: [0], ... }, value: y }
   *    };
   *
   *    // in the backend
   *
   *    storage.updateMessageBody(
   *      header,
   *      changedBodyInfo,
   *      { changeDetails: { bodyReps: [0], ... }, value: y }
   *    );
   *
   * @method updateMessageBody
   * @param header {HeaderInfo}
   * @param bodyInfo {BodyInfo}
   * @param options {Object}
   * @param [options.flushBecause] {'blobs'}
   *   If present, indicates that we should flush the message body to disk and
   *   read it back from IndexedDB because we are writing Blobs that are not
   *   already known to IndexedDB and we want to replace potentially
   *   memory-backed Blobs with disk-backed Blobs.  This is essential for
   *   memory management.  There are currently no extenuating circumstances
   *   where you should lie to us about this.
   *
   *   This inherently causes saveAccountState to be invoked, so callers should
   *   sanity-check they aren't doing something weird to the database that could
   *   cause a non-coherent state to appear.
   *
   *   If you pass a value for this, you *must* forget your reference to the
   *   bodyInfo you pass in in order for our garbage collection to work!
   * @param eventDetails {Object}
   *   An event details object that describes the changes being made to the
   *   body representation.  This object will be directly reported to clients.
   *   If omitted, no event will be generated.  Only do this if you're doing
   *   something that should not be made visible to anything; like while the
   *   process of attaching
   *
   *   Please be sure to document everything here for now.
   * @param eventDetails.changeDetails {Object}
   *   An object indicating what changed in the body.  All of the following
   *   attributes are optional.  If they aren't present, the thing didn't
   *   change.
   * @param eventDetails.changeDetails.bodyReps {Number[]}
   *   The indices of the bodyReps array that changed.  In general bodyReps
   *   should only be added or modified.  However, in the case of POP3, a
   *   fictitious body part of type 'fake' may be created and may subsequently
   *   be removed.  No index is generated for the removal, but this should
   *   end up being okay because the UI should not reflect the 'fake' bodyRep
   *   into anything.
   * @param eventDetails.changeDetails.attachments {Number[]}
   *   The indices of the attachments array that changed by being added or
   *   modified.  Attachments may be detached; these indices are reported in
   *   detachedAttachments.
   * @param eventDetails.changeDetails.relatedParts {Number[]}
   *   The indices of the relatedParts array that changed by being added or
   *   modified.
   * @param eventDetails.changeDetails.detachedAttachments {Number[]}
   *   The indices of the attachments array that were deleted.  Note that this
   *   should only happen for drafts and no code should really be holding onto
   *   those bodies.  Additionally, the draft headers/bodies get nuked and
   *   re-created every time a draft is saved, so they shouldn't hang around in
   *   general.  However, we really do not want to allow the Blob references to
   *   leak, so we do report this so we can clean them up in clients.  splices
   *   for this case should be performed in the order reported.
   * @param callback {Function}
   *   A callback to be invoked after the body has been updated and after any
   *   body change notifications have been handed off to the MailUniverse.  The
   *   callback receives a reference to the updated BodyInfo object.
   */
  updateMessageBody: function(header, bodyInfo, options, eventDetails,
                              callback) {
    if (typeof(eventDetails) === 'function') {
      callback = eventDetails;
      eventDetails = null;
    }

    // (While this method can complete synchronously, we want to maintain its
    // perceived ordering relative to those that cannot be.)
    if (this._pendingLoads.length) {
      this._deferredCalls.push(this.updateMessageBody.bind(
                                 this, header, bodyInfo, options,
                                 eventDetails, callback));
      return;
    }

    var suid = header.suid;
    var id = parseInt(suid.substring(suid.lastIndexOf('/') + 1));
    var self = this;

    // (called when addMessageBody completes)
    function bodyUpdated() {
      if (options.flushBecause) {
        bodyInfo = null;
        self._account.saveAccountState(
          null, // no transaction to reuse
          function forgetAndReGetMessageBody() {
            // Force the block hosting the body to be discarded from the
            // cache.
            self.getMessageBody(suid, header.date, performNotifications);
          },
          'flushBody');
      }
      else {
        performNotifications();
      }
    }

    function performNotifications(refreshedBody) {
      if (refreshedBody) {
        bodyInfo = refreshedBody;
      }
      if (eventDetails && self._account.universe) {
        self._account.universe.__notifyModifiedBody(
          suid, eventDetails, bodyInfo
        );
      }

      if (callback) {
        callback(bodyInfo);
      }
    }

    // We always recompute the size currently for safety reasons, but as of
    // writing this, changes to attachments/relatedParts will not affect the
    // body size, only changes to body reps.
    this._deleteFromBlock('body', header.date, id, function() {
      self.addMessageBody(header, bodyInfo, bodyUpdated);
    });
  },

  shutdown: function() {
    // reverse iterate since they will remove themselves as we kill them
    for (var i = this._slices.length - 1; i >= 0; i--) {
      this._slices[i].die();
    }
    this.folderSyncer.shutdown();
    this._LOG.__die();
  },

  /**
   * The folder is no longer known on the server or we are just deleting the
   * account; close out any live connections or processing.  Database cleanup
   * will be handled at the account level so it can go in a transaction with
   * all the other related changes.
   */
  youAreDeadCleanupAfterYourself: function() {
    // XXX close connections, etc.
  },
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  MailSlice: {
    type: $log.QUERY,
    events: {
      headersAppended: {},
      headerAdded: { index: false },
      headerModified: { index: false },
      headerRemoved: { index: false },
    },
    TEST_ONLY_events: {
      headersAppended: { headers: false },
      headerAdded: { header: false },
      headerModified: { header: false },
      headerRemoved: { header: false },
    },
  },
  FolderStorage: {
    type: $log.DATABASE,
    events: {
      addMessageHeader: { date: false, id: false, srvid: false },
      addMessageBody: { date: false, id: false, srvid: false },

      updateMessageHeader: { date: false, id: false, srvid: false },
      updateMessageBody: { date: false, id: false },

      // For now, logging date and uid is useful because the general logging
      // level will show us if we are trying to redundantly delete things.
      // Also, date and uid are opaque identifiers with very little entropy
      // on their own.  (The danger is in correlation with known messages,
      // but that is likely to be useful in the debugging situations where logs
      // will be sufaced.)
      deleteFromBlock: { type: false, date: false, id: false },

      discardFromBlock: { type: false, date: false, id: false },

      // This was an error but the test results viewer UI is not quite smart
      // enough to understand the difference between expected errors and
      // unexpected errors, so this is getting downgraded for now.
      headerNotFound: {},
      bodyNotFound: {},

      syncedToDawnOfTime: {},
    },
    TEST_ONLY_events: {
    },
    asyncJobs: {
      loadBlock: { type: false, blockId: false },
      mutexedCall: { name: true },
    },
    TEST_ONLY_asyncJobs: {
      loadBlock: { block: false },
    },
    errors: {
      callbackErr: { ex: $log.EXCEPTION },

      badBlockLoad: { type: false, blockId: false },

      // Exposing date/uid at a general level is deemed okay because they are
      // opaque identifiers and the most likely failure models involve the
      // values being ridiculous (and therefore not legal).
      badIterationStart: { date: false, id: false },
      badDeletionRequest: { type: false, date: false, id: false },
      badDiscardRequest: { type: false, date: false, id: false },
      bodyBlockMissing: { id: false, idx: false, dict: false },
      serverIdMappingMissing: { srvid: false },

      accuracyRangeSuspect: { arange: false },

      mutexedOpErr: { err: $log.EXCEPTION },

      tooManyCallbacks: { name: false },
      mutexInvariantFail: { fireName: false, curName: false },
    }
  },
}); // end LOGFAB

}); // end define
;
/**
 * Centralize the creation of our header and body object representations.
 *
 * We provide constructor functions which take input objects that should
 * basically look like the output object, but the function enforces
 * consistency and provides the ability to assert about the state of the
 * representation at the call-site.  We discussed making sure to check
 * representations when we are inserting records into our database, but we
 * might also want to opt to do it at creation time too so we can explode
 * slightly closer to the source of the problem.
 *
 * This module will also provide representation checking functions to make
 * sure all the data structures are well-formed/have no obvious problems.
 *
 * @module mailapi/db/mail_rep
 **/

define('mailapi/db/mail_rep',['require'],function(require) {

/*
 * @typedef[HeaderInfo @dict[
 *   @key[id]{
 *     An id allocated by the back-end that names the message within the folder.
 *     We use this instead of the server-issued UID because if we used the UID
 *     for this purpose then we would still need to issue our own temporary
 *     speculative id's for offline operations and would need to implement
 *     renaming and it all gets complicated.
 *   }
 *   @key[srvid]{
 *     The server-issued UID for the folder, or 0 if the folder is an offline
 *     header.
 *   }
 *   @key[suid]{
 *     Basically "account id/folder id/message id", although technically the
 *     folder id includes the account id.
 *   }
 *   @key[guid String]{
 *     This is the message-id header value of the message.
 *   }
 *   @key[author NameAddressPair]
 *   @key[to #:optional @listof[NameAddressPair]]
 *   @key[cc #:optional @listof[NameAddressPair]]
 *   @key[bcc #:optional @listof[NameAddressPair]]
 *   @key[replyTo #:optional String]{
 *     The contents of the reply-to header.
 *   }
 *   @key[date DateMS]
 *   @key[flags @listof[String]]
 *   @key[hasAttachments Boolean]
 *   @key[subject @oneof [String null]]
 *   @key[snippet @oneof[
 *     @case[null]{
 *       We haven't tried to generate a snippet yet.
 *     }
 *     @case['']{
 *       We tried to generate a snippet, but got nothing useful.  Note that we
 *       may try and generate a snippet from a partial body fetch; this does not
 *       indicate that we should avoid computing a better snippet.  Whenever the
 *       snippet is falsey and we have retrieved more body data, we should
 *       always try and derive a snippet.
 *     }
 *     @case[String]{
 *       A non-empty string means we managed to produce some snippet data.  It
 *        is still appropriate to regenerate the snippet if more body data is
 *        fetched since our snippet may be a fallback where we chose quoted text
 *        instead of authored text, etc.
 *     }
 *   ]]
 * ]]
 */
function makeHeaderInfo(raw) {
  // All messages absolutely need the following; the caller needs to make up
  // values if they're missing.
  if (!raw.author)
    throw new Error('No author?!');
  if (!raw.date)
    throw new Error('No date?!');
  // We also want/require a valid id, but we check that at persistence time
  // since POP3 assigns the id/suid slightly later on.  We check the suid at
  // that point too.  (Checked in FolderStorage.addMessageHeader.)

  return {
    id: raw.id,
    srvid: raw.srvid || null,
    suid: raw.suid || null,
    guid: raw.guid || null,
    author: raw.author,
    to: raw.to || null,
    cc: raw.cc || null,
    bcc: raw.bcc || null,
    replyTo: raw.replyTo || null,
    date: raw.date,
    flags: raw.flags || [],
    hasAttachments: raw.hasAttachments || false,
    // These can be empty strings which are falsey, so no ||
    subject: (raw.subject != null) ? raw.subject : null,
    snippet: (raw.snippet != null) ? raw.snippet : null
  };
}

/*
 * @typedef[BodyInfo @dict[
 *   @key[date DateMS]{
 *     Redundantly stored date info for block splitting purposes.  We pretty
 *     much need this no matter what because our ordering is on the tuples of
 *     dates and UIDs, so we could have trouble efficiently locating our header
 *     from the body without this.
 *   }
 *   @key[size Number]
 *   @key[to @listof[NameAddressPair]]
 *   @key[cc @listof[NameAddressPair]]
 *   @key[bcc @listof[NameAddressPair]]
 *   @key[replyTo NameAddressPair]
 *   @key[attaching #:optional AttachmentInfo]{
 *     Because of memory limitations, we need to encode and attach attachments
 *     in small pieces.  An attachment in the process of being attached is
 *     stored here until fully processed.  Its 'file' field contains a list of
 *     Blobs.
 *   }
 *   @key[attachments @listof[AttachmentInfo]]{
 *     Proper attachments for explicit downloading.
 *   }
 *   @key[relatedParts @oneof[null @listof[AttachmentInfo]]]{
 *     Attachments for inline display in the contents of the (hopefully)
 *     multipart/related message.
 *   }
 *   @key[references @oneof[null @listof[String]]]{
 *     The contents of the references header as a list of de-quoted ('<' and
 *     '>' removed) message-id's.  If there was no header, this is null.
 *   }
 *   @key[bodyReps @listof[BodyPartInfo]]
 * ]]{
 *   Information on the message body that is only for full message display.
 *   The to/cc/bcc information may get moved up to the header in the future,
 *   but our driving UI doesn't need it right now.
 * }
 */
function makeBodyInfo(raw) {
  if (!raw.date)
    throw new Error('No date?!');
  if (!raw.attachments || !raw.bodyReps)
    throw new Error('No attachments / bodyReps?!');

  return {
    date: raw.date,
    size: raw.size || 0,
    attachments: raw.attachments,
    relatedParts: raw.relatedParts || null,
    references: raw.references || null,
    bodyReps: raw.bodyReps
  };
}

/*
 * @typedef[BodyPartInfo @dict[
 *   @key[type @oneof['plain' 'html']]{
 *     The type of body; this is actually the MIME sub-type.
 *   }
 *   @key[part String]{
 *     IMAP part number.
 *   }
 *   @key[sizeEstimate Number]
 *   @key[amountDownloaded Number]
 *   @key[isDownloaded Boolean]
 *   @key[_partInfo #:optional RawIMAPPartInfo]
 *   @key[content]{
 *     The representation for 'plain' values is a `quotechew.js` processed
 *     body representation which is pair-wise list where the first item in each
 *     pair is a packed integer identifier and the second is a string containing
 *     the text for that block.
 *
 *     The body representation for 'html' values is an already sanitized and
 *     already quote-normalized String representation that could be directly
 *     fed into innerHTML safely if you were so inclined.  See `htmlchew.js`
 *     for more on that process.
 *   }
 * ]]
 */
function makeBodyPart(raw) {
  // We don't persist body types to our representation that we don't understand.
  if (raw.type !== 'plain' &&
      raw.type !== 'html')
    throw new Error('Bad body type: ' + raw.type);
  // 0 is an okay body size, but not giving us a guess is not!
  if (raw.sizeEstimate === undefined)
    throw new Error('Need size estimate!');

  return {
    type: raw.type,
    part: raw.part || null,
    sizeEstimate: raw.sizeEstimate,
    amountDownloaded: raw.amountDownloaded || 0,
    isDownloaded: raw.isDownloaded || false,
    _partInfo: raw._partInfo || null,
    content: raw.content || ''
  };
}


/*
 * @typedef[AttachmentInfo @dict[
 *   @key[name String]{
 *     The filename of the attachment, if any.
 *   }
 *   @key[contentId String]{
 *     The content-id of the attachment if this is a related part for inline
 *     display.
 *   }
 *   @key[type String]{
 *     The (full) mime-type of the attachment.
 *   }
 *   @key[part String]{
 *     The IMAP part number for fetching the attachment.
 *   }
 *   @key[encoding String]{
 *     The encoding of the attachment so we know how to decode it.  For
 *     ActiveSync, the server takes care of this for us so there is no encoding
 *     from our perspective.  (Although the attachment may get base64 encoded
 *     for transport in the inline case, but that's a protocol thing and has
 *     nothing to do with the message itself.)
 *   }
 *   @key[sizeEstimate Number]{
 *     Estimated file size in bytes.  Gets updated to be the correct size on
 *     attachment download.
 *   }
 *   @key[file @oneof[
 *     @case[null]{
 *       The attachment has not been downloaded, the file size is an estimate.
 *     }
 *     @case[@list["device storage type" "file path"]{
 *       The DeviceStorage type (ex: pictures) and the path to the file within
 *       device storage.
 *     }
 *     @case[HTMLBlob]{
 *       The Blob that contains the attachment.  It can be thought of as a
 *       handle/name to access the attachment.  IndexedDB in Gecko stores the
 *       blobs as (quota-tracked) files on the file-system rather than inline
 *       with the record, so the attachments don't need to count against our
 *       block size since they are not part of the direct I/O burden for the
 *       block.
 *     }
 *     @case[@listof[HTMLBlob]]{
 *       For draft messages, a list of one or more pre-base64-encoded attachment
 *       pieces that were sliced up in chunks due to Gecko's inability to stream
 *       Blobs to disk off the main thread.
 *     }
 *   ]]
 *   @key[charset @oneof[undefined String]]{
 *     The character set, for example "ISO-8859-1".  If not specified, as is
 *     likely for binary attachments, this should be null.
 *   }
 *   @key[textFormat @oneof[undefined String]]{
 *     The text format, for example, "flowed" for format=flowed.  If not
 *     specified, as is likely for binary attachments, this should be null.
 *   }
 * ]]
 */
function makeAttachmentPart(raw) {
  // Something is very wrong if there is no size estimate.
  if (raw.sizeEstimate === undefined)
    throw new Error('Need size estimate!');

  return {
    // XXX ActiveSync may leave this null, although it's conceivable the
    // server might do normalization to save us.  This needs a better treatment.
    // IMAP generates a made-up name for us if there isn't one.
    name: (raw.name != null) ? raw.name : null,
    contentId: raw.contentId || null,
    type: raw.type || 'application/octet-stream',
    part: raw.part || null,
    encoding: raw.encoding || null,
    sizeEstimate: raw.sizeEstimate,
    file: raw.file || null,
    charset: raw.charset || null,
    textFormat: raw.textFormat || null
  };
}

return {
  makeHeaderInfo: makeHeaderInfo,
  makeBodyInfo: makeBodyInfo,
  makeBodyPart: makeBodyPart,
  makeAttachmentPart: makeAttachmentPart
};

}); // end define
;
/**
 * Searchfilters provide for local searching by checking each message against
 * one or more tests.  This is similar to Thunderbird's non-global search
 * mechanism.  Although searching in this fashion could be posed as a
 * decorated slice, the point of local search is fast local search, so we
 * don't want to use real synchronized slices.  Instead, we interact directly
 * with a `FolderStorage` to retrieve known headers in an iterative fashion.  We
 * expose this data as a slice and therefore are capable of listening for
 * changes from the server.  We do end up in a possible situation where we have
 * stale local information that we display to the user, but presumably that's
 * an okay thing.
 *
 * The main fancy/unusual thing we do is that all search predicates contribute
 * to a match representation that allows us to know which predicates in an 'or'
 * configuration actually fired and can provide us with the relevant snippets.
 * In order to be a little bit future proof, wherever we provide a matching
 * snippet, we actually provide an object of the following type.  (We could
 * provide a list of the objects, but the reality is that our UI right now
 * doesn't have the space to display more than one match per filter, so it
 * would just complicate things and generate bloat to do more work than
 * providing one match, especially because we provide a boolean match, not a
 * weighted score.
 *
 * @typedef[FilterMatchItem @dict[
 *   @key[text String]{
 *     The string we think is appropriate for display purposes.  For short
 *     things, this might be the entire strings.  For longer things like a
 *     message subject or the message body, this will be a snippet.
 *   }
 *   @key[offset Number]{
 *     If this is a snippet, the offset of the `text` within the greater whole,
 *     which may be zero.  In the event this is not a snippet, the value will
 *     be zero, but you can't use that to disambiguate; use the length of the
 *     `text` for that.
 *   }
 *   @key[matchRuns @listof[@dict[
 *     @key[start]{
 *       An offset relative to the snippet provided in `text` that identifies
 *       the index of the first JS character deemed to be matching.  If you
 *       want to generate highlights from the raw body, you need to add this
 *       offset to the offset of the `FilterMatchItem`.
 *     }
 *     @key[length]{
 *       The length in JS characters of what we deem to be the match.  In the
 *       even there is some horrible multi-JS-character stuff, assume we are
 *       doing the right thing.  If we are not, patch us, not your code.
 *     }
 *   ]]]{
 *     A list of the offsets within the snippet where matches occurred.  We
 *     do this so that in the future if we support any type of stemming or the
 *     like, the front-end doesn't find itself needing to duplicate the logic.
 *     We provide offsets and lengths rather than pre-splitting the strings so
 *     that a complicated UI could merge search results from searches for
 *     different phrases without having to do a ton of reverse engineering.
 *   }
 *   @key[path #:optional Array]{
 *     Identifies the piece in an aggregate where the match occurred by
 *     providing a traversal path to get to the origin of the string.  For
 *     example, if the display name of the 3rd recipient, the path would be
 *     [2 'name'].  If the e-mail address matched, the path would be
 *     [2 'address'].
 *
 *     This is intended to allow the match information to allow the integration
 *     of the matched data in their context.  For example, the recipients list
 *     in the message reader could be re-ordered so that matching addresses
 *     show up first (especially if some are elided), and are not duplicated in
 *     their original position in the list.
 *   }
 * ]
 *
 * We implement filters for the following:
 * - Author
 * - Recipients
 * - Subject
 * - Body, allows ignoring quoted bits
 *
 * XXX currently all string searching uses indexOf; we at the very least should
 * build a regexp that is configured to ignore case.
 **/

define('mailapi/searchfilter',
  [
    'rdcommon/log',
    './syncbase',
    './date',
    'module',
    'exports'
  ],
  function(
    $log,
    $syncbase,
    $date,
    $module,
    exports
  ) {

/**
 * This internal function checks if a string or a regexp matches an input
 * and if it does, it returns a 'return value' as RegExp.exec does.  Note that
 * the 'index' of the returned value will be relative to the provided
 * `fromIndex` as if the string had been sliced using fromIndex.
 */
function matchRegexpOrString(phrase, input, fromIndex) {
  if (!input) {
    return null;
  }

  if (phrase instanceof RegExp) {
    return phrase.exec(fromIndex ? input.slice(fromIndex) : input);
  }

  var idx = input.indexOf(phrase, fromIndex);
  if (idx == -1) {
    return null;
  }

  var ret = [ phrase ];
  ret.index = idx - fromIndex;
  return ret;
}

/**
 * Match a single phrase against the author's display name or e-mail address.
 * Match results are stored in the 'author' attribute of the match object as a
 * `FilterMatchItem`.
 *
 * We will favor matches on the display name over the e-mail address.
 */
function AuthorFilter(phrase) {
  this.phrase = phrase;
}
exports.AuthorFilter = AuthorFilter;
AuthorFilter.prototype = {
  needsBody: false,

  testMessage: function(header, body, match) {
    var author = header.author, phrase = this.phrase, ret;
    if ((ret = matchRegexpOrString(phrase, author.name, 0))) {
      match.author = {
        text: author.name,
        offset: 0,
        matchRuns: [{ start: ret.index, length: ret[0].length }],
        path: null,
      };
      return true;
    }
    if ((ret = matchRegexpOrString(phrase, author.address, 0))) {
      match.author = {
        text: author.address,
        offset: 0,
        matchRuns: [{ start: ret.index, length: ret[0].length }],
        path: null,
      };
      return true;
    }
    match.author = null;
    return false;
  },
};

/**
 * Checks any combination of the recipients lists.  Match results are stored
 * as a list of `FilterMatchItem` instances in the 'recipients' attribute with
 * 'to' matches before 'cc' matches before 'bcc' matches.
 *
 * We will stop trying to match after the configured number of matches.  If your
 * UI doesn't have the room for a lot of matches, just pass 1.
 *
 * For a given recipient, if both the display name and e-mail address both
 * match, we will still only report the display name.
 */
function RecipientFilter(phrase, stopAfterNMatches,
                         checkTo, checkCc, checkBcc) {
  this.phrase = phrase;
  this.stopAfter = stopAfterNMatches;
  this.checkTo = checkTo;
  this.checkCc = checkCc;
  this.checkBcc = checkBcc;
}
exports.RecipientFilter = RecipientFilter;
RecipientFilter.prototype = {
  needsBody: true,

  testMessage: function(header, body, match) {
    var phrase = this.phrase, stopAfter = this.stopAfter;
    var matches = [];
    function checkRecipList(list) {
      var ret;
      for (var i = 0; i < list.length; i++) {
        var recip = list[i];
        if ((ret = matchRegexpOrString(phrase, recip.name, 0))) {
          matches.push({
            text: recip.name,
            offset: 0,
            matchRuns: [{ start: ret.index, length: ret[0].length }],
            path: null,
          });
          if (matches.length < stopAfter)
            continue;
          return;
        }
        if ((ret = matchRegexpOrString(phrase, recip.address, 0))) {
          matches.push({
            text: recip.address,
            offset: 0,
            matchRuns: [{ start: ret.index, length: ret[0].length }],
            path: null,
          });
          if (matches.length >= stopAfter)
            return;
        }
      }
    }

    if (this.checkTo && header.to)
      checkRecipList(header.to);
    if (this.checkCc && header.cc && matches.length < stopAfter)
      checkRecipList(header.cc);
    if (this.checkBcc && header.bcc && matches.length < stopAfter)
      checkRecipList(header.bcc);

    if (matches.length) {
      match.recipients = matches;
      return true;
    }
    else {
      match.recipients = null;
      return false;
    }
  },

};

/**
 * Assists in generating a `FilterMatchItem` for a substring that is part of a
 * much longer string where we expect we need to reduce things down to a
 * snippet.
 *
 * Context generating is whitespace-aware and tries to avoid leaving partial
 * words.  In the event our truncation would leave us without any context
 * whatsoever, we will leave partial words.  This is also important for us not
 * being rude to CJK languages (although the number used for contextBefore may
 * be too high for CJK, we may want to have them 'cost' more.)
 *
 * We don't pursue any whitespace normalization here because we want our offsets
 * to line up properly with the real data, but also because we can depend on
 * HTML to help us out and normalize everything anyways.
 */
function snippetMatchHelper(str, start, length, contextBefore, contextAfter,
                            path) {
  if (contextBefore > start)
    contextBefore = start;
  var offset = str.indexOf(' ', start - contextBefore);
  if (offset === -1)
    offset = 0;
  if (offset >= start)
    offset = start - contextBefore;
  var endIdx = str.lastIndexOf(' ', start + length + contextAfter);
  if (endIdx <= start + length)
    endIdx = start + length + contextAfter;
  var snippet = str.substring(offset, endIdx);

  return {
    text: snippet,
    offset: offset,
    matchRuns: [{ start: start - offset, length: length }],
    path: path
  };
}

/**
 * Searches the subject for a phrase.  Provides snippeting functionality in case
 * of non-trivial subject lengths.   Multiple matches are supported, but
 * subsequent matches will never overlap with previous strings.  (So if you
 * search for 'bob', and the subject is 'bobobob', you will get 2 matches, not
 * 3.)
 *
 * For details on snippet generation, see `snippetMatchHelper`.
 */
function SubjectFilter(phrase, stopAfterNMatches, contextBefore, contextAfter) {
  this.phrase = phrase;
  this.stopAfter = stopAfterNMatches;
  this.contextBefore = contextBefore;
  this.contextAfter = contextAfter;
}
exports.SubjectFilter = SubjectFilter;
SubjectFilter.prototype = {
  needsBody: false,
  testMessage: function(header, body, match) {
    var subject = header.subject;
    // Empty subjects can't match *anything*; no empty regexes allowed, etc.
    if (!subject)
      return false;
    var phrase = this.phrase,
        slen = subject.length,
        stopAfter = this.stopAfter,
        contextBefore = this.contextBefore, contextAfter = this.contextAfter,
        matches = [],
        idx = 0;

    while (idx < slen && matches.length < stopAfter) {
      var ret = matchRegexpOrString(phrase, subject, idx);
      if (!ret)
        break;

      matches.push(snippetMatchHelper(subject, idx + ret.index, ret[0].length,
                                      contextBefore, contextAfter, null));
      idx += ret.index + ret[0].length;
    }

    if (matches.length) {
      match.subject = matches;
      return true;
    }
    else {
      match.subject = null;
      return false;
    }
  },
};

// stable value from quotechew.js; full export regime not currently required.
var CT_AUTHORED_CONTENT = 0x1;
// HTML DOM constants
var ELEMENT_NODE = 1, TEXT_NODE = 3;

/**
 * Searches the body of the message, it can ignore quoted stuff or not.
 * Provides snippeting functionality.  Multiple matches are supported, but
 * subsequent matches will never overlap with previous strings.  (So if you
 * search for 'bob', and the subject is 'bobobob', you will get 2 matches, not
 * 3.)
 *
 * For details on snippet generation, see `snippetMatchHelper`.
 */
function BodyFilter(phrase, matchQuotes, stopAfterNMatches,
                    contextBefore, contextAfter) {
  this.phrase = phrase;
  this.stopAfter = stopAfterNMatches;
  this.contextBefore = contextBefore;
  this.contextAfter = contextAfter;
  this.matchQuotes = matchQuotes;
}
exports.BodyFilter = BodyFilter;
BodyFilter.prototype = {
  needsBody: true,
  testMessage: function(header, body, match) {
    var phrase = this.phrase,
        stopAfter = this.stopAfter,
        contextBefore = this.contextBefore, contextAfter = this.contextAfter,
        matches = [],
        matchQuotes = this.matchQuotes,
        idx;

    for (var iBodyRep = 0; iBodyRep < body.bodyReps.length; iBodyRep++) {
      var bodyType = body.bodyReps[iBodyRep].type,
          bodyRep = body.bodyReps[iBodyRep].content;

      if (bodyType === 'plain') {
        for (var iRep = 0; iRep < bodyRep.length && matches.length < stopAfter;
             iRep += 2) {
          var etype = bodyRep[iRep]&0xf, block = bodyRep[iRep + 1],
              repPath = null;

          // Ignore blocks that are not message-author authored unless we are
          // told to match quotes.
          if (!matchQuotes && etype !== CT_AUTHORED_CONTENT)
            continue;

          for (idx = 0; idx < block.length && matches.length < stopAfter;) {
            var ret = matchRegexpOrString(phrase, block, idx);
            if (!ret)
              break;
            if (repPath === null)
              repPath = [iBodyRep, iRep];
            matches.push(snippetMatchHelper(block, ret.index, ret[0].length,
                                            contextBefore, contextAfter,
                                            repPath));
            idx += ret.index + ret[0].length;
          }
        }
      }
      else if (bodyType === 'html') {
        // NB: this code is derived from htmlchew.js' generateSnippet
        // functionality.

        // - convert the HMTL into a DOM tree
        // We don't want our indexOf to run afoul of presentation logic.
        var htmlPath = [iBodyRep, 0];
        var htmlDoc = document.implementation.createHTMLDocument(''),
            rootNode = htmlDoc.createElement('div');
        rootNode.innerHTML = bodyRep;

        var node = rootNode.firstChild, done = false;
        while (!done) {
          if (node.nodeType === ELEMENT_NODE) {
            switch (node.tagName.toLowerCase()) {
              // - Things that can't contain useful text.
              // The style does not belong in the snippet!
              case 'style':
                break;

              case 'blockquote':
                // fall-through if matchQuotes
                if (!matchQuotes)
                  break;
              default:
                if (node.firstChild) {
                  node = node.firstChild;
                  htmlPath.push(0);
                  continue;
                }
                break;
            }
          }
          else if (node.nodeType === TEXT_NODE) {
            // XXX the snippet generator normalizes whitespace here to avoid
            // being overwhelmed by ridiculous whitespace.  This is not quite
            // as much a problem for us, but it would be useful if the
            // sanitizer layer normalized whitespace so neither of us has to
            // worry about it.
            var nodeText = node.data;

            var ret = matchRegexpOrString(phrase, nodeText, 0);
            if (ret) {
              matches.push(
                snippetMatchHelper(nodeText, ret.index, ret[0].length,
                                   contextBefore, contextAfter,
                                   htmlPath.concat()));
              if (matches.length >= stopAfter)
                break;
            }
          }

          while (!node.nextSibling) {
            node = node.parentNode;
            htmlPath.pop();
            if (node === rootNode) {
              done = true;
              break;
            }
          }
          if (!done) {
            node = node.nextSibling;
            htmlPath[htmlPath.length - 1]++;
          }
        }
      }
    }

    if (matches.length) {
      match.body = matches;
      return true;
    }
    else {
      match.body = null;
      return false;
    }
  },
};

/**
 * Filters messages using the 'OR' of all specified filters.  We don't need
 * 'AND' right now, but we are not opposed to its inclusion.
 */
function MessageFilterer(filters) {
  this.filters = filters;
  this.bodiesNeeded = false;

  for (var i = 0; i < filters.length; i++) {
    var filter = filters[i];
    if (filter.needsBody)
      this.bodiesNeeded = true;
  }
}
exports.MessageFilterer = MessageFilterer;
MessageFilterer.prototype = {
  /**
   * Check if the message matches the filter.  If it does not, false is
   * returned.  If it does match, a match object is returned whose attributes
   * are defined by the filterers in use.
   */
  testMessage: function(header, body) {
    //console.log('sf: testMessage(', header.suid, header.author.address,
    //            header.subject, 'body?', !!body, ')');
    var matched = false, matchObj = {};
    var filters = this.filters;
    try {
      for (var i = 0; i < filters.length; i++) {
        var filter = filters[i];
        if (filter.testMessage(header, body, matchObj))
          matched = true;
      }
    }
    catch (ex) {
      console.error('filter exception', ex, '\n', ex.stack);
    }
    //console.log('   =>', matched, JSON.stringify(matchObj));
    if (matched)
      return matchObj;
    else
      return false;
  },
};

var CONTEXT_CHARS_BEFORE = 16;
var CONTEXT_CHARS_AFTER = 40;

/**
 *
 */
function SearchSlice(bridgeHandle, storage, phrase, whatToSearch, _parentLog) {
console.log('sf: creating SearchSlice:', phrase);
  this._bridgeHandle = bridgeHandle;
  bridgeHandle.__listener = this;
  // this mechanism never allows triggering synchronization.
  bridgeHandle.userCanGrowDownwards = false;

  this._storage = storage;
  this._LOG = LOGFAB.SearchSlice(this, _parentLog, bridgeHandle._handle);

  // These correspond to the range of headers that we have searched to generate
  // the current set of matched headers.  Our matches will always be fully
  // contained by this range.
  this.startTS = null;
  this.startUID = null;
  this.endTS = null;
  this.endUID = null;

  if (!(phrase instanceof RegExp)) {
    phrase = new RegExp(phrase.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g,
                                       '\\$&'),
                        'i');
  }

  var filters = [];
  if (whatToSearch.author)
    filters.push(new AuthorFilter(phrase));
  if (whatToSearch.recipients)
    filters.push(new RecipientFilter(phrase, 1, true, true, true));
  if (whatToSearch.subject)
    filters.push(new SubjectFilter(
                   phrase, 1, CONTEXT_CHARS_BEFORE, CONTEXT_CHARS_AFTER));
  if (whatToSearch.body)
    filters.push(new BodyFilter(
                   phrase, whatToSearch.body === 'yes-quotes',
                   1, CONTEXT_CHARS_BEFORE, CONTEXT_CHARS_AFTER));

  this.filterer = new MessageFilterer(filters);

  this._bound_gotOlderMessages = this._gotMessages.bind(this, 1);
  this._bound_gotNewerMessages = this._gotMessages.bind(this, -1);

  this.headers = [];
  this.desiredHeaders = $syncbase.INITIAL_FILL_SIZE;
  // Fetch as many headers as we want in our results; we probably will have
  // less than a 100% hit-rate, but there isn't much savings from getting the
  // extra headers now, so punt on those.
  this._storage.getMessagesInImapDateRange(
    0, null, this.desiredHeaders, this.desiredHeaders,
    this._gotMessages.bind(this, 1));
}
exports.SearchSlice = SearchSlice;
SearchSlice.prototype = {
  set atTop(val) {
    this._bridgeHandle.atTop = val;
  },
  set atBottom(val) {
    this._bridgeHandle.atBottom = val;
  },

  _gotMessages: function(dir, headers, moreMessagesComing) {
console.log('sf: gotMessages', headers.length);
    // update the range of what we have seen and searched
    if (headers.length) {
      if (dir === -1) { // (more recent)
        this.endTS = headers[0].date;
        this.endUID = headers[0].id;
      }
      else { // (older)
        var lastHeader = headers[headers.length - 1];
        this.startTS = lastHeader.date;
        this.startUID = lastHeader.id;
        if (this.endTS === null) {
          this.endTS = headers[0].date;
          this.endUID = headers[0].id;
        }
      }
    }

    var checkHandle = function checkHandle(headers, bodies) {
      // run a filter on these
      var matchPairs = [];
      for (i = 0; i < headers.length; i++) {
        var header = headers[i],
            body = bodies ? bodies[i] : null;
        var matchObj = this.filterer.testMessage(header, body);
        if (matchObj)
          matchPairs.push({ header: header, matches: matchObj });
      }

      var atTop = this.atTop = this._storage.headerIsYoungestKnown(
                    this.endTS, this.endUID);
      var atBottom = this.atBottom = this._storage.headerIsOldestKnown(
                       this.startTS, this.startUID);
      var canGetMore = (dir === -1) ? !atTop : !atBottom;
      if (matchPairs.length) {
        var willHave = this.headers.length + matchPairs.length,
            wantMore = !moreMessagesComing &&
                       (willHave < this.desiredHeaders) &&
                       canGetMore;
console.log('sf: willHave', willHave, 'of', this.desiredHeaders, 'want more?', wantMore);
        var insertAt = dir === -1 ? 0 : this.headers.length;
        this._bridgeHandle.sendSplice(
          insertAt, 0, matchPairs, true,
          moreMessagesComing || wantMore);
        this.headers.splice.apply(this.headers,
                                  [insertAt, 0].concat(matchPairs));
        if (wantMore)
          this.reqGrow(dir, false);
      }
      else if (!moreMessagesComing) {
        // If there aren't more messages coming, we either need to get more
        // messages (if there are any left in the folder that we haven't seen)
        // or signal completion.  We can use our growth function directly since
        // there are no state invariants that will get confused.
        if (canGetMore)
          this.reqGrow(dir, false);
        else
          this._bridgeHandle.sendStatus('synced', true, false);
      }
      // (otherwise we need to wait for the additional messages to show before
      //  doing anything conclusive)
    }.bind(this);

    if (this.filterer.bodiesNeeded) {
      // To batch our updates to the UI, just get all the bodies then advance
      // to the next stage of processing.  It would be nice
      var bodies = [];
      var gotBody = function(body) {
        if (!body)
          console.log('failed to get a body for: ',
                      headers[bodies.length].suid,
                      headers[bodies.length].subject);
        bodies.push(body);
        if (bodies.length === headers.length)
          checkHandle(headers, bodies);
      };
      for (var i = 0; i < headers.length; i++) {
        var header = headers[i];
        this._storage.getMessageBody(header.suid, header.date, gotBody);
      }
    }
    else {
      checkHandle(headers, null);
    }
  },

  refresh: function() {
    // no one should actually call this.
  },

  reqNoteRanges: function(firstIndex, firstSuid, lastIndex, lastSuid) {
    // when shrinking our range, we could try and be clever and use the values
    // of the first thing we are updating to adjust our range, but it's safest/
    // easiest right now to just use what we are left with.

    // THIS CODE IS COPIED FROM `MailSlice`'s reqNoteRanges implementation

    var i;
    // - Fixup indices if required
    if (firstIndex >= this.headers.length ||
        this.headers[firstIndex].suid !== firstSuid) {
      firstIndex = 0; // default to not splicing if it's gone
      for (i = 0; i < this.headers.length; i++) {
        if (this.headers[i].suid === firstSuid) {
          firstIndex = i;
          break;
        }
      }
    }
    if (lastIndex >= this.headers.length ||
        this.headers[lastIndex].suid !== lastSuid) {
      for (i = this.headers.length - 1; i >= 0; i--) {
        if (this.headers[i].suid === lastSuid) {
          lastIndex = i;
          break;
        }
      }
    }

    // - Perform splices as required
    // (high before low to avoid index changes)
    if (lastIndex + 1 < this.headers.length) {
      this.atBottom = false;
      this.userCanGrowDownwards = false;
      var delCount = this.headers.length - lastIndex  - 1;
      this.desiredHeaders -= delCount;
      if (!this._accumulating)
        this._bridgeHandle.sendSplice(
          lastIndex + 1, delCount, [],
          // This is expected; more coming if there's a low-end splice
          true, firstIndex > 0);
      this.headers.splice(lastIndex + 1, this.headers.length - lastIndex - 1);
      var lastHeader = this.headers[lastIndex];
      this.startTS = lastHeader.date;
      this.startUID = lastHeader.id;
    }
    if (firstIndex > 0) {
      this.atTop = false;
      this.desiredHeaders -= firstIndex;
      if (!this._accumulating)
        this._bridgeHandle.sendSplice(0, firstIndex, [], true, false);
      this.headers.splice(0, firstIndex);
      var firstHeader = this.headers[0];
      this.endTS = firstHeader.date;
      this.endUID = firstHeader.id;
    }
  },

  reqGrow: function(dirMagnitude, userRequestsGrowth) {
    if (dirMagnitude === -1) {
      this._storage.getMessagesAfterMessage(this.endTS, this.endUID,
                                            $syncbase.INITIAL_FILL_SIZE,
                                            this._gotMessages.bind(this, -1));
    }
    else if (dirMagnitude === 1) {
      this._storage.getMessagesBeforeMessage(this.startTS, this.startUID,
                                             $syncbase.INITIAL_FILL_SIZE,
                                             this._gotMessages.bind(this, 1));
    }
  },

  die: function() {
    this._bridgeHandle = null;
    this._LOG.__die();
  },
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  SearchSlice: {
    type: $log.QUERY,
    events: {
    },
    TEST_ONLY_events: {
    },
  },
}); // end LOGFAB


}); // end define
;
define('mailapi/worker-router',[],function() {

var listeners = {};

function receiveMessage(evt) {
  var data = evt.data;
//dump('\x1b[37mw <= M: recv: '+data.type+' '+data.uid+' '+data.cmd +'\x1b[0m\n');
  var listener = listeners[data.type];
  if (listener)
    listener(data);
}

window.addEventListener('message', receiveMessage);


function unregister(type) {
  delete listeners[type];
}

function registerSimple(type, callback) {
  listeners[type] = callback;

  return function sendSimpleMessage(cmd, args) {
    //dump('\x1b[34mw => M: send: ' + type + ' null ' + cmd + '\x1b[0m\n');
    window.postMessage({ type: type, uid: null, cmd: cmd, args: args });
  };
}

var callbackSenders = {};

/**
 * Register a message type that allows sending messages that may expect a return
 * message that should trigger a callback.  Messages may not be received unless
 * they have an associated callback from a previous sendMessage.
 */
function registerCallbackType(type) {
  if (callbackSenders.hasOwnProperty(type))
    return callbackSenders[type];
  listeners[type] = function receiveCallbackMessage(data) {
    var callback = callbacks[data.uid];
    if (!callback)
      return;
    delete callbacks[data.uid];

    callback.apply(callback, data.args);
  };
  var callbacks = {};
  var uid = 0;

  var sender = function sendCallbackMessage(cmd, args, callback) {
    if (callback) {
      callbacks[uid] = callback;
    }

    //dump('\x1b[34mw => M: send: ' + type + ' ' + uid + ' ' + cmd + '\x1b[0m\n');
    window.postMessage({ type: type, uid: uid++, cmd: cmd, args: args });
  };
  callbackSenders[type] = sender;
  return sender;
}

/**
 * Register a message type that gets associated with a specific set of callbacks
 * keyed by 'cmd' for received messages.
 */
function registerInstanceType(type) {
  var uid = 0;
  var instanceMap = {};
  listeners[type] = function receiveInstanceMessage(data) {
    var instanceListener = instanceMap[data.uid];
    if (!instanceListener)
      return;

    instanceListener(data);
  };

  return {
    register: function(instanceListener) {
      var thisUid = uid++;
      instanceMap[thisUid] = instanceListener;

      return {
        sendMessage: function sendInstanceMessage(cmd, args, transferArgs) {
//dump('\x1b[34mw => M: send: ' + type + ' ' + thisUid + ' ' + cmd + '\x1b[0m\n');
          window.postMessage({ type: type, uid: thisUid,
                               cmd: cmd, args: args },
                             transferArgs);
        },
        unregister: function unregisterInstance() {
          delete instanceMap[thisUid];
        }
      };
    },
  };
}

function shutdown() {
  window.removeEventListener('message', receiveMessage);
  listeners = {};
  callbackSenders = {};
}

return {
  registerSimple: registerSimple,
  registerCallbackType: registerCallbackType,
  registerInstanceType: registerInstanceType,
  unregister: unregister,
  shutdown: shutdown
};

}); // end define
;
/**
 * Mix-ins for account job functionality where the code is reused.
 **/

define('mailapi/jobmixins',
  [
    './worker-router',
    './util',
    'exports'
  ],
  function(
    $router,
    $util,
    exports
  ) {

var sendMessage = $router.registerCallbackType('devicestorage');

exports.local_do_modtags = function(op, doneCallback, undo) {
  var addTags = undo ? op.removeTags : op.addTags,
      removeTags = undo ? op.addTags : op.removeTags;
  this._partitionAndAccessFoldersSequentially(
    op.messages,
    false,
    function perFolder(ignoredConn, storage, headers, namers, callWhenDone) {
      var waitingOn = headers.length;
      function next() {
        if (--waitingOn === 0)
          callWhenDone();
      }
      for (var iHeader = 0; iHeader < headers.length; iHeader++) {
        var header = headers[iHeader];
        var iTag, tag, existing, modified = false;
        if (addTags) {
          for (iTag = 0; iTag < addTags.length; iTag++) {
            tag = addTags[iTag];
            // The list should be small enough that native stuff is better
            // than JS bsearch.
            existing = header.flags.indexOf(tag);
            if (existing !== -1)
              continue;
            header.flags.push(tag);
            header.flags.sort(); // (maintain sorted invariant)
            modified = true;
          }
        }
        if (removeTags) {
          for (iTag = 0; iTag < removeTags.length; iTag++) {
            tag = removeTags[iTag];
            existing = header.flags.indexOf(tag);
            if (existing === -1)
              continue;
            header.flags.splice(existing, 1);
            modified = true;
          }
        }
        storage.updateMessageHeader(header.date, header.id, false,
                                    header, next);
      }
    },
    function() {
      doneCallback(null, null, true);
    },
    null, // connection loss does not happen for local-only ops
    undo,
    'modtags');
};

exports.local_undo_modtags = function(op, callback) {
  // Undoing is just a question of flipping the add and remove lists.
  return this.local_do_modtags(op, callback, true);
};


exports.local_do_move = function(op, doneCallback, targetFolderId) {
  // create a scratch field to store the guid's for check purposes
  op.guids = {};
  var nukeServerIds = !this.resilientServerIds;

  var stateDelta = this._stateDelta, addWait = 0, self = this;
  if (!stateDelta.moveMap)
    stateDelta.moveMap = {};
  if (!stateDelta.serverIdMap)
    stateDelta.serverIdMap = {};
  if (!targetFolderId)
    targetFolderId = op.targetFolder;

  this._partitionAndAccessFoldersSequentially(
    op.messages, false,
    function perFolder(ignoredConn, sourceStorage, headers, namers,
                       perFolderDone) {
      // -- open the target folder for processing
      function targetOpened_nowProcess(ignoredConn, _targetStorage) {
        targetStorage = _targetStorage;
        processNext();
      }
      // -- get the body for the next header (or be done)
      function processNext() {
        if (iNextHeader >= headers.length) {
          perFolderDone();
          return;
        }
        header = headers[iNextHeader++];
        sourceStorage.getMessageBody(header.suid, header.date,
                                     gotBody_nowDelete);
      }
      // -- delete the header and body from the source
      function gotBody_nowDelete(_body) {
        body = _body;

        // We need an entry in the server id map if we are moving/deleting it.
        // We don't need this if we're moving a message to the folder it's
        // already in, but it doesn't hurt anything.
        if (header.srvid)
          stateDelta.serverIdMap[header.suid] = header.srvid;

        if (sourceStorage === targetStorage ||
            // localdraft messages aren't real, and so must not be moved and
            // are only eligible for nuke deletion.
            sourceStorage.folderMeta.type === 'localdrafts') {
          if (op.type === 'move') {
            // A move from a folder to itself is a no-op.
            processNext();
          }
          else { // op.type === 'delete'
            // If the op is a delete and the source and destination folders
            // match, we're deleting from trash, so just perma-delete it.
            sourceStorage.deleteMessageHeaderAndBodyUsingHeader(
              header, processNext);
          }
        }
        else {
          sourceStorage.deleteMessageHeaderAndBodyUsingHeader(
            header, deleted_nowAdd);
        }
      }
      // -- add the header/body to the target folder
      function deleted_nowAdd() {
        var sourceSuid = header.suid;

        // - update id fields
        header.id = targetStorage._issueNewHeaderId();
        header.suid = targetStorage.folderId + '/' + header.id;
        if (nukeServerIds)
          header.srvid = null;

        stateDelta.moveMap[sourceSuid] = header.suid;
        addWait = 2;
        targetStorage.addMessageHeader(header, added);
        targetStorage.addMessageBody(header, body, added);
      }
      function added() {
        if (--addWait !== 0)
          return;
        processNext();
      }
      var iNextHeader = 0, targetStorage = null, header = null, body = null,
          addWait = 0;

      // If the source folder and the target folder are the same, don't try
      // to access the target folder!
      if (sourceStorage.folderId === targetFolderId) {
        targetStorage = sourceStorage;
        processNext();
      }
      else {
        self._accessFolderForMutation(targetFolderId, false,
                                      targetOpened_nowProcess, null,
                                      'local move target');
      }
    },
    function() {
      doneCallback(null, null, true);
    },
    null, // connection loss does not happen for local-only ops
    false,
    'local move source');
};

// XXX implement!
exports.local_undo_move = function(op, doneCallback, targetFolderId) {
  doneCallback(null);
};

exports.local_do_delete = function(op, doneCallback) {
  var trashFolder = this.account.getFirstFolderWithType('trash');
  if (!trashFolder) {
    this.account.ensureEssentialFolders();
    doneCallback('defer');
    return;
  }
  this.local_do_move(op, doneCallback, trashFolder.id);
};

exports.local_undo_delete = function(op, doneCallback) {
  var trashFolder = this.account.getFirstFolderWithType('trash');
  if (!trashFolder) {
    // the absence of the trash folder when it must have previously existed is
    // confusing.
    doneCallback('unknown');
    return;
  }
  this.local_undo_move(op, doneCallback, trashFolder.id);
};

exports.do_download = function(op, callback) {
  var self = this;
  var idxLastSlash = op.messageSuid.lastIndexOf('/'),
      folderId = op.messageSuid.substring(0, idxLastSlash);

  var folderConn, folderStorage;
  // Once we have the connection, get the current state of the body rep.
  var gotConn = function gotConn(_folderConn, _folderStorage) {
    folderConn = _folderConn;
    folderStorage = _folderStorage;

    folderStorage.getMessageHeader(op.messageSuid, op.messageDate, gotHeader);
  };
  var deadConn = function deadConn() {
    callback('aborted-retry');
  };
  // Now that we have the body, we can know the part numbers and eliminate /
  // filter out any redundant download requests.  Issue all the fetches at
  // once.
  var partsToDownload = [], storePartsTo = [], header, bodyInfo, uid;
  var gotHeader = function gotHeader(_headerInfo) {
    header = _headerInfo;
    uid = header.srvid;
    folderStorage.getMessageBody(op.messageSuid, op.messageDate, gotBody);
  };
  var gotBody = function gotBody(_bodyInfo) {
    bodyInfo = _bodyInfo;
    var i, partInfo;
    for (i = 0; i < op.relPartIndices.length; i++) {
      partInfo = bodyInfo.relatedParts[op.relPartIndices[i]];
      if (partInfo.file)
        continue;
      partsToDownload.push(partInfo);
      storePartsTo.push('idb');
    }
    for (i = 0; i < op.attachmentIndices.length; i++) {
      partInfo = bodyInfo.attachments[op.attachmentIndices[i]];
      if (partInfo.file)
        continue;
      partsToDownload.push(partInfo);
      // right now all attachments go in sdcard
      storePartsTo.push('sdcard');
    }

    folderConn.downloadMessageAttachments(uid, partsToDownload, gotParts);
  };

  var downloadErr = null;
  var gotParts = function gotParts(err, bodyBlobs) {
    if (bodyBlobs.length !== partsToDownload.length) {
      callback(err, null, false);
      return;
    }
    downloadErr = err;
    var pendingCbs = 1;
    function next() {
      if (!--pendingCbs) {
        done();
      }
    }

    for (var i = 0; i < partsToDownload.length; i++) {
      // Because we should be under a mutex, this part should still be the
      // live representation and we can mutate it.
      var partInfo = partsToDownload[i],
          blob = bodyBlobs[i],
          storeTo = storePartsTo[i];

      if (blob) {
        partInfo.sizeEstimate = blob.size;
        partInfo.type = blob.type;
        if (storeTo === 'idb') {
          partInfo.file = blob;
        } else {
          pendingCbs++;
          saveToDeviceStorage(
              self._LOG, blob, storeTo, partInfo.name, partInfo, next);
        }
      }
    }

    next();
  };
  function done() {
    folderStorage.updateMessageBody(
      header, bodyInfo,
      { flushBecause: 'blobs' },
      {
        changeDetails: {
          attachments: op.attachmentIndices
        }
      },
      function() {
        callback(downloadErr, null, true);
      });
  };

  self._accessFolderForMutation(folderId, true, gotConn, deadConn,
                                'download');
}

/**
 * Save an attachment to device storage, making the filename unique if we
 * encounter a collision.
 */
var saveToDeviceStorage = exports.saveToDeviceStorage =
function(_LOG, blob, storeTo, filename, partInfo, cb, isRetry) {
  var self = this;
  var callback = function(success, error, savedFilename) {
    if (success) {
      _LOG.savedAttachment(storeTo, blob.type, blob.size);
      console.log('saved attachment to', storeTo, savedFilename,
                  'type:', blob.type);
      partInfo.file = [storeTo, savedFilename];
      cb();
    } else {
      _LOG.saveFailure(storeTo, blob.type, error, filename);
      console.warn('failed to save attachment to', storeTo, filename,
                   'type:', blob.type);
      // if we failed to unique the file after appending junk, just give up
      if (isRetry) {
        cb(error);
        return;
      }
      // retry by appending a super huge timestamp to the file before its
      // extension.
      var idxLastPeriod = filename.lastIndexOf('.');
      if (idxLastPeriod === -1)
        idxLastPeriod = filename.length;
      filename = filename.substring(0, idxLastPeriod) + '-' + Date.now() +
        filename.substring(idxLastPeriod);
      saveToDeviceStorage(_LOG, blob, storeTo, filename, partInfo, cb, true);
    }
  };
  sendMessage('save', [storeTo, blob, filename], callback);
}

exports.local_do_download = function(op, callback) {
  // Downloads are inherently online operations.
  callback(null);
};

exports.check_download = function(op, callback) {
  // If we downloaded the file and persisted it successfully, this job would be
  // marked done because of the atomicity guarantee on our commits.
  callback(null, 'coherent-notyet');
};
exports.local_undo_download = function(op, callback) {
  callback(null);
};
exports.undo_download = function(op, callback) {
  callback(null);
};


exports.local_do_downloadBodies = function(op, callback) {
  callback(null);
};

exports.do_downloadBodies = function(op, callback) {
  var aggrErr, totalDownloaded = 0;
  this._partitionAndAccessFoldersSequentially(
    op.messages,
    true,
    function perFolder(folderConn, storage, headers, namers, callWhenDone) {
      folderConn.downloadBodies(headers, op.options, function(err, numDownloaded) {
        totalDownloaded += numDownloaded;
        if (err && !aggrErr) {
          aggrErr = err;
        }
        callWhenDone();
      });
    },
    function allDone() {
      callback(aggrErr, null,
               // save if we might have done work.
               totalDownloaded > 0);
    },
    function deadConn() {
      aggrErr = 'aborted-retry';
    },
    false, // reverse?
    'downloadBodies',
    true // require headers
  );
};

exports.check_downloadBodies = function(op, callback) {
  // If we had downloaded the bodies and persisted them successfully, this job
  // would be marked done because of the atomicity guarantee on our commits.  It
  // is possible this request might only be partially serviced, in which case we
  // will avoid redundant body fetches, but redundant folder selection is
  // possible if this request spans multiple folders.
  callback(null, 'coherent-notyet');
};

exports.check_downloadBodyReps = function(op, callback) {
  // If we downloaded all of the body parts and persisted them successfully,
  // this job would be marked done because of the atomicity guarantee on our
  // commits.  But it's not, so there's more to do.
  callback(null, 'coherent-notyet');
};

exports.do_downloadBodyReps = function(op, callback) {
  var self = this;
  var idxLastSlash = op.messageSuid.lastIndexOf('/'),
      folderId = op.messageSuid.substring(0, idxLastSlash);

  var folderConn, folderStorage;
  // Once we have the connection, get the current state of the body rep.
  var gotConn = function gotConn(_folderConn, _folderStorage) {
    folderConn = _folderConn;
    folderStorage = _folderStorage;

    folderStorage.getMessageHeader(op.messageSuid, op.messageDate, gotHeader);
  };
  var deadConn = function deadConn() {
    callback('aborted-retry');
  };

  var gotHeader = function gotHeader(header) {
    // header may have been deleted by the time we get here...
    if (!header) {
      callback();
      return;
    }

    folderConn.downloadBodyReps(header, onDownloadReps);
  };

  var onDownloadReps = function onDownloadReps(err, bodyInfo, flushed) {
    if (err) {
      console.error('Error downloading reps', err);
      // fail we cannot download for some reason?
      callback('unknown');
      return;
    }

    // Since we downloaded something, we do want to save what we downloaded,
    // but only if the downloader didn't already force a save while flushing.
    var save = !flushed;
    callback(null, bodyInfo, save);
  };

  self._accessFolderForMutation(folderId, true, gotConn, deadConn,
                                'downloadBodyReps');
};

exports.local_do_downloadBodyReps = function(op, callback) {
  callback(null);
};


exports.postJobCleanup = function(passed) {
  if (passed) {
    var deltaMap, fullMap;
    // - apply updates to the serverIdMap map
    if (this._stateDelta.serverIdMap) {
      deltaMap = this._stateDelta.serverIdMap;
      fullMap = this._state.suidToServerId;
      for (var suid in deltaMap) {
        var srvid = deltaMap[suid];
        if (srvid === null)
          delete fullMap[suid];
        else
          fullMap[suid] = srvid;
      }
    }
    // - apply updates to the move map
    if (this._stateDelta.moveMap) {
      deltaMap = this._stateDelta.moveMap;
      fullMap = this._state.moveMap;
      for (var oldSuid in deltaMap) {
        var newSuid = deltaMap[oldSuid];
        fullMap[oldSuid] = newSuid;
      }
    }
  }

  for (var i = 0; i < this._heldMutexReleasers.length; i++) {
    this._heldMutexReleasers[i]();
  }
  this._heldMutexReleasers = [];

  this._stateDelta.serverIdMap = null;
  this._stateDelta.moveMap = null;
};

exports.allJobsDone =  function() {
  this._state.suidToServerId = {};
  this._state.moveMap = {};
};

/**
 * Partition messages identified by namers by folder, then invoke the callback
 * once per folder, passing in the loaded message header objects for each
 * folder.
 *
 * This method will filter out removed headers (which would otherwise be null).
 * Its possible that entire folders will be skipped if no headers requested are
 * now present.
 *
 * Connection loss by default causes this method to stop trying to traverse
 * folders, calling callOnConnLoss and callWhenDone in that order.  If you want
 * to do something more clever, extend this method so that you can return a
 * sentinel value or promise or something and do your clever thing.
 *
 * @args[
 *   @param[messageNamers @listof[MessageNamer]]
 *   @param[needConn Boolean]{
 *     True if we should try and get a connection from the server.  Local ops
 *     should pass false, server ops should pass true.  This additionally
 *     determines whether we provide headers to the operation (!needConn),
 *     or server id's for messages (needConn).
 *   }
 *   @param[callInFolder @func[
 *     @args[
 *       @param[folderConn ImapFolderConn]
 *       @param[folderStorage FolderStorage]
 *       @param[headersOrServerIds @oneof[
 *         @listof[HeaderInfo]
 *         @listof[ServerID]]
 *       ]
 *       @param[messageNamers @listof[MessageNamer]]
 *       @param[callWhenDoneWithFolder Function]
 *     ]
 *   ]]
 *   @param[callWhenDone @func[
 *     @args[err @oneof[null 'connection-list']]
 *   ]]{
 *     The function to invoke when all of the folders have been processed or the
 *     connection has been lost and we're giving up.  This will be invoked after
 *     `callOnConnLoss` in the event of a conncetion loss.
 *   }
 *   @param[callOnConnLoss Function]{
 *     This function we invoke when we lose a connection.  Traditionally, you would
 *     use this to flag an error in your function that you would then return when
 *     we invoke `callWhenDone`.  Then your check function will be invoked and you
 *     can laboriously check what actually happened on the server, etc.
 *   }
 *   @param[reverse #:optional Boolean]{
 *     Should we walk the partitions in reverse order?
 *   }
 *   @param[label String]{
 *     The label to use to name the usage of the folder connection.
 *   }
 *   @param[requireHeaders Boolean]{
 *     True if connection & headers are needed.
 *   }
 * ]
 */
exports._partitionAndAccessFoldersSequentially = function(
    allMessageNamers,
    needConn,
    callInFolder,
    callWhenDone,
    callOnConnLoss,
    reverse,
    label,
    requireHeaders) {
  var partitions = $util.partitionMessagesByFolderId(allMessageNamers);
  var folderConn, storage, self = this,
      folderId = null, folderMessageNamers = null, serverIds = null,
      iNextPartition = 0, curPartition = null, modsToGo = 0,
      // Set to true immediately before calling callWhenDone; causes us to
      // immediately bail out of any of our callbacks in order to avoid
      // continuing beyond the point when we should have stopped.
      terminated = false;

  if (reverse)
    partitions.reverse();

  var openNextFolder = function openNextFolder() {
    if (terminated)
      return;
    if (iNextPartition >= partitions.length) {
      terminated = true;
      callWhenDone(null);
      return;
    }
    // Cleanup the last folder (if there was one)
    if (iNextPartition) {
      folderConn = null;
      // The folder's mutex should be last; if the callee acquired any
      // additional mutexes in the last round, it should have freed it then
      // too.
      var releaser = self._heldMutexReleasers.pop();
      if (releaser)
        releaser();
      folderConn = null;
    }

    curPartition = partitions[iNextPartition++];
    folderMessageNamers = curPartition.messages;
    serverIds = null;
    if (curPartition.folderId !== folderId) {
      folderId = curPartition.folderId;
      self._accessFolderForMutation(folderId, needConn, gotFolderConn,
                                    connDied, label);
    }
  };
  var connDied = function connDied() {
    if (terminated)
      return;
    if (callOnConnLoss) {
      try {
        callOnConnLoss();
      }
      catch (ex) {
        self._LOG.callbackErr(ex);
      }
    }
    terminated = true;
    callWhenDone('connection-lost');
  };
  var gotFolderConn = function gotFolderConn(_folderConn, _storage) {
    if (terminated)
      return;
    folderConn = _folderConn;
    storage = _storage;
    // - Get headers or resolve current server id from name map
    if (needConn && !requireHeaders) {
      var neededHeaders = [],
          suidToServerId = self._state.suidToServerId;
      serverIds = [];
      for (var i = 0; i < folderMessageNamers.length; i++) {
        var namer = folderMessageNamers[i];
        var srvid = suidToServerId[namer.suid];
        if (srvid) {
          serverIds.push(srvid);
        }
        else {
          serverIds.push(null);
          neededHeaders.push(namer);
        }
      }

      if (!neededHeaders.length) {
        try {
          callInFolder(folderConn, storage, serverIds, folderMessageNamers,
                       openNextFolder);
        }
        catch (ex) {
          console.error('PAAFS error:', ex, '\n', ex.stack);
        }
      }
      else {
        storage.getMessageHeaders(neededHeaders, gotNeededHeaders);
      }
    }
    else {
      storage.getMessageHeaders(folderMessageNamers, gotHeaders);
    }
  };
  var gotNeededHeaders = function gotNeededHeaders(headers) {
    if (terminated)
      return;
    var iNextServerId = serverIds.indexOf(null);
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      // It's possible that by the time this job actually gets a chance to run
      // that the header is no longer in the folder.  This is rare but not
      // particularly exceptional.
      if (header) {
        var srvid = header.srvid;
        serverIds[iNextServerId] = srvid;
        // A header that exists but does not have a server id is exceptional and
        // bad, although logic should handle it because of the above dead-header
        // case.  suidToServerId should really have provided this information to
        // us.
        if (!srvid)
          console.warn('Header', headers[i].suid, 'missing server id in job!');
      }
      iNextServerId = serverIds.indexOf(null, iNextServerId + 1);
    }

    // its entirely possible that we need headers but there are none so we can
    // skip entering this folder as the job cannot do anything with an empty
    // header.
    if (!serverIds.length) {
      openNextFolder();
      return;
    }

    try {
      callInFolder(folderConn, storage, serverIds, folderMessageNamers,
                   openNextFolder);
    }
    catch (ex) {
      console.error('PAAFS error:', ex, '\n', ex.stack);
    }
  };
  var gotHeaders = function gotHeaders(headers) {
    if (terminated)
      return;
    // its unlikely but entirely possible that all pending headers have been
    // removed somehow between when the job was queued and now.
    if (!headers.length) {
      openNextFolder();
      return;
    }

    // Sort the headers in ascending-by-date order so that slices hear about
    // changes from oldest to newest. That way, they won't get upset about being
    // asked to expand into the past.
    headers.sort(function(a, b) { return a.date > b.date; });
    try {
      callInFolder(folderConn, storage, headers, folderMessageNamers,
                   openNextFolder);
    }
    catch (ex) {
      console.error('PAAFS error:', ex, '\n', ex.stack);
    }
  };
  openNextFolder();
};



}); // end define
;
/**
 * Back-end draft abstraction.
 *
 * Drafts are saved to folder storage and look almost exactly like received
 * messages.  The primary difference is that attachments that are in the
 * process of being attached are stored in an `attaching` field on the
 * `BodyInfo` instance and that they are discarded on load if still present
 * (indicating a crash/something like a crash during the save process).
 *
 **/

define('mailapi/drafts/draft_rep',['require','mailapi/db/mail_rep'],function(require) {

var mailRep = require('mailapi/db/mail_rep');

/**
 * Create a new header and body for a draft by extracting any useful state
 * from the previous draft's persisted header/body and the revised draft.
 *
 * @method mergeDraftStates
 * @param oldHeader {HeaderInfo}
 * @param oldBody {BodyInfo}
 * @param newDraftRep {DraftRep}
 * @param newDraftInfo {Object}
 * @param newDraftInfo.id {Number}
 * @param newDraftInfo.suid {SUID}
 * @param newDraftInfo.date {Number}
 */
function mergeDraftStates(oldHeader, oldBody,
                          newDraftRep, newDraftInfo,
                          universe) {

  var identity = universe.getIdentityForSenderIdentityId(newDraftRep.senderId);

  // -- convert from compose rep to header/body rep
  var newHeader = mailRep.makeHeaderInfo({
    id: newDraftInfo.id,
    srvid: null, // stays null
    suid: newDraftInfo.suid, // filled in by the job
    // we currently don't generate a message-id for drafts, but we'll need to
    // do this when we start appending to the server.
    guid: oldHeader ? oldHeader.guid : null,
    author: { name: identity.name, address: identity.address},
    to: newDraftRep.to,
    cc: newDraftRep.cc,
    bcc: newDraftRep.bcc,
    replyTo: identity.replyTo,
    date: newDraftInfo.date,
    flags: [],
    hasAttachments: oldHeader ? oldHeader.hasAttachments : false,
    subject: newDraftRep.subject,
    snippet: newDraftRep.body.text.substring(0, 100),
  });
  var newBody = mailRep.makeBodyInfo({
    date: newDraftInfo.date,
    size: 0,
    attachments: oldBody ? oldBody.attachments.concat() : [],
    relatedParts: oldBody ? oldBody.relatedParts.concat() : [],
    references: newDraftRep.referencesStr,
    bodyReps: []
  });
  newBody.bodyReps.push(mailRep.makeBodyPart({
    type: 'plain',
    part: null,
    sizeEstimate: newDraftRep.body.text.length,
    amountDownloaded: newDraftRep.body.text.length,
    isDownloaded: true,
    _partInfo: {},
    content: [0x1, newDraftRep.body.text]
  }));
  if (newDraftRep.body.html) {
    newBody.bodyReps.push(mailRep.makeBodyPart({
      type: 'html',
      part: null,
      sizeEstimate: newDraftRep.body.html.length,
      amountDownloaded: newDraftRep.body.html.length,
      isDownloaded: true,
      _partInfo: {},
      content: newDraftRep.body.html
    }));
  }

  return {
    header: newHeader,
    body: newBody
  };
}

function convertHeaderAndBodyToDraftRep(account, header, body) {
  var composeBody = {
    text: '',
    html: null,
  };

  // Body structure should be guaranteed, but add some checks.
  if (body.bodyReps.length >= 1 &&
      body.bodyReps[0].type === 'plain' &&
      body.bodyReps[0].content.length === 2 &&
      body.bodyReps[0].content[0] === 0x1) {
    composeBody.text = body.bodyReps[0].content[1];
  }
  // HTML is optional, but if present, should satisfy our guard
  if (body.bodyReps.length == 2 &&
      body.bodyReps[1].type === 'html') {
    composeBody.html = body.bodyReps[1].content;
  }

  var attachments = [];
  body.attachments.forEach(function(att) {
    attachments.push({
      name: att.name,
      blob: att.file
    });
  });

  var draftRep = {
    identity: account.identities[0],
    subject: header.subject,
    body: composeBody,
    to: header.to,
    cc: header.cc,
    bcc: header.bcc,
    referencesStr: body.references,
    attachments: attachments
  };
}

/**
 * Given the HeaderInfo and BodyInfo for a draft, create a new header and body
 * suitable for saving to the sent folder for a POP3 account.  Specifically:
 * - make sure we body.attaching does not make it through
 * - strip the Blob references so we don't accidentally keep the base64
 *   encoded attachment parts around forever and clog up the disk.
 * - avoid accidental use of the same instances between the drafts folder and
 *   the sent folder
 *
 * @param header {HeaderInfo}
 * @param body {BodyInfo}
 * @param newInfo
 * @param newInfo.id
 * @param newInfo.suid {SUID}
 * @return { header, body }
 */
function cloneDraftMessageForSentFolderWithoutAttachments(header, body,
                                                          newInfo) {
  // clone the header (drops excess fields)
  var newHeader = mailRep.makeHeaderInfo(header);
  // clobber the id/suid
  newHeader.id = newInfo.id;
  newHeader.suid = newInfo.suid;

  // clone the body, dropping excess fields like "attaching".
  var newBody = mailRep.makeBodyInfo(body);
  // transform attachments
  if (newBody.attachments) {
    newBody.attachments = newBody.attachments.map(function(oldAtt) {
      var newAtt =  mailRep.makeAttachmentPart(oldAtt);
      // mark the attachment as non-downloadable
      newAtt.type = 'application/x-gelam-no-download';
      // get rid of the blobs!
      newAtt.file = null;
      // we will keep around the sizeEstimate so they know how much they sent
      // and we keep around encoding/charset/textFormat because we don't care

      return newAtt;
    });
  }
  // We currently can't generate related parts, but just in case.
  if (newBody.relatedParts) {
    newBody.relatedParts = [];
  }
  // Body parts can be transferred verbatim.
  newBody.bodyReps = newBody.bodyReps.map(function(oldRep) {
    return mailRep.makeBodyPart(oldRep);
  });

  return { header: newHeader, body: newBody };
}


return {
  mergeDraftStates: mergeDraftStates,
  convertHeaderAndBodyToDraftRep: convertHeaderAndBodyToDraftRep,
  cloneDraftMessageForSentFolderWithoutAttachments:
    cloneDraftMessageForSentFolderWithoutAttachments
};

}); // end define
;
/**
 * Specialized base64 encoding routines.
 *
 * We have a friendly decoder routine in our node-buffer.js implementation.
 **/

define('mailapi/b64',['require'],function(require) {

/**
 * Base64 binary data from a Uint8array to a Uint8Array the way an RFC2822
 * MIME message likes it.  Which is to say with a maximum of 76 bytes of base64
 * encoded data followed by a \r\n.  If the last line has less than 76 bytes of
 * encoded data we still put the \r\n on.
 *
 * This method came into existence because we were blowing out our memory limits
 * which is how it justifies all this specialization. Use window.btoa if you
 * don't need this exact logic/help.
 */
function mimeStyleBase64Encode(data) {
  var wholeLines = Math.floor(data.length / 57);
  var partialBytes = data.length - (wholeLines * 57);
  var encodedLength = wholeLines * 78;
  if (partialBytes) {
    // The padding bytes mean we're always a multiple of 4 long.  And then we
    // still want a CRLF as part of our encoding contract.
    encodedLength += Math.ceil(partialBytes / 3) * 4 + 2;
  }

  var encoded = new Uint8Array(encodedLength);

  // A nibble is 4 bits.
  function encode6Bits(nibbly) {
    // [0, 25] => ['A', 'Z'], 'A'.charCodeAt(0) === 65
    if (nibbly <= 25) {
      encoded[iWrite++] = 65 + nibbly;
    }
    // [26, 51] => ['a', 'z'], 'a'.charCodeAt(0) === 97
    else if (nibbly <= 51) {
      encoded[iWrite++] = 97 - 26 + nibbly;
    }
    // [52, 61] => ['0', '9'], '0'.charCodeAt(0) === 48
    else if (nibbly <= 61) {
      encoded[iWrite++] = 48 - 52 + nibbly;
    }
    // 62 is '+',  '+'.charCodeAt(0) === 43
    else if (nibbly === 62) {
      encoded[iWrite++] = 43;
    }
    // 63 is '/',  '/'.charCodeAt(0) === 47
    else {
      encoded[iWrite++] = 47;
    }
  }

  var iRead = 0, iWrite = 0, bytesToRead;
  // Steady state
  for (bytesToRead = data.length; bytesToRead >= 3; bytesToRead -= 3) {
    var b1 = data[iRead++], b2 = data[iRead++], b3 = data[iRead++];
    // U = Use, i = ignore
    // UUUUUUii
    encode6Bits(b1 >> 2);
    // iiiiiiUU UUUUiiii
    encode6Bits(((b1 & 0x3) << 4) | (b2 >> 4));
    //          iiiiUUUU UUiiiiii
    encode6Bits(((b2 & 0xf) << 2) | (b3 >> 6));
    //                   iiUUUUUU
    encode6Bits(b3 & 0x3f);

    // newlines; it's time to wrap every 57 bytes, or if it's our last full set
    if ((iRead % 57) === 0 || bytesToRead === 3) {
      encoded[iWrite++] = 13; // \r
      encoded[iWrite++] = 10; // \n
    }
  }
  // Leftovers (could be zero).
  // If we ended on a full set in the prior loop, the newline is taken care of.
  switch(bytesToRead) {
    case 2:
      b1 = data[iRead++];
      b2 = data[iRead++];
      encode6Bits(b1 >> 2);
      encode6Bits(((b1 & 0x3) << 4) | (b2 >> 4));
      encode6Bits(((b2 & 0xf) << 2) | 0);
      encoded[iWrite++] = 61; // '='.charCodeAt(0) === 61
      encoded[iWrite++] = 13; // \r
      encoded[iWrite++] = 10; // \n
      break;
    case 1:
      b1 = data[iRead++];
      encode6Bits(b1 >> 2);
      encode6Bits(((b1 & 0x3) << 4) | 0);
      encoded[iWrite++] = 61; // '='.charCodeAt(0) === 61
      encoded[iWrite++] = 61;
      encoded[iWrite++] = 13; // \r
      encoded[iWrite++] = 10; // \n
      break;
  }

  // The code was used to help sanity check, but is inert.  Left in for
  // reviewers or those who suspect this code! :)
  /*
  if (iWrite !== encodedLength)
    throw new Error('Badly written code! iWrite: ' + iWrite +
                    ' encoded length: ' + encodedLength);
  */

  return encoded;
}

return {
  mimeStyleBase64Encode: mimeStyleBase64Encode
};

}); // end define
;
define('mailapi/async_blob_fetcher',
  [
    'exports'
  ],
  function(
    exports
  ) {

/**
 * Asynchronously fetch the contents of a Blob, returning a Uint8Array.
 * Exists because there is no FileReader in Gecko workers and this totally
 * works.  In discussion, it sounds like :sicking wants to deprecate the
 * FileReader API anyways.
 *
 * Our consumer in this case is our specialized base64 encode that wants a
 * Uint8Array since that is more compactly represented than a binary string
 * would be.
 *
 * @param blob {Blob}
 * @param callback {Function(err, Uint8Array)}
 */
function asyncFetchBlobAsUint8Array(blob, callback) {
  var blobUrl = URL.createObjectURL(blob);
  var xhr = new XMLHttpRequest();
  xhr.open('GET', blobUrl, true);
  xhr.responseType = 'arraybuffer';
  xhr.onload = function() {
    // blobs currently result in a status of 0 since there is no server.
    if (xhr.status !== 0 && (xhr.status < 200 || xhr.status >= 300)) {
      callback(xhr.status);
      return;
    }
    callback(null, new Uint8Array(xhr.response));
  };
  xhr.onerror = function() {
    callback('error');
  };
  try {
    xhr.send();
  }
  catch(ex) {
    console.error('XHR send() failure on blob');
    callback('error');
  }
  URL.revokeObjectURL(blobUrl);
}

return {
  asyncFetchBlobAsUint8Array: asyncFetchBlobAsUint8Array
};

}); // end define
;
/**
 * Draft jobs: save/delete drafts, attach/remove attachments.  These gets mixed
 * into the specific JobDriver implementations.
 **/

define('mailapi/drafts/jobs',['require','exports','module','mailapi/db/mail_rep','mailapi/drafts/draft_rep','mailapi/b64','mailapi/async_blob_fetcher'],function(require, exports) {

var mailRep = require('mailapi/db/mail_rep');
var draftRep = require('mailapi/drafts/draft_rep');
var b64 = require('mailapi/b64');
var asyncFetchBlobAsUint8Array =
      require('mailapi/async_blob_fetcher').asyncFetchBlobAsUint8Array;

var draftsMixins = exports.draftsMixins = {};

////////////////////////////////////////////////////////////////////////////////
// attachBlobToDraft

/**
 * How big a chunk of an attachment should we encode in a single read?  Because
 * we want our base64-encoded lines to be 76 bytes long (before newlines) and
 * there's a 4/3 expansion factor, we want to read a multiple of 57 bytes.
 *
 * I initially chose the largest value just under 1MiB.  This appeared too
 * chunky on the ZTE open, so I'm halving to just under 512KiB.  Calculated via
 * Math.floor(512 * 1024 / 57) = 9198.  The encoded size of this ends up to be
 * 9198 * 78 which is ~700 KiB.  So together that's ~1.2 megs if we don't
 * generate a ton of garbage by creating a lot of intermediary strings.
 *
 * This seems reasonable given goals of not requiring the GC to run after every
 * block and not having us tie up the CPU too long during our encoding.
 */
draftsMixins.BLOB_BASE64_BATCH_CONVERT_SIZE = 9198 * 57;

/**
 * Incrementally convert an attachment into its base64 encoded attachment form
 * which we save in chunks to IndexedDB to avoid using too much memory now or
 * during the sending process.
 *
 * - Retrieve the body the draft is persisted to,
 * - Repeat until the attachment is fully attached:
 *   - take a chunk of the source attachment
 *   - base64 encode it into a Blob by creating a Uint8Array and manually
 *     encoding into that.  (We need to put a \r\n after every 76 bytes, and
 *     doing that using window.btoa is going to create a lot of garbage. And
 *     addressing that is no longer premature optimization.)
 *   - update the body with that Blob
 *   - trigger a save of the account so that IndexedDB writes the account to
 *     disk.
 *   - force the body block to be discarded from the cache and then re-get the
 *     body.  We won't be saving any memory until the Blob has been written to
 *     disk and we have forgotten all references to the in-memory Blob we wrote
 *     to the database.  (The Blob does not magically get turned into a
 *     reference to the database.)
 * - Be done.  Note that we leave the "small" Blobs independent; we do not
 *   create a super Blob.
 *
 * ## Logging ##
 *
 * We log at:
 * - The start of the process.
 * - For each block.
 * - The end of the process.
 */
draftsMixins.local_do_attachBlobToDraft = function(op, callback) {
  var localDraftsFolder = this.account.getFirstFolderWithType('localdrafts');
  if (!localDraftsFolder) {
    callback('moot');
    return;
  }
  var self = this;
  this._accessFolderForMutation(
    localDraftsFolder.id, /* needConn*/ false,
    function(nullFolderConn, folderStorage) {
      var wholeBlob = op.attachmentDef.blob;

      // - Retrieve the message
      var header, body;
      console.log('attachBlobToDraft: retrieving message');
      folderStorage.getMessage(
        op.existingNamer.suid, op.existingNamer.date, {}, gotMessage);
      function gotMessage(records) {
        header = records.header;
        body = records.body;

        if (!header || !body) {
          // No header/body suggests either some major invariant is busted or
          // one or more UIs issued attach commands after the draft was mooted.
          callback('failure-give-up');
          return;
        }

        body.attaching = mailRep.makeAttachmentPart({
          name: op.attachmentDef.name,
          type: wholeBlob.type,
          sizeEstimate: wholeBlob.size,
          // this is where we put the Blob segments...
          file: [],
        });

        convertNextChunk(body);
      }

      var blobOffset = 0;
      function convertNextChunk(refreshedBody) {
        body = refreshedBody;
        var nextOffset =
              Math.min(wholeBlob.size,
                       blobOffset + self.BLOB_BASE64_BATCH_CONVERT_SIZE);
        console.log('attachBlobToDraft: fetching', blobOffset, 'to',
                    nextOffset, 'of', wholeBlob.size);
        var slicedBlob = wholeBlob.slice(blobOffset, nextOffset);
        blobOffset = nextOffset;

        asyncFetchBlobAsUint8Array(slicedBlob, gotChunk);
      }

      function gotChunk(err, binaryDataU8) {
        console.log('attachBlobToDraft: fetched');
        // The Blob really should not be disappear out from under us, but it
        // could happen.
        if (err) {
          callback('failure-give-up');
          return;
        }

        var lastChunk = (blobOffset >= wholeBlob.size);
        var encodedU8 = b64.mimeStyleBase64Encode(binaryDataU8);
        body.attaching.file.push(new Blob([encodedU8],
                                          { type: wholeBlob.type }));

        var eventDetails;
        if (lastChunk) {
          var attachmentIndex = body.attachments.length;
          body.attachments.push(body.attaching);
          delete body.attaching; // bad news for shapes, but drafts are rare.

          eventDetails = {
            changeDetails: {
              attachments: [attachmentIndex]
            }
          };
        }
        else {
          // Do not generate an event for intermediary states; there is nothing
          // to observe.
          eventDetails = null;
        }

        console.log('attachBlobToDraft: flushing');
        folderStorage.updateMessageBody(
          header, body, { flushBecause: 'blobs' }, eventDetails,
          lastChunk ? bodyUpdatedAllDone : convertNextChunk);
        body = null;
      }

      function bodyUpdatedAllDone(newBodyInfo) {
        console.log('attachBlobToDraft: blob fully attached');
        callback(null);
      }
    },
    /* no conn => no deathback required */ null,
    'attachBlobToDraft');
};
draftsMixins.do_attachBlobToDraft = function(op, callback) {
  // there is no server component for this
  callback(null);
};
draftsMixins.check_attachBlobToDraft = function(op, callback) {
  callback(null, 'moot');
};
draftsMixins.local_undo_attachBlobToDraft = function(op, callback) {
  callback(null);
};
draftsMixins.undo_attachBlobToDraft = function(op, callback) {
  callback(null);
};

////////////////////////////////////////////////////////////////////////////////
// detachAttachmentFromDraft

draftsMixins.local_do_detachAttachmentFromDraft = function(op, callback) {
  var localDraftsFolder = this.account.getFirstFolderWithType('localdrafts');
  if (!localDraftsFolder) {
    callback('moot');
    return;
  }
  var self = this;
  this._accessFolderForMutation(
    localDraftsFolder.id, /* needConn*/ false,
    function(nullFolderConn, folderStorage) {
      // - Retrieve the message
      var header, body;
      console.log('detachAttachmentFromDraft: retrieving message');
      folderStorage.getMessage(
        op.existingNamer.suid, op.existingNamer.date, {}, gotMessage);
      function gotMessage(records) {
        header = records.header;
        body = records.body;

        if (!header || !body) {
          // No header/body suggests either some major invariant is busted or
          // one or more UIs issued attach commands after the draft was mooted.
          callback('failure-give-up');
          return;
        }

        // Just forget about the attachment.  Splice handles insane indices.
        body.attachments.splice(op.attachmentIndex, 1);

        console.log('detachAttachmentFromDraft: flushing');
        folderStorage.updateMessageBody(
          header, body,
          { flushBecause: 'blobs' },
          {
            changeDetails: {
              detachedAttachments: [op.attachmentIndex]
            }
          },
          bodyUpdatedAllDone);
      }

      function bodyUpdatedAllDone(newBodyInfo) {
        console.log('detachAttachmentFromDraft: blob fully detached');
        callback(null);
      }
    },
    /* no conn => no deathback required */ null,
    'detachAttachmentFromDraft');
};

draftsMixins.do_detachAttachmentFromDraft = function(op, callback) {
  // there is no server component for this at this time.
  callback(null);
};

draftsMixins.check_detachAttachmentFromDraft = function(op, callback) {
  callback(null);
};

draftsMixins.local_undo_detachAttachmentFromDraft = function(op, callback) {
  callback(null);
};

draftsMixins.undo_detachAttachmentFromDraft = function(op, callback) {
  callback(null);
};


////////////////////////////////////////////////////////////////////////////////
// saveDraft

/**
 * Save a draft; if there already was a draft, it gets replaced.  The new
 * draft gets a new date and id/SUID so it is logically distinct.  However,
 * we will propagate attachment and on-server information between drafts.
 */
draftsMixins.local_do_saveDraft = function(op, callback) {
  var localDraftsFolder = this.account.getFirstFolderWithType('localdrafts');
  if (!localDraftsFolder) {
    callback('moot');
    return;
  }
  var self = this;
  this._accessFolderForMutation(
    localDraftsFolder.id, /* needConn*/ false,
    function(nullFolderConn, folderStorage) {
      // there's always a header add and a body add
      var waitingForDbMods = 2;
      function gotMessage(oldRecords) {
        var newRecords = draftRep.mergeDraftStates(
          oldRecords.header, oldRecords.body,
          op.draftRep,
          op.newDraftInfo,
          self.account.universe);

        // If there already was a draft saved, delete it.
        // Note that ordering of the removal and the addition doesn't really
        // matter here because of our use of transactions.
        if (op.existingNamer) {
          waitingForDbMods++;
          folderStorage.deleteMessageHeaderAndBody(
            op.existingNamer.suid, op.existingNamer.date, dbModCompleted);
        }

        folderStorage.addMessageHeader(newRecords.header, dbModCompleted);
        folderStorage.addMessageBody(newRecords.header, newRecords.body,
                                     dbModCompleted);
        function dbModCompleted() {
          if (--waitingForDbMods === 0) {
            callback(
              /* no error */ null,
              /* result */ newRecords,
              /* save account */ true);
          }
        }
      }

      if (op.existingNamer) {
        folderStorage.getMessage(
          op.existingNamer.suid, op.existingNamer.date, null, gotMessage);
      }
      else {
        gotMessage({ header: null, body: null });
      }
    },
    /* no conn => no deathback required */ null,
    'saveDraft');
};

/**
 * FUTURE WORK: Save a draft to the server; this is inherently IMAP only.
 * Tracked on: https://bugzilla.mozilla.org/show_bug.cgi?id=799822
 *
 * It is very possible that we will save local drafts faster / more frequently
 * than we can update our server state.  It only makes sense to upload the
 * latest draft state to the server.  Because we delete our old local drafts,
 * it's obvious when we should skip out on updating the server draft for
 * something.
 *
 * Because IMAP drafts have to replace the prior drafts, we use our old 'srvid'
 * to know what message to delete as well as what message to pull attachments
 * from when we're in a mode where we upload attachments to drafts and CATENATE
 * is available.
 */
draftsMixins.do_saveDraft = function(op, callback) {
  callback(null);
};
draftsMixins.check_saveDraft = function(op, callback) {
  callback(null, 'moot');
};
draftsMixins.local_undo_saveDraft = function(op, callback) {
  callback(null);
};
draftsMixins.undo_saveDraft = function(op, callback) {
  callback(null);
};

////////////////////////////////////////////////////////////////////////////////
// deleteDraft

draftsMixins.local_do_deleteDraft = function(op, callback) {
  var localDraftsFolder = this.account.getFirstFolderWithType('localdrafts');
  if (!localDraftsFolder) {
    callback('moot');
    return;
  }
  var self = this;
  this._accessFolderForMutation(
    localDraftsFolder.id, /* needConn*/ false,
    function(nullFolderConn, folderStorage) {
      folderStorage.deleteMessageHeaderAndBody(
        op.messageNamer.suid, op.messageNamer.date,
        function() {
          callback(null, null, /* save account */ true);
        });
    },
    /* no conn => no deathback required */ null,
    'deleteDraft');
};

draftsMixins.do_deleteDraft = function(op, callback) {
  // there is no server component for this
  callback(null);
};
draftsMixins.check_deleteDraft = function(op, callback) {
  callback(null, 'moot');
};
draftsMixins.local_undo_deleteDraft = function(op, callback) {
  callback(null);
};
draftsMixins.undo_deleteDraft = function(op, callback) {
  callback(null);
};

////////////////////////////////////////////////////////////////////////////////

}); // end define
;
/**
 *
 **/

define('mailapi/accountmixins',
  [
    'exports'
  ],
  function(
    exports
  ) {

/**
 * The no-op operation for job operations that are not implemented.
 * Returns successs in a future turn of the event loop.
 */
function unimplementedJobOperation(op, callback) {
  window.setZeroTimeout(function() {
    callback(null, null);
  });
}



/**
 * @args[
 *   @param[op MailOp]
 *   @param[mode @oneof[
 *     @case['local_do']{
 *       Apply the mutation locally to our database rep.
 *     }
 *     @case['check']{
 *       Check if the manipulation has been performed on the server.  There
 *       is no need to perform a local check because there is no way our
 *       database can be inconsistent in its view of this.
 *     }
 *     @case['do']{
 *       Perform the manipulation on the server.
 *     }
 *     @case['local_undo']{
 *       Undo the mutation locally.
 *     }
 *     @case['undo']{
 *       Undo the mutation on the server.
 *     }
 *   ]]
 *   @param[callback @func[
 *     @args[
 *       @param[error @oneof[String null]]
 *     ]
 *   ]]
 *   }
 * ]
 */
exports.runOp = function runOp(op, mode, callback) {
  console.log('runOp(' + mode + ': ' + JSON.stringify(op).substring(0, 160) +
              ')');

  var methodName = mode + '_' + op.type, self = this;

  // If the job driver doesn't support the operation, assume that it
  // is a moot operation that will succeed. Assign it a no-op callback
  // that completes in the next tick, so as to maintain job ordering.
  var method = this._jobDriver[methodName];
  if (!method) {
    console.warn('Unsupported op:', op.type, 'mode:', mode);
    method = unimplementedJobOperation;
  }

  this._LOG.runOp_begin(mode, op.type, null, op);
  // _LOG supports wrapping calls, but we want to be able to strip out all
  // logging, and that wouldn't work.
  try {
    method.call(this._jobDriver, op,
    function(error, resultIfAny, accountSaveSuggested) {
      self._jobDriver.postJobCleanup(!error);
      console.log('runOp_end(' + mode + ': ' +
                  JSON.stringify(op).substring(0, 160) + ')\n');
      self._LOG.runOp_end(mode, op.type, error, op);
      // defer the callback to the next tick to avoid deep recursion
      window.setZeroTimeout(function() {
        callback(error, resultIfAny, accountSaveSuggested);
      });
    });
  }
  catch (ex) {
    this._LOG.opError(mode, op.type, ex);
  }
};


/**
 * Return the folder metadata for the first folder with the given type, or null
 * if no such folder exists.
 */
exports.getFirstFolderWithType = function(type) {
  var folders = this.folders;
  for (var iFolder = 0; iFolder < folders.length; iFolder++) {
    if (folders[iFolder].type === type)
      return folders[iFolder];
  }
 return null;
};
exports.getFolderByPath = function(folderPath) {
  var folders = this.folders;
  for (var iFolder = 0; iFolder < folders.length; iFolder++) {
    if (folders[iFolder].path === folderPath)
      return folders[iFolder];
  }
 return null;
};



/**
 * Save the state of this account to the database.  This entails updating all
 * of our highly-volatile state (folderInfos which contains counters, accuracy
 * structures, and our block info structures) as well as any dirty blocks.
 *
 * This should be entirely coherent because the structured clone should occur
 * synchronously during this call, but it's important to keep in mind that if
 * that ever ends up not being the case that we need to cause mutating
 * operations to defer until after that snapshot has occurred.
 */
exports.saveAccountState = function(reuseTrans, callback, reason) {
  if (!this._alive) {
    this._LOG.accountDeleted('saveAccountState');
    return null;
  }

  // Indicate save is active, in case something, like
  // signaling the end of a sync, needs to run after
  // a save, via runAfterSaves.
  this._saveAccountStateActive = true;
  if (!this._deferredSaveAccountCalls) {
    this._deferredSaveAccountCalls = [];
  }

  if (callback)
    this.runAfterSaves(callback);

  var perFolderStuff = [], self = this;
  for (var iFolder = 0; iFolder < this.folders.length; iFolder++) {
    var folderPub = this.folders[iFolder],
        folderStorage = this._folderStorages[folderPub.id],
        folderStuff = folderStorage.generatePersistenceInfo();
    if (folderStuff)
      perFolderStuff.push(folderStuff);
  }
  this._LOG.saveAccountState(reason);
  var trans = this._db.saveAccountFolderStates(
    this.id, this._folderInfos, perFolderStuff,
    this._deadFolderIds,
    function stateSaved() {
      this._saveAccountStateActive = false;

      // NB: we used to log when the save completed, but it ended up being
      // annoying to the unit tests since we don't block our actions on
      // the completion of the save at this time.

      var callbacks = this._deferredSaveAccountCalls;
      this._deferredSaveAccountCalls = [];
      callbacks.forEach(function(callback) {
        callback();
      });
    }.bind(this),
    reuseTrans);
  this._deadFolderIds = null;
  return trans;
};

exports.runAfterSaves = function(callback) {
  if (this._saveAccountStateActive || this._saveAccountIsImminent) {
    this._deferredSaveAccountCalls.push(callback);
  } else {
    callback();
  }
};

}); // end define
;
define('events',['require','exports','module'],function (require, exports, module) {
if (!process.EventEmitter) process.EventEmitter = function () {};

var EventEmitter = exports.EventEmitter = process.EventEmitter;
var isArray = typeof Array.isArray === 'function'
    ? Array.isArray
    : function (xs) {
        return Object.toString.call(xs) === '[object Array]'
    }
;

// By default EventEmitters will print a warning if more than
// 10 listeners are added to it. This is a useful default which
// helps finding memory leaks.
//
// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
var defaultMaxListeners = 10;
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!this._events) this._events = {};
  this._events.maxListeners = n;
};


EventEmitter.prototype.emit = function(type) {
  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events || !this._events.error ||
        (isArray(this._events.error) && !this._events.error.length))
    {
      if (arguments[1] instanceof Error) {
        throw arguments[1]; // Unhandled 'error' event
      } else {
        throw new Error("Uncaught, unspecified 'error' event.");
      }
      return false;
    }
  }

  if (!this._events) return false;
  var handler = this._events[type];
  if (!handler) return false;

  if (typeof handler == 'function') {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        var args = Array.prototype.slice.call(arguments, 1);
        handler.apply(this, args);
    }
    return true;

  } else if (isArray(handler)) {
    var args = Array.prototype.slice.call(arguments, 1);

    var listeners = handler.slice();
    for (var i = 0, l = listeners.length; i < l; i++) {
      listeners[i].apply(this, args);
    }
    return true;

  } else {
    return false;
  }
};

// EventEmitter is defined in src/node_events.cc
// EventEmitter.prototype.emit() is also defined there.
EventEmitter.prototype.addListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('addListener only takes instances of Function');
  }

  if (!this._events) this._events = {};

  // To avoid recursion in the case that type == "newListeners"! Before
  // adding it to the listeners, first emit "newListeners".
  this.emit('newListener', type, listener);

  if (!this._events[type]) {
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  } else if (isArray(this._events[type])) {

    // Check for listener leak
    if (!this._events[type].warned) {
      var m;
      if (this._events.maxListeners !== undefined) {
        m = this._events.maxListeners;
      } else {
        m = defaultMaxListeners;
      }

      if (m && m > 0 && this._events[type].length > m) {
        this._events[type].warned = true;
        console.error('(node) warning: possible EventEmitter memory ' +
                      'leak detected. %d listeners added. ' +
                      'Use emitter.setMaxListeners() to increase limit.',
                      this._events[type].length);
        console.trace();
      }
    }

    // If we've already got an array, just append.
    this._events[type].push(listener);
  } else {
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  var self = this;
  self.on(type, function g() {
    self.removeListener(type, g);
    listener.apply(this, arguments);
  });

  return this;
};

EventEmitter.prototype.removeListener = function(type, listener) {
  if ('function' !== typeof listener) {
    throw new Error('removeListener only takes instances of Function');
  }

  // does not use listeners(), so no side effect of creating _events[type]
  if (!this._events || !this._events[type]) return this;

  var list = this._events[type];

  if (isArray(list)) {
    var i = list.indexOf(listener);
    if (i < 0) return this;
    list.splice(i, 1);
    if (list.length == 0)
      delete this._events[type];
  } else if (this._events[type] === listener) {
    delete this._events[type];
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  // does not use listeners(), so no side effect of creating _events[type]
  if (type && this._events && this._events[type]) this._events[type] = null;
  if (!type) this._events = {};
  return this;
};

EventEmitter.prototype.listeners = function(type) {
  if (!this._events) this._events = {};
  if (!this._events[type]) this._events[type] = [];
  if (!isArray(this._events[type])) {
    this._events[type] = [this._events[type]];
  }
  return this._events[type];
};

});
define('util',['require','exports','module','events'],function (require, exports, module) {
var events = require('events');

exports.print = function () {};
exports.puts = function () {};
exports.debug = function() {};

exports.log = function (msg) {};

exports.pump = null;

exports.inherits = function(ctor, superCtor) {
  ctor.super_ = superCtor;
  ctor.prototype = Object.create(superCtor.prototype, {
    constructor: {
      value: ctor,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
};

});
define('stream',['require','exports','module','events','util'],function (require, exports, module) {
var events = require('events');
var util = require('util');

function Stream() {
  events.EventEmitter.call(this);
}
util.inherits(Stream, events.EventEmitter);
module.exports = Stream;
// Backwards-compat with node 0.4.x
Stream.Stream = Stream;

Stream.prototype.pipe = function(dest, options) {
  var source = this;

  function ondata(chunk) {
    if (dest.writable) {
      if (false === dest.write(chunk) && source.pause) {
        source.pause();
      }
    }
  }

  source.on('data', ondata);

  function ondrain() {
    if (source.readable && source.resume) {
      source.resume();
    }
  }

  dest.on('drain', ondrain);

  // If the 'end' option is not supplied, dest.end() will be called when
  // source gets the 'end' or 'close' events.  Only dest.end() once, and
  // only when all sources have ended.
  if (!dest._isStdio && (!options || options.end !== false)) {
    dest._pipeCount = dest._pipeCount || 0;
    dest._pipeCount++;

    source.on('end', onend);
    source.on('close', onclose);
  }

  var didOnEnd = false;
  function onend() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.end();
  }


  function onclose() {
    if (didOnEnd) return;
    didOnEnd = true;

    dest._pipeCount--;

    // remove the listeners
    cleanup();

    if (dest._pipeCount > 0) {
      // waiting for other incoming streams to end.
      return;
    }

    dest.destroy();
  }

  // don't leave dangling pipes when there are errors.
  function onerror(er) {
    cleanup();
    if (this.listeners('error').length === 0) {
      throw er; // Unhandled stream error in pipe.
    }
  }

  source.on('error', onerror);
  dest.on('error', onerror);

  // remove all the event listeners that were added.
  function cleanup() {
    source.removeListener('data', ondata);
    dest.removeListener('drain', ondrain);

    source.removeListener('end', onend);
    source.removeListener('close', onclose);

    source.removeListener('error', onerror);
    dest.removeListener('error', onerror);

    source.removeListener('end', cleanup);
    source.removeListener('close', cleanup);

    dest.removeListener('end', cleanup);
    dest.removeListener('close', cleanup);
  }

  source.on('end', cleanup);
  source.on('close', cleanup);

  dest.on('end', cleanup);
  dest.on('close', cleanup);

  dest.emit('pipe', source);

  // Allow for unix-like usage: A.pipe(B).pipe(C)
  return dest;
};

});
define('crypto',['require','exports','module'],function(require, exports, module) {

exports.createHash = function(algorithm) {
  if (algorithm !== "md5")
    throw new Error("MD5 or bust!");

  var data = "";
  return {
    update: function(addData) {
      data += addData;
    },
    digest: function(encoding) {
      switch (encoding) {
        case "hex":
          return hex_md5(data);
        case "base64":
          return b64_md5(data);
        default:
          throw new Error("The encoding is no good: " + encoding);
      }
    }
  };
};

/*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;   /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = "";  /* base-64 pad character. "=" for strict RFC compliance   */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function hex_md5(s)    { return rstr2hex(rstr_md5(str2rstr_utf8(s))); }
function b64_md5(s)    { return rstr2b64(rstr_md5(str2rstr_utf8(s))); }
function any_md5(s, e) { return rstr2any(rstr_md5(str2rstr_utf8(s)), e); }
function hex_hmac_md5(k, d)
  { return rstr2hex(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d))); }
function b64_hmac_md5(k, d)
  { return rstr2b64(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d))); }
function any_hmac_md5(k, d, e)
  { return rstr2any(rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d)), e); }

/*
 * Perform a simple self-test to see if the VM is working
 */
function md5_vm_test()
{
  return hex_md5("abc").toLowerCase() == "900150983cd24fb0d6963f7d28e17f72";
}

/*
 * Calculate the MD5 of a raw string
 */
function rstr_md5(s)
{
  return binl2rstr(binl_md5(rstr2binl(s), s.length * 8));
}

/*
 * Calculate the HMAC-MD5, of a key and some data (raw strings)
 */
function rstr_hmac_md5(key, data)
{
  var bkey = rstr2binl(key);
  if(bkey.length > 16) bkey = binl_md5(bkey, key.length * 8);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = binl_md5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
  return binl2rstr(binl_md5(opad.concat(hash), 512 + 128));
}

/*
 * Convert a raw string to a hex string
 */
function rstr2hex(input)
{
  try { hexcase } catch(e) { hexcase=0; }
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var output = "";
  var x;
  for(var i = 0; i < input.length; i++)
  {
    x = input.charCodeAt(i);
    output += hex_tab.charAt((x >>> 4) & 0x0F)
           +  hex_tab.charAt( x        & 0x0F);
  }
  return output;
}

/*
 * Convert a raw string to a base-64 string
 */
function rstr2b64(input)
{
  try { b64pad } catch(e) { b64pad=''; }
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var output = "";
  var len = input.length;
  for(var i = 0; i < len; i += 3)
  {
    var triplet = (input.charCodeAt(i) << 16)
                | (i + 1 < len ? input.charCodeAt(i+1) << 8 : 0)
                | (i + 2 < len ? input.charCodeAt(i+2)      : 0);
    for(var j = 0; j < 4; j++)
    {
      if(i * 8 + j * 6 > input.length * 8) output += b64pad;
      else output += tab.charAt((triplet >>> 6*(3-j)) & 0x3F);
    }
  }
  return output;
}

/*
 * Convert a raw string to an arbitrary string encoding
 */
function rstr2any(input, encoding)
{
  var divisor = encoding.length;
  var i, j, q, x, quotient;

  /* Convert to an array of 16-bit big-endian values, forming the dividend */
  var dividend = Array(Math.ceil(input.length / 2));
  for(i = 0; i < dividend.length; i++)
  {
    dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
  }

  /*
   * Repeatedly perform a long division. The binary array forms the dividend,
   * the length of the encoding is the divisor. Once computed, the quotient
   * forms the dividend for the next step. All remainders are stored for later
   * use.
   */
  var full_length = Math.ceil(input.length * 8 /
                                    (Math.log(encoding.length) / Math.log(2)));
  var remainders = Array(full_length);
  for(j = 0; j < full_length; j++)
  {
    quotient = Array();
    x = 0;
    for(i = 0; i < dividend.length; i++)
    {
      x = (x << 16) + dividend[i];
      q = Math.floor(x / divisor);
      x -= q * divisor;
      if(quotient.length > 0 || q > 0)
        quotient[quotient.length] = q;
    }
    remainders[j] = x;
    dividend = quotient;
  }

  /* Convert the remainders to the output string */
  var output = "";
  for(i = remainders.length - 1; i >= 0; i--)
    output += encoding.charAt(remainders[i]);

  return output;
}

/*
 * Encode a string as utf-8.
 * For efficiency, this assumes the input is valid utf-16.
 */
function str2rstr_utf8(input)
{
  var output = "";
  var i = -1;
  var x, y;

  while(++i < input.length)
  {
    /* Decode utf-16 surrogate pairs */
    x = input.charCodeAt(i);
    y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
    if(0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF)
    {
      x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
      i++;
    }

    /* Encode output as utf-8 */
    if(x <= 0x7F)
      output += String.fromCharCode(x);
    else if(x <= 0x7FF)
      output += String.fromCharCode(0xC0 | ((x >>> 6 ) & 0x1F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0xFFFF)
      output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0x1FFFFF)
      output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
                                    0x80 | ((x >>> 12) & 0x3F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
  }
  return output;
}

/*
 * Encode a string as utf-16
 */
function str2rstr_utf16le(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode( input.charCodeAt(i)        & 0xFF,
                                  (input.charCodeAt(i) >>> 8) & 0xFF);
  return output;
}

function str2rstr_utf16be(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF,
                                   input.charCodeAt(i)        & 0xFF);
  return output;
}

/*
 * Convert a raw string to an array of little-endian words
 * Characters >255 have their high-byte silently ignored.
 */
function rstr2binl(input)
{
  var output = Array(input.length >> 2);
  for(var i = 0; i < output.length; i++)
    output[i] = 0;
  for(var i = 0; i < input.length * 8; i += 8)
    output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (i%32);
  return output;
}

/*
 * Convert an array of little-endian words to a string
 */
function binl2rstr(input)
{
  var output = "";
  for(var i = 0; i < input.length * 32; i += 8)
    output += String.fromCharCode((input[i>>5] >>> (i % 32)) & 0xFF);
  return output;
}

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length.
 */
function binl_md5(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

    a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
    d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
    c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
    b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
    d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
    b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
    a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
    d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
    b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
    d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
    c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
    b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

    a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
    d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
    b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
    a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
    d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
    c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
    b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
    a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
    d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
    c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
    b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
    d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
    b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

    a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
    d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
    b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
    a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
    d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
    c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
    b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
    b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
    d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
    b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
    c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
    a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
  }
  return Array(a, b, c, d);
}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5_cmn(q, a, b, x, s, t)
{
  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
}
function md5_ff(a, b, c, d, x, s, t)
{
  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
}
function md5_gg(a, b, c, d, x, s, t)
{
  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
}
function md5_hh(a, b, c, d, x, s, t)
{
  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5_ii(a, b, c, d, x, s, t)
{
  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bit_rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

});

/*global define*/
define('mix',[],function() {
  /**
   * Mixes properties from source into target.
   * @param  {Object} target   target of the mix.
   * @param  {Object} source   source object providing properties to mix in.
   * @param  {Boolean} override if target already has a the property,
   * override it with the one from source.
   * @return {Object}          the target object, now with the new properties
   * mixed in.
   */
  return function mix(target, source, override) {
    Object.keys(source).forEach(function(key) {
      if (!target.hasOwnProperty(key) || override)
        target[key] = source[key];
    });
    return target;
  };
});

/**
 * mimelib now uses an 'encoding' module to wrap its use of iconv versus
 * iconv-lite.  This is a good thing from our perspective because it allows
 * the API to be more sane.
 **/

define('encoding',['require','exports','module'],function(require, exports, module) {

// originally from https://github.com/andris9/encoding/blob/master/index.js
// (MIT licensed)
/**
 * Converts charset name from something TextDecoder does not understand to
 * something it does understand for the set of weird charset names we have
 * seen thus far.  Things it does not understand are passed through; you
 * need to be prepared for TextDecoder to throw an exception if you give
 * it something ridiculous.
 *
 * @param {String} name Character set
 * @return {String} Character set name
 */
function checkEncoding(name){
    name = (name || "").toString().trim().toLowerCase().
        // this handles aliases with dashes and underscores too; built-in
        // aliase are only for latin1, latin2, etc.
        replace(/^latin[\-_]?(\d+)$/, "iso-8859-$1").
        // win949, win-949, ms949 => windows-949
        replace(/^(?:(?:win(?:dows)?)|ms)[\-_]?(\d+)$/, "windows-$1").
        replace(/^utf[\-_]?(\d+)$/, "utf-$1").
        replace(/^us_?ascii$/, "ascii"); // maps to windows-1252
    return name;
}
exports.checkEncoding = checkEncoding;

var ENCODER_OPTIONS = { fatal: false };

exports.convert = function(str, destEnc, sourceEnc, ignoredUseLite) {
  // TextEncoder only supports utf-8/utf-16be/utf-16le and we will never
  // use a utf-16 encoding, so just hard-code this and save ourselves some
  // weird edge case trouble in the future.
  destEnc = 'utf-8';
  sourceEnc = checkEncoding(sourceEnc || 'utf-8');

  if (destEnc === sourceEnc)
    return new Buffer(str, 'utf-8');

  // - decoding (Uint8Array => String)
  else if (/^utf-8$/.test(destEnc)) {
    var decoder;
    // The encoding comes from the message, so it could be anything.
    // TextDecoder throws if it's not a supported encoding, so catch that
    // and fall back to utf-8 decoding in that case so we get something, even
    // if it's full of replacement characters, etc.
    try {
      decoder = new TextDecoder(sourceEnc, ENCODER_OPTIONS);
    }
    catch (ex) {
      // Do log the encoding that we failed to support so that if we get bugs
      // reporting gibberish
      console.warn('Unsupported encoding', sourceEnc, 'switching to utf-8');
      decoder = new TextDecoder('utf-8', ENCODER_OPTIONS);
    }
    if (typeof(str) === 'string')
      str = new Buffer(str, 'binary');
    // XXX strictly speaking, we should be returning a buffer...
    return decoder.decode(str);
  }
  // - encoding (String => Uint8Array)
  else {
    var idxSlash = destEnc.indexOf('/');
    // ignore '//TRANSLIT//IGNORE' and the like.
    if (idxSlash !== -1 && destEnc[idxSlash+1] === '/')
      destEnc = destEnc.substring(0, idxSlash);

    var encoder = new TextEncoder(destEnc, ENCODER_OPTIONS);
    return encoder.encode(str);
  }
};

});

/* Holds localized strings fo mailchew. mailbridge will set the values.
 * This is broken out as a separate module so that mailchew can be loaded
 * async as needed.
 **/

define('mailapi/mailchew-strings',
  [
    'exports',
    'events'
  ],
  function(
    exports,
    $EventEmitter
  ) {

exports.events = new $EventEmitter.EventEmitter();

exports.set = function set(strings) {
  exports.strings = strings;
  exports.events.emit('strings', strings);
};

});

/*global define */
define('mailapi/slice_bridge_proxy',
  [
    'exports'
  ],
  function(
    exports
  ) {

function SliceBridgeProxy(bridge, ns, handle) {
  this._bridge = bridge;
  this._ns = ns;
  this._handle = handle;
  this.__listener = null;

  this.status = 'synced';
  this.progress = 0.0;
  this.atTop = false;
  this.atBottom = false;
  /**
   * Can we potentially grow the slice in the negative direction if explicitly
   * desired by the user or UI desires to be up-to-date?  For example,
   * triggering an IMAP sync.
   *
   * This is only really meaningful when `atTop` is true; if we are not at the
   * top then this value will be false.
   *
   * For messages, the implication is that we are not synchronized through 'now'
   * if this value is true (and atTop is true).
   */
  this.userCanGrowUpwards = false;
  this.userCanGrowDownwards = false;
  /**
   *  We batch both slices and updates into the same queue. The MailAPI checks
   *  to differentiate between the two.
   */
  this.pendingUpdates = [];
  this.scheduledUpdate = false;
}

exports.SliceBridgeProxy = SliceBridgeProxy;

SliceBridgeProxy.prototype = {
  /**
   * Issue a splice to add and remove items.
   * @param {number} newEmailCount Number of new emails synced during this
   *     slice request.
   */
  sendSplice: function sbp_sendSplice(index, howMany, addItems, requested,
                                      moreExpected, newEmailCount) {
    var updateSplice = {
      index: index,
      howMany: howMany,
      addItems: addItems,
      requested: requested,
      moreExpected: moreExpected,
      newEmailCount: newEmailCount,
      type: 'slice',
    };
    this.addUpdate(updateSplice);
  },

  /**
   * Issue an update for existing items.
   *
   * @param {Array[]} indexUpdatesRun
   *   Flattened pairs of index and the updated object wire representation.
   */
  sendUpdate: function sbp_sendUpdate(indexUpdatesRun) {
    var update = {
      updates: indexUpdatesRun,
      type: 'update',
    };
    this.addUpdate(update);
  },

  /**
   * @param {number} newEmailCount Number of new emails synced during this
   *     slice request.
   */
  sendStatus: function sbp_sendStatus(status, requested, moreExpected,
                                      progress, newEmailCount) {
    this.status = status;
    if (progress != null) {
      this.progress = progress;
    }
    this.sendSplice(0, 0, [], requested, moreExpected, newEmailCount);
  },

  sendSyncProgress: function(progress) {
    this.progress = progress;
    this.sendSplice(0, 0, [], true, true);
  },

  addUpdate: function sbp_addUpdate(update) {
    this.pendingUpdates.push(update);
    // If we batched a lot, flush now. Otherwise
    // we sometimes get into a position where nothing happens
    // and then a bunch of updates occur, causing jank
    if (this.pendingUpdates.length > 5) {
      this.flushUpdates();
    } else if (!this.scheduledUpdate) {
      window.setZeroTimeout(this.flushUpdates.bind(this));
      this.scheduledUpdate = true;
    }
  },

  flushUpdates: function sbp_flushUpdates() {
    this._bridge.__sendMessage({
      type: 'batchSlice',
      handle: this._handle,
      status: this.status,
      progress: this.progress,
      atTop: this.atTop,
      atBottom: this.atBottom,
      userCanGrowUpwards: this.userCanGrowUpwards,
      userCanGrowDownwards: this.userCanGrowDownwards,
      sliceUpdates: this.pendingUpdates
    });

    this.pendingUpdates = [];
    this.scheduledUpdate = false;
  },

  die: function sbp_die() {
    if (this.__listener)
      this.__listener.die();
  },
};

});

/**
 *
 **/

define('mailapi/mailbridge',
  [
    'rdcommon/log',
    './util',
    './mailchew-strings',
    './date',
    './slice_bridge_proxy',
    'require',
    'module',
    'exports'
  ],
  function(
    $log,
    $imaputil,
    $mailchewStrings,
    $date,
    $sliceBridgeProxy,
    require,
    $module,
    exports
  ) {
var bsearchForInsert = $imaputil.bsearchForInsert,
    bsearchMaybeExists = $imaputil.bsearchMaybeExists,
    SliceBridgeProxy = $sliceBridgeProxy.SliceBridgeProxy;

function toBridgeWireOn(x) {
  return x.toBridgeWire();
}

var FOLDER_TYPE_TO_SORT_PRIORITY = {
  account: 'a',
  inbox: 'c',
  starred: 'e',
  important: 'f',
  drafts: 'g',
  localdrafts: 'h',
  queue: 'i',
  sent: 'j',
  junk: 'k',
  trash: 'm',
  archive: 'o',
  normal: 'z',
  // nomail folders are annoying since they are basically just hierarchy,
  //  but they are also rare and should only happen amongst normal folders.
  nomail: 'z',
};

/**
 * Make a folder sorting function that groups folders by account, puts the
 * account header first in that group, maps priorities using
 * FOLDER_TYPE_TO_SORT_PRIORITY, then sorts by path within that.
 *
 * This is largely necessitated by localeCompare being at the mercy of glibc's
 * locale database and failure to fallback to unicode code points for
 * comparison purposes.
 */
function makeFolderSortString(account, folder) {
  if (!folder)
    return account.id;

  var parentFolder = account.getFolderMetaForFolderId(folder.parentId);
  return makeFolderSortString(account, parentFolder) + '!' +
         FOLDER_TYPE_TO_SORT_PRIORITY[folder.type] + '!' +
         folder.name.toLocaleLowerCase();
}

function strcmp(a, b) {
  if (a < b)
    return -1;
  else if (a > b)
    return 1;
  return 0;
}

function checkIfAddressListContainsAddress(list, addrPair) {
  if (!list)
    return false;
  var checkAddress = addrPair.address;
  for (var i = 0; i < list.length; i++) {
    if (list[i].address === checkAddress)
      return true;
  }
  return false;
}

/**
 * There is exactly one `MailBridge` instance for each `MailAPI` instance.
 * `same-frame-setup.js` is the only place that hooks them up together right
 * now.
 */
function MailBridge(universe, name) {
  this.universe = universe;
  this.universe.registerBridge(this);

  this._LOG = LOGFAB.MailBridge(this, universe._LOG, name);
  /** @dictof[@key[handle] @value[BridgedViewSlice]]{ live slices } */
  this._slices = {};
  /** @dictof[@key[namespace] @value[@listof[BridgedViewSlice]]] */
  this._slicesByType = {
    accounts: [],
    identities: [],
    folders: [],
    headers: [],
    matchedHeaders: [],
  };

  /**
   * Observed bodies in the format of:
   *
   * @dictof[
   *   @key[suid]
   *   @value[@dictof[
   *     @key[handleId]
   *     @value[@oneof[Function null]]
   *   ]]
   * ]
   *
   * Similar in concept to folder slices but specific to bodies.
   */
  this._observedBodies = {};

  // outstanding persistent objects that aren't slices. covers: composition
  this._pendingRequests = {};
  //
  this._lastUndoableOpPair = null;
}
exports.MailBridge = MailBridge;
MailBridge.prototype = {
  __sendMessage: function(msg) {
    throw new Error('This is supposed to get hidden by an instance var.');
  },

  __receiveMessage: function mb___receiveMessage(msg) {
    var implCmdName = '_cmd_' + msg.type;
    if (!(implCmdName in this)) {
      this._LOG.badMessageType(msg.type);
      return;
    }
    var rval = this._LOG.cmd(msg.type, this, this[implCmdName], msg);
  },

  _cmd_ping: function mb__cmd_ping(msg) {
    this.__sendMessage({
      type: 'pong',
      handle: msg.handle,
    });
  },

  _cmd_modifyConfig: function mb__cmd_modifyConfig(msg) {
    this.universe.modifyConfig(msg.mods);
  },

  /**
   * Public api to verify if body has observers.
   *
   *
   *   MailBridge.bodyHasObservers(header.id) // => true/false.
   *
   */
  bodyHasObservers: function(suid) {
    return !!this._observedBodies[suid];
  },

  notifyConfig: function(config) {
    this.__sendMessage({
      type: 'config',
      config: config,
    });
  },

  _cmd_debugSupport: function mb__cmd_debugSupport(msg) {
    switch (msg.cmd) {
      case 'setLogging':
        this.universe.modifyConfig({ debugLogging: msg.arg });
        break;

      case 'dumpLog':
        switch (msg.arg) {
          case 'storage':
            this.universe.dumpLogToDeviceStorage();
            break;
        }
        break;
    }
  },

  _cmd_setInteractive: function mb__cmd_setInteractive(msg) {
    this.universe.setInteractive();
  },

  _cmd_localizedStrings: function mb__cmd_localizedStrings(msg) {
    $mailchewStrings.set(msg.strings);
  },

  _cmd_tryToCreateAccount: function mb__cmd_tryToCreateAccount(msg) {
    var self = this;
    this.universe.tryToCreateAccount(msg.details, msg.domainInfo,
                                     function(error, account, errorDetails) {
        self.__sendMessage({
            type: 'tryToCreateAccountResults',
            handle: msg.handle,
            account: account ? account.toBridgeWire() : null,
            error: error,
            errorDetails: errorDetails,
          });
      });
  },

  _cmd_clearAccountProblems: function mb__cmd_clearAccountProblems(msg) {
    var account = this.universe.getAccountForAccountId(msg.accountId),
        self = this;
    account.checkAccount(function(err) {
      // If we succeeded or the problem was not an authentication, assume
      // everything went fine and clear the problems.  This includes the case
      // we're offline.
      if (!err || (
          err !== 'bad-user-or-pass' &&
          err !== 'needs-app-pass' &&
          err !== 'imap-disabled'
        )) {
        self.universe.clearAccountProblems(account);
      }
      // The login information is still bad; re-send the bad login notification.
      else {
        // This is only being sent over this, the same bridge the clear request
        // came from rather than sent via the mailuniverse.  No point having the
        // notifications stack up on inactive UIs.
        self.notifyBadLogin(account, err);
      }
      self.__sendMessage({
        type: 'clearAccountProblems',
        handle: msg.handle,
      });
    });
  },

  _cmd_modifyAccount: function mb__cmd_modifyAccount(msg) {
    var account = this.universe.getAccountForAccountId(msg.accountId),
        accountDef = account.accountDef;

    for (var key in msg.mods) {
      var val = msg.mods[key];

      switch (key) {
        case 'name':
          accountDef.name = val;
          break;

        case 'username':
          accountDef.credentials.username = val;
          break;
        case 'password':
          accountDef.credentials.password = val;
          break;

        case 'identities':
          // TODO: support identity mutation
          // we expect a list of identity mutation objects, namely an id and the
          // rest are attributes to change
          break;

        case 'servers':
          // TODO: support server mutation
          // we expect a list of server mutation objects; namely, the type names
          // the server and the rest are attributes to change
          break;

        case 'syncRange':
          accountDef.syncRange = val;
          break;

        case 'syncInterval':
          accountDef.syncInterval = val;
          break;

        case 'notifyOnNew':
          accountDef.notifyOnNew = val;
          break;

        case 'setAsDefault':
          // Weird things can happen if the device's clock goes back in time,
          // but this way, at least the user can change their default if they
          // cycle through their accounts.
          if (val)
            accountDef.defaultPriority = $date.NOW();
          break;
      }
    }

    this.universe.saveAccountDef(accountDef, null);
  },

  _cmd_deleteAccount: function mb__cmd_deleteAccount(msg) {
    this.universe.deleteAccount(msg.accountId);
  },

  notifyBadLogin: function mb_notifyBadLogin(account, problem) {
    this.__sendMessage({
      type: 'badLogin',
      account: account.toBridgeWire(),
      problem: problem
    });
  },

  _cmd_viewAccounts: function mb__cmd_viewAccounts(msg) {
    var proxy = this._slices[msg.handle] =
          new SliceBridgeProxy(this, 'accounts', msg.handle);
    proxy.markers = this.universe.accounts.map(function(x) { return x.id; });

    this._slicesByType['accounts'].push(proxy);
    var wireReps = this.universe.accounts.map(toBridgeWireOn);
    // send all the accounts in one go.
    proxy.sendSplice(0, 0, wireReps, true, false);
  },

  notifyAccountAdded: function mb_notifyAccountAdded(account) {
    var accountWireRep = account.toBridgeWire();
    var i, proxy, slices, wireSplice = null, markersSplice = null;
    // -- notify account slices
    slices = this._slicesByType['accounts'];
    for (i = 0; i < slices.length; i++) {
      proxy = slices[i];
      proxy.sendSplice(proxy.markers.length, 0, [accountWireRep], false, false);
      proxy.markers.push(account.id);
    }

    // -- notify folder slices
    accountWireRep = account.toBridgeFolder();
    slices = this._slicesByType['folders'];
    var startMarker = makeFolderSortString(account, accountWireRep),
        idxStart;
    for (i = 0; i < slices.length; i++) {
      proxy = slices[i];
      // If it's filtered to an account, it can't care about us.  (You can't
      // know about an account before it's created.)
      if (proxy.mode === 'account')
        continue;

      idxStart = bsearchForInsert(proxy.markers, startMarker, strcmp);
      wireSplice = [accountWireRep];
      markersSplice = [startMarker];
      for (var iFolder = 0; iFolder < account.folders.length; iFolder++) {
        var folder = account.folders[iFolder],
            folderMarker = makeFolderSortString(account, folder),
            idxFolder = bsearchForInsert(markersSplice, folderMarker, strcmp);
        wireSplice.splice(idxFolder, 0, folder);
        markersSplice.splice(idxFolder, 0, folderMarker);
      }
      proxy.sendSplice(idxStart, 0, wireSplice, false, false);
      proxy.markers.splice.apply(proxy.markers,
                                 [idxStart, 0].concat(markersSplice));
    }
  },

  /**
   * Generate modifications for an account.  We only generate this for account
   * queries proper and not the folder representations of accounts because we
   * define that there is nothing interesting mutable for the folder
   * representations.
   */
  notifyAccountModified: function(account) {
    var slices = this._slicesByType['accounts'],
        accountWireRep = account.toBridgeWire();
    for (var i = 0; i < slices.length; i++) {
      var proxy = slices[i];
      var idx = proxy.markers.indexOf(account.id);
      if (idx !== -1) {
        proxy.sendUpdate([idx, accountWireRep]);
      }
    }
  },

  notifyAccountRemoved: function(accountId) {
    var i, proxy, slices;
    // -- notify account slices
    slices = this._slicesByType['accounts'];
    for (i = 0; i < slices.length; i++) {
      proxy = slices[i];
      var idx = proxy.markers.indexOf(accountId);
      if (idx !== -1) {
        proxy.sendSplice(idx, 1, [], false, false);
        proxy.markers.splice(idx, 1);
      }
    }

    // -- notify folder slices
    slices = this._slicesByType['folders'];
    var startMarker = accountId + '!!',
        endMarker = accountId + '!|';
    for (i = 0; i < slices.length; i++) {
      proxy = slices[i];
      var idxStart = bsearchForInsert(proxy.markers, startMarker,
                                      strcmp),
          idxEnd = bsearchForInsert(proxy.markers, endMarker,
                                    strcmp);
      if (idxEnd !== idxStart) {
        proxy.sendSplice(idxStart, idxEnd - idxStart, [], false, false);
        proxy.markers.splice(idxStart, idxEnd - idxStart);
      }
    }
  },

  _cmd_viewSenderIdentities: function mb__cmd_viewSenderIdentities(msg) {
    var proxy = this._slices[msg.handle] =
          new SliceBridgeProxy(this, identities, msg.handle);
    this._slicesByType['identities'].push(proxy);
    var wireReps = this.universe.identities;
    // send all the identities in one go.
    proxy.sendSplice(0, 0, wireReps, true, false);
  },

  _cmd_requestBodies: function(msg) {
    var self = this;
    this.universe.downloadBodies(msg.messages, msg.options, function() {
      self.__sendMessage({
        type: 'requestBodiesComplete',
        handle: msg.handle,
        requestId: msg.requestId
      });
    });
  },

  notifyFolderAdded: function(account, folderMeta) {
    var newMarker = makeFolderSortString(account, folderMeta);

    var slices = this._slicesByType['folders'];
    for (var i = 0; i < slices.length; i++) {
      var proxy = slices[i];
      var idx = bsearchForInsert(proxy.markers, newMarker, strcmp);
      proxy.sendSplice(idx, 0, [folderMeta], false, false);
      proxy.markers.splice(idx, 0, newMarker);
    }
  },

  notifyFolderModified: function(account, folderMeta) {
    var marker = makeFolderSortString(account, folderMeta);

    var slices = this._slicesByType['folders'];
    for (var i = 0; i < slices.length; i++) {
      var proxy = slices[i];

      var idx = bsearchMaybeExists(proxy.markers, marker, strcmp);
      if (idx === null)
        continue;

      proxy.sendUpdate([idx, folderMeta]);
    }
  },

  notifyFolderRemoved: function(account, folderMeta) {
    var marker = makeFolderSortString(account, folderMeta);

    var slices = this._slicesByType['folders'];
    for (var i = 0; i < slices.length; i++) {
      var proxy = slices[i];

      var idx = bsearchMaybeExists(proxy.markers, marker, strcmp);
      if (idx === null)
        continue;
      proxy.sendSplice(idx, 1, [], false, false);
      proxy.markers.splice(idx, 1);
    }
  },

  /**
   * Sends a notification of a change in the body.  Because FolderStorage is
   * the authoritative store of body representations and access is currently
   * mediated through mutexes, this method should really only be called by
   * FolderStorage.updateMessageBody.
   *
   * @param suid {SUID}
   *   The message whose body representation has been updated
   * @param detail {Object}
   *   See {{#crossLink "FolderStorage/updateMessageBody"}{{/crossLink}} for
   *   more information on the structure of this object.
   * @param body {BodyInfo}
   *   The current representation of the body.
   */
  notifyBodyModified: function(suid, detail, body) {
    var handles = this._observedBodies[suid];
    var defaultHandler = this.__sendMessage;

    if (handles) {
      for (var handle in handles) {
        // the suid may have an existing handler which captures the output of
        // the notification instead of dispatching here... This allows us to
        // aggregate pending notifications while fetching the bodies so updates
        // never come before the actual body.
        var emit = handles[handle] || defaultHandler;
        emit.call(this, {
          type: 'bodyModified',
          handle: handle,
          bodyInfo: body,
          detail: detail
        });
      }
    }
  },

  _cmd_viewFolders: function mb__cmd_viewFolders(msg) {
    var proxy = this._slices[msg.handle] =
          new SliceBridgeProxy(this, 'folders', msg.handle);
    this._slicesByType['folders'].push(proxy);
    proxy.mode = msg.mode;
    proxy.argument = msg.argument;
    var markers = proxy.markers = [];

    var wireReps = [];

    function pushAccountFolders(acct) {
      for (var iFolder = 0; iFolder < acct.folders.length; iFolder++) {
        var folder = acct.folders[iFolder];
        var newMarker = makeFolderSortString(acct, folder);
        var idx = bsearchForInsert(markers, newMarker, strcmp);
        wireReps.splice(idx, 0, folder);
        markers.splice(idx, 0, newMarker);
      }
    }

    if (msg.mode === 'account') {
      pushAccountFolders(
        this.universe.getAccountForAccountId(msg.argument));
    }
    else {
      var accounts = this.universe.accounts.concat();

      // sort accounts by their id's
      accounts.sort(function (a, b) {
        return a.id.localeCompare(b.id);
      });

      for (var iAcct = 0; iAcct < accounts.length; iAcct++) {
        var acct = accounts[iAcct], acctBridgeRep = acct.toBridgeFolder(),
            acctMarker = makeFolderSortString(acct, acctBridgeRep),
            idxAcct = bsearchForInsert(markers, acctMarker, strcmp);

        wireReps.splice(idxAcct, 0, acctBridgeRep);
        markers.splice(idxAcct, 0, acctMarker);
        pushAccountFolders(acct);
      }
    }
    proxy.sendSplice(0, 0, wireReps, true, false);
  },

  _cmd_createFolder: function mb__cmd_createFolder(msg) {
    this.universe.createFolder(
      msg.accountId,
      msg.parentFolderId,
      msg.containOnlyOtherFolders);
  },

  _cmd_viewFolderMessages: function mb__cmd_viewFolderMessages(msg) {
    var proxy = this._slices[msg.handle] =
          new SliceBridgeProxy(this, 'headers', msg.handle);
    this._slicesByType['headers'].push(proxy);

    var account = this.universe.getAccountForFolderId(msg.folderId);
    account.sliceFolderMessages(msg.folderId, proxy);
  },

  _cmd_searchFolderMessages: function mb__cmd_searchFolderMessages(msg) {
    var proxy = this._slices[msg.handle] =
          new SliceBridgeProxy(this, 'matchedHeaders', msg.handle);
    this._slicesByType['matchedHeaders'].push(proxy);
    var account = this.universe.getAccountForFolderId(msg.folderId);
    account.searchFolderMessages(
      msg.folderId, proxy, msg.phrase, msg.whatToSearch);
  },

  _cmd_refreshHeaders: function mb__cmd_refreshHeaders(msg) {
    var proxy = this._slices[msg.handle];
    if (!proxy) {
      this._LOG.badSliceHandle(msg.handle);
      return;
    }

    if (proxy.__listener)
      proxy.__listener.refresh();
  },

  _cmd_growSlice: function mb__cmd_growSlice(msg) {
    var proxy = this._slices[msg.handle];
    if (!proxy) {
      this._LOG.badSliceHandle(msg.handle);
      return;
    }

    if (proxy.__listener)
      proxy.__listener.reqGrow(msg.dirMagnitude, msg.userRequestsGrowth);
  },

  _cmd_shrinkSlice: function mb__cmd_shrinkSlice(msg) {
    var proxy = this._slices[msg.handle];
    if (!proxy) {
      this._LOG.badSliceHandle(msg.handle);
      return;
    }

    if (proxy.__listener)
      proxy.__listener.reqNoteRanges(
        msg.firstIndex, msg.firstSuid, msg.lastIndex, msg.lastSuid);
  },

  _cmd_killSlice: function mb__cmd_killSlice(msg) {
    var proxy = this._slices[msg.handle];
    if (!proxy) {
      this._LOG.badSliceHandle(msg.handle);
      return;
    }

    delete this._slices[msg.handle];
    var proxies = this._slicesByType[proxy._ns],
        idx = proxies.indexOf(proxy);
    proxies.splice(idx, 1);
    proxy.die();

    this.__sendMessage({
      type: 'sliceDead',
      handle: msg.handle,
    });
  },

  _cmd_getBody: function mb__cmd_getBody(msg) {
    var self = this;
    // map the message id to the folder storage
    var folderStorage = this.universe.getFolderStorageForMessageSuid(msg.suid);

    // when requesting the body we also create a observer to notify the client
    // of events... We never want to send the updates before fetching the body
    // so we buffer them here with a temporary handler.
    var pendingUpdates = [];

    var catchPending = function catchPending(msg) {
      pendingUpdates.push(msg);
    };

    if (!this._observedBodies[msg.suid])
      this._observedBodies[msg.suid] = {};

    this._observedBodies[msg.suid][msg.handle] = catchPending;

    var handler = function(bodyInfo) {
      self.__sendMessage({
        type: 'gotBody',
        handle: msg.handle,
        bodyInfo: bodyInfo
      });

      // if all body reps where requested we verify that all are present
      // otherwise we begin the request for more body reps.
      if (
        msg.downloadBodyReps &&
        !folderStorage.messageBodyRepsDownloaded(bodyInfo)
      ) {

        self.universe.downloadMessageBodyReps(
          msg.suid,
          msg.date,
          function() { /* we don't care it will send update events */ }
        );
      }

      // dispatch pending updates...
      pendingUpdates.forEach(self.__sendMessage, self);
      pendingUpdates = null;

      // revert to default handler. Note! this is intentionally
      // set to null and not deleted if deleted the observer is removed.
      self._observedBodies[msg.suid][msg.handle] = null;
    };

    if (msg.withBodyReps)
      folderStorage.getMessageBodyWithReps(msg.suid, msg.date, handler);
    else
      folderStorage.getMessageBody(msg.suid, msg.date, handler);
  },

  _cmd_killBody: function(msg) {
    var handles = this._observedBodies[msg.id];
    if (handles) {
      delete handles[msg.handle];

      var purgeHandles = true;
      for (var key in handles) {
        purgeHandles = false;
        break;
      }

      if (purgeHandles) {
        delete this._observedBodies[msg.id];
      }
    }

    this.__sendMessage({
      type: 'bodyDead',
      handle: msg.handle
    });
  },

  _cmd_downloadAttachments: function mb__cmd__downloadAttachments(msg) {
    var self = this;
    this.universe.downloadMessageAttachments(
      msg.suid, msg.date, msg.relPartIndices, msg.attachmentIndices,
      function(err) {
        self.__sendMessage({
          type: 'downloadedAttachments',
          handle: msg.handle
        });
      });
  },

  //////////////////////////////////////////////////////////////////////////////
  // Message Mutation
  //
  // All mutations are told to the universe which breaks the modifications up on
  // a per-account basis.

  _cmd_modifyMessageTags: function mb__cmd_modifyMessageTags(msg) {
    // XXXYYY

    // - The mutations are written to the database for persistence (in case
    //   we fail to make the change in a timely fashion) and so that we can
    //   know enough to reverse the operation.
    // - Speculative changes are made to the headers in the database locally.

    var longtermIds = this.universe.modifyMessageTags(
      msg.opcode, msg.messages, msg.addTags, msg.removeTags);
    this.__sendMessage({
      type: 'mutationConfirmed',
      handle: msg.handle,
      longtermIds: longtermIds,
    });
  },

  _cmd_deleteMessages: function mb__cmd_deleteMessages(msg) {
    var longtermIds = this.universe.deleteMessages(
      msg.messages);
    this.__sendMessage({
      type: 'mutationConfirmed',
      handle: msg.handle,
      longtermIds: longtermIds,
    });
  },

  _cmd_moveMessages: function mb__cmd_moveMessages(msg) {
    var longtermIds = this.universe.moveMessages(
      msg.messages, msg.targetFolder);
    this.__sendMessage({
      type: 'mutationConfirmed',
      handle: msg.handle,
      longtermIds: longtermIds,
    });
  },

  _cmd_undo: function mb__cmd_undo(msg) {
    this.universe.undoMutation(msg.longtermIds);
  },

  //////////////////////////////////////////////////////////////////////////////
  // Composition

  _cmd_beginCompose: function mb__cmd_beginCompose(msg) {
    require(['mailapi/drafts/composer'], function ($composer) {
      var req = this._pendingRequests[msg.handle] = {
        type: 'compose',
        active: 'begin',
        account: null,
        persistedNamer: null,
        die: false
      };

      // - figure out the identity to use
      var account, identity, folderId;
      if (msg.mode === 'new' && msg.submode === 'folder')
        account = this.universe.getAccountForFolderId(msg.refSuid);
      else
        account = this.universe.getAccountForMessageSuid(msg.refSuid);
      req.account = account;

      identity = account.identities[0];

      // not doing something that needs a body just return an empty composer.
      if (msg.mode !== 'reply' && msg.mode !== 'forward') {
        return this.__sendMessage({
          type: 'composeBegun',
          handle: msg.handle,
          error: null,
          identity: identity,
          subject: '',
          body: { text: '', html: null },
          to: [],
          cc: [],
          bcc: [],
          references: null,
          attachments: [],
        });
      }

      var folderStorage =
        this.universe.getFolderStorageForMessageSuid(msg.refSuid);
      var self = this;
      folderStorage.getMessage(
        msg.refSuid, msg.refDate, { withBodyReps: true }, function(res) {

        if (!res) {
          // cannot compose a reply/fwd message without a header/body
          return console.warn(
            'Cannot compose message missing header/body: ',
            msg.refSuid
          );
        }

        var header = res.header;
        var bodyInfo = res.body;

        if (msg.mode === 'reply') {
          var rTo, rCc, rBcc;
          // clobber the sender's e-mail with the reply-to
          var effectiveAuthor = {
            name: msg.refAuthor.name,
            address: (header.replyTo && header.replyTo.address) ||
                     msg.refAuthor.address,
          };
          switch (msg.submode) {
            case 'list':
              // XXX we can't do this without headers we're not retrieving,
              // fall through for now.
            case null:
            case 'sender':
              rTo = [effectiveAuthor];
              rCc = rBcc = [];
              break;
            case 'all':
              // No need to change the lists if the author is already on the
              // reply lists.
              //
              // nb: Our logic here is fairly simple; Thunderbird's
              // nsMsgCompose.cpp does a lot of checking that we should
              // audit, although much of it could just be related to its
              // much more extensive identity support.
              if (checkIfAddressListContainsAddress(header.to,
                                                    effectiveAuthor) ||
                  checkIfAddressListContainsAddress(header.cc,
                                                    effectiveAuthor)) {
                rTo = header.to;
              }
              // add the author as the first 'to' person
              else {
                if (header.to && header.to.length)
                  rTo = [effectiveAuthor].concat(header.to);
                else
                  rTo = [effectiveAuthor];
              }
              rCc = header.cc;
              rBcc = header.bcc;
              break;
          }

          var referencesStr;
          if (bodyInfo.references) {
            referencesStr = bodyInfo.references.concat([msg.refGuid])
                              .map(function(x) { return '<' + x + '>'; })
                              .join(' ');
          }
          else if (msg.refGuid) {
            referencesStr = '<' + msg.refGuid + '>';
          }
          // ActiveSync does not thread so good
          else {
            referencesStr = '';
          }
          req.active = null;

          self.__sendMessage({
            type: 'composeBegun',
            handle: msg.handle,
            error: null,
            identity: identity,
            subject: $composer.mailchew
                       .generateReplySubject(msg.refSubject),
            // blank lines at the top are baked in
            body: $composer.mailchew.generateReplyBody(
                    bodyInfo.bodyReps, effectiveAuthor, msg.refDate,
                    identity, msg.refGuid),
            to: rTo,
            cc: rCc,
            bcc: rBcc,
            referencesStr: referencesStr,
            attachments: [],
          });
        }
        else {
          req.active = null;
          self.__sendMessage({
            type: 'composeBegun',
            handle: msg.handle,
            error: null,
            identity: identity,
            subject: $composer.mailchew
                       .generateForwardSubject(msg.refSubject),
            // blank lines at the top are baked in by the func
            body: $composer.mailchew.generateForwardMessage(
                    msg.refAuthor, msg.refDate, msg.refSubject,
                    header, bodyInfo, identity),
            // forwards have no assumed envelope information
            to: [],
            cc: [],
            bcc: [],
            // XXX imitate Thunderbird current or previous behaviour; I
            // think we ended up linking forwards into the conversation
            // they came from, but with an extra header so that it was
            // possible to detect it was a forward.
            references: null,
            attachments: [],
          });
        }
      });
    }.bind(this));
  },

  _cmd_attachBlobToDraft: function(msg) {
    // for ordering consistency reasons with other draft logic, this needs to
    // require composer as a dependency too.
    require(['mailapi/drafts/composer'], function ($composer) {
      var draftReq = this._pendingRequests[msg.draftHandle];
      if (!draftReq)
        return;

      this.universe.attachBlobToDraft(
        draftReq.account,
        draftReq.persistedNamer,
        msg.attachmentDef,
        function (err) {
          this.__sendMessage({
            type: 'attachedBlobToDraft',
            // Note! Our use of 'msg' here means that our reference to the Blob
            // will be kept alive slightly longer than the job keeps it alive,
            // but just slightly.
            handle: msg.handle,
            draftHandle: msg.draftHandle,
            err: err
          });
        }.bind(this));
    }.bind(this));
  },

  _cmd_detachAttachmentFromDraft: function(msg) {
    // for ordering consistency reasons with other draft logic, this needs to
    // require composer as a dependency too.
    require(['mailapi/drafts/composer'], function ($composer) {
    var req = this._pendingRequests[msg.draftHandle];
    if (!req)
      return;

    this.universe.detachAttachmentFromDraft(
      req.account,
      req.persistedNamer,
      msg.attachmentIndex,
      function (err) {
        this.__sendMessage({
          type: 'detachedAttachmentFromDraft',
          handle: msg.handle,
          draftHandle: msg.draftHandle,
          err: err
        });
      }.bind(this));
    }.bind(this));
  },

  _cmd_resumeCompose: function mb__cmd_resumeCompose(msg) {
    var req = this._pendingRequests[msg.handle] = {
      type: 'compose',
      active: 'resume',
      account: null,
      persistedNamer: msg.messageNamer,
      die: false
    };

    // NB: We are not acquiring the folder mutex here because
    var account = req.account =
          this.universe.getAccountForMessageSuid(msg.messageNamer.suid);
    var folderStorage = this.universe.getFolderStorageForMessageSuid(
                          msg.messageNamer.suid);
    var self = this;
    folderStorage.runMutexed('resumeCompose', function(callWhenDone) {
      function fail() {
        self.__sendMessage({
          type: 'composeBegun',
          handle: msg.handle,
          error: 'no-message'
        });
        callWhenDone();
      }
      folderStorage.getMessage(msg.messageNamer.suid, msg.messageNamer.date,
                               function(res) {
        try {
          if (!res.header || !res.body) {
            fail();
            return;
          }
          var header = res.header, body = res.body;

          // -- convert from header/body rep to compose rep

          var composeBody = {
            text: '',
            html: null,
          };

          // Body structure should be guaranteed, but add some checks.
          if (body.bodyReps.length >= 1 &&
              body.bodyReps[0].type === 'plain' &&
              body.bodyReps[0].content.length === 2 &&
              body.bodyReps[0].content[0] === 0x1) {
            composeBody.text = body.bodyReps[0].content[1];
          }
          // HTML is optional, but if present, should satisfy our guard
          if (body.bodyReps.length == 2 &&
              body.bodyReps[1].type === 'html') {
            composeBody.html = body.bodyReps[1].content;
          }

          var attachments = [];
          body.attachments.forEach(function(att) {
            attachments.push({
              name: att.name,
              blob: {
                size: att.sizeEstimate,
                type: att.type
              }
            });
          });

          req.active = null;
          self.__sendMessage({
            type: 'composeBegun',
            handle: msg.handle,
            error: null,
            identity: account.identities[0],
            subject: header.subject,
            body: composeBody,
            to: header.to,
            cc: header.cc,
            bcc: header.bcc,
            referencesStr: body.references,
            attachments: attachments
          });
          callWhenDone();
        }
        catch (ex) {
          fail(); // calls callWhenDone
        }
      });
    });
  },

  /**
   * Save a draft, delete a draft, or try and send a message.
   *
   * Drafts are saved in our IndexedDB storage. This is notable because we are
   * told about attachments via their Blobs.
   */
  _cmd_doneCompose: function mb__cmd_doneCompose(msg) {
    require(['mailapi/drafts/composer'], function ($composer) {
      var req = this._pendingRequests[msg.handle], self = this;
      if (!req) {
        return;
      }
      if (msg.command === 'die') {
        if (req.active) {
          req.die = true;
        }
        else {
          delete this._pendingRequests[msg.handle];
        }
        return;
      }
      var account;
      if (msg.command === 'delete') {
        function sendDeleted() {
          self.__sendMessage({
            type: 'doneCompose',
            handle: msg.handle,
            err: null,
            badAddresses: null,
            messageId: null,
            sentDate: null
          });
        }
        if (req.persistedNamer) {
          account = this.universe.getAccountForMessageSuid(
                      req.persistedNamer.suid);
          this.universe.deleteDraft(account, req.persistedNamer, sendDeleted);
        }
        else {
          sendDeleted();
        }
        delete this._pendingRequests[msg.handle];
        // XXX if we have persistedFolder/persistedUID, enqueue a delete of that
        // message and try and execute it.
        return;
      }

      var wireRep = msg.state;
      account = this.universe.getAccountForSenderIdentityId(wireRep.senderId);
      var identity = this.universe.getIdentityForSenderIdentityId(
                       wireRep.senderId);
      if (msg.command === 'send') {
        // For a send, we first save the state of the draft, then we send it.
        req.persistedNamer = this.universe.saveDraft(
          account, req.persistedNamer, wireRep,
          function(err, newRecords) {
            var composer = new $composer.Composer(newRecords, account,
                                                  identity);

            req.active = null;
            if (req.die)
              delete this._pendingRequests[msg.handle];
            account.sendMessage(composer, function(err, badAddresses) {
              if (!err) {
              // Now that we're all successfully sent, nuke the draft
                this.universe.deleteDraft(account, req.persistedNamer);
              }
              // And report success without waiting for the draft to be
              // deleted.
              this.__sendMessage({
                type: 'doneCompose',
                handle: msg.handle,
                err: err,
                badAddresses: badAddresses,
                messageId: composer.messageId,
                sentDate: composer.sentDate.valueOf(),
              });
            }.bind(this));
          }.bind(this));
      }
      else if (msg.command === 'save') {
        // Save the draft, updating our persisted namer.
        req.persistedNamer = this.universe.saveDraft(
          account, req.persistedNamer, wireRep,
          function(err) {
            req.active = null;
            if (req.die)
              delete self._pendingRequests[msg.handle];
            self.__sendMessage({
              type: 'doneCompose',
              handle: msg.handle,
              err: null,
              badAddresses: null,
              messageId: null,
              sentDate: null,
            });
          });
      }
    }.bind(this));
  },

  notifyCronSyncStart: function mb_notifyCronSyncStart(accountIds) {
    this.__sendMessage({
      type: 'cronSyncStart',
      accountIds: accountIds
    });
  },

  notifyCronSyncStop: function mb_notifyCronSyncStop(accountsResults) {
    this.__sendMessage({
      type: 'cronSyncStop',
      accountsResults: accountsResults
    });
  }

  //////////////////////////////////////////////////////////////////////////////
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  MailBridge: {
    type: $log.DAEMON,
    events: {
      // NB: under unit test, this is not used and bridgeSnoop is used instead.
      send: { type: true },
    },
    TEST_ONLY_events: {
      send: { msg: false },
    },
    errors: {
      badMessageType: { type: true },
      badSliceHandle: { handle: true },
    },
    calls: {
      cmd: { command: true },
    },
    TEST_ONLY_calls: {
    },
  },
});

}); // end define
;
/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at:
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Mozilla Raindrop Code.
 *
 * The Initial Developer of the Original Code is
 *   The Mozilla Foundation
 * Portions created by the Initial Developer are Copyright (C) 2011
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *   Andrew Sutherland <asutherland@asutherland.org>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

/**
 * Mechanism for periodic log hierarchy traversal and transmission of the
 *  serialized data, forgetting about the logging entries after transmitted.  We
 *  additionally may perform interesting-ness analysis and only transmit data
 *  or send an out-of-band notification if something interesting has happened,
 *  such as an error being reported.
 *
 * Log transmission and reconstruction is slightly more complicated than just
 *  serializing a hierarchy because the lifetime of the loggers is expected to
 *  be much longer than our log transmission interval.
 **/

define('rdcommon/logreaper',
  [
    './log',
    'microtime',
    'exports'
  ],
  function(
    $log,
    $microtime,
    exports
  ) {

var EMPTY = [];

function LogReaper(rootLogger) {
  this._rootLogger = rootLogger;
  this._lastTimestamp = null;
  this._lastSeq = null;
}
exports.LogReaper = LogReaper;
LogReaper.prototype = {
  /**
   * Process a logger, producing a time slice representation.
   *
   * Our strategy is roughly to manually traverse the logger hiearchy and:
   * - Ignore loggers with no entries/events and no notably active children that
   *    were already alive at the last reaping and have not died, not mentioning
   *    them at all in the output fragment.  This can also be thought of as:
   * - Emit loggers that have been born.
   * - Emit loggers that have died.
   * - Emit loggers with entries/events.
   * - Emit loggers whose children have had notable activity so that the
   *    hierarchy can be known.
   * - Emit loggers that have experienced a semantic ident change.
   *
   * Potential future optimizations:
   */
  reapHierLogTimeSlice: function() {
    var rootLogger = this._rootLogger,
        startSeq, startTimestamp;
    if (this._lastTimestamp === null) {
      startSeq = 0;
      startTimestamp = rootLogger._born;
    }
    else {
      startSeq = this._lastSeq + 1;
      startTimestamp = this._lastTimestamp;
    }
    var endSeq = $log.getCurrentSeq(),
        endTimestamp = this._lastTimestamp = $microtime.now();

    function traverseLogger(logger) {
      var empty = true;
      // speculatively start populating an output representation
      var outrep = logger.toJSON();
      outrep.events = null;
      outrep.kids = null;

      // - check born/death
      // actually, being born doesn't generate an event, so ignore.
      //if (logger._born >= startTimestamp)
      //  empty = false;
      if (logger._died !== null)
        empty = false;

      // - check events
      var outEvents = null;
      for (var eventKey in logger._eventMap) {
        var eventVal = logger._eventMap[eventKey];
        if (eventVal) {
          empty = false;
          if (outEvents === null)
            outrep.events = outEvents = {};
          outEvents[eventKey] = eventVal;
          logger._eventMap[eventKey] = 0;
        }
      }

      // - check and reap entries
      if (outrep.entries.length) {
        empty = false;
        // (we keep/use outrep.entries, and zero the logger's entries)
        logger._entries = [];
      }
      else {
        // Avoid subsequent mutation of the list mutating our representation
        //  and without creating gratuitous garbage by using a shared empty
        //  list for such cases.
        outrep.entries = EMPTY;
      }

      // - check and reap children
      if (logger._kids && logger._kids.length) {
        for (var iKid = 0; iKid < logger._kids.length; iKid++) {
          var kidLogger = logger._kids[iKid];
          var kidrep = traverseLogger(kidLogger);
          if (kidrep) {
            if (!outrep.kids)
              outrep.kids = [];
            outrep.kids.push(kidrep);
            empty = false;
          }
          // reap (and adjust iteration)
          if (kidLogger._died !== null)
            logger._kids.splice(iKid--, 1);
        }
      }

      return (empty ? null : outrep);
    }

    return {
      begin: startTimestamp,
      end: endTimestamp,
      logFrag: traverseLogger(rootLogger),
    };
  },
};

}); // end define
;
/**
 *
 **/

define('mailapi/maildb',
  [
    './worker-router',
    'exports'
  ],
  function(
    $router,
    exports
  ) {
'use strict';

var sendMessage = $router.registerCallbackType('maildb');

function MailDB(testOptions) {
  this._callbacksQueue = [];
  function processQueue() {
    console.log('main thread reports DB ready');
    this._ready = true;

    this._callbacksQueue.forEach(function executeCallback(cb) {
      cb();
    });
    this._callbacksQueue = null;
  }

  sendMessage('open', [testOptions], processQueue.bind(this));
}
exports.MailDB = MailDB;
MailDB.prototype = {
  close: function() {
    sendMessage('close');
  },

  getConfig: function(callback) {
    if (!this._ready) {
      console.log('deferring getConfig call until ready');
      this._callbacksQueue.push(this.getConfig.bind(this, callback));
      return;
    }

    console.log('issuing getConfig call to main thread');
    sendMessage('getConfig', null, callback);
  },

  saveConfig: function(config) {
    sendMessage('saveConfig', [config]);
  },

  saveAccountDef: function(config, accountDef, folderInfo) {
    sendMessage('saveAccountDef', [ config, accountDef, folderInfo ]);
  },

  loadHeaderBlock: function(folderId, blockId, callback) {
    sendMessage('loadHeaderBlock', [ folderId, blockId], callback);
  },

  loadBodyBlock: function(folderId, blockId, callback) {
    sendMessage('loadBodyBlock', [ folderId, blockId], callback);
  },

  saveAccountFolderStates: function(accountId, folderInfo, perFolderStuff,
                                    deletedFolderIds, callback, reuseTrans) {
    var args = [ accountId, folderInfo, perFolderStuff, deletedFolderIds ];
    sendMessage('saveAccountFolderStates', args, callback);
    // XXX vn Does this deserve any purpose?
    return null;
  },

  deleteAccount: function(accountId) {
    sendMessage('deleteAccount', [accountId]);
  },
};

}); // end define
;
/*global define, console, setTimeout */
/**
 * Drives periodic synchronization, covering the scheduling, deciding what
 * folders to sync, and generating notifications to relay to the UI.  More
 * specifically, we have two goals:
 *
 * 1) Generate notifications about new messages.
 *
 * 2) Cause the device to synchronize its offline store periodically with the
 *    server for general responsiveness and so the user can use the device
 *    offline.
 *
 * We use mozAlarm to schedule ourselves to wake up when our next
 * synchronization should occur.
 *
 * All synchronization occurs in parallel because we want the interval that we
 * force the device's radio into higher power modes to be as short as possible.
 *
 * This logic is part of the back-end, not the front-end.  We want to notify
 * the front-end of new messages, but we want the front-end to be the one that
 * displays and services them to the user.
 **/

define('mailapi/cronsync',
  [
    'rdcommon/log',
    './worker-router',
    './slice_bridge_proxy',
    './mailslice',
    'prim',
    'module',
    'exports'
  ],
  function(
    $log,
    $router,
    $sliceBridgeProxy,
    $mailslice,
    $prim,
    $module,
    exports
  ) {


/**
 * Sanity demands we do not check more frequently than once a minute.
 */
var MINIMUM_SYNC_INTERVAL_MS = 60 * 1000;

/**
 * How long should we let a synchronization run before we give up on it and
 * potentially try and kill it (if we can)?
 */
var MAX_SYNC_DURATION_MS = 3 * 60 * 1000;

/**
 * Caps the number of notifications we generate per account.  It would be
 * sitcom funny to let this grow without bound, but would end badly in reality.
 */
var MAX_MESSAGES_TO_REPORT_PER_ACCOUNT = 5;

/**
 * How much body snippet to save. Chose a value to match the front end
 */
var MAX_SNIPPET_BYTES = 4 * 1024;

function debug(str) {
  console.log("cronsync: " + str + "\n");
}

var SliceBridgeProxy = $sliceBridgeProxy.SliceBridgeProxy;

function makeSlice(storage, callback, parentLog) {
  var proxy = new SliceBridgeProxy({
        __sendMessage: function() {}
      }, 'cron'),
      slice = new $mailslice.MailSlice(proxy, storage, parentLog),
      oldStatus = proxy.sendStatus,
      newHeaders = [];

  slice.onNewHeader = function(header) {
    console.log('onNewHeader: ' + header);
    newHeaders.push(header);
  };

  proxy.sendStatus = function(status, requested, moreExpected,
                              progress, newEmailCount) {
    oldStatus.apply(this, arguments);
    if (requested && !moreExpected && callback) {
      callback(newHeaders);
      slice.die();
    }
  };

  return slice;
}

/**
 * Creates the cronsync instance. Does not do any actions on creation.
 * It waits for a router message or a universe call to start the work.
 */
function CronSync(universe, _logParent) {
  this._universe = universe;
  this._universeDeferred = $prim();
  this._isUniverseReady = false;

  this._LOG = LOGFAB.CronSync(this, null, _logParent);

  this._activeSlices = [];

  this._completedEnsureSync = true;
  this._syncAccountsDone = true;

  this._synced = [];

  this.sendCronSync = $router.registerSimple('cronsync', function(data) {
    var args = data.args;
    switch (data.cmd) {
      case 'alarm':
        debug('received an alarm via a message handler');
        this.onAlarm.apply(this, args);
        break;
      case 'syncEnsured':
        debug('received an syncEnsured via a message handler');
        this.onSyncEnsured.apply(this, args);
        break;
    }
  }.bind(this));
  this.sendCronSync('hello');
}

exports.CronSync = CronSync;
CronSync.prototype = {
  _killSlices: function() {
    this._activeSlices.forEach(function(slice) {
      slice.die();
    });
  },

  onUniverseReady: function() {
    this._universeDeferred.resolve();

    this.ensureSync();
  },

  whenUniverse: function(fn) {
    this._universeDeferred.promise.then(fn);
  },

  /**
   * Makes sure there is a sync timer set up for all accounts.
   */
  ensureSync: function() {
    // Only execute ensureSync if it is not already in progress.
    // Otherwise, due to async timing of mozAlarm setting, could
    // end up with two alarms for the same ID.
    if (!this._completedEnsureSync)
      return;

    this._completedEnsureSync = false;

    debug('ensureSync called');

    this.whenUniverse(function() {
      var accounts = this._universe.accounts,
          syncData = {};

      accounts.forEach(function(account) {
        // Store data by interval, use a more obvious string
        // key instead of just stringifying a number, which
        // could be confused with an array construct.
        var interval = account.accountDef.syncInterval,
            intervalKey = 'interval' + interval;

        if (!syncData.hasOwnProperty(intervalKey)) {
          syncData[intervalKey] = [];
        }
        syncData[intervalKey].push(account.id);
      });

      this.sendCronSync('ensureSync', [syncData]);
    }.bind(this));
  },

  /**
   * Synchronize the given account.  Right now this is just the Inbox for the
   * account.
   *
   * XXX For IMAP, we really want to use the standard iterative growth logic
   * but generally ignoring the number of headers in the slice and instead
   * just doing things by date.  Since making that correct without breaking
   * things or making things really ugly will take a fair bit of work, we are
   * initially just using the UI-focused logic for this.
   *
   * XXX because of this, we totally ignore IMAP's number of days synced
   * value.  ActiveSync handles that itself, so our ignoring it makes no
   * difference for it.
   */
  syncAccount: function(account, doneCallback) {
    // - Skip syncing if we are offline or the account is disabled
    if (!this._universe.online || !account.enabled) {
      debug('syncAcount early exit: online: ' +
            this._universe.online + ', enabled: ' + account.enabled);
      doneCallback();
      return;
    }

    var done = function(result) {
      // Wait for any in-process job operations to complete, so
      // that the app is not killed in the middle of a sync.
      this._universe.waitForAccountOps(account, function() {
        // Also wait for any account save to finish. Most
        // likely failure will be new message headers not
        // getting saved if the callback is not fired
        // until after account saves.
        account.runAfterSaves(function() {
          doneCallback(result);
        });
      });
    }.bind(this);

    var inboxFolder = account.getFirstFolderWithType('inbox');
    var storage = account.getFolderStorageForFolderId(inboxFolder.id);

    // XXX check when the folder was most recently synchronized and skip this
    // sync if it is sufficiently recent.

    // - Initiate a sync of the folder covering the desired time range.
    this._LOG.syncAccount_begin(account.id);

    var slice = makeSlice(storage, function(newHeaders) {
      this._LOG.syncAccount_end(account.id);
      this._activeSlices.splice(this._activeSlices.indexOf(slice), 1);

      // Reduce headers to the minimum number and data set needed for
      // notifications.
      var notifyHeaders = [];
      newHeaders.some(function(header, i) {
        notifyHeaders.push({
          date: header.date,
          from: header.author.name || header.author.address,
          subject: header.subject,
          accountId: account.id,
          messageSuid: header.suid
        });

        if (i === MAX_MESSAGES_TO_REPORT_PER_ACCOUNT - 1)
          return true;
      });

      if (newHeaders.length) {
        debug('Asking for snippets for ' + notifyHeaders.length + ' headers');
        if (this._universe.online){
          this._universe.downloadBodies(
            newHeaders.slice(0, MAX_MESSAGES_TO_REPORT_PER_ACCOUNT), {
              maximumBytesToFetch: MAX_SNIPPET_BYTES
            }, function() {
              debug('Notifying for ' + newHeaders.length + ' headers');
              done([newHeaders.length, notifyHeaders]);
          }.bind(this));
        } else {
          debug('UNIVERSE OFFLINE. Notifying for ' + newHeaders.length +
                ' headers');
          done([newHeaders.length, notifyHeaders]);
        }
      } else {
        done();
      }
    }.bind(this), this._LOG);

    this._activeSlices.push(slice);
    // Pass true to force contacting the server.
    storage.sliceOpenMostRecent(slice, true);
  },

  onAlarm: function(accountIds) {
    this.whenUniverse(function() {
      this._LOG.alarmFired();

      if (!accountIds)
        return;

      var accounts = this._universe.accounts,
          targetAccounts = [],
          ids = [];

      this._universe.__notifyStartedCronSync(accountIds);

      // Make sure the acount IDs are still valid. This is to protect agains
      // an account deletion that did not clean up any alarms correctly.
      accountIds.forEach(function(id) {
        accounts.some(function(account) {
          if (account.id === id) {
            targetAccounts.push(account);
            ids.push(id);
            return true;
          }
        });
      });

      // Flip switch to say account syncing is in progress.
      this._syncAccountsDone = false;

      // Make sure next alarm is set up. In the case of a cold start
      // background sync, this is a bit redundant in that the startup
      // of the mailuniverse would trigger this work. However, if the
      // app is already running, need to be sure next alarm is set up,
      // so ensure the next sync is set up here. Do it here instead of
      // after a sync in case an error in sync would prevent the next
      // sync from getting scheduled.
      this.ensureSync();

      var syncMax = targetAccounts.length,
          syncCount = 0,
          accountsResults = {
            accountIds: accountIds
          };

      var done = function() {
        syncCount += 1;
        if (syncCount < syncMax)
          return;

        // Kill off any slices that still exist from the last sync.
        this._killSlices();

        // Wrap up the sync
        this._syncAccountsDone = true;
        this._onSyncDone = function() {
          if (this._synced.length) {
            accountsResults.updates = this._synced;
            this._synced = [];
          }

          this._universe.__notifyStoppedCronSync(accountsResults);
        }.bind(this);

        this._checkSyncDone();
      }.bind(this);

      // Nothing new to sync, probably old accounts. Just return and indicate
      // that syncing is done.
      if (!ids.length) {
        return done();
      }

      targetAccounts.forEach(function(account) {
        this.syncAccount(account, function (result) {
          if (result) {
            this._synced.push({
              id: account.id,
              address: account.identities[0].address,
              count: result[0],
              latestMessageInfos: result[1]
            });
          }
          done();
        }.bind(this));
      }.bind(this));
    }.bind(this));
  },

  /**
   * Checks for "sync all done", which means the ensureSync call completed, and
   * new alarms for next sync are set, and the account syncs have finished. If
   * those two things are true, then notify the universe that the sync is done.
   */
  _checkSyncDone: function() {
    if (!this._completedEnsureSync || !this._syncAccountsDone)
      return;

    if (this._onSyncDone) {
      this._onSyncDone();
      this._onSyncDone = null;
    }
  },

  /**
   * Called from cronsync-main once ensureSync as set
   * any alarms needed. Need to wait for it before
   * signaling sync is done because otherwise the app
   * could get closed down before the alarm additions
   * succeed.
   */
  onSyncEnsured: function() {
    this._completedEnsureSync = true;
    this._checkSyncDone();
  },

  shutdown: function() {
    $router.unregister('cronsync');
    this._killSlices();
  }
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  CronSync: {
    type: $log.DAEMON,
    events: {
      alarmFired: {},
    },
    TEST_ONLY_events: {
    },
    asyncJobs: {
      syncAccount: { id: false },
    },
    errors: {
    },
    calls: {
    },
    TEST_ONLY_calls: {
    },
  },
});

}); // end define
;
/**
 * Common code for creating and working with various account types.
 **/

define('mailapi/accountcommon',
  [
    'rdcommon/log',
    './a64',
    'require',
    'module',
    'exports'
  ],
  function(
    $log,
    $a64,
    require,
    $module,
    exports
  ) {

// The number of milliseconds to wait for various (non-ActiveSync) XHRs to
// complete during the autoconfiguration process. This value is intentionally
// fairly large so that we don't abort an XHR just because the network is
// spotty.
var AUTOCONFIG_TIMEOUT_MS = 30 * 1000;

var Configurators = {
  'imap+smtp': './composite/configurator',
  'pop3+smtp': './composite/configurator',
  'activesync': './activesync/configurator'
};

function accountTypeToClass(type, callback) {
  var configuratorId = Configurators[type] || null;

  if (typeof configuratorId === 'string') {
    //A dynamically loaded account.
    require([configuratorId], function(mod) {
      callback(mod.account.Account);
    });
  } else {
    // Preserve next turn semantics that happen with
    // the require call.
    setTimeout(function () {
      callback(null);
    }, 4);
  }
}
exports.accountTypeToClass = accountTypeToClass;

// Simple hard-coded autoconfiguration by domain...
var autoconfigByDomain = exports._autoconfigByDomain = {
  'localhost': {
    type: 'imap+smtp',
    incoming: {
      hostname: 'localhost',
      port: 143,
      socketType: 'plain',
      username: '%EMAILLOCALPART%',
    },
    outgoing: {
      hostname: 'localhost',
      port: 25,
      socketType: 'plain',
      username: '%EMAILLOCALPART%',
    },
  },
  'fakeimaphost': {
    type: 'imap+smtp',
    incoming: {
      hostname: 'localhost',
      port: 0,
      socketType: 'plain',
      username: '%EMAILLOCALPART%',
    },
    outgoing: {
      hostname: 'localhost',
      port: 0,
      socketType: 'plain',
      username: '%EMAILLOCALPART%',
    },
  },
  'fakepop3host': {
    type: 'pop3+smtp',
    incoming: {
      hostname: 'localhost',
      port: 0,
      socketType: 'plain',
      username: '%EMAILLOCALPART%',
    },
    outgoing: {
      hostname: 'localhost',
      port: 0,
      socketType: 'plain',
      username: '%EMAILLOCALPART%',
    },
  },
  'slocalhost': {
    type: 'imap+smtp',
    incoming: {
      hostname: 'localhost',
      port: 993,
      socketType: 'SSL',
      username: '%EMAILLOCALPART%',
    },
    outgoing: {
      hostname: 'localhost',
      port: 465,
      socketType: 'SSL',
      username: '%EMAILLOCALPART%',
    },
  },
  'fakeashost': {
    type: 'activesync',
    displayName: 'Test',
    incoming: {
      // This string will be clobbered with the correct port number when running
      // as a unit test.
      server: 'http://localhost:8880',
      username: '%EMAILADDRESS%',
    },
  },
  // like slocalhost, really just exists to generate a test failure
  'saslocalhost': {
    type: 'activesync',
    displayName: 'Test',
    incoming: {
      server: 'https://localhost:443',
      username: '%EMAILADDRESS%',
    },
  },
  // Mapping for a nonexistent domain for testing a bad domain without it being
  // detected ahead of time by the autoconfiguration logic or otherwise.
  'nonesuch.nonesuch': {
    type: 'imap+smtp',
    imapHost: 'nonesuch.nonesuch',
    imapPort: 993,
    imapCrypto: true,
    smtpHost: 'nonesuch.nonesuch',
    smtpPort: 465,
    smtpCrypto: true,
    usernameIsFullEmail: false,
  },
};

/**
 * Recreate the array of identities for a given account.
 *
 * @param universe the MailUniverse
 * @param accountId the ID for this account
 * @param oldIdentities an array of the old identities
 * @return the new identities
 */
function recreateIdentities(universe, accountId, oldIdentities) {
  var identities = [];
  for (var iter in Iterator(oldIdentities)) {
    var oldIdentity = iter[1];
    identities.push({
      id: accountId + '/' + $a64.encodeInt(universe.config.nextIdentityNum++),
      name: oldIdentity.name,
      address: oldIdentity.address,
      replyTo: oldIdentity.replyTo,
      signature: oldIdentity.signature,
    });
  }
  return identities;
}
exports.recreateIdentities = recreateIdentities;

/**
 * The Autoconfigurator tries to automatically determine account settings, in
 * large part by taking advantage of Thunderbird's prior work on autoconfig:
 * <https://developer.mozilla.org/en-US/docs/Thunderbird/Autoconfiguration>.
 * There are some important differences, however, since we support ActiveSync
 * whereas Thunderbird does not.
 *
 * The process is as follows:
 *
 *  1) Get the domain from the user's email address
 *  2) Check hardcoded-into-GELAM account settings for the domain (useful for
 *     unit tests)
 *  3) Check locally stored XML config files in Gaia for the domain at
 *     `/autoconfig/<domain>`
 *  4) Look on the domain for an XML config file at
 *     `http://autoconfig.<domain>/mail/config-v1.1.xml` and
 *     `http://<domain>/.well-known/autoconfig/mail/config-v1.1.xml`, passing
 *     the user's email address in the query string (as `emailaddress`)
 *  5) Query the domain for ActiveSync Autodiscover at
 *     `https://<domain>/autodiscover/autodiscover.xml` and
 *     `https://autodiscover.<domain>/autodiscover/autodiscover.xml`
 *     (TODO: perform a DNS SRV lookup on the server)
 *     Note that we do not treat a failure of autodiscover as fatal; we keep
 *     going, but will save off the error to report if we don't end up with a
 *     successful account creation.
 *  6) Check the Mozilla ISPDB for an XML config file for the domain at
 *     `https://live.mozillamessaging.com/autoconfig/v1.1/<domain>`
 *  7) Perform an MX lookup on the domain, and, if we get a different domain,
 *     check the Mozilla ISPDB for that domain too.
 *
 * If the process is successful, we pass back a JSON object that looks like
 * this for IMAP/SMTP:
 *
 * {
 *   type: 'imap+smtp',
 *   incoming: {
 *     hostname: <imap hostname>,
 *     port: <imap port number>,
 *     socketType: <one of 'plain', 'SSL', 'STARTTLS'>,
 *     username: <imap username>,
 *   },
 *   outgoing: {
 *     hostname: <smtp hostname>,
 *     port: <smtp port>,
 *     socketType: <one of 'plain', 'SSL', 'STARTTLS'>,
 *     username: <smtp username>,
 *   },
 * }
 *
 * And like this for ActiveSync:
 *
 * {
 *   type: 'activesync',
 *   displayName: <display name>, (optional)
 *   incoming: {
 *     server: 'https://<activesync hostname>'
 *   },
 * }
 */
function Autoconfigurator(_LOG) {
  this._LOG = _LOG;
  this.timeout = AUTOCONFIG_TIMEOUT_MS;
}
exports.Autoconfigurator = Autoconfigurator;
Autoconfigurator.prototype = {
  /**
   * The list of fatal error codes.
   *
   * What's fatal and why:
   * - bad-user-or-pass: We found a server, it told us the credentials were
   *     bogus.  There is no point going on.
   * - not-authorized: We found a server, it told us the credentials are fine
   *     but the access rights are insufficient.  There is no point going on.
   *
   * Non-fatal and why:
   * - unknown: If something failed we should keep checking other info sources.
   * - no-config-info: The specific source had no details; we should keep
   *     checking other sources.
   */
  _fatalErrors: ['bad-user-or-pass', 'not-authorized'],

  /**
   * Check the supplied error and return true if it's really a "success" or if
   * it's a fatal error we can't recover from.
   *
   * @param error the error code
   * @return true if the error is a "success" or if it's a fatal error
   */
  _isSuccessOrFatal: function(error) {
    return !error || this._fatalErrors.indexOf(error) !== -1;
  },

  // XXX: Go through these functions and make sure the callbacks provide
  // sufficiently useful error strings.

  /**
   * Get an XML config file from the supplied url. The format is defined at
   * <https://wiki.mozilla.org/Thunderbird:Autoconfiguration:ConfigFileFormat>.
   *
   * @param url the URL to fetch the config file from
   * @param callback a callback taking an error string (if any) and the config
   *        info, formatted as JSON
   */
  _getXmlConfig: function getXmlConfig(url, callback) {
    var xhr = new XMLHttpRequest({mozSystem: true});
    xhr.open('GET', url, true);
    xhr.timeout = this.timeout;

    xhr.onload = function() {
      if (xhr.status < 200 || xhr.status >= 300) {
        // Non-fatal failure to get the config info.  While a 404 is the
        // expected case, this is the appropriate error for weirder cases too.
        callback('no-config-info', null, { status: xhr.status });
        return;
      }
      // XXX: For reasons which are currently unclear (possibly a platform
      // issue), trying to use responseXML results in a SecurityError when
      // running XPath queries. So let's just do an end-run around the
      // "security".
      self.postMessage({
        uid: 0,
        type: 'configparser',
        cmd: 'accountcommon',
        args: [xhr.responseText]
      });

      self.addEventListener('message', function onworkerresponse(evt) {
        var data = evt.data;
        if (data.type != 'configparser' || data.cmd != 'accountcommon') {
          return;
        }
        self.removeEventListener(evt.type, onworkerresponse);
        var args = data.args;
        var config = args[0], status = args[1];
        callback(config ? null : 'no-config-info', config,
                 config ? null : { status: status });
      });
    };

    // Caution: don't overwrite ".onerror" twice here. Just be careful
    // to only assign that once until <http://bugzil.la/949722> is fixed.

    xhr.ontimeout = function() {
      // The effective result is a failure to get configuration info, but make
      // sure the status conveys that a timeout occurred.
      callback('no-config-info', null, { status: 'timeout' });
    };

    xhr.onerror = function() {
      // The effective result is a failure to get configuration info, but make
      // sure the status conveys that a timeout occurred.
      callback('no-config-info', null, { status: 'error' });
    };

    // Gecko currently throws in send() if the file we're opening doesn't exist.
    // This is almost certainly wrong, but let's just work around it for now.
    try {
      xhr.send();
    }
    catch(e) {
      callback('no-config-info', null, { status: 404 });
    }
  },

  /**
   * Attempt to get an XML config file locally.
   *
   * @param domain the domain part of the user's email address
   * @param callback a callback taking an error string (if any) and the config
   *        info, formatted as JSON
   */
  _getConfigFromLocalFile: function getConfigFromLocalFile(domain, callback) {
    this._getXmlConfig('/autoconfig/' + encodeURIComponent(domain), callback);
  },

  /**
   * Attempt ActiveSync Autodiscovery for this email address
   *
   * @param userDetails an object containing `emailAddress` and `password`
   *        attributes
   * @param callback a callback taking an error string (if any) and the config
   *        info, formatted as JSON
   */
  _getConfigFromAutodiscover: function getConfigFromAutodiscover(userDetails,
                                                                 callback) {

    var self = this;
    require(['activesync/protocol'], function (protocol) {
      protocol.autodiscover(userDetails.emailAddress, userDetails.password,
                            self.timeout, function(error, config) {
        if (error) {
          var failureType = 'no-config-info',
              failureDetails = {};

          if (error instanceof protocol.HttpError) {
            if (error.status === 401)
              failureType = 'bad-user-or-pass';
            else if (error.status === 403)
              failureType = 'not-authorized';
            else
              failureDetails.status = error.status;
          }
          callback(failureType, null, failureDetails);
          return;
        }

        var autoconfig = {
          type: 'activesync',
          displayName: config.user.name,
          incoming: {
            server: config.mobileSyncServer.url,
            username: config.user.email
          },
        };
        callback(null, autoconfig, null);
      });
    });
  },

  /**
   * Attempt to get a Thunderbird autoconfig-style XML config file from the
   * domain associated with the user's email address.
   *
   * @param userDetails an object containing `emailAddress` and `password`
   *        attributes
   * @param domain the domain part of the user's email address
   * @param callback a callback taking an error string (if any) and the config
   *        info, formatted as JSON
   */
  _getConfigFromDomain: function getConfigFromDomain(userDetails, domain,
                                                     callback) {
    var suffix = '/mail/config-v1.1.xml?emailaddress=' +
                 encodeURIComponent(userDetails.emailAddress);
    var url = 'http://autoconfig.' + domain + suffix;
    var self = this;

    this._getXmlConfig(url, function(error, config, errorDetails) {
      if (self._isSuccessOrFatal(error)) {
        callback(error, config, errorDetails);
        return;
      }

      // See <http://tools.ietf.org/html/draft-nottingham-site-meta-04>.
      var url = 'http://' + domain + '/.well-known/autoconfig' + suffix;
      self._getXmlConfig(url, callback);
    });
  },

  /**
   * Attempt to get an XML config file from the Mozilla ISPDB.
   *
   * @param domain the domain part of the user's email address
   * @param callback a callback taking an error string (if any) and the config
   *        info, formatted as JSON
   */
  _getConfigFromDB: function getConfigFromDB(domain, callback) {
    this._getXmlConfig('https://live.mozillamessaging.com/autoconfig/v1.1/' +
                       encodeURIComponent(domain), callback);
  },

  /**
   * Look up the DNS MX record for a domain. This currently uses a web service
   * instead of querying it directly.
   *
   * @param domain the domain part of the user's email address
   * @param callback a callback taking an error string (if any) and the MX
   *        domain
   */
  _getMX: function getMX(domain, callback) {
    var xhr = new XMLHttpRequest({mozSystem: true});
    xhr.open('GET', 'https://live.mozillamessaging.com/dns/mx/' +
             encodeURIComponent(domain), true);
    xhr.timeout = this.timeout;

    xhr.onload = function() {
      if (xhr.status === 200)
        callback(null, xhr.responseText.split('\n')[0], null);
      else
        callback('no-config-info', null, { status: 'mx' + xhr.status });
    };

    xhr.ontimeout = function() {
      callback('no-config-info', null, { status: 'mxtimeout' });
    };
    xhr.onerror = function() {
      callback('no-config-info', null, { status: 'mxerror' });
    };

    xhr.send();
  },

  /**
   * Attempt to get an XML config file by checking the DNS MX record and
   * querying the Mozilla ISPDB.
   *
   * @param domain the domain part of the user's email address
   * @param callback a callback taking an error string (if any) and the config
   *        info, formatted as JSON
   */
  _getConfigFromMX: function getConfigFromMX(domain, callback) {
    var self = this;
    this._getMX(domain, function(error, mxDomain, errorDetails) {
      if (error)
        return callback(error, null, errorDetails);

      // XXX: We need to normalize the domain here to get the base domain, but
      // that's complicated because people like putting dots in TLDs. For now,
      // let's just pretend no one would do such a horrible thing.
      mxDomain = mxDomain.split('.').slice(-2).join('.').toLowerCase();
      console.log('  Found MX for', mxDomain);

      if (domain === mxDomain)
        return callback('no-config-info', null, { status: 'mxsame' });

      // If we found a different domain after MX lookup, we should look in our
      // local file store (mostly to support Google Apps domains) and, if that
      // doesn't work, the Mozilla ISPDB.
      console.log('  Looking in local file store');
      self._getConfigFromLocalFile(mxDomain, function(error, config,
                                                      errorDetails) {
        // (Local XML lookup should not have any fatal errors)
        if (!error) {
          callback(error, config, errorDetails);
          return;
        }

        console.log('  Looking in the Mozilla ISPDB');
        self._getConfigFromDB(mxDomain, callback);
      });
    });
  },

  /**
   * Attempt to get the configuration details for an email account by any means
   * necessary.
   *
   * @param userDetails an object containing `emailAddress` and `password`
   *        attributes
   * @param callback a callback taking an error string (if any) and the config
   *        info, formatted as JSON
   */
  getConfig: function getConfig(userDetails, callback) {
    var details = userDetails.emailAddress.split('@');
    var emailLocalPart = details[0], emailDomainPart = details[1];
    var domain = emailDomainPart.toLowerCase();
    console.log('Attempting to get autoconfiguration for', domain);

    var placeholderFields = {
      incoming: ['username', 'hostname', 'server'],
      outgoing: ['username', 'hostname'],
    };

    function fillPlaceholder(value) {
      return value.replace('%EMAILADDRESS%', userDetails.emailAddress)
                  .replace('%EMAILLOCALPART%', emailLocalPart)
                  .replace('%EMAILDOMAIN%', emailDomainPart)
                  .replace('%REALNAME%', userDetails.displayName);
    }

    // Saved autodiscover errors that we report in the event we come to the
    // end of the process and we failed to create an account.
    var autodiscoverError = null, autodiscoverErrorDetails = null;

    function onComplete(error, config, errorDetails) {
      console.log(error ? 'FAILURE' : 'SUCCESS');

      // Fill any placeholder strings in the configuration object we retrieved.
      if (config) {
        for (var iter in Iterator(placeholderFields)) {
          var serverType = iter[0], fields = iter[1];
          if (!config.hasOwnProperty(serverType))
            continue;

          var server = config[serverType];
          for (var iter2 in Iterator(fields)) {
            var field = iter2[1];
            if (server.hasOwnProperty(field))
              server[field] = fillPlaceholder(server[field]);
          }
        }
      }

      // If we had a saved autodiscover error, report that instead of whatever
      // happened in the subsequent ISPDB stages.
      if (error && autodiscoverError) {
        error = autodiscoverError;
        errorDetails = autodiscoverErrorDetails;
      }

      callback(error, config, errorDetails);
    }

    console.log('  Looking in GELAM');
    if (autoconfigByDomain.hasOwnProperty(domain)) {
      onComplete(null, autoconfigByDomain[domain]);
      return;
    }

    var self = this;
    console.log('  Looking in local file store');
    this._getConfigFromLocalFile(domain, function(error, config, errorDetails) {
      if (self._isSuccessOrFatal(error)) {
        onComplete(error, config, errorDetails);
        return;
      }

      console.log('  Looking at domain (Thunderbird autoconfig standard)');
      self._getConfigFromDomain(userDetails, domain, function(error, config,
                                                              errorDetails) {
        if (self._isSuccessOrFatal(error)) {
          onComplete(error, config, errorDetails);
          return;
        }

        console.log('  Trying ActiveSync domain autodiscover');
        self._getConfigFromAutodiscover(userDetails, function(error, config,
                                                              errorDetails) {
          // We treat ActiveSync autodiscover failures specially because of the
          // odd situation documented on
          // https://bugzilla.mozilla.org/show_bug.cgi?id=921529 where
          // t-mobile.de has ActiveSync and IMAP servers, but the ActiveSync
          // server use costs extra and the autodiscover process was stopping us
          // before we'd try IMAP.

          // So, if there was no error, go directly to success.
          if (!error) {
            onComplete(error, config, errorDetails);
            return;
          }
          // Otherwise, save off the error if it was 'not-authorized' and
          // continue the autoconfig process.  We will clobber *whatever* error
          // is reported with these errors if we fail to create the account.
          // The rationale/discussion is at:
          // https://bugzilla.mozilla.org/show_bug.cgi?id=921529#c3
          if (error === 'not-authorized') {
            autodiscoverError = error;
            autodiscoverErrorDetails = errorDetails;
          }
          else if (self._isSuccessOrFatal(error)) {
            onComplete(error, config, errorDetails);
            return;
          }

          console.log('  Looking in the Mozilla ISPDB');
          self._getConfigFromDB(domain, function(error, config, errorDetails) {
            if (self._isSuccessOrFatal(error)) {
              onComplete(error, config, errorDetails);
              return;
            }

            console.log('  Looking up MX');
            self._getConfigFromMX(domain, onComplete);
          });
        });
      });
    });
  },

  /**
   * Try to create an account for the user's email address by running through
   * autoconfigure and, if successful, delegating to the appropriate account
   * type.
   *
   * @param universe the MailUniverse object
   * @param userDetails an object containing `emailAddress` and `password`
   *        attributes
   * @param callback a callback taking an error string (if any) and the config
   *        info, formatted as JSON
   */
  tryToCreateAccount: function(universe, userDetails, callback) {
    var self = this;
    this.getConfig(userDetails, function(error, config, errorDetails) {
      if (error)
        return callback(error, null, errorDetails);

      require([Configurators[config.type]], function (mod) {
        mod.configurator.tryToCreateAccount(universe, userDetails, config,
                                      callback, self._LOG);
      });
    });
  },
};

/**
 * Recreate an existing account, e.g. after a database upgrade.
 *
 * @param universe the MailUniverse
 * @param oldVersion the old database version, to help with migration
 * @param accountInfo the old account info
 * @param callback a callback to fire when we've completed recreating the
 *        account
 */
function recreateAccount(universe, oldVersion, accountInfo, callback) {
  require([Configurators[accountInfo.def.type]], function (mod) {
    mod.configurator.recreateAccount(universe, oldVersion,
                                     accountInfo, callback);
  });
}
exports.recreateAccount = recreateAccount;

function tryToManuallyCreateAccount(universe, userDetails, domainInfo, callback,
                                    _LOG) {
  require([Configurators[domainInfo.type]], function (mod) {
    mod.configurator.tryToCreateAccount(universe, userDetails, domainInfo,
                                        callback, _LOG);
  });
}
exports.tryToManuallyCreateAccount = tryToManuallyCreateAccount;

}); // end define
;
/**
 *
 **/
/*global define, console, window, Blob */
define('mailapi/mailuniverse',
  [
    'rdcommon/log',
    'rdcommon/logreaper',
    './a64',
    './date',
    './syncbase',
    './worker-router',
    './maildb',
    './cronsync',
    './accountcommon',
    'module',
    'exports'
  ],
  function(
    $log,
    $logreaper,
    $a64,
    $date,
    $syncbase,
    $router,
    $maildb,
    $cronsync,
    $acctcommon,
    $module,
    exports
  ) {

/**
 * How many operations per account should we track to allow for undo operations?
 * The B2G email app only demands a history of 1 high-level op for undoing, but
 * we are supporting somewhat more for unit tests, potential fancier UIs, and
 * because high-level ops may end up decomposing into multiple lower-level ops
 * someday.
 *
 * This limit obviously is not used to discard operations not yet performed!
 */
var MAX_MUTATIONS_FOR_UNDO = 10;

/**
 * When debug logging is enabled, how many second's worth of samples should
 * we keep?
 */
var MAX_LOG_BACKLOG = 30;

/**
 * Creates a method to add to MailUniverse that calls a method
 * on all bridges.
 * @param  {String} bridgeMethod name of bridge method to call
 * @return {Function} function to attach to MailUniverse. Assumes
 * "this" is the MailUniverse instance, and that up to three args
 * are passed to the method.
 */
function makeBridgeFn(bridgeMethod) {
  return function(a1, a2, a3) {
    for (var iBridge = 0; iBridge < this._bridges.length; iBridge++) {
      var bridge = this._bridges[iBridge];
      bridge[bridgeMethod](a1, a2, a3);
    }
  };
}

/**
 * The MailUniverse is the keeper of the database, the root logging instance,
 * and the mail accounts.  It loads the accounts from the database on startup
 * asynchronously, so whoever creates it needs to pass a callback for it to
 * invoke on successful startup.
 *
 * Our concept of mail accounts bundles together both retrieval (IMAP,
 * activesync) and sending (SMTP, activesync) since they really aren't
 * separable and in some cases are basically the same (activesync) or coupled
 * (BURL SMTP pulling from IMAP, which we don't currently do but aspire to).
 *
 * @typedef[ConnInfo @dict[
 *   @key[hostname]
 *   @key[port]
 *   @key[crypto @oneof[
 *     @case[false]{
 *       No encryption; plaintext.
 *     }
 *     @case['starttls']{
 *       Upgrade to TLS after establishing a plaintext connection.  Abort if
 *       the server seems incapable of performing the upgrade.
 *     }
 *     @case[true]{
 *       Establish a TLS connection from the get-go; never use plaintext at all.
 *       By convention this may be referred to as an SSL or SSL/TLS connection.
 *     }
 * ]]
 * @typedef[AccountCredentials @dict[
 *   @key[username String]{
 *     The name we use to identify ourselves to the server.  This will
 *     frequently be the whole e-mail address.  Ex: "joe@example.com" rather
 *     than just "joe".
 *   }
 *   @key[password String]{
 *     The password.  Ideally we would have a keychain mechanism so we wouldn't
 *     need to store it like this.
 *   }
 * ]]
 * @typedef[IdentityDef @dict[
 *   @key[id String]{
 *     Unique identifier resembling folder id's;
 *     "{account id}-{unique value for this account}" is what it looks like.
 *   }
 *   @key[name String]{
 *     Display name, ex: "Joe User".
 *   }
 *   @key[address String]{
 *     E-mail address, ex: "joe@example.com".
 *   }
 *   @key[replyTo @oneof[null String]]{
 *     The e-mail address to put in the "reply-to" header for recipients
 *     to address their replies to.  If null, the header will be omitted.
 *   }
 *   @key[signature @oneof[null String]]{
 *     An optional signature block.  If present, we ensure the body text ends
 *     with a newline by adding one if necessary, append "-- \n", then append
 *     the contents of the signature.  Once we start supporting HTML, we will
 *     need to indicate whether the signature is plaintext or HTML.  For now
 *     it must be plaintext.
 *   }
 * ]]
 * @typedef[UniverseConfig @dict[
 *   @key[nextAccountNum Number]
 *   @key[nextIdentityNum Number]
 *   @key[debugLogging Boolean]{
 *     Has logging been turned on for debug purposes?
 *   }
 * ]]{
 *   The configuration fields stored in the database.
 * }
 * @typedef[AccountDef @dict[
 *   @key[id AccountId]
 *   @key[name String]{
 *     The display name for the account.
 *   }
 *   @key[identities @listof[IdentityDef]]
 *
 *   @key[type @oneof['pop3+smtp' 'imap+smtp' 'activesync']]
 *   @key[receiveType @oneof['pop3' 'imap' 'activesync']]
 *   @key[sendType @oneof['smtp' 'activesync']]
 *   @key[receiveConnInfo ConnInfo]
 *   @key[sendConnInfo ConnInfo]
 * ]]
 * @typedef[MessageNamer @dict[
 *   @key[date DateMS]
 *   @key[suid SUID]
 * ]]{
 *   The information we need to locate a message within our storage.  When the
 *   MailAPI tells the back-end things, it uses this representation.
 * }
 * @typedef[SerializedMutation @dict[
 *   @key[type @oneof[
 *     @case['modtags']{
 *       Modify tags by adding and/or removing them.  Idempotent and atomic
 *       under all implementations; no explicit account saving required.
 *     }
 *     @case['delete']{
 *       Delete a message under the "move to trash" model.  For IMAP, this is
 *       the same as a move operation.
 *     }
 *     @case['move']{
 *       Move message(s) within the same account.  For IMAP, this is neither
 *       atomic or idempotent and requires account state to be checkpointed as
 *       running the operation prior to running it.  Dunno for ActiveSync, but
 *       probably atomic and idempotent.
 *     }
 *     @case['copy']{
 *       NOT YET IMPLEMENTED (no gaia UI requirement).  But will be:
 *       Copy message(s) within the same account.  For IMAP, atomic and
 *       idempotent.
 *     }
 *   ]]{
 *     The implementation opcode used to determine what functions to call.
 *   }
 *   @key[longtermId]{
 *     Unique-ish identifier for the mutation.  Just needs to be unique enough
 *     to not refer to any pending or still undoable-operation.
 *   }
 *   @key[lifecyle @oneof[
 *     @case['do']{
 *       The initial state of an operation; indicates we want to execute the
 *       operation to completion.
 *     }
 *     @case['done']{
 *       The operation completed, it's done!
 *     }
 *     @case['undo']{
 *       We want to undo the operation.
 *     }
 *     @case['undone']{
 *     }
 *     @case['moot']{
 *       Either the local or server operation failed and mooted the operation.
 *     }
 *   ]]{
 *     Tracks the overall desired state and completion state of the operation.
 *     Operations currently cannot be redone after they are undone.  This field
 *     differs from the `localStatus` and `serverStatus` in that they track
 *     what we have done to the local database and the server rather than our
 *     goals.  It is very possible for an operation to have a lifecycle of
 *     'undone' without ever having manipulated the local database or told the
 *     server anything.
 *   }
 *   @key[localStatus @oneof[
 *     @case[null]{
 *       Nothing has happened; no changes have been made to the local database.
 *     }
 *     @case['doing']{
 *       'local_do' is running.  An attempt to undo the operation while in this
 *       state will not interrupt 'local_do', but will enqueue the operation
 *       to run 'local_undo' subsequently.
 *     }
 *     @case['done']{
 *       'local_do' has successfully run to completion.
 *     }
 *     @case['undoing']{
 *       'local_undo' is running.
 *     }
 *     @case['undone']{
 *       'local_undo' has successfully run to completion or we canceled the
 *       operation
 *     }
 *     @case['unknown']{
 *       We're not sure what actually got persisted to disk.  If we start
 *       generating more transactions once we're sure the I/O won't be harmful,
 *       we can remove this state.
 *     }
 *   ]]{
 *     The state of the local mutation effects of this operation.  This used
 *     to be conflated together with `serverStatus` in a single status variable,
 *     but the multiple potential undo transitions once local_do became async
 *     made this infeasible.
 *   }
 *   @key[serverStatus @oneof[
 *     @case[null]{
 *       Nothing has happened; no attempt has been made to talk to the server.
 *     }
 *     @case['check']{
 *       We don't know what has or hasn't happened on the server so we need to
 *       run a check operation before doing anything.
 *     }
 *     @case['checking']{
 *       A check operation is currently being run.
 *     }
 *     @case['doing']{
 *       'do' is currently running.  Invoking `undoMutation` will not attempt to
 *       stop 'do', but will enqueue the operation with a desire of 'undo' to be
 *       run later.
 *     }
 *     @case['done']{
 *       'do' successfully ran to completion.
 *     }
 *     @case['undoing']{
 *       'undo' is currently running.  Invoking `undoMutation` will not attempt
 *       to stop this but will enqueut the operation with a desire of 'do' to be
 *       run later.
 *     }
 *     @case['undone']{
 *       The operation was 'done' and has now been 'undone'.
 *     }
 *     @case['moot']{
 *       The job is no longer relevant; the messages it operates on don't exist,
 *       the target folder doesn't exist, or we failed so many times that we
 *       assume something is fundamentally wrong and the request simply cannot
 *       be executed.
 *     }
 *     @case['n/a']{
 *       The op does not need to be run online.
 *     }
 *   ]]{
 *     The state of the operation on the server.  This is tracked separately
 *     from the `localStatus` to reduce the number of possible states.
 *   }
 *   @key[tryCount Number]{
 *     How many times have we attempted to run this operation.  If we retry an
 *     operation too many times, we eventually will discard it with the
 *     assumption that it's never going to succeed.
 *   }
 *   @key[humanOp String]{
 *     The user friendly opcode where flag manipulations like starring have
 *     their own opcode.
 *   }
 *   @key[messages @listof[MessageNamer]]
 *
 *   @key[folderId #:optional FolderId]{
 *     If this is a move/copy, the target folder
 *   }
 * ]]
 */
function MailUniverse(callAfterBigBang, online, testOptions) {
  /** @listof[Account] */
  this.accounts = [];
  this._accountsById = {};

  /** @listof[IdentityDef] */
  this.identities = [];
  this._identitiesById = {};

  /**
   * @dictof[
   *   @key[AccountID]
   *   @value[@dict[
   *     @key[active Boolean]{
   *       Is there an active operation right now?
   *     }
   *     @key[local @listof[SerializedMutation]]{
   *       Operations to be run for local changes.  This queue is drained with
   *       preference to the `server` queue.  Operations on this list will also
   *       be added to the `server` list.
   *     }
   *     @key[server @listof[SerializedMutation]]{
   *       Operations to be run against the server.
   *     }
   *     @key[deferred @listof[SerializedMutation]]{
   *       Operations that were taken out of either of the above queues because
   *       of a failure where we need to wait some amount of time before
   *       retrying.
   *     }
   *   ]]
   * ]{
   *   Per-account lists of operations to run for local changes (first priority)
   *   and against the server (second priority).  This does not contain
   *   completed operations; those are stored on `MailAccount.mutations` (along
   *   with uncompleted operations!)
   * }
   */
  this._opsByAccount = {};
  // populated by waitForAccountOps, invoked when all ops complete
  this._opCompletionListenersByAccount = {};
  // maps longtermId to a callback that cares. non-persisted.
  this._opCallbacks = {};

  this._bridges = [];

  this._testModeDisablingLocalOps = false;
  /** Fake navigator to use for navigator.onLine checks */
  this._testModeFakeNavigator = (testOptions && testOptions.fakeNavigator) ||
                                null;

  // We used to try and use navigator.connection, but it's not supported on B2G,
  // so we have to use navigator.onLine like suckers.
  this.online = true; // just so we don't cause an offline->online transition
  // Events for online/offline are now pushed into us externally.  They need
  // to be bridged from the main thread anyways, so no point faking the event
  // listener.
  this._onConnectionChange(online);

  // Track the mode of the universe. Values are:
  // 'cron': started up in background to do tasks like sync.
  // 'interactive': at some point during its life, it was used to
  // provide functionality to a user interface. Once it goes
  // 'interactive', it cannot switch back to 'cron'.
  this._mode = 'cron';

  /**
   * A setTimeout handle for when we next dump deferred operations back onto
   * their operation queues.
   */
  this._deferredOpTimeout = null;
  this._boundQueueDeferredOps = this._queueDeferredOps.bind(this);

  this.config = null;
  this._logReaper = null;
  this._logBacklog = null;

  this._LOG = null;
  this._db = new $maildb.MailDB(testOptions);
  this._cronSync = new $cronsync.CronSync(this);
  var self = this;
  this._db.getConfig(function(configObj, accountInfos, lazyCarryover) {
    function setupLogging(config) {
      if (self.config.debugLogging) {
        if (self.config.debugLogging !== 'dangerous') {
          console.warn('GENERAL LOGGING ENABLED!');
          console.warn('(CIRCULAR EVENT LOGGING WITH NON-SENSITIVE DATA)');
          $log.enableGeneralLogging();
        }
        else {
          console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
          console.warn('DANGEROUS USER-DATA ENTRAINING LOGGING ENABLED !!!');
          console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
          console.warn('This means contents of e-mails and passwords if you');
          console.warn('set up a new account.  (The IMAP protocol sanitizes');
          console.warn('passwords, but the bridge logger may not.)');
          console.warn('...................................................');
          $log.DEBUG_markAllFabsUnderTest();
        }
      }
    }

    var accountInfo, i;
    var doneCount = 0;
    var accountCount = accountInfos.length;
    if (configObj) {
      self.config = configObj;
      setupLogging();
      self._LOG = LOGFAB.MailUniverse(self, null, null);
      if (self.config.debugLogging)
        self._enableCircularLogging();

      self._LOG.configLoaded(self.config, accountInfos);

      function done() {
        doneCount += 1;
        if (doneCount === accountCount) {
          self._initFromConfig();
          callAfterBigBang();
        }
      }

      if (accountCount) {
        for (i = 0; i < accountCount; i++) {
          accountInfo = accountInfos[i];
          self._loadAccount(accountInfo.def, accountInfo.folderInfo,
                            null, done);
        }

        // return since _loadAccount needs to finish before completing
        // the flow in done().
        return;
      }
    }
    else {
      self.config = {
        // We need to put the id in here because our startup query can't
        // efficiently get both the key name and the value, just the values.
        id: 'config',
        nextAccountNum: 0,
        nextIdentityNum: 0,
        debugLogging: lazyCarryover ? lazyCarryover.config.debugLogging : false
      };
      setupLogging();
      self._LOG = LOGFAB.MailUniverse(self, null, null);
      if (self.config.debugLogging)
        self._enableCircularLogging();
      self._db.saveConfig(self.config);

      // - Try to re-create any accounts using old account infos.
      if (lazyCarryover) {
        self._LOG.configMigrating(lazyCarryover);
        var waitingCount = lazyCarryover.accountInfos.length;
        var oldVersion = lazyCarryover.oldVersion;
        for (i = 0; i < lazyCarryover.accountInfos.length; i++) {
          var accountInfo = lazyCarryover.accountInfos[i];
          $acctcommon.recreateAccount(self, oldVersion, accountInfo,
                                      function() {
            // We don't care how they turn out, just that they get a chance
            // to run to completion before we call our bootstrap complete.
            if (--waitingCount === 0) {
              self._initFromConfig();
              callAfterBigBang();
            }
          });
        }
        // Do not let callAfterBigBang get called.
        return;
      }
      else {
        self._LOG.configCreated(self.config);
      }
    }
    self._initFromConfig();
    callAfterBigBang();
  });
}
exports.MailUniverse = MailUniverse;
MailUniverse.prototype = {
  //////////////////////////////////////////////////////////////////////////////
  // Logging
  _enableCircularLogging: function() {
    this._logReaper = new $logreaper.LogReaper(this._LOG);
    this._logBacklog = [];
    window.setInterval(
      function() {
        var logTimeSlice = this._logReaper.reapHierLogTimeSlice();
        // if nothing interesting happened, this could be empty, yos.
        if (logTimeSlice.logFrag) {
          this._logBacklog.push(logTimeSlice);
          // throw something away if we've got too much stuff already
          if (this._logBacklog.length > MAX_LOG_BACKLOG)
            this._logBacklog.shift();
        }
      }.bind(this),
      1000);
  },

  createLogBacklogRep: function(id) {
    return {
      type: 'backlog',
      id: id,
      schema: $log.provideSchemaForAllKnownFabs(),
      backlog: this._logBacklog,
    };
  },

  dumpLogToDeviceStorage: function() {
    // This reuses the existing registration if one exists.
    var sendMessage = $router.registerCallbackType('devicestorage');
    try {
      var blob = new Blob([JSON.stringify(this.createLogBacklogRep())],
                          {
                            type: 'application/json',
                            endings: 'transparent'
                          });
      var filename = 'gem-log-' + Date.now() + '.json';
      sendMessage('save', ['sdcard', blob, filename], function(success, err, savedFile) {
        if (success)
          console.log('saved log to "sdcard" devicestorage:', savedFile);
        else
          console.error('failed to save log to', filename);

      });
    }
    catch(ex) {
      console.error('Problem dumping log to device storage:', ex,
                    '\n', ex.stack);
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  // Config / Settings

  /**
   * Perform initial initialization based on our configuration.
   */
  _initFromConfig: function() {
    this._cronSync.onUniverseReady();
  },

  /**
   * Return the subset of our configuration that the client can know about.
   */
  exposeConfigForClient: function() {
    // eventually, iterate over a whitelist, but for now, it's easy...
    return {
      debugLogging: this.config.debugLogging
    };
  },

  modifyConfig: function(changes) {
    for (var key in changes) {
      var val = changes[key];
      switch (key) {
        case 'debugLogging':
          break;
        default:
          continue;
      }
      this.config[key] = val;
    }
    this._db.saveConfig(this.config);
    this.__notifyConfig();
  },

  __notifyConfig: function() {
    var config = this.exposeConfigForClient();
    for (var iBridge = 0; iBridge < this._bridges.length; iBridge++) {
      var bridge = this._bridges[iBridge];
      bridge.notifyConfig(config);
    }
  },

  setInteractive: function() {
    this._mode = 'interactive';
  },

  //////////////////////////////////////////////////////////////////////////////
  _onConnectionChange: function(isOnline) {
    var wasOnline = this.online;
    /**
     * Are we online?  AKA do we have actual internet network connectivity.
     * This should ideally be false behind a captive portal.  This might also
     * end up temporarily false if we move to a 2-phase startup process.
     */
    this.online = this._testModeFakeNavigator ?
                    this._testModeFakeNavigator.onLine : isOnline;
    // Knowing when the app thinks it is online/offline is going to be very
    // useful for our console.log debug spew.
    console.log('Email knows that it is:', this.online ? 'online' : 'offline',
                'and previously was:', wasOnline ? 'online' : 'offline');
    /**
     * Do we want to minimize network usage?  Right now, this is the same as
     * metered, but it's conceivable we might also want to set this if the
     * battery is low, we want to avoid stealing network/cpu from other
     * apps, etc.
     *
     * NB: We used to get this from navigator.connection.metered, but we can't
     * depend on that.
     */
    this.minimizeNetworkUsage = true;
    /**
     * Is there a marginal cost to network usage?  This is intended to be used
     * for UI (decision) purposes where we may want to prompt before doing
     * things when bandwidth is metered, but not when the user is on comparably
     * infinite wi-fi.
     *
     * NB: We used to get this from navigator.connection.metered, but we can't
     * depend on that.
     */
    this.networkCostsMoney = true;

    if (!wasOnline && this.online) {
      // - check if we have any pending actions to run and run them if so.
      for (var iAcct = 0; iAcct < this.accounts.length; iAcct++) {
        this._resumeOpProcessingForAccount(this.accounts[iAcct]);
      }
    }
  },

  /**
   * Helper function to wrap calls to account.runOp for local operations; done
   * only for consistency with `_dispatchServerOpForAccount`.
   */
  _dispatchLocalOpForAccount: function(account, op) {
    var queues = this._opsByAccount[account.id];
    queues.active = true;

    var mode;
    switch (op.lifecycle) {
      case 'do':
        mode = 'local_do';
        op.localStatus = 'doing';
        break;
      case 'undo':
        mode = 'local_undo';
        op.localStatus = 'undoing';
        break;
      default:
        throw new Error('Illegal lifecycle state for local op');
    }

    account.runOp(
      op, mode,
      this._localOpCompleted.bind(this, account, op));
  },

  /**
   * Helper function to wrap calls to account.runOp for server operations since
   * it now gets more complex with 'check' mode.
   */
  _dispatchServerOpForAccount: function(account, op) {
    var queues = this._opsByAccount[account.id];
    queues.active = true;

    var mode = op.lifecycle;
    if (op.serverStatus === 'check')
      mode = 'check';
    op.serverStatus = mode + 'ing';

    account.runOp(
      op, mode,
      this._serverOpCompleted.bind(this, account, op));
  },

  /**
   * Start processing ops for an account if it's able and has ops to run.
   */
  _resumeOpProcessingForAccount: function(account) {
    var queues = this._opsByAccount[account.id];
    if (!account.enabled)
      return;
    // Nothing to do if there's a local op running
    if (!queues.local.length &&
        queues.server.length &&
        // (it's possible there is still an active job right now)
        (queues.server[0].serverStatus !== 'doing' &&
         queues.server[0].serverStatus !== 'undoing')) {
      var op = queues.server[0];
      this._dispatchServerOpForAccount(account, op);
    }
  },

  registerBridge: function(mailBridge) {
    this._bridges.push(mailBridge);
  },

  unregisterBridge: function(mailBridge) {
    var idx = this._bridges.indexOf(mailBridge);
    if (idx !== -1)
      this._bridges.splice(idx, 1);
  },

  tryToCreateAccount: function mu_tryToCreateAccount(userDetails, domainInfo,
                                                     callback) {
    if (!this.online) {
      callback('offline');
      return;
    }
    if (!userDetails.forceCreate) {
      for (var i = 0; i < this.accounts.length; i++) {
        if (userDetails.emailAddress ===
            this.accounts[i].identities[0].address) {
          callback('user-account-exists');
          return;
        }
      }
    }

    if (domainInfo) {
      $acctcommon.tryToManuallyCreateAccount(this, userDetails, domainInfo,
                                             callback, this._LOG);
    }
    else {
      // XXX: store configurator on this object so we can abort the connections
      // if necessary.
      var configurator = new $acctcommon.Autoconfigurator(this._LOG);
      configurator.tryToCreateAccount(this, userDetails, callback);
    }
  },

  /**
   * Shutdown the account, forget about it, nuke associated database entries.
   */
  deleteAccount: function(accountId) {
    var savedEx = null;
    var account = this._accountsById[accountId];
    try {
      account.accountDeleted();
    }
    catch (ex) {
      // save the failure until after we have done other cleanup.
      savedEx = ex;
    }
    this._db.deleteAccount(accountId);

    delete this._accountsById[accountId];
    var idx = this.accounts.indexOf(account);
    this.accounts.splice(idx, 1);

    for (var i = 0; i < account.identities.length; i++) {
      var identity = account.identities[i];
      idx = this.identities.indexOf(identity);
      this.identities.splice(idx, 1);
      delete this._identitiesById[identity.id];
    }

    delete this._opsByAccount[accountId];
    delete this._opCompletionListenersByAccount[accountId];

    this.__notifyRemovedAccount(accountId);

    if (savedEx)
      throw savedEx;
  },

  saveAccountDef: function(accountDef, folderInfo) {
    this._db.saveAccountDef(this.config, accountDef, folderInfo);
    var account = this.getAccountForAccountId(accountDef.id);

    // Make sure syncs are still accurate, since syncInterval
    // could have changed.
    this._cronSync.ensureSync();

    // If account exists, notify of modification. However on first
    // save, the account does not exist yet.
    if (account)
      this.__notifyModifiedAccount(account);
  },

  /**
   * Instantiate an account from the persisted representation.
   * Asynchronous. Calls callback with the account object.
   */
  _loadAccount: function mu__loadAccount(accountDef, folderInfo,
                                         receiveProtoConn, callback) {
    $acctcommon.accountTypeToClass(accountDef.type, function (constructor) {
      if (!constructor) {
        this._LOG.badAccountType(accountDef.type);
        return;
      }
      var account = new constructor(this, accountDef, folderInfo, this._db,
                                    receiveProtoConn, this._LOG);

      this.accounts.push(account);
      this._accountsById[account.id] = account;
      this._opsByAccount[account.id] = {
        active: false,
        local: [],
        server: [],
        deferred: []
      };
      this._opCompletionListenersByAccount[account.id] = null;

      for (var iIdent = 0; iIdent < accountDef.identities.length; iIdent++) {
        var identity = accountDef.identities[iIdent];
        this.identities.push(identity);
        this._identitiesById[identity.id] = identity;
      }

      this.__notifyAddedAccount(account);

      // - issue a (non-persisted) syncFolderList if needed
      var timeSinceLastFolderSync = Date.now() - account.meta.lastFolderSyncAt;
      if (timeSinceLastFolderSync >= $syncbase.SYNC_FOLDER_LIST_EVERY_MS)
        this.syncFolderList(account);

      // - check for mutations that still need to be processed
      // This will take care of deferred mutations too because they are still
      // maintained in this list.
      for (var i = 0; i < account.mutations.length; i++) {
        var op = account.mutations[i];
        if (op.lifecycle !== 'done' && op.lifecycle !== 'undone' &&
            op.lifecycle !== 'moot') {
          // For localStatus, we currently expect it to be consistent with the
          // state of the folder's database.  We expect this to be true going
          // forward and as we make changes because when we save the account's
          // operation status, we should also be saving the folder changes at the
          // same time.
          //
          // The same cannot be said for serverStatus, so we need to check.  See
          // comments about operations elsewhere (currently in imap/jobs.js).
          op.serverStatus = 'check';
          this._queueAccountOp(account, op);
        }
      }
      callback(account);
    }.bind(this));
  },

  /**
   * Self-reporting by an account that it is experiencing difficulties.
   *
   * We mutate its state for it, and generate a notification if this is a new
   * problem.  For problems that require user action, we additionally generate
   * a bad login notification.
   */
  __reportAccountProblem: function(account, problem) {
    // nothing to do if the problem is already known
    if (account.problems.indexOf(problem) !== -1)
      return;
    account.problems.push(problem);
    account.enabled = false;

    this.__notifyModifiedAccount(account);

    switch (problem) {
      case 'bad-user-or-pass':
      case 'imap-disabled':
      case 'needs-app-pass':
        this.__notifyBadLogin(account, problem);
        break;
    }
  },

  __removeAccountProblem: function(account, problem) {
    var idx = account.problems.indexOf(problem);
    if (idx === -1)
      return;
    account.problems.splice(idx, 1);
    account.enabled = (account.problems.length === 0);

    this.__notifyModifiedAccount(account);

    if (account.enabled)
      this._resumeOpProcessingForAccount(account);
  },

  clearAccountProblems: function(account) {
    // TODO: this would be a great time to have any slices that had stalled
    // syncs do whatever it takes to make them happen again.
    account.enabled = true;
    account.problems = [];
    this._resumeOpProcessingForAccount(account);
  },

  // expects (account, problem)
  __notifyBadLogin: makeBridgeFn('notifyBadLogin'),

  // expects (account)
  __notifyAddedAccount: makeBridgeFn('notifyAccountAdded'),

  // expects (account)
  __notifyModifiedAccount: makeBridgeFn('notifyAccountModified'),

  // expects (accountId)
  __notifyRemovedAccount: makeBridgeFn('notifyAccountRemoved'),

  // expects (account, folderMeta)
  __notifyAddedFolder: makeBridgeFn('notifyFolderAdded'),

  // expects (account, folderMeta)
  __notifyModifiedFolder: makeBridgeFn('notifyFolderModified'),

  // expects (account, folderMeta)
  __notifyRemovedFolder: makeBridgeFn('notifyFolderRemoved'),

  // expects (suid, detail, body)
  __notifyModifiedBody: makeBridgeFn('notifyBodyModified'),


  //////////////////////////////////////////////////////////////////////////////
  // cronsync Stuff

  // expects (accountIds)
  __notifyStartedCronSync: makeBridgeFn('notifyCronSyncStart'),

  // expects (accountsResults)
  __notifyStoppedCronSync: makeBridgeFn('notifyCronSyncStop'),

  //////////////////////////////////////////////////////////////////////////////
  // Lifetime Stuff

  /**
   * Write the current state of the universe to the database.
   */
  saveUniverseState: function() {
    var curTrans = null;

    for (var iAcct = 0; iAcct < this.accounts.length; iAcct++) {
      var account = this.accounts[iAcct];
      curTrans = account.saveAccountState(curTrans, null, 'saveUniverse');
    }
  },

  /**
   * Shutdown all accounts; this is currently for the benefit of unit testing.
   * We expect our app to operate in a crash-only mode of operation where a
   * clean shutdown means we get a heads-up, put ourselves offline, and trigger a
   * state save before we just demand that our page be closed.  That's future
   * work, of course.
   *
   * If a callback is provided, a cleaner shutdown will be performed where we
   * wait for all current IMAP connections to be be shutdown by the server
   * before invoking the callback.
   */
  shutdown: function(callback) {
    var waitCount = this.accounts.length;
    // (only used if a 'callback' is passed)
    function accountShutdownCompleted() {
      if (--waitCount === 0)
        callback();
    }
    for (var iAcct = 0; iAcct < this.accounts.length; iAcct++) {
      var account = this.accounts[iAcct];
      // only need to pass our handler if clean shutdown is desired
      account.shutdown(callback ? accountShutdownCompleted : null);
    }

    this._cronSync.shutdown();
    this._db.close();
    if (this._LOG)
      this._LOG.__die();

    if (!this.accounts.length)
      callback();
  },

  //////////////////////////////////////////////////////////////////////////////
  // Lookups: Account, Folder, Identity

  getAccountForAccountId: function mu_getAccountForAccountId(accountId) {
    return this._accountsById[accountId];
  },

  /**
   * Given a folder-id, get the owning account.
   */
  getAccountForFolderId: function mu_getAccountForFolderId(folderId) {
    var accountId = folderId.substring(0, folderId.indexOf('/')),
        account = this._accountsById[accountId];
    return account;
  },

  /**
   * Given a message's sufficiently unique identifier, get the owning account.
   */
  getAccountForMessageSuid: function mu_getAccountForMessageSuid(messageSuid) {
    var accountId = messageSuid.substring(0, messageSuid.indexOf('/')),
        account = this._accountsById[accountId];
    return account;
  },

  getFolderStorageForFolderId: function mu_getFolderStorageForFolderId(
                                 folderId) {
    var account = this.getAccountForFolderId(folderId);
    return account.getFolderStorageForFolderId(folderId);
  },

  getFolderStorageForMessageSuid: function mu_getFolderStorageForFolderId(
                                    messageSuid) {
    var folderId = messageSuid.substring(0, messageSuid.lastIndexOf('/')),
        account = this.getAccountForFolderId(folderId);
    return account.getFolderStorageForFolderId(folderId);
  },

  getAccountForSenderIdentityId: function mu_getAccountForSenderIdentityId(
                                   identityId) {
    var accountId = identityId.substring(0, identityId.indexOf('/')),
        account = this._accountsById[accountId];
    return account;
  },

  getIdentityForSenderIdentityId: function mu_getIdentityForSenderIdentityId(
                                    identityId) {
    return this._identitiesById[identityId];
  },

  //////////////////////////////////////////////////////////////////////////////
  // Message Mutation and Undoing

  /**
   * Partitions messages by account.  Accounts may want to partition things
   * further, such as by folder, but we leave that up to them since not all
   * may require it.  (Ex: activesync and gmail may be able to do things
   * that way.)
   */
  _partitionMessagesByAccount: function(messageNamers, targetAccountId) {
    var results = [], acctToMsgs = {};

    for (var i = 0; i < messageNamers.length; i++) {
      var messageNamer = messageNamers[i],
          messageSuid = messageNamer.suid,
          accountId = messageSuid.substring(0, messageSuid.indexOf('/'));
      if (!acctToMsgs.hasOwnProperty(accountId)) {
        var messages = [messageNamer];
        results.push({
          account: this._accountsById[accountId],
          messages: messages,
          crossAccount: (targetAccountId && targetAccountId !== accountId),
        });
        acctToMsgs[accountId] = messages;
      }
      else {
        acctToMsgs[accountId].push(messageNamer);
      }
    }

    return results;
  },

  /**
   * Put an operation in the deferred mutations queue and ensure the deferred
   * operation timer is active.  The deferred queue is persisted to disk too
   * and transferred across to the non-deferred queue at account-load time.
   */
  _deferOp: function(account, op) {
    this._opsByAccount[account.id].deferred.push(op.longtermId);
    if (this._deferredOpTimeout !== null)
      this._deferredOpTimeout = window.setTimeout(
        this._boundQueueDeferredOps, $syncbase.DEFERRED_OP_DELAY_MS);
  },

  /**
   * Enqueue all deferred ops; invoked by the setTimeout scheduled by
   * `_deferOp`.  We use a single timeout across all accounts, so the duration
   * of the defer delay can vary a bit, but our goal is just to avoid deferrals
   * turning into a tight loop that pounds the server, nothing fancier.
   */
  _queueDeferredOps: function() {
    this._deferredOpTimeout = null;

    // If not in 'interactive' mode, then this is just a short
    // 'cron' existence that needs to shut down soon. Wait one
    // more cycle in case the app switches over to 'interactive'
    // in the meantime.
    if (this._mode !== 'interactive') {
      console.log('delaying deferred op since mode is ' + this._mode);
      this._deferredOpTimeout = window.setTimeout(
        this._boundQueueDeferredOps, $syncbase.DEFERRED_OP_DELAY_MS);
      return;
    }

    for (var iAccount = 0; iAccount < this.accounts.length; iAccount++) {
      var account = this.accounts[iAccount],
          queues = this._opsByAccount[account.id];
      // we need to mutate in-place, so concat is not an option
      while (queues.deferred.length) {
        var op = queues.deferred.shift();
        // There is no need to enqueue the operation if:
        // - It's already enqueued because someone called undo
        // - Undo got called and that ran to completion
        if (queues.server.indexOf(op) === -1 &&
            op.lifecycle !== 'undo')
          this._queueAccountOp(account, op);
      }
    }
  },

  _localOpCompleted: function(account, op, err, resultIfAny,
                              accountSaveSuggested) {

    var queues = this._opsByAccount[account.id],
        serverQueue = queues.server,
        localQueue = queues.local;
    queues.active = false;

    var removeFromServerQueue = false,
        completeOp = false;
    if (err) {
      switch (err) {
        // Only defer is currently supported as a recoverable local failure
        // type.
        case 'defer':
          if (++op.tryCount < $syncbase.MAX_OP_TRY_COUNT) {
            this._LOG.opDeferred(op.type, op.longtermId);
            this._deferOp(account, op);
            removeFromServerQueue = true;
            break;
          }
          // fall-through to an error
        default:
          this._LOG.opGaveUp(op.type, op.longtermId);
          op.lifecycle = 'moot';
          op.localStatus = 'unknown';
          op.serverStatus = 'moot';
          removeFromServerQueue = true;
          completeOp = true;
          break;
      }
    }
    else {
      switch (op.localStatus) {
        case 'doing':
          op.localStatus = 'done';
          if (op.serverStatus === 'n/a') {
            op.lifecycle = 'done';
            completeOp = true;
          }
          break;
        case 'undoing':
          op.localStatus = 'undone';
          if (op.serverStatus === 'n/a') {
            op.lifecycle = 'undone';
            completeOp = true;
          }
          break;
      }

      // This is a suggestion; in the event of high-throughput on operations,
      // we probably don't want to save the account every tick, etc.
      if (accountSaveSuggested)
        account.saveAccountState(null, null, 'localOp');
    }

    if (removeFromServerQueue) {
      var idx = serverQueue.indexOf(op);
      if (idx !== -1)
        serverQueue.splice(idx, 1);
    }
    localQueue.shift();

    if (completeOp) {
      if (this._opCallbacks.hasOwnProperty(op.longtermId)) {
        var callback = this._opCallbacks[op.longtermId];
        delete this._opCallbacks[op.longtermId];
        try {
          callback(err, resultIfAny, account, op);
        }
        catch(ex) {
          console.log(ex.message, ex.stack);
          this._LOG.opCallbackErr(op.type);
        }
      }
    }

    if (localQueue.length) {
      op = localQueue[0];
      this._dispatchLocalOpForAccount(account, op);
    }
    else if (serverQueue.length && this.online && account.enabled) {
      op = serverQueue[0];
      this._dispatchServerOpForAccount(account, op);
    }
    else if (this._opCompletionListenersByAccount[account.id]) {
      this._opCompletionListenersByAccount[account.id](account);
      this._opCompletionListenersByAccount[account.id] = null;
    }
  },

  /**
   * @args[
   *   @param[account[
   *   @param[op]{
   *     The operation.
   *   }
   *   @param[err @oneof[
   *     @case[null]{
   *       Success!
   *     }
   *     @case['defer']{
   *       The resource was unavailable, but might be available again in the
   *       future.  Defer the operation to be run in the future by putting it on
   *       a deferred list that will get re-added after an arbitrary timeout.
   *       This does not imply that a check operation needs to be run.  This
   *       reordering violates our general ordering guarantee; we could be
   *       better if we made sure to defer all other operations that can touch
   *       the same resource, but that's pretty complex.
   *
   *       Deferrals do boost the tryCount; our goal with implementing this is
   *       to support very limited
   *     }
   *     @case['aborted-retry']{
   *       The operation was started, but we lost the connection before we
   *       managed to accomplish our goal.  Run a check operation then run the
   *       operation again depending on what 'check' says.
   *
   *       'defer' should be used instead if it's known that no mutations could
   *       have been perceived by the server, etc.
   *     }
   *     @case['failure-give-up']{
   *       Something is broken in a way we don't really understand and it's
   *       unlikely that retrying is actually going to accomplish anything.
   *       Although we mark the status 'moot', this is a more sinister failure
   *       that should generate debugging/support data when appropriate.
   *     }
   *     @case['moot']{
   *       The operation no longer makes any sense.
   *     }
   *     @default{
   *       Some other type of error occurred.  This gets treated the same as
   *       aborted-retry
   *     }
   *   ]]
   *   @param[resultIfAny]{
   *     A result to be relayed to the listening callback for the operation, if
   *     there is one.  This is intended to be used for things like triggering
   *     attachment downloads where it would be silly to make the callback
   *     re-get the changed data itself.
   *   }
   *   @param[accountSaveSuggested #:optional Boolean]{
   *     Used to indicate that this has changed the state of the system and a
   *     save should be performed at some point in the future.
   *   }
   * ]
   */
  _serverOpCompleted: function(account, op, err, resultIfAny,
                               accountSaveSuggested) {
    var queues = this._opsByAccount[account.id],
        serverQueue = queues.server,
        localQueue = queues.local;
    queues.active = false;

    if (serverQueue[0] !== op)
      this._LOG.opInvariantFailure();

    // Should we attempt to retry (but fail if tryCount is reached)?
    var maybeRetry = false;
    // Pop the event off the queue? (avoid bugs versus multiple calls)
    var consumeOp = true;
    // Generate completion notifications for the op?
    var completeOp = true;
    if (err) {
      switch (err) {
        case 'defer':
          if (++op.tryCount < $syncbase.MAX_OP_TRY_COUNT) {
            // Defer the operation if we still want to do the thing, but skip
            // deferring if we are now trying to undo the thing.
            if (op.serverStatus === 'doing' && op.lifecycle === 'do') {
              this._LOG.opDeferred(op.type, op.longtermId);
              this._deferOp(account, op);
            }
            // remove the op from the queue, but don't mark it completed
            completeOp = false;
          }
          else {
            op.lifecycle = 'moot';
            op.serverStatus = 'moot';
          }
          break;
        case 'aborted-retry':
          op.tryCount++;
          maybeRetry = true;
          break;
        default: // (unknown case)
          op.tryCount += $syncbase.OP_UNKNOWN_ERROR_TRY_COUNT_INCREMENT;
          maybeRetry = true;
          break;
        case 'failure-give-up':
          this._LOG.opGaveUp(op.type, op.longtermId);
          // we complete the op, but the error flag is propagated
          op.lifecycle = 'moot';
          op.serverStatus = 'moot';
          break;
        case 'moot':
          this._LOG.opMooted(op.type, op.longtermId);
          // we complete the op, but the error flag is propagated
          op.lifecycle = 'moot';
          op.serverStatus = 'moot';
          break;
      }
    }
    else {
      switch (op.serverStatus) {
        case 'checking':
          // Update the status, and figure out if there is any work to do based
          // on our desire.
          switch (resultIfAny) {
            case 'checked-notyet':
            case 'coherent-notyet':
              op.serverStatus = null;
              break;
            case 'idempotent':
              if (op.lifecycle === 'do' || op.lifecycle === 'done')
                op.serverStatus = null;
              else
                op.serverStatus = 'done';
              break;
            case 'happened':
              op.serverStatus = 'done';
              break;
            case 'moot':
              op.lifecycle = 'moot';
              op.serverStatus = 'moot';
              break;
            // this is the same thing as defer.
            case 'bailed':
              this._LOG.opDeferred(op.type, op.longtermId);
              this._deferOp(account, op);
              completeOp = false;
              break;
          }
          break;
        case 'doing':
          op.serverStatus = 'done';
          // lifecycle may have changed to 'undo'; don't mutate if so
          if (op.lifecycle === 'do')
            op.lifecycle = 'done';
          break;
        case 'undoing':
          op.serverStatus = 'undone';
          // this will always be true until we gain 'redo' functionality
          if (op.lifecycle === 'undo')
            op.lifecycle = 'undone';
          break;
      }
      // If we still want to do something, then don't consume the op.
      if (op.lifecycle === 'do' || op.lifecycle === 'undo')
        consumeOp = false;
    }

    if (maybeRetry) {
      if (op.tryCount < $syncbase.MAX_OP_TRY_COUNT) {
        // We're still good to try again, but we will need to check the status
        // first.
        op.serverStatus = 'check';
        consumeOp = false;
      }
      else {
        this._LOG.opTryLimitReached(op.type, op.longtermId);
        // we complete the op, but the error flag is propagated
        op.lifecycle = 'moot';
        op.serverStatus = 'moot';
      }
    }

    if (consumeOp)
      serverQueue.shift();

    // Some completeOp callbacks want to wait for account
    // save but they are triggered before save is attempted,
    // for the account to properly trigger runAfterSaves
    // callbacks, so set a flag indicating save state here.
    if (accountSaveSuggested)
      account._saveAccountIsImminent = true;

    if (completeOp) {
      if (this._opCallbacks.hasOwnProperty(op.longtermId)) {
        var callback = this._opCallbacks[op.longtermId];
        delete this._opCallbacks[op.longtermId];
        try {
          callback(err, resultIfAny, account, op);
        }
        catch(ex) {
          console.log(ex.message, ex.stack);
          this._LOG.opCallbackErr(op.type);
        }
      }

      // This is a suggestion; in the event of high-throughput on operations,
      // we probably don't want to save the account every tick, etc.
      if (accountSaveSuggested) {
        account._saveAccountIsImminent = false;
        account.saveAccountState(null, null, 'serverOp');
      }
    }

    if (localQueue.length) {
      op = localQueue[0];
      this._dispatchLocalOpForAccount(account, op);
    }
    else if (serverQueue.length && this.online && account.enabled) {
      op = serverQueue[0];
      this._dispatchServerOpForAccount(account, op);
    }
    else if (this._opCompletionListenersByAccount[account.id]) {
      this._opCompletionListenersByAccount[account.id](account);
      this._opCompletionListenersByAccount[account.id] = null;
    }
  },

  /**
   * Enqueue an operation for processing.  The local mutation is enqueued if it
   * has not yet been run.  The server piece is always enqueued.
   *
   * @args[
   *   @param[account]
   *   @param[op SerializedMutation]{
   *     Note that a `null` longtermId should be passed in if the operation
   *     should be persisted, and a 'session' string if the operation should
   *     not be persisted.  In both cases, a longtermId will be allocated,
   *   }
   *   @param[optionalCallback #:optional Function]{
   *     A callback to invoke when the operation completes.  Callbacks are
   *     obviously not capable of being persisted and are merely best effort.
   *   }
   * ]
   */
  _queueAccountOp: function(account, op, optionalCallback) {
    // Log the op for debugging assistance
    // TODO: Create a real logger event; this will require updating existing
    // tests and so is not sufficiently trivial to do at this time.
    console.log('queueOp', account.id, op.type);
    // - Name the op, register callbacks
    if (op.longtermId === null) {
      // mutation job must be persisted until completed otherwise bad thing
      // will happen.
      op.longtermId = account.id + '/' +
                        $a64.encodeInt(account.meta.nextMutationNum++);
      account.mutations.push(op);
      // Clear out any completed/dead operations that put us over the undo
      // threshold.
      while (account.mutations.length > MAX_MUTATIONS_FOR_UNDO &&
             (account.mutations[0].lifecycle === 'done') ||
             (account.mutations[0].lifecycle === 'undone') ||
             (account.mutations[0].lifecycle === 'moot')) {
        account.mutations.shift();
      }
    }
    else if (op.longtermId === 'session') {
      op.longtermId = account.id + '/' +
                        $a64.encodeInt(account.meta.nextMutationNum++);
    }

    if (optionalCallback)
      this._opCallbacks[op.longtermId] = optionalCallback;



    // - Enqueue
    var queues = this._opsByAccount[account.id];
    // Local processing needs to happen if we're not in the right local state.
    if (!this._testModeDisablingLocalOps &&
        ((op.lifecycle === 'do' && op.localStatus === null) ||
         (op.lifecycle === 'undo' && op.localStatus !== 'undone' &&
          op.localStatus !== 'unknown')))
      queues.local.push(op);
    if (op.serverStatus !== 'n/a' && op.serverStatus !== 'moot')
      queues.server.push(op);

    // If there is already something active, don't do anything!
    if (queues.active) {
    }
    else if (queues.local.length) {
      // Only actually dispatch if there is only the op we just (maybe).
      if (queues.local.length === 1 && queues.local[0] === op)
        this._dispatchLocalOpForAccount(account, op);
      // else: we grabbed control flow to avoid the server queue running
    }
    else if (queues.server.length === 1 && queues.server[0] === op &&
             this.online && account.enabled) {
      this._dispatchServerOpForAccount(account, op);
    }

    return op.longtermId;
  },

  waitForAccountOps: function(account, callback) {
    var queues = this._opsByAccount[account.id];
    if (queues.local.length === 0 &&
       (queues.server.length === 0 || !this.online || !account.enabled))
      callback();
    else
      this._opCompletionListenersByAccount[account.id] = callback;
  },

  syncFolderList: function(account, callback) {
    this._queueAccountOp(
      account,
      {
        type: 'syncFolderList',
        longtermId: 'session',
        lifecycle: 'do',
        localStatus: 'done',
        serverStatus: null,
        tryCount: 0,
        humanOp: 'syncFolderList'
      },
      callback);
  },

  /**
   * Schedule a purge of the excess messages from the given folder.  This
   * currently only makes sense for IMAP accounts and will automatically be
   * called by the FolderStorage and its owning account when a sufficient
   * number of blocks have been allocated by the storage.
   */
  purgeExcessMessages: function(account, folderId, callback) {
    this._queueAccountOp(
      account,
      {
        type: 'purgeExcessMessages',
        longtermId: 'session',
        lifecycle: 'do',
        localStatus: null,
        serverStatus: 'n/a',
        tryCount: 0,
        humanOp: 'purgeExcessMessages',
        folderId: folderId
      },
      callback);
  },

  /**
   * Download entire bodyRep(s) representation.
   */
  downloadMessageBodyReps: function(suid, date, callback) {
    var account = this.getAccountForMessageSuid(suid);
    this._queueAccountOp(
      account,
      {
        type: 'downloadBodyReps',
        longtermId: 'session',
        lifecycle: 'do',
        localStatus: 'done',
        serverStatus: null,
        tryCount: 0,
        humanOp: 'downloadBodyReps',
        messageSuid: suid,
        messageDate: date
      },
      callback
    );
  },

  downloadBodies: function(messages, options, callback) {
    if (typeof(options) === 'function') {
      callback = options;
      options = null;
    }

    var self = this;
    var pending = 0;

    function next() {
      if (!--pending) {
        callback();
      }
    }
    this._partitionMessagesByAccount(messages, null).forEach(function(x) {
      pending++;
      self._queueAccountOp(
        x.account,
        {
          type: 'downloadBodies',
          longtermId: 'session', // don't persist this job.
          lifecycle: 'do',
          localStatus: 'done',
          serverStatus: null,
          tryCount: 0,
          humanOp: 'downloadBodies',
          messages: x.messages,
          options: options
        },
        next
      );
    });
  },

  /**
   * Download one or more related-part or attachments from a message.
   * Attachments are named by their index because the indices are stable and
   * flinging around non-authoritative copies of the structures might lead to
   * some (minor) confusion.
   *
   * This request is persistent although the callback will obviously be
   * discarded in the event the app is killed.
   */
  downloadMessageAttachments: function(messageSuid, messageDate,
                                       relPartIndices, attachmentIndices,
                                       callback) {
    var account = this.getAccountForMessageSuid(messageSuid);
    var longtermId = this._queueAccountOp(
      account,
      {
        type: 'download',
        longtermId: null,
        lifecycle: 'do',
        localStatus: null,
        serverStatus: null,
        tryCount: 0,
        humanOp: 'download',
        messageSuid: messageSuid,
        messageDate: messageDate,
        relPartIndices: relPartIndices,
        attachmentIndices: attachmentIndices
      },
      callback);
  },

  modifyMessageTags: function(humanOp, messageSuids, addTags, removeTags) {
    var self = this, longtermIds = [];
    this._partitionMessagesByAccount(messageSuids, null).forEach(function(x) {
      var longtermId = self._queueAccountOp(
        x.account,
        {
          type: 'modtags',
          longtermId: null,
          lifecycle: 'do',
          localStatus: null,
          serverStatus: null,
          tryCount: 0,
          humanOp: humanOp,
          messages: x.messages,
          addTags: addTags,
          removeTags: removeTags,
          // how many messages have had their tags changed already.
          progress: 0,
        });
      longtermIds.push(longtermId);
    });
    return longtermIds;
  },

  moveMessages: function(messageSuids, targetFolderId) {
    var self = this, longtermIds = [],
        targetFolderAccount = this.getAccountForFolderId(targetFolderId);
    this._partitionMessagesByAccount(messageSuids, null).forEach(function(x) {
      // TODO: implement cross-account moves and then remove this constraint
      // and instead schedule the cross-account move.
      if (x.account !== targetFolderAccount)
        throw new Error('cross-account moves not currently supported!');
      var longtermId = self._queueAccountOp(
        x.account,
        {
          type: 'move',
          longtermId: null,
          lifecycle: 'do',
          localStatus: null,
          serverStatus: null,
          tryCount: 0,
          humanOp: 'move',
          messages: x.messages,
          targetFolder: targetFolderId,
        });
      longtermIds.push(longtermId);
    });
    return longtermIds;
  },

  deleteMessages: function(messageSuids) {
    var self = this, longtermIds = [];
    this._partitionMessagesByAccount(messageSuids, null).forEach(function(x) {
      var longtermId = self._queueAccountOp(
        x.account,
        {
          type: 'delete',
          longtermId: null,
          lifecycle: 'do',
          localStatus: null,
          serverStatus: null,
          tryCount: 0,
          humanOp: 'delete',
          messages: x.messages
        });
      longtermIds.push(longtermId);
    });
    return longtermIds;
  },

  /**
   * APPEND messages to an IMAP server without locally saving the messages.
   * This was originally an IMAP testing operation that was co-opted to be
   * used for saving sent messages in a corner-cutting fashion.  (The right
   * thing for us to do would be to save the message locally too and deal with
   * the UID implications.  But that is tricky.)
   *
   * See ImapAccount.saveSentMessage for more context.
   *
   * POP3's variation on this is saveSentDraft
   */
  appendMessages: function(folderId, messages, callback) {
    var account = this.getAccountForFolderId(folderId);
    var longtermId = this._queueAccountOp(
      account,
      {
        type: 'append',
        // Don't persist.  See ImapAccount.saveSentMessage for our rationale.
        longtermId: 'session',
        lifecycle: 'do',
        localStatus: 'done',
        serverStatus: null,
        tryCount: 0,
        humanOp: 'append',
        messages: messages,
        folderId: folderId,
      },
      callback);
    return [longtermId];
  },

  /**
   * Save a sent POP3 message to the account's "sent" folder.  See
   * Pop3Account.saveSentMessage for more information.
   *
   * IMAP's variation on this is appendMessages.
   *
   * @param folderId {FolderID}
   * @param sentSafeHeader {HeaderInfo}
   *   The header ready to be added to the sent folder; suid issued and
   *   everything.
   * @param sentSafeBody {BodyInfo}
   *   The body ready to be added to the sent folder; attachment blobs stripped.
   * @param callback {function(err)}
   */
  saveSentDraft: function(folderId, sentSafeHeader, sentSafeBody, callback) {
    var account = this.getAccountForMessageSuid(sentSafeHeader.suid);
    var longtermId = this._queueAccountOp(
      account,
      {
        type: 'saveSentDraft',
        // we can persist this since we have stripped the blobs
        longtermId: null,
        lifecycle: 'do',
        localStatus: null,
        serverStatus: 'n/a',
        tryCount: 0,
        humanOp: 'saveSentDraft',
        folderId: folderId,
        headerInfo: sentSafeHeader,
        bodyInfo: sentSafeBody
      });
    return [longtermId];
  },

  /**
   * Process the given attachment blob in slices into base64-encoded Blobs
   * that we store in IndexedDB (currently).  This is a local-only operation.
   *
   * This function is implemented as a job/operation so it is inherently ordered
   * relative to other draft-related calls.  But do keep in mind that you need
   * to make sure to not destroy the underlying storage for the Blob (ex: when
   * using DeviceStorage) until the callback has fired.
   */
  attachBlobToDraft: function(account, existingNamer, attachmentDef, callback) {
    this._queueAccountOp(
      account,
      {
        type: 'attachBlobToDraft',
        // We don't persist the operation to disk in order to avoid having the
        // Blob we are attaching get persisted to IndexedDB.  Better for the
        // disk I/O to be ours from the base64 encoded writes we do even if
        // there is a few seconds of data-loss-ish vulnerability.
        longtermId: 'session',
        lifecycle: 'do',
        localStatus: null,
        serverStatus: 'n/a', // local-only currently
        tryCount: 0,
        humanOp: 'attachBlobToDraft',
        existingNamer: existingNamer,
        attachmentDef: attachmentDef
      },
      callback
    );
  },

  /**
   * Remove an attachment from a draft.  This will not interrupt an active
   * attaching operation or moot a pending one.  This is a local-only operation.
   */
  detachAttachmentFromDraft: function(account, existingNamer, attachmentIndex,
                                      callback) {
    this._queueAccountOp(
      account,
      {
        type: 'detachAttachmentFromDraft',
        // This is currently non-persisted for symmetry with attachBlobToDraft
        // but could be persisted if we wanted.
        longtermId: 'session',
        lifecycle: 'do',
        localStatus: null,
        serverStatus: 'n/a', // local-only currently
        tryCount: 0,
        humanOp: 'detachAttachmentFromDraft',
        existingNamer: existingNamer,
        attachmentIndex: attachmentIndex
      },
      callback
    );
  },

  /**
   * Save a new (local) draft or update an existing (local) draft.  A new namer
   * is synchronously created and returned which will be the name for the draft
   * assuming the save completes successfully.
   *
   * This function is implemented as a job/operation so it is inherently ordered
   * relative to other draft-related calls.
   *
   * @method saveDraft
   * @param account
   * @param [existingNamer] {MessageNamer}
   * @param draftRep
   * @param callback {Function}
   * @return {MessageNamer}
   *
   */
  saveDraft: function(account, existingNamer, draftRep, callback) {
    var draftsFolderMeta = account.getFirstFolderWithType('localdrafts');
    var draftsFolderStorage = account.getFolderStorageForFolderId(
                                draftsFolderMeta.id);
    var newId = draftsFolderStorage._issueNewHeaderId();
    var newDraftInfo = {
      id: newId,
      suid: draftsFolderStorage.folderId + '/' + newId,
      // There are really 3 possible values we could use for this; when the
      // front-end initiates the draft saving, when we, the back-end observe and
      // enqueue the request (now), or when the draft actually gets saved to
      // disk.
      //
      // This value does get surfaced to the user, so we ideally want it to
      // occur within a few seconds of when the save is initiated.  We do this
      // here right now because we have access to $date, and we should generally
      // be timely about receiving messages.
      date: $date.NOW(),
    };
    this._queueAccountOp(
      account,
      {
        type: 'saveDraft',
        longtermId: null,
        lifecycle: 'do',
        localStatus: null,
        serverStatus: 'n/a', // local-only currently
        tryCount: 0,
        humanOp: 'saveDraft',
        existingNamer: existingNamer,
        newDraftInfo: newDraftInfo,
        draftRep: draftRep,
      },
      callback
    );
    return {
      suid: newDraftInfo.suid,
      date: newDraftInfo.date
    };
  },

  /**
   * Delete an existing (local) draft.
   *
   * This function is implemented as a job/operation so it is inherently ordered
   * relative to other draft-related calls.
   */
  deleteDraft: function(account, messageNamer, callback) {
    this._queueAccountOp(
      account,
      {
        type: 'deleteDraft',
        longtermId: null,
        lifecycle: 'do',
        localStatus: null,
        serverStatus: 'n/a', // local-only currently
        tryCount: 0,
        humanOp: 'deleteDraft',
        messageNamer: messageNamer
      },
      callback
    );

  },

  /**
   * Create a folder that is the child/descendant of the given parent folder.
   * If no parent folder id is provided, we attempt to create a root folder.
   *
   * This is not implemented as a job 'operation' because our UX spec does not
   * call for this to be an undoable operation, nor do we particularly want the
   * potential permutations of having offline folders that the server does not
   * know about.
   *
   * @args[
   *   @param[accountId]
   *   @param[parentFolderId @oneof[null String]]{
   *     If null, place the folder at the top-level, otherwise place it under
   *     the given folder.
   *   }
   *   @param[folderName]
   *   @param[containOnlyOtherFolders Boolean]{
   *     Should this folder only contain other folders (and no messages)?
   *     On some servers/backends, mail-bearing folders may not be able to
   *     create sub-folders, in which case one would have to pass this.
   *   }
   *   @param[callback @func[
   *     @args[
   *       @param[error @oneof[
   *         @case[null]{
   *           No error, the folder got created and everything is awesome.
   *         }
   *         @case['moot']{
   *           The folder appears to already exist.
   *         }
   *         @case['unknown']{
   *           It didn't work and we don't have a better reason.
   *         }
   *       ]]
   *       @param[folderMeta ImapFolderMeta]{
   *         The meta-information for the folder.
   *       }
   *     ]
   *   ]]{
   *   }
   * ]
   */
  createFolder: function(accountId, parentFolderId, folderName,
                         containOnlyOtherFolders, callback) {
    var account = this.getAccountForAccountId(accountId);
    var longtermId = this._queueAccountOp(
      account,
      {
        type: 'createFolder',
        longtermId: null,
        lifecycle: 'do',
        localStatus: null,
        serverStatus: null,
        tryCount: 0,
        humanOp: 'createFolder',
        parentFolderId: parentFolderId,
        folderName: folderName,
        containOnlyOtherFolders: containOnlyOtherFolders
      },
      callback);
    return [longtermId];
  },

  /**
   * Idempotently trigger the undo logic for the performed operation.  Calling
   * undo on an operation that is already undone/slated for undo has no effect.
   */
  undoMutation: function(longtermIds) {
    for (var i = 0; i < longtermIds.length; i++) {
      var longtermId = longtermIds[i],
          account = this.getAccountForFolderId(longtermId), // (it's fine)
          queues = this._opsByAccount[account.id];

      for (var iOp = 0; iOp < account.mutations.length; iOp++) {
        var op = account.mutations[iOp];
        if (op.longtermId === longtermId) {
          // There is nothing to do if we have already processed the request or
          // or the op has already been fully undone.
          if (op.lifecycle === 'undo' || op.lifecycle === 'undone') {
            continue;
          }

          // Queue an undo operation if we're already done.
          if (op.lifecycle === 'done') {
            op.lifecycle = 'undo';
            this._queueAccountOp(account, op);
            continue;
          }
          // else op.lifecycle === 'do'

          // If we have not yet started processing the operation, we can
          // simply remove the operation from the local queue.
          var idx = queues.local.indexOf(op);
          if (idx !== -1) {
              op.lifecycle = 'undone';
              queues.local.splice(idx, 1);
              continue;
          }
          // (the operation must have already been run locally, which means
          // that at the very least we need to local_undo, so queue it.)

          op.lifecycle = 'undo';
          this._queueAccountOp(account, op);
        }
      }
    }
  },

  //////////////////////////////////////////////////////////////////////////////
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  MailUniverse: {
    type: $log.ACCOUNT,
    events: {
      configCreated: {},
      configMigrating: {},
      configLoaded: {},
      createAccount: { type: true, id: false },
      opDeferred: { type: true, id: false },
      opTryLimitReached: { type: true, id: false },
      opGaveUp: { type: true, id: false },
      opMooted: { type: true, id: false },
    },
    TEST_ONLY_events: {
      configCreated: { config: false },
      configMigrating: { lazyCarryover: false },
      configLoaded: { config: false, accounts: false },
      createAccount: { name: false },
    },
    errors: {
      badAccountType: { type: true },
      opCallbackErr: { type: false },
      opInvariantFailure: {},
    },
  },
});

}); // end define
;
define('mailapi/worker-setup',
  [
    './shim-sham',
    './worker-router',
    './mailbridge',
    './mailuniverse',
    'exports'
  ],
  function(
    $shim_setup,
    $router,
    $mailbridge,
    $mailuniverse,
    exports
  ) {
'use strict';

var routerBridgeMaker = $router.registerInstanceType('bridge');

var bridgeUniqueIdentifier = 0;
function createBridgePair(universe) {
  var uid = bridgeUniqueIdentifier++;

  var TMB = new $mailbridge.MailBridge(universe);
  var routerInfo = routerBridgeMaker.register(function(data) {
    TMB.__receiveMessage(data.msg);
  });
  var sendMessage = routerInfo.sendMessage;

  TMB.__sendMessage = function(msg) {
    TMB._LOG.send(msg.type, msg);
    sendMessage(null, msg);
  };

  // Let's say hello to the main thread in order to generate a
  // corresponding mailAPI.
  TMB.__sendMessage({
    type: 'hello',
    config: universe.exposeConfigForClient()
  });
}

var universe = null;

function onUniverse() {
  createBridgePair(universe);
  console.log("Mail universe/bridge created and notified!");
}

var sendControl = $router.registerSimple('control', function(data) {
  var args = data.args;
  switch (data.cmd) {
    case 'hello':
      universe = new $mailuniverse.MailUniverse(onUniverse, args[0]);
      break;

    case 'online':
    case 'offline':
      universe._onConnectionChange(args[0]);
      break;
  }
});
sendControl('hello');

////////////////////////////////////////////////////////////////////////////////

});

require(["mailapi/worker-setup"]);
