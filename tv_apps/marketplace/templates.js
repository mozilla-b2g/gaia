(function() {
var templates = {};
templates["confirmation.html"] = (function() {function root(env, context, frame, runtime, cb) {
var lineno = null;
var colno = null;
var output = "";
try {
output += "<a href=\"#\" class=\"close\">";
output += context.lookup("_")("Close");
output += "</a>\n<p class=\"content\"></p>\n<div class=\"buttons\">\n<button class=\"button btn-cancel btn-delete confirmation-no alt\">";
output += context.lookup("_")("No");
output += "</button>\n<button class=\"button btn-approve confirmation-yes\">";
output += context.lookup("_")("Yes");
output += "</button>\n</div>";
cb(null, output);
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};
})();

templates["homepage.html"] = (function() {function root(env, context, frame, runtime, cb) {
var lineno = null;
var colno = null;
var output = "";
try {
output += "<div class=\"app-preview\"></div>\n<div class=\"app-list\">";
output += runtime.suppressValue(env.getExtension("defer")["run"](context,runtime.makeKeywordArgs({"url": runtime.contextOrFrameLookup(context, frame, "api")("apps"),"pluck": "objects","as": "apps","key": "slug"}),function(cb) {
if(!cb) { cb = function(err) { if(err) { throw err; }}}
var t_1 = "";t_1 += "<ul class=\"clearfix\">";
frame = frame.push();
var t_4 = runtime.contextOrFrameLookup(context, frame, "this");
if(t_4) {for(var t_2=0; t_2 < t_4.length; t_2++) {
var t_5 = t_4[t_2];
frame.set("app", t_5);
t_1 += "<li class=\"app-list-app focusable\" data-slug=\"";
t_1 += runtime.suppressValue(runtime.memberLookup((t_5),"slug", env.autoesc), env.autoesc);
t_1 += "\">\n<img src=\"";
t_1 += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((t_5),"icons", env.autoesc)),"128", env.autoesc), env.autoesc);
t_1 += "\"\nalt=\"";
t_1 += runtime.suppressValue(runtime.memberLookup((t_5),"name", env.autoesc), env.autoesc);
t_1 += "\" title=\"";
t_1 += runtime.suppressValue(runtime.memberLookup((t_5),"name", env.autoesc), env.autoesc);
t_1 += "\">\n<span class=\"name\">";
t_1 += runtime.suppressValue(runtime.memberLookup((t_5),"name", env.autoesc), env.autoesc);
t_1 += "</span>\n</li>";
;
}
}
frame = frame.pop();
t_1 += "</ul>";
cb(null, t_1);
;
return t_1;
}
,function(cb) {
if(!cb) { cb = function(err) { if(err) { throw err; }}}
var t_6 = "";t_6 += "<ul>\n<li>loading...</li>\n</ul>";
cb(null, t_6);
;
return t_6;
}
,null,null), true && env.autoesc);
output += "</div>";
cb(null, output);
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};
})();

templates["_includes/app_preview.html"] = (function() {function root(env, context, frame, runtime, cb) {
var lineno = null;
var colno = null;
var output = "";
try {
output += "<div class=\"preview\">\n<img src=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.memberLookup((runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "app")),"previews", env.autoesc)),0, env.autoesc)),"image_url", env.autoesc), env.autoesc);
output += "\"\nalt=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "app")),"name", env.autoesc), env.autoesc);
output += "\" title=\"";
output += runtime.suppressValue(runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "app")),"name", env.autoesc), env.autoesc);
output += "\">\n</div>\n<h1 class=\"name\">";
output += runtime.suppressValue(runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "app")),"name", env.autoesc), env.autoesc);
output += "</h1>\n<span class=\"type\">";
output += runtime.suppressValue(runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "app")),"premium_type", env.autoesc), env.autoesc);
output += "</span>\n<span class=\"author\">By ";
output += runtime.suppressValue(runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "app")),"author", env.autoesc), env.autoesc);
output += "</span>\n<article class=\"description\">";
output += runtime.suppressValue(env.getFilter("safe").call(context, runtime.memberLookup((runtime.contextOrFrameLookup(context, frame, "app")),"description", env.autoesc)), env.autoesc);
output += "</article>";
cb(null, output);
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};
})();

templates["errors/404.html"] = (function() {function root(env, context, frame, runtime, cb) {
var lineno = null;
var colno = null;
var output = "";
try {
output += "<section class=\"main infobox\">\n<div>\n<h2>";
output += context.lookup("_")("Oh no!");
output += "</h2>\n<p>";
output += context.lookup("_")("The page you were looking for was not found.");
output += "</p>\n</div>\n</section>";
cb(null, output);
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};
})();

templates["errors/fragment.html"] = (function() {function root(env, context, frame, runtime, cb) {
var lineno = null;
var colno = null;
var output = "";
try {
output += "<span class=\"fragment-error\">\n<b>";
output += context.lookup("_")("Oh no!");
output += "</b>";
output += context.lookup("_")("An error occurred.");
output += "</span>";
cb(null, output);
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};
})();

templates["errors/pagination.html"] = (function() {function root(env, context, frame, runtime, cb) {
var lineno = null;
var colno = null;
var output = "";
try {
output += "<li class=\"pagination-error loadmore\">\n<span class=\"error-text\">";
output += context.lookup("_")("Error loading more");
output += "</span>\n<button class=\"button alt\" data-url=\"";
output += runtime.suppressValue(runtime.contextOrFrameLookup(context, frame, "more_url"), env.autoesc);
output += "\">";
output += context.lookup("_")("Try Again");
output += "</button>\n<div class=\"spinner alt btn-replace\"></div>\n</li>";
cb(null, output);
;
} catch (e) {
  cb(runtime.handleError(e, lineno, colno));
}
}
return {
root: root
};
})();
define("templates", ["core/nunjucks", "core/helpers"], function(nunjucks) {
    nunjucks.env = new nunjucks.Environment([], {autoescape: true});
    nunjucks.env.cache = nunjucks.templates = templates;
    console.log("Templates loaded");
    return nunjucks;
});
})();