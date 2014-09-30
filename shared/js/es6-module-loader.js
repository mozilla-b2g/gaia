
(function(exports){'use strict';var headEl=document.getElementsByTagName('head')[0],ie=/MSIE/.test(navigator.userAgent);function normalizeName(child,parentBase){if(child.charAt(0)==='/'){child=child.slice(1);}
if(child.charAt(0)!=='.'){return child;}
var parts=child.split('/');while(parts[0]==='.'||parts[0]==='..'){if(parts.shift()==='..'){parentBase.pop();}}
return parentBase.concat(parts).join('/');}
var seen=Object.create(null);var internalRegistry=Object.create(null);var externalRegistry=Object.create(null);var anonymousEntry;function ensuredExecute(name){var mod=internalRegistry[name];if(mod&&!seen[name]){seen[name]=true;mod.execute();}
return mod&&mod.proxy;}
function set(name,values){externalRegistry[name]=values;}
function get(name){return externalRegistry[name]||ensuredExecute(name);}
function has(name){return!!externalRegistry[name]||!!internalRegistry[name];}
function createScriptNode(src,callback){var node=document.createElement('script');if(node.async){node.async=false;}
if(ie){node.onreadystatechange=function(){if(/loaded|complete/.test(this.readyState)){this.onreadystatechange=null;callback();}};}else{node.onload=node.onerror=callback;}
node.setAttribute('src',src);headEl.appendChild(node);}
function load(name){return new Promise(function(resolve,reject){createScriptNode((System.baseURL||'/')+name+'.js',function(err){if(anonymousEntry){System.register(name,anonymousEntry[0],anonymousEntry[1]);anonymousEntry=undefined;}
var mod=internalRegistry[name];if(!mod){reject(new Error('Error loading module '+name));return;}
Promise.all(mod.deps.map(function(dep){if(externalRegistry[dep]||internalRegistry[dep]){return Promise.resolve();}
return load(dep);})).then(resolve,reject);});});}
var System={set:set,get:get,has:has,import:function(name){return new Promise(function(resolve,reject){var normalizedName=normalizeName(name,[]);var mod=get(normalizedName);return mod?resolve(mod):load(name).then(function(){return get(normalizedName);});});},register:function(name,deps,wrapper){if(Array.isArray(name)){anonymousEntry=[];anonymousEntry.push.apply(anonymousEntry,arguments);return;}
var proxy=Object.create(null),values=Object.create(null),mod,meta;internalRegistry[name]=mod={proxy:proxy,values:values,deps:deps.map(function(dep){return normalizeName(dep,name.split('/').slice(0,-1));}),dependants:[],update:function(moduleName,moduleObj){meta.setters[mod.deps.indexOf(moduleName)](moduleObj);},execute:function(){mod.deps.map(function(dep){var imports=externalRegistry[dep];if(imports){mod.update(dep,imports);}else{imports=get(dep)&&internalRegistry[dep].values;if(imports){internalRegistry[dep].dependants.push(name);mod.update(dep,imports);}}});meta.execute();}};meta=wrapper(function(identifier,value){values[identifier]=value;mod.lock=true;mod.dependants.forEach(function(moduleName){if(internalRegistry[moduleName]&&!internalRegistry[moduleName].lock){internalRegistry[moduleName].update(name,values);}});mod.lock=false;if(!Object.getOwnPropertyDescriptor(proxy,identifier)){Object.defineProperty(proxy,identifier,{enumerable:true,get:function(){return values[identifier];}});}
return value;});}};exports.System=System;})(window);