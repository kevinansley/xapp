/**
 * Xapp.js - A Simple, Intuitive SPA library
 * Developed by Kevin Johnson
 * kevinansley@gmail.com
 * xapp-js.com
**/
window.xapp = (function(){
    var apps = {},
        applyNum = 0,
        registry = [],
        registryByName = {},
        rgx = {
            braces: /\{\{(.*?)\}\}/g,
            each: /^(.*?)\s+in\s+(.*?)$/,
            options: /^(.*?)\s+displayed\s+as\s+(.*?)\s+in\s+(.*?)$/,
            alias: /^(.*?)\s+as\s+(.*?)$/,
            vars: /(?![\B\[])([a-zA-z\$\_][a-zA-Z0-9\$\_\'\"\.]*)\b/g,
            withinQuotes: /(["'])(?:(?=(\\?))\2.)*?\1/g
        };
        
    //xapp.setup(<name>, <appObj>)
    var xapp = {
        setup: function(appname, obj){
            if(!apps[appname]){
                registerTemplates();
                var selector = '[x-app]';
                if(appname) selector = '[x-app="' + appname + '"]';
                var appEl = document.querySelectorAll(selector)[0];
                apps[appname] = xapp.compile(appname, appEl, new scope((obj || window), "app", null));
            }
            xapp.apply(appname);
            return function(){ xapp.apply(appname); };
        },
        compile: function(appname, el, scope){
            var i, template = {
                appname: appname,
                initialEl: el,
                applyParams: [],
                scope: scope,
                source: el.cloneNode(true),
                children: [],
            };
            template.original = template;
            scope.locals.$hook = xapp.hook(appname);
            if(["SCRIPT","STYLE","LINK","META"].indexOf(el.tagName) !== -1) return template;
            for(i = 0; i < registry.length; i++){
                var reg = registry[i];
                if(reg.condition(template.source)){
                    template.applyParams.push({name: reg.name, param: reg.compile(scope, template.source)});
                }
            }
            for(i = 0; i < el.childNodes.length; i++){
                    template.children.push(xapp.compile(appname, el.childNodes[i], template.scope));
            }
            el.xappTemplate = template;
            return template;
        },
        apply: function(appname){
            clearTimeout(this.debounce.timeout);
            this.debounce.timeout = setTimeout(function(){
                var template = apps[appname];
                applyNum++;
                if(template){
                    xapp.applyOne(template.initialEl, template, []);
                    template.initialEl.setAttribute('rendered','true');
                }
            }, this.debounce.delay);
        },
        applyOne: function(el, template, excludes){
            var i;
            for(i = 0; i < template.applyParams.length; i++){
                var regname = template.applyParams[i].name;
                var param = template.applyParams[i].param;
                if(excludes.indexOf(regname) !== -1) continue;
                registryByName[regname].apply(template.scope, el, template, param);
            }
            if(el.parentNode && template.initialEl.nodeType === 1){
                for(i = 0; i < template.children.length; i++){
                    var child = template.children[i];
                    if(!child.isCompiled) child.scope = template.scope;
                    if((child.xappApplyNum || -1) < applyNum){
                        xapp.applyOne(child.initialEl, child, []);
                    }
                }
            }
            if(!el.xappApplied){
                var e = document.createEvent('Event');
                e.initEvent('init',true,true);
                el.dispatchEvent(e);
                el.xappApplied = true;
            } 
            template.xappApplyNum = applyNum;
        },
        compileFn: function(str, scope, params){
            (params || []).forEach(function(key){ scope.locals[key] = null; });
            var locals = getLocals(scope);
            var fn = parse(str, locals);
            return new Function("$locals", fn);
        },
        applyFn: function(fn, scope, params){
            Object.keys(params || {}).forEach(function(key){ scope.locals[key] = params[key]; });
            var locals = getLocals(scope);
            return fn(locals);
        },
        toComment: function(template, el, str){
            var comment = document.createComment(str);
            comment.xappEl = el;
            template.initialEl = comment;
            el.parentNode.replaceChild(comment, el);
            return comment;
        },
        undoComment: function(template, comment){
            template.initialEl = comment.xappEl;
            comment.parentNode.replaceChild(comment.xappEl, comment);
            return comment.xappEl;
        },
        newTemplate: function(template){
            var el = arguments[1] || template.source.cloneNode(true);
            var newTemplate = {
                appname: template.appname,
                initialEl: el,
                applyParams: template.applyParams,
                scope: template.scope,
                source: template.source,
                children: [],
                original: template
            };
            for(var i = 0; i < el.childNodes.length; i++){
                newTemplate.children.push(xapp.newTemplate(template.children[i], el.childNodes[i]));
            }
            return newTemplate;
        },
        logError: function(str){ 
            if(console && console.log) console.log(str);
        },
        createScope: function(obj, alias, currentScope){
            var s = new scope(obj, alias, currentScope);
            xapp.assign(s.locals, currentScope.locals);
            return s;
        },
        register: function(obj){ 
            registry.push(obj);
            registryByName[obj.name] = obj;
        },
        rgx: rgx,
        components: {},
        debounce: {timeout: {}, delay:0},
        array: function(obj) { return Array.prototype.slice.call(obj); },
        attrFn: function(str){ return function(el) { return el.nodeType === 1 && el.hasAttribute(str); };},
        hook: function(appname){ return function(){ xapp.apply(appname); };},
        assign: function(obj, toAssign){
            for(var key in toAssign){
                if(toAssign.hasOwnProperty(key)){
                    obj[key] = toAssign[key];
                }
            }
            return obj;
        }
    };
    function proxyProperty(proxy, obj, key){
        if(!proxy[key])
            Object.defineProperty(proxy, key, {
                        get: function() { return obj[key]; },
                        set: function(newValue) { obj[key] = newValue; }
            });
    }
    // scope is an object that looks like this: {alias: "vm", obj:{...}, parentScope:{...}, } //
    function getLocals(scope){
        var key, locals = {}, currentScope = scope;
        if(scope.$locals) return xapp.assign(scope.$locals, scope.locals);
        xapp.assign(locals,scope.locals);
        for(key in scope.obj){ 
            proxyProperty(locals, scope.obj, key);
        }
        if(scope.obj){
            var protos = Object.getPrototypeOf(scope.obj); 
            Object.getOwnPropertyNames(protos).forEach(function(key){
                proxyProperty(locals, protos, key);
            });
        }
        while(currentScope){
            if(!locals[currentScope.alias]) locals[currentScope.alias] = currentScope.obj;
            currentScope = currentScope.parentScope;
        }
        scope.$locals = locals;
        return locals;
    }
    function parse(str, locals) {
        var q = []; 
        return str
            .replace(rgx.withinQuotes, function(a) {  q.push(a); return "***"; })
            .replace(rgx.vars, function(y, x) {
                var splitIx = Math.min(x.indexOf('.')>>>0, x.indexOf('[')>>>0, x.length), 
                    left = x.substring(0, splitIx),
                    right = x.substring(splitIx);
                if(left in locals) left = '$locals["' + left + '"]';
                return left + right;
            })
            .replace(/\*\*\*/g, function(a) { return q.shift(); });
    }
    //scope is an object with an reference object, alias, and locals.
    function scope(obj, alias, parentScope){
        this.obj = obj;
        this.alias = alias;
        this.parentScope = parentScope;
        this.locals = {};
        this.$locals = null;
    }
    scope.prototype.localCopy = function(locals){
        var newScope = new scope(this.obj, this.alias, this.parentScope); //preserve parent scope
        xapp.assign(newScope.locals, this.locals);
        xapp.assign(newScope.locals, locals);
        return newScope;
    };
    // xapp.xhr("GET", "http://example.com/", data, options).success("json", ...).fail(...).send()
    xapp.xhr = (function(){
        var xhr = function(method, url, data, options){
            if(!options) options = {};
            for(var key in defaultOptions) options[key] = options[key] || defaultOptions[key];
            this.options = options;
            this.cancelled = false;
            this.status = "pending";
            this.data = data;
            this.url = url || '';
            this.method = method;
            this.onAfter = [];
            return this;
        };
        xhr.prototype.success = function(type, fn){            
            this.onSuccess = fn;
            this.responseType = type;
            return this;
        };
        xhr.prototype.fail = function(fn){
            this.onFail = fn;
            return this;
        };
        xhr.prototype.then = function(fn){
            this.onAfter.push(fn);
            return this;
        };
        xhr.prototype.cancel = function(){
            if(this.request) this.request.abort();
            this.status = "cancelled";
            return this;
        };
        xhr.prototype.send = function(){
            var self = this;
            var request = new XMLHttpRequest();
            var type = (this.responseType || "text").toLowerCase();
            var data = this.data || {};
            var callback = '';
            if(type == "jsonp") callback = data.callback = 'xapp_jsonp_' + jsonp_ix++;
            if(this.method === "GET"){
                this.url += (this.url.indexOf("?") < 0 ? "?" : "&") + Object.keys(data).map(function(x){ return encodeURIComponent(x) + "=" + encodeURIComponent(data[x]); }).join("&");
                data = null;
            }
            if(type === "jsonp"){
                (function(onSuccess, onFail, url, callbackName){
                    window[callbackName] = function(data) {
                        delete window[callbackName];
                        document.body.removeChild(script);
                        onSuccess(data);
                    };
                    var script = document.createElement('script');
                    script.src = url;
                    script.onerror = onFail;
                    document.body.appendChild(script);
                })(this.onSuccess, this.onFail, this.url, callback);
            }
            else{
                request.open(this.method, this.url, this.options.async);
                request.withCredentials = this.options.withCredentials;
                //Posting has a special content type. Also, allow user to set content type:
                if(this.method === "POST" || this.options.contentType){
                    request.setRequestHeader("Content-type", this.options.contentType || "application/x-www-form-urlencoded");
                }
                request.onload = function(){
                    if(request.status === 200){
                        self.status = "success";
                        var response = request.responseText;
                        if(type == "json") response = JSON.parse(response || "{}");
                        if(type == "xml")  response = this.request.responseXML;
                        if(self.onSuccess) self.onSuccess(response);
                    }
                    else{
                        self.status = "fail";
                        if(self.onFail) self.onFail(request);
                    }
                    self.onAfter.forEach(function(x){x(request);});
                };
                this.request = request;
            }
            request.send(data);
        };
        var jsonp_ix = 0;
        var defaultOptions = {
            async: true,
            withCredentials: false,
            contentType: null,
        };
        //returns a factory for easy access to the prototypes:
        return function(method, url, data, options){ return new xhr(method, url, data, options); };
    })();
    //HTML5 Router:
    //defining routes:  xapp.route("/", showMain); xapp.route("/my/:name/:id", function(name, id){...}); xapp.route("/this/*"); xapp.route() //no parameters to start
    //executing routes: xapp.route("/"); xapp.route("/my/project/123");
    xapp.currentRoute = null;
    xapp.route = (function(){
        var self = this,
            routes = [],
            isStarted = false,
            route = function(path, fn) {
                if(typeof path === 'string' && typeof fn === 'function'){ routes.push({path:path, fn:xapp.array(arguments).slice(1)}); }
                else if(typeof path === 'string') { 
                    history.pushState(null, null, path);
                    self.runRoute();
                }
                else if(arguments.length === 0 && !isStarted){ 
                    self.start();
                    self.runRoute();
                    isStarted = true;
                }
                return this;
            };
        self.start = function(){ window.addEventListener('popstate', self.runRoute); };
        self.runRoute = function(){
            var urlParts = window.location.pathname.split('/'), i = 0, found = false, fnArgs;
            while(i < routes.length){
                fnArgs = [];
                var ix = 0, matches = true, testParts = routes[i].path.split('/');
                while(ix < testParts.length){
                    if(urlParts[ix] === "" && testParts[ix] === ""){} //matches "/"
                    else if(urlParts[ix] && testParts[ix]){
                        if(testParts[ix] === urlParts[ix]){ } //matching
                        else if(testParts[ix] === "*"){ } //wildcard matching
                        else if(testParts[ix].indexOf(':') === 0 && urlParts[ix]){ fnArgs.push(urlParts[ix]); } //matched param
                        else{ 
                            matches = false;
                            break;
                        }
                    }
                    else{ 
                        matches = false;
                        break;
                    }
                    ix++;
                }
                if(testParts.length === urlParts.length || testParts[testParts.length-1] === '*'){}//final matches
                else{ matches = false; }
                if(matches){ 
                    xapp.currentRoute = routes[i].path;
                    found = true;
                    break;
                }
                i++;
            }
            if(found){ routes[i].fn.forEach(function(fn){fn.apply(this, fnArgs);}); }
        };
        return route;
    })();
    function registerTemplates(){
        var scriptnodes = xapp.array(document.querySelectorAll('script[type="text/x-component"]'));
        var count = 0;
        var checkCount = function(){ 
            count++;
            if(count == scriptnodes.length) for(var key in apps) xapp.apply(key);
        };
        function getScript(el){
            var script = el.getElementsByTagName('x-script')[0], fn;
            if(script){
                var fnstr = script.innerHTML.trim();
                if(fnstr.indexOf("function") === 0 || fnstr.indexOf("class") === 0){
                    fn = new Function("return " + fnstr)();
                }
                el.removeChild(script);
            }
            return fn;
        }
        function getAttrs(el){
            var attributes = el.getAttribute("attrs"), attrs = {};
            attributes.split(',').forEach(function(attr){
                attr = attr.trim();
                var matches = attr.match(/(.*?)\s+by\s+(ref|value)/);
                if(matches){ attrs[matches[1]] = matches[2]; }
            });
            return attrs;
        }
        function makeComponent(div){
            xapp.array(div.childNodes).forEach(function(el){
                if(el.nodeType === 1 && el.tagName === "X-COMPONENT"){
                    var name = el.getAttribute('name').toUpperCase();
                    if(name){
                        xapp.components[name] = {
                            script: getScript(el),
                            attrs: getAttrs(el),
                            scopename:el.getAttribute('scopename') || "vm",
                            html: el.innerHTML
                        };
                    }
                }
            });
        }
        scriptnodes.forEach(function(node, ix){
            if(!node.innerHTML.match(/^\s*$/)) {
                var div = document.createElement('div');
                div.innerHTML = node.innerHTML;
                makeComponent(div);
                checkCount();
            }
            else xapp.xhr("GET", node.getAttribute('src')).success("text", function(t){ 
                var div = document.createElement('div');
                div.innerHTML = t;
                makeComponent(div);
                checkCount();
            }).fail(checkCount);
        });
    }
   //Built-in Registry:
   //<... :if="<test>">//
    xapp.register({
        name:":if",
        condition: xapp.attrFn(':if'),
        compile:function(scope, template){ 
            return xapp.compileFn("return " + template.getAttribute(':if'), scope, ['$el']);
        },
        apply:function(scope, el, template, fn){
            var res = xapp.applyFn(fn, scope, {$el:el});
            if(res && el.nodeType == 8){ 
                xapp.undoComment(template, el);
                xapp.applyOne(template.initialEl, template, [':if']);
            }
            if(!res && el.nodeType == 1){ 
                xapp.toComment(template, el, 'if test: ' + el.getAttribute(':if'));
            }
        }
    });
    //<... :each="<item> in <array>"
    xapp.register({
        name:":each",
        condition: xapp.attrFn(':each'),
        compile:function(scope, el){
            var fnstr, matches = el.getAttribute(':each').match(xapp.rgx.each); 
            if(matches){
                fnstr = 'return {"arr": ' + matches[2] + ', "name": "' + matches[1] + '"}';
                return xapp.compileFn(fnstr, scope, ["$key", "$ix", matches[1]]);
            }
        },
        apply:function(scope, el, template, fn){
            if(!fn) xapp.logError("each function didn't compile: " + template.source.getAttribute(':each'));
            var each = xapp.applyFn(fn, scope);
            var lastEl = el;
            if(el.nodeType == 1){ 
                lastEl = xapp.toComment(template, el, 'each: ' + el.getAttribute(':each'), el);
            }
            var key, toRemove = {};
            if(!template.eaches) template.eaches = {};
            Object.keys(template.eaches).forEach(function(x){ toRemove[x] = true;});
            for(key in each.arr){
                //create the local scope
                var locals = {$key: key, $ix:parseInt(key)};
                locals[each.name] = each.arr[key];
                //insert if needed
                var tmp = template.eaches[key];
                if(!tmp){
                        tmp = template.eaches[key] = xapp.newTemplate(template);
                        lastEl.parentNode.insertBefore(tmp.initialEl, lastEl.nextSibling);
                }
                tmp.scope = scope.localCopy(locals);
                xapp.applyOne(tmp.initialEl, tmp, [':each']);
                if(toRemove[key]) delete toRemove[key];
                lastEl = tmp.initialEl;
            }
            for(key in toRemove){
                var rm = template.eaches[key];
                rm.initialEl.parentNode.removeChild(rm.initialEl);
                delete template.eaches[key];
            }
        }
    });
    //<...:scope="obj"
    //<...:scope="obj as alias"
    xapp.register({
        name:':scope',
        condition: xapp.attrFn(':scope'),
        compile:function(scope, el){ 
            var str = el.getAttribute(':scope'), 
          alias = str, 
          matches = str.match(xapp.rgx.alias);
            if(matches){
                alias = matches[2];
                str = matches[1];
            }
            return {fn: xapp.compileFn("return " + str, scope), alias:alias};
        },
        apply:function(scope, el, template, obj){
            var newscope = xapp.createScope(xapp.applyFn(obj.fn, scope), obj.alias, scope);
            if(!newscope.obj) return;
            template.scope = newscope;
            if(!template.original.isCompiled){
                el.innerHTML = template.original.source.innerHTML;
                var newTemplate = xapp.compile(template.appname, el, newscope);
                template.children = template.original.children = newTemplate.children;
                template.original.isCompiled = true;
            }
        }
    });
    //<...>{{text}}</...>//
    xapp.register({
        name:'literals',
        condition:function(el){ return el.nodeType == 3; },
        compile:function(scope, el){
            var literals = [];
            el.nodeValue.replace(xapp.rgx.braces, function(a, str) {
                literals.push(xapp.compileFn("return " + str, scope));
                return str;
            });
            return literals;
        },
        apply:function(scope, el, template, literals){
            var ix = 0;
            el.nodeValue = template.source.nodeValue.replace(xapp.rgx.braces, function(a,b){ return xapp.applyFn(literals[ix++], scope); });
        }
    });
    //<... :class="{<classname>:<exp>}">//
    xapp.register({
        name:':class',
        condition: xapp.attrFn(':class'),
        compile:function(scope, el){ return xapp.compileFn("return " + el.getAttribute(':class'), scope); },
        apply:function(scope, el, template, fn){
            if(el.nodeType !== 1) return;
            var lst = [], obj = {}, classes = el.getAttribute('class') || '', res = xapp.applyFn(fn, scope);
            classes.split(/\s+/g).forEach(function(val){ if(val) obj[val] = true; });
            xapp.assign(obj,res);
            for(var key in obj) if(obj[key]) lst.push(key);
            el.setAttribute('class', lst.join(' '));
        }
    });
    //<img :attr-src="imgsrc">
    //useful for properties also. null value will remove attribute: <button :attr-disabled="value ? null : true">
    xapp.register({
        name:':attr-*',
        condition: function(el){ return el.nodeType === 1 && xapp.array(el.attributes).some(function(x){ return x.name.indexOf(':attr-') === 0; });},
        compile:function(scope, el){ 
            var attrs = xapp.array(el.attributes).filter(function(x){ return x.name.indexOf(':attr-') === 0; }).map(function(x){ return '"' + x.name.slice(6) + '":' + x.value; });
            return xapp.compileFn('return {' + attrs + '}', scope);
        },
        apply:function(scope, el, template, fn){
            if(el.nodeType !== 1) return;
            var res = xapp.applyFn(fn, scope);
            for(var key in res){
                    if(res[key] === null) el.removeAttribute(key);
                    else el.setAttribute(key, res[key]);
            }
        }
    });
    //<select :options="<key1> displayed as <key2> in <array>">//
    xapp.register({
        name:":options",
        condition:function(el){ return xapp.attrFn(':options')(el) && el.tagName == "SELECT"; },
        compile:function(scope, el){
            var str = el.getAttribute(':options'),
                matches = str.match(xapp.rgx.options);
            if (str && matches){
                var arr = matches[3],
                    key1 = matches[1] == "this" ? arr+"[ix]" : arr+"[ix]['"+matches[1]+"']",
                    key2 = matches[2] == "this" ? arr+"[ix]" : arr+"[ix]['"+matches[2]+"']";
                    str = "var x = []; for(var ix in "+arr+"){ x.push({val: "+key1+", display: "+key2+" }) } return x";
                    return xapp.compileFn(str, scope);
            }
        },
        apply:function(scope, el, template, fn){
            if(!fn) xapp.logError("option function didn't compile: " + template.source.getAttribute(':options'));
            var res = xapp.applyFn(fn, scope);
            var value = el.value;
            el.innerHTML = res.map(function(x){ return '<option value="'+x.val+'">'+x.display+'</option>'; }).join('');
            el.value = value;
        }
    });
    //debounce is used in conjunction with :bind or @[event]
    //<... :bind="<obj> on (input, change)" :debounce="{input:400}"
    //<... @input="..." @click="..." :debounce="{input:400, click:100}"
    xapp.register({
        name:":debounce",
        condition: xapp.attrFn(':debounce'),
        compile:function(scope, el){
            return xapp.compileFn("return " + el.getAttribute(':debounce'), scope);
        },
        apply:function(scope, el, template, fn){
            if(el.xappDebounce) return;
            el.xappDebounce = xapp.applyFn(fn, scope);
        }
    });
    //<... :bind="<obj>"
    //<... :bind="<obj> on (input, change)"
    xapp.register({
        name:":bind",
        condition: xapp.attrFn(':bind'),
        compile:function(scope, el){
          var fnstr = el.getAttribute(':bind'), 
            on = {change:1}, 
            matches = fnstr.match(/^(.*?)\s+on\s*\((.*?)\)\s*$/);
            if(matches){
                fnstr = matches[1];
                matches[2].split(',').map(function(x){ on[x.trim()] = 1; });
            }
            return {
                toModel: xapp.compileFn(fnstr + " = $el.value", scope, ['$el']),
                toView: xapp.compileFn("$el.value = " + fnstr, scope, ['$el']),
                on: on
            };
        },
        makeEvent: function(el, template, evt){
            return function(e){ 
                    xapp.debounce.delay = el.xappDebounce && el.xappDebounce[evt] ? el.xappDebounce[evt] : 0;
                    xapp.applyFn(el.xappBind.toModel, el.xappBindScope, {$el: el});
                    xapp.apply(template.appname);
                };
        },
        apply:function(scope, el, template, bind){
            xapp.applyFn(bind.toView, scope, {$el: el});
            el.xappBindScope = scope;
            if(el.xappBind) return;
            el.xappBind = bind;
            for(var evt in bind.on){
                var run = this.makeEvent(el, template, evt);
                el.addEventListener(evt, run);
            }
        }
    });
    //<... @<eventname>="<function call>" @click="doSomething()" />
    xapp.register({
        name:"@[events]",
        condition:function(el){ 
            return el.nodeType == 1 && xapp.array(el.attributes).some(function(x){ return x.name[0] == '@' && x.name[1]; });
        },
        compile:function(scope, el){ 
            var fns = {};
            xapp.array(el.attributes).forEach(function(attr){ 
                if(attr.name[0] == '@' && attr.name[1])
                    fns[ attr.name.slice(1) ] = xapp.compileFn(attr.value, scope, ['$el']); });
            return fns;
        },
        makeEvent: function(el, template, evt){
            return function(e){
                xapp.debounce.delay = el.xappDebounce && el.xappDebounce[evt] ? el.xappDebounce[evt] : 0;
                if(el.xappBind){ xapp.applyFn(el.xappBind.toModel, el.xappOnScope, {$el: el}); }
                xapp.applyFn(el.xappOn[evt], el.xappOnScope, {$el: el});
                if(el.xappBind){ xapp.applyFn(el.xappBind.toView, el.xappOnScope, {$el: el}); }
                if(!e.defaultPrevented) xapp.apply(template.appname);
            };
        },
        apply:function(scope, el, template, fns){
            el.xappOnScope = scope;
            if(el.xappOn) return;
            el.xappOn = fns;
            for(var evt in el.xappOn){
                var run = this.makeEvent(el, template, evt);
                if(evt === "enter") el.addEventListener("keydown", function(e){ if(e.keyCode === 13) run(e); });
                else if(evt === "tab") el.addEventListener("keydown", function(e){ if(e.keyCode === 9) run(e); });
                else if(evt === "escape") el.addEventListener("keydown", function(e){ if(e.keyCode === 27) run(e); });
                else el.addEventListener(evt, run);
            }
        }
    });
    //<my-template /> or <div :template="my-component" />
    xapp.register({
        name:":component",
        condition:function(el){ return el.nodeType == 1 && (el.tagName.indexOf('-') > 0 || el.hasAttribute(':component')); },
        compile:function(scope, el){
            var name = (el.getAttribute(':component') || el.tagName).toUpperCase();
            var cmp = xapp.components[name];
            if(cmp){
                var attrs = {};
                for(var attr in cmp.attrs){
                    var q = cmp.attrs[attr] === 'ref' ? '' : '"';
                    attrs[attr] = xapp.compileFn('return ' + q + el.getAttribute(attr) + q, scope);
                }
                return {x: cmp, attrs: attrs};
            }
        },
        apply:function(scope, el, template, cmp){
            if(el.nodeType === 8) return;
            if(el.hasAttribute('rendered')) {
                xapp.applyOne(el, el.xappTemplate, [':component',':each']);
                return;
            }
            if(!cmp) return;
            el.innerHTML = cmp.x.html;
            var cmpAttr = {};
            for(var attr in cmp.attrs){
                cmpAttr[attr] = xapp.applyFn(cmp.attrs[attr], scope);
            }
            var obj = (cmp.x.script && new cmp.x.script(el, cmpAttr, xapp.hook(template.appname)) || cmpAttr);
            var newscope = xapp.createScope(obj, cmp.x.scopename, scope);
            newscope.locals = scope.locals;
            var newTemplate = xapp.compile(template.appname, el, newscope);
            el.xappTemplate = newTemplate;
            el.setAttribute('rendered',true);
            xapp.applyOne(el, el.xappTemplate, [':component',':each']);
        }
    });
    return xapp;
})();
