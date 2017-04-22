# XAPP: A Simple, Intuitive SPA Library
Model-View-Whatever &bull; Components &bull; Ajax &bull; HTML5 Routing...
---------
oh yes, and it's only 5.5kb compressed!

Visit [xapp-js.com](http://xapp-js.com) for Examples and Developer Guide

<div class="container">

## Setup

1) Include `<script src="/path/to/xapp.js"></script>` in your webpage

2) In your HTML, add the attribute _x-app_ to the top-level element of your app: `<div x-app="name-of-your-app">...</div>`

3) In your script logic, call: `xapp.setup("name-of-your-app", obj)` where obj is your main class

## M-V-W Functionality

### :scope

_:scope_ defines your access to variables. it contains an object, and an alias.

Add a scope to your project. write:

    <div x-app="app">
      <div :scope="inner as i">
        {{text}} is the same as {{i.text}} and the same as {{app.inner.text}}
      </div>
    </div>

the root object is accessible under the "app" keyword. you can rename easily: `<div x-app="app" :scope="this as vm">`

in the example above, you see 3 different ways to access the same property:  
    1) _{ { text } }_ - because of the current scope you are in, you can access the property directly  
    2) _{ { i.text } }_ - by the alias  
    3) _{ { app.inner.text } }_ - by the full path from the root object  

additionally, you may choose to skip aliasing, in which the alias will be the name of the object: `<div :scope="person">`

### { { literals } }

_literals_ are javascript, which always return the value within them.

They are denoted by a pair of curly braces on each side of the expression:`{{ app.item.name }}`

### :bind

_:bind_ allows your object model to be updated, and also reflect the changes to the view

you can bind a field to a property like this: `<input :bind="name">` which will bind on the "change" event

you can also bind on any event you like:`<input :bind="name on (input, mouseover)">`

### :class

dynamically add classes using: `<div :class="{classname: test, anotherclass: anothertest}">...<div>`

any test that passes will add the key as a class to the current element

### :debounce

_:debounce_ adds a delay (in milliseconds) in processing an event or bind

example: `<... :bind="obj on (input, change)" :debounce="{input:400}" />`

another example: `<... @input="..." @click="..." :debounce="{input:400, click:100}" />`

### :each

_:each_ allows you to iterate over an object or array.

you can loop through an object's properties or an array like this: `<div :each="yourname in items">`

The example above will create the following local variables, available for the div and child scopes: `yourname`, `$ix`, and `$key`

`yourname` is defined as the variable name in the example above. you can access the current item using this variable

`$key` is available for objects, and will also be the string value of the current item in an array

`$ix` is available for arrays, giving you the current index in the loop

### @events

_@events_ allow you to run code on any event, including custom events.

You can add events to any element: `<input @click="doSomething()" @mouseover="doAnotherThing()" />`

These events are javascript, meaning you may choose to run javascript directly inline: `<input @click="list.push('test')" />`

There are two variables that are always available in a function: `$el` and `$hook`

`$el` references the current element.

`$hook` is a function used to update the current view. Useful in asynchronous updates.

_Xapp adds a special event:_ `@init` that runs the first time your code is rendered.

Additionally, xapp adds a few other useful events: `@enter`,`@tab` and `@escape`

### :if

_:if_ allows you to exclude an element if it fails a test

all child elements will also be excluded: `<div :if="name == 'blah'">...</div>`

### :options

_:options_ allows you to populate the options of a select element.

verbiage: `:options="<value> displayed as <display> in <array>"`

example: `<select :options="value displayed as name in items">...</select>`

example: `<select :options="this displayed as this in items">...</select>`

### :attr-*

_:attr-*_ allows you to add attributes and properties based on code.

useful in a number of situations, like `<img :attr-src='imgurl' alt=''/>`

null values will remove the attribute, so it becomes useful for properties also: `<button :attr-disabled="value ? null : true">`  

## Components

Components are html bound to javascript, used within an M-V-W xapplication :)

They can be inline on the page within script tags, or included as a script:

example:`<script type="text/x-component" src="path/to/template"></script>`

inline example:`<script type="text/x-component">...</script>`

_scripts may contain multiple components... more on that later._

### Create a Component

Let's begin by looking at an example:

    <x-component 
        name="my-component"
        attrs="model by ref, color by value, ix by ref"
        scopename="vm">

        <p>{{ix + 1}}) {{model[ix]}}
           <span :attr-style="'color:' + color" @click="remove(ix)">Remove!</span>
        </p>

       <x-script>
          function(el, attrs, hook){
             this.model = attrs.model
             this.ix = attrs.ix
             this.color = attrs.color || 'white';
             this.remove = function(ix){ this.model.splice(ix, 1) }
          }
       </x-script>
    </x-component>


Every component starts with`<x-component>...</x-component>`. The component wrapper contains both html and javascript.

### [name]

The _name_ attribute defines the name of the component: `<x-component name="my-component">...</x-component>`

_Names must contain a hypen._ We can now access the component by:`<my-component>` and `<div :component="my-component">`

### [attrs]

_attrs_ denotes the attributes that our script will consume. They may be either by reference, or by value.

`<x-component attrs="model by ref, color by value, ix by ref" ...>`

_- by ref_ is used to pass scope variables

_- by value_ is used to pass string literals

### [scopename]

_scopename_ gives us the name of our scope. If not supplied, the scopename will be _vm_.

You can use scopename to access variables similar to the alias of a scope.

### x-script

the _x-script_ tag denotes the component javascript. Always must begin with a function. The function parameters are:

_element_: the current component element within the xapplication

_attrs_: an object of attributes, containing items in the defined in the component wrapper

_hook_: a function that updates the view. this normally is automatic, but is useful for asyncronous requests

### without x-script

without an x-script, your component will be scoped as an object of your `attrs`

    <x-component 
        name="my-component"
        attrs="model by ref, color by value, ix by ref, parent by ref"
        scopename="vm">
    
        <p>{{ix + 1}}) {{model[ix]}}
           <span :attr-style="'color:' + color" @click="parent.remove(ix)">Remove!</span>
        </p>
    </x-component>

### Add to your xapplication

Use in your code by:`<my-component>` or `<div :component="my-component">`

Add the additional attributes defined by the component wrapper: `<my-component model="todolist" ix="$ix" color="yellow">`

### Additional Components

You may wish to put components together inside of one file. This is no problem, as the wrapper defines it's own space. Just create another component below the end tag of the wrapper, and continue.  

## HTML5 Routing

Xapp routing is easy and flexible.

    xapp.route("/", onRouteMain, onRoute)
        .route("/api", onRouteApi, onRoute)
        .route("/my/:id", onRouteMy)
        .route();

### Create a Route

Define your routes using `xapp.route( "/path/to/route", routingfn, /* ... anotherRoutingFn */ )`  
or inline:`xapp.route( "/path/to/route", function(){...} )`

### URL Parameters

URL parameters become arguments passed into your function, in order:`xapp.route( "/my/:area/:item", function(area, item){...} )`

### Start the Router

Start the router by a final call: `xapp.route()`

### Calling the Router

To call the router, use `xapp.route("my/chosen/route")`. This is easy enough to extend by hooking to an href, or creating your own extension:

    xapp.register({
		    name:":href",
    		condition: xapp.attrFn(":href"),
    		compile:function(scope, template){},
    		apply:function(scope, el, template){
    			if(el.xappOnHref) return;
    			el.xappOnHref = function(e){ xapp.route(el.getAttribute(":href")) };
    			el.addEventListener("click", el.xappOnHref);
    		}
	   });

## Ajax

Ajax calls are streamlined and reusable. Let's look below at this example:

    var request = xapp.xhr("GET", url, data)
                      .success("text",function(){...})
                      .fail(function(){...});
    request.send()

### Reusability

In the example above, we created a request object. We can modify the data or url, and send again and again:

    request.data = newdata;
    request.url = newurl;
    request.send()</pre>


### Method Types

Ihe first parameter defines the method call. Common values include: `GET`,`POST`,`PUT`, and `DELETE`

### Success

The success function takes the responseType you expect, followed by your response function, whose parameter is the data requested.

Expected responseTypes are: `text`,`json`,`jsonp`, and `xml`

As an example:`request.success("json", function(json){ self.data = json });`

A second parameter will return the entire request object:`request.success("json", function(json, req){ ... });`

### Fail

You may choose to gracefully handle a failed request:`request.fail(function(req){ alert(req.status); });`

On a fail, you receive the entire request as the first parameter.

### Then

The "then" method fires after a request is fulfilled or errored.

"Then" methods have the `request` object present as the first parameter.

You may add multiple "then" methods, which are chainable.

    var request = xapp.xhr("GET", url, data)
                      .success("json",function(json, req){...})
                      .fail(function(req){...})
                      .then(function(req){...})
                      .then(function(req){...})
                      .then(function(req){...});
    req.send()
