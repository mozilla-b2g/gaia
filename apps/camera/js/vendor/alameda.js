/**
 * alameda 0.0.9 Copyright (c) 2011-2012, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/requirejs/alameda for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true, nomen: true, regexp: true */
/*global setTimeout, process, document, navigator, importScripts */

var requirejs, require, define;
(function (global, undef) {
    var prim, topReq, dataMain, src, subPath,
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
     * prim 0.0.4 Copyright (c) 2012-2013, The Dojo Foundation All Rights Reserved.
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

        function syncTick(fn) {
            fn();
        }

        function notify(ary, value) {
            prim.nextTick(function () {
                ary.forEach(function (item) {
                    item(value);
                });
            });
        }

        prim = function prim(options) {
            var p,
                ok = [],
                fail = [],
                nextTick = options && options.sync ? syncTick : prim.nextTick;

            return (p = {
                callback: function (yes, no) {
                    if (no) {
                        p.errback(no);
                    }

                    if (hasProp(p, 'v')) {
                        nextTick(function () {
                            yes(p.v);
                        });
                    } else {
                        ok.push(yes);
                    }
                },

                errback: function (no) {
                    if (hasProp(p, 'e')) {
                        nextTick(function () {
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
                        var next = prim(options);

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

        prim.nextTick = typeof setImmediate === 'function' ? setImmediate.bind() :
            (typeof process !== 'undefined' && process.nextTick ?
                process.nextTick : (typeof setTimeout !== 'undefined' ?
                    asyncTick : syncTick));
    }());
    //END prim

    function newContext(contextName) {
        var req, main, makeMap, callDep, handlers, checkingLater, load, context,
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
            mapCache = {},
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
            } else {
                //Remove the require deferred from the list to
                //make cycle searching faster. Do not need to track
                //it anymore either.
                requireDeferreds.splice(requireDeferreds.indexOf(d), 1);
            }
            resolve(name, d, ret);
        }

        //This method is attached to every module deferred,
        //so the "this" in here is the module deferred object.
        function depFinished(val, i) {
            if (!this.rejected() && !this.depDefined[i]) {
                this.depDefined[i] = true;
                this.depCount += 1;
                this.values[i] = val;
                if (!this.depending && this.depCount === this.depMax) {
                    defineModule(this);
                }
            }
        }

        function makeDefer(name) {
            var d = prim({
                sync: !!name
            });
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
                            err = new Error('Load failed: ' + id + ': ' + script.src);
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

            var plugin, url, parts, prefix, result,
                cacheKey = name + ' & ' + (relName || '') + ' & ' + !!applyMap;

            parts = splitPrefix(name);
            prefix = parts[0];
            name = parts[1];

            if (!prefix && hasProp(mapCache, cacheKey)) {
                return mapCache[cacheKey];
            }

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
            result = {
                id: prefix ? prefix + '!' + name : name, //fullName
                n: name,
                pr: prefix,
                url: url
            };

            if (!prefix) {
                mapCache[cacheKey] = result;
            }

            return result;
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
                    var depId = depMap.id,
                        dep = !hasProp(handlers, depId) && getDefer(depId);

                    //Only force things that have not completed
                    //being defined, so still in the registry,
                    //and only if it has not been matched up
                    //in the module already.
                    if (dep && !dep.finished() && !processed[depId]) {
                        if (hasProp(traced, depId)) {
                            d.deps.forEach(function (depMap, i) {
                                if (depMap.id === depId) {
                                    d.depFinished(defined[depId], i);
                                }
                            });
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
            }
            processed[id] = true;
        }

        function check(d) {
            var err,
                notFinished = [],
                waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (startTime + waitInterval) < (new Date()).getTime();

            if (loadCount === 0) {
                //If passed in a deferred, it is for a specific require call.
                //Could be a sync case that needs resolution right away.
                //Otherwise, if no deferred, means a nextTick and all
                //waiting require deferreds should be checked.
                if (d) {
                    if (!d.finished()) {
                        breakCycle(d, {}, {});
                    }
                } else if (requireDeferreds.length) {
                    requireDeferreds.forEach(function (d) {
                        breakCycle(d, {}, {});
                    });
                }
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if (expired) {
                //If wait time expired, throw error of unloaded modules.
                eachProp(deferreds, function (d) {
                    if (!d.finished()) {
                        notFinished.push(d.map.id);
                    }
                });
                err = new Error('Timeout for modules: ' + notFinished);
                err.requireModules = notFinished;
                req.onError(err);
            } else if (loadCount || requireDeferreds.length) {
                //Something is still waiting to load. Wait for it, but only
                //if a later check is not already scheduled.
                if (!checkingLater) {
                    checkingLater = true;
                    prim.nextTick(function () {
                        checkingLater = false;
                        check();
                    });
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

                d.depending = true;
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
                d.depending = false;

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
                check(d);
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

            //Since config changed, mapCache may not be valid any more.
            mapCache = {};

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

            if (!bootstrapConfig || !bootstrapConfig.baseUrl) {
                //Pull off the directory of data-main for use as the
                //baseUrl.
                src = dataMain.split('/');
                dataMain = src.pop();
                subPath = src.length ? src.join('/')  + '/' : './';

                topReq.config({baseUrl: subPath});
            }

            topReq([dataMain]);
        }
    }
}(this));
