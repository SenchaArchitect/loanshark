/*

Sencha.io
Copyright (c) 2011, 2012, Sencha Inc.
All rights reserved.
licensing@sencha.com

License details available at

http://www.sencha.com/legal/sencha-io-terms-of-service

This software is distributed WITHOUT ANY WARRANTY, without the implied 
warranty of MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND 
NON-INFRINGEMENT OF THIRD-PARTY INTELLECTUAL PROPERTY RIGHTS.  

*/
/*! Socket.IO.js build:0.8.7, development. Copyright(c) 2011 LearnBoost <dev@learnboost.com> MIT Licensed */

/**
* socket.io
* Copyright(c) 2011 LearnBoost <dev@learnboost.com>
* MIT Licensed
*/

(function (exports, global) {

    /**
    * IO namespace.
    *
    * @namespace
    */

    var io = exports;

    /**
    * Socket.IO version
    *
    * @api public
    */

    io.version = '0.8.7';

    /**
    * Protocol implemented.
    *
    * @api public
    */

    io.protocol = 1;

    /**
    * Available transports, these will be populated with the available transports
    *
    * @api public
    */

    io.transports = [];

    /**
    * Keep track of jsonp callbacks.
    *
    * @api private
    */

    io.j = [];

    /**
    * Keep track of our io.Sockets
    *
    * @api private
    */
    io.sockets = {};


    /**
    * Manages connections to hosts.
    *
    * @param {String} uri
    * @Param {Boolean} force creation of new socket (defaults to false)
    * @api public
    */

    io.connect = function (host, details) {
        var uri = io.util.parseUri(host)
        , uuri
        , socket;

        if (global && global.location) {
            uri.protocol = uri.protocol || global.location.protocol.slice(0, -1);
            uri.host = uri.host || (global.document
            ? global.document.domain : global.location.hostname);
            uri.port = uri.port || global.location.port;
        }

        uuri = io.util.uniqueUri(uri);

        var options = {
            host: uri.host
            , secure: 'https' == uri.protocol
            , port: uri.port || ('https' == uri.protocol ? 443 : 80)
            , query: uri.query || ''
        };

        io.util.merge(options, details);

        if (options['force new connection'] || !io.sockets[uuri]) {
            socket = new io.Socket(options);
        }

        if (!options['force new connection'] && socket) {
            io.sockets[uuri] = socket;
        }

        socket = socket || io.sockets[uuri];

        // if path is different from '' or /
        return socket.of(uri.path.length > 1 ? uri.path : '');
    };

})('object' === typeof module ? module.exports : (this.io = {}), this);

    /**
    * socket.io
    * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
    * MIT Licensed
    */

    (function (exports, global) {

        /**
        * Utilities namespace.
        *
        * @namespace
        */

        var util = exports.util = {};

        /**
        * Parses an URI
        *
        * @author Steven Levithan <stevenlevithan.com> (MIT license)
        * @api public
        */

        var re = /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/;

        var parts = ['source', 'protocol', 'authority', 'userInfo', 'user', 'password',
            'host', 'port', 'relative', 'path', 'directory', 'file', 'query',
            'anchor'];

        util.parseUri = function (str) {
            var m = re.exec(str || '')
            , uri = {}
            , i = 14;

            while (i--) {
                uri[parts[i]] = m[i] || '';
            }

            return uri;
        };

        /**
        * Produces a unique url that identifies a Socket.IO connection.
        *
        * @param {Object} uri
        * @api public
        */

        util.uniqueUri = function (uri) {
            var protocol = uri.protocol
            , host = uri.host
            , port = uri.port;

            if ('document' in global) {
                host = host || document.domain;
                port = port || (protocol == 'https'
                && document.location.protocol !== 'https:' ? 443 : document.location.port);
            } else {
                host = host || 'localhost';

                if (!port && protocol == 'https') {
                    port = 443;
                }
            }

            return (protocol || 'http') + '://' + host + ':' + (port || 80);
        };

        /**
        * Mergest 2 query strings in to once unique query string
        *
        * @param {String} base
        * @param {String} addition
        * @api public
        */

        util.query = function (base, addition) {
            var query = util.chunkQuery(base || '')
            , components = [];

            util.merge(query, util.chunkQuery(addition || ''));
            for (var part in query) {
                if (query.hasOwnProperty(part)) {
                    components.push(part + '=' + query[part]);
                }
            }

            return components.length ? '?' + components.join('&') : '';
        };

        /**
        * Transforms a querystring in to an object
        *
        * @param {String} qs
        * @api public
        */

        util.chunkQuery = function (qs) {
            var query = {}
            , params = qs.split('&')
            , i = 0
            , l = params.length
            , kv;

            for (; i < l; ++i) {
                kv = params[i].split('=');
                if (kv[0]) {
                    query[kv[0]] = decodeURIComponent(kv[1]);
                }
            }

            return query;
        };

        /**
        * Executes the given function when the page is loaded.
        *
        *     io.util.load(function () { console.log('page loaded'); });
        *
        * @param {Function} fn
        * @api public
        */

        var pageLoaded = false;

        util.load = function (fn) {
            if ('document' in global && document.readyState === 'complete' || pageLoaded) {
                return fn();
            }

            util.on(global, 'load', fn, false);
        };

        /**
        * Adds an event.
        *
        * @api private
        */

        util.on = function (element, event, fn, capture) {
            if (element.attachEvent) {
                element.attachEvent('on' + event, fn);
            } else if (element.addEventListener) {
                element.addEventListener(event, fn, capture);
            }
        };

        /**
        * Generates the correct `XMLHttpRequest` for regular and cross domain requests.
        *
        * @param {Boolean} [xdomain] Create a request that can be used cross domain.
        * @returns {XMLHttpRequest|false} If we can create a XMLHttpRequest.
        * @api private
        */

        util.request = function (xdomain) {

            if (xdomain && 'undefined' != typeof XDomainRequest) {
                return new XDomainRequest();
            }

            if ('undefined' != typeof XMLHttpRequest && (!xdomain || util.ua.hasCORS)) {
                return new XMLHttpRequest();
            }

            if (!xdomain) {
                try {
                    return new ActiveXObject('Microsoft.XMLHTTP');
                } catch(e) { }
                }

                return null;
            };

            /**
            * XHR based transport constructor.
            *
            * @constructor
            * @api public
            */

            /**
            * Change the internal pageLoaded value.
            */

            if ('undefined' != typeof window) {
                util.load(function () {
                    pageLoaded = true;
                });
            }

            /**
            * Defers a function to ensure a spinner is not displayed by the browser
            *
            * @param {Function} fn
            * @api public
            */

            util.defer = function (fn) {
                if (!util.ua.webkit || 'undefined' != typeof importScripts) {
                    return fn();
                }

                util.load(function () {
                    setTimeout(fn, 100);
                });
            };

            /**
            * Merges two objects.
            *
            * @api public
            */

            util.merge = function merge (target, additional, deep, lastseen) {
                var seen = lastseen || []
                , depth = typeof deep == 'undefined' ? 2 : deep
                , prop;

                for (prop in additional) {
                    if (additional.hasOwnProperty(prop) && util.indexOf(seen, prop) < 0) {
                        if (typeof target[prop] !== 'object' || !depth) {
                            target[prop] = additional[prop];
                            seen.push(additional[prop]);
                        } else {
                            util.merge(target[prop], additional[prop], depth - 1, seen);
                        }
                    }
                }

                return target;
            };

            /**
            * Merges prototypes from objects
            *
            * @api public
            */

            util.mixin = function (ctor, ctor2) {
                util.merge(ctor.prototype, ctor2.prototype);
            };

            /**
            * Shortcut for prototypical and static inheritance.
            *
            * @api private
            */

            util.inherit = function (ctor, ctor2) {
                function f() {};
                f.prototype = ctor2.prototype;
                ctor.prototype = new f;
            };

            /**
            * Checks if the given object is an Array.
            *
            *     io.util.isArray([]); // true
            *     io.util.isArray({}); // false
            *
            * @param Object obj
            * @api public
            */

            util.isArray = Array.isArray || function (obj) {
                return Object.prototype.toString.call(obj) === '[object Array]';
            };

            /**
            * Intersects values of two arrays into a third
            *
            * @api public
            */

            util.intersect = function (arr, arr2) {
                var ret = []
                , longest = arr.length > arr2.length ? arr : arr2
                , shortest = arr.length > arr2.length ? arr2 : arr;

                for (var i = 0, l = shortest.length; i < l; i++) {
                    if (~util.indexOf(longest, shortest[i]))
                    ret.push(shortest[i]);
                }

                return ret;
            }

            /**
            * Array indexOf compatibility.
            *
            * @see bit.ly/a5Dxa2
            * @api public
            */

            util.indexOf = function (arr, o, i) {
                if (Array.prototype.indexOf) {
                    return Array.prototype.indexOf.call(arr, o, i);
                }

                for (var j = arr.length, i = i < 0 ? i + j < 0 ? 0 : i + j : i || 0; 
                i < j && arr[i] !== o; i++) {}

                return j <= i ? -1 : i;
            };

            /**
            * Converts enumerables to array.
            *
            * @api public
            */

            util.toArray = function (enu) {
                var arr = [];

                for (var i = 0, l = enu.length; i < l; i++)
                arr.push(enu[i]);

                return arr;
            };

            /**
            * UA / engines detection namespace.
            *
            * @namespace
            */

            util.ua = {};

            /**
            * Whether the UA supports CORS for XHR.
            *
            * @api public
            */

            util.ua.hasCORS = 'undefined' != typeof XMLHttpRequest && (function () {
                try {
                    var a = new XMLHttpRequest();
                } catch (e) {
                    return false;
                }

                return a.withCredentials != undefined;
            })();

            /**
            * Detect webkit.
            *
            * @api public
            */

            util.ua.webkit = 'undefined' != typeof navigator
            && /webkit/i.test(navigator.userAgent);

        })('undefined' != typeof io ? io : module.exports, this);

        /**
        * socket.io
        * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
        * MIT Licensed
        */

        (function (exports, io) {

            /**
            * Expose constructor.
            */

            exports.EventEmitter = EventEmitter;

            /**
            * Event emitter constructor.
            *
            * @api public.
            */

            function EventEmitter () {};

            /**
            * Adds a listener
            *
            * @api public
            */

            EventEmitter.prototype.on = function (name, fn) {
                if (!this.$events) {
                    this.$events = {};
                }

                if (!this.$events[name]) {
                    this.$events[name] = fn;
                } else if (io.util.isArray(this.$events[name])) {
                    this.$events[name].push(fn);
                } else {
                    this.$events[name] = [this.$events[name], fn];
                }

                return this;
            };

            EventEmitter.prototype.addListener = EventEmitter.prototype.on;

            /**
            * Adds a volatile listener.
            *
            * @api public
            */

            EventEmitter.prototype.once = function (name, fn) {
                var self = this;

                function on () {
                    self.removeListener(name, on);
                    fn.apply(this, arguments);
                };

                on.listener = fn;
                this.on(name, on);

                return this;
            };

            /**
            * Removes a listener.
            *
            * @api public
            */

            EventEmitter.prototype.removeListener = function (name, fn) {
                if (this.$events && this.$events[name]) {
                    var list = this.$events[name];

                    if (io.util.isArray(list)) {
                        var pos = -1;

                        for (var i = 0, l = list.length; i < l; i++) {
                            if (list[i] === fn || (list[i].listener && list[i].listener === fn)) {
                                pos = i;
                                break;
                            }
                        }

                        if (pos < 0) {
                            return this;
                        }

                        list.splice(pos, 1);

                        if (!list.length) {
                            delete this.$events[name];
                        }
                    } else if (list === fn || (list.listener && list.listener === fn)) {
                        delete this.$events[name];
                    }
                }

                return this;
            };

            /**
            * Removes all listeners for an event.
            *
            * @api public
            */

            EventEmitter.prototype.removeAllListeners = function (name) {
                // TODO: enable this when node 0.5 is stable
                //if (name === undefined) {
                //this.$events = {};
                //return this;
                //}

                if (this.$events && this.$events[name]) {
                    this.$events[name] = null;
                }

                return this;
            };

            /**
            * Gets all listeners for a certain event.
            *
            * @api publci
            */

            EventEmitter.prototype.listeners = function (name) {
                if (!this.$events) {
                    this.$events = {};
                }

                if (!this.$events[name]) {
                    this.$events[name] = [];
                }

                if (!io.util.isArray(this.$events[name])) {
                    this.$events[name] = [this.$events[name]];
                }

                return this.$events[name];
            };

            /**
            * Emits an event.
            *
            * @api public
            */

            EventEmitter.prototype.emit = function (name) {
                if (!this.$events) {
                    return false;
                }

                var handler = this.$events[name];

                if (!handler) {
                    return false;
                }

                var args = Array.prototype.slice.call(arguments, 1);

                if ('function' == typeof handler) {
                    handler.apply(this, args);
                } else if (io.util.isArray(handler)) {
                    var listeners = handler.slice();

                    for (var i = 0, l = listeners.length; i < l; i++) {
                        listeners[i].apply(this, args);
                    }
                } else {
                    return false;
                }

                return true;
            };

        })(
        'undefined' != typeof io ? io : module.exports
        , 'undefined' != typeof io ? io : module.parent.exports
        );

        /**
        * socket.io
        * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
        * MIT Licensed
        */

        /**
        * Based on JSON2 (http://www.JSON.org/js.html).
        */

        (function (exports, nativeJSON) {
            "use strict";

            // use native JSON if it's available
            if (nativeJSON && nativeJSON.parse){
                return exports.JSON = {
                    parse: nativeJSON.parse
                    , stringify: nativeJSON.stringify
                }
            }

            var JSON = exports.JSON = {};

            function f(n) {
                // Format integers to have at least two digits.
                return n < 10 ? '0' + n : n;
            }

            function date(d, key) {
                return isFinite(d.valueOf()) ?
                d.getUTCFullYear()     + '-' +
                f(d.getUTCMonth() + 1) + '-' +
                f(d.getUTCDate())      + 'T' +
                f(d.getUTCHours())     + ':' +
                f(d.getUTCMinutes())   + ':' +
                f(d.getUTCSeconds())   + 'Z' : null;
            };

            var cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
                escapable = /[\\\"\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,
                gap,
                indent,
                meta = {    // table of character substitutions
                    '\b': '\\b',
                    '\t': '\\t',
                    '\n': '\\n',
                    '\f': '\\f',
                    '\r': '\\r',
                    '"' : '\\"',
                    '\\': '\\\\'
                },
                rep;


            function quote(string) {

                // If the string contains no control characters, no quote characters, and no
                // backslash characters, then we can safely slap some quotes around it.
                // Otherwise we must also replace the offending characters with safe escape
                // sequences.

                escapable.lastIndex = 0;
                return escapable.test(string) ? '"' + string.replace(escapable, function (a) {
                    var c = meta[a];
                    return typeof c === 'string' ? c :
                    '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                }) + '"' : '"' + string + '"';
            }


            function str(key, holder) {

                // Produce a string from holder[key].

                var i,          // The loop counter.
                k,          // The member key.
                v,          // The member value.
                length,
                mind = gap,
                partial,
                value = holder[key];

                // If the value has a toJSON method, call it to obtain a replacement value.

                if (value instanceof Date) {
                    value = date(key);
                }

                // If we were called with a replacer function, then call the replacer to
                // obtain a replacement value.

                if (typeof rep === 'function') {
                    value = rep.call(holder, key, value);
                }

                // What happens next depends on the value's type.

                switch (typeof value) {
                    case 'string':
                    return quote(value);

                    case 'number':

                    // JSON numbers must be finite. Encode non-finite numbers as null.

                    return isFinite(value) ? String(value) : 'null';

                    case 'boolean':
                    case 'null':

                    // If the value is a boolean or null, convert it to a string. Note:
                    // typeof null does not produce 'null'. The case is included here in
                    // the remote chance that this gets fixed someday.

                    return String(value);

                    // If the type is 'object', we might be dealing with an object or an array or
                    // null.

                    case 'object':

                    // Due to a specification blunder in ECMAScript, typeof null is 'object',
                    // so watch out for that case.

                    if (!value) {
                        return 'null';
                    }

                    // Make an array to hold the partial results of stringifying this object value.

                    gap += indent;
                    partial = [];

                    // Is the value an array?

                    if (Object.prototype.toString.apply(value) === '[object Array]') {

                        // The value is an array. Stringify every element. Use null as a placeholder
                        // for non-JSON values.

                        length = value.length;
                        for (i = 0; i < length; i += 1) {
                            partial[i] = str(i, value) || 'null';
                        }

                        // Join all of the elements together, separated with commas, and wrap them in
                        // brackets.

                        v = partial.length === 0 ? '[]' : gap ?
                        '[\n' + gap + partial.join(',\n' + gap) + '\n' + mind + ']' :
                        '[' + partial.join(',') + ']';
                        gap = mind;
                        return v;
                    }

                    // If the replacer is an array, use it to select the members to be stringified.

                    if (rep && typeof rep === 'object') {
                        length = rep.length;
                        for (i = 0; i < length; i += 1) {
                            if (typeof rep[i] === 'string') {
                                k = rep[i];
                                v = str(k, value);
                                if (v) {
                                    partial.push(quote(k) + (gap ? ': ' : ':') + v);
                                }
                            }
                        }
                    } else {

                        // Otherwise, iterate through all of the keys in the object.

                        for (k in value) {
                            if (Object.prototype.hasOwnProperty.call(value, k)) {
                                v = str(k, value);
                                if (v) {
                                    partial.push(quote(k) + (gap ? ': ' : ':') + v);
                                }
                            }
                        }
                    }

                    // Join all of the member texts together, separated with commas,
                    // and wrap them in braces.

                    v = partial.length === 0 ? '{}' : gap ?
                    '{\n' + gap + partial.join(',\n' + gap) + '\n' + mind + '}' :
                    '{' + partial.join(',') + '}';
                    gap = mind;
                    return v;
                }
            }

            // If the JSON object does not yet have a stringify method, give it one.

            JSON.stringify = function (value, replacer, space) {

                // The stringify method takes a value and an optional replacer, and an optional
                // space parameter, and returns a JSON text. The replacer can be a function
                // that can replace values, or an array of strings that will select the keys.
                // A default replacer method can be provided. Use of the space parameter can
                // produce text that is more easily readable.

                var i;
                gap = '';
                indent = '';

                // If the space parameter is a number, make an indent string containing that
                // many spaces.

                if (typeof space === 'number') {
                    for (i = 0; i < space; i += 1) {
                        indent += ' ';
                    }

                    // If the space parameter is a string, it will be used as the indent string.

                } else if (typeof space === 'string') {
                    indent = space;
                }

                // If there is a replacer, it must be a function or an array.
                // Otherwise, throw an error.

                rep = replacer;
                if (replacer && typeof replacer !== 'function' &&
                (typeof replacer !== 'object' ||
                typeof replacer.length !== 'number')) {
                    throw new Error('JSON.stringify');
                }

                // Make a fake root object containing our value under the key of ''.
                // Return the result of stringifying the value.

                return str('', {'': value});
            };

            // If the JSON object does not yet have a parse method, give it one.

            JSON.parse = function (text, reviver) {
                // The parse method takes a text and an optional reviver function, and returns
                // a JavaScript value if the text is a valid JSON text.

                var j;

                function walk(holder, key) {

                    // The walk method is used to recursively walk the resulting structure so
                    // that modifications can be made.

                    var k, v, value = holder[key];
                    if (value && typeof value === 'object') {
                        for (k in value) {
                            if (Object.prototype.hasOwnProperty.call(value, k)) {
                                v = walk(value, k);
                                if (v !== undefined) {
                                    value[k] = v;
                                } else {
                                    delete value[k];
                                }
                            }
                        }
                    }
                    return reviver.call(holder, key, value);
                }


                // Parsing happens in four stages. In the first stage, we replace certain
                // Unicode characters with escape sequences. JavaScript handles many characters
                // incorrectly, either silently deleting them, or treating them as line endings.

                text = String(text);
                cx.lastIndex = 0;
                if (cx.test(text)) {
                    text = text.replace(cx, function (a) {
                        return '\\u' +
                        ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
                    });
                }

                // In the second stage, we run the text against regular expressions that look
                // for non-JSON patterns. We are especially concerned with '()' and 'new'
                // because they can cause invocation, and '=' because it can cause mutation.
                // But just to be safe, we want to reject all unexpected forms.

                // We split the second stage into 4 regexp operations in order to work around
                // crippling inefficiencies in IE's and Safari's regexp engines. First we
                // replace the JSON backslash pairs with '@' (a non-JSON character). Second, we
                // replace all simple value tokens with ']' characters. Third, we delete all
                // open brackets that follow a colon or comma or that begin the text. Finally,
                // we look to see that the remaining characters are only whitespace or ']' or
                // ',' or ':' or '{' or '}'. If that is so, then the text is safe for eval.

                if (/^[\],:{}\s]*$/
                .test(text.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
                .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                .replace(/(?:^|:|,)(?:\s*\[)+/g, ''))) {

                    // In the third stage we use the eval function to compile the text into a
                    // JavaScript structure. The '{' operator is subject to a syntactic ambiguity
                    // in JavaScript: it can begin a block or an object literal. We wrap the text
                    // in parens to eliminate the ambiguity.

                    j = eval('(' + text + ')');

                    // In the optional fourth stage, we recursively walk the new structure, passing
                    // each name/value pair to a reviver function for possible transformation.

                    return typeof reviver === 'function' ?
                    walk({'': j}, '') : j;
                }

                // If the text is not JSON parseable, then a SyntaxError is thrown.

                throw new SyntaxError('JSON.parse');
            };

        })(
        'undefined' != typeof io ? io : module.exports
        , typeof JSON !== 'undefined' ? JSON : undefined
        );

        /**
        * socket.io
        * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
        * MIT Licensed
        */

        (function (exports, io) {

            /**
            * Parser namespace.
            *
            * @namespace
            */

            var parser = exports.parser = {};

            /**
            * Packet types.
            */

            var packets = parser.packets = [
            'disconnect'
            , 'connect'
            , 'heartbeat'
            , 'message'
            , 'json'
            , 'event'
            , 'ack'
            , 'error'
            , 'noop'
            ];

            /**
            * Errors reasons.
            */

            var reasons = parser.reasons = [
            'transport not supported'
            , 'client not handshaken'
            , 'unauthorized'
            ];

            /**
            * Errors advice.
            */

            var advice = parser.advice = [
            'reconnect'
            ];

            /**
            * Shortcuts.
            */

            var JSON = io.JSON
            , indexOf = io.util.indexOf;

            /**
            * Encodes a packet.
            *
            * @api private
            */

            parser.encodePacket = function (packet) {
                var type = indexOf(packets, packet.type)
                , id = packet.id || ''
                , endpoint = packet.endpoint || ''
                , ack = packet.ack
                , data = null;

                switch (packet.type) {
                    case 'error':
                    var reason = packet.reason ? indexOf(reasons, packet.reason) : ''
                    , adv = packet.advice ? indexOf(advice, packet.advice) : '';

                    if (reason !== '' || adv !== '')
                    data = reason + (adv !== '' ? ('+' + adv) : '');

                    break;

                    case 'message':
                    if (packet.data !== '')
                    data = packet.data;
                    break;

                    case 'event':
                    var ev = { name: packet.name };

                    if (packet.args && packet.args.length) {
                        ev.args = packet.args;
                    }

                    data = JSON.stringify(ev);
                    break;

                    case 'json':
                    data = JSON.stringify(packet.data);
                    break;

                    case 'connect':
                    if (packet.qs)
                    data = packet.qs;
                    break;

                    case 'ack':
                    data = packet.ackId
                    + (packet.args && packet.args.length
                    ? '+' + JSON.stringify(packet.args) : '');
                    break;
                }

                // construct packet with required fragments
                var encoded = [
                type
                , id + (ack == 'data' ? '+' : '')
                , endpoint
                ];

                // data fragment is optional
                if (data !== null && data !== undefined)
                encoded.push(data);

                return encoded.join(':');
            };

            /**
            * Encodes multiple messages (payload).
            *
            * @param {Array} messages
            * @api private
            */

            parser.encodePayload = function (packets) {
                var decoded = '';

                if (packets.length == 1)
                return packets[0];

                for (var i = 0, l = packets.length; i < l; i++) {
                    var packet = packets[i];
                    decoded += '\ufffd' + packet.length + '\ufffd' + packets[i];
                }

                return decoded;
            };

            /**
            * Decodes a packet
            *
            * @api private
            */

            var regexp = /([^:]+):([0-9]+)?(\+)?:([^:]+)?:?([\s\S]*)?/;

            parser.decodePacket = function (data) {
                var pieces = data.match(regexp);

                if (!pieces) return {};

                var id = pieces[2] || ''
                , data = pieces[5] || ''
                , packet = {
                    type: packets[pieces[1]]
                    , endpoint: pieces[4] || ''
                };

                // whether we need to acknowledge the packet
                if (id) {
                    packet.id = id;
                    if (pieces[3])
                    packet.ack = 'data';
                    else
                    packet.ack = true;
                }

                // handle different packet types
                switch (packet.type) {
                    case 'error':
                    var pieces = data.split('+');
                    packet.reason = reasons[pieces[0]] || '';
                    packet.advice = advice[pieces[1]] || '';
                    break;

                    case 'message':
                    packet.data = data || '';
                    break;

                    case 'event':
                    try {
                        var opts = JSON.parse(data);
                        packet.name = opts.name;
                        packet.args = opts.args;
                    } catch (e) { }

                        packet.args = packet.args || [];
                        break;

                        case 'json':
                        try {
                            packet.data = JSON.parse(data);
                        } catch (e) { }
                            break;

                            case 'connect':
                            packet.qs = data || '';
                            break;

                            case 'ack':
                            var pieces = data.match(/^([0-9]+)(\+)?(.*)/);
                            if (pieces) {
                                packet.ackId = pieces[1];
                                packet.args = [];

                                if (pieces[3]) {
                                    try {
                                        packet.args = pieces[3] ? JSON.parse(pieces[3]) : [];
                                    } catch (e) { }
                                    }
                                }
                                break;

                                case 'disconnect':
                                case 'heartbeat':
                                break;
                            };

                            return packet;
                        };

                        /**
                        * Decodes data payload. Detects multiple messages
                        *
                        * @return {Array} messages
                        * @api public
                        */

                        parser.decodePayload = function (data) {
                            // IE doesn't like data[i] for unicode chars, charAt works fine
                            if (data.charAt(0) == '\ufffd') {
                                var ret = [];

                                for (var i = 1, length = ''; i < data.length; i++) {
                                    if (data.charAt(i) == '\ufffd') {
                                        ret.push(parser.decodePacket(data.substr(i + 1).substr(0, length)));
                                        i += Number(length) + 1;
                                        length = '';
                                    } else {
                                        length += data.charAt(i);
                                    }
                                }

                                return ret;
                            } else {
                                return [parser.decodePacket(data)];
                            }
                        };

                    })(
                    'undefined' != typeof io ? io : module.exports
                    , 'undefined' != typeof io ? io : module.parent.exports
                    );
                    /**
                    * socket.io
                    * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
                    * MIT Licensed
                    */

                    (function (exports, io) {

                        /**
                        * Expose constructor.
                        */

                        exports.Transport = Transport;

                        /**
                        * This is the transport template for all supported transport methods.
                        *
                        * @constructor
                        * @api public
                        */

                        function Transport (socket, sessid) {
                            this.socket = socket;
                            this.sessid = sessid;
                        };

                        /**
                        * Apply EventEmitter mixin.
                        */

                        io.util.mixin(Transport, io.EventEmitter);

                        /**
                        * Handles the response from the server. When a new response is received
                        * it will automatically update the timeout, decode the message and
                        * forwards the response to the onMessage function for further processing.
                        *
                        * @param {String} data Response from the server.
                        * @api private
                        */

                        Transport.prototype.onData = function (data) {
                            this.clearCloseTimeout();

                            // If the connection in currently open (or in a reopening state) reset the close 
                            // timeout since we have just received data. This check is necessary so
                            // that we don't reset the timeout on an explicitly disconnected connection.
                            if (this.connected || this.connecting || this.reconnecting) {
                                this.setCloseTimeout();
                            }

                            if (data !== '') {
                                // todo: we should only do decodePayload for xhr transports
                                var msgs = io.parser.decodePayload(data);

                                if (msgs && msgs.length) {
                                    for (var i = 0, l = msgs.length; i < l; i++) {
                                        this.onPacket(msgs[i]);
                                    }
                                }
                            }

                            return this;
                        };

                        /**
                        * Handles packets.
                        *
                        * @api private
                        */

                        Transport.prototype.onPacket = function (packet) {
                            if (packet.type == 'heartbeat') {
                                return this.onHeartbeat();
                            }

                            if (packet.type == 'connect' && packet.endpoint == '') {
                                this.onConnect();
                            }

                            this.socket.onPacket(packet);

                            return this;
                        };

                        /**
                        * Sets close timeout
                        *
                        * @api private
                        */

                        Transport.prototype.setCloseTimeout = function () {
                            if (!this.closeTimeout) {
                                var self = this;

                                this.closeTimeout = setTimeout(function () {
                                    self.onDisconnect();
                                }, this.socket.closeTimeout);
                            }
                        };

                        /**
                        * Called when transport disconnects.
                        *
                        * @api private
                        */

                        Transport.prototype.onDisconnect = function () {
                            if (this.close && this.open) this.close();
                            this.clearTimeouts();
                            this.socket.onDisconnect();
                            return this;
                        };

                        /**
                        * Called when transport connects
                        *
                        * @api private
                        */

                        Transport.prototype.onConnect = function () {
                            this.socket.onConnect();
                            return this;
                        }

                        /**
                        * Clears close timeout
                        *
                        * @api private
                        */

                        Transport.prototype.clearCloseTimeout = function () {
                            if (this.closeTimeout) {
                                clearTimeout(this.closeTimeout);
                                this.closeTimeout = null;
                            }
                        };

                        /**
                        * Clear timeouts
                        *
                        * @api private
                        */

                        Transport.prototype.clearTimeouts = function () {
                            this.clearCloseTimeout();

                            if (this.reopenTimeout) {
                                clearTimeout(this.reopenTimeout);
                            }
                        };

                        /**
                        * Sends a packet
                        *
                        * @param {Object} packet object.
                        * @api private
                        */

                        Transport.prototype.packet = function (packet) {
                            this.send(io.parser.encodePacket(packet));
                        };

                        /**
                        * Send the received heartbeat message back to server. So the server
                        * knows we are still connected.
                        *
                        * @param {String} heartbeat Heartbeat response from the server.
                        * @api private
                        */

                        Transport.prototype.onHeartbeat = function (heartbeat) {
                            this.packet({ type: 'heartbeat' });
                        };

                        /**
                        * Called when the transport opens.
                        *
                        * @api private
                        */

                        Transport.prototype.onOpen = function () {
                            this.open = true;
                            this.clearCloseTimeout();
                            this.socket.onOpen();
                        };

                        /**
                        * Notifies the base when the connection with the Socket.IO server
                        * has been disconnected.
                        *
                        * @api private
                        */

                        Transport.prototype.onClose = function () {
                            var self = this;

                            /* FIXME: reopen delay causing a infinit loop
                            this.reopenTimeout = setTimeout(function () {
                            self.open();
                            }, this.socket.options['reopen delay']);*/

                            this.open = false;
                            this.socket.onClose();
                            this.onDisconnect();
                        };

                        /**
                        * Generates a connection url based on the Socket.IO URL Protocol.
                        * See <https://github.com/learnboost/socket.io-node/> for more details.
                        *
                        * @returns {String} Connection url
                        * @api private
                        */

                        Transport.prototype.prepareUrl = function () {
                            var options = this.socket.options;

                            return this.scheme() + '://'
                            + options.host + ':' + options.port + '/'
                            + options.resource + '/' + io.protocol
                            + '/' + this.name + '/' + this.sessid;
                        };

                        /**
                        * Checks if the transport is ready to start a connection.
                        *
                        * @param {Socket} socket The socket instance that needs a transport
                        * @param {Function} fn The callback
                        * @api private
                        */

                        Transport.prototype.ready = function (socket, fn) {
                            fn.call(this);
                        };
                    })(
                    'undefined' != typeof io ? io : module.exports
                    , 'undefined' != typeof io ? io : module.parent.exports
                    );

                    /**
                    * socket.io
                    * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
                    * MIT Licensed
                    */

                    (function (exports, io, global) {

                        /**
                        * Expose constructor.
                        */

                        exports.Socket = Socket;

                        /**
                        * Create a new `Socket.IO client` which can establish a persistent
                        * connection with a Socket.IO enabled server.
                        *
                        * @api public
                        */

                        function Socket (options) {
                            this.options = {
                                port: 80
                                , secure: false
                                , document: 'document' in global ? document : false
                                , resource: 'socket.io'
                                , transports: io.transports
                                , 'connect timeout': 10000
                                , 'try multiple transports': true
                                , 'reconnect': true
                                , 'reconnection delay': 500
                                , 'reconnection limit': Infinity
                                , 'reopen delay': 3000
                                , 'max reconnection attempts': 10
                                , 'sync disconnect on unload': true
                                , 'auto connect': true
                                , 'flash policy port': 10843
                            };

                            io.util.merge(this.options, options);

                            this.connected = false;
                            this.open = false;
                            this.connecting = false;
                            this.reconnecting = false;
                            this.namespaces = {};
                            this.buffer = [];
                            this.doBuffer = false;

                            if (this.options['sync disconnect on unload'] &&
                            (!this.isXDomain() || io.util.ua.hasCORS)) {
                                var self = this;

                                io.util.on(global, 'beforeunload', function () {
                                    self.disconnectSync();
                                }, false);
                            }

                            if (this.options['auto connect']) {
                                this.connect();
                            }
                        };

                        /**
                        * Apply EventEmitter mixin.
                        */

                        io.util.mixin(Socket, io.EventEmitter);

                        /**
                        * Returns a namespace listener/emitter for this socket
                        *
                        * @api public
                        */

                        Socket.prototype.of = function (name) {
                            if (!this.namespaces[name]) {
                                this.namespaces[name] = new io.SocketNamespace(this, name);

                                if (name !== '') {
                                    this.namespaces[name].packet({ type: 'connect' });
                                }
                            }

                            return this.namespaces[name];
                        };

                        /**
                        * Emits the given event to the Socket and all namespaces
                        *
                        * @api private
                        */

                        Socket.prototype.publish = function () {
                            this.emit.apply(this, arguments);

                            var nsp;

                            for (var i in this.namespaces) {
                                if (this.namespaces.hasOwnProperty(i)) {
                                    nsp = this.of(i);
                                    nsp.$emit.apply(nsp, arguments);
                                }
                            }
                        };

                        /**
                        * Performs the handshake
                        *
                        * @api private
                        */

                        function empty () { };

                        Socket.prototype.handshake = function (fn) {
                            var self = this
                            , options = this.options;

                            function complete (data) {
                                if (data instanceof Error) {
                                    self.onError(data.message);
                                } else {
                                    fn.apply(null, data.split(':'));
                                }
                            };

                            var url = [
                            'http' + (options.secure ? 's' : '') + ':/'
                            , options.host + ':' + options.port
                            , options.resource
                            , io.protocol
                            , io.util.query(this.options.query, 't=' + +new Date)
                            ].join('/');

                            if (this.isXDomain() && !io.util.ua.hasCORS) {
                                var insertAt = document.getElementsByTagName('script')[0]
                                , script = document.createElement('script');

                                script.src = url + '&jsonp=' + io.j.length;
                                insertAt.parentNode.insertBefore(script, insertAt);

                                io.j.push(function (data) {
                                    complete(data);
                                    script.parentNode.removeChild(script);
                                });
                            } else {
                                var xhr = io.util.request();

                                xhr.open('GET', url, true);
                                xhr.onreadystatechange = function () {
                                    if (xhr.readyState == 4) {
                                        xhr.onreadystatechange = empty;

                                        if (xhr.status == 200) {
                                            complete(xhr.responseText);
                                        } else {
                                            !self.reconnecting && self.onError(xhr.responseText);
                                        }
                                    }
                                };
                                xhr.send(null);
                            }
                        };

                        /**
                        * Find an available transport based on the options supplied in the constructor.
                        *
                        * @api private
                        */

                        Socket.prototype.getTransport = function (override) {
                            var transports = override || this.transports, match;

                            for (var i = 0, transport; transport = transports[i]; i++) {
                                if (io.Transport[transport]
                                && io.Transport[transport].check(this)
                                && (!this.isXDomain() || io.Transport[transport].xdomainCheck())) {
                                    return new io.Transport[transport](this, this.sessionid);
                                }
                            }

                            return null;
                        };

                        /**
                        * Connects to the server.
                        *
                        * @param {Function} [fn] Callback.
                        * @returns {io.Socket}
                        * @api public
                        */

                        Socket.prototype.connect = function (fn) {
                            if (this.connecting) {
                                return this;
                            }

                            var self = this;

                            this.handshake(function (sid, heartbeat, close, transports) {
                                self.sessionid = sid;
                                self.closeTimeout = close * 1000;
                                self.heartbeatTimeout = heartbeat * 1000;
                                self.transports = io.util.intersect(
                                transports.split(',')
                                , self.options.transports
                                );

                                function connect (transports){
                                    if (self.transport) self.transport.clearTimeouts();

                                    self.transport = self.getTransport(transports);
                                    if (!self.transport) return self.publish('connect_failed');

                                    // once the transport is ready
                                    self.transport.ready(self, function () {
                                        self.connecting = true;
                                        self.publish('connecting', self.transport.name);
                                        self.transport.open();

                                        if (self.options['connect timeout']) {
                                            self.connectTimeoutTimer = setTimeout(function () {
                                                if (!self.connected) {
                                                    self.connecting = false;

                                                    if (self.options['try multiple transports']) {
                                                        if (!self.remainingTransports) {
                                                            self.remainingTransports = self.transports.slice(0);
                                                        }

                                                        var remaining = self.remainingTransports;

                                                        while (remaining.length > 0 && remaining.splice(0,1)[0] !=
                                                        self.transport.name) {}

                                                        if (remaining.length){
                                                            connect(remaining);
                                                        } else {
                                                            self.publish('connect_failed');
                                                        }
                                                    }
                                                }
                                            }, self.options['connect timeout']);
                                        }
                                    });
                                }

                                connect();

                                self.once('connect', function (){
                                    clearTimeout(self.connectTimeoutTimer);

                                    fn && typeof fn == 'function' && fn();
                                });
                            });

                            return this;
                        };

                        /**
                        * Sends a message.
                        *
                        * @param {Object} data packet.
                        * @returns {io.Socket}
                        * @api public
                        */

                        Socket.prototype.packet = function (data) {
                            if (this.connected && !this.doBuffer) {
                                this.transport.packet(data);
                            } else {
                                this.buffer.push(data);
                            }

                            return this;
                        };

                        /**
                        * Sets buffer state
                        *
                        * @api private
                        */

                        Socket.prototype.setBuffer = function (v) {
                            this.doBuffer = v;

                            if (!v && this.connected && this.buffer.length) {
                                this.transport.payload(this.buffer);
                                this.buffer = [];
                            }
                        };

                        /**
                        * Disconnect the established connect.
                        *
                        * @returns {io.Socket}
                        * @api public
                        */

                        Socket.prototype.disconnect = function () {
                            if (this.connected) {
                                if (this.open) {
                                    this.of('').packet({ type: 'disconnect' });
                                }

                                // handle disconnection immediately
                                this.onDisconnect('booted');
                            }

                            return this;
                        };

                        /**
                        * Disconnects the socket with a sync XHR.
                        *
                        * @api private
                        */

                        Socket.prototype.disconnectSync = function () {
                            // ensure disconnection
                            var xhr = io.util.request()
                            , uri = this.resource + '/' + io.protocol + '/' + this.sessionid;

                            xhr.open('GET', uri, true);

                            // handle disconnection immediately
                            this.onDisconnect('booted');
                        };

                        /**
                        * Check if we need to use cross domain enabled transports. Cross domain would
                        * be a different port or different domain name.
                        *
                        * @returns {Boolean}
                        * @api private
                        */

                        Socket.prototype.isXDomain = function () {

                            var port = global.location.port ||
                            ('https:' == global.location.protocol ? 443 : 80);

                            return this.options.host !== global.location.hostname 
                            || this.options.port != port;
                        };

                        /**
                        * Called upon handshake.
                        *
                        * @api private
                        */

                        Socket.prototype.onConnect = function () {
                            if (!this.connected) {
                                this.connected = true;
                                this.connecting = false;
                                if (!this.doBuffer) {
                                    // make sure to flush the buffer
                                    this.setBuffer(false);
                                }
                                this.emit('connect');
                            }
                        };

                        /**
                        * Called when the transport opens
                        *
                        * @api private
                        */

                        Socket.prototype.onOpen = function () {
                            this.open = true;
                        };

                        /**
                        * Called when the transport closes.
                        *
                        * @api private
                        */

                        Socket.prototype.onClose = function () {
                            this.open = false;
                        };

                        /**
                        * Called when the transport first opens a connection
                        *
                        * @param text
                        */

                        Socket.prototype.onPacket = function (packet) {
                            this.of(packet.endpoint).onPacket(packet);
                        };

                        /**
                        * Handles an error.
                        *
                        * @api private
                        */

                        Socket.prototype.onError = function (err) {
                            if (err && err.advice) {
                                if (err.advice === 'reconnect' && this.connected) {
                                    this.disconnect();
                                    this.reconnect();
                                }
                            }

                            this.publish('error', err && err.reason ? err.reason : err);
                        };

                        /**
                        * Called when the transport disconnects.
                        *
                        * @api private
                        */

                        Socket.prototype.onDisconnect = function (reason) {
                            var wasConnected = this.connected;

                            this.connected = false;
                            this.connecting = false;
                            this.open = false;

                            if (wasConnected) {
                                this.transport.close();
                                this.transport.clearTimeouts();
                                this.publish('disconnect', reason);

                                if ('booted' != reason && this.options.reconnect && !this.reconnecting) {
                                    this.reconnect();
                                }
                            }
                        };

                        /**
                        * Called upon reconnection.
                        *
                        * @api private
                        */

                        Socket.prototype.reconnect = function () {
                            this.reconnecting = true;
                            this.reconnectionAttempts = 0;
                            this.reconnectionDelay = this.options['reconnection delay'];

                            var self = this
                            , maxAttempts = this.options['max reconnection attempts']
                            , tryMultiple = this.options['try multiple transports']
                            , limit = this.options['reconnection limit'];

                            function reset () {
                                if (self.connected) {
                                    for (var i in self.namespaces) {
                                        if (self.namespaces.hasOwnProperty(i) && '' !== i) {
                                            self.namespaces[i].packet({ type: 'connect' });
                                        }
                                    }
                                    self.publish('reconnect', self.transport.name, self.reconnectionAttempts);
                                }

                                self.removeListener('connect_failed', maybeReconnect);
                                self.removeListener('connect', maybeReconnect);

                                self.reconnecting = false;

                                delete self.reconnectionAttempts;
                                delete self.reconnectionDelay;
                                delete self.reconnectionTimer;
                                delete self.redoTransports;

                                self.options['try multiple transports'] = tryMultiple;
                            };

                            function maybeReconnect () {
                                if (!self.reconnecting) {
                                    return;
                                }

                                if (self.connected) {
                                    return reset();
                                };

                                if (self.connecting && self.reconnecting) {
                                    return self.reconnectionTimer = setTimeout(maybeReconnect, 1000);
                                }

                                if (self.reconnectionAttempts++ >= maxAttempts) {
                                    if (!self.redoTransports) {
                                        self.on('connect_failed', maybeReconnect);
                                        self.options['try multiple transports'] = true;
                                        self.transport = self.getTransport();
                                        self.redoTransports = true;
                                        self.connect();
                                    } else {
                                        self.publish('reconnect_failed');
                                        reset();
                                    }
                                } else {
                                    if (self.reconnectionDelay < limit) {
                                        self.reconnectionDelay *= 2; // exponential back off
                                    }

                                    self.connect();
                                    self.publish('reconnecting', self.reconnectionDelay, self.reconnectionAttempts);
                                    self.reconnectionTimer = setTimeout(maybeReconnect, self.reconnectionDelay);
                                }
                            };

                            this.options['try multiple transports'] = false;
                            this.reconnectionTimer = setTimeout(maybeReconnect, this.reconnectionDelay);

                            this.on('connect', maybeReconnect);
                        };

                    })(
                    'undefined' != typeof io ? io : module.exports
                    , 'undefined' != typeof io ? io : module.parent.exports
                    , this
                    );
                    /**
                    * socket.io
                    * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
                    * MIT Licensed
                    */

                    (function (exports, io) {

                        /**
                        * Expose constructor.
                        */

                        exports.SocketNamespace = SocketNamespace;

                        /**
                        * Socket namespace constructor.
                        *
                        * @constructor
                        * @api public
                        */

                        function SocketNamespace (socket, name) {
                            this.socket = socket;
                            this.name = name || '';
                            this.flags = {};
                            this.json = new Flag(this, 'json');
                            this.ackPackets = 0;
                            this.acks = {};
                        };

                        /**
                        * Apply EventEmitter mixin.
                        */

                        io.util.mixin(SocketNamespace, io.EventEmitter);

                        /**
                        * Copies emit since we override it
                        *
                        * @api private
                        */

                        SocketNamespace.prototype.$emit = io.EventEmitter.prototype.emit;

                        /**
                        * Creates a new namespace, by proxying the request to the socket. This
                        * allows us to use the synax as we do on the server.
                        *
                        * @api public
                        */

                        SocketNamespace.prototype.of = function () {
                            return this.socket.of.apply(this.socket, arguments);
                        };

                        /**
                        * Sends a packet.
                        *
                        * @api private
                        */

                        SocketNamespace.prototype.packet = function (packet) {
                            packet.endpoint = this.name;
                            this.socket.packet(packet);
                            this.flags = {};
                            return this;
                        };

                        /**
                        * Sends a message
                        *
                        * @api public
                        */

                        SocketNamespace.prototype.send = function (data, fn) {
                            var packet = {
                                type: this.flags.json ? 'json' : 'message'
                                , data: data
                            };

                            if ('function' == typeof fn) {
                                packet.id = ++this.ackPackets;
                                packet.ack = true;
                                this.acks[packet.id] = fn;
                            }

                            return this.packet(packet);
                        };

                        /**
                        * Emits an event
                        *
                        * @api public
                        */

                        SocketNamespace.prototype.emit = function (name) {
                            var args = Array.prototype.slice.call(arguments, 1)
                            , lastArg = args[args.length - 1]
                            , packet = {
                                type: 'event'
                                , name: name
                            };

                            if ('function' == typeof lastArg) {
                                packet.id = ++this.ackPackets;
                                packet.ack = 'data';
                                this.acks[packet.id] = lastArg;
                                args = args.slice(0, args.length - 1);
                            }

                            packet.args = args;

                            return this.packet(packet);
                        };

                        /**
                        * Disconnects the namespace
                        *
                        * @api private
                        */

                        SocketNamespace.prototype.disconnect = function () {
                            if (this.name === '') {
                                this.socket.disconnect();
                            } else {
                                this.packet({ type: 'disconnect' });
                                this.$emit('disconnect');
                            }

                            return this;
                        };

                        /**
                        * Handles a packet
                        *
                        * @api private
                        */

                        SocketNamespace.prototype.onPacket = function (packet) {
                            var self = this;

                            function ack () {
                                self.packet({
                                    type: 'ack'
                                    , args: io.util.toArray(arguments)
                                    , ackId: packet.id
                                });
                            };

                            switch (packet.type) {
                                case 'connect':
                                this.$emit('connect');
                                break;

                                case 'disconnect':
                                if (this.name === '') {
                                    this.socket.onDisconnect(packet.reason || 'booted');
                                } else {
                                    this.$emit('disconnect', packet.reason);
                                }
                                break;

                                case 'message':
                                case 'json':
                                var params = ['message', packet.data];

                                if (packet.ack == 'data') {
                                    params.push(ack);
                                } else if (packet.ack) {
                                    this.packet({ type: 'ack', ackId: packet.id });
                                }

                                this.$emit.apply(this, params);
                                break;

                                case 'event':
                                var params = [packet.name].concat(packet.args);

                                if (packet.ack == 'data')
                                params.push(ack);

                                this.$emit.apply(this, params);
                                break;

                                case 'ack':
                                if (this.acks[packet.ackId]) {
                                    this.acks[packet.ackId].apply(this, packet.args);
                                    delete this.acks[packet.ackId];
                                }
                                break;

                                case 'error':
                                if (packet.advice){
                                    this.socket.onError(packet);
                                } else {
                                    if (packet.reason == 'unauthorized') {
                                        this.$emit('connect_failed', packet.reason);
                                    } else {
                                        this.$emit('error', packet.reason);
                                    }
                                }
                                break;
                            }
                        };

                        /**
                        * Flag interface.
                        *
                        * @api private
                        */

                        function Flag (nsp, name) {
                            this.namespace = nsp;
                            this.name = name;
                        };

                        /**
                        * Send a message
                        *
                        * @api public
                        */

                        Flag.prototype.send = function () {
                            this.namespace.flags[this.name] = true;
                            this.namespace.send.apply(this.namespace, arguments);
                        };

                        /**
                        * Emit an event
                        *
                        * @api public
                        */

                        Flag.prototype.emit = function () {
                            this.namespace.flags[this.name] = true;
                            this.namespace.emit.apply(this.namespace, arguments);
                        };

                    })(
                    'undefined' != typeof io ? io : module.exports
                    , 'undefined' != typeof io ? io : module.parent.exports
                    );

                    /**
                    * socket.io
                    * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
                    * MIT Licensed
                    */

                    (function (exports, io, global) {

                        /**
                        * Expose constructor.
                        */

                        exports.websocket = WS;

                        /**
                        * The WebSocket transport uses the HTML5 WebSocket API to establish an
                        * persistent connection with the Socket.IO server. This transport will also
                        * be inherited by the FlashSocket fallback as it provides a API compatible
                        * polyfill for the WebSockets.
                        *
                        * @constructor
                        * @extends {io.Transport}
                        * @api public
                        */

                        function WS (socket) {
                            io.Transport.apply(this, arguments);
                        };

                        /**
                        * Inherits from Transport.
                        */

                        io.util.inherit(WS, io.Transport);

                        /**
                        * Transport name
                        *
                        * @api public
                        */

                        WS.prototype.name = 'websocket';

                        /**
                        * Initializes a new `WebSocket` connection with the Socket.IO server. We attach
                        * all the appropriate listeners to handle the responses from the server.
                        *
                        * @returns {Transport}
                        * @api public
                        */

                        WS.prototype.open = function () {
                            var query = io.util.query(this.socket.options.query)
                            , self = this
                            , Socket


                            if (!Socket) {
                                Socket = global.MozWebSocket || global.WebSocket;
                            }

                            this.websocket = new Socket(this.prepareUrl() + query);

                            this.websocket.onopen = function () {
                                self.onOpen();
                                self.socket.setBuffer(false);
                            };
                            this.websocket.onmessage = function (ev) {
                                self.onData(ev.data);
                            };
                            this.websocket.onclose = function () {
                                self.onClose();
                                self.socket.setBuffer(true);
                            };
                            this.websocket.onerror = function (e) {
                                self.onError(e);
                            };

                            return this;
                        };

                        /**
                        * Send a message to the Socket.IO server. The message will automatically be
                        * encoded in the correct message format.
                        *
                        * @returns {Transport}
                        * @api public
                        */

                        WS.prototype.send = function (data) {
                            this.websocket.send(data);
                            return this;
                        };

                        /**
                        * Payload
                        *
                        * @api private
                        */

                        WS.prototype.payload = function (arr) {
                            for (var i = 0, l = arr.length; i < l; i++) {
                                this.packet(arr[i]);
                            }
                            return this;
                        };

                        /**
                        * Disconnect the established `WebSocket` connection.
                        *
                        * @returns {Transport}
                        * @api public
                        */

                        WS.prototype.close = function () {
                            this.websocket.close();
                            return this;
                        };

                        /**
                        * Handle the errors that `WebSocket` might be giving when we
                        * are attempting to connect or send messages.
                        *
                        * @param {Error} e The error.
                        * @api private
                        */

                        WS.prototype.onError = function (e) {
                            this.socket.onError(e);
                        };

                        /**
                        * Returns the appropriate scheme for the URI generation.
                        *
                        * @api private
                        */
                        WS.prototype.scheme = function () {
                            return this.socket.options.secure ? 'wss' : 'ws';
                        };

                        /**
                        * Checks if the browser has support for native `WebSockets` and that
                        * it's not the polyfill created for the FlashSocket transport.
                        *
                        * @return {Boolean}
                        * @api public
                        */

                        WS.check = function () {
                            return ('WebSocket' in global && !('__addTask' in WebSocket))
                            || 'MozWebSocket' in global;
                        };

                        /**
                        * Check if the `WebSocket` transport support cross domain communications.
                        *
                        * @returns {Boolean}
                        * @api public
                        */

                        WS.xdomainCheck = function () {
                            return true;
                        };

                        /**
                        * Add the transport to your public io.transports array.
                        *
                        * @api private
                        */

                        io.transports.push('websocket');

                    })(
                    'undefined' != typeof io ? io.Transport : module.exports
                    , 'undefined' != typeof io ? io : module.parent.exports
                    , this
                    );

                    /**
                    * socket.io
                    * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
                    * MIT Licensed
                    */

                    (function (exports, io) {

                        /**
                        * Expose constructor.
                        */

                        exports.flashsocket = Flashsocket;

                        /**
                        * The FlashSocket transport. This is a API wrapper for the HTML5 WebSocket
                        * specification. It uses a .swf file to communicate with the server. If you want
                        * to serve the .swf file from a other server than where the Socket.IO script is
                        * coming from you need to use the insecure version of the .swf. More information
                        * about this can be found on the github page.
                        *
                        * @constructor
                        * @extends {io.Transport.websocket}
                        * @api public
                        */

                        function Flashsocket () {
                            io.Transport.websocket.apply(this, arguments);
                        };

                        /**
                        * Inherits from Transport.
                        */

                        io.util.inherit(Flashsocket, io.Transport.websocket);

                        /**
                        * Transport name
                        *
                        * @api public
                        */

                        Flashsocket.prototype.name = 'flashsocket';

                        /**
                        * Disconnect the established `FlashSocket` connection. This is done by adding a 
                        * new task to the FlashSocket. The rest will be handled off by the `WebSocket` 
                        * transport.
                        *
                        * @returns {Transport}
                        * @api public
                        */

                        Flashsocket.prototype.open = function () {
                            var self = this
                            , args = arguments;

                            WebSocket.__addTask(function () {
                                io.Transport.websocket.prototype.open.apply(self, args);
                            });
                            return this;
                        };

                        /**
                        * Sends a message to the Socket.IO server. This is done by adding a new
                        * task to the FlashSocket. The rest will be handled off by the `WebSocket` 
                        * transport.
                        *
                        * @returns {Transport}
                        * @api public
                        */

                        Flashsocket.prototype.send = function () {
                            var self = this, args = arguments;
                            WebSocket.__addTask(function () {
                                io.Transport.websocket.prototype.send.apply(self, args);
                            });
                            return this;
                        };

                        /**
                        * Disconnects the established `FlashSocket` connection.
                        *
                        * @returns {Transport}
                        * @api public
                        */

                        Flashsocket.prototype.close = function () {
                            WebSocket.__tasks.length = 0;
                            io.Transport.websocket.prototype.close.call(this);
                            return this;
                        };

                        /**
                        * The WebSocket fall back needs to append the flash container to the body
                        * element, so we need to make sure we have access to it. Or defer the call
                        * until we are sure there is a body element.
                        *
                        * @param {Socket} socket The socket instance that needs a transport
                        * @param {Function} fn The callback
                        * @api private
                        */

                        Flashsocket.prototype.ready = function (socket, fn) {
                            function init () {
                                var options = socket.options
                                , port = options['flash policy port']
                                , path = [
                                'http' + (options.secure ? 's' : '') + ':/'
                                , options.host + ':' + options.port
                                , options.resource
                                , 'static/flashsocket'
                                , 'WebSocketMain' + (socket.isXDomain() ? 'Insecure' : '') + '.swf'
                                ];

                                // Only start downloading the swf file when the checked that this browser
                                // actually supports it
                                if (!Flashsocket.loaded) {
                                    if (typeof WEB_SOCKET_SWF_LOCATION === 'undefined') {
                                        // Set the correct file based on the XDomain settings
                                        WEB_SOCKET_SWF_LOCATION = path.join('/');
                                    }

                                    if (port !== 843) {
                                        WebSocket.loadFlashPolicyFile('xmlsocket://' + options.host + ':' + port);
                                    }

                                    WebSocket.__initialize();
                                    Flashsocket.loaded = true;
                                }

                                fn.call(self);
                            }

                            var self = this;
                            if (document.body) return init();

                            io.util.load(init);
                        };

                        /**
                        * Check if the FlashSocket transport is supported as it requires that the Adobe
                        * Flash Player plug-in version `10.0.0` or greater is installed. And also check if
                        * the polyfill is correctly loaded.
                        *
                        * @returns {Boolean}
                        * @api public
                        */

                        Flashsocket.check = function () {
                            if (
                            typeof WebSocket == 'undefined'
                            || !('__initialize' in WebSocket) || !swfobject
                            ) return false;

                            return swfobject.getFlashPlayerVersion().major >= 10;
                        };

                        /**
                        * Check if the FlashSocket transport can be used as cross domain / cross origin 
                        * transport. Because we can't see which type (secure or insecure) of .swf is used
                        * we will just return true.
                        *
                        * @returns {Boolean}
                        * @api public
                        */

                        Flashsocket.xdomainCheck = function () {
                            return true;
                        };

                        /**
                        * Disable AUTO_INITIALIZATION
                        */

                        if (typeof window != 'undefined') {
                            WEB_SOCKET_DISABLE_AUTO_INITIALIZATION = true;
                        }

                        /**
                        * Add the transport to your public io.transports array.
                        *
                        * @api private
                        */

                        io.transports.push('flashsocket');
                    })(
                    'undefined' != typeof io ? io.Transport : module.exports
                    , 'undefined' != typeof io ? io : module.parent.exports
                    );
                    /*	SWFObject v2.2 <http://code.google.com/p/swfobject/> 
                    is released under the MIT License <http://www.opensource.org/licenses/mit-license.php> 
                    */
                    if ('undefined' != typeof window) {
                        var swfobject=function(){var D="undefined",r="object",S="Shockwave Flash",W="ShockwaveFlash.ShockwaveFlash",q="application/x-shockwave-flash",R="SWFObjectExprInst",x="onreadystatechange",O=window,j=document,t=navigator,T=false,U=[h],o=[],N=[],I=[],l,Q,E,B,J=false,a=false,n,G,m=true,M=function(){var aa=typeof j.getElementById!=D&&typeof j.getElementsByTagName!=D&&typeof j.createElement!=D,ah=t.userAgent.toLowerCase(),Y=t.platform.toLowerCase(),ae=Y?/win/.test(Y):/win/.test(ah),ac=Y?/mac/.test(Y):/mac/.test(ah),af=/webkit/.test(ah)?parseFloat(ah.replace(/^.*webkit\/(\d+(\.\d+)?).*$/,"$1")):false,X=!+"\v1",ag=[0,0,0],ab=null;if(typeof t.plugins!=D&&typeof t.plugins[S]==r){ab=t.plugins[S].description;if(ab&&!(typeof t.mimeTypes!=D&&t.mimeTypes[q]&&!t.mimeTypes[q].enabledPlugin)){T=true;X=false;ab=ab.replace(/^.*\s+(\S+\s+\S+$)/,"$1");ag[0]=parseInt(ab.replace(/^(.*)\..*$/,"$1"),10);ag[1]=parseInt(ab.replace(/^.*\.(.*)\s.*$/,"$1"),10);ag[2]=/[a-zA-Z]/.test(ab)?parseInt(ab.replace(/^.*[a-zA-Z]+(.*)$/,"$1"),10):0}}else{if(typeof O.ActiveXObject!=D){try{var ad=new ActiveXObject(W);if(ad){ab=ad.GetVariable("$version");if(ab){X=true;ab=ab.split(" ")[1].split(",");ag=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}}catch(Z){}}}return{w3:aa,pv:ag,wk:af,ie:X,win:ae,mac:ac}}(),k=function(){if(!M.w3){return}if((typeof j.readyState!=D&&j.readyState=="complete")||(typeof j.readyState==D&&(j.getElementsByTagName("body")[0]||j.body))){f()}if(!J){if(typeof j.addEventListener!=D){j.addEventListener("DOMContentLoaded",f,false)}if(M.ie&&M.win){j.attachEvent(x,function(){if(j.readyState=="complete"){j.detachEvent(x,arguments.callee);f()}});if(O==top){(function(){if(J){return}try{j.documentElement.doScroll("left")}catch(X){setTimeout(arguments.callee,0);return}f()})()}}if(M.wk){(function(){if(J){return}if(!/loaded|complete/.test(j.readyState)){setTimeout(arguments.callee,0);return}f()})()}s(f)}}();function f(){if(J){return}try{var Z=j.getElementsByTagName("body")[0].appendChild(C("span"));Z.parentNode.removeChild(Z)}catch(aa){return}J=true;var X=U.length;for(var Y=0;Y<X;Y++){U[Y]()}}function K(X){if(J){X()}else{U[U.length]=X}}function s(Y){if(typeof O.addEventListener!=D){O.addEventListener("load",Y,false)}else{if(typeof j.addEventListener!=D){j.addEventListener("load",Y,false)}else{if(typeof O.attachEvent!=D){i(O,"onload",Y)}else{if(typeof O.onload=="function"){var X=O.onload;O.onload=function(){X();Y()}}else{O.onload=Y}}}}}function h(){if(T){V()}else{H()}}function V(){var X=j.getElementsByTagName("body")[0];var aa=C(r);aa.setAttribute("type",q);var Z=X.appendChild(aa);if(Z){var Y=0;(function(){if(typeof Z.GetVariable!=D){var ab=Z.GetVariable("$version");if(ab){ab=ab.split(" ")[1].split(",");M.pv=[parseInt(ab[0],10),parseInt(ab[1],10),parseInt(ab[2],10)]}}else{if(Y<10){Y++;setTimeout(arguments.callee,10);return}}X.removeChild(aa);Z=null;H()})()}else{H()}}function H(){var ag=o.length;if(ag>0){for(var af=0;af<ag;af++){var Y=o[af].id;var ab=o[af].callbackFn;var aa={success:false,id:Y};if(M.pv[0]>0){var ae=c(Y);if(ae){if(F(o[af].swfVersion)&&!(M.wk&&M.wk<312)){w(Y,true);if(ab){aa.success=true;aa.ref=z(Y);ab(aa)}}else{if(o[af].expressInstall&&A()){var ai={};ai.data=o[af].expressInstall;ai.width=ae.getAttribute("width")||"0";ai.height=ae.getAttribute("height")||"0";if(ae.getAttribute("class")){ai.styleclass=ae.getAttribute("class")}if(ae.getAttribute("align")){ai.align=ae.getAttribute("align")}var ah={};var X=ae.getElementsByTagName("param");var ac=X.length;for(var ad=0;ad<ac;ad++){if(X[ad].getAttribute("name").toLowerCase()!="movie"){ah[X[ad].getAttribute("name")]=X[ad].getAttribute("value")}}P(ai,ah,Y,ab)}else{p(ae);if(ab){ab(aa)}}}}}else{w(Y,true);if(ab){var Z=z(Y);if(Z&&typeof Z.SetVariable!=D){aa.success=true;aa.ref=Z}ab(aa)}}}}}function z(aa){var X=null;var Y=c(aa);if(Y&&Y.nodeName=="OBJECT"){if(typeof Y.SetVariable!=D){X=Y}else{var Z=Y.getElementsByTagName(r)[0];if(Z){X=Z}}}return X}function A(){return !a&&F("6.0.65")&&(M.win||M.mac)&&!(M.wk&&M.wk<312)}function P(aa,ab,X,Z){a=true;E=Z||null;B={success:false,id:X};var ae=c(X);if(ae){if(ae.nodeName=="OBJECT"){l=g(ae);Q=null}else{l=ae;Q=X}aa.id=R;if(typeof aa.width==D||(!/%$/.test(aa.width)&&parseInt(aa.width,10)<310)){aa.width="310"}if(typeof aa.height==D||(!/%$/.test(aa.height)&&parseInt(aa.height,10)<137)){aa.height="137"}j.title=j.title.slice(0,47)+" - Flash Player Installation";var ad=M.ie&&M.win?"ActiveX":"PlugIn",ac="MMredirectURL="+O.location.toString().replace(/&/g,"%26")+"&MMplayerType="+ad+"&MMdoctitle="+j.title;if(typeof ab.flashvars!=D){ab.flashvars+="&"+ac}else{ab.flashvars=ac}if(M.ie&&M.win&&ae.readyState!=4){var Y=C("div");X+="SWFObjectNew";Y.setAttribute("id",X);ae.parentNode.insertBefore(Y,ae);ae.style.display="none";(function(){if(ae.readyState==4){ae.parentNode.removeChild(ae)}else{setTimeout(arguments.callee,10)}})()}u(aa,ab,X)}}function p(Y){if(M.ie&&M.win&&Y.readyState!=4){var X=C("div");Y.parentNode.insertBefore(X,Y);X.parentNode.replaceChild(g(Y),X);Y.style.display="none";(function(){if(Y.readyState==4){Y.parentNode.removeChild(Y)}else{setTimeout(arguments.callee,10)}})()}else{Y.parentNode.replaceChild(g(Y),Y)}}function g(ab){var aa=C("div");if(M.win&&M.ie){aa.innerHTML=ab.innerHTML}else{var Y=ab.getElementsByTagName(r)[0];if(Y){var ad=Y.childNodes;if(ad){var X=ad.length;for(var Z=0;Z<X;Z++){if(!(ad[Z].nodeType==1&&ad[Z].nodeName=="PARAM")&&!(ad[Z].nodeType==8)){aa.appendChild(ad[Z].cloneNode(true))}}}}}return aa}function u(ai,ag,Y){var X,aa=c(Y);if(M.wk&&M.wk<312){return X}if(aa){if(typeof ai.id==D){ai.id=Y}if(M.ie&&M.win){var ah="";for(var ae in ai){if(ai[ae]!=Object.prototype[ae]){if(ae.toLowerCase()=="data"){ag.movie=ai[ae]}else{if(ae.toLowerCase()=="styleclass"){ah+=' class="'+ai[ae]+'"'}else{if(ae.toLowerCase()!="classid"){ah+=" "+ae+'="'+ai[ae]+'"'}}}}}var af="";for(var ad in ag){if(ag[ad]!=Object.prototype[ad]){af+='<param name="'+ad+'" value="'+ag[ad]+'" />'}}aa.outerHTML='<object classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"'+ah+">"+af+"</object>";N[N.length]=ai.id;X=c(ai.id)}else{var Z=C(r);Z.setAttribute("type",q);for(var ac in ai){if(ai[ac]!=Object.prototype[ac]){if(ac.toLowerCase()=="styleclass"){Z.setAttribute("class",ai[ac])}else{if(ac.toLowerCase()!="classid"){Z.setAttribute(ac,ai[ac])}}}}for(var ab in ag){if(ag[ab]!=Object.prototype[ab]&&ab.toLowerCase()!="movie"){e(Z,ab,ag[ab])}}aa.parentNode.replaceChild(Z,aa);X=Z}}return X}function e(Z,X,Y){var aa=C("param");aa.setAttribute("name",X);aa.setAttribute("value",Y);Z.appendChild(aa)}function y(Y){var X=c(Y);if(X&&X.nodeName=="OBJECT"){if(M.ie&&M.win){X.style.display="none";(function(){if(X.readyState==4){b(Y)}else{setTimeout(arguments.callee,10)}})()}else{X.parentNode.removeChild(X)}}}function b(Z){var Y=c(Z);if(Y){for(var X in Y){if(typeof Y[X]=="function"){Y[X]=null}}Y.parentNode.removeChild(Y)}}function c(Z){var X=null;try{X=j.getElementById(Z)}catch(Y){}return X}function C(X){return j.createElement(X)}function i(Z,X,Y){Z.attachEvent(X,Y);I[I.length]=[Z,X,Y]}function F(Z){var Y=M.pv,X=Z.split(".");X[0]=parseInt(X[0],10);X[1]=parseInt(X[1],10)||0;X[2]=parseInt(X[2],10)||0;return(Y[0]>X[0]||(Y[0]==X[0]&&Y[1]>X[1])||(Y[0]==X[0]&&Y[1]==X[1]&&Y[2]>=X[2]))?true:false}function v(ac,Y,ad,ab){if(M.ie&&M.mac){return}var aa=j.getElementsByTagName("head")[0];if(!aa){return}var X=(ad&&typeof ad=="string")?ad:"screen";if(ab){n=null;G=null}if(!n||G!=X){var Z=C("style");Z.setAttribute("type","text/css");Z.setAttribute("media",X);n=aa.appendChild(Z);if(M.ie&&M.win&&typeof j.styleSheets!=D&&j.styleSheets.length>0){n=j.styleSheets[j.styleSheets.length-1]}G=X}if(M.ie&&M.win){if(n&&typeof n.addRule==r){n.addRule(ac,Y)}}else{if(n&&typeof j.createTextNode!=D){n.appendChild(j.createTextNode(ac+" {"+Y+"}"))}}}function w(Z,X){if(!m){return}var Y=X?"visible":"hidden";if(J&&c(Z)){c(Z).style.visibility=Y}else{v("#"+Z,"visibility:"+Y)}}function L(Y){var Z=/[\\\"<>\.;]/;var X=Z.exec(Y)!=null;return X&&typeof encodeURIComponent!=D?encodeURIComponent(Y):Y}var d=function(){if(M.ie&&M.win){window.attachEvent("onunload",function(){var ac=I.length;for(var ab=0;ab<ac;ab++){I[ab][0].detachEvent(I[ab][1],I[ab][2])}var Z=N.length;for(var aa=0;aa<Z;aa++){y(N[aa])}for(var Y in M){M[Y]=null}M=null;for(var X in swfobject){swfobject[X]=null}swfobject=null})}}();return{registerObject:function(ab,X,aa,Z){if(M.w3&&ab&&X){var Y={};Y.id=ab;Y.swfVersion=X;Y.expressInstall=aa;Y.callbackFn=Z;o[o.length]=Y;w(ab,false)}else{if(Z){Z({success:false,id:ab})}}},getObjectById:function(X){if(M.w3){return z(X)}},embedSWF:function(ab,ah,ae,ag,Y,aa,Z,ad,af,ac){var X={success:false,id:ah};if(M.w3&&!(M.wk&&M.wk<312)&&ab&&ah&&ae&&ag&&Y){w(ah,false);K(function(){ae+="";ag+="";var aj={};if(af&&typeof af===r){for(var al in af){aj[al]=af[al]}}aj.data=ab;aj.width=ae;aj.height=ag;var am={};if(ad&&typeof ad===r){for(var ak in ad){am[ak]=ad[ak]}}if(Z&&typeof Z===r){for(var ai in Z){if(typeof am.flashvars!=D){am.flashvars+="&"+ai+"="+Z[ai]}else{am.flashvars=ai+"="+Z[ai]}}}if(F(Y)){var an=u(aj,am,ah);if(aj.id==ah){w(ah,true)}X.success=true;X.ref=an}else{if(aa&&A()){aj.data=aa;P(aj,am,ah,ac);return}else{w(ah,true)}}if(ac){ac(X)}})}else{if(ac){ac(X)}}},switchOffAutoHideShow:function(){m=false},ua:M,getFlashPlayerVersion:function(){return{major:M.pv[0],minor:M.pv[1],release:M.pv[2]}},hasFlashPlayerVersion:F,createSWF:function(Z,Y,X){if(M.w3){return u(Z,Y,X)}else{return undefined}},showExpressInstall:function(Z,aa,X,Y){if(M.w3&&A()){P(Z,aa,X,Y)}},removeSWF:function(X){if(M.w3){y(X)}},createCSS:function(aa,Z,Y,X){if(M.w3){v(aa,Z,Y,X)}},addDomLoadEvent:K,addLoadEvent:s,getQueryParamValue:function(aa){var Z=j.location.search||j.location.hash;if(Z){if(/\?/.test(Z)){Z=Z.split("?")[1]}if(aa==null){return L(Z)}var Y=Z.split("&");for(var X=0;X<Y.length;X++){if(Y[X].substring(0,Y[X].indexOf("="))==aa){return L(Y[X].substring((Y[X].indexOf("=")+1)))}}}return""},expressInstallCallback:function(){if(a){var X=c(R);if(X&&l){X.parentNode.replaceChild(l,X);if(Q){w(Q,true);if(M.ie&&M.win){l.style.display="block"}}if(E){E(B)}}a=false}}}}();
                    }
                    // Copyright: Hiroshi Ichikawa <http://gimite.net/en/>
                    // License: New BSD License
                    // Reference: http://dev.w3.org/html5/websockets/
                    // Reference: http://tools.ietf.org/html/draft-hixie-thewebsocketprotocol

                    (function() {

                        if ('undefined' == typeof window || window.WebSocket) return;

                        var console = window.console;
                        if (!console || !console.log || !console.error) {
                            console = {log: function(){ }, error: function(){ }};
                        }

                        if (!swfobject.hasFlashPlayerVersion("10.0.0")) {
                            console.error("Flash Player >= 10.0.0 is required.");
                            return;
                        }
                        if (location.protocol == "file:") {
                            console.error(
                            "WARNING: web-socket-js doesn't work in file:///... URL " +
                            "unless you set Flash Security Settings properly. " +
                            "Open the page via Web server i.e. http://...");
                        }

                        /**
                        * This class represents a faux web socket.
                        * @param {string} url
                        * @param {array or string} protocols
                        * @param {string} proxyHost
                        * @param {int} proxyPort
                        * @param {string} headers
                        */
                        WebSocket = function(url, protocols, proxyHost, proxyPort, headers) {
                            var self = this;
                            self.__id = WebSocket.__nextId++;
                            WebSocket.__instances[self.__id] = self;
                            self.readyState = WebSocket.CONNECTING;
                            self.bufferedAmount = 0;
                            self.__events = {};
                            if (!protocols) {
                                protocols = [];
                            } else if (typeof protocols == "string") {
                                protocols = [protocols];
                            }
                            // Uses setTimeout() to make sure __createFlash() runs after the caller sets ws.onopen etc.
                            // Otherwise, when onopen fires immediately, onopen is called before it is set.
                            setTimeout(function() {
                                WebSocket.__addTask(function() {
                                    WebSocket.__flash.create(
                                    self.__id, url, protocols, proxyHost || null, proxyPort || 0, headers || null);
                                });
                            }, 0);
                        };

                        /**
                        * Send data to the web socket.
                        * @param {string} data  The data to send to the socket.
                        * @return {boolean}  True for success, false for failure.
                        */
                        WebSocket.prototype.send = function(data) {
                            if (this.readyState == WebSocket.CONNECTING) {
                                throw "INVALID_STATE_ERR: Web Socket connection has not been established";
                            }
                            // We use encodeURIComponent() here, because FABridge doesn't work if
                            // the argument includes some characters. We don't use escape() here
                            // because of this:
                            // https://developer.mozilla.org/en/Core_JavaScript_1.5_Guide/Functions#escape_and_unescape_Functions
                            // But it looks decodeURIComponent(encodeURIComponent(s)) doesn't
                            // preserve all Unicode characters either e.g. "\uffff" in Firefox.
                            // Note by wtritch: Hopefully this will not be necessary using ExternalInterface.  Will require
                            // additional testing.
                            var result = WebSocket.__flash.send(this.__id, encodeURIComponent(data));
                            if (result < 0) { // success
                                return true;
                            } else {
                                this.bufferedAmount += result;
                                return false;
                            }
                        };

                        /**
                        * Close this web socket gracefully.
                        */
                        WebSocket.prototype.close = function() {
                            if (this.readyState == WebSocket.CLOSED || this.readyState == WebSocket.CLOSING) {
                                return;
                            }
                            this.readyState = WebSocket.CLOSING;
                            WebSocket.__flash.close(this.__id);
                        };

                        /**
                        * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
                        *
                        * @param {string} type
                        * @param {function} listener
                        * @param {boolean} useCapture
                        * @return void
                        */
                        WebSocket.prototype.addEventListener = function(type, listener, useCapture) {
                            if (!(type in this.__events)) {
                                this.__events[type] = [];
                            }
                            this.__events[type].push(listener);
                        };

                        /**
                        * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
                        *
                        * @param {string} type
                        * @param {function} listener
                        * @param {boolean} useCapture
                        * @return void
                        */
                        WebSocket.prototype.removeEventListener = function(type, listener, useCapture) {
                            if (!(type in this.__events)) return;
                            var events = this.__events[type];
                            for (var i = events.length - 1; i >= 0; --i) {
                                if (events[i] === listener) {
                                    events.splice(i, 1);
                                    break;
                                }
                            }
                        };

                        /**
                        * Implementation of {@link <a href="http://www.w3.org/TR/DOM-Level-2-Events/events.html#Events-registration">DOM 2 EventTarget Interface</a>}
                        *
                        * @param {Event} event
                        * @return void
                        */
                        WebSocket.prototype.dispatchEvent = function(event) {
                            var events = this.__events[event.type] || [];
                            for (var i = 0; i < events.length; ++i) {
                                events[i](event);
                            }
                            var handler = this["on" + event.type];
                            if (handler) handler(event);
                        };

                        /**
                        * Handles an event from Flash.
                        * @param {Object} flashEvent
                        */
                        WebSocket.prototype.__handleEvent = function(flashEvent) {
                            if ("readyState" in flashEvent) {
                                this.readyState = flashEvent.readyState;
                            }
                            if ("protocol" in flashEvent) {
                                this.protocol = flashEvent.protocol;
                            }

                            var jsEvent;
                            if (flashEvent.type == "open" || flashEvent.type == "error") {
                                jsEvent = this.__createSimpleEvent(flashEvent.type);
                            } else if (flashEvent.type == "close") {
                                // TODO implement jsEvent.wasClean
                                jsEvent = this.__createSimpleEvent("close");
                            } else if (flashEvent.type == "message") {
                                var data = decodeURIComponent(flashEvent.message);
                                jsEvent = this.__createMessageEvent("message", data);
                            } else {
                                throw "unknown event type: " + flashEvent.type;
                            }

                            this.dispatchEvent(jsEvent);
                        };

                        WebSocket.prototype.__createSimpleEvent = function(type) {
                            if (document.createEvent && window.Event) {
                                var event = document.createEvent("Event");
                                event.initEvent(type, false, false);
                                return event;
                            } else {
                                return {type: type, bubbles: false, cancelable: false};
                            }
                        };

                        WebSocket.prototype.__createMessageEvent = function(type, data) {
                            if (document.createEvent && window.MessageEvent && !window.opera) {
                                var event = document.createEvent("MessageEvent");
                                event.initMessageEvent("message", false, false, data, null, null, window, null);
                                return event;
                            } else {
                                // IE and Opera, the latter one truncates the data parameter after any 0x00 bytes.
                                return {type: type, data: data, bubbles: false, cancelable: false};
                            }
                        };

                        /**
                        * Define the WebSocket readyState enumeration.
                        */
                        WebSocket.CONNECTING = 0;
                        WebSocket.OPEN = 1;
                        WebSocket.CLOSING = 2;
                        WebSocket.CLOSED = 3;

                        WebSocket.__flash = null;
                        WebSocket.__instances = {};
                        WebSocket.__tasks = [];
                        WebSocket.__nextId = 0;

                        /**
                        * Load a new flash security policy file.
                        * @param {string} url
                        */
                        WebSocket.loadFlashPolicyFile = function(url){
                            WebSocket.__addTask(function() {
                                WebSocket.__flash.loadManualPolicyFile(url);
                            });
                        };

                        /**
                        * Loads WebSocketMain.swf and creates WebSocketMain object in Flash.
                        */
                        WebSocket.__initialize = function() {
                            if (WebSocket.__flash) return;

                            if (WebSocket.__swfLocation) {
                                // For backword compatibility.
                                window.WEB_SOCKET_SWF_LOCATION = WebSocket.__swfLocation;
                            }
                            if (!window.WEB_SOCKET_SWF_LOCATION) {
                                console.error("[WebSocket] set WEB_SOCKET_SWF_LOCATION to location of WebSocketMain.swf");
                                return;
                            }
                            var container = document.createElement("div");
                            container.id = "webSocketContainer";
                            // Hides Flash box. We cannot use display: none or visibility: hidden because it prevents
                            // Flash from loading at least in IE. So we move it out of the screen at (-100, -100).
                            // But this even doesn't work with Flash Lite (e.g. in Droid Incredible). So with Flash
                            // Lite, we put it at (0, 0). This shows 1x1 box visible at left-top corner but this is
                            // the best we can do as far as we know now.
                            container.style.position = "absolute";
                            if (WebSocket.__isFlashLite()) {
                                container.style.left = "0px";
                                container.style.top = "0px";
                            } else {
                                container.style.left = "-100px";
                                container.style.top = "-100px";
                            }
                            var holder = document.createElement("div");
                            holder.id = "webSocketFlash";
                            container.appendChild(holder);
                            document.body.appendChild(container);
                            // See this article for hasPriority:
                            // http://help.adobe.com/en_US/as3/mobile/WS4bebcd66a74275c36cfb8137124318eebc6-7ffd.html
                            swfobject.embedSWF(
                            WEB_SOCKET_SWF_LOCATION,
                            "webSocketFlash",
                            "1" /* width */,
                            "1" /* height */,
                            "10.0.0" /* SWF version */,
                            null,
                            null,
                            {hasPriority: true, swliveconnect : true, allowScriptAccess: "always"},
                            null,
                            function(e) {
                                if (!e.success) {
                                    console.error("[WebSocket] swfobject.embedSWF failed");
                                }
                            });
                        };

                        /**
                        * Called by Flash to notify JS that it's fully loaded and ready
                        * for communication.
                        */
                        WebSocket.__onFlashInitialized = function() {
                            // We need to set a timeout here to avoid round-trip calls
                            // to flash during the initialization process.
                            setTimeout(function() {
                                WebSocket.__flash = document.getElementById("webSocketFlash");
                                WebSocket.__flash.setCallerUrl(location.href);
                                WebSocket.__flash.setDebug(!!window.WEB_SOCKET_DEBUG);
                                for (var i = 0; i < WebSocket.__tasks.length; ++i) {
                                    WebSocket.__tasks[i]();
                                }
                                WebSocket.__tasks = [];
                            }, 0);
                        };

                        /**
                        * Called by Flash to notify WebSockets events are fired.
                        */
                        WebSocket.__onFlashEvent = function() {
                            setTimeout(function() {
                                try {
                                    // Gets events using receiveEvents() instead of getting it from event object
                                    // of Flash event. This is to make sure to keep message order.
                                    // It seems sometimes Flash events don't arrive in the same order as they are sent.
                                    var events = WebSocket.__flash.receiveEvents();
                                    for (var i = 0; i < events.length; ++i) {
                                        WebSocket.__instances[events[i].webSocketId].__handleEvent(events[i]);
                                    }
                                } catch (e) {
                                    console.error(e);
                                }
                            }, 0);
                            return true;
                        };

                        // Called by Flash.
                        WebSocket.__log = function(message) {
                            console.log(decodeURIComponent(message));
                        };

                        // Called by Flash.
                        WebSocket.__error = function(message) {
                            console.error(decodeURIComponent(message));
                        };

                        WebSocket.__addTask = function(task) {
                            if (WebSocket.__flash) {
                                task();
                            } else {
                                WebSocket.__tasks.push(task);
                            }
                        };

                        /**
                        * Test if the browser is running flash lite.
                        * @return {boolean} True if flash lite is running, false otherwise.
                        */
                        WebSocket.__isFlashLite = function() {
                            if (!window.navigator || !window.navigator.mimeTypes) {
                                return false;
                            }
                            var mimeType = window.navigator.mimeTypes["application/x-shockwave-flash"];
                            if (!mimeType || !mimeType.enabledPlugin || !mimeType.enabledPlugin.filename) {
                                return false;
                            }
                            return mimeType.enabledPlugin.filename.match(/flashlite/i) ? true : false;
                        };

                        if (!window.WEB_SOCKET_DISABLE_AUTO_INITIALIZATION) {
                            if (window.addEventListener) {
                                window.addEventListener("load", function(){
                                    WebSocket.__initialize();
                                }, false);
                            } else {
                                window.attachEvent("onload", function(){
                                    WebSocket.__initialize();
                                });
                            }
                        }

                    })();

                    /**
                    * socket.io
                    * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
                    * MIT Licensed
                    */

                    (function (exports, io, global) {

                        /**
                        * Expose constructor.
                        *
                        * @api public
                        */

                        exports.XHR = XHR;

                        /**
                        * XHR constructor
                        *
                        * @costructor
                        * @api public
                        */

                        function XHR (socket) {
                            if (!socket) return;

                            io.Transport.apply(this, arguments);
                            this.sendBuffer = [];
                        };

                        /**
                        * Inherits from Transport.
                        */

                        io.util.inherit(XHR, io.Transport);

                        /**
                        * Establish a connection
                        *
                        * @returns {Transport}
                        * @api public
                        */

                        XHR.prototype.open = function () {
                            this.socket.setBuffer(false);
                            this.onOpen();
                            this.get();

                            // we need to make sure the request succeeds since we have no indication
                            // whether the request opened or not until it succeeded.
                            this.setCloseTimeout();

                            return this;
                        };

                        /**
                        * Check if we need to send data to the Socket.IO server, if we have data in our
                        * buffer we encode it and forward it to the `post` method.
                        *
                        * @api private
                        */

                        XHR.prototype.payload = function (payload) {
                            var msgs = [];

                            for (var i = 0, l = payload.length; i < l; i++) {
                                msgs.push(io.parser.encodePacket(payload[i]));
                            }

                            this.send(io.parser.encodePayload(msgs));
                        };

                        /**
                        * Send data to the Socket.IO server.
                        *
                        * @param data The message
                        * @returns {Transport}
                        * @api public
                        */

                        XHR.prototype.send = function (data) {
                            this.post(data);
                            return this;
                        };

                        /**
                        * Posts a encoded message to the Socket.IO server.
                        *
                        * @param {String} data A encoded message.
                        * @api private
                        */

                        function empty () { };

                        XHR.prototype.post = function (data) {
                            var self = this;
                            this.socket.setBuffer(true);

                            function stateChange () {
                                if (this.readyState == 4) {
                                    this.onreadystatechange = empty;
                                    self.posting = false;

                                    if (this.status == 200){
                                        self.socket.setBuffer(false);
                                    } else {
                                        self.onClose();
                                    }
                                }
                            }

                            function onload () {
                                this.onload = empty;
                                self.socket.setBuffer(false);
                            };

                            this.sendXHR = this.request('POST');

                            if (global.XDomainRequest && this.sendXHR instanceof XDomainRequest) {
                                this.sendXHR.onload = this.sendXHR.onerror = onload;
                            } else {
                                this.sendXHR.onreadystatechange = stateChange;
                            }

                            this.sendXHR.send(data);
                        };

                        /**
                        * Disconnects the established `XHR` connection.
                        *
                        * @returns {Transport} 
                        * @api public
                        */

                        XHR.prototype.close = function () {
                            this.onClose();
                            return this;
                        };

                        /**
                        * Generates a configured XHR request
                        *
                        * @param {String} url The url that needs to be requested.
                        * @param {String} method The method the request should use.
                        * @returns {XMLHttpRequest}
                        * @api private
                        */

                        XHR.prototype.request = function (method) {
                            var req = io.util.request(this.socket.isXDomain())
                            , query = io.util.query(this.socket.options.query, 't=' + +new Date);

                            req.open(method || 'GET', this.prepareUrl() + query, true);

                            if (method == 'POST') {
                                try {
                                    if (req.setRequestHeader) {
                                        req.setRequestHeader('Content-type', 'text/plain;charset=UTF-8');
                                    } else {
                                        // XDomainRequest
                                        req.contentType = 'text/plain';
                                    }
                                } catch (e) {}
                                }

                                return req;
                            };

                            /**
                            * Returns the scheme to use for the transport URLs.
                            *
                            * @api private
                            */

                            XHR.prototype.scheme = function () {
                                return this.socket.options.secure ? 'https' : 'http';
                            };

                            /**
                            * Check if the XHR transports are supported
                            *
                            * @param {Boolean} xdomain Check if we support cross domain requests.
                            * @returns {Boolean}
                            * @api public
                            */

                            XHR.check = function (socket, xdomain) {
                                try {
                                    if (io.util.request(xdomain)) {
                                        return true;
                                    }
                                } catch(e) {}

                                    return false;
                                };

                                /**
                                * Check if the XHR transport supports corss domain requests.
                                * 
                                * @returns {Boolean}
                                * @api public
                                */

                                XHR.xdomainCheck = function () {
                                    return XHR.check(null, true);
                                };

                            })(
                            'undefined' != typeof io ? io.Transport : module.exports
                            , 'undefined' != typeof io ? io : module.parent.exports
                            , this
                            );

                            /**
                            * socket.io
                            * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
                            * MIT Licensed
                            */

                            (function (exports, io) {

                                /**
                                * Expose constructor.
                                */

                                exports.htmlfile = HTMLFile;

                                /**
                                * The HTMLFile transport creates a `forever iframe` based transport
                                * for Internet Explorer. Regular forever iframe implementations will 
                                * continuously trigger the browsers buzy indicators. If the forever iframe
                                * is created inside a `htmlfile` these indicators will not be trigged.
                                *
                                * @constructor
                                * @extends {io.Transport.XHR}
                                * @api public
                                */

                                function HTMLFile (socket) {
                                    io.Transport.XHR.apply(this, arguments);
                                };

                                /**
                                * Inherits from XHR transport.
                                */

                                io.util.inherit(HTMLFile, io.Transport.XHR);

                                /**
                                * Transport name
                                *
                                * @api public
                                */

                                HTMLFile.prototype.name = 'htmlfile';

                                /**
                                * Creates a new ActiveX `htmlfile` with a forever loading iframe
                                * that can be used to listen to messages. Inside the generated
                                * `htmlfile` a reference will be made to the HTMLFile transport.
                                *
                                * @api private
                                */

                                HTMLFile.prototype.get = function () {
                                    this.doc = new ActiveXObject('htmlfile');
                                    this.doc.open();
                                    this.doc.write('<html></html>');
                                    this.doc.close();
                                    this.doc.parentWindow.s = this;

                                    var iframeC = this.doc.createElement('div');
                                    iframeC.className = 'socketio';

                                    this.doc.body.appendChild(iframeC);
                                    this.iframe = this.doc.createElement('iframe');

                                    iframeC.appendChild(this.iframe);

                                    var self = this
                                    , query = io.util.query(this.socket.options.query, 't='+ +new Date);

                                    this.iframe.src = this.prepareUrl() + query;

                                    io.util.on(window, 'unload', function () {
                                        self.destroy();
                                    });
                                };

                                /**
                                * The Socket.IO server will write script tags inside the forever
                                * iframe, this function will be used as callback for the incoming
                                * information.
                                *
                                * @param {String} data The message
                                * @param {document} doc Reference to the context
                                * @api private
                                */

                                HTMLFile.prototype._ = function (data, doc) {
                                    this.onData(data);
                                    try {
                                        var script = doc.getElementsByTagName('script')[0];
                                        script.parentNode.removeChild(script);
                                    } catch (e) { }
                                    };

                                    /**
                                    * Destroy the established connection, iframe and `htmlfile`.
                                    * And calls the `CollectGarbage` function of Internet Explorer
                                    * to release the memory.
                                    *
                                    * @api private
                                    */

                                    HTMLFile.prototype.destroy = function () {
                                        if (this.iframe){
                                            try {
                                                this.iframe.src = 'about:blank';
                                            } catch(e){}

                                                this.doc = null;
                                                this.iframe.parentNode.removeChild(this.iframe);
                                                this.iframe = null;

                                                CollectGarbage();
                                            }
                                        };

                                        /**
                                        * Disconnects the established connection.
                                        *
                                        * @returns {Transport} Chaining.
                                        * @api public
                                        */

                                        HTMLFile.prototype.close = function () {
                                            this.destroy();
                                            return io.Transport.XHR.prototype.close.call(this);
                                        };

                                        /**
                                        * Checks if the browser supports this transport. The browser
                                        * must have an `ActiveXObject` implementation.
                                        *
                                        * @return {Boolean}
                                        * @api public
                                        */

                                        HTMLFile.check = function () {
                                            if ('ActiveXObject' in window){
                                                try {
                                                    var a = new ActiveXObject('htmlfile');
                                                    return a && io.Transport.XHR.check();
                                                } catch(e){}
                                                }
                                                return false;
                                            };

                                            /**
                                            * Check if cross domain requests are supported.
                                            *
                                            * @returns {Boolean}
                                            * @api public
                                            */

                                            HTMLFile.xdomainCheck = function () {
                                                // we can probably do handling for sub-domains, we should
                                                // test that it's cross domain but a subdomain here
                                                return false;
                                            };

                                            /**
                                            * Add the transport to your public io.transports array.
                                            *
                                            * @api private
                                            */

                                            io.transports.push('htmlfile');

                                        })(
                                        'undefined' != typeof io ? io.Transport : module.exports
                                        , 'undefined' != typeof io ? io : module.parent.exports
                                        );

                                        /**
                                        * socket.io
                                        * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
                                        * MIT Licensed
                                        */

                                        (function (exports, io, global) {

                                            /**
                                            * Expose constructor.
                                            */

                                            exports['xhr-polling'] = XHRPolling;

                                            /**
                                            * The XHR-polling transport uses long polling XHR requests to create a
                                            * "persistent" connection with the server.
                                            *
                                            * @constructor
                                            * @api public
                                            */

                                            function XHRPolling () {
                                                io.Transport.XHR.apply(this, arguments);
                                            };

                                            /**
                                            * Inherits from XHR transport.
                                            */

                                            io.util.inherit(XHRPolling, io.Transport.XHR);

                                            /**
                                            * Merge the properties from XHR transport
                                            */

                                            io.util.merge(XHRPolling, io.Transport.XHR);

                                            /**
                                            * Transport name
                                            *
                                            * @api public
                                            */

                                            XHRPolling.prototype.name = 'xhr-polling';

                                            /** 
                                            * Establish a connection, for iPhone and Android this will be done once the page
                                            * is loaded.
                                            *
                                            * @returns {Transport} Chaining.
                                            * @api public
                                            */

                                            XHRPolling.prototype.open = function () {
                                                var self = this;

                                                io.Transport.XHR.prototype.open.call(self);
                                                return false;
                                            };

                                            /**
                                            * Starts a XHR request to wait for incoming messages.
                                            *
                                            * @api private
                                            */

                                            function empty () {};

                                            XHRPolling.prototype.get = function () {
                                                if (!this.open) return;

                                                var self = this;

                                                function stateChange () {
                                                    if (this.readyState == 4) {
                                                        this.onreadystatechange = empty;

                                                        if (this.status == 200) {
                                                            self.onData(this.responseText);
                                                            self.get();
                                                        } else {
                                                            self.onClose();
                                                        }
                                                    }
                                                };

                                                function onload () {
                                                    this.onload = empty;
                                                    self.onData(this.responseText);
                                                    self.get();
                                                };

                                                this.xhr = this.request();

                                                if (global.XDomainRequest && this.xhr instanceof XDomainRequest) {
                                                    this.xhr.onload = this.xhr.onerror = onload;
                                                } else {
                                                    this.xhr.onreadystatechange = stateChange;
                                                }

                                                this.xhr.send(null);
                                            };

                                            /**
                                            * Handle the unclean close behavior.
                                            *
                                            * @api private
                                            */

                                            XHRPolling.prototype.onClose = function () {
                                                io.Transport.XHR.prototype.onClose.call(this);

                                                if (this.xhr) {
                                                    this.xhr.onreadystatechange = this.xhr.onload = empty;
                                                    try {
                                                        this.xhr.abort();
                                                    } catch(e){}
                                                        this.xhr = null;
                                                    }
                                                };

                                                /**
                                                * Webkit based browsers show a infinit spinner when you start a XHR request
                                                * before the browsers onload event is called so we need to defer opening of
                                                * the transport until the onload event is called. Wrapping the cb in our
                                                * defer method solve this.
                                                *
                                                * @param {Socket} socket The socket instance that needs a transport
                                                * @param {Function} fn The callback
                                                * @api private
                                                */

                                                XHRPolling.prototype.ready = function (socket, fn) {
                                                    var self = this;

                                                    io.util.defer(function () {
                                                        fn.call(self);
                                                    });
                                                };

                                                /**
                                                * Add the transport to your public io.transports array.
                                                *
                                                * @api private
                                                */

                                                io.transports.push('xhr-polling');

                                            })(
                                            'undefined' != typeof io ? io.Transport : module.exports
                                            , 'undefined' != typeof io ? io : module.parent.exports
                                            , this
                                            );

                                            /**
                                            * socket.io
                                            * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
                                            * MIT Licensed
                                            */

                                            (function (exports, io, global) {
                                                /**
                                                * There is a way to hide the loading indicator in Firefox. If you create and
                                                * remove a iframe it will stop showing the current loading indicator.
                                                * Unfortunately we can't feature detect that and UA sniffing is evil.
                                                *
                                                * @api private
                                                */

                                                var indicator = global.document && "MozAppearance" in
                                                global.document.documentElement.style;

                                                /**
                                                * Expose constructor.
                                                */

                                                exports['jsonp-polling'] = JSONPPolling;

                                                /**
                                                * The JSONP transport creates an persistent connection by dynamically
                                                * inserting a script tag in the page. This script tag will receive the
                                                * information of the Socket.IO server. When new information is received
                                                * it creates a new script tag for the new data stream.
                                                *
                                                * @constructor
                                                * @extends {io.Transport.xhr-polling}
                                                * @api public
                                                */

                                                function JSONPPolling (socket) {
                                                    io.Transport['xhr-polling'].apply(this, arguments);

                                                    this.index = io.j.length;

                                                    var self = this;

                                                    io.j.push(function (msg) {
                                                        self._(msg);
                                                    });
                                                };

                                                /**
                                                * Inherits from XHR polling transport.
                                                */

                                                io.util.inherit(JSONPPolling, io.Transport['xhr-polling']);

                                                /**
                                                * Transport name
                                                *
                                                * @api public
                                                */

                                                JSONPPolling.prototype.name = 'jsonp-polling';

                                                /**
                                                * Posts a encoded message to the Socket.IO server using an iframe.
                                                * The iframe is used because script tags can create POST based requests.
                                                * The iframe is positioned outside of the view so the user does not
                                                * notice it's existence.
                                                *
                                                * @param {String} data A encoded message.
                                                * @api private
                                                */

                                                JSONPPolling.prototype.post = function (data) {
                                                    var self = this
                                                    , query = io.util.query(
                                                    this.socket.options.query
                                                    , 't='+ (+new Date) + '&i=' + this.index
                                                    );

                                                    if (!this.form) {
                                                        var form = document.createElement('form')
                                                        , area = document.createElement('textarea')
                                                        , id = this.iframeId = 'socketio_iframe_' + this.index
                                                        , iframe;

                                                        form.className = 'socketio';
                                                        form.style.position = 'absolute';
                                                        form.style.top = '-1000px';
                                                        form.style.left = '-1000px';
                                                        form.target = id;
                                                        form.method = 'POST';
                                                        form.setAttribute('accept-charset', 'utf-8');
                                                        area.name = 'd';
                                                        form.appendChild(area);
                                                        document.body.appendChild(form);

                                                        this.form = form;
                                                        this.area = area;
                                                    }

                                                    this.form.action = this.prepareUrl() + query;

                                                    function complete () {
                                                        initIframe();
                                                        self.socket.setBuffer(false);
                                                    };

                                                    function initIframe () {
                                                        if (self.iframe) {
                                                            self.form.removeChild(self.iframe);
                                                        }

                                                        try {
                                                            // ie6 dynamic iframes with target="" support (thanks Chris Lambacher)
                                                            iframe = document.createElement('<iframe name="'+ self.iframeId +'">');
                                                        } catch (e) {
                                                            iframe = document.createElement('iframe');
                                                            iframe.name = self.iframeId;
                                                        }

                                                        iframe.id = self.iframeId;

                                                        self.form.appendChild(iframe);
                                                        self.iframe = iframe;
                                                    };

                                                    initIframe();

                                                    // we temporarily stringify until we figure out how to prevent
                                                    // browsers from turning `\n` into `\r\n` in form inputs
                                                    this.area.value = io.JSON.stringify(data);

                                                    try {
                                                        this.form.submit();
                                                    } catch(e) {}

                                                        if (this.iframe.attachEvent) {
                                                            iframe.onreadystatechange = function () {
                                                                if (self.iframe.readyState == 'complete') {
                                                                    complete();
                                                                }
                                                            };
                                                        } else {
                                                            this.iframe.onload = complete;
                                                        }

                                                        this.socket.setBuffer(true);
                                                    };

                                                    /**
                                                    * Creates a new JSONP poll that can be used to listen
                                                    * for messages from the Socket.IO server.
                                                    *
                                                    * @api private
                                                    */

                                                    JSONPPolling.prototype.get = function () {
                                                        var self = this
                                                        , script = document.createElement('script')
                                                        , query = io.util.query(
                                                        this.socket.options.query
                                                        , 't='+ (+new Date) + '&i=' + this.index
                                                        );

                                                        if (this.script) {
                                                            this.script.parentNode.removeChild(this.script);
                                                            this.script = null;
                                                        }

                                                        script.async = true;
                                                        script.src = this.prepareUrl() + query;
                                                        script.onerror = function () {
                                                            self.onClose();
                                                        };

                                                        var insertAt = document.getElementsByTagName('script')[0]
                                                        insertAt.parentNode.insertBefore(script, insertAt);
                                                        this.script = script;

                                                        if (indicator) {
                                                            setTimeout(function () {
                                                                var iframe = document.createElement('iframe');
                                                                document.body.appendChild(iframe);
                                                                document.body.removeChild(iframe);
                                                            }, 100);
                                                        }
                                                    };

                                                    /**
                                                    * Callback function for the incoming message stream from the Socket.IO server.
                                                    *
                                                    * @param {String} data The message
                                                    * @api private
                                                    */

                                                    JSONPPolling.prototype._ = function (msg) {
                                                        this.onData(msg);
                                                        if (this.open) {
                                                            this.get();
                                                        }
                                                        return this;
                                                    };

                                                    /**
                                                    * The indicator hack only works after onload
                                                    *
                                                    * @param {Socket} socket The socket instance that needs a transport
                                                    * @param {Function} fn The callback
                                                    * @api private
                                                    */

                                                    JSONPPolling.prototype.ready = function (socket, fn) {
                                                        var self = this;
                                                        if (!indicator) return fn.call(this);

                                                        io.util.load(function () {
                                                            fn.call(self);
                                                        });
                                                    };

                                                    /**
                                                    * Checks if browser supports this transport.
                                                    *
                                                    * @return {Boolean}
                                                    * @api public
                                                    */

                                                    JSONPPolling.check = function () {
                                                        return 'document' in global;
                                                    };

                                                    /**
                                                    * Check if cross domain requests are supported
                                                    *
                                                    * @returns {Boolean}
                                                    * @api public
                                                    */

                                                    JSONPPolling.xdomainCheck = function () {
                                                        return true;
                                                    };

                                                    /**
                                                    * Add the transport to your public io.transports array.
                                                    *
                                                    * @api private
                                                    */

                                                    io.transports.push('jsonp-polling');

                                                })(
                                                'undefined' != typeof io ? io.Transport : module.exports
                                                , 'undefined' != typeof io ? io : module.parent.exports
                                                , this
                                                );
                                                Ext.define('Ext.cf.Overrides', {
                                                    requires: [
                                                    'Ext.data.Store'
                                                    ]
                                                }, function(){
                                                    var patch_st2= function(){
                                                        Ext.data.Store.prototype.storeSync= Ext.data.Store.prototype.sync;

                                                        Ext.data.Store.override({
                                                            /**
                                                            * Synchronizes the Store with its Proxy. This asks the Proxy to batch together any new, updated
                                                            * and deleted records in the store, updating the Store's internal representation of the records
                                                            * as each operation completes.
                                                            */
                                                            sync: function(callback,scope) {
                                                                if (typeof(this.getProxy().sync) === "undefined") {
                                                                    return this.storeSync();
                                                                }else{
                                                                    return this.getProxy().sync(this,callback,scope);
                                                                }
                                                            }
                                                        });

                                                        Ext.io_define= function(klass,config){
                                                            return Ext.define(klass,config);
                                                        };

                                                    };

                                                    var patch_ext41_b2= function(){

                                                        Ext.io_Observable= 'Ext.util.Observable';

                                                        Ext.data.Store.prototype.storeSync= Ext.data.AbstractStore.prototype.sync;

                                                        Ext.data.Store.override({
                                                            /**
                                                            * Synchronizes the Store with its Proxy. This asks the Proxy to batch together any new, updated
                                                            * and deleted records in the store, updating the Store's internal representation of the records
                                                            * as each operation completes.
                                                            */
                                                            sync: function(callback,scope) {
                                                                if (typeof(this.getProxy().sync) === "undefined") {
                                                                    return this.storeSync();
                                                                }else{
                                                                    return this.getProxy().sync(this,callback,scope);
                                                                }
                                                            }
                                                        });
                                                        Ext.io_define= function(klass,config){
                                                            if(config.extend==="Ext.data.Model" && config.config.identifier==='uuid'){
                                                                delete config.config.identifier; // remove identifier: 'uuid'
                                                                delete config.requires; // remove requires: ['Ext.data.identifier.Uuid']
                                                            }
                                                            Ext.apply(config,config.config);
                                                            delete config.config;
                                                            return Ext.define(klass,config);
                                                        };

                                                        Ext.data.Model.getFields= function(){return this.prototype.fields}
                                                        Ext.data.Field.override({
                                                            getName: function(){return this.name},
                                                            getEncode: function(){return this.encode},
                                                            getDecode: function(){return this.decode},
                                                            getType: function(){return this.type}
                                                        });
                                                        Ext.data.Operation.override({
                                                            setResultSet: function(x){this.resultSet=x}
                                                        });
                                                        Ext.data.ResultSet.override({
                                                            getRecords: function(x){return this.records}
                                                        });

                                                    };

                                                    var m= "ERROR: The Sencha.io SDK requires either the Sencha Touch SDK or the Sencha Ext JS SDK.";
                                                    if(typeof Ext==='undefined'){
                                                        console.log(m);
                                                        throw m;
                                                    }else{
                                                        var coreVersion= Ext.getVersion('core'), t;
                                                        if(!coreVersion){
                                                            t= m+" Ext is defined, but getVersion('core') did not return the expected version information.";
                                                            console.log(t);
                                                            throw t;
                                                        }else{
                                                            var version= coreVersion.version;
                                                            var touchVersion= Ext.getVersion('touch');
                                                            var extjsVersion= Ext.getVersion('extjs');
                                                            if(touchVersion && extjsVersion){
                                                                t= "WARNING: Both the Sencha Touch SDK and the Sencha Ext JS SDK have been loaded. This could lead to unpredicatable behaviour.";
                                                                console.log(t);
                                                            }
                                                            if(!touchVersion && !extjsVersion){
                                                                t= m+" The Ext Core SDK is on its own is not sufficient.";
                                                                console.log(t);
                                                                throw t;
                                                            }
                                                            if(extjsVersion){
                                                                version= extjsVersion.version;
                                                                if(version === "4.1.0") {
                                                                    console.log("WARNING: Disabling Sencha.io data stores, since we seem to be running the ExtJS SDK, version", extjsVersion.version);
                                                                    patch_ext41_b2();
                                                                } else {
                                                                    t= m+" Version "+version+" of the Sencha Ext SDK and this version of the Sencha.io SDK are not fully compatible.";
                                                                    console.log(t);
                                                                    throw t;
                                                                }
                                                            }else if(touchVersion){
                                                                if(touchVersion.major >=2){
                                                                    patch_st2();
                                                                } else {
                                                                    var t= m+" Version "+version+" of the Sencha Touch SDK and this version of the Sencha.io SDK are not fully compatible.";
                                                                    console.log(t);
                                                                }
                                                            }else{
                                                                t= m+" They were here, but now I can't find them.";
                                                                console.log(t);
                                                                throw t;
                                                            }
                                                        }
                                                    }
                                                });
                                                /**
                                                * @private
                                                *
                                                */
                                                Ext.define('Ext.io.Errors', {
                                                    statics: {
                                                        'NETWORK_ERROR': {
                                                            code: 'NETWORK_ERROR',
                                                            message: 'The request could not be made due to the network being down',
                                                            suggest: 'Check network connectivity from your device'
                                                        },

                                                        'UNKNOWN_ERROR': {
                                                            code: 'UNKNOWN_ERROR',
                                                            message: 'Unknown error',
                                                            kind: 'sio',
                                                            suggest: 'Contact sencha.io support with a description of what caused the error'
                                                        },

                                                        'UNKNOWN_RPC_ERROR': {
                                                            code: 'UNKNOWN_RPC_ERROR',
                                                            message: 'Unknown RPC error',
                                                            kind: 'sio',
                                                            suggest: 'Fix the RPC service to return a valid error object'
                                                        },

                                                        'PARAM_MISSING': {
                                                            code: 'PARAM_MISSING',
                                                            message: "Mandatory parameter ':name' is missing",
                                                            kind: 'developer',
                                                            suggest: 'Provide the required parameter during the method call' 
                                                        },

                                                        'PARAMS_LENGTH_MISMATCH': {
                                                            code: 'PARAMS_LENGTH_MISMATCH',
                                                            message: 'The method was passed :actual params instead of the expected :expected',
                                                            kind: 'developer',
                                                            suggest: 'Check the number of parameters you are passing to the method' 
                                                        },

                                                        'PARAM_TYPE_MISMATCH': {
                                                            code: 'PARAM_TYPE_MISMATCH',
                                                            message: "Parameter ':name' data type mismatch. Expected ':expected', actual ':actual'",
                                                            kind: 'developer',
                                                            suggest: 'Correct the data type of the parameter' 
                                                        },

                                                        'RPC_PARAM_FUNCTION_ERROR': {
                                                            code: 'RPC_PARAM_FUNCTION_ERROR',
                                                            message: "Parameter number :index (:name) is a function, but only the first parameter must be a function",
                                                            kind: 'developer',
                                                            suggest: 'Ensure that only the first parameter is a function' 
                                                        },

                                                        'RPC_TIMEOUT': {
                                                            code: 'RPC_TIMEOUT',
                                                            message: 'RPC request has timed out as there was no reply from the server',
                                                            kind: 'developer',
                                                            suggest: 'Check if this was caused by network connectivity issues. If not, the service might be down.' +
                                                            ' Also, see documentation for Ext.Io.setup (rpcTimeoutDuration, rpcTimeoutCheckInterval) to configure the timeout check' 
                                                        },

                                                        'AUTH_REQUIRED': {
                                                            code: 'AUTH_REQUIRED',
                                                            message: 'This request requires an authenticated :kind session',
                                                            kind: 'developer',
                                                            suggest: 'Retry the request with a valid session'
                                                        },

                                                        'CHANNEL_NAME_MISSING': {
                                                            code: 'CHANNEL_NAME_MISSING',
                                                            message: 'Channel name is missing',
                                                            kind: 'developer',
                                                            suggest: 'Provide the channel name'
                                                        },

                                                        'CHANNEL_APP_ID_MISSING': {
                                                            code: 'CHANNEL_APP_ID_MISSING',
                                                            message: 'Channel appId is missing',
                                                            kind: 'sio',
                                                            suggest: 'Potential bug in the SIO SDK, attempting to get a channel without an appId'
                                                        },

                                                        'SERVICE_NAME_MISSING': {
                                                            code: 'SERVICE_NAME_MISSING',
                                                            message: 'Service name is missing',
                                                            kind: 'developer',
                                                            suggest: 'Provide the service name'
                                                        },

                                                        'SERVICE_DESCRIPTOR_LOAD_ERROR': {
                                                            code: 'SERVICE_DESCRIPTOR_LOAD_ERROR',
                                                            message: 'Error loading service descriptor from the server',
                                                            kind: 'developer',
                                                            suggest: 'Service name is most likely misspelt. If not, contact sencha.io support'
                                                        },

                                                        'MESSAGE_NOT_JSON': {
                                                            code: 'MESSAGE_NOT_JSON',
                                                            message: 'message is not a JSON object',
                                                            kind: 'developer',
                                                            suggest: 'Use a valid JSON object instead of basic data types'
                                                        }
                                                    }
                                                });

                                                /**
                                                *  The sender of a message. Used by Ext.io.User.message,  Ext.io.Device.message, Ext.io.Channel.message and Ext.io.Controller.usermessage events.
                                                */
                                                Ext.define('Ext.io.Sender', {
                                                    config: {
                                                        userId: null,
                                                        deviceId: null
                                                    },

                                                    constructor: function(config) {
                                                        this.initConfig(config);
                                                    },

                                                    /**
                                                    * Get the user object for the sender. A message does not have to have a user as the sender.
                                                    *  A message that only has a device is valid.  
                                                    *
                                                    * @param {Function} callback The function to be called after getting the User object.
                                                    * @param {Object} callback.user The {Ext.io.User} object if the call succeeded.
                                                    * @param {Object} callback.err an error object.
                                                    *
                                                    * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                                    * the callback function.
                                                    */
                                                    getUser: function(callback, scope){
                                                        if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments, "Ext.io.Sender", "getUser")) {
                                                            var userId = this.getUserId();
                                                            if(!userId){
                                                                callback.call(scope, null);
                                                            } else {
                                                                Ext.io.User.get({id: userId}, callback, scope);    
                                                            }   
                                                        }
                                                    },


                                                    /**
                                                    * Get the device object for the sender. A message must have a device to be valid. 
                                                    *
                                                    * @param {Function} callback The function to be called after getting the User object.
                                                    * @param {Object} callback.user The {Ext.io.User} object if the call succeeded.
                                                    * @param {Object} callback.err an error object.
                                                    *
                                                    * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                                    * the callback function.
                                                    */
                                                    getDevice: function(callback, scope){
                                                        if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments, "Ext.io.Sender", "getDevice")) {
                                                            var deviceId = this.getDeviceId();
                                                            if(!deviceId){
                                                                callback.call(scope, null);
                                                            } else {
                                                                Ext.io.Device.get({id: deviceId}, callback, scope);    
                                                            }
                                                        }        
                                                    },
                                                });
                                                Ext.define('Ext.cf.util.Md5', {

                                                    statics: {

                                                        hash: function (s,raw,hexcase,chrsz) {
                                                            raw = raw || false; 
                                                            hexcase = hexcase || false;
                                                            chrsz = chrsz || 8;

                                                            function safe_add(x, y){
                                                                var lsw = (x & 0xFFFF) + (y & 0xFFFF);
                                                                var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
                                                                return (msw << 16) | (lsw & 0xFFFF);
                                                            }
                                                            function bit_rol(num, cnt){
                                                                return (num << cnt) | (num >>> (32 - cnt));
                                                            }
                                                            function md5_cmn(q, a, b, x, s, t){
                                                                return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
                                                            }
                                                            function md5_ff(a, b, c, d, x, s, t){
                                                                return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
                                                            }
                                                            function md5_gg(a, b, c, d, x, s, t){
                                                                return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
                                                            }
                                                            function md5_hh(a, b, c, d, x, s, t){
                                                                return md5_cmn(b ^ c ^ d, a, b, x, s, t);
                                                            }
                                                            function md5_ii(a, b, c, d, x, s, t){
                                                                return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
                                                            }

                                                            function core_md5(x, len){
                                                                x[len >> 5] |= 0x80 << ((len) % 32);
                                                                x[(((len + 64) >>> 9) << 4) + 14] = len;
                                                                var a =  1732584193;
                                                                var b = -271733879;
                                                                var c = -1732584194;
                                                                var d =  271733878;
                                                                for(var i = 0; i < x.length; i += 16){
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
                                                                return [a, b, c, d];
                                                            }
                                                            function str2binl(str){
                                                                var bin = [];
                                                                var mask = (1 << chrsz) - 1;
                                                                for(var i = 0; i < str.length * chrsz; i += chrsz) {
                                                                    bin[i>>5] |= (str.charCodeAt(i / chrsz) & mask) << (i%32);
                                                                }
                                                                return bin;
                                                            }
                                                            function binl2str(bin){
                                                                var str = "";
                                                                var mask = (1 << chrsz) - 1;
                                                                for(var i = 0; i < bin.length * 32; i += chrsz) {
                                                                    str += String.fromCharCode((bin[i>>5] >>> (i % 32)) & mask);
                                                                }
                                                                return str;
                                                            }

                                                            function binl2hex(binarray){
                                                                var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
                                                                var str = "";
                                                                for(var i = 0; i < binarray.length * 4; i++) {
                                                                    str += hex_tab.charAt((binarray[i>>2] >> ((i%4)*8+4)) & 0xF) + hex_tab.charAt((binarray[i>>2] >> ((i%4)*8  )) & 0xF);
                                                                }
                                                                return str;
                                                            }
                                                            return (raw ? binl2str(core_md5(str2binl(s), s.length * chrsz)) : binl2hex(core_md5(str2binl(s), s.length * chrsz)) );  
                                                        }
                                                    }

                                                });

                                                /**
                                                * @private
                                                */
                                                Ext.define('Ext.cf.util.LoggerConstants', {
                                                    statics: {
                                                        NONE: 10,
                                                        ERROR: 5,
                                                        WARNING: 4,
                                                        INFO: 3,
                                                        DEBUG: 2,
                                                        PERF: 1,

                                                        STR_TO_LEVEL: {
                                                            "perf": 1,
                                                            "debug": 2,
                                                            "info": 3,
                                                            "warn": 4,
                                                            "error": 5,
                                                            "none": 10
                                                        }
                                                    }
                                                });

                                                Ext.define('Ext.cf.util.Logger', {
                                                    statics: {
                                                        level: Ext.cf.util.LoggerConstants.ERROR,

                                                        /**
                                                        * Set logger level
                                                        *
                                                        * @param {String} level as a string
                                                        *
                                                        */
                                                        setLevel: function(levelString) {
                                                            if(Ext.cf.util.LoggerConstants.STR_TO_LEVEL[levelString]) {
                                                                Ext.cf.util.Logger.level = Ext.cf.util.LoggerConstants.STR_TO_LEVEL[levelString];
                                                            } else {
                                                                Ext.cf.util.Logger.level = Ext.cf.util.LoggerConstants.NONE;
                                                            }
                                                        },

                                                        /**
                                                        * Perf
                                                        *
                                                        */
                                                        perf: function() {
                                                            if(Ext.cf.util.Logger.level <= Ext.cf.util.LoggerConstants.PERF) {
                                                                Ext.cf.util.Logger.message('PERF:',arguments);
                                                            }
                                                        },

                                                        /**
                                                        * Debug
                                                        *
                                                        */
                                                        debug: function() {
                                                            if(Ext.cf.util.Logger.level <= Ext.cf.util.LoggerConstants.DEBUG) {
                                                                Ext.cf.util.Logger.message('DEBUG:',arguments);
                                                            }
                                                        },

                                                        /**
                                                        * Info
                                                        *
                                                        */
                                                        info: function() {
                                                            if(Ext.cf.util.Logger.level <= Ext.cf.util.LoggerConstants.INFO) {
                                                                Ext.cf.util.Logger.message('INFO:',arguments);
                                                            }
                                                        },

                                                        /**
                                                        * Warn
                                                        *
                                                        */
                                                        warn: function() {
                                                            if(Ext.cf.util.Logger.level <= Ext.cf.util.LoggerConstants.WARNING) {
                                                                Ext.cf.util.Logger.message('WARNING:',arguments);
                                                            }
                                                        },

                                                        /**
                                                        * Error
                                                        *
                                                        */
                                                        error: function() {
                                                            if(Ext.cf.util.Logger.level <= Ext.cf.util.LoggerConstants.ERROR) {
                                                                Ext.cf.util.Logger.message('ERROR:',arguments);
                                                            }
                                                        },

                                                        /**
                                                        * Trace
                                                        *
                                                        */
                                                        trace: function(name,params) {
                                                            var t= [];
                                                            var l= params.length;
                                                            for(var i=0;i<l;i++){
                                                                var p= params[i];
                                                                if(p==global){
                                                                    t.push('global');
                                                                }else if (p==Ext.io.Io){
                                                                    t.push('Ext.io.Io');
                                                                }else if(typeof p==='function'){
                                                                    t.push('function');
                                                                }else{
                                                                    try{
                                                                        t.push(JSON.stringify(p));
                                                                    }catch(e){
                                                                        t.push('unknown')
                                                                    }
                                                                }
                                                            }
                                                            this.debug('TRACE',name,'(',t.join(', '),')')
                                                        },

                                                        /**
                                                        * Message
                                                        *
                                                        * @param {String/Number} level
                                                        * @param @param {Array} args
                                                        *
                                                        */
                                                        message: function(level,a){
                                                            var b= Array.prototype.slice.call(a);
                                                            b.unshift(level);

                                                            if (typeof console != "undefined") {
                                                                switch (typeof console.log) {
                                                                    case 'function':
                                                                    console.log.apply(console,b);
                                                                    break;
                                                                    case 'object':
                                                                    console.log(b.join(" "));
                                                                    break;
                                                                }
                                                            }
                                                        }

                                                    }
                                                });


                                                /**
                                                * @private
                                                */
                                                Ext.define('Ext.cf.util.ErrorHelper', {
                                                    requires: ['Ext.cf.util.Logger', 'Ext.io.Errors'],

                                                    statics: {
                                                        /**
                                                        * A valid error object MUST have at minimum a 'code' and 'message'
                                                        *
                                                        * @param {Object} error
                                                        *
                                                        */
                                                        isValidError: function(err) {
                                                            if(typeof(err) === "object" && 
                                                            err !== null &&  
                                                            typeof(err.code) === "string" &&
                                                            typeof(err.message) === "string") {

                                                                return true;
                                                            }

                                                            return false;
                                                        },

                                                        /**
                                                        * Get error
                                                        *
                                                        * @param {String} code
                                                        * @param {String} details
                                                        * @param {Array} params
                                                        *
                                                        */
                                                        get: function(code, details, params) {
                                                            var err = Ext.clone(Ext.io.Errors[code] ? Ext.io.Errors[code] : Ext.io.Errors['UNKNOWN_ERROR']);

                                                            if(details) {
                                                                err.details = details;
                                                            }

                                                            for(key in params) {
                                                                if(params.hasOwnProperty(key)) {
                                                                    err.message = err.message.replace(":" + key, params[key]);
                                                                }
                                                            }

                                                            return err;
                                                        },

                                                        /**
                                                        * Get error object for 'UNKNOWN_ERROR'
                                                        *
                                                        * @param {String} details
                                                        *
                                                        */
                                                        getUnknownError: function(details) {
                                                            var unknownError = this.get('UNKNOWN_ERROR');
                                                            unknownError.details = details;
                                                            return unknownError;
                                                        },

                                                        /**
                                                        * Decode error
                                                        *
                                                        * @param {Object} error
                                                        *
                                                        */
                                                        decode: function(err) {
                                                            if(err === null || err === "null" || err === "") {
                                                                return null;
                                                            }

                                                            // if already an error object, return as is
                                                            if(this.isValidError(err)) {
                                                                return err;
                                                            }

                                                            try {
                                                                err = Ext.decode(err);
                                                                if(this.isValidError(err)) {
                                                                    return err;
                                                                } else {
                                                                    Ext.cf.util.Logger.debug('Could not decode error:', err);
                                                                    return this.getUnknownError(err);
                                                                }
                                                            } catch(e) {
                                                                Ext.cf.util.Logger.debug('Could not decode error:', err);
                                                                return this.getUnknownError(err);
                                                            }
                                                        }
                                                    }
                                                });
                                                /**
                                                * @private
                                                */
                                                Ext.define('Ext.cf.util.ParamValidator', {
                                                    requires: ['Ext.cf.util.ErrorHelper', 'Ext.cf.util.Logger'],

                                                    statics: {        
                                                        /**
                                                        * Get type of param
                                                        *
                                                        * @param {Undefined/Null/Boolean/Number/String/Function/Array} param
                                                        *
                                                        * @return {String} type of param
                                                        *
                                                        */
                                                        getType: function(arg) {
                                                            var type = typeof(arg);

                                                            if(type !== "object") {
                                                                // undefined, boolean, number, string, function
                                                                return type;
                                                            } else {
                                                                if(arg === null) {
                                                                    return "null";
                                                                }

                                                                if(Object.prototype.toString.call(arg) === "[object Array]") {
                                                                    return "array";
                                                                }

                                                                return "object";
                                                            }
                                                        },

                                                        /**
                                                        * Validate param
                                                        *
                                                        * @param {Undefined/Null/Boolean/Number/String/Function/Array} param
                                                        * @param {Undefined/Null/Boolean/Number/String/Function/Array} actual param that is passed
                                                        * @param {Number} index of param
                                                        * @param {Boolean} isRpc
                                                        * @param {String} parent param name
                                                        *
                                                        */
                                                        validateParam: function(param, actualArg, index, isRpc, parentParamName) {
                                                            var actualType = this.getType(actualArg);

                                                            if(isRpc && (actualType === "function" && index !== 0)) {
                                                                return Ext.cf.util.ErrorHelper.get('RPC_PARAM_FUNCTION_ERROR', null, {
                                                                    name: param.name,
                                                                    index: index + 1
                                                                });
                                                            } else {
                                                                var types = param.type.split("|");
                                                                var matchFound = false;
                                                                for(var i = 0; i < types.length; i++) {
                                                                    if( (types[i] === actualType) || 
                                                                    (param.optional && actualType === "undefined")) {

                                                                        matchFound = true;
                                                                        break;
                                                                    }
                                                                }

                                                                if(!matchFound) {
                                                                    return Ext.cf.util.ErrorHelper.get('PARAM_TYPE_MISMATCH', null, {
                                                                        name: (parentParamName ? (parentParamName + ".") : "") + param.name,
                                                                        expected: param.type,
                                                                        actual: actualType
                                                                    });
                                                                }

                                                                if(actualType === "object" && param.hasOwnProperty('keys')) {
                                                                    // validate the keys now
                                                                    for(var k = 0; k < param.keys.length; k++) {
                                                                        var nestedParam = param.keys[k];
                                                                        var nestedArg = actualArg[nestedParam.name];
                                                                        var nestedArgType = this.getType(nestedArg);

                                                                        if(nestedArgType === "undefined" && !nestedParam.optional) {
                                                                            return Ext.cf.util.ErrorHelper.get('PARAM_MISSING', null, {
                                                                                name: (parentParamName ? (parentParamName + ".") : "") + param.name + "." + nestedParam.name
                                                                            });
                                                                        }

                                                                        var err = this.validateParam(nestedParam, nestedArg, k, false, (parentParamName ? (parentParamName + ".") : "") + param.name);
                                                                        if(err) {
                                                                            return err;
                                                                        }
                                                                    }
                                                                }
                                                            }

                                                            return null;
                                                        },

                                                        /**
                                                        * Get number of mandatory params
                                                        *
                                                        * @param {Array} params
                                                        *
                                                        */
                                                        getMandatoryParamsLength: function(params) {
                                                            var count = 0;

                                                            for(var i = 0; i < params.length; i++) {
                                                                if(!params[i].optional) {
                                                                    count++;
                                                                }
                                                            }

                                                            return count;
                                                        },

                                                        /**
                                                        * Validate params
                                                        *
                                                        * @param {Array} params
                                                        * @param {Array} actual params that are passed
                                                        * @param {Boolean} isRpc
                                                        *
                                                        */
                                                        validateParams: function(params, actualArgs, isRpc) {
                                                            if(params.length !== actualArgs.length) { // length mismatch
                                                                // check mandatory params length
                                                                var mandatoryParamsLength = this.getMandatoryParamsLength(params);
                                                                if(actualArgs.length <= params.length && actualArgs.length >= mandatoryParamsLength) {
                                                                    // ok, some optional params may not have been passed
                                                                } else {
                                                                    // actual args cannot be more than those declared
                                                                    // actual args cannot be less than the mandatory ones
                                                                    return Ext.cf.util.ErrorHelper.get('PARAMS_LENGTH_MISMATCH', null, {
                                                                        expected: params.length,
                                                                        actual: actualArgs.length
                                                                    });
                                                                }
                                                            }

                                                            var i, err;
                                                            for(i = 0; i < params.length; i++) {
                                                                err = this.validateParam(params[i], actualArgs[i], i, isRpc);
                                                                if(err) {
                                                                    return err;
                                                                }
                                                            }


                                                            return null;
                                                        },

                                                        /**
                                                        * Get Api signature
                                                        *
                                                        * @param {String} class name
                                                        * @param {String} method name
                                                        * @param {Array} params
                                                        *
                                                        */
                                                        getApiSignature: function(className, methodName, params) {
                                                            var signature = className + "#" + methodName + "(";

                                                            for(var i = 0; i < params.length; i++) {
                                                                signature += params[i].name;

                                                                if(i !== params.length - 1) {
                                                                    signature += ", ";
                                                                }
                                                            }

                                                            signature += ")";

                                                            return signature;
                                                        },

                                                        /**
                                                        * Validate Api
                                                        *
                                                        * @param {Array} params
                                                        * @param {Array} actual params that are passed
                                                        * @param {String} class name
                                                        * @param {String} method name
                                                        *
                                                        */
                                                        validateApi: function(params, actualArgs, className, methodName) {
                                                            var err = this.validateParams(params, actualArgs, false);
                                                            if(err) {
                                                                var msg = err.code + " " + err.message;
                                                                if(className && methodName) {
                                                                    msg += ". Expected signature " + this.getApiSignature(className, methodName, params);
                                                                    msg += ". Also see http://docs.sencha.io/" + Ext.getVersion('sio').toString() + "/index.html#!/api/" + 
                                                                    className + "-method-" + methodName;
                                                                }

                                                                Ext.cf.util.Logger.error(msg, err);
                                                                throw msg;
                                                            }

                                                            return true;
                                                        },

                                                        /**
                                                        * Validate Standard API method signature of (callback, scope)
                                                        *
                                                        * @param {Array} actual params that are passed
                                                        * @param {String} class name
                                                        * @param {String} method name
                                                        *
                                                        */
                                                        validateCallbackScope: function(actualArgs, className, methodName){
                                                            return Ext.cf.util.ParamValidator.validateApi([
                                                            { name: "callback", type: "function" }, 
                                                            { name: "scope", type: "null|object|function", optional: true }
                                                            ], actualArgs,  className, methodName);
                                                        },


                                                        /**
                                                        * Validate Standard API method signature of (options, callback, scope)
                                                        *
                                                        * @param {Array} option keys
                                                        * @param {Array} actual params that are passed
                                                        * @param {String} class name
                                                        * @param {String} method name
                                                        *
                                                        */
                                                        validateOptionsCallbackScope: function(optionKeys, actualArgs, className, methodName){

                                                            var options = { name: "options", type: "object"};
                                                            if(optionKeys) {
                                                                options.keys = optionKeys;
                                                            }

                                                            return Ext.cf.util.ParamValidator.validateApi([
                                                            options, 
                                                            { name: "callback", type: "function" }, 
                                                            { name: "scope", type: "null|object|function", optional: true }
                                                            ], actualArgs, className, methodName);
                                                        }
                                                    }
                                                });

                                                /*
                                                * @private
                                                */
                                                Ext.define('Ext.cf.util.UuidGenerator', {

                                                    statics: {
                                                        /**
                                                        * @private
                                                        *
                                                        * Generate
                                                        *
                                                        * @return {String} UUID
                                                        *
                                                        */
                                                        generate: function() { // totally random uuid
                                                            return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                                                                var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                                                                return v.toString(16);
                                                            });
                                                        }
                                                    }

                                                });
                                                /**
                                                * @private
                                                *
                                                * Real Clock
                                                */
                                                Ext.define('Ext.cf.ds.RealClock', {

                                                    /** 
                                                    * Constructor
                                                    *
                                                    */
                                                    constructor: function() {
                                                        this.epoch= new Date(2011,0,1);
                                                    },

                                                    /** 
                                                    * now
                                                    *
                                                    * @return {Number} seconds
                                                    */
                                                    now: function() {
                                                        return this.ms_to_s(new Date().getTime()-this.epoch);   
                                                    },

                                                    /**
                                                    * @private
                                                    *
                                                    * Milliseconds to seconds
                                                    *
                                                    * @param {Number} milliseconds
                                                    *
                                                    * @return {Number} seconds
                                                    */
                                                    ms_to_s: function(ms) {
                                                        return Math.floor(ms/1000);
                                                    }

                                                });
                                                /** 
                                                * @private
                                                *
                                                * Change Stamp
                                                *
                                                * It represents a point in 'time' for a single replica.
                                                * It's used like a timestamp, but has more components than time.
                                                */
                                                Ext.define('Ext.cf.ds.CS', {

                                                    r: 0, // replica_number
                                                    t: 0, // time, in seconds since the epoch, as defined by the CS Generator 
                                                    s: 0, // sequence number

                                                    /** 
                                                    * Constructor
                                                    *
                                                    * @param {Object} config
                                                    *
                                                    */
                                                    constructor: function(config) {
                                                        this.set(config);
                                                    },

                                                    /** 
                                                    * Set
                                                    *
                                                    * @param {String/Object} x
                                                    *
                                                    */
                                                    set: function(x) {
                                                        if (typeof x === 'string' || x instanceof String) {
                                                            this.from_s(x);
                                                        } else if (typeof x === 'object') {
                                                            this.r= x.r||0;
                                                            this.t= x.t||0;
                                                            this.s= x.s||0;
                                                        }
                                                    },

                                                    /** 
                                                    * Change replica number
                                                    *
                                                    * @param {Number} old_replica_number
                                                    * @param {Number} new_replica_number
                                                    *
                                                    */
                                                    changeReplicaNumber: function(old_replica_number,new_replica_number) {
                                                        if (this.r==old_replica_number) {
                                                            this.r= new_replica_number;
                                                            return true;
                                                        }
                                                        return false;
                                                    },

                                                    /** 
                                                    * Greater than
                                                    *
                                                    * @param {Object} x
                                                    *
                                                    */
                                                    greaterThan: function(x) {
                                                        return this.compare(x)>0;
                                                    },

                                                    /** 
                                                    * Less than
                                                    *
                                                    * @param {Object} x
                                                    *
                                                    */
                                                    lessThan: function(x) { 
                                                        return this.compare(x)<0; 
                                                    },

                                                    /** 
                                                    * Equals
                                                    *
                                                    * @param {Object} x
                                                    *
                                                    */
                                                    equals: function(x) { 
                                                        return this.compare(x)===0;
                                                    },

                                                    /** 
                                                    * Compare
                                                    *
                                                    * @param {Object} x
                                                    *
                                                    */
                                                    compare: function(x) {
                                                        var r= this.t-x.t;
                                                        if (r===0) {
                                                            r= this.s-x.s;
                                                            if (r===0) {
                                                                r= this.r-x.r;
                                                            }
                                                        }
                                                        return r;
                                                    },

                                                    cs_regex: /(\d+)-(\d+)-?(\d+)?/,

                                                    /** 
                                                    * From Stamp 
                                                    *
                                                    * @param {String/Number} t
                                                    *
                                                    */
                                                    from_s: function(t) {
                                                        var m= t.match(this.cs_regex);
                                                        if (m && m.length>0) {
                                                            this.r= parseInt(m[1], 10);
                                                            this.t= parseInt(m[2], 10);
                                                            this.s= m[3] ? parseInt(m[3], 10) : 0;
                                                        } else {
                                                            throw "Error - CS - Bad change stamp '"+t+"'.";
                                                        }
                                                        return this;
                                                    },

                                                    /** 
                                                    * To stamp
                                                    *
                                                    */
                                                    asString: function() {
                                                        return this.r+"-"+this.t+(this.s>0 ? "-"+this.s : "");      
                                                    }

                                                });

                                                /**
                                                * @private
                                                *
                                                * Logical Clock
                                                *
                                                * Generates Change Stamps.
                                                * It is Monotonic.
                                                * It never goes backwards.
                                                *
                                                */
                                                Ext.define('Ext.cf.ds.LogicalClock', {
                                                    requires: [
                                                    'Ext.cf.ds.RealClock',
                                                    'Ext.cf.ds.CS'
                                                    ],

                                                    r: undefined, // replica_number
                                                    t: undefined, // time, in seconds since epoch
                                                    s: undefined, // sequence number

                                                    clock: undefined, // a real clock, it provides the time
                                                    local_offset: undefined,
                                                    global_offset: undefined,

                                                    /** 
                                                    * Constructor
                                                    *
                                                    * @param {Object} config
                                                    *
                                                    */
                                                    constructor: function(config) {
                                                        this.set(config);
                                                    },

                                                    /** 
                                                    * Set
                                                    *
                                                    * @param {Object} data
                                                    *
                                                    */
                                                    set: function(data) {
                                                        if(data){
                                                            this.clock= data.clock || Ext.create('Ext.cf.ds.RealClock');
                                                            this.r= data.r;
                                                            this.t= data.t || this.clock.now();
                                                            this.s= data.s || -1; // so that the next tick gets us to 0
                                                            this.local_offset= data.local_offset || 0;
                                                            this.global_offset= data.global_offset || 0;
                                                        }
                                                    },

                                                    /** 
                                                    * Set clock
                                                    *
                                                    * @param {Object} clock
                                                    *
                                                    */
                                                    setClock: function(clock) {
                                                        this.clock= clock;
                                                        this.t= this.clock.now();
                                                        this.s= -1; // so that the next tick gets us to 0
                                                    },

                                                    /** 
                                                    * Generate change stamp
                                                    *
                                                    */
                                                    generateChangeStamp: function() { // the next change stamp
                                                        var current_time= this.clock.now();
                                                        this.update_local_offset(current_time);
                                                        this.s+= 1;
                                                        if (this.s>255) { // JCM This is totally arbitrary, and it's hard coded too....
                                                            this.t= current_time;
                                                            this.local_offset+= 1;
                                                            this.s= 0;
                                                        }
                                                        return new Ext.cf.ds.CS({r:this.r,t:this.global_time(),s:this.s});
                                                    },

                                                    /** 
                                                    * Seen CSV
                                                    *
                                                    * @param {Ext.cf.ds.CSV} csv
                                                    *
                                                    */
                                                    seenCSV: function(csv) { // a change stamp vector we just received
                                                        return this.seenChangeStamp(csv.maxChangeStamp());
                                                    },

                                                    /** 
                                                    * Seen change stamp
                                                    *
                                                    * @param {Ext.cf.ds.CS} cs
                                                    *
                                                    */
                                                    seenChangeStamp: function(cs) { // a change stamp we just received
                                                        var changed= false;
                                                        if(cs){
                                                            var current_time= this.clock.now();
                                                            if (current_time>this.t) {
                                                                changed= this.update_local_offset(current_time);
                                                            }
                                                            changed= changed||this.update_global_offset(cs);
                                                        }
                                                        return changed;
                                                    },

                                                    /** 
                                                    * Set replica number
                                                    *
                                                    * @param {Number} replica_number
                                                    *
                                                    */
                                                    setReplicaNumber: function(replica_number) {
                                                        var changed= this.r!==replica_number;
                                                        this.r= replica_number;
                                                        return changed;
                                                    },

                                                    /** 
                                                    * Update local offset
                                                    *
                                                    * @param {Number} current_time
                                                    *
                                                    * @private
                                                    *
                                                    */
                                                    update_local_offset: function(current_time) {
                                                        var changed= false;
                                                        var delta= current_time-this.t;
                                                        if (delta>0) { // local clock moved forwards
                                                            var local_time= this.global_time();
                                                            this.t= current_time;
                                                            if (delta>this.local_offset) {
                                                                this.local_offset= 0;
                                                            } else {
                                                                this.local_offset-= delta;
                                                            }
                                                            var local_time_after= this.global_time();
                                                            if (local_time_after>local_time) {
                                                                this.s= -1;
                                                            }
                                                            changed= true;
                                                        } else if (delta<0) { // local clock moved backwards
                                                            // JCM if delta is too big, then complain
                                                            this.t= current_time;
                                                            this.local_offset+= -delta;
                                                            changed= true;
                                                        }
                                                        return changed;
                                                    },

                                                    /** 
                                                    * Update global offset
                                                    *
                                                    * @param {Ext.cf.ds.CS} remote_cs
                                                    *
                                                    * @private
                                                    *
                                                    */
                                                    update_global_offset: function(remote_cs) {
                                                        var changed= false;
                                                        var local_cs= new Ext.cf.ds.CS({r:this.r,t:this.global_time(),s:this.s+1});
                                                        var local_t= local_cs.t;
                                                        var local_s= local_cs.s;
                                                        var remote_t= remote_cs.t;
                                                        var remote_s= remote_cs.s;
                                                        if (remote_t==local_t && remote_s>=local_s) {
                                                            this.s= remote_s;
                                                            changed= true;
                                                        } else if (remote_t>local_t) {
                                                            var delta= remote_t-local_t;
                                                            if (delta>0) { // remote clock moved forwards
                                                                // JCM guard against moving too far forward
                                                                this.global_offset+= delta;
                                                                this.s= remote_s;
                                                                changed= true;
                                                            }
                                                        }
                                                        return changed; 
                                                    },

                                                    /** 
                                                    * Global time
                                                    *
                                                    * @private
                                                    *
                                                    */
                                                    global_time: function() {
                                                        return this.t+this.local_offset+this.global_offset;
                                                    },

                                                    /** 
                                                    * As data
                                                    *
                                                    * @return {Object}
                                                    *
                                                    */
                                                    as_data: function() {
                                                        return {
                                                            r: this.r,
                                                            t: this.t,
                                                            s: this.s,
                                                            local_offset: this.local_offset,
                                                            global_offset: this.global_offset
                                                        };
                                                    }

                                                });

                                                /**
                                                * @private
                                                *
                                                * Change Stamp Vector
                                                *
                                                * Represents a global point in 'time'.
                                                */
                                                Ext.define('Ext.cf.ds.CSV', {
                                                    requires: ['Ext.cf.ds.CS'],

                                                    v: undefined, // change stamps, replica number => change stamp

                                                    /** 
                                                    * Constructor
                                                    *
                                                    * @param {Object} config
                                                    *
                                                    */
                                                    constructor: function(config) {
                                                        this.v= {};
                                                        if (config===undefined){
                                                        }else if (config instanceof Ext.cf.ds.CSV) {
                                                            this.addX(config);
                                                        }else{
                                                            this.addX(config.v);
                                                        }
                                                    },

                                                    /** 
                                                    * Get
                                                    *
                                                    * @param {Ext.cf.ds.CS/Number} x
                                                    *
                                                    */
                                                    get: function(x) {
                                                        if (x instanceof Ext.cf.ds.CS) {
                                                            return this.v[x.r];
                                                        }else{
                                                            return this.v[x];
                                                        }
                                                    },

                                                    /** 
                                                    * SetCS
                                                    *
                                                    * @param {Ext.cf.ds.CS} x
                                                    *
                                                    */
                                                    setCS: function(x) {
                                                        this.v[x.r]= Ext.create('Ext.cf.ds.CS',{r:x.r,t:x.t,s:x.s});
                                                    },

                                                    /** 
                                                    * Set replica number
                                                    *
                                                    * @param {Number} replica_number
                                                    *
                                                    */
                                                    setReplicaNumber: function(replica_number) {
                                                        this.addReplicaNumbers([replica_number]);
                                                    },

                                                    /** 
                                                    * Add replica numbers
                                                    *
                                                    * @param {Array/Object} x
                                                    *
                                                    */
                                                    addReplicaNumbers: function(x) {
                                                        var t= [];
                                                        if (x instanceof Array) {
                                                            if(x[0] instanceof Ext.cf.ds.CS){
                                                                t= Ext.Array.map(x,function(r){return this.addX(Ext.create('Ext.cf.ds.CS',{r:x.r}));},this);
                                                            }else{
                                                                t= Ext.Array.map(x,function(r){return this.addX(Ext.create('Ext.cf.ds.CS',{r:r}));},this);
                                                            }
                                                        } else if (x instanceof Ext.cf.ds.CSV) {
                                                            t= x.collect(function(cs){return this.addX(Ext.create('Ext.cf.ds.CS',{r:cs.r}));},this);
                                                        }
                                                        return Ext.Array.contains(t,true);
                                                    },

                                                    /** 
                                                    * Add X
                                                    *
                                                    * @param {Ext.cf.ds.CSV/Ext.cf.ds.CS/Array/String} x
                                                    *
                                                    */
                                                    addX: function(x) { // CSV, CS, '1-2-3', [x]
                                                        var changed= false;
                                                        if (x===undefined){
                                                        } else if (x instanceof Ext.cf.ds.CSV) {
                                                            changed= this.addCSV(x);
                                                        } else if (x instanceof Array) {
                                                            var t= Ext.Array.map(x,this.addX,this);
                                                            changed= Ext.Array.contains(t,true);
                                                        } else if (x instanceof Ext.cf.ds.CS) {
                                                            changed= this.addCS(x);
                                                        } else if (typeof x == 'string' || x instanceof String) {
                                                            changed= this.addX(Ext.create('Ext.cf.ds.CS',x));
                                                        }
                                                        return changed;
                                                    },

                                                    /** 
                                                    * Add CS
                                                    *
                                                    * @param {Ext.cf.ds.CS} x
                                                    *
                                                    */
                                                    addCS: function(x) {
                                                        var changed= false;
                                                        if (x!==undefined){
                                                            var r= x.r;
                                                            var t= this.v[r];
                                                            if (!t || x.greaterThan(t)) {
                                                                this.v[r]= Ext.create('Ext.cf.ds.CS',{r:x.r,t:x.t,s:x.s});
                                                                changed= true;
                                                            }
                                                        }
                                                        return changed;
                                                    },

                                                    /** 
                                                    * Add CSV
                                                    *
                                                    * @param {Ext.cf.ds.CSV} x
                                                    *
                                                    */
                                                    addCSV: function(x) {
                                                        var changed= false;
                                                        if (x!==undefined){
                                                            var t= x.collect(this.addCS,this);
                                                            changed= Ext.Array.contains(t,true);
                                                        }
                                                        return changed;
                                                    },

                                                    /** 
                                                    * Set CSV
                                                    *
                                                    * @param {Ext.cf.ds.CSV} x
                                                    *
                                                    */
                                                    setCSV: function(x) {
                                                        x.collect(this.setCS,this);
                                                    },

                                                    /** 
                                                    * Change replica number
                                                    *
                                                    * @param {Number} old_replica_number
                                                    * @param {Number} new_replica_number
                                                    *
                                                    */
                                                    changeReplicaNumber: function(old_replica_number,new_replica_number) {
                                                        var t= this.v[old_replica_number];
                                                        var changed= false;
                                                        if (t) {
                                                            t.r= new_replica_number;
                                                            delete this.v[old_replica_number];
                                                            this.v[new_replica_number]= t;
                                                            changed= true;
                                                        }
                                                        return changed;
                                                    },

                                                    /** 
                                                    * isEmpty?
                                                    *
                                                    * @return {Boolean} True/False
                                                    *
                                                    */
                                                    isEmpty: function() {
                                                        for(var i in this.v) {
                                                            return false;
                                                        }
                                                        return true;
                                                    },

                                                    /** 
                                                    * Max change stamp
                                                    *
                                                    * @return {Ext.cf.ds.CS} Changestamp
                                                    *
                                                    */
                                                    maxChangeStamp: function() {
                                                        if (!this.isEmpty()) {
                                                            var r= Ext.create('Ext.cf.ds.CS');
                                                            for (var i in this.v) {
                                                                r = (this.v[i].greaterThan(r) ? this.v[i] : r);
                                                            }
                                                            return r;
                                                        }
                                                    },

                                                    /** 
                                                    * Min change stamp
                                                    *
                                                    * @return {Ext.cf.ds.CS} Changestamp
                                                    *
                                                    */
                                                    minChangeStamp: function() {
                                                        if (!this.isEmpty()) {
                                                            var r;
                                                            for (var i in this.v) {
                                                                r = (!r || this.v[i].lessThan(r) ? this.v[i] : r);
                                                            }
                                                            return r;
                                                        }
                                                    },

                                                    /** 
                                                    * Intersect
                                                    *
                                                    * @param {Ext.cf.ds.CSV} x
                                                    *
                                                    */
                                                    intersect: function(x) {
                                                        for (var i in x.v) {
                                                            if (this.v[i]!==undefined) {
                                                                this.v[i]=x.v[i];
                                                            }
                                                        }
                                                    },

                                                    /** 
                                                    * Dominates
                                                    *
                                                    * @param {Ext.cf.ds.CSV} x
                                                    *
                                                    * @return {Boolean} true if this csv dominates x
                                                    *
                                                    */
                                                    dominates: function(x) { // true if this csv dominates x
                                                        return Ext.Array.some(this.compare(x),function(i){ return i>0; });
                                                    },

                                                    /** 
                                                    * Dominated
                                                    *
                                                    * @param {Ext.cf.ds.CSV} x
                                                    *
                                                    * @return {Array} returns a list of the dominated cs in x
                                                    *
                                                    */
                                                    dominated: function(x) { // returns a list of the dominated cs in x
                                                        var r = [];
                                                        for (var i in this.v) {
                                                            if(this.v[i]!==undefined && this.compare(this.v[i])>0) {
                                                                r.push(this.v[i]);
                                                            }
                                                        }
                                                        return r;
                                                    },

                                                    /** 
                                                    * Dominant
                                                    *
                                                    * @param {Ext.cf.ds.CSV} x
                                                    *
                                                    * @return {Object} dominant and dominated arrays
                                                    *
                                                    */
                                                    dominant: function(x) { // this dominates over that
                                                        var dominated= [];
                                                        var dominant= []; 
                                                        for (var i in this.v) {
                                                            var v= this.v[i];
                                                            if (v!==undefined){
                                                                var r= x.compare(v);
                                                                if(r<0) {
                                                                    dominant.push(v);
                                                                }else if(r>0){
                                                                    dominated.push(v);
                                                                }
                                                            }
                                                        }
                                                        return {dominant:dominant,dominated:dominated};
                                                    },

                                                    /** 
                                                    * Equals
                                                    *
                                                    * @param {Ext.cf.ds.CSV} x
                                                    *
                                                    * @return {Boolean} True/False
                                                    *
                                                    */
                                                    equals: function(x) {
                                                        return Ext.Array.every(this.compare(x),function(i){ return i===0; });
                                                    },

                                                    /** 
                                                    * Compare
                                                    *
                                                    * @param {Ext.cf.ds.CSV} x
                                                    *
                                                    */
                                                    compare: function(x) {
                                                        var cs, cs2;
                                                        if (x instanceof Ext.cf.ds.CS) {
                                                            cs= this.get(x);
                                                            cs2= x;
                                                            return [cs ? cs.compare(cs2) : -1];
                                                        } else if (x instanceof Ext.cf.ds.CSV) {        
                                                            var r= [];
                                                            for(var i in this.v) {
                                                                cs= this.v[i];
                                                                if (cs instanceof Ext.cf.ds.CS) {
                                                                    cs2= x.get(cs);
                                                                    r.push(cs2 ? cs.compare(cs2) : 1);
                                                                }
                                                            }
                                                            return r;
                                                        } else {
                                                            throw "Error - CSV - compare - Unknown type: "+(typeof x)+": "+x;
                                                        }
                                                        return [-1];
                                                    },

                                                    /** 
                                                    * Encode
                                                    *
                                                    */
                                                    encode: function() { // for the wire
                                                        return this.collect(function(cs){
                                                            // JCM can we safely ignore replicas with CS of 0... except for the highest known replica number...
                                                            return cs.asString();
                                                        }).join('.');
                                                    },

                                                    /** 
                                                    * Decode
                                                    *
                                                    * @param {Object} x
                                                    *
                                                    */
                                                    decode: function(x) { // from the wire
                                                        if(x){
                                                            this.addX(x.split('.'));
                                                        }
                                                        return this;
                                                    },

                                                    /** 
                                                    * To Stamp
                                                    *
                                                    * @param {Object} indent
                                                    *
                                                    * @return {String}
                                                    *
                                                    */
                                                    asString: function(indent) {
                                                        return "CSV: "+this.collect(function(cs){return cs.asString();}).join(', ');
                                                    },

                                                    /** 
                                                    * As data
                                                    *
                                                    * @return {Object} 
                                                    *
                                                    */
                                                    as_data: function() { // for the disk
                                                        return {
                                                            v: this.collect(function(cs){return cs.asString();}),
                                                            id: 'csv'
                                                        };
                                                    },

                                                    // private

                                                    /** 
                                                    * Collect
                                                    *
                                                    * @param {Function} fn
                                                    * @param {Object} scope
                                                    *
                                                    * @return {Array}
                                                    *
                                                    * @private
                                                    *
                                                    */
                                                    collect: function(fn,scope) {
                                                        var r= [];
                                                        for(var i in this.v){
                                                            if(this.v.hasOwnProperty(i)){
                                                                r.push(fn.call(scope||this,this.v[i]));
                                                            }
                                                        }
                                                        return r;
                                                    }

                                                });
                                                /**
                                                * @private
                                                *
                                                * Change Stamp Index
                                                *
                                                * Index of a set of Object Identifiers for a single replica, by time, t.
                                                */
                                                Ext.define('Ext.cf.ds.CSI', {

                                                    map: {}, // t => set of oids
                                                    v: [],   // t, in order
                                                    dirty: false, // if v needs rebuild

                                                    /** 
                                                    * Constructor
                                                    *
                                                    */
                                                    constructor: function() {
                                                        this.clear();
                                                    },

                                                    /** 
                                                    * Clear
                                                    *
                                                    */
                                                    clear: function() {
                                                        this.map= {};
                                                        this.v= [];
                                                        this.dirty= false;
                                                    },

                                                    /** 
                                                    * Add
                                                    *
                                                    * @param {String/Number} t
                                                    * @param {String} oid
                                                    *
                                                    */
                                                    add: function(t,oid) {
                                                        var l= this.map[t];
                                                        if(l){
                                                            l[oid]= true;
                                                        }else{
                                                            l= {};
                                                            l[oid]= true;
                                                            this.map[t]= l;
                                                            this.dirty= true;
                                                        }
                                                    },

                                                    /** 
                                                    * Remove
                                                    *
                                                    * @param {String/Number} t
                                                    * @param {String} oid
                                                    *
                                                    */
                                                    remove: function(t,oid) {
                                                        var l= this.map[t];
                                                        if(l){
                                                            delete l[oid];
                                                            this.dirty= true;
                                                        }
                                                    },

                                                    /** 
                                                    * Oids from
                                                    *
                                                    * @param {String/Number} t
                                                    *
                                                    */
                                                    oidsFrom: function(t) {
                                                        var r= [];
                                                        var keys= this.keysFrom(t);
                                                        var l= keys.length;
                                                        for(var i=0;i<l;i++){
                                                            r= r.concat(this.oToA(this.map[keys[i]]));
                                                        }
                                                        return r;
                                                    },

                                                    /** 
                                                    * Keys from
                                                    *
                                                    * @param {String/Number} t
                                                    *
                                                    */
                                                    keysFrom: function(t) {
                                                        var r= [];
                                                        var keys= this.keys();
                                                        var l= keys.length;
                                                        for(var i=0;i<l;i++){ // JCM should be a binary search, or reverse iteration
                                                            var j= keys[i];
                                                            if(j>=t){ // '=' because we only index by t, there could be updates with the same t and greater s
                                                                r.push(j);
                                                            }
                                                        }
                                                        return r;
                                                    },

                                                    /** 
                                                    * Encode
                                                    *
                                                    */
                                                    encode: function() {
                                                        var r= {};
                                                        for(var i in this.map){
                                                            if (this.map.hasOwnProperty(i) && !this.isEmpty(this.map[i])) {
                                                                r[i]= this.oToA(this.map[i]);
                                                            }
                                                        }
                                                        return r;
                                                    },

                                                    /** 
                                                    * Decode
                                                    *
                                                    * @param {Object} v
                                                    *
                                                    */
                                                    decode: function(v) {
                                                        this.clear();
                                                        for(var i in v){
                                                            if (v.hasOwnProperty(i)) {
                                                                var oids= v[i];
                                                                for(var j=0;j<oids.length;j++){
                                                                    this.add(i,oids[j]);
                                                                }
                                                            }
                                                        }
                                                        return this;
                                                    },

                                                    /** 
                                                    * Keys
                                                    *
                                                    */
                                                    keys: function() {
                                                        if(this.dirty){
                                                            this.v= [];
                                                            for(var i in this.map){
                                                                if (this.map.hasOwnProperty(i) && !this.isEmpty(this.map[i])) {
                                                                    this.v.push(i);
                                                                }
                                                            }
                                                            this.dirty= false; 
                                                        }
                                                        return this.v;
                                                    },

                                                    /** 
                                                    * isEmpty?
                                                    *
                                                    * @param {Object} object
                                                    *
                                                    * @return {Boolean} True/False
                                                    *
                                                    */
                                                    isEmpty: function(o) {
                                                        for(var i in o) {
                                                            return false;
                                                        }
                                                        return true;
                                                    },

                                                    /** 
                                                    * Object to Array
                                                    *
                                                    * @param {Object} object
                                                    *
                                                    * @return {Array}
                                                    *
                                                    * @private
                                                    *
                                                    */ 
                                                    oToA: function(o){
                                                        var r= [];
                                                        if(o){
                                                            for(var i in o){
                                                                if (o.hasOwnProperty(i)) {
                                                                    r.push(i);
                                                                }
                                                            }
                                                        }
                                                        return r;
                                                    },

                                                    /** 
                                                    * To stamp
                                                    *
                                                    */
                                                    asString: function(){
                                                        var r= "";
                                                        for(var i in this.map){
                                                            if (this.map.hasOwnProperty(i) && !this.isEmpty(this.map[i])) {
                                                                r= r+i+':'+this.oToA(this.map[i]);
                                                            }
                                                            r= r+", ";
                                                        }
                                                        return r;
                                                    }


                                                });

                                                /**
                                                * @private
                                                *
                                                * Change Stamp Index Vector
                                                * 
                                                * In index for a set of Object Identifiers for all replicas, by Change Stamp.
                                                */
                                                Ext.define('Ext.cf.ds.CSIV', {
                                                    requires: ['Ext.cf.ds.CSI'],

                                                    v: {}, // r => Change Stamp Index

                                                    /** 
                                                    * Constructor
                                                    *
                                                    */
                                                    constructor: function() {
                                                        this.v= {};
                                                    },

                                                    /** 
                                                    * Oids from
                                                    *
                                                    * @param {Ext.cf.ds.CSV} csv
                                                    *
                                                    */
                                                    oidsFrom: function(csv) {
                                                        var r= csv.collect(function(cs){
                                                            var csi= this.v[cs.r];
                                                            if(csi){
                                                                return csi.oidsFrom(cs.t);
                                                            }
                                                        },this);
                                                        r= Ext.Array.flatten(r);
                                                        r= Ext.Array.unique(r);
                                                        r= Ext.Array.clean(r);
                                                        return r;
                                                    },

                                                    /** 
                                                    * Add
                                                    *
                                                    * @param {Ext.cf.ds.CS} cs
                                                    * @param {String} oid
                                                    *
                                                    */
                                                    add: function(cs,oid) {
                                                        var csi= this.v[cs.r];
                                                        if(csi===undefined){
                                                            csi= this.v[cs.r]= Ext.create('Ext.cf.ds.CSI');
                                                        }
                                                        csi.add(cs.t,oid);
                                                    },

                                                    /** 
                                                    * Add Array
                                                    *
                                                    * @param {Array} a
                                                    * @param {String} oid
                                                    *
                                                    */
                                                    addArray: function(a,oid) {
                                                        var l= a.length;
                                                        for(var i=0;i<l;i++){
                                                            var cs= a[i];
                                                            if(cs){
                                                                this.add(a[i],oid);
                                                            }
                                                        }
                                                    },

                                                    /** 
                                                    * Remove
                                                    *
                                                    * @param {Ext.cf.ds.CS} cs
                                                    * @param {String} oid
                                                    *
                                                    */
                                                    remove: function(cs,oid) {
                                                        var csi= this.v[cs.r];
                                                        if(csi){
                                                            csi.remove(cs.t,oid);
                                                        }
                                                    },  

                                                    /** 
                                                    * Remove array
                                                    *
                                                    * @param {Array} a
                                                    * @param {String} oid
                                                    *
                                                    */
                                                    removeArray: function(a,oid) {
                                                        var l= a.length;
                                                        for(var i=0;i<l;i++){
                                                            var cs= a[i];
                                                            if(cs){
                                                                this.remove(a[i],oid);
                                                            }
                                                        }
                                                    },

                                                    /** 
                                                    * Encode
                                                    *
                                                    */
                                                    encode: function() {
                                                        var r= {};
                                                        for(var i in this.v){
                                                            if (this.v.hasOwnProperty(i)) {
                                                                r[i]= this.v[i].encode();
                                                            }
                                                        }
                                                        return {r:r};
                                                    },

                                                    /** 
                                                    * Decode
                                                    *
                                                    * @param {Object} v
                                                    *
                                                    */
                                                    decode: function(v) {
                                                        this.v= {};
                                                        if(v){
                                                            for(var i in v.r){
                                                                if (v.r.hasOwnProperty(i)) {
                                                                    this.v[i]= Ext.create('Ext.cf.ds.CSI').decode(v.r[i]);
                                                                }
                                                            }       
                                                        }
                                                        return this;
                                                    },

                                                    /** 
                                                    * To stamp
                                                    *
                                                    */
                                                    asString: function() {
                                                        var r= "";
                                                        for(var i in this.v){
                                                            if (this.v.hasOwnProperty(i)) {
                                                                r= r+i+"=>["+this.v[i].asString()+"], ";
                                                            }
                                                        }
                                                        return r;
                                                    }

                                                });

                                                /**
                                                * 
                                                * @private
                                                *
                                                * Eventually Consistent Object
                                                *
                                                * It's an object of name-value-changestamp tuples,
                                                * A value can be of a simple or complex type.
                                                * Complex types are either an Object or an Array
                                                */
                                                Ext.define('Ext.cf.ds.ECO', {
                                                    requires: [
                                                    'Ext.cf.ds.CSV',
                                                    'Ext.cf.ds.CS'
                                                    ],

                                                    /** 
                                                    * Constructor
                                                    *
                                                    * @param {Object} config
                                                    *
                                                    */
                                                    constructor: function(config) {
                                                        config= config||{};
                                                        this.oid= config.oid;
                                                        this.data= config.data||{};
                                                        this.state= config.state||{};
                                                    },

                                                    /** 
                                                    * Set oid
                                                    *
                                                    * @param {String} oid
                                                    *
                                                    */
                                                    setOid: function(oid) {
                                                        this.oid= oid;  
                                                    },

                                                    /** 
                                                    * Get oid
                                                    *
                                                    * @return {String} oid
                                                    *
                                                    */
                                                    getOid: function() {
                                                        return this.oid;
                                                    },

                                                    /** 
                                                    * Get state
                                                    *
                                                    * @return {Object} state
                                                    *
                                                    */
                                                    getState: function() {
                                                        return this.state;
                                                    },

                                                    /**
                                                    * Get the value for the path
                                                    *
                                                    * @param {Object} path
                                                    *
                                                    */
                                                    get: function(path) {
                                                        return this.getValue(path);
                                                    },

                                                    /**
                                                    * Set the value for a path, with a new change stamp.
                                                    *
                                                    * @param {String/Array} path
                                                    * @param {Object} value
                                                    * @param {Ext.cf.data.Transaction} t
                                                    *
                                                    * @return {Boolean} True/False
                                                    *
                                                    */
                                                    set: function(path,value,t) {
                                                        var updates= this.valueToUpdates(path,value);
                                                        var l= updates.length;
                                                        for(var i=0;i<l;i++) {
                                                            var update= updates[i];
                                                            this.setValueCS(t,update.n,update.v,t.generateChangeStamp());
                                                        }
                                                    },

                                                    /**
                                                    * Apply an update to this Object.
                                                    *
                                                    * @param {Ext.cf.data.Transaction} t
                                                    * @param {Object} update
                                                    *
                                                    * @return {Boolean} True/False
                                                    *
                                                    */
                                                    applyUpdate: function(t,update) {
                                                        return this.setValueCS(t,update.p,update.v,update.c);
                                                    },

                                                    /**
                                                    * Get all the updates that have occured since CSV.
                                                    *
                                                    * @param {Ext.cf.ds.CSV} csv
                                                    *
                                                    * @return {Array} updates
                                                    *
                                                    */
                                                    getUpdates: function(csv) {
                                                        var updates= []; // JCM should be Ext.x.Updates?
                                                        this.forEachValueCS(function(path,values,cs){
                                                            if (cs) {
                                                                var cs2= csv.get(cs);
                                                                if (!cs2 || cs2.lessThan(cs)) {
                                                                    updates.push({
                                                                        i: this.getOid(),
                                                                        p: path.length==1 ? path[0] : path, 
                                                                        v: values.length==1 ? values[0] : values, 
                                                                        c: cs
                                                                    });
                                                                }
                                                            }
                                                        },this);
                                                        return updates;
                                                    },

                                                    /**
                                                    * Get a CSV for this Object.
                                                    *
                                                    * @return {Ext.cf.ds.CSV} csv
                                                    *
                                                    */
                                                    getCSV: function() {
                                                        var csv= Ext.create('Ext.cf.ds.CSV');
                                                        this.forEachCS(function(cs) {
                                                            csv.addCS(cs);
                                                        },this);
                                                        return csv;
                                                    },

                                                    /**
                                                    * Get a list of all the Change Stamps in this Object.
                                                    *
                                                    * @return {Array}
                                                    *
                                                    */
                                                    getAllCS: function() {
                                                        var r= [];
                                                        this.forEachCS(function(cs) {
                                                            r.push(new Ext.cf.ds.CS(cs));
                                                        },this);
                                                        return r;
                                                    },

                                                    /**
                                                    * Change a replica number.
                                                    *
                                                    * @param {String} idProperty
                                                    * @param {Number} old_replica_number
                                                    * @param {Number} new_replica_number
                                                    *
                                                    */
                                                    changeReplicaNumber: function(idProperty,old_replica_number,new_replica_number) {
                                                        var changed= false;
                                                        this.forEachCS(function(cs) {
                                                            var t= cs.changeReplicaNumber(old_replica_number,new_replica_number);
                                                            changed= changed || t;
                                                            return cs;
                                                        },this);
                                                        if (this.oid) {
                                                            var id_cs= Ext.create('Ext.cf.ds.CS',this.oid);
                                                            if (id_cs.changeReplicaNumber(old_replica_number,new_replica_number)) {
                                                                var oid= id_cs.asString();
                                                                this.data[idProperty]= oid; // warning: don't call record.set, it'll cause an update after the add
                                                                this.oid= id_cs.asString();
                                                                changed= true;
                                                            }
                                                        }
                                                        return changed;
                                                    },

                                                    /**
                                                    * For each Value and Change Stamp of this Object.
                                                    *
                                                    * @param {Function} callback
                                                    * @param {Object} scope
                                                    * @param {Object} data
                                                    * @param {Object} state
                                                    * @param {String/Array} path
                                                    * @param {Array} values
                                                    *
                                                    */
                                                    forEachValueCS: function(callback,scope,data,state,path,values) {
                                                        data= data||this.data;
                                                        state= state||this.state;
                                                        path= path||[];
                                                        values= values||[];
                                                        //console.log('forEachPair',Ext.encode(data),Ext.encode(state),Ext.encode(path),Ext.encode(values));
                                                        for(var name in state) {
                                                            if (state.hasOwnProperty(name)) {
                                                                var new_state= state[name];
                                                                var new_data= data[name];
                                                                var new_path= path.concat(name);
                                                                var new_data_type= this.valueType(new_data);
                                                                var new_value;
                                                                switch (new_data_type) {
                                                                    case 'object':
                                                                    switch(new_data){
                                                                        case undefined:
                                                                        new_value= undefined;
                                                                        break;
                                                                        case null:
                                                                        new_value= null;
                                                                        break;
                                                                        default:
                                                                        new_value= {};
                                                                        break;
                                                                    }
                                                                    break;
                                                                    case 'array':
                                                                    new_value= [[]];
                                                                    break;
                                                                    default:
                                                                    new_value= new_data;
                                                                }
                                                                var new_values= values.concat(new_value);
                                                                switch (this.valueType(new_state)) {
                                                                    case 'string':
                                                                    callback.call(scope,new_path,new_values,new Ext.cf.ds.CS(new_state));
                                                                    break;
                                                                    case 'array':
                                                                    switch (new_data_type) {
                                                                        case 'undefined':
                                                                        Ext.cf.util.Logger.warn('ECO.forEachValueCS: There was no data for the state at path',new_path);
                                                                        Ext.cf.util.Logger.warn('ECO.forEachValueCS: ',Ext.encode(this.data));
                                                                        break;
                                                                        case 'object':
                                                                        case 'array':
                                                                        callback.call(scope,new_path,new_values,new Ext.cf.ds.CS(new_state[0])); // [cs,state]
                                                                        this.forEachValueCS(callback,scope,new_data,new_state[1],new_path,new_values); // [cs,state]
                                                                        break;
                                                                        default:
                                                                        callback.call(scope,new_path,new_values,new Ext.cf.ds.CS(new_state[0])); // [cs,state]
                                                                        break;
                                                                    }
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                    },  

                                                    /**
                                                    * @private
                                                    *
                                                    * For each Value of this Object.
                                                    *
                                                    * @param {Function} callback
                                                    * @param {Object} scope
                                                    * @param {Object} data
                                                    * @param {String/Array} path
                                                    *
                                                    */
                                                    forEachValue: function(callback,scope,data,path) {
                                                        data= data || this.data;
                                                        path= path || [];
                                                        var n, v;
                                                        for(n in data) {
                                                            if (data.hasOwnProperty(n)) {
                                                                v= data[n];
                                                                if (v!==this.state) {
                                                                    var path2= path.concat(n);
                                                                    callback.call(scope,path2,v);
                                                                    if (this.isComplexValueType(v)) {
                                                                        this.forEachValue(callback,scope,v,path2);
                                                                    }
                                                                }
                                                            }
                                                        }
                                                    },


                                                    /**
                                                    * @private
                                                    *
                                                    * For each Change Stamp of this Object
                                                    *
                                                    * @param {Function} callback
                                                    * @param {Object} scope
                                                    * @param {Object} state
                                                    *
                                                    */
                                                    forEachCS: function(callback,scope,state) {
                                                        state= state || this.state;
                                                        for(var name in state) {
                                                            if (state.hasOwnProperty(name)) {
                                                                var next_state= state[name];
                                                                var cs;
                                                                switch (this.valueType(next_state)) {
                                                                    case 'string':
                                                                    cs= callback.call(scope,Ext.create('Ext.cf.ds.CS',next_state));
                                                                    if (cs) { state[name]= cs.asString(); }
                                                                    break;
                                                                    case 'array':
                                                                    cs= callback.call(scope,Ext.create('Ext.cf.ds.CS',next_state[0]));
                                                                    if (cs) { state[name][0]= cs.asString(); } // [cs,state]
                                                                    this.forEachCS(callback,scope,next_state[1]); // [cs,state]
                                                                    break;
                                                                }
                                                            }
                                                        }
                                                    },


                                                    /**
                                                    * @private
                                                    * 
                                                    * Return Value and Change Stamp for the path, {v:value, c:cs}
                                                    *
                                                    * @param {String/Array} path
                                                    *
                                                    */
                                                    getValueCS: function(path) {
                                                        var data= this.data;
                                                        var state= this.state;
                                                        if (Ext.isArray(path)) {
                                                            var l= path.length;
                                                            var e= l-1;
                                                            for(var i=0;i<l;i++) {
                                                                var name= path[i];
                                                                if (i===e) {
                                                                    return {
                                                                        v: data ? data[name] : data,
                                                                        c: this.extractCS(state,name)
                                                                    };
                                                                } else {
                                                                    state= this.extractState(state,name);
                                                                    data= data ? data[name] : data;
                                                                }
                                                            }
                                                        } else {
                                                            return {
                                                                v: data[path],
                                                                c: this.extractCS(state,path)
                                                            };
                                                        }
                                                    },

                                                    /**
                                                    * @private
                                                    *
                                                    * Get value
                                                    *
                                                    * @param {String/Array} path
                                                    *
                                                    */
                                                    getValue: function(path) {
                                                        var data= this.data;
                                                        if (Ext.isArray(path)) {
                                                            var l= path.length;
                                                            var e= l-1;
                                                            for(var i=0;i<l;i++) {
                                                                var name= path[i];
                                                                if (i===e) {
                                                                    return data[name];
                                                                } else {
                                                                    data= data[name];
                                                                }
                                                            }
                                                        } else {
                                                            return this.data[path];
                                                        }
                                                    },

                                                    /**
                                                    * @private
                                                    *
                                                    * Set value of CS
                                                    *
                                                    * @param {Ext.cf.data.Transaction} t
                                                    * @param {String/Array} path
                                                    * @param {Array} values
                                                    * @param {Ext.cf.ds.CS} new_cs
                                                    *
                                                    * @return {Boolean} True/False
                                                    *
                                                    */
                                                    setValueCS: function(t,path,values,new_cs) {
                                                        var self= this;

                                                        //console.log('setValue',Ext.encode(path),Ext.encode(values),Ext.encode(new_cs));
                                                        //console.log('setValue',Ext.encode(this.data));

                                                        var assignValueCS= function(t,data,state,name,value,to_cs) {
                                                            var changed= false;
                                                            if (value!==undefined) {
                                                                data[name]= value;
                                                                changed= true;
                                                            }
                                                            if (to_cs!==undefined) {
                                                                var from_cs= self.extractCS(state,name);
                                                                self.assignCS(state,name,to_cs);
                                                                t.updateCS(from_cs,to_cs,self.getOid());
                                                                changed= true;
                                                            }
                                                            return changed;
                                                        };

                                                        var changed= false;
                                                        if (!Ext.isArray(path)) {
                                                            path= [path];
                                                            values= [values];
                                                        }
                                                        var data= this.data;
                                                        var state= this.state;
                                                        var l= path.length;
                                                        var e= l-1;
                                                        for(var i=0;i<l;i++) {
                                                            var name= path[i];
                                                            var new_value= values[i]; 
                                                            var old_cs= this.extractCS(state,name);
                                                            var old_value= data[name];
                                                            var old_value_type= this.valueType(old_value);
                                                            var new_value_type= this.valueType(new_value);
                                                            var sameComplexType= 
                                                            ((old_value_type==='object' && new_value_type==='object') ||
                                                            (old_value_type==='array' && new_value_type==='array'));
                                                            if (old_cs) {
                                                                if (new_cs.greaterThan(old_cs)) {
                                                                    if (sameComplexType) {
                                                                        new_value= undefined; // re-assert, don't overwrite
                                                                    }
                                                                    // new_cs is gt old_cs, so accept update
                                                                    if (assignValueCS(t,data,state,name,new_value,new_cs)) {
                                                                        changed= true;
                                                                    }
                                                                } else {
                                                                    // new_cs is not gt old_cs
                                                                    if (sameComplexType) {
                                                                        // but this value type along the path is the same, so keep going... 
                                                                    } else {
                                                                        // and this type along the path is not the same, so reject the update.
                                                                        return changed;
                                                                    }
                                                                }
                                                            } else {
                                                                // no old_cs, so accept update
                                                                if (assignValueCS(t,data,state,name,new_value,new_cs)) {
                                                                    changed= true;
                                                                }
                                                                //console.log('X',new_cs,'no old',data,state)
                                                            }
                                                            if (i!==e) {
                                                                data= data[name];
                                                                state= this.extractState(state,name,new_cs);
                                                            }
                                                        }
                                                        //console.log('setValue => ',Ext.encode(this.data));
                                                        return changed;
                                                    },

                                                    /**
                                                    * @private
                                                    *
                                                    * Get the Change Stamp for the path
                                                    *
                                                    * @param {String/Array} path
                                                    *
                                                    */
                                                    getCS: function(path) {
                                                        var state= this.state;
                                                        if (Ext.isArray(path)) {
                                                            var l= path.length;
                                                            var e= l-1;
                                                            for(var i=0;i<l;i++) {
                                                                var name= path[i];
                                                                if (i===e) {
                                                                    return this.extractCS(state,name);
                                                                } else {
                                                                    state= this.extractState(state,name);
                                                                }
                                                            }
                                                        } else {
                                                            return this.extractCS(state,path);
                                                        }
                                                    },

                                                    /**
                                                    * @private
                                                    *
                                                    * Set the Change Stamp for the Path.
                                                    *
                                                    * @param {Ext.cf.data.Transaction} t
                                                    * @param {String/Array} path
                                                    * @param {Ext.cf.ds.CS} cs
                                                    *
                                                    */
                                                    setCS: function(t,path,cs) {
                                                        var self= this;

                                                        var setNameCS= function(t,state,name,to_cs) {
                                                            var from_cs= self.extractCS(state,name);
                                                            self.assignCS(state,name,to_cs);
                                                            t.updateCS(from_cs,to_cs,self.getOid());
                                                        };

                                                        var state= this.state;
                                                        if (Ext.isArray(path)) {
                                                            var l= path.length;
                                                            var e= l-1;
                                                            for(var i=0;i<l;i++) {
                                                                var name= path[i];
                                                                if (i===e) {
                                                                    setNameCS(t,state,name,cs);
                                                                } else {
                                                                    state= this.extractState(state,name);
                                                                }
                                                            }
                                                        } else {
                                                            setNameCS(t,state,path,cs);
                                                        }
                                                    },

                                                    /**
                                                    * @private
                                                    *
                                                    * Extract the next state for this name from the state
                                                    *
                                                    * @param {Object} state
                                                    * @param {String} name
                                                    * @param {Ext.cf.ds.CS} cs
                                                    *
                                                    * @return {Object} state
                                                    *
                                                    */
                                                    extractState: function(state,name,cs) {
                                                        var next_state= state[name];
                                                        var new_state;
                                                        switch (this.valueType(next_state)) {
                                                            case 'undefined':
                                                            new_state= {};
                                                            state[name]= [cs,new_state];
                                                            state= new_state;
                                                            break;
                                                            case 'string':
                                                            new_state= {};
                                                            state[name]= [next_state,new_state];
                                                            state= new_state;
                                                            break;
                                                            case 'array':
                                                            state= next_state[1];
                                                            break;
                                                        }
                                                        return state;
                                                    },

                                                    /**
                                                    * @private
                                                    * 
                                                    * Extract the Change Stamp from the state for this name
                                                    *
                                                    * @param {Object} state
                                                    * @param {String} name
                                                    *
                                                    * @return {Object}
                                                    *
                                                    */
                                                    extractCS: function(state,name) {
                                                        var cs;
                                                        state= state[name];
                                                        if (state) {
                                                            switch (this.valueType(state)) {
                                                                case 'string':
                                                                cs= new Ext.cf.ds.CS(state);
                                                                break;
                                                                case 'array':
                                                                cs= new Ext.cf.ds.CS(state[0]); // [cs,state]
                                                                break;
                                                            }
                                                        } // else undefined
                                                        return cs;
                                                    },

                                                    /**
                                                    * @private
                                                    *
                                                    * Assign the Change Stamp for this name
                                                    *
                                                    * @param {Object} state
                                                    * @param {String} name
                                                    * @param {Ext.cf.ds.CS} cs
                                                    *
                                                    */
                                                    assignCS: function(state,name,cs) {
                                                        var cs_s= (cs instanceof Ext.cf.ds.CS) ? cs.asString() : cs;
                                                        var state2= state[name];
                                                        if (state2) {
                                                            switch (this.valueType(state2)) {
                                                                case 'string':
                                                                state[name]= cs_s;
                                                                break;
                                                                case 'array':
                                                                state2[0]= cs_s; // [cs,state]
                                                                break;
                                                            }
                                                        } else {
                                                            state[name]= cs_s;
                                                        }
                                                    },

                                                    /**
                                                    * @private
                                                    *
                                                    * Returns undefined, number, boolean, string, object, array.
                                                    *
                                                    * @param {Array/Object} value
                                                    *
                                                    * @return {String} typeof value
                                                    *
                                                    */
                                                    valueType: function(value) { // 
                                                        var t= typeof value;
                                                        if (t==='object' && (value instanceof Array)) {
                                                            t= 'array';
                                                        }
                                                        return t;
                                                    },

                                                    /**
                                                    * @private
                                                    *
                                                    * Returns true for an object or an array.
                                                    *
                                                    * @param {Array/Object} value
                                                    *
                                                    * @return {Boolean} True/False
                                                    *
                                                    */
                                                    isComplexValueType: function(value) {
                                                        return (value!==null && typeof value==='object');
                                                    },

                                                    /** 
                                                    * @private
                                                    *
                                                    * Create a list of updates from a value, either simple or complex.
                                                    *
                                                    * @param {String} name
                                                    * @param {Array/Object} value
                                                    *
                                                    * @return {Object}
                                                    *
                                                    */
                                                    valueToUpdates: function(name,value) {
                                                        if(this.isComplexValueType(value)) {
                                                            var parent_value;
                                                            switch(this.valueType(value)) {
                                                                case 'object':
                                                                parent_value= {};
                                                                break;
                                                                case 'array':
                                                                parent_value= [];
                                                                break;
                                                            }
                                                            var parent_update= {n: [name], v: [parent_value]};
                                                            var updates= [parent_update];
                                                            for(var key in value) {
                                                                if (value.hasOwnProperty(key)) {
                                                                    var children= this.valueToUpdates(key,value[key]);
                                                                    var l= children.length;
                                                                    for(var i=0;i<l;i++){
                                                                        update= children[i];
                                                                        updates= updates.concat({n:parent_update.n.concat(update.n),v:parent_update.v.concat(update.v)});
                                                                    }
                                                                }
                                                            }
                                                            return updates;
                                                        } else {
                                                            return [{n: name, v: value}];
                                                        }
                                                    }

                                                });


                                                /**
                                                * @private
                                                *
                                                */
                                                Ext.define('Ext.cf.naming.LocalStore', {
                                                    /**
                                                    * Get item
                                                    *
                                                    * @param {String/Number} key
                                                    *
                                                    */
                                                    getItem: function(key) {
                                                        var store= window.localStorage;
                                                        if (store) {
                                                            var value = store.getItem(key);
                                                            if(value === "null") {
                                                                return null;
                                                            } else if(value === "undefined") {
                                                                return undefined;
                                                            } else {
                                                                return value;
                                                            }
                                                        }
                                                    },

                                                    /**
                                                    * Set item
                                                    *
                                                    * @param {String/Number} key
                                                    * @param {String/Number} value
                                                    *
                                                    */
                                                    setItem: function(key,value) {
                                                        var store= window.localStorage;
                                                        if (store) {
                                                            store.setItem(key,value);
                                                        }
                                                    },

                                                    /**
                                                    * Remove item
                                                    *
                                                    * @param {String/Number} key
                                                    *
                                                    */
                                                    removeItem: function(key) {
                                                        var store= window.localStorage;
                                                        if (store) {
                                                            store.removeItem(key);
                                                        }
                                                    }
                                                });

                                                /**
                                                * @private
                                                *
                                                */
                                                Ext.define('Ext.cf.naming.SessionStore', {
                                                    /**
                                                    * Get item
                                                    *
                                                    * @param {String/Number} key
                                                    *
                                                    */
                                                    getItem: function(key) {
                                                        var store= window.sessionStorage;
                                                        if (store) {
                                                            return store.getItem(key);
                                                        }
                                                    },

                                                    /**
                                                    * Set item
                                                    *
                                                    * @param {String/Number} key
                                                    * @param {String/Number} value
                                                    *
                                                    */
                                                    setItem: function(key,value) {
                                                        var store= window.sessionStorage;
                                                        if (store) {
                                                            store.setItem(key,value);
                                                        }
                                                    },

                                                    /**
                                                    * Remove item
                                                    *
                                                    * @param {String/Number} key
                                                    *
                                                    */
                                                    removeItem: function(key) {
                                                        var store= window.sessionStorage;
                                                        if (store) {
                                                            store.removeItem(key);
                                                        }
                                                    }
                                                });
                                                /**
                                                * @private
                                                *
                                                * Cookie class to read a key from cookie
                                                * https://developer.mozilla.org/en/DOM/document.cookie
                                                */
                                                Ext.define('Ext.cf.naming.CookieStore', {
                                                    /**
                                                    * Has cookie item?
                                                    *
                                                    * @param {String} sKey
                                                    *
                                                    * @return {Boolean} True/False
                                                    *
                                                    */
                                                    hasItem: function (sKey) {
                                                        return (new RegExp("(?:^|;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
                                                    },

                                                    /**
                                                    * Get cookie item
                                                    *
                                                    * @param {String} sKey
                                                    *
                                                    * @return {String} Cookie value
                                                    *
                                                    */
                                                    getItem: function (sKey) {
                                                        if (!sKey || !this.hasItem(sKey)) { return null; }
                                                        return unescape(document.cookie.replace(new RegExp("(?:^|.*;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"), "$1"));
                                                    },

                                                    /**
                                                    * Set cookie item
                                                    *
                                                    * @param {String} sKey
                                                    * @param {String} sValue
                                                    *
                                                    */
                                                    setItem: function (sKey, sValue) {
                                                        document.cookie= escape(sKey)+'='+escape(sValue) + "; path=/;";

                                                        var count = this.countSubStrings(document.cookie, sKey);
                                                        if(count > 1) {
                                                            Ext.cf.util.Logger.error("Found", count, "cookies with the name", sKey);
                                                        }
                                                    },

                                                    /**
                                                    * @private
                                                    * Count no. of substrings in a string
                                                    *
                                                    * @param {String} string
                                                    * @param {String} substring
                                                    *
                                                    */
                                                    countSubStrings: function(string, substring){
                                                        var n = 0;
                                                        var index = 0;

                                                        while(true) {
                                                            index = string.indexOf(substring, index);
                                                            if(index != -1) {
                                                                n++; 
                                                                index += substring.length;
                                                            } else {
                                                                break;
                                                            }
                                                        }

                                                        return n;
                                                    },

                                                    /**
                                                    * Remove cookie item
                                                    *
                                                    * @param {String} sKey
                                                    * @param {String} domain
                                                    *
                                                    */
                                                    removeItem: function (sKey, domain) {
                                                        domain = domain || window.location.host || '';

                                                        if (!sKey || !this.hasItem(sKey)) { return; }  
                                                        var oExpDate = new Date();  
                                                        oExpDate.setDate(oExpDate.getDate() - 1);  

                                                        // remove cookie without path
                                                        document.cookie = escape(sKey) + "=; expires=" + oExpDate.toGMTString() + ";";  

                                                        // remove cookie with path but without domain
                                                        document.cookie = escape(sKey) + "=; expires=" + oExpDate.toGMTString() + "; path=/;";  

                                                        // remove cookie set with path, domain
                                                        document.cookie = escape(sKey) + "=; expires=" + oExpDate.toGMTString() + "; path=/;" + "domain=" + domain + ";";  

                                                        var indexOfDot = domain.indexOf(".");
                                                        if(indexOfDot != -1) {
                                                            // remove cookie from base domain too (cleans cross-domain cookies)
                                                            domain = domain.substr(indexOfDot);

                                                            // remove cookie without path
                                                            document.cookie = escape(sKey) + "=; expires=" + oExpDate.toGMTString() + "; " + "domain=" + domain + ";";    

                                                            // remove cookie with path
                                                            document.cookie = escape(sKey) + "=; expires=" + oExpDate.toGMTString() + "; path=/;" + "domain=" + domain + ";";    
                                                        }        
                                                    }
                                                });


                                                /**
                                                * @private
                                                *
                                                */
                                                Ext.define('Ext.cf.naming.IDStore', {
                                                    requires: [
                                                    'Ext.cf.naming.CookieStore',
                                                    'Ext.cf.naming.LocalStore',
                                                    'Ext.cf.naming.SessionStore'
                                                    ],

                                                    config: {
                                                        cookieStore: null,
                                                        localStore: null,
                                                        sessionStore: null
                                                    },

                                                    /**
                                                    * Constructor
                                                    */
                                                    constructor: function(){
                                                        this.setCookieStore(Ext.create('Ext.cf.naming.CookieStore'));
                                                        this.setLocalStore(Ext.create('Ext.cf.naming.LocalStore'));
                                                        this.setSessionStore(Ext.create('Ext.cf.naming.SessionStore'));
                                                    },

                                                    /**
                                                    * Get the id for the current object of a class.
                                                    *
                                                    * @param {String} klass
                                                    *
                                                    */
                                                    getId: function(klass) {
                                                        var store_key= 'sencha.io.'+klass+'.id';
                                                        return this.getLocalStore().getItem(store_key);
                                                    },

                                                    /**
                                                    * Get the key for the current object of a class.
                                                    *
                                                    * @param {String} klass
                                                    *
                                                    */
                                                    getKey: function(klass) {
                                                        var store_key= 'sencha.io.'+klass+'.key';
                                                        return this.getLocalStore().getItem(store_key);
                                                    },

                                                    /**
                                                    * Get the session id for the current object of a class.
                                                    *
                                                    * @param {String} klass
                                                    *
                                                    */
                                                    getSid: function(klass) {
                                                        var cookie_key = klass+'.sid';
                                                        return this.getCookieStore().getItem(cookie_key);
                                                    },

                                                    /**
                                                    * Set the id for the current object of a class.
                                                    *
                                                    * @param {String} klass
                                                    * @param {Number/String} id
                                                    *
                                                    */
                                                    setId: function(klass,id) {
                                                        var store_key= 'sencha.io.'+klass+'.id';
                                                        return this.getLocalStore().setItem(store_key,id);
                                                    },

                                                    /**
                                                    * Set the key for the current object of a class.
                                                    *
                                                    * @param {String} klass
                                                    * @param {Number/String} key
                                                    *
                                                    */
                                                    setKey: function(klass,key) {
                                                        var store_key= 'sencha.io.'+klass+'.key';
                                                        return this.getLocalStore().setItem(store_key,key);
                                                    },

                                                    /**
                                                    * Set the session id for the current object of a class.
                                                    *
                                                    * @param {String} klass
                                                    * @param {Number/String} sid
                                                    *
                                                    */
                                                    setSid: function(klass,sid) {
                                                        var cookie_key = klass+'.sid';
                                                        return this.getCookieStore().setItem(cookie_key,sid);
                                                    },

                                                    /**
                                                    * Remove
                                                    *
                                                    * @param {String} klass
                                                    * @param {String} thing
                                                    *
                                                    */
                                                    remove: function(klass,thing) {
                                                        var cookie_key = klass+'.'+thing;
                                                        var store_key= 'sencha.io.'+cookie_key;
                                                        this.getCookieStore().removeItem(cookie_key);
                                                        this.getSessionStore().removeItem(cookie_key);
                                                        this.getLocalStore().removeItem(store_key);            
                                                    },

                                                    /**
                                                    * Stash
                                                    *
                                                    * @param {String} klass
                                                    * @param {String} thing
                                                    * @param {String/Number} default_value
                                                    *
                                                    */
                                                    stash: function(klass,thing,default_value) {
                                                        var cookie_key = klass+'.'+thing;
                                                        var store_key= 'sencha.io.'+cookie_key;
                                                        var id_in_cookie = this.getCookieStore().getItem(cookie_key) || default_value;
                                                        var id_in_store = this.getLocalStore().getItem(store_key);
                                                        if (id_in_cookie) {
                                                            if (id_in_store) {
                                                                // it's in the cookie, and in the store...
                                                                if (id_in_cookie!=id_in_store) {
                                                                    // ...but it isn't the same, this shouldn't happen. Fix it.
                                                                    this.getLocalStore().setItem(store_key,id_in_cookie);
                                                                } else {
                                                                    // ...and they are the same.
                                                                }
                                                            } else {
                                                                // it's in the cookie, but not in the store.
                                                                this.getLocalStore().setItem(store_key,id_in_cookie);
                                                            }
                                                        } else {

                                                        }
                                                        return id_in_cookie || id_in_store;
                                                    }

                                                });




                                                /**
                                                * @private
                                                *
                                                */
                                                Ext.define('Ext.cf.naming.Naming', {

                                                    alternateClassName: 'Ext.io.Naming',

                                                    /**
                                                    * Get service descriptor
                                                    *
                                                    * @param {String} serviceName
                                                    * @param {Function} callback
                                                    * @param {Object} scope
                                                    *
                                                    */
                                                    getServiceDescriptor: function(serviceName, callback, scope) {
                                                        if(serviceName == "naming-rpc") {
                                                            callback.call(scope, {
                                                                kind: "rpc",
                                                                style: ["subscriber"],
                                                                access: ["clients", "servers"],
                                                                depends: ["messaging", "naming"],
                                                                methods: [
                                                                "getServiceDescriptor",
                                                                "get", 
                                                                "find",
                                                                "update",
                                                                "add",
                                                                "destroy",
                                                                "getRelatedObject", 
                                                                "getRelatedObjects", 
                                                                "findRelatedObjects",
                                                                "getStore",
                                                                "createRelatedObject",
                                                                "setPicture",
                                                                "dropPicture"
                                                                ]
                                                            });
                                                        } else {
                                                            Ext.io.Io.getMessagingProxy(function(messaging){
                                                                messaging.getService(
                                                                {name: "naming-rpc"},
                                                                function(namingRpc,err) {
                                                                    if(namingRpc){
                                                                        namingRpc.getServiceDescriptor(function(result) {
                                                                            if(result.status == "success") {
                                                                                callback.call(scope, result.value);
                                                                            } else {
                                                                                callback.call(scope, undefined, result.error);
                                                                            }
                                                                        }, serviceName);
                                                                    }else{
                                                                        callback.call(scope, undefined, err);
                                                                    }
                                                                },this
                                                                );
                                                            },this);
                                                        }
                                                    }
                                                });



                                                Ext.require('Ext.cf.Overrides',function(){
                                                    Ext.io_define("Ext.io.data.DirectoryModel", {
                                                        extend: "Ext.data.Model",
                                                        requires: ['Ext.data.proxy.LocalStorage','Ext.data.identifier.Uuid'],
                                                        config: { 
                                                            identifier: 'uuid',
                                                            fields: [
                                                            { name:'name', type: 'string' },
                                                            { name:'type', type: 'string' },
                                                            { name:'meta', type: 'auto' }
                                                            ],
                                                            proxy: {
                                                                id: 'ext-io-data-directory',
                                                                type: 'localstorage'
                                                            }
                                                        }
                                                    });
                                                });

                                                /** 
                                                * @private
                                                *
                                                * A directory of stores in local storage.
                                                *
                                                */
                                                Ext.define('Ext.io.data.Directory', {
                                                    requires: [
                                                    'Ext.data.Store',
                                                    'Ext.io.data.DirectoryModel',
                                                    'Ext.data.Batch' /* EXTJS */
                                                    ],
                                                    store: undefined,

                                                    /**
                                                    * @private
                                                    *
                                                    * Constructor
                                                    *
                                                    * @param {Object} config
                                                    *
                                                    */
                                                    constructor: function(config) {
                                                        this.store = Ext.create('Ext.data.Store', {
                                                            model: 'Ext.io.data.DirectoryModel',
                                                            sorters: [
                                                            {
                                                                property : 'name',
                                                                direction: 'ASC'
                                                            }               
                                                            ],
                                                            autoLoad: true,
                                                            autoSync: true
                                                        });
                                                    },

                                                    /**
                                                    * Get Store
                                                    *
                                                    * @param {String} name
                                                    *
                                                    * @return {Object} Store
                                                    *
                                                    */
                                                    get: function(name) {
                                                        var index = this.store.find("name", name);
                                                        if(index == -1) { // not found
                                                            return null;
                                                        } else {
                                                            return this.store.getAt(index).data;
                                                        }
                                                    },

                                                    /**
                                                    * Get all stores
                                                    *
                                                    * @return {Array} Stores
                                                    *
                                                    */
                                                    getAll: function() {
                                                        var entries = this.store.getRange();
                                                        var all = [];

                                                        for(var i = 0; i < entries.length; i++) {
                                                            all[i] = entries[i].data;   
                                                        }

                                                        return all;
                                                    },

                                                    /**
                                                    * Get each store entry
                                                    *
                                                    * @param {Function} callback
                                                    * @param {Object} scope
                                                    *
                                                    * @return {Object} Store entry
                                                    *
                                                    */
                                                    each: function(callback, scope) {
                                                        this.store.each(function(entry) {
                                                            return callback.call(scope || entry.data, entry.data);
                                                        }, this);  
                                                    },

                                                    /**
                                                    * Add new store entry
                                                    *
                                                    * @param {String} name
                                                    * @param {String} type
                                                    * @param {String} meta
                                                    *
                                                    */
                                                    add: function(name, type, meta) {
                                                        var entry = Ext.create('Ext.io.data.DirectoryModel', {
                                                            name: name,
                                                            type: type,
                                                            meta: meta
                                                        });

                                                        this.store.add(entry);
                                                    },

                                                    /**
                                                    * Update store
                                                    *
                                                    * @param {String} name
                                                    * @param {String} type
                                                    * @param {String} meta
                                                    *
                                                    */
                                                    update: function(name, type, meta) {
                                                        var index = this.store.find("name", name);
                                                        if(index == -1) { // not found
                                                            this.add(name, type, meta);
                                                        } else {
                                                            var record = this.store.getAt(index);
                                                            record.set("type", type);
                                                            record.set("meta", meta);
                                                            record.save();
                                                        }
                                                    },

                                                    /**
                                                    * Remove store
                                                    *
                                                    * @param {String} name
                                                    *
                                                    */
                                                    remove: function(name) {
                                                        var index = this.store.find("name", name);
                                                        if(index != -1) {
                                                            this.store.removeAt(index);
                                                        }

                                                        return index;
                                                    }
                                                });


                                                /**
                                                * @private
                                                *
                                                * Registers or Authenticates a device with the Sencha.io servers.
                                                *
                                                */
                                                Ext.define('Ext.cf.messaging.DeviceAllocator', {

                                                    requires: ['Ext.cf.util.Logger', 'Ext.cf.util.ErrorHelper'],

                                                    statics: {
                                                        /** 
                                                        * Register
                                                        *
                                                        * @param {String} url
                                                        * @param {String/Number} appId
                                                        * @param {Function} callback
                                                        *
                                                        */      
                                                        register: function(url, appId, callback) {
                                                            this.callServer(url, "/device/register", {appId: appId}, callback);
                                                        },

                                                        /** 
                                                        * Authenticate
                                                        *
                                                        * @param {String} url
                                                        * @param {String/Number} deviceSid
                                                        * @param {String/Number} deviceId
                                                        * @param {Function} callback
                                                        *
                                                        */      
                                                        authenticate: function(url, deviceSid, deviceId, callback) {
                                                            this.callServer(url, "/device/authenticate", {deviceSid: deviceSid, deviceId: deviceId}, callback);
                                                        },

                                                        /** 
                                                        * Call server
                                                        *
                                                        * @param {String} url
                                                        * @param {String} api
                                                        * @param {Object} data
                                                        * @param {Function} callback
                                                        *
                                                        */      
                                                        callServer: function(url, api, data, callback) {
                                                            Ext.Ajax.request({
                                                                method: "POST",
                                                                url: url + api,
                                                                params: {},
                                                                jsonData: data,
                                                                scope: this,
                                                                callback: function(options, success, response) {
                                                                    if(response && response.status === 0) {
                                                                        // network is down
                                                                        callback({status:'error', error: Ext.cf.util.ErrorHelper.get('NETWORK_ERROR') });
                                                                    } else {
                                                                        if(success) {
                                                                            callback(Ext.decode(response.responseText));
                                                                        } else {
                                                                            callback({status:'error', error: {code: 'API_ERROR', message:'Error during API call' + api + ' Status ' + response.status }});
                                                                        }
                                                                    }
                                                                }
                                                            });            
                                                        }
                                                    }
                                                });

                                                /**
                                                * @private
                                                *
                                                * Wraps an envelope and its contained message in a Model so
                                                * that it can be stored in a Store.
                                                *
                                                */
                                                Ext.require('Ext.cf.Overrides',function(){
                                                    Ext.io_define('Ext.cf.messaging.EnvelopeWrapper', {
                                                        requires: ['Ext.data.identifier.Uuid'],
                                                        extend: 'Ext.data.Model',
                                                        config: { 
                                                            identifier: 'uuid',
                                                            fields: [
                                                            {name: 'e', type: 'auto'}, // envelope
                                                            {name: 'ts', type: 'integer'} // timestamp
                                                            ]
                                                        }
                                                    });
                                                });

                                                /**
                                                * @private
                                                *
                                                * Polling Transport
                                                *
                                                */
                                                Ext.define('Ext.cf.messaging.transports.PollingTransport', {
                                                    requires: ['Ext.cf.util.Logger', 'Ext.cf.util.ErrorHelper'],

                                                    mixins: {
                                                        observable: "Ext.util.Observable"
                                                    },

                                                    intervalId: null,

                                                    config: {
                                                        url: 'http://msg.sencha.io',
                                                        deviceId: null,
                                                        deviceSid: null,
                                                        piggybacking: true,
                                                        maxEnvelopesPerReceive: 10,
                                                        pollingDuration: 5000
                                                    },

                                                    /** 
                                                    * Constructor
                                                    *
                                                    * @param {Object} config
                                                    *
                                                    */
                                                    constructor: function(config) {
                                                        this.initConfig(config);
                                                        this.mixins.observable.constructor.call(this);

                                                        return this;
                                                    },

                                                    /** 
                                                    * Get receive Invoker
                                                    *
                                                    */
                                                    getReceiveInvoker: function() {
                                                        var self = this;

                                                        var callback = function(err, response) {
                                                            self.responseHandler(err, response);
                                                        };

                                                        var params = { deviceId: self.config.deviceId, max: self.config.maxEnvelopesPerReceive} ;

                                                        if(self.config.deviceSid) {
                                                            params.deviceSid = self.config.deviceSid;
                                                        }

                                                        self.ajaxRequest("/receive", params, {}, callback);
                                                    },

                                                    /** 
                                                    * Start
                                                    *
                                                    */
                                                    start: function() {
                                                        var self = this;
                                                        this.intervalId = setInterval(function() { self.getReceiveInvoker();} , this.config.pollingDuration);

                                                        this.checkVersion();    
                                                    },

                                                    /** 
                                                    * Check version
                                                    *
                                                    */
                                                    checkVersion: function() {
                                                        this.ajaxRequest("/version", { }, { v: Ext.getVersion("sio").toString() }, function(err, response) {
                                                        Ext.cf.util.Logger.debug("checkVersion", err, response);
                                                        if(err) {
                                                            Ext.cf.util.Logger.error("Error performing client/server compatibility check", err);
                                                        } else {
                                                            try {
                                                                response = Ext.decode(response.responseText);
                                                                if(response && response.code === 'INCOMPATIBLE_VERSIONS') {
                                                                    Ext.cf.util.Logger.error(response.message);
                                                                    throw response.message;
                                                                }
                                                            } catch(e) {
                                                                Ext.cf.util.Logger.error("Error decoding version response", response.responseText);
                                                            }
                                                        }
                                                    });
                                                },

                                                /** 
                                                * Stop
                                                *
                                                */
                                                stop: function() {
                                                    clearInterval(this.intervalId);
                                                },

                                                /** 
                                                * Response handler
                                                *
                                                * @param {Object} err
                                                * @param {Object} response
                                                *
                                                */
                                                responseHandler: function(err, response) {
                                                    var self = this;

                                                    if(!err) {
                                                        Ext.cf.util.Logger.debug("PollingTransport",this.config.url,"response:",response.responseText);
                                                        var data = Ext.decode(response.responseText);

                                                        if(data) {
                                                            var envelopes = data.envelopes;
                                                            var hasMore = data.hasMore;

                                                            if(hasMore) { // if there are more messages, make another RECEIVE call immediately
                                                                setTimeout(function() { self.getReceiveInvoker();}, 0);
                                                            }

                                                            if(envelopes) {
                                                                for(var i = 0; i < envelopes.length; i++) {
                                                                    this.fireEvent('receive', envelopes[i]);
                                                                }
                                                            } else {
                                                                Ext.cf.util.Logger.warn("PollingTransport",this.config.url,"envelopes missing in response",response.status); 
                                                            }
                                                        } else {
                                                            Ext.cf.util.Logger.warn("PollingTransport",this.config.url,"response text is null",response.status);  
                                                        }
                                                    } else {
                                                        Ext.cf.util.Logger.warn("PollingTransport",this.config.url,"response error:",response);
                                                    }
                                                },

                                                /** 
                                                * Send message
                                                *
                                                * @param {Object} message
                                                * @param {Function} callback
                                                *
                                                */
                                                send: function(message, callback) {
                                                    var self = this;

                                                    this.ajaxRequest("/send", { max: this.config.maxEnvelopesPerReceive }, message, function(err, response, doBuffering) {
                                                    callback(err, doBuffering);

                                                    if(self.config.piggybacking) {
                                                        self.responseHandler(err, response);
                                                    }

                                                    if(err && response && response.status === 403) {
                                                        self.fireEvent('forbidden', err);
                                                    }
                                                });
                                            },

                                            /** 
                                            * Subscribe
                                            *
                                            * @param {Object} params
                                            * @param {Function} callback
                                            *
                                            */
                                            subscribe: function(params, callback) {
                                                var self = this;

                                                if(self.config.deviceSid) {
                                                    params.deviceSid = self.config.deviceSid;
                                                }

                                                this.ajaxRequest("/subscribe", params, {}, callback);
                                            },

                                            /** 
                                            * Unsubscribe
                                            *
                                            * @param {Object} params
                                            * @param {Function} callback
                                            *
                                            */
                                            unsubscribe: function(params, callback) {
                                                var self = this;

                                                if(self.config.deviceSid) {
                                                    params.deviceSid = self.config.deviceSid;
                                                }

                                                this.ajaxRequest("/unsubscribe", params, {}, callback);
                                            },

                                            /** 
                                            * AJAX Request
                                            *
                                            * @param {String} path
                                            * @param {Object} params
                                            * @param {Object} jsonData
                                            * @param {Function} callback
                                            *
                                            */
                                            ajaxRequest: function(path, params, jsonData, callbackFunction) {
                                                if(!this.config.piggybacking) {
                                                    params.pg = 0; // client has turned off piggybacking
                                                }

                                                Ext.Ajax.request({
                                                    method: "POST",
                                                    url: this.config.url + path,
                                                    params: params,
                                                    jsonData: jsonData,
                                                    scope: this,

                                                    callback: function(options, success, response) {
                                                        if(callbackFunction) {
                                                            if(response && response.status === 0) { // status 0 = server down / network error
                                                                callbackFunction(Ext.cf.util.ErrorHelper.get('NETWORK_ERROR'), null, true); // request can be buffered
                                                            } else {
                                                                if(success) {
                                                                    callbackFunction(null, response);
                                                                } else {
                                                                    var err = Ext.cf.util.ErrorHelper.decode(response.responseText);
                                                                    callbackFunction(err, response, false); // no buffering, server replied
                                                                }
                                                            }
                                                        }
                                                    }
                                                });
                                            }
                                        });


                                        /**
                                        * @private
                                        *
                                        * Socket Transport
                                        *
                                        */
                                        Ext.define('Ext.cf.messaging.transports.SocketIoTransport', {
                                            mixins: {
                                                observable: "Ext.util.Observable"
                                            },

                                            config: {
                                                url: 'http://msg.sencha.io',
                                                deviceId: null,
                                                deviceSid: null
                                            },

                                            /** 
                                            * Constructor
                                            *
                                            * @param {Object} config
                                            *
                                            */  
                                            constructor : function(config) {
                                                config = config || {};
                                                Ext.apply(this, config);
                                                /** @private
                                                * @event receive
                                                *  Connection recives an envelope from the server.
                                                * @param {Object} envelope from the server.
                                                */
                                                /** @private
                                                * @event error
                                                *  An error condition is recived via the socket connnection
                                                * @param {Object} error The error Message.
                                                */
                                                this.mixins.observable.constructor.call(this);
                                            },


                                            /** 
                                            * connects to the server and registers to receive messages for the clientID passed
                                            *
                                            * @private
                                            *
                                            */
                                            start: function() {
                                                Ext.cf.util.Logger.debug("connecting to ", this.url);
                                                var me = this, error;

                                                // check if socket.io has been included on the page
                                                if(typeof(io) === "undefined") {
                                                    error = "SocketIoTransport needs the socket.io 0.8.7 client library to work, but that library was not found. Please include the library and try again.";
                                                    Ext.cf.util.Logger.error(error);  
                                                    throw error;
                                                }

                                                // check if we are using the same version as the server
                                                if(io.version !== '0.8.7') {
                                                    error = "SocketIoTransport needs socket.io version 0.8.7, but the included version is " + io.version;
                                                    Ext.cf.util.Logger.error(error);  
                                                    throw error;
                                                }

                                                me.socket = io.connect(me.url);

                                                me.socket.on('receive', function(data) {
                                                    me._receive(data);
                                                });

                                                me.socket.on('connect', function () {
                                                    Ext.cf.util.Logger.debug("start", me.deviceId, me.deviceSid);

                                                    var params = {"deviceId": me.deviceId};

                                                    if(me.deviceSid) {
                                                        params.deviceSid = me.deviceSid;
                                                    }

                                                    me.socket.emit('start', params, function(err) {
                                                        if(err) {
                                                            Ext.cf.util.Logger.error(err.message, err);
                                                        }
                                                    });

                                                    var actualTransportName = me.socket.socket.transport.name;
                                                    if(actualTransportName !== "websocket") {
                                                        Ext.cf.util.Logger.warn("SocketIoTransport: Could not use websockets! Falling back to", actualTransportName);
                                                    }

                                                    me.checkVersion();
                                                });
                                            },

                                            /** 
                                            * Check version
                                            *
                                            */
                                            checkVersion: function() {
                                                this._emit('version', { v: Ext.getVersion("sio").toString() }, function(err, status, response) {
                                                Ext.cf.util.Logger.debug("checkVersion", err, status, response);
                                                if(err) {
                                                    Ext.cf.util.Logger.error("Error performing client/server compatibility check", err);
                                                } else {
                                                    if(response && response.code === 'INCOMPATIBLE_VERSIONS') {
                                                        Ext.cf.util.Logger.error(response.message);
                                                        throw response.message;
                                                    }
                                                }
                                            });
                                        },

                                        /** 
                                        * Send message
                                        *
                                        * @param {Object} message
                                        * @param {Function} callback
                                        *
                                        */
                                        send: function(message, callback) {
                                            var self = this;

                                            this._emit('send', message, function(err, status) {
                                                if(callback) {
                                                    callback(err);
                                                }

                                                if(err && status && status === 403) {
                                                    self.fireEvent('forbidden', err);
                                                }
                                            });
                                        },

                                        /** 
                                        * Subscribe
                                        *
                                        * @param {Object} message
                                        * @param {Function} callback
                                        *
                                        */
                                        subscribe: function(message, callback) {
                                            this._emit('subscribe', message, function(err, status) {
                                                if(callback) {
                                                    callback(err);
                                                }
                                            });
                                        },

                                        /** 
                                        * Unsubscribe
                                        *
                                        * @param {Object} message
                                        * @param {Function} callback
                                        *
                                        */
                                        unsubscribe: function(message, callback) {
                                            this._emit('unsubscribe', message, function(err, status) {
                                                if(callback) {
                                                    callback(err);
                                                }
                                            });
                                        },

                                        /** 
                                        * Emit
                                        *
                                        * @param {Object} channel
                                        * @param {Object} message
                                        * @param {Function} callback
                                        *
                                        */
                                        _emit: function(channel, message, callback) {
                                            if(this.socket){
                                                this.socket.emit(channel, message, callback);
                                            }
                                        },

                                        /** 
                                        * Receive
                                        *
                                        * @param {Object} data
                                        *
                                        */
                                        _receive: function(data){
                                            if(data.envelope) {
                                                this.fireEvent('receive', data.envelope);
                                            } else if(data.envelopes && data.envelopes.length > 0) {
                                                var l = data.envelopes.length;
                                                for(var i =0; i < l; i++ ) {
                                                    this.fireEvent('receive', data.envelopes[i]);
                                                }
                                            }
                                        }
                                    });


                                    /**
                                    * @private
                                    *
                                    */
                                    Ext.define('Ext.cf.messaging.Transport', {
                                        requires: [
                                        'Ext.data.proxy.LocalStorage',
                                        'Ext.cf.messaging.EnvelopeWrapper',
                                        'Ext.cf.messaging.transports.PollingTransport',
                                        'Ext.cf.messaging.transports.SocketIoTransport',
                                        'Ext.cf.util.ErrorHelper'
                                        ],

                                        mixins: {
                                            observable: "Ext.util.Observable"
                                        },

                                        transport: null,

                                        listeners: {},

                                        undeliveredIncomingStore: null,

                                        retryIncomingInProgress: false,

                                        undeliveredOutgoingStore: null,

                                        retryOutgoingInProgress: false,

                                        /** @private
                                        * Mapping of transport classes to short name
                                        * transportName provided by config used for transport lookup.
                                        */
                                        transportClasses: {
                                            "polling": 'Ext.cf.messaging.transports.PollingTransport',
                                            "socket": 'Ext.cf.messaging.transports.SocketIoTransport'
                                        },

                                        config: {
                                            url: 'http://msg.sencha.io',
                                            deviceId: '',
                                            piggybacking: true,
                                            maxEnvelopesPerReceive: 10,
                                            transportName: "socket",
                                            debug: false, /* pass debug flag to server in envelope */

                                            undeliveredIncomingRetryInterval: 5 * 1000, // every 5 secs
                                            undeliveredIncomingExpiryInterval: 60 * 60 * 24 * 1000, // 24 hours
                                            undeliveredIncomingMaxCount: 100, // max channel size after which we start dropping new messages

                                            undeliveredOutgoingRetryInterval: 5 * 1000, // every 5 secs
                                            undeliveredOutgoingExpiryInterval: 60 * 60 * 24 * 1000, // 24 hours
                                            undeliveredOutgoingMaxCount: 100 // max channel size after which we start dropping new messages
                                        },

                                        /** 
                                        * Constructor
                                        *
                                        * @param {Object} config
                                        *
                                        */
                                        constructor: function(config) {
                                            var self = this;

                                            this.initConfig(config);

                                            Ext.cf.util.Logger.info("Transport type ", this.getTransportName());

                                            var directory= Ext.io.Io.getStoreDirectory(); 
                                            this.undeliveredIncomingStore = Ext.create('Ext.data.Store', {
                                                model: 'Ext.cf.messaging.EnvelopeWrapper',
                                                proxy: {
                                                    type: 'localstorage', 
                                                    id: 'sencha-io-undelivered-incoming-envelopes'
                                                },
                                                autoLoad: true,
                                                autoSync: false
                                            });

                                            this.undeliveredOutgoingStore = Ext.create('Ext.data.Store', {
                                                model: 'Ext.cf.messaging.EnvelopeWrapper',
                                                proxy: {
                                                    type: 'localstorage', 
                                                    id: 'sencha-io-undelivered-outgoing-envelopes'
                                                },
                                                autoLoad: true,
                                                autoSync: false
                                            });

                                            directory.update("sencha-io-undelivered-incoming-envelopes", "channel", { direction: "in" });
                                            directory.update("sencha-io-undelivered-outgoing-envelopes", "channel", { direction: "out" });

                                            Ext.cf.util.Logger.info("Undelivered incoming retry interval: " + this.getUndeliveredIncomingRetryInterval());
                                            setInterval(function() {
                                                self.retryUndeliveredIncomingMessages();  
                                            }, this.getUndeliveredIncomingRetryInterval());

                                            Ext.cf.util.Logger.info("Undelivered outgoing retry interval: " + this.getUndeliveredOutgoingRetryInterval());
                                            setInterval(function() {
                                                self.retryUndeliveredOutgoingMessages();  
                                            }, this.getUndeliveredOutgoingRetryInterval());

                                            Ext.cf.util.Logger.debug("Transport config", Ext.encode(this.config));

                                            this.transport = Ext.create(this.transportClasses[this.getTransportName()], this.config);
                                            this.transport.start();
                                            this.transport.on('receive', function(envelope) { self.receive(envelope); });

                                            this.setupForbiddenStatusHandler();

                                            return this;
                                        },

                                        /** 
                                        * Setup forbidden status handler
                                        *
                                        */      
                                        setupForbiddenStatusHandler: function() {
                                            var self = this;

                                            this.transport.on('forbidden', function(err) {
                                                if(err && err.code === 'INVALID_SID') {
                                                    // One or more sids are invalid. Fire an event for each invalid Sid
                                                    for(k in err.details) {
                                                        if(err.details[k] === 'INVALID') {
                                                            self.removeSidFromStores(k);
                                                            self.fireEvent(k + 'Invalid');
                                                        }
                                                    }
                                                }
                                            });
                                        },

                                        /** 
                                        * Setup forbidden status handler
                                        *
                                        * @param {String/Number} sid
                                        */      
                                        removeSidFromStores: function(sid) {
                                            var idstore = Ext.io.Io.getIdStore();

                                            switch(sid) {
                                                case 'deviceSid':
                                                idstore.remove('device', 'sid');
                                                break;
                                                case 'developerSid':
                                                idstore.remove('developer', 'sid');
                                                break;
                                                case 'userSid':
                                                idstore.remove('user', 'sid');
                                                break;
                                                default:
                                                Ext.cf.util.warn('Unknown sid, cannot remove: ', sid);
                                                break;
                                            }
                                        },

                                        /** 
                                        * Retry undelivered outgoing messages
                                        *
                                        */
                                        retryUndeliveredOutgoingMessages: function() {
                                            var self = this;

                                            if(self.retryOutgoingInProgress) {
                                                Ext.cf.util.Logger.debug("Another retry (outgoing) already in progress, skipping...");
                                                return;
                                            }

                                            var pendingCount = this.undeliveredOutgoingStore.getCount();
                                            if(pendingCount > 0) {
                                                Ext.cf.util.Logger.debug("Transport trying redelivery for outgoing envelopes:", pendingCount);
                                            } else {
                                                return;
                                            }

                                            self.retryOutgoingInProgress = true;

                                            try {
                                                var now = new Date().getTime();
                                                var expiryInterval = self.getUndeliveredOutgoingExpiryInterval();

                                                // get the first envelope for redelivery
                                                var record = this.undeliveredOutgoingStore.getAt(0);
                                                var envelope = record.data.e;

                                                // Expiry based on age
                                                if((now - record.data.ts) > expiryInterval) {
                                                    Ext.cf.util.Logger.warn("Buffered outgoing envelope is too old, discarding", record);
                                                    this.undeliveredOutgoingStore.remove(record);
                                                    self.undeliveredOutgoingStore.sync();
                                                    self.retryOutgoingInProgress = false;
                                                } else {
                                                    if(window.navigator.onLine) { // attempt redelivery only if browser says we're online
                                                        Ext.cf.util.Logger.debug("Transport trying redelivery for outgoing envelope: " + record);
                                                        self.transport.send(envelope, function(err, doBuffering) {
                                                            if(doBuffering) {
                                                                // could not be delivered again, do nothing
                                                                Ext.cf.util.Logger.debug("Redelivery failed for outgoing envelope, keeping it channeld", record, err);

                                                                self.retryOutgoingInProgress = false;
                                                            } else {
                                                                // sent to server, now remove it from the channel
                                                                Ext.cf.util.Logger.debug("Delivered outgoing envelope on retry", record);
                                                                self.undeliveredOutgoingStore.remove(record);
                                                                self.undeliveredOutgoingStore.sync();
                                                                self.retryOutgoingInProgress = false;
                                                            }
                                                        });
                                                    } else {
                                                        Ext.cf.util.Logger.debug("Browser still offline, not retrying delivery for outgoing envelope", record);  
                                                        self.retryOutgoingInProgress = false;
                                                    }
                                                }
                                            } catch(e) {
                                                // if an exception occurs, ensure retryOutgoingInProgress is false
                                                // otherwise future retries will be skipped!
                                                self.retryOutgoingInProgress = false;

                                                Ext.cf.util.Logger.debug("Error during retryUndeliveredOutgoingMessages", e);
                                            }
                                        },

                                        /** 
                                        * Retry undelivered incoming messages
                                        *
                                        */
                                        retryUndeliveredIncomingMessages: function() {
                                            var self = this;

                                            if(self.retryIncomingInProgress) {
                                                Ext.cf.util.Logger.debug("Another retry (incoming) already in progress, skipping...");
                                                return;
                                            }

                                            self.retryIncomingInProgress = true;
                                            try {
                                                var now = new Date().getTime();
                                                var expiryInterval = self.getUndeliveredIncomingExpiryInterval();

                                                var undelivered = this.undeliveredIncomingStore.getRange();
                                                if(undelivered.length > 0) {
                                                    Ext.cf.util.Logger.debug("Transport trying redelivery for incoming envelopes:", undelivered.length);
                                                }

                                                for(var i = 0; i < undelivered.length; i++) {
                                                    var record = undelivered[i];
                                                    var envelope = record.data.e;

                                                    var map = this.listeners[envelope.service];
                                                    if(map) {
                                                        map.listener.call(map.scope, envelope);
                                                        Ext.cf.util.Logger.debug("Delivered incoming envelope on retry", record);
                                                        this.undeliveredIncomingStore.remove(record);
                                                    } else {
                                                        // Still can't deliver the message... see if the message is eligible for expiry

                                                        // Expiry based on age
                                                        if((now - record.data.ts) > expiryInterval) {
                                                            Ext.cf.util.Logger.warn("Buffered incoming envelope is too old, discarding", record);
                                                            this.undeliveredIncomingStore.remove(record);
                                                        }
                                                    }
                                                }
                                            } finally {
                                                // even if an exception occurs, sync the store and ensure retryIncomingInProgress is false
                                                // otherwise future retries will be skipped!
                                                this.undeliveredIncomingStore.sync();
                                                self.retryIncomingInProgress = false;
                                            }
                                        },

                                        /** 
                                        * Get Developer sid
                                        *
                                        * @return {String/Number} Developer Sid
                                        *
                                        */
                                        getDeveloperSid: function() {
                                            return Ext.io.Io.getIdStore().getSid('developer');
                                        },

                                        /** 
                                        * Get Device sid
                                        *
                                        * @return {String/Number} Device Sid
                                        *
                                        */
                                        getDeviceSid: function() {
                                            return Ext.io.Io.getIdStore().getSid('device');
                                        },

                                        /** 
                                        * Get user sid
                                        *
                                        * @return {String/Number} User Sid
                                        *
                                        */
                                        getUserSid: function() {
                                            return Ext.io.Io.getIdStore().getSid('user');
                                        },

                                        /** 
                                        * Set listener
                                        *
                                        * @param {String} serviceName
                                        * @param {Object} listener
                                        * @param {Object} scope
                                        *
                                        */
                                        setListener: function(serviceName, listener, scope) {
                                            this.listeners[serviceName] = {listener:listener, scope:scope};
                                        },

                                        /** 
                                        * Remove listener
                                        *
                                        * @param {String} serviceName
                                        *
                                        */
                                        removeListener: function(serviceName) {
                                            delete this.listeners[serviceName];
                                        },

                                        /** 
                                        * Send to service
                                        *
                                        * @param {String} serviceName
                                        * @param {Object} payload
                                        * @param {Function} callback
                                        * @param {Object} scope
                                        *
                                        */
                                        sendToService: function(serviceName, payload, callbackFunction, scope) {
                                            this.send({service: serviceName, msg: payload}, callbackFunction, scope);
                                        },

                                        /** 
                                        * Send to client
                                        *
                                        * @param {String/Number} targetClientId
                                        * @param {Object} payload
                                        * @param {Function} callback
                                        * @param {Object} scope
                                        *
                                        */
                                        sendToClient: function(targetClientId, payload, callbackFunction, scope) {
                                            if(payload && typeof(payload) === "object") {
                                                payload.to = targetClientId;
                                                this.send({service: "courier", msg: payload}, callbackFunction, scope);
                                            } else {
                                                Ext.cf.util.Logger.error("Message is not a JSON object");
                                                callbackFunction.call(scope, Ext.cf.util.ErrorHelper.get('MESSAGE_NOT_JSON', payload));
                                            }
                                        },

                                        /** 
                                        * Send
                                        *
                                        * @param {Object} envelope
                                        * @param {Function} callback
                                        * @param {Object} scope
                                        *
                                        */
                                        send: function(envelope, callbackFunction, scope) {
                                            var self = this;

                                            if(this.getDebug()) {
                                                envelope.debug = true;
                                            }

                                            envelope.from = this.getDeviceId();

                                            // pass deviceSid if available
                                            var deviceSid = this.getDeviceSid();
                                            if(deviceSid) {
                                                envelope.deviceSid = deviceSid;  
                                            }

                                            // pass developerSid if available
                                            var developerSid = this.getDeveloperSid();
                                            if(developerSid) {
                                                envelope.developerSid = developerSid;  
                                            }

                                            // pass userSid if available
                                            var userSid = this.getUserSid();
                                            if(userSid) {
                                                envelope.userSid = userSid;  
                                            }


                                            Ext.cf.util.Logger.debug("Transport.send " + JSON.stringify(envelope));

                                            if(window.navigator.onLine) {
                                                // browser says we are online, which may or may not be true. Try delivery and see...
                                                this.transport.send(envelope, function(err, doBuffering) {
                                                    if(callbackFunction) {
                                                        callbackFunction.call(scope, err);

                                                        // handling PollingTransport for now. TODO: handle socket transport
                                                        if(err && doBuffering) {
                                                            // could not send outgoing envelope. Buffer it!
                                                            Ext.cf.util.Logger.warn("Error delivering outgoing envelope", envelope, err);
                                                            self.bufferOutgoingEnvelope(envelope);
                                                        }
                                                    }
                                                });
                                            } else {
                                                // Browser says we're offline, so we MUST be offline. Don't even bother sending
                                                self.bufferOutgoingEnvelope(envelope);
                                            }
                                        },

                                        /** 
                                        * Buffer outgoing envelope
                                        *
                                        * @param {Object} envelope
                                        *
                                        */
                                        bufferOutgoingEnvelope: function(envelope) {
                                            if(this.undeliveredOutgoingStore) {
                                                if(this.undeliveredOutgoingStore.getCount() < this.getUndeliveredOutgoingMaxCount()) {
                                                    var record = this.undeliveredOutgoingStore.add(Ext.create('Ext.cf.messaging.EnvelopeWrapper', {e: envelope, ts: (new Date().getTime())}));
                                                    this.undeliveredOutgoingStore.sync();
                                                    Ext.cf.util.Logger.debug("Added to outgoing channel, will retry delivery later", record);
                                                } else {
                                                    // channel is full, start dropping messages now
                                                    Ext.cf.util.Logger.warn("Channel full, discarding undeliverable outgoing message!", envelope);
                                                }
                                            }
                                        },

                                        /** 
                                        * Receive
                                        *
                                        * @param {Object} envelope
                                        *
                                        */
                                        receive: function(envelope) {
                                            Ext.cf.util.Logger.debug("Transport.receive " + JSON.stringify(envelope));

                                            // dispatch it to the correct service listener
                                            if(this.listeners[envelope.service]) {
                                                var map = this.listeners[envelope.service];
                                                map.listener.call(map.scope, envelope);
                                            } else {
                                                Ext.cf.util.Logger.error("Transport.receive no listener for service '",envelope.service,"'.",this.listeners);

                                                // check current length of channel
                                                if(this.undeliveredIncomingStore) {
                                                    if(this.undeliveredIncomingStore.getCount() < this.getUndeliveredIncomingMaxCount()) {
                                                        // add it to the undelivered store for trying delivery later
                                                        var record = this.undeliveredIncomingStore.add(Ext.create('Ext.cf.messaging.EnvelopeWrapper', {e: envelope, ts: (new Date().getTime())}));
                                                        Ext.cf.util.Logger.debug("Added to incoming channel, will retry delivery later", record);

                                                        this.undeliveredIncomingStore.sync();      
                                                    } else {
                                                        // channel is full, start dropping messages now
                                                        Ext.cf.util.Logger.warn("Channel full, discarding undeliverable incoming message!", envelope);
                                                    }
                                                }
                                            }
                                        },

                                        /** 
                                        * Subscribe
                                        *
                                        * @param {String} serviceName
                                        * @param {Function} callback
                                        * @param {Object} scope
                                        *
                                        */
                                        subscribe: function(serviceName, callbackFunction, scope) {
                                            Ext.cf.util.Logger.debug("Transport.subscribe " + serviceName);

                                            var params = { deviceId: this.getDeviceId(), service: serviceName };

                                            this.transport.subscribe(params, function(err) {
                                                if(callbackFunction){
                                                    callbackFunction.call(scope, err);
                                                }
                                            });
                                        },

                                        /** 
                                        * Unsubscribe
                                        *
                                        * @param {String} serviceName
                                        * @param {Function} callback
                                        * @param {Object} scope
                                        *
                                        */
                                        unsubscribe: function(serviceName, callbackFunction, scope) {
                                            Ext.cf.util.Logger.debug("Transport.unsubscribe " + serviceName);

                                            var params = { deviceId: this.getDeviceId(), service: serviceName };

                                            this.transport.unsubscribe(params, function(err) {
                                                if(callbackFunction){
                                                    callbackFunction.call(scope, err);
                                                }
                                            });
                                        }
                                    });

                                    /**
                                    * @private
                                    *
                                    * Remote Procedure Call
                                    *
                                    */
                                    Ext.define('Ext.cf.messaging.Rpc', {

                                        requires: ['Ext.cf.util.Logger', 'Ext.cf.util.ErrorHelper'],

                                        config: {
                                            /**
                                            * @cfg transport
                                            * @accessor
                                            */
                                            transport: null,
                                            /**
                                            * @cfg rpcTimeoutDuration
                                            * @accessor
                                            */
                                            rpcTimeoutDuration: 60 * 1000, // 1 minute
                                            /**
                                            * @cfg rpcTimeoutCheckInterval
                                            * @accessor
                                            */        
                                            rpcTimeoutCheckInterval: 5 * 1000 // check for timeouts every 5 sec
                                        },

                                        /**
                                        * @private
                                        */
                                        rpcTimeoutInterval: null,

                                        /** 
                                        * Constructor
                                        *
                                        * @param {Object} config
                                        *
                                        */
                                        constructor: function(config) {
                                            var self = this;
                                            this.initConfig(config);
                                            this.rpcTimeoutInterval = setInterval(function() {
                                                self.processRpcTimeouts();
                                            }, this.getRpcTimeoutCheckInterval());
                                            return this;
                                        },

                                        /**
                                        * @private
                                        * 
                                        * Maps correspondence ids onto callback functions
                                        */
                                        callMap: {},

                                        /** 
                                        * Process Rpc timeouts
                                        *
                                        */
                                        processRpcTimeouts: function() {
                                            var self = this;

                                            var currentTime = new Date().getTime();
                                            var rpcTimeoutDuration = this.getRpcTimeoutDuration();
                                            var toRemove = [];

                                            try {
                                                for(var corrId in this.callMap) {
                                                    var map = this.callMap[corrId];
                                                    if(map && map.requestTime && ((currentTime - map.requestTime) > rpcTimeoutDuration)) {
                                                        toRemove.push(corrId);
                                                    }
                                                }

                                                // remove the timed out corrIds, and return a timeout error to the callers
                                                toRemove.forEach(function(corrId) {
                                                    var map = self.callMap[corrId];
                                                    if(map && map.callback) {
                                                        delete self.callMap[corrId];

                                                        Ext.cf.util.Logger.warn("RPC request has timed out as there was no reply from the server. Correlation Id:", corrId);
                                                        Ext.cf.util.Logger.warn("See documentation for Ext.io.Io.setup (rpcTimeoutDuration, rpcTimeoutCheckInterval) to configure the timeout check");

                                                        var err = Ext.cf.util.ErrorHelper.get('RPC_TIMEOUT', corrId);
                                                        map.callback({ status:"error", error: err });
                                                    }
                                                });
                                            } catch(e) {
                                                Ext.cf.util.Logger.error("Error running RPC timeout checks", e);
                                            }
                                        },


                                        /** 
                                        * @private
                                        *
                                        */
                                        currentCallId: 0,

                                        /** 
                                        * Generate call id
                                        *
                                        */
                                        generateCallId: function() {
                                            return ++this.currentCallId;
                                        },

                                        /** 
                                        * Subscribe
                                        *
                                        * @param {Object} envelope
                                        *
                                        */
                                        subscribe: function(envelope) {
                                            // got a response envelope, now handle it
                                            this.callback(envelope.msg["corr-id"], envelope);
                                        },

                                        /** 
                                        * Dispatch
                                        *
                                        * @param {Object} envelope
                                        * @param {Function} callback
                                        *
                                        */
                                        dispatch: function(envelope, callback) {
                                            var self = this;

                                            var corrId = this.generateCallId();
                                            envelope.msg["corr-id"] = corrId;
                                            envelope.from = this.getTransport().getDeviceId();

                                            this.callMap[corrId] = { callback: callback, 
                                                requestTime: (new Date().getTime()),
                                            method: envelope.msg.method };

                                            // send the envelope
                                            this.getTransport().send(envelope, function(err) {
                                                if(err) { // couldn't even send the envelope
                                                    self.callMap[corrId].callback({ status:"error", error: err });
                                                    delete self.callMap[corrId];
                                                }
                                            }, this);
                                        },

                                        /** 
                                        * Callback
                                        *
                                        * @param {Number} correlation id
                                        * @param {Object} envelope
                                        *
                                        */
                                        callback: function(corrId, envelope) {
                                            var id = parseInt(corrId, 10);
                                            if (!this.callMap[id]) {
                                                Ext.cf.util.Logger.warn("No callback found for this correspondance id: " + corrId);
                                            } else {
                                                var map = this.callMap[id];
                                                var currentTime = new Date().getTime();
                                                var clientTime = currentTime - map.requestTime;
                                                var serverTime = envelope.debug === true ? (envelope.debugInfo.outTime - envelope.debugInfo.inTime) : 'NA';
                                                var networkTime = (serverTime === "NA") ? "NA" : (clientTime - serverTime);
                                                var apiName = envelope.service + "." + map.method;
                                                Ext.cf.util.Logger.perf(corrId, apiName, "total time", clientTime, 
                                                "server time", serverTime, "network time", networkTime);

                                                if(envelope.msg.result.status !== "success") {
                                                    if(!Ext.cf.util.ErrorHelper.isValidError(envelope.msg.result.error)) {
                                                        Ext.cf.util.Logger.debug('RPC error is of incorrect format:', envelope.msg.result.error);
                                                        var err = Ext.cf.util.ErrorHelper.get('UNKNOWN_RPC_ERROR');
                                                        err.details = envelope.msg.result.error;
                                                        envelope.msg.result.error = err;
                                                    }
                                                }

                                                map.callback(envelope.msg.result);

                                                delete this.callMap[id];
                                            }
                                        },

                                        /** 
                                        * Call
                                        *
                                        * @param {Function} callback
                                        * @param {String} serviceName
                                        * @param {String} style
                                        * @param {String} method
                                        * @param {Array} args
                                        *
                                        */
                                        call: function(callback, serviceName, style, method, args) {

                                            var envelope;

                                            // register for serviceName receive calls (subscriber rpc)
                                            this.getTransport().setListener(serviceName, this.subscribe, this);

                                            switch(style) {
                                                case "subscriber":
                                                envelope = {service: serviceName, from: this.getTransport().getDeviceId(), msg: {method: method, args: args}};
                                                this.dispatch(envelope, callback);
                                                break;
                                                default:
                                                Ext.cf.util.Logger.error(style + " is an invalid RPC style");
                                                throw "Invalid RPC style: " + style;
                                            }
                                        }

                                    });


                                    /**
                                    * @private
                                    *
                                    * Publish/Subscribe Messaging
                                    *
                                    */
                                    Ext.define('Ext.cf.messaging.PubSub', {

                                        config: {
                                            /**
                                            * @cfg transport
                                            * @accessor
                                            */
                                            transport: undefined
                                        },

                                        /** 
                                        * Constructor
                                        *
                                        * @param {Object} config
                                        *
                                        */
                                        constructor: function(config) {
                                            this.initConfig(config);
                                            return this;
                                        },

                                        /**
                                        * @private
                                        */
                                        channelCallbackMap: {},

                                        /** 
                                        * Handle incoming envelope
                                        *
                                        * @param {Object} envelope
                                        *
                                        */
                                        handleIncoming: function(envelope) {
                                            var channelName = envelope.msg.queue;
                                            if(channelName && this.channelCallbackMap[channelName]) {
                                                var item = this.channelCallbackMap[channelName];
                                                var sender = {
                                                    deviceId: envelope.from,
                                                    userId: envelope.userId
                                                };
                                                item.callback.call(item.scope,sender,envelope.msg.data);
                                            } else {
                                                Ext.cf.util.Logger.warn("PubSub: No callback for channelName " + channelName);
                                            }
                                        },

                                        /** 
                                        * Publish
                                        *
                                        * @param {String} channelName
                                        * @param {String} qKey
                                        * @param {Object} data
                                        * @param {Function} callback
                                        * @param {Object} scope
                                        *
                                        */
                                        publish: function(channelName, qKey, data, callback, scope) {
                                            this.getTransport().send(
                                            {service:"client-pubsub", msg:{api:"publish", queue:channelName, qKey: qKey, data:data}
                                        }, callback, scope);
                                    },

                                    /** 
                                    * Subscribe
                                    *
                                    * @param {String} channelName
                                    * @param {String} qKey
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    * @param {Function} errCallback
                                    *
                                    */
                                    subscribe: function(channelName, qKey, callback, scope, errCallback) {
                                        this.getTransport().setListener("client-pubsub", this.handleIncoming, this);
                                        this.getTransport().send(
                                        {service:"client-pubsub", msg:{api:"subscribe", queue:channelName, qKey: qKey}
                                    }, function(err) {
                                        if(err) {
                                            if (errCallback) {
                                                errCallback.call(scope, err);
                                            }
                                        } else {
                                            this.channelCallbackMap[channelName] = {callback:callback,scope:scope};
                                            Ext.cf.util.Logger.info("client-pubsub: " + this.getTransport().getDeviceId() + " subscribed to " + channelName);
                                        }
                                    }, this);
                                },

                                /** 
                                * Unsubscribe
                                *
                                * @param {String} channelName
                                * @param {String} qKey
                                * @param {Function} callback
                                * @param {Object} scope
                                *
                                */
                                unsubscribe: function(channelName, qKey, callback, scope) {
                                    delete this.channelCallbackMap[channelName];
                                    this.getTransport().send(
                                    {service:"client-pubsub", msg:{api:"unsubscribe", queue:channelName, qKey:qKey}
                                }, function(err) {
                                    Ext.cf.util.Logger.info("client-pubsub: " + this.getTransport().getDeviceId() + " unsubscribed to " + channelName);
                                    if(callback){
                                        callback.call(scope, err);
                                    }
                                }, this);
                            }
                        });


                        /**
                        * @private
                        *
                        */
                        Ext.define('Ext.cf.messaging.AuthStrategies', {
                            requires: [
                            'Ext.cf.util.UuidGenerator',
                            'Ext.cf.util.Md5'
                            ],

                            statics: {
                                nc: 0, // request counter used in Digest auth

                                /** 
                                * Get request counter
                                *
                                */
                                getRequestCounter: function() {
                                    return ++Ext.cf.messaging.AuthStrategies.nc;
                                },

                                strategies: {
                                    /** 
                                    * Digest strategy
                                    *
                                    * @param {Object} group
                                    * @param {Object} params
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */      
                                    'digest': function(group, params, callback, scope) {
                                        var username = params.username;
                                        var password = params.password;

                                        // step 1
                                        // send call without digest 'response' field, causing server to return the server nonce
                                        Ext.io.Io.getMessagingProxy(function(messaging){
                                            messaging.getService(
                                            {name: "groupmanager"},
                                            function(groupManager,err) {
                                                if(groupManager){
                                                    groupManager.loginUser(function(result) {
                                                        if(result.status == "success") {
                                                            var nonce = result.value.nonce;
                                                            var qop = "auth";
                                                            var nc = '' + Ext.cf.messaging.AuthStrategies.getRequestCounter();
                                                            var cnonce = Ext.cf.util.UuidGenerator.generate();

                                                            // http://en.wikipedia.org/wiki/Digest_access_authentication#Example_with_explanation

                                                            // HA1 = MD5( "Mufasa:testgroup@host.com:Circle Of Life" )
                                                            // = 939e7578ed9e3c518a452acee763bce9
                                                            var ha1 = Ext.cf.util.Md5.hash(username + ":" + group.getId() + ":" + password);

                                                            var uri = messaging.transport.getUrl();

                                                            // HA2 = MD5( "GET:/dir/index.html" )
                                                            // = 39aff3a2bab6126f332b942af96d3366
                                                            var ha2 = Ext.cf.util.Md5.hash("POST:" + uri);

                                                            /* Response = MD5( "939e7578ed9e3c518a452acee763bce9:\
                                                            dcd98b7102dd2f0e8b11d0f600bfb0c093:\
                                                            00000001:0a4f113b:auth:\
                                                            39aff3a2bab6126f332b942af96d3366" ) */
                                                            var response = Ext.cf.util.Md5.hash(ha1 + ":" + nonce + ":" + nc +
                                                            ":" + cnonce + ":" + qop + ":" + ha2);

                                                            groupManager.loginUser(function(result) {
                                                                if(result.status == "success" && result.value._bucket && result.value._bucket == "Users") {
                                                                    var user = Ext.create('Ext.io.User', {id:result.value._key, data:result.value.data});
                                                                    callback.call(scope,  user, result.sid);
                                                                } else {
                                                                    callback.call(scope, null, null, result.error);
                                                                }
                                                            }, {groupId : group.getId(), username : username, nonce : nonce, uri : uri, qop : qop, nc : nc, cnonce : cnonce, response : response, digest : true});

                                                            } else {
                                                                // too bad
                                                                callback.call(scope, null, null, result.error);
                                                            }
                                                        }, {groupId : group.getId(), digest : true});            
                                                        }else{
                                                            callback.call(scope, null, null, err);  
                                                        }
                                                    },
                                                    this
                                                    );
                                                },this);
                                            },     


                                            /** 
                                            * Facebook
                                            *
                                            * @param {Object} group
                                            * @param {Object} params
                                            * @param {Function} callback
                                            * @param {Object} scope
                                            *
                                            */      
                                            facebook: function(group, params, callback, scope) {

                                                var fn = function(result) {
                                                    if(result.status == "success" && result.value._bucket && result.value._bucket == "Users") {
                                                        var user = Ext.create('Ext.io.User', {id:result.value._key, data:result.value.data});
                                                        callback.call(scope, user, result.sid, null);
                                                    } else {
                                                        callback.call(scope, null, null, result.error);
                                                    }
                                                };


                                                var args = {groupId : group.getId(), 
                                                    authuser: params
                                                };

                                                Ext.io.Io.getMessagingProxy(function(messaging){
                                                    messaging.getService(
                                                    {name: "groupmanager"},
                                                    function(groupManager,err) {
                                                        if(groupManager){
                                                            groupManager.loginUser(fn, args);
                                                        }else{
                                                            callback.call(scope, null, null, err);  
                                                        }
                                                    },
                                                    this
                                                    );
                                                },this);
                                            }

                                        }
                                    }
                                });

                                /**
                                * @private
                                *
                                * An Object... but a special one.
                                * 
                                */

                                Ext.define('Ext.io.Object', {

                                    inheritableStatics: {

                                        /**
                                        * @private
                                        * Get a specific Object.
                                        *
                                        * @param {Object} messaging
                                        * @param {String} key
                                        *
                                        * @param {Function} callback The function to be called after getting the object.
                                        * @param {Object} error object
                                        *
                                        * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                        * the callback function.
                                        *
                                        */
                                        getObject: function(key, callback, scope) {
                                            Ext.io.Io.getMessagingProxy(function(messaging){
                                                messaging.getService(
                                                {name: "naming-rpc"},
                                                function(namingRpc,err) {
                                                    if(namingRpc){
                                                        var self= this;
                                                        namingRpc.get(function(result) {
                                                            if(result.status == "success") {
                                                                callback.call(scope, Ext.create(self.$className, {id:result.value._key, data:result.value.data}));
                                                            } else {
                                                                callback.call(scope, undefined, result.error);
                                                            }
                                                        }, self.$className, key);
                                                    }else{
                                                        callback.call(scope, undefined, err);    
                                                    }
                                                },
                                                this
                                                );
                                            },this);
                                        },

                                        /**
                                        * @private
                                        * Get a set of Objects that match a query.
                                        *
                                        * @param {Object} messaging
                                        * @param {String} query
                                        * @param {Number} start
                                        * @param {Number} rows
                                        * 
                                        * @param {Function} callback The function to be called after finding objects.
                                        * @param {Object} error object
                                        *
                                        * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                        * the callback function.
                                        *
                                        */
                                        findObjects: function(query, start, rows, callback, scope) {
                                            Ext.io.Io.getMessagingProxy(function(messaging){
                                                messaging.getService(
                                                {name: "naming-rpc"},
                                                function(namingRpc,err) {
                                                    if(namingRpc){
                                                        var self= this;
                                                        namingRpc.find(function(result) {
                                                            if(result.status == "success") {
                                                                var objects = [];
                                                                for(var i = 0; i < result.value.length; i++) {
                                                                    objects.push(Ext.create(self.$className, {id:result.value[i]._key, data:result.value[i].data}));
                                                                }
                                                                callback.call(scope, objects);
                                                            } else {
                                                                callback.call(scope, undefined, result.error);
                                                            }
                                                        }, self.$className, query, start, rows);
                                                    }else{
                                                        callback.call(scope, undefined, err);    
                                                    }
                                                },
                                                this
                                                );
                                            },this);
                                        },

                                    },

                                    config: {
                                        id: null,
                                        data: null,
                                    },

                                    /**
                                    * @private
                                    *
                                    * Constructor
                                    *
                                    */
                                    constructor: function(config) {
                                        this.initConfig(config);
                                        if(config._key){
                                            this.setId(config._key);
                                        }
                                    },

                                    /**
                                    * @private
                                    * @inheritable
                                    *
                                    * Update the object.
                                    *
                                    * @param {Object} data The data to be set on the object.
                                    *
                                    * @param {Function} callback The function to be called after updating the object.
                                    * @param {Object} error object
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    *     
                                    */
                                    update: function(data,callback,scope) {
                                        data= Ext.Object.merge(this.getData(), data);
                                        Ext.io.Io.getMessagingProxy(function(messaging){
                                            messaging.getService(
                                            {name: "naming-rpc"},
                                            function(namingRpc,err) {
                                                if(namingRpc){
                                                    namingRpc.update(function(result) {
                                                        if(result.status == "success") {
                                                            callback.call(scope);
                                                        } else {
                                                            callback.call(scope,result.error);
                                                        }
                                                    }, this.$className, this.getId(), data);
                                                }else{
                                                    callback.call(scope,err);
                                                }
                                            },
                                            this
                                            );
                                        },this);
                                    },

                                    /** 
                                    * @private
                                    *
                                    * Destroy
                                    *
                                    * @param {Function} callback The function to be called after destroying the object.
                                    * @param {Object} error object
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    */
                                    destroy: function(callback,scope) {
                                        Ext.io.Io.getMessagingProxy(function(messaging){
                                            messaging.getService(
                                            {name: "naming-rpc"},
                                            function(namingRpc,err) {
                                                if(namingRpc){
                                                    namingRpc.destroy(function(result) {
                                                        if(result.status == "success") {
                                                            callback.call(scope);
                                                        } else {
                                                            callback.call(scope,result.error);
                                                        }
                                                    }, this.$className, this.getId());
                                                }else{
                                                    callback.call(scope,err);                    
                                                }
                                            },
                                            this
                                            );
                                        },this);
                                    },

                                    /** 
                                    * @private
                                    *
                                    * Create Related Entity
                                    *
                                    * @param {String} method
                                    * @param {String} klass
                                    * @param {Object} data
                                    * 
                                    * @param {Function} callback The function to be called after creating related entities.
                                    * @param {Object} error object
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    * 
                                    */
                                    createRelatedObject: function(method, klass, data, callback, scope) {
                                        Ext.io.Io.getMessagingProxy(function(messaging){
                                            messaging.getService(
                                            {name: "naming-rpc"},
                                            function(namingRpc,err) {
                                                if(namingRpc){
                                                    namingRpc.createRelatedObject(function(result) {
                                                        if(result.status == "success") {
                                                            var object = Ext.create(klass, {id:result.value._key, data:result.value.data});
                                                            callback.call(scope, object);
                                                        } else {
                                                            callback.call(scope, undefined, result.error);
                                                        }
                                                    }, this.$className, this.getId(), method, data);
                                                }else{
                                                    callback.call(scope,undefined,err);
                                                }
                                            },
                                            this
                                            );
                                        },this);
                                    },

                                    /** 
                                    * @private
                                    *
                                    * Get Related Object
                                    *
                                    * @param {String} klass
                                    * @param {String} key
                                    * @param {String} tag
                                    * 
                                    * @param {Function} callback The function to be called after getting related object.
                                    * @param {Object} error object
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    * 
                                    */
                                    getRelatedObject: function(klass, key, tag, callback, scope) {
                                        Ext.io.Io.getMessagingProxy(function(messaging){
                                            messaging.getService(
                                            {name: "naming-rpc"},
                                            function(namingRpc,err) {
                                                if(namingRpc){
                                                    namingRpc.getRelatedObject(function(result) {
                                                        if(result.status == "success") {
                                                            var object = null;
                                                            if(result.value && result.value !== null) { // it's possible there is no linked object
                                                                object = Ext.create(klass, {id:result.value._key, data:result.value.data});
                                                            }
                                                            callback.call(scope, object);
                                                        } else {
                                                            callback.call(scope, undefined, result.error);
                                                        }
                                                    }, this.$className, this.getId(), klass.$className, key, tag);
                                                }else{
                                                    callback.call(scope, undefined, err);
                                                }
                                            },
                                            this
                                            );
                                        },this);
                                    },

                                    /** 
                                    * @private
                                    *
                                    * Get Related Objects
                                    *
                                    * @param {String} klass
                                    * @param {String} tag
                                    *  
                                    * @param {Function} callback The function to be called after getting related objects.
                                    * @param {Object} error object
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    * 
                                    */
                                    getRelatedObjects: function(klass, tag, callback, scope) {
                                        Ext.io.Io.getMessagingProxy(function(messaging){
                                            messaging.getService(
                                            {name: "naming-rpc"},
                                            function(namingRpc,err) {
                                                if(namingRpc){
                                                    namingRpc.getRelatedObjects(function(result) {
                                                        if(result.status == "success") {
                                                            var objects = [];
                                                            for(var i = 0; i < result.value.length; i++) {
                                                                objects.push(Ext.create(klass, {id:result.value[i]._key, data:result.value[i].data}));
                                                            }
                                                            callback.call(scope, objects);
                                                        } else {
                                                            callback.call(scope, undefined, result.error);
                                                        }
                                                    }, this.$className, this.getId(), klass.$className, tag);
                                                }else{
                                                    callback.call(scope, undefined, err);
                                                }
                                            },
                                            this
                                            );
                                        },this);
                                    },

                                    /** 
                                    * @private
                                    *
                                    * Find Related Objects
                                    *
                                    * @param {String} klass
                                    * @param {String} key
                                    * @param {String} tag
                                    * @param {String} query
                                    *  
                                    * @param {Function} callback The function to be called after finding related objects.
                                    * @param {Object} error object
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    * 
                                    */
                                    findRelatedObjects: function(klass, key, tag, query, callback, scope) {
                                        Ext.io.Io.getMessagingProxy(function(messaging){
                                            messaging.getService(
                                            {name: "naming-rpc"},
                                            function(namingRpc,err) {
                                                if(namingRpc){
                                                    namingRpc.findRelatedObjects(function(result) {
                                                        if(result.status == "success") {
                                                            var objects = [];
                                                            for(var i = 0; i < result.value.length; i++) {
                                                                objects.push(Ext.create(klass, {id:result.value[i]._key, data:result.value[i].data}));
                                                            }
                                                            callback.call(scope, objects);
                                                        } else {
                                                            callback.call(scope, undefined, result.error);
                                                        }
                                                    }, this.$className, this.getId(), klass.$className, key, tag, query);
                                                }else{
                                                    callback.call(scope, undefined, err);
                                                }
                                            },
                                            this
                                            );
                                        },this);
                                    }
                                });


                                /**
                                * @private
                                *
                                * An Object that can have a picture.
                                * 
                                */
                                Ext.define('Ext.io.WithPicture', {

                                    /** 
                                    *
                                    * Upload Picture
                                    *
                                    * @param {Object} options
                                    * 
                                    * @param {Function} callback
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    */
                                    uploadPicture: function(options,callback,scope) {
                                        if (typeof options.file != "undefined") {
                                            options.file.ftype = 'icon';
                                            Ext.io.Io.getMessagingProxy(function(messaging){
                                                messaging.sendContent(
                                                options.file,
                                                function(csId,err) {
                                                    if(csId){
                                                        var tmp = options.file.name.split('.');
                                                        var ext = "."+tmp[tmp.length - 1];
                                                        this.setPicture(csId, ext, function(fileName, err) {
                                                            callback.call(scope,fileName,err);
                                                        }, this);
                                                    }else{
                                                        callback.call(scope,undefined,err);
                                                    }
                                                },
                                                this
                                                );
                                            },this);
                                        } else {
                                            var err = { code : 'FILE_PARAMS_MISSED', message : 'File parameters are missed' };
                                            callback.call(scope,undefined,err);
                                        }
                                    },

                                    /** 
                                    *
                                    * Set Picture
                                    *
                                    * @param {String} csKey
                                    * @param {String} ext
                                    *
                                    * @param {Function} callback
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    * 
                                    */
                                    setPicture: function(csKey, ext, callback, scope) {
                                        this.getServiceName(function(err, name) {
                                            if (!err) {
                                                Ext.io.Io.getMessagingProxy(function(messaging){
                                                    messaging.getService(
                                                    {name: name},
                                                    function(managerService,err) {
                                                        if(managerService){
                                                            managerService.setPicture(function(result) {
                                                                if(result.status == "success") {
                                                                    callback.call(scope, result.value);
                                                                } else {
                                                                    callback.call(scope, undefined, result.error);
                                                                }
                                                            }, this.$className, this.getId(), csKey, ext);
                                                        }else{
                                                            callback.call(scope, undefined, err);
                                                        }
                                                    },
                                                    this
                                                    );
                                                },this);
                                            } else {
                                                callback.call(scope, undefined, err);
                                            }
                                        },this);
                                    },

                                    /** 
                                    *
                                    * Remove Picture
                                    *
                                    * @param {Function} callback
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    */
                                    removePicture: function(callback,scope) {
                                        this.getServiceName(function(err, name) {
                                            if (!err) {
                                                Ext.io.Io.getMessagingProxy(function(messaging){
                                                    messaging.getService(
                                                    {name: name},
                                                    function(managerService,err) {
                                                        if(managerService){
                                                            managerService.removePicture(function(result) {
                                                                if(result.status == "success") {
                                                                    callback.call(scope)
                                                                } else {
                                                                    callback.call(scope,result.error);
                                                                }
                                                            }, this.$className, this.getId());
                                                        }else{
                                                            callback.call(scope,err);
                                                        }
                                                    },
                                                    this
                                                    );
                                                },this);
                                            } else {
                                                callback.call(scope,err);
                                            }
                                        },this);
                                    },

                                    /** 
                                    * @private
                                    *
                                    * @param {Function} callback
                                    *
                                    */
                                    getServiceName: function(callback,scope) {
                                        var name;
                                        switch(this.$className) {
                                            case 'Ext.io.App':
                                            name = 'AppService';
                                            break;
                                            case 'Ext.io.Team':
                                            name = 'TeamService';
                                            break;
                                        }
                                        if (name) {
                                            callback.call(scope,null, name);
                                        } else {
                                            callback.call(scope,{code:'NOT_SUPPORTED', message:'This class of object does not support picture operations'}, null);
                                        }
                                    }

                                });


                                /**
                                *
                                *  @aside guide concepts_channel 
                                *
                                * This class allows the client to make use of message channels.
                                *
                                *  {@img channel1.png Subscribe}
                                * 
                                * A channel accepts messages which
                                * are published to it and distributes a copy of the message to all of the registered
                                * subscribers. Using this mechanism a client can send messages to other clients, with
                                * the benefit that messages for offline clients will be stored on the Sencha.io
                                * servers until they can be delivered.
                                *
                                *       Ext.io.Channel.get(
                                *           { name: 'rendezvous' },
                                *           function(channel){
                                *           
                                *           }
                                *       );
                                *
                                * ## Publish
                                *
                                * A message, which is a simple Javascript object, can be sent to a channel using the
                                * `publish` method. If the device is offline then the message is stored locally, and
                                * sent when the device next comes online. The message can be any plain old javascript object.
                                *
                                *           channel.publish(
                                *               { message: {
                                *                   score: 182
                                *               }},
                                *               function() {
                                *          
                                *               }   
                                *           );
                                *
                                * {@img channel2.png Publish}
                                *
                                * ## Subscribe
                                *
                                * To receive messages the client must subscribe to the channel. The device must be 
                                * online when the call to subscribe is made in order for the client to register
                                * its interest in the channel. Subsequently if the device goes offline then any
                                * messages will be queued on the server for delivery when the device comes back
                                * online.
                                *
                                * {@img channel3.png Subscribe}
                                *
                                * Channel object uses  {Ext.mixin.Observable} to publish new message events.  
                                * After calling  `Ext.io.Channel.get` the channel object will be subscribed to receive channel messages. 
                                * You can then listen to those events:
                                *
                                *           channel.on("message", function(sender, message){
                                *               console.log("channel message", sender, message);
                                *           }, this);
                                *
                                * ## Many Subscribers
                                *
                                * A channel can have multiple subscribers, and messages sent to the channel are delivered to each subscriber.
                                * Messages published by a device are not sent back to the same device (i.e. echo is prevented)
                                *
                                * {@img channel4.png Many Subscribers}
                                *
                                * ## Unsubscribe
                                *
                                * Once a channel has been subscribed to, messages will be delivered until a subsequent
                                * call to the unsubscribe method is made.
                                *
                                */
                                Ext.define('Ext.io.Channel', {
                                    extend: 'Ext.io.Object',

                                    mixins: {
                                        observable: "Ext.util.Observable" //using util instead of mixin for EXT 4 compatibility. 
                                    },

                                    /**
                                    * @event message
                                    * Fired when the channel receives a message.
                                    * @param {Ext.io.Sender} sender The user/device that sent the message
                                    * @param {Object} the message sent.
                                    */

                                    statics: {

                                        /**
                                        * @static
                                        * Get a named channel
                                        *
                                        * All instances of an app have access to the same
                                        * named channels. If an app gets the same named channel on many devices then
                                        * those devices can communicate by sending messages to each other. Messages 
                                        * are simple javascript objects, which are sent by publishing them through 
                                        * a channel, and are received by other devices that have subscribed to the 
                                        * same channel.
                                        *
                                        *          Ext.io.Channel.get(
                                        *               { name: 'music' },
                                        *               function(channel){
                                        *               }
                                        *           );     
                                        *
                                        * @param {Object} options Channel options may contain custom metadata in addition to the name, which is manadatory
                                        * @param {String} options.name Name of the channel
                                        *
                                        * @param {Function} callback The function to be called after getting the channel.
                                        * @param {Object} callback.channel The named {Ext.io.Channel} if the call succeeded.
                                        * @param {Object} callback.err an error object.
                                        *
                                        * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                        * the callback function.
                                        *
                                        */
                                        get: function(options,callback,scope) {
                                            if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([
                                            { name: "name", type: 'string' },
                                            ],arguments, "Ext.io.Channel", "get")) { 
                                                Ext.io.Io.getMessagingProxy(function(messaging){
                                                    options.appId = Ext.io.Io.getIdStore().getId('app');
                                                    messaging.getChannel(options,callback,scope);
                                                },this);
                                            }
                                        },

                                        /**
                                        * @static
                                        * @private
                                        *
                                        * Find channels that match a query.
                                        * 
                                        * Returns all the channel objects that match the given query. The query is a String
                                        * of the form name:value. For example, "city:austin", would search for all the
                                        * channels with a meta data key of city and  value of Austin. 
                                        * Find uses the metadata supplied when the channel was created. 
                                        * 
                                        * 
                                        *       Ext.io.Channel.find(
                                        *           { query: 'city:austin' },
                                        *           function(channels){
                                        *           }
                                        *       );
                                        *
                                        * @param {Object} options An object which may contain the following properties:
                                        * @param {Object} options.query
                                        *
                                        * @param {Function} callback The function to be called after finding the matching channels.
                                        * @param {Array} callback.channels An array of  {Ext.io.Channel} objects matching channels found for the App if the call succeeded.
                                        * @param {Object} callback.err an error object.
                                        *
                                        * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                        * the callback function.
                                        *
                                        */
                                        find: function(options,callback,scope) {
                                            if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([
                                            { name: "query", type: 'string' },
                                            ],arguments, "Ext.io.Channel", "find")) {
                                                Ext.io.App.getCurrent(function(app,err){
                                                    if(app){
                                                        app.findChannels(options,callback,scope);
                                                    }else{
                                                        callback.call(scope,app,err);
                                                    }
                                                });
                                            }
                                        },
                                    },

                                    config: {
                                        name: undefined,
                                        queueName: undefined,

                                        /**
                                        * @cfg {Boolean} subscribeOnStart
                                        * Channel will automatically subscribe 
                                        * to channel messages when the channel is created. 
                                        * @accessor
                                        */
                                        subscribeOnStart: true
                                    },

                                    /**
                                    * @private
                                    *
                                    * @param {Object} config
                                    */
                                    constructor: function(config) {
                                        this.initConfig(config);
                                        if(this.getSubscribeOnStart()){
                                            this.subscribe();
                                        }
                                    },

                                    /**
                                    * Publish a message to this channel.
                                    *
                                    * The message will be delivered to all devices subscribed to the channel.
                                    *
                                    *      channel.publish(
                                    *             { message: { 
                                    *                 score: 182
                                    *             }},
                                    *             function(error) {
                                    *          
                                    *             }   
                                    *       );
                                    *     
                                    * @param {Object} options
                                    * @param {Object} options.message A simple Javascript object.
                                    *
                                    * @param {Function} callback The function to be called after sending the message to the server for delivery.
                                    * @param {Object} callback.err an error object. Will be null/undefined if there wasn't an error.
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    *
                                    */
                                    publish: function(options,callback,scope) {
                                        if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([
                                        { name: "message", type: 'object|string' },
                                        ],arguments, "Ext.io.Channel", "publish")) {
                                            Ext.io.Io.getMessagingProxy(function(messaging){
                                                messaging.pubsub.publish(this.getQueueName(), this.getId(), options.message, callback, scope);
                                            },this);
                                        }
                                    },

                                    /**
                                    * @private
                                    * This method is called automatically on startup. Use the message event instead.
                                    *
                                    * Subscribe to receive messages from this channel.
                                    *
                                    * To receive messages from a channel, it is necessary to subscribe to the channel.
                                    * Subscribing registers interest in the channel and starts delivery of messages
                                    * published to the channel using the callback.
                                    *
                                    *
                                    *       Ext.io.Channel.get(
                                    *         { name: "table-123" },
                                    *         function(channel) {
                                    *           channel.subscribe(
                                    *             function(sender, message) {
                                    *             }
                                    *           );
                                    *         }
                                    *       );
                                    *
                                    * @param {Function} callback The function to be called after subscribing to this Channel.
                                    * @param {String} callback.from The sending Device ID.
                                    * @param {Object} callback.message A simple Javascript object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    */
                                    subscribe: function(callback,scope) {
                                        if(!this.subscribedFn){
                                            this.subscribedFn = function subscribeCallback(sender, message) {
                                                var sender = Ext.create('Ext.io.Sender', sender);
                                                this.fireEvent("message", sender, message);
                                            };
                                            Ext.io.Io.getMessagingProxy(function(messaging){
                                                messaging.pubsub.subscribe(this.getQueueName(), this.getId(), this.subscribedFn, this, Ext.emptyFn);
                                            },this);
                                        } 
                                        if(callback) {
                                            this.on("message", callback, scope);
                                        }

                                    },

                                    /**
                                    * Unsubscribe from receiving messages from this channel.
                                    *
                                    * Once a channel has been subscribed to, message delivery will continue until a call to unsubscribe is made.
                                    * If a device is offline but subscribed, messages sent to the channel will accumulate on the server,
                                    * to be delivered after the device reconnects at a later point of time.
                                    *
                                    * @param {Function} callback The function to be called after unsubscribing from this Channel.
                                    * @param {Object} callback.err an error object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    *
                                    */
                                    unsubscribe: function(callback,scope) {
                                        if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments, "Ext.io.Channel", "unsubscribe")) {
                                            Ext.io.Io.getMessagingProxy(function(messaging){
                                                messaging.pubsub.unsubscribe(this.getQueueName(), this.getId(), callback, scope);
                                            },this);
                                        }
                                    },

                                });

                                /** 
                                *
                                * This class provides a data synchronization service. It stores Ext.data.Model data in
                                * HTML5 localStorage as JSON encoded values, and replicates those data values
                                * to the Sencha.io servers. Operations can be performed on the store even when the
                                * the device is offline. Offline updates are replicated to the servers when the device
                                * next comes online.
                                *  
                                * ## Store Creation
                                *
                                * Models stored in a sync store are similar to Models stored in any Ext.data.Store,
                                * with the exception that the sync store includes its own id generator, so an 'id'
                                * field need not be declared.
                                *
                                *      Ext.define("Example.model.Model", {
                                *          extend: "Ext.data.Model", 
                                *          config: {
                                *              fields: [
                                *                  {name: 'name', type:'string'}, 
                                *              ]
                                *          }
                                *      });
                                *  
                                * A store is declared in a similar way to any Ext.data.Store, with the type being
                                * set to 'syncstorage'. 
                                *
                                *           Ext.define('Example.store.Store', {
                                *               extend: 'Ext.data.Store',
                                *               config: {
                                *                   model: 'Example.model.Model',
                                *                   proxy: {
                                *                       type: 'syncstorage',
                                *                       id: 'mystore'
                                *                   },
                                *               }
                                *           });
                                *
                                * The sync store is used just like any Ext.data.Store, for example you can load
                                * records, add them, or create and save them:
                                *
                                *          store.load();
                                *          store.add({name:'bob'});
                                *          var model= Ext.create('Model',{name:'joe'})
                                *          model.save();
                                * 
                                * All of these operations are executed against the in-memory store. 
                                *
                                * It is only when the `sync` method is called that the store commits any 
                                * changes to the proxy through its CRUD interface; create, read, update,
                                * and destroy. 
                                *
                                *          store.sync();
                                *
                                * {@img store1.png}
                                *
                                * ## One User, One Device  
                                *
                                * So far, what we have described, is exactly how any Ext.data.Store behaves.
                                * The advantage of the sync proxy is that it will synchronize the local
                                * store to the Sencha.io servers. For a user with one device this allows
                                * them to backup their data to the cloud, and thus fully recover from a
                                * data loss.
                                *
                                * When the `sync` method is called and the device is offline then once any 
                                * local updates have been applied to localStorage then the call to sync will
                                * terminate and control will return to the app. However, if the device
                                * is online then the proxy will initiate a replication session with the 
                                * Sencha.io servers. The client uses a replication protocol to send any
                                * updates required to bring the server up to date with respect to the client.
                                *
                                * {@img store3.png}
                                *
                                * ## User Owned Store
                                *
                                * All sync stores have an owner.
                                * By default all stores are created belonging to the currently authenticated user.
                                * To enable your app for user authentication it must be associated with a group.
                                * You can create a group and associate it with your app using the [Developer Console](http://developer.sencha.io)
                                *
                                * (screen shot here)
                                * 
                                * If no
                                * user is authenticated, then the app will not be able to syncronize the store
                                * with the server and will fail with an access control error.
                                *
                                *      
                                *           Ext.define('Example.store.Store', {
                                *               extend: 'Ext.data.Store',
                                *               config: {
                                *                   model: 'Example.model.Model',
                                *                   proxy: {
                                *                       type: 'syncstorage',
                                *                       owner: 'user',
                                *                       id: 'mystore'
                                *                   },
                                *               }
                                *           });
                                *
                                * ## One User, Many Devices
                                *
                                * A user can have many devices, and they can have a copy of a particular sync
                                * store on each of them. This gives them the benefit of device portability.
                                * They have access to the same data from whichever device they happen to be
                                * using, and can update their data right there.
                                *
                                * This capability is provided by the proxy. The replication protocol operates
                                * in both directions, from client to server for local updates, and also from
                                * server to client for remote updates. Remote updates are handled by the proxy,
                                * which applies the updates to localStorage and to the bound Ext.data.Store.
                                * Any views bound to the store will recieve events as if the update operations
                                * had originated locally. In this way the views will be updated automatically
                                * to reflect any underlying changes to the data.
                                *
                                * {@img store4.png}
                                *
                                * ## Private Stores
                                *
                                * By default a User owned store is private and so is accessible only by that user.
                                * No other users can access the store.
                                *
                                *           Ext.define('Example.store.Store', {
                                *               extend: 'Ext.data.Store',
                                *               config: {
                                *                   model: 'Example.model.Model',
                                *                   proxy: {
                                *                       type: 'syncstorage',
                                *                       owner: 'user',
                                *                       access: 'private',
                                *                       id: 'mystore'
                                *                   },
                                *               }
                                *           });
                                *
                                * ## Public Stores
                                *
                                * A User owned store can be declared as public which means that
                                * the store is accessible to all the members of that group of users.
                                *
                                *           Ext.define('Example.store.Store', {
                                *               extend: 'Ext.data.Store',
                                *               config: {
                                *                   model: 'Example.model.Model',
                                *                   proxy: {
                                *                       type: 'syncstorage',
                                *                       owner: 'user',
                                *                       access: 'public',
                                *                       id: 'mystore'
                                *                   },
                                *               }
                                *           });
                                *
                                * ## Many Users, Many Devices
                                *
                                * Just as with the previous scenario of a single user with many devices,
                                * when many users are sharing a store there is a copy of the store on
                                * many devices. Every copy of the store can be updated and the clients
                                * keep the replicas in sync by exchanging updates with the Sencha.io
                                * servers.
                                *
                                * {@img store5.png} 
                                *
                                * Because updates can be applied independently at the same time on
                                * different copies of the same store conflicting updates can occur.
                                * The proxy includes a conflict detection and resolution algorithm
                                * that ensures that all copies of the store will eventually contain
                                * exactly the same data. The resolution algorithm merges conflicting
                                * objects and selects the last update for conflicting primitive values.
                                *
                                * ## Synchronization Policy
                                *
                                * Since the replication protocol is always client initiated updates
                                * are only exchanged when the client explicitly calls the `sync` method on
                                * the store. A call to `sync` when there are no local updates pending will
                                * still initiate a replication session to collect any remote updates.
                                *
                                *          store.sync();
                                *
                                * For this reason the app should implement a sync policy. Common policies are:
                                *
                                *  - call sync when a local change occurs
                                *  - call sync when the user takes some action, like clicking on 'refresh'
                                *  - call sync on an internal timer, perhaps every few seconds
                                *  - call sync when a message arrives on a shared channel, which is used to
                                *    broadcast an update notification.
                                */
                                Ext.define('Ext.io.Store', {
                                    extend: 'Ext.io.Object',

                                    statics: {

                                        /** 
                                        * @private
                                        * @static 
                                        *
                                        * @param {Object} options
                                        *  
                                        * @param {Function} callback The function to be called after getting store.
                                        * @param {Object} error object
                                        *
                                        * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                        * the callback function.
                                        */
                                        get: function(options,callback,call) {
                                            this.getObjects(options.id, callback, scope);
                                        }
                                    },

                                    /**
                                    * 
                                    * @param {Object} options
                                    *  
                                    * @param {Function} callback The function to be called after finding replicas.
                                    * @param {Object} error object
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    */
                                    findReplicas: function(options,callback,scope) {
                                        this.findRelatedObjects(Ext.io.Replica, this.getId(), null, options.query, callback, scope);    
                                    },

                                });


                                /**
                                * @private
                                * {@img app.png Class Diagram}
                                *
                                * The {@link Ext.io.App} class represents the web app itself. There is only one
                                * app object, called the current app object. It is always available.
                                *
                                *          Ext.io.App.getCurrent(
                                *             function(app){
                                *              
                                *             } 
                                *          );
                                *
                                * Methods are provided for navigation through the graph of objects available
                                * to the currently running client code. 
                                *
                                */
                                Ext.define('Ext.io.App', {
                                    extend: 'Ext.io.Object',
                                    requires: [
                                    'Ext.io.Channel'
                                    ],

                                    mixins: {
                                        withpicture: 'Ext.io.WithPicture'
                                    },

                                    statics: {

                                        /**
                                        * @static
                                        * Get the current App object.
                                        *
                                        *          Ext.io.App.getCurrent(
                                        *              function(app){
                                        *              } 
                                        *          );
                                        *
                                        * The current App object is an instance of the {@link Ext.io.App} class. It represents
                                        * the web app itself. It is always available, and serves as the root of
                                        * the server side objects available to this client.
                                        *
                                        * @param {Function} callback The function to be called after getting the current App object.
                                        * @param {Object} callback.app The current {Ext.io.App} object if the call succeeded.
                                        * @param {Object} callback.err an error object.
                                        *
                                        * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                        * the callback function.
                                        *
                                        */
                                        getCurrent: function(callback,scope) {
                                            if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments, "Ext.io.App", "getCurrent")) {
                                                var appId = Ext.io.Io.getIdStore().getId('app');
                                                if (!appId) {
                                                    var err = { code : 'NO_APP_ID', message: 'App ID not found' };
                                                    callback.call(scope,undefined,err);
                                                } else {
                                                    this.getObject(appId, callback, scope);
                                                }
                                            }
                                        },

                                        /** 
                                        * @static
                                        * Get App Object
                                        *
                                        * @param {Object} options
                                        * @param {Object} options.id
                                        *
                                        * @param {Function} callback The function to be called after getting the current App object.
                                        * @param {Object} callback.app The current {Ext.io.App} object if the call succeeded.
                                        * @param {Object} callback.err an error object.
                                        *
                                        * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                        * the callback function.
                                        *
                                        */
                                        get: function(options,callback,scope) {
                                            if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([
                                            { name: "id", type: 'string|number' },
                                            ],arguments, "Ext.io.App", "get")) {
                                                this.getObject(options.id, callback, scope);
                                            }
                                        }
                                    },

                                    /**
                                    * Get the current user Group, if any.
                                    *
                                    * The current user Group object is an instance of {@link Ext.io.Group}. It represents
                                    * the group associated with the app. If the app is not associated with a group,
                                    * then there will no current group.
                                    *
                                    *          app.getGroup(
                                    *              function(group){
                                    *              } 
                                    *          );
                                    *
                                    * The group is used for registering and authenticating users, and for searching
                                    * for other users.
                                    *
                                    * @param {Function} callback The function to be called after getting the Group object.
                                    * @param {Object} callback.group The {Ext.io.Group} object for the App if the call succeeded.
                                    * @param {Object} callback.err an error object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    *
                                    */
                                    getGroup: function(callback,scope) {
                                        if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments, "Ext.io.App", "getGroup")) {
                                            this.getRelatedObject(Ext.io.Group, null, null, callback, scope);
                                        }
                                    },


                                    /**
                                    * Find devices that match a query.
                                    * 
                                    * Returns all the device objects that match the given query. The query is a String
                                    * of the form name:value. For example, "city:austin", would search for all the
                                    * devices in Austin, assuming that the app is adding that attribute to all
                                    * its devices.
                                    * 
                                    *       user.findDevices(
                                    *           {query:'city:austin'},
                                    *           function(devices){
                                    *           }
                                    *       );
                                    *
                                    * @param {Object} options An object which may contain the following properties:
                                    * @param {Object} options.query
                                    *
                                    * @param {Function} callback The function to be called after finding the matching devices.
                                    * @param {Object} callback.devices The {Ext.io.Device[]} matching devices found for the App if the call succeeded.
                                    * @param {Object} callback.err an error object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    *
                                    */
                                    findDevices: function(options,callback,scope) {
                                        // JCM this could/should be this.getRelatedObject, but we don't have links from Apps to Devices
                                        if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([
                                        { name: "query", type: 'string' },
                                        ],arguments, "Ext.io.App", "findDevices")) {
                                            Ext.io.Device.findObjects(options.query, 0, 1000, callback, scope);
                                        }
                                    },

                                    /**
                                    * Get a named channel
                                    *
                                    * All instances of an app have access to the same
                                    * named channels. If an app gets the same named channel on many devices then
                                    * those devices can communicate by sending messages to each other. Messages 
                                    * are simple javascript objects, which are sent by publishing them through 
                                    * a channel, and are received by other devices that have subscribed to the 
                                    * same channel.
                                    *
                                    *          app.getChannel(
                                    *               {
                                    *                   name:music,
                                    *                   city:austin
                                    *               },
                                    *               function(channel){
                                    *               }
                                    *           );     
                                    *
                                    * @param {Object} options Channel options may contain custom metadata in addition to the name, which is manadatory
                                    * @param {String} options.name Name of the channel
                                    *
                                    * @param {Function} callback The function to be called after getting the channel.
                                    * @param {Object} callback.channel The named {Ext.io.Channel} if the call succeeded.
                                    * @param {Object} callback.err an error object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    *
                                    */
                                    getChannel: function(options,callback,scope) {
                                        options.appId = this.getId();
                                        Ext.io.Io.getMessagingProxy(function(messaging){
                                            messaging.getChannel(options,callback,scope);
                                        });
                                    },

                                    /**
                                    * Find channels that match a query.
                                    * 
                                    * Returns all the channel objects that match the given query. The query is a String
                                    * of the form name:value. For example, "city:austin", would search for all the
                                    * channels in Austin, assuming that the app is adding that attribute to all
                                    * its channels. 
                                    * its devices.
                                    * 
                                    *       user.findChannels(
                                    *           {query:'city:austin'},
                                    *           function(channels){
                                    *           }
                                    *       );
                                    *
                                    * @param {Object} options An object which may contain the following properties:
                                    * @param {Object} options.query
                                    *
                                    * @param {Function} callback The function to be called after finding the matching channels.
                                    * @param {Object} callback.channels The {Ext.io.Channel[]} matching channels found for the App if the call succeeded.
                                    * @param {Object} callback.err an error object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    *
                                    */
                                    findChannels: function(options,callback,scope) {
                                        if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([
                                        { name: "query", type: 'string' },
                                        ],arguments, "Ext.io.App", "findChannels")) {
                                            this.findRelatedObjects(Ext.io.Channel, this.getId(), null, options.query, callback, scope);    
                                        }
                                    },

                                    /** 
                                    *@private
                                    * Create Version
                                    *
                                    * @param {Object} options
                                    * @param {Object} options.file
                                    * @param {Object} options.data
                                    *
                                    * @param {Function} callback
                                    * @param {Object} callback.version
                                    * @param {Object} callback.err an error object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    *
                                    */
                                    createVersion: function(options,callback,scope) {
                                        var self = this;

                                        if (typeof options.file != "undefined" && typeof options.data != "undefined") {
                                            options.file.ftype = 'package';
                                            Ext.io.Io.getMessagingProxy(function(messaging){
                                                messaging.sendContent(
                                                options.file,
                                                function(csId,err) {
                                                    if(csId){
                                                        options.data['package'] = csId; 
                                                        var tmp = options.file.name.split('.');
                                                        options.data.ext = "."+tmp[tmp.length - 1];
                                                        self.createRelatedObject("createVersion", Ext.io.Version, options.data, callback, scope);
                                                    }else{
                                                        callback.call(scope,undefined,err);
                                                    }
                                                },this
                                                );
                                            });
                                        } else {
                                            var err = { code : 'FILE_PARAMS_MISSED', message : 'File or data parameters are missed' };
                                            callback.call(scope,undefined,err);
                                        }
                                    },

                                    /** 
                                    * Get Team
                                    * @private
                                    * @param {Function} callback
                                    * @param {Object} callback.team
                                    * @param {Object} callback.err an error object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    *
                                    */
                                    getTeam: function(callback,scope) {
                                        this.getRelatedObject(Ext.io.Team, null, null,callback, scope);
                                    },

                                    /** 
                                    * Get deployed version
                                    * @private
                                    * @param {Object} options
                                    *
                                    * @param {Function} callback
                                    * @param {Object} callback.version
                                    * @param {Object} callback.err an error object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    */
                                    getDeployedVersion: function(options,callback,scope) {
                                        var tag = (typeof(options.env) != "undefined") ? ((options.env == 'dev') ? 'dev' : 'prod') : 'prod'; // JCM abbreviations, ick
                                        this.getRelatedObject(Ext.io.Version, null, tag, callback, scope);
                                    },

                                    /** 
                                    * @private       
                                    * Regenerate app secret
                                    *
                                    * @param {Function} callback
                                    * @param {Object} callback.secret new secret
                                    * @param {Object} callback.err an error object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    */
                                    regenerateSecret: function(callback,scope) {
                                        var self = this;

                                        Ext.io.Io.getMessagingProxy(function(messaging){
                                            messaging.getService(
                                            {name: "AppService"},
                                            function(service,err) {
                                                if(service){
                                                    service.regenerateSecret(function(result) {
                                                        callback.call(scope,result.value,result.error);
                                                    }, self.getId());
                                                }else{
                                                    callback.call(scope,undefined,err);
                                                }
                                            },
                                            this
                                            );
                                        });
                                    },

                                });


                                /**
                                * @private
                                * Instances of {@link Ext.io.Proxy} represent proxy objects to services running in the backend. Any
                                * RPC method defined by the service can be invoked on the proxy as if it were a local method.
                                *
                                * The first parameter to any RPC method is always a callback function, followed by the parameters
                                * to the method being called on the server.
                                *
                                * For example:
                                *
                                *     Ext.io.getService("calculator", function(calculator) {
                                *         calculator.add(
                                *             function(result) { // callback
                                *                 display("Calculator: " + number1 + " + " + number2 + " = " + result.value);
                                *             },
                                *             number1, number2 // arguments
                                *         );
                                *     });
                                *
                                * The callback function to the RPC method is passed the result of the RPC call.
                                */
                                Ext.define('Ext.io.Proxy', {
                                    requires: ['Ext.cf.util.ParamValidator', 'Ext.cf.util.ErrorHelper'],

                                    config: {
                                        /**
                                        * @cfg name
                                        * @accessor
                                        */
                                        name: null,

                                        /**
                                        * @cfg descriptor
                                        * @accessor
                                        * @private
                                        */
                                        descriptor: null,

                                        /**
                                        * @cfg descriptor
                                        * @accessor
                                        * @private
                                        */
                                        rpc: null,
                                    },

                                    /**
                                    * @private
                                    *
                                    * Constructor
                                    *
                                    * @param {Object} config The name of the service.
                                    * @param {String} config.name The name of the service.
                                    * @param {Object} config.descriptor The service descriptor
                                    * @param {Object} config.rpc 
                                    *
                                    */
                                    constructor: function(config) {
                                        if(config.descriptor.kind != 'rpc') {
                                            Ext.cf.util.Logger.error(config.name + " is not a RPC service");
                                            throw "Error, proxy does not support non-RPC calls";
                                        }
                                        this.initConfig(config);
                                        this._createMethodProxies();
                                        return this;
                                    },

                                    /**
                                    * @private
                                    *
                                    * Creates proxy functions for all the methods described in the service descriptor.
                                    */
                                    _createMethodProxies: function() {
                                        var descriptor= this.getDescriptor();

                                        var methodDescriptorIsArray = (Object.prototype.toString.call(descriptor.methods) === "[object Array]");
                                        if(methodDescriptorIsArray) {
                                            for(var i = 0; i < descriptor.methods.length; i++) {
                                                var methodName = descriptor.methods[i];
                                                this[methodName] = this._createMethodProxy(methodName);
                                            }
                                        } else {
                                            // new style of method descriptor
                                            for(methodName in descriptor.methods) {
                                                this[methodName] = this._createMethodProxyNew(methodName, descriptor.methods[methodName]);
                                            }
                                        }
                                    },

                                    /**
                                    * @private
                                    *
                                    * Create a function that proxies a calls to the method to the server.
                                    *
                                    * @param {String} methodName
                                    * @param {Array} params
                                    *
                                    */
                                    _createMethodProxyNew: function(methodName, params) {
                                        var self = this;

                                        var contextParam = params.shift(); // the context param is not passed explicitly from the client side

                                        return function() {
                                            // perform checks on params and return an error if there is a problem
                                            var err = Ext.cf.util.ParamValidator.validateParams(params, arguments, true);
                                            if(err) {
                                                self.handleValidationError(err, "Invalid parameters to RPC method", arguments);
                                            } else {
                                                var err = self.performAuthChecks(contextParam);
                                                if(err) {
                                                    self.handleValidationError(err, "Authentication checks failed", arguments);
                                                } else {
                                                    var descriptor= self.getDescriptor();
                                                    var serviceArguments = Array.prototype.slice.call(arguments, 0);
                                                    var style = descriptor.style[0];
                                                    if(descriptor.style.indexOf("subscriber") > 0) {
                                                        style = "subscriber"; // prefer subscriber style if available
                                                    }
                                                    self.getRpc().call(serviceArguments[0], self.getName(), style, methodName, serviceArguments.slice(1));
                                                }
                                            }
                                        };
                                    },

                                    handleValidationError: function(err, msg, arguments) {
                                        Ext.cf.util.Logger.error(msg, err);
                                        if(typeof(arguments[0]) === "function") {
                                            arguments[0].call(null, { status: 'error', error: err });
                                        } else {
                                            throw (err.code + " " + err.message);
                                        }
                                    },

                                    performAuthChecks: function(contextParam) {
                                        var err = null;

                                        var idstore = Ext.io.Io.getIdStore();
                                        var context = {
                                            developerSid: idstore.getSid('developer'),
                                            userSid: idstore.getSid('user')
                                        };
                                        var descriptor = this.getDescriptor();


                                        err = this.validateAuthentication(descriptor.authenticate, context);
                                        if(!err) {
                                            err = this.validateAuthentication(contextParam.authenticate, context);
                                        }

                                        return err;
                                    },

                                    validateAuthentication: function(authType, context) {
                                        var err = null;

                                        if(authType) {
                                            if((authType === "developer" && !context.developerSid) ||
                                            (authType === "user" && !context.userSid)) {
                                                err = Ext.cf.util.ErrorHelper.get('AUTH_REQUIRED', null, { kind: authType });
                                            }
                                        }

                                        return err;        
                                    },

                                    /**
                                    * @private
                                    *
                                    * Create a function that proxies a calls to the method to the server.
                                    *
                                    * @param {String} methodName
                                    *
                                    */
                                    _createMethodProxy: function(methodName) {
                                        var self = this;

                                        return function() {
                                            var descriptor= self.getDescriptor();
                                            var serviceArguments = Array.prototype.slice.call(arguments, 0);
                                            var style = descriptor.style[0];
                                            if(descriptor.style.indexOf("subscriber") > 0) {
                                                style = "subscriber"; // prefer subscriber style if available
                                            }
                                            self.getRpc().call(serviceArguments[0], self.getName(), style, methodName, serviceArguments.slice(1));
                                        };
                                    }

                                });

                                /**
                                * @private
                                * Instances of {@link Ext.io.Service} represent proxy object to async message based services running in the backend.
                                * You can use the proxy to send async messages to the service, to receive async messages from the service,
                                * and if the service is a PubSub type of service, to subscribe/unsubscribe to updates from the service.
                                *
                                * For example:
                                *
                                *     Ext.io.getService("weather", function(weatherService) {
                                *         weatherService.send({temperature: temperature}, function() {
                                *             display("Weather Sensor: sent temperature update " + temperature);
                                *         }, this);
                                *     });
                                *
                                *
                                *     Ext.io.getService("weather", function(weatherService) {
                                *         weatherService.subscribe(function(service, msg) {
                                *             display(service + " got temperature update: " + msg.temperature);
                                *         }, this, function(err) {
                                *             console.log("Error during subscribe!");
                                *         });
                                *     });
                                *
                                */
                                Ext.define('Ext.io.Service', {

                                    config: {
                                        /**
                                        * @cfg name
                                        * @accessor
                                        */
                                        name: null,

                                        /**
                                        * @cfg descriptor
                                        * @accessor
                                        * @private
                                        */
                                        descriptor: null,

                                        /**
                                        * @cfg transport
                                        * @accessor
                                        * @private
                                        */
                                        transport: null,
                                    },

                                    /**
                                    * @private
                                    *
                                    * Constructor
                                    *
                                    */
                                    constructor: function(config) {
                                        this.initConfig(config);
                                        return this;
                                    },

                                    /**
                                    * Send an async message to the service
                                    *
                                    * @param {Object} options An object which may contain the following properties:
                                    *
                                    * @param {Object} options.message A simple Javascript object.
                                    *
                                    * @param {Function} callback The function to be called after sending the message to the server for delivery.
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    *
                                    */
                                    send: function(options,callback,scope) {
                                        this.getTransport().sendToService(this.getName(), options.message, callback, scope);
                                    },

                                    /**
                                    * Receive async messages from the service
                                    *
                                    * For PubSub type of services, which need subscription to start getting messages, see the 'subscribe' method.
                                    *
                                    * @param {Function} callback The function to be called after receiving a message from this service.
                                    * @param {String} callback.from the service the message originated from, i.e. the name of this service.
                                    * @param {Object} callback.message A simple Javascript object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    *
                                    */
                                    receive: function(callback,scope) {
                                        this.getTransport().setListener(this.getName(), function(envelope) {
                                            callback.call(scope,envelope.from,envelope.msg);
                                        }, this);
                                    },

                                    /**
                                    * Subscribe to receive messages from this service.
                                    *
                                    * This method must be used only for PubSub type of services.
                                    * Some services do not need subscription for delivering messages. Use 'receive' to get messages
                                    * from such services.
                                    *
                                    * @param {Function} callback The function to be called after receiving a message from this service.
                                    * @param {String} callback.from the service the message originated from, i.e. the name of this service.
                                    * @param {Object} callback.message A simple Javascript object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    *
                                    */
                                    subscribe: function(callaback,scope) {
                                        var self = this;
                                        self.transport.subscribe(self.getName(), function(err) {
                                            if(err) {
                                                callback.call(scope,err);
                                            } else {
                                                self.transport.setListener(self.getName(), function(envelope) {
                                                    callback.call(scope,envelope.service,envelope.msg);
                                                }, self);
                                            }
                                        }, self);
                                    },

                                    /**
                                    * Unsubscribe from receiving messages from this service.
                                    *
                                    * This method must be used only for PubSub type of services.
                                    */
                                    unsubscribe: function() {
                                        this.transport.unsubscribe(this.getName(), callback, scope);
                                    }
                                });

                                /**
                                * 
                                * @aside guide concepts_device
                                *
                                * The Ext.io.Device class represents an instance of an application running on a physical device. 
                                * It has a zero-or-one relationship with the Ext.io.User class 
                                * A full description of the Ext.io.Device class can be found in the [Device Concept Guide](#!/guide/concepts_device).
                                *
                                * {@img device1.png Class Diagram}
                                *
                                * ## Device Object
                                *
                                * There is always a device object available for the current device.
                                *
                                *          Ext.io.Device.getCurrent({
                                *              function(device){
                                *              
                                *              } 
                                *          });
                                *
                                * Device Objects are also used to represent other devices running the same app.
                                * These can be instantiating using Ext.io.Device.get.
                                *
                                * ## Device Channel
                                *
                                * All devices have an associated channel for receiving messages. A message, which
                                * is a plain old javascript object, can be sent to another device using the 
                                * Ext.io.Device.send method.
                                *
                                *          device.send({
                                *              from: 'John', text: 'Hey!'
                                *          });
                                *
                                * A device can listen for mesasges from other devices with the `on` method.
                                *
                                *          Ext.io.Device.getCurrent({
                                *             function(device){
                                *
                                *                device.on("message"
                                *                    function(sender, message) {
                                *                        console.log("device message", sender, message);
                                *                    }
                                *                );
                                *
                                *             } 
                                *          });
                                *
                                * Device to device messages are always from a single device and to a single device. 
                                *
                                * To send a message to all devices running the same app the client would use
                                * Ext.io.Channel 
                                *
                                * To send a message to all devices of a particular user the client would use
                                * Ext.io.User.send.
                                *
                                */
                                Ext.define('Ext.io.Device', {
                                    extend: 'Ext.io.Object',

                                    mixins: {
                                        observable: "Ext.util.Observable" //using util instead of mixin for EXT 4 compatibility. 
                                    },

                                    /**
                                    * @event message
                                    * Fired when the device receives a message.
                                    * @param {Ext.io.Sender} sender The device that sent the message
                                    * @param {Object} message The message received.
                                    */

                                    statics: {

                                        /**
                                        * @static
                                        * @private
                                        * Find devices that match a query.
                                        * 
                                        * Returns all the device objects that match the given query. The query is a String
                                        * of the form name:value. For example, "city:austin", would search for all the
                                        * devices in Austin, assuming that the app is adding that attribute to all
                                        * its devices.
                                        * 
                                        *       user.find(
                                        *           {query:'city:austin'},
                                        *           function(devices){
                                        *           }
                                        *       );
                                        *
                                        * @param {Object} options An object which may contain the following properties:
                                        * @param {Object} options.query
                                        *
                                        * @param {Function} callback The function to be called after finding the matching devices.
                                        * @param {Array} callback.devices An array of type Ext.io.Device matching devices found for the App if the call succeeded.
                                        * @param {Object} callback.err an error object.
                                        *
                                        * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                        * the callback function.
                                        *
                                        */
                                        find: function(options,callback,scope) {
                                            if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([
                                            { name: "query", type: 'string' },
                                            ],arguments, "Ext.io.Device", "find")) {
                                                Ext.io.App.getCurrent(function(app,err){
                                                    if(app){
                                                        app.findDevices(options,callback,scope);
                                                    }else{
                                                        callback.call(scope,app,err);
                                                    }
                                                });
                                            }
                                        },

                                        /**
                                        * @static
                                        * Get the current Device object.
                                        *
                                        *          Ext.io.Device.getCurrent(
                                        *              function(device){
                                        *              } 
                                        *          );
                                        *
                                        * The current Device object is an instance of Ext.io.Device class. It represents
                                        * the device that this web app is running on. It is always available.
                                        *
                                        * The device object returned by this method will fire message events whenever a message is set from the the server.
                                        *
                                        * @param {Function} callback The function to be called after getting the current Device object.
                                        * @param {Object} callback.device The current Ext.io.Device object if the call succeeded.
                                        * @param {Object} callback.err an error object.
                                        *
                                        * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                        * the callback function.
                                        *
                                        */
                                        getCurrent: function(callback,scope) {
                                            if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments, "Ext.io.Device", "getCurrent")) {
                                                var deviceId = Ext.io.Io.getIdStore().getId('device');
                                                if (!deviceId) {
                                                    var err = { code : 'NO_DEVICE_ID', message: 'Device ID not found' };
                                                    callback.call(scope,undefined,err);
                                                } else {
                                                    var cb = function(device,errors){
                                                        if(device && device.receive) {
                                                            device.receive();
                                                        }
                                                        callback.call(scope, device, errors);
                                                    }
                                                    this.getObject(deviceId, cb, this);
                                                }
                                            }
                                        },

                                        /**
                                        * @static
                                        * Get Device
                                        *
                                        * @param {Object} options
                                        * @param {Object} options.id
                                        *
                                        * @param {Function} callback The function to be called after getting the Device object.
                                        * @param {Object} callback.device The Ext.io.Device object if the call succeeded.
                                        * @param {Object} callback.err an error object.
                                        *
                                        * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                        * the callback function.
                                        */
                                        get: function(options,callback,scope) {
                                            if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([
                                            { name: "id", type: 'string|number' },
                                            ],arguments, "Ext.io.Device", "get")) {
                                                this.getObject(options.id, callback, scope);
                                            }
                                        }
                                    },

                                    /**
                                    * @private
                                    * Get the App associated with this Device.
                                    *
                                    *          device.getApp(
                                    *              function(app){
                                    *              } 
                                    *          );
                                    *
                                    * @param {Function} callback The function to be called after getting the App object.
                                    * @param {Object} callback.app The Ext.io.App associated with this Device if the call succeeded.
                                    * @param {Object} callback.err an error object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    *
                                    */
                                    getApp: function(callback,scope) {
                                        this.getRelatedObject(Ext.io.Version, this.getData().version, null, function(version, err) {
                                            if(err) {
                                                callback.call(scope,undefined,err);
                                            } else {
                                                version.getRelatedObject(Ext.io.App, null, null, callback, scope);
                                            }
                                        }, this);
                                    },

                                    /**
                                    * Get the User associated with this Device, if any.
                                    *
                                    *          device.getUser(
                                    *              function(user){
                                    *              } 
                                    *          );
                                    *
                                    *
                                    * @param {Function} callback The function to be called after getting the User object.
                                    * @param {Object} callback.user The Ext.io.User associated with this Device if the call succeeded.
                                    * @param {Object} callback.err an error object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    *
                                    */
                                    getUser: function(callback,scope) {
                                        if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments, "Ext.io.Device", "getUser")) {
                                            this.getRelatedObject(Ext.io.User, null, null, callback, scope);
                                        }
                                    },

                                    /**
                                    * Send a message to this Device.
                                    *
                                    * The send method allow messages to be sent to another device. The message
                                    * is a simple Javascript object. The message is channeld on the server until
                                    * the destination device next comes online, then it is delivered.
                                    *
                                    *        device.send({
                                    *            message: {city: 'New York', state: 'NY'},
                                    *        }, function(error){
                                    *            console.log("send callback", error);
                                    *        });
                                    *
                                    * See message event for receiving device to device messages.
                                    *
                                    *
                                    * @param {Object} options
                                    * @param {Object} options.message A simple Javascript object.
                                    *
                                    * @param {Function} callback The function to be called after sending the message to the server for delivery.
                                    * @param {Object} callback.error an error object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    *
                                    */
                                    send: function(options,callback,scope) {
                                        if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([{ name: "message", type: 'string|object' }],arguments, "Ext.io.Device", "send")) {
                                        Ext.io.Io.getMessagingProxy(function(messaging){
                                            messaging.transport.sendToClient(this.getId(), options.message, callback, scope);
                                        },this);
                                    }
                                },

                                /**
                                * @private
                                * 
                                * This method is called by Ext.io.Device.getCurrent before the device
                                * object is returned.  It should not be called directly. 
                                * 
                                * Receive messages for this Device.
                                *
                                * To receive messages sent directly to a device the app must use this
                                * method to register a handler function. Each message is passed to the
                                * callback function as it is received. The message is a simple Javascript
                                * object.
                                *
                                *      device.receive(
                                *          function(sender, message) {
                                *              console.log("received a message:", sender, message);
                                *          }
                                *      );
                                *
                                * See send for sending these device to device messages.
                                *
                                * @param {Function} callback Optional function to be called after receiving a message for this Device.
                                * @param {String} callback.from The sending Device ID.
                                * @param {Object} callback.message A simple Javascript object.
                                *
                                * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                * the callback function.
                                *
                                */
                                receive: function(callback,scope) {
                                    if(callback) {
                                        this.on("message", callback, scope);
                                    }
                                    if(!this.subscribedFn){
                                        this.subscribedFn = function(envelope) {
                                            var sender = Ext.create('Ext.io.Sender', envelope.from);
                                            this.fireEvent("message", sender, envelope.msg);
                                        };
                                        Ext.io.Io.getMessagingProxy(function(messaging){
                                            messaging.transport.setListener("courier", this.subscribedFn, this);
                                        },this);
                                    } 
                                },

                                /**
                                * @private
                                *
                                * Get Version
                                *
                                * @param {Function} callback The function to be called after getting the version.
                                * @param {Object} callback.version 
                                * @param {Object} callback.err an error object.
                                *
                                * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                * the callback function.
                                */
                                getVersion: function(callback,scope) {
                                    this.getRelatedObject(Ext.io.Version, this.getData().version, null, callback, scope);
                                },

                            });

                            /**
                            * @aside guide concepts_user
                            *
                            * The Ext.io.User class represents the person using the app on the device.
                            * It has a one-to-many relationship with the Ext.io.Device class. 
                            * A full description of the Ext.io.User class can be found in the [User Concept Guide](#!/guide/concepts_user).
                            *
                            * {@img user1.png Class Diagram}
                            *
                            * Once the user has been registered or authenticated then the current user 
                            * object will always be available using Ext.io.User.getCurrent.
                            *
                            *      Ext.io.User.getCurrent(
                            *          function(user){
                            *              
                            *          } 
                            *      );
                            *
                            *
                            * ## User registration
                            *
                            * A user can be registered using the Ext.io.User.register method.
                            *
                            *       Ext.io.User.register(
                            *           {
                            *               username:'bob',
                            *               password:'secret',
                            *               email:'bob@isp.com'
                            *           },
                            *           function(user){
                            *           }
                            *       );
                            *
                            * Note that if you include the Ext.io.Controller class in your Sencha Touch based
                            * app then it will automatically handle the user registration and authentication
                            * process.
                            *   
                            * ## User Authentication
                            *
                            * A user can be authenticationed, with their username and password, using the
                            * Ext.io.User.authenticate methods.
                            *
                            *       Ext.io.User.authenticate({
                            *           {
                            *               username:'bob',
                            *               password:'secret',
                            *           },
                            *           function(user){
                            *           }
                            *      );
                            *
                            * Note that if you include the Ext.io.Controller class in your Sencha Touch based
                            * app then it will automatically handle the user registration and authentication
                            * process.
                            *
                            * ## User Logout
                            *
                            * The Ext.io.User.logout method will end the user's session.
                            *
                            * ## User Messaging
                            *
                            * Applications can send messages to other users by calling Ext.io.User.send.
                            *
                            *          user.send({
                            *              from: 'John', text: 'Hey!'
                            *          });
                            *
                            * A user can listen for messages from other users by listening for the message event.
                            *
                            *          Ext.io.User.getCurrent(
                            *             function(user){
                            *
                            *                user.on("message"
                            *                    function(sender, message) {
                            *                        console.log("user message", sender, message);
                            *                    }
                            *                );
                            *
                            *             } 
                            *          );
                            *
                            * If the user has multiple devices running the same app, then the same message will be received by all those
                            * app instances. 
                            * 
                            * To send a message to all devices running the same app the client would use Ext.io.Channel.
                            *
                            * To send a message to a specific device the client would use Ext.io.Device

                            */
                            Ext.define('Ext.io.User', {
                                extend: 'Ext.io.Object',

                                requires: [
                                'Ext.io.Sender',
                                'Ext.io.Store'
                                ],

                                mixins: {
                                    observable: "Ext.util.Observable" //using util instead of mixin for EXT 4 compatibility. 
                                },

                                /**
                                * @event message
                                * Fired when the user receives a message.
                                * @param {Ext.io.Sender} sender The user/device that sent the message
                                * @param {Object} the message sent.
                                */

                                statics: {

                                    /**
                                    * @static  
                                    * Register a new User.
                                    * 
                                    * If the user does not already exist in the group then a new user is created,
                                    * and is returned as an instance of {@link Ext.io.User}.
                                    *
                                    *       Ext.io.User.register(
                                    *           {
                                    *               username:'bob',
                                    *               password:'secret',
                                    *               email:'bob@isp.com'
                                    *           }
                                    *           function(user){
                                    *           }
                                    *      );
                                    *
                                    * @param {Object} options User profile attributes.
                                    * @param {Object} options.username
                                    * @param {Object} options.password
                                    * @param {Object} options.email
                                    *
                                    * @param {Function} callback The function to be called after registering the user.
                                    * @param {Object} callback.user The {Ext.io.User} if registration succeeded.
                                    * @param {Object} callback.err an error object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                    * the callback function.
                                    *
                                    */
                                    register: function(options,callback,scope) {
                                        if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([
                                        { name: "username", type: 'string' },
                                        { name: "password", type: 'string' },
                                        { name: "email", type: 'string' }
                                        ],arguments, "Ext.io.User", "register")) {
                                            Ext.io.Group.getCurrent(function(group,err){
                                                if(group){
                                                    group.register(options,callback,scope);
                                                }else{
                                                    callback.call(scope,group,err);
                                                }
                                            });
                                        }
                                    },

                                    /**
                                    * @static  
                                    * Authenticate an existing User.
                                    *
                                    * Checks if the user is a member of the group. The user provides a username
                                    * and password. If the user is a member of the group, and the passwords match,
                                    * then an instance of {@link Ext.io.User} is returned. The current user object is
                                    * now available through {@link Ext.io.User.getCurrent}
                                    *
                                    *       Ext.io.User.authenticate(
                                    *           {
                                    *               username:'bob',
                                    *               password:'secret',
                                    *           },
                                    *           function(user){
                                    *           }
                                    *      );
                                    *
                                    * We use a digest based authentication mechanism to ensure that no
                                    * sensitive information is passed over the network.
                                    *
                                    * @param {Object} options Authentication credentials
                                    * @param {Object} options.username
                                    * @param {Object} options.password
                                    *
                                    * @param {Function} callback The function to be called after authenticating the user.
                                    * @param {Object} callback.user The {Ext.io.User} if authentication succeeded.
                                    * @param {Object} callback.err an error object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                    * the callback function.
                                    *
                                    */
                                    authenticate: function(options,callback,scope) {
                                        if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope(null,arguments, "Ext.io.User", "authenticate")) {
                                            Ext.io.Group.getCurrent(function(group,err){
                                                if(group){
                                                    //Once we have user, before we return it to the caller
                                                    // enable recieve so that we will get user messages.
                                                    var cb = function(user,errors){
                                                        if(user) {
                                                            user.receive();
                                                        }
                                                        callback.call(scope, user, errors);
                                                    }
                                                    group.authenticate(options,cb,scope);
                                                }else{
                                                    callback.call(scope,group,err);
                                                }
                                            });
                                        }
                                    },

                                    /**
                                    * @static  
                                    * @private
                                    * Find Users that match a query.
                                    *
                                    * Returns all the user objects that match the given query. The query is a String
                                    * of the form name:value. For example, "hair:brown", would search for all the
                                    * users with brown hair, assuming that the app is adding that attribute to all
                                    * its users. 
                                    *
                                    *       Ext.io.User.find(
                                    *           {query:'username:bob'},
                                    *           function(users){
                                    *           }
                                    *       );
                                    *
                                    * @param {Object} options An object which may contain the following properties:
                                    * @param {Object} options.query
                                    *
                                    * @param {Function} callback The function to be called after finding the matching users.
                                    * @param {Array} callback.users Array of {Ext.io.User} objects that match the query. 
                                    * @param {Object} callback.err an error object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                    * the callback function.
                                    *
                                    */
                                    find: function(options,callback,scope) {
                                        if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([{ name: "query", type: 'string' }],arguments, "Ext.io.User", "find")) {
                                        Ext.io.Group.getCurrent(function(group,err){
                                            if(group){
                                                group.findUsers(options,callback,scope);
                                            }else{
                                                callback.call(scope,group,err);
                                            }
                                        });
                                    }
                                },

                                /**
                                * @static        
                                * Get the current User, if any.
                                *
                                * The current User object is an instance of {@link Ext.io.User}. It represents
                                * the user of the web app. If there is no group associated with the app,
                                * then there will not be a current user object. If there is a group, and
                                * it has been configured to authenticate users before download then the
                                * current user object will be available as soon as the app starts running.
                                * If the group has been configured to authenticate users within the app
                                * itself then the current user object will not exist until after a
                                * successful call to Ext.io.User.authenticate has been made.
                                *
                                *          Ext.io.User.getCurrent(
                                *              function(user){
                                *              } 
                                *          );
                                *
                                * @param {Function} callback The function to be called after getting the current User object.
                                * @param {Object} callback.user The current {Ext.io.User} object if the call succeeded.
                                * @param {Object} callback.err an error object.
                                *
                                * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                * the callback function.
                                *
                                */
                                getCurrent: function(callback,scope) {
                                    if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments, "Ext.io.User", "getCurrent")) {
                                        var idstore = Ext.io.Io.getIdStore();
                                        var userId = idstore.getId('user');
                                        var userSid = idstore.getSid('user');
                                        if (!userId) {
                                            var err = { code : 'NO_CURRENT_USER', message : 'User ID not found' };
                                            callback.call(scope,undefined,err);
                                        } else if (!userSid) {
                                            var err = { code : 'NO_CURRENT_USER', message : 'User not authenticated' };
                                            callback.call(scope,undefined,err);
                                        } else {
                                            this.getObject(userId,function(user,errors){
                                                if(user) {
                                                    //
                                                    // Once we have the user, but before we return it to the caller
                                                    // we call recieve so that message events will start firing.
                                                    //
                                                    user.receive();
                                                }
                                                callback.call(scope, user, errors);
                                            },this);
                                        }
                                    }
                                },

                                /**
                                * @static
                                * Get User
                                *
                                * @param {Object} options
                                * @param {String} options.id
                                *
                                * @param {Function} callback The function to be called after getting the User object.
                                * @param {Object} callback.user The Ext.io.User object if the call succeeded.
                                * @param {Object} callback.err an error object.
                                *
                                * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                * the callback function.
                                */
                                get: function(options,callback,scope) {
                                    this.getObject(options.id, callback, scope);
                                }

                            },

                            /**
                            * @private
                            *
                            * Constructor
                            *
                            *
                            */
                            constructor: function(config) {
                                this.initConfig(config);
                                this.userChannelName =  'Users/' + this.getId();
                                // name of the user channel (inbox)
                            },

                            /**
                            * Get all devices that belong to this user
                            *
                            *          user.getDevices(
                            *              function(devices){
                            *              } 
                            *          );
                            *
                            * @param {Function} callback The function to be called after getting the devices that belong to this user.
                            * @param {Object} callback.devices Array of {Ext.io.Device} objects that belonging to this User.
                            * @param {Object} callback.err an error object.
                            *
                            * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                            * the callback function.
                            *
                            */
                            getDevices: function(callback,scope) {
                                if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments, "Ext.io.User", "getDevices")) {
                                    this.getRelatedObjects(Ext.io.Device, null, callback, scope);
                                }
                            },

                            /**
                            * @private
                            * Get the user group that this user is a member of.
                            *
                            *          user.getGroup(
                            *              function(group){
                            *              } 
                            *          });
                            *
                            * @param {Function} callback The function to be called after getting the Group object.
                            * @param {Object} callback.group The {Ext.io.Group} object for this User if the call succeeded.
                            * @param {Object} callback.err an error object.
                            *
                            * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                            * the callback function.
                            *
                            */
                            getGroup: function(callback,scope) {
                                this.getRelatedObject(Ext.io.Group, this.getData().group, null, callback, scope);
                            },

                            /**
                            * Send a message to this User.
                            *
                            *
                            *        user.send(
                            *            {message:{fromDisplayName: 'John', text: 'Hello'}},
                            *            function(error) {
                            *              console.log("send callback", error);
                            *            }
                            *        );
                            * 
                            *  *Note that the callback fires when the server accepts the message, not when the message
                            *  is delivered to the user.*
                            *
                            * @param {Object} message A simple Javascript object.
                            *
                            * @param {Function} callback The function to be called after sending the message to the server for delivery.
                            *
                            * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                            * the callback function.
                            */
                            send: function(options,callback,scope) {
                                if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([{ name: "message", type: 'string|object' }],arguments, "Ext.io.User", "send")) {
                                Ext.io.Io.getMessagingProxy(function(messaging){
                                    messaging.pubsub.publish(this.userChannelName, null, options.message, callback, scope);
                                },this);
                            }
                        },

                        /**
                        * @private
                        * Called by Ext.io.User.getCurrent to get messages delivered to this user see Ext.io.User.message
                        * 
                        * Receive messages for this User.
                        *
                        *      user.receive(
                        *          function(sender, message) {
                        *              console.log("received a message:", sender, message);
                        *          }
                        *      );
                        *
                        *
                        * @param {Function} callback The function to be called after a message is received for this User.
                        * @param {Ext.io.Sender} callback.sender  The user/device that sent the message
                        * @param {Object} callback.message A simple Javascript object.
                        * @param {Object} callback.err an error object.
                        *
                        * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                        * the callback function.
                        */
                        receive: function(callback,scope) {

                            if(callback) {
                                this.on("message", callback, scope);
                            }

                            if(!this.subscribedFn){
                                this.subscribedFn = function receiveCallback(from, message) {
                                    var sender = Ext.create('Ext.io.Sender', from);
                                    this.fireEvent("message", sender, message);
                                };
                                Ext.io.Io.getMessagingProxy(function(messaging){
                                    messaging.pubsub.subscribe(this.userChannelName, null, this.subscribedFn, this, Ext.emptyFn);
                                },this);

                            } 

                        },

                        /**
                        * Logout
                        * Removes the user's session and id from local storage.  This will 
                        * keep the user from having further access to the authenticated parts
                        * of the application.  However this does not clear copies of sync stores.
                        * To do that the application must call `store.getProxy().clear()` on every 
                        * user or application store. The application is also responsible for removing any other user data it has stored elsewhere.
                        *
                        */
                        logout: function() {
                            Ext.io.Io.getIdStore().remove('user','sid');
                            Ext.io.Io.getIdStore().remove('user','id');
                        },

                        /**
                        * @private
                        * Get a Store
                        *
                        * All instances of a user have access to the same stores. 
                        *
                        *          user.getStore(
                        *               {
                        *                   name:music,
                        *                   city:austin
                        *               },
                        *               function(store){
                        *               }
                        *           );     
                        *
                        * @param {Object} options Store options may contain custom metadata in addition to the name, which is manadatory
                        * @param {String} options.name Name of the store
                        *
                        * @param {Function} callback The function to be called after getting the store.
                        * @param {Object} callback.store The named {Ext.io.Channel} if the call succeeded.
                        * @param {Object} callback.err an error object.
                        *
                        * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                        * the callback function.
                        *
                        */
                        getStore: function(options,callback,scope) {
                            Ext.io.Io.getMessagingProxy(function(messaging){
                                messaging.getService(
                                {name: "naming-rpc"},
                                function(namingRpc,err) {
                                    if(namingRpc){
                                        namingRpc.getStore(function(result) {
                                            if(result.status == "success") {
                                                var store = Ext.create('Ext.io.Store', {id:result.value._key, data:result.value.data});
                                                callback.call(scope,store);
                                            } else {
                                                callback.call(scope,undefined,result.error);
                                            }
                                        }, this.getId(), options);
                                    }else{
                                        callback.call(scope,undefined,err);
                                    }
                                },
                                this
                                );
                            },this);
                        },

                        /**
                        * @private
                        * Find stores that match a query.
                        * 
                        * Returns all the store objects that match the given query. The query is a String
                        * of the form name:value. For example, "city:austin", would search for all the
                        * stores in Austin, assuming that the app is adding that attribute to all
                        * its stores. 
                        *
                        *       user.findStores(
                        *           {query:'city:austin'},
                        *           function(stores){
                        *           }
                        *       );
                        *
                        * @param {Object} options An object which may contain the following properties:
                        * @param {Object} options.query
                        *
                        * @param {Function} callback The function to be called after finding the matching stores.
                        * @param {Object} callback.stores The {Ext.io.Store[]} matching stores found for the App if the call succeeded.
                        * @param {Object} callback.err an error object.
                        *
                        * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                        * the callback function.
                        *
                        */
                        findStores: function(options,callback,scope) {
                            this.findRelatedObjects(Ext.io.Store, this.getId(), null, options.query, callback, scope);    
                        },

                    });

                    /**
                    * @private
                    * {@img group.png Class Diagram}
                    *
                    * The {@link Ext.io.Group} class represents a group of users. There is only one
                    * group object, called the current group object, available to the client.
                    * If the current app is not associated with a user group then there will
                    * be no user group.
                    *
                    *          Ext.io.Group.getCurrent(
                    *             function(group){
                    *              
                    *             } 
                    *          );
                    *
                    *
                    * Methods are provided for navigation through the graph of objects available
                    * to the currently running client code. 
                    */
                    Ext.define('Ext.io.Group', {
                        extend: 'Ext.io.Object',

                        requires: [
                        'Ext.cf.messaging.AuthStrategies'
                        ],

                        statics: {

                            /**
                            * @static
                            * Get the current user Group object.
                            *
                            *          Ext.io.Group.getCurrent(
                            *              function(group){
                            *              } 
                            *          );
                            *
                            * @param {Function} callback The function to be called after getting the current Group object.
                            * @param {Object} callback.group The current {Ext.io.Group} object if the call succeeded.
                            * @param {Object} callback.err an error object.
                            *
                            * @param {Object} scope The scope in which to execute the callback. The "this" object for
                            * the callback function.
                            */
                            getCurrent: function(callback,scope) {
                                var groupId = Ext.io.Io.getIdStore().getId('group');
                                if (!groupId) {
                                    // try to get the group from the app
                                    Ext.require('Ext.io.App');
                                    Ext.io.App.getCurrent(function(app,err) {
                                        if(app){
                                            app.getGroup(function(group,err) {
                                                Ext.io.Io.getIdStore().setId('group', group ? group.getId() : null);
                                                callback.call(scope,group,err);
                                            });
                                        }else{
                                            callback.call(scope,undefined,err);
                                        }
                                    });
                                } else {
                                    this.getObject(groupId, callback, scope);
                                }
                            },


                            /**
                            * @static
                            * Get Group
                            *
                            * @param {Object} options
                            * @param {String} options.id
                            *
                            * @param {Function} callback The function to be called after getting the Group object.
                            * @param {Object} callback.group The current {Ext.io.Group} Object if the call succeeded.
                            * @param {Object} callback.err an error object.
                            *
                            * @param {Object} scope The scope in which to execute the callback. The "this" object for
                            * the callback function.
                            */
                            get: function(options,callback,scope) {
                                this.getObject(options.id, callback, scope);
                            }
                        },

                        /**
                        * Get the App associated with this user Group.
                        *
                        * Returns an instance of {@link Ext.io.App} for the current app.
                        *
                        *      group.getApp(
                        *          function(app) {
                        *          }
                        *      );
                        *
                        * @param {Function} callback The function to be called after getting the App object.
                        * @param {Object} callback.app The {Ext.io.App} associated with this Group if the call succeeded.
                        * @param {Object} callback.err an error object.
                        *
                        * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                        * the callback function.
                        */
                        getApp: function(callback,scope) {
                            Ext.io.App.getCurrent(callback,scope);
                        },

                        /**
                        * Find Users that match a query.
                        *
                        * Returns all the user objects that match the given query. The query is a String
                        * of the form name:value. For example, "hair:brown", would search for all the
                        * users with brown hair, assuming that the app is adding that attribute to all
                        * its users. 
                        *
                        *       group.findUsers(
                        *           {query:'username:bob'},
                        *           function(users){
                        *           }
                        *       );
                        *
                        * @param {Object} options
                        * @param {String} options.query
                        *
                        * @param {Function} callback The function to be called after finding the users.
                        * @param {Object} callback.users The {Ext.io.User[]} matching users found for the Group if the call succeeded.
                        * @param {Object} callback.err an error object.
                        *
                        * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                        * the callback function.
                        */
                        findUsers: function(options,callback,scope) {
                            if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([
                            { name: "query", type: 'string' },
                            ],arguments, "Ext.io.Group", "findUsers")) {
                                this.findRelatedObjects(Ext.io.User, null, null, options.query, callback, scope);
                            }
                        },

                        /**
                        * Register a new User.
                        * 
                        * If the user does not already exist in the group then a new user is created,
                        * and is returned as an instance of {@link Ext.io.User}. The same user is now available
                        * through the {@link Ext.io.User.getCurrent}.
                        *
                        *       group.register(
                        *           {
                        *               username:'bob',
                        *               password:'secret',
                        *               email:'bob@isp.com'
                        *           },
                        *           function(user){
                        *           }
                        *      );
                        *
                        * @param {Object} options User profile attributes.
                        * @param {Object} options.username
                        * @param {Object} options.password
                        * @param {Object} options.email
                        *
                        * @param {Function} callback The function to be called after registering.
                        * @param {Object} callback.user The {Ext.io.User} object if the call succeeded.
                        * @param {Object} callback.err an error object.
                        *
                        * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                        * the callback function.
                        */
                        register: function(options,callback,scope) {
                            Ext.io.Io.getMessagingProxy(function(messaging){
                                messaging.getService(
                                {name: "groupmanager"},
                                function(groupManager,err) {
                                    if(groupManager){
                                        groupManager.registerUser(function(result) {
                                            if (result.status == "success") {
                                                var user = Ext.create('Ext.io.User', {id:result.value._key, data:result.value.data});
                                                Ext.io.Io.getIdStore().setId('user', user.getId());
                                                Ext.io.Io.getIdStore().setSid('user', result.sid);
                                                callback.call(scope,user);
                                            } else {
                                                callback.call(scope,undefined,result.error);
                                            }
                                        }, {authuser:options, groupId:this.getId()});
                                        }else{
                                            callback.call(scope,undefined,err);
                                        }
                                    },
                                    this
                                    );
                                },this);
                            },

                            /**
                            * Authenticate an existing User.
                            *
                            * Checks if the user is a member of the group. The user provides a username
                            * and password. If the user is a member of the group, and the passwords match,
                            * then an instance of {@link Ext.io.User} is returned. The current user object is
                            * now available through {@link Ext.io.User.getCurrent}
                            *
                            *       group.authenticate(
                            *           {
                            *               username:'bob',
                            *               password:'secret',
                            *           },
                            *           function(user){
                            *           }
                            *      );
                            *
                            * We use a digest based authentication mechanism to ensure that no
                            * sensitive information is passed over the network.
                            *
                            * @param {Object} options Authentication credentials
                            * @param {Object} options.username
                            * @param {Object} options.password
                            *
                            * @param {Function} callback The function to be called after authenticating the developer.
                            * @param {Object} callback.developer The {Ext.io.Developer} object if the call succeeded.
                            * @param {Object} callback.err an error object.
                            *
                            * @param {Object} scope The scope in which to execute the callback. The "this" object for
                            * the callback function.
                            */
                            authenticate: function(options,callback,scope) {
                                var type = this.getAuthMethod();       
                                var auth = Ext.cf.messaging.AuthStrategies.strategies[type];
                                if(auth) {
                                    auth(this, options, function(user, usersid, err) {
                                        if(user) {
                                            Ext.io.Io.getIdStore().setId('user', user.getId());
                                            Ext.io.Io.getIdStore().setSid('user', usersid);
                                            Ext.io.Io.getIdStore().setId('group', this.getId());
                                        }
                                        callback.call(scope,user,err);
                                    }, this); 
                                } else {
                                    console.error("Unsupported group registration type: " + type + ".  Choose a different type from the developer console.");
                                }  
                            },

                            /**
                            * @private
                            */
                            getAuthMethod: function(){
                                var type = "digest";
                                //if regtype was a string we could just use direct mapping. 
                                // type = this.data.regtype;
                                if(this.getData().fb && this.getData().fb.enabled === true){
                                    type = "facebook";
                                } else if(this.getData().twitter && this.getData().twitter.enabled === true){
                                    type = "twitter";
                                }
                                return type;
                            },

                            /**
                            * Find stores that match a query.
                            * 
                            * Returns all the group's store objects that match the given query. The query is a String
                            * of the form name:value. For example, "city:austin", would search for all the
                            * stores in Austin, assuming that the app is adding that attribute to all
                            * its stores. 
                            *
                            *       group.findStores(
                            *           {query:'city:austin'},
                            *           function(stores){
                            *           }
                            *       );
                            *
                            * @param {Object} options
                            * @param {String} options.query
                            *
                            * @param {Function} callback The function to be called after finding the stores.
                            * @param {Object} callback.stores The {Ext.io.Store[]} matching stores found for the Group if the call succeeded.
                            * @param {Object} callback.err an error object.
                            *
                            * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                            * the callback function.
                            */
                            findStores: function(options,callback,scope) {
                                this.findRelatedObjects(Ext.io.Store, this.getId(), null, options.query, callback, scope);    
                            },

                        });

                        /**
                        * @private
                        * Developer 
                        *
                        */
                        Ext.define('Ext.io.Developer', {
                            extend: 'Ext.io.Object',
                            requires: [
                            'Ext.cf.util.Md5', 
                            'Ext.cf.util.ErrorHelper'
                            ],

                            statics: {

                                /**
                                * @static
                                * Authenticate developer
                                *
                                * @param {Object} options
                                * @param {String} options.username
                                * @param {String} options.password
                                *
                                * @param {Function} callback The function to be called after authenticating the developer.
                                * @param {Object} callback.developer The {Ext.io.Developer} object if the call succeeded.
                                * @param {Object} callback.err an error object.
                                *
                                * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                * the callback function.
                                */
                                authenticate: function(options,callback,scope) {
                                    var self = this;

                                    Ext.io.Io.getService(
                                    {name: "teammanager"},
                                    function(devService,err) {
                                        if(devService){
                                            devService.authenticate(function(result) {
                                                if (result.status == "success") {
                                                    var developer = Ext.create('Ext.io.Developer', {id:result.value._key, data:result.value.data});                            
                                                    Ext.io.Io.getIdStore().setSid('developer', result.session.sid);
                                                    Ext.io.Io.getIdStore().setId('developer', result.value._key);
                                                    callback.call(scope,developer);
                                                } else {
                                                    callback.call(scope,undefined,result.error);
                                                }
                                            }, {username : options.username, password : Ext.cf.util.Md5.hash(options.password), provider:"sencha"});
                                            }else{
                                                callback.call(scope,undefined,err);
                                            }
                                        },
                                        this
                                        );
                                    },

                                    /**
                                    * @static
                                    * Get current developer
                                    *
                                    * @param {Function} callback The function to be called after getting the current Developer object.
                                    * @param {Object} callback.developer The current {Ext.io.Developer} object if the call succeeded.
                                    * @param {Object} callback.err an error object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                    * the callback function.
                                    */
                                    getCurrent: function(callback,scope) {
                                        var developerId = Ext.io.Io.getIdStore().getId('developer');
                                        if (!developerId) {
                                            var err = { code : 'NOT_LOGGED', message: 'Developer is not logged in' };
                                            callback.call(scope,undefined,err);
                                        } else {
                                            this.getObject(developerId, callback, scope);
                                        }
                                    },

                                    /**
                                    * @static
                                    * Get Developer
                                    *
                                    * @param {Object} options
                                    * @param {String} options.id
                                    *
                                    * @param {Function} callback The function to be called after getting the current Developer object.
                                    * @param {Object} callback.developer The {Ext.io.Developer} object if the call succeeded.
                                    * @param {Object} callback.err an error object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                    * the callback function.
                                    */
                                    get: function(options,callback,scope) {
                                        this.getObject(options.id, callback, scope);
                                    }
                                },

                                /**
                                * Get Teams
                                *
                                * @param {Object} options
                                *
                                * @param {Function} callback The function to be called after getting the Developer's teams.
                                * @param {Object} callback.teams The {Ext.io.Team[]} teams of the developer if the call succeeded.
                                * @param {Object} callback.err an error object.
                                *
                                * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                * the callback function.
                                */
                                getTeams: function(options,callback,scope) {
                                    var tag = (typeof(options.owner) != "undefined") ? ((options.owner) ? 'owner' : 'member') : null;
                                    this.getRelatedObjects(Ext.io.Team, tag, callback, scope);
                                },

                                /**
                                * Create Team
                                *
                                * @param {Object} options
                                *
                                * @param {Function} callback The function to be called after creating a team.
                                * @param {Object} callback.team The {Ext.io.Team} object if the call succeeded.
                                * @param {Object} callback.err an error object.
                                *
                                * @param {Object} scope The scope in which to execute the callback. The "this" object for
                                * the callback function.
                                */
                                createTeam: function(options,callback,scope) {
                                    this.createRelatedObject("createTeam", Ext.io.Team, options, callback, scope);
                                },

                                /**
                                * Logout
                                *
                                */
                                logout: function() {
                                    Ext.io.Io.getIdStore().remove('developer','sid');
                                    Ext.io.Io.getIdStore().remove('developer','id');
                                }

                            });
                            /**
                            * @private
                            * Team
                            */
                            Ext.define('Ext.io.Team', {
                                extend: 'Ext.io.Object',

                                mixins: {
                                    withpicture: 'Ext.io.WithPicture'
                                },

                                statics: {

                                    /**
                                    * @static
                                    * Get Team
                                    *
                                    * @param {Object} options
                                    * @param {String} options.id
                                    *  
                                    * @param {Function} callback The function to be called after getting team.
                                    * @param {Object} callback.team The {Ext.io.Team} Team object if the call succeeded.
                                    * @param {Object} callback.err an error object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    */
                                    get: function(options,callback,scope) {
                                        this.getObject(options.id, callback, scope);
                                    }
                                },

                                /**
                                *
                                * Create App
                                *
                                * @param {Object} options
                                *  
                                * @param {Function} callback The function to be called after creating App.
                                * @param {Object} callback.app The {Ext.io.App} App object if the call succeeded.
                                * @param {Object} callback.err an error object.
                                *
                                * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                * the callback function.
                                */
                                createApp: function(options,callback,scope) {
                                    this.createRelatedObject("createApp", Ext.io.App, options, callback, scope);
                                },

                                /**
                                *
                                * Create Group
                                *
                                * @param {Object} options
                                * 
                                * @param {Function} callback The function to be called after creating Group.
                                * @param {Object} callback.group The {Ext.io.Group} Group object if the call succeeded.
                                * @param {Object} callback.err an error object.
                                *
                                * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                * the callback function.
                                */
                                createGroup: function(options,callback,scope) {
                                    this.createRelatedObject("createGroup", Ext.io.Group, options, callback, scope);
                                },

                                /**
                                * @private
                                *
                                * Get Developers
                                *
                                * @param {Object} options
                                * @param {Boolean} options.owner
                                * 
                                * @param {Function} callback The function to be called after getting developers.
                                * @param {Object} callback.developers The {Ext.io.Developer[]} developers object if the call succeeded.
                                * @param {Object} callback.err an error object.
                                *
                                * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                * the callback function.
                                */
                                getDevelopers: function(options,callback,scope) {
                                    var tag = (typeof(options.owner) != "undefined") ? ((options.owner) ? 'owner' : 'member') : '_';
                                    this.getRelatedObjects(Ext.io.Developer, tag, callback, scope);
                                },

                                /**
                                *
                                * Get Apps
                                *
                                * @param {Object} options
                                * 
                                * @param {Function} callback The function to be called after getting apps.
                                * @param {Object} callback.apps The {Ext.io.App[]} apps object if the call succeeded.
                                * @param {Object} callback.err an error object.
                                *
                                * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                * the callback function.
                                */
                                getApps: function(callback,scope) {
                                    this.getRelatedObjects(Ext.io.App, null, callback, scope);
                                },

                                /**
                                *
                                * Get Groups
                                *
                                * @param {Object} options
                                * 
                                * @param {Function} callback The function to be called after getting groups.
                                * @param {Object} callback.group The {Ext.io.Group[]} groups object if the call succeeded.
                                * @param {Object} callback.err an error object.
                                *
                                * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                * the callback function.
                                */
                                getGroups: function(callback,scope) {
                                    this.getRelatedObjects(Ext.io.Group, null, callback, scope);
                                },

                                /**
                                *
                                * Manage Developer
                                *
                                * @param {String} method
                                *
                                * @param {Object} options
                                * @param {Object} options.id
                                * 
                                * @param {Function} callback The function to be called after managing developer.
                                * @param {Object} callback.err an error object.
                                *
                                * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                * the callback function.
                                */
                                manageDeveloper: function(method,options,callback,scope) {
                                    Ext.io.Io.getMessagingProxy(function(messaging){
                                        messaging.getService(
                                        {name: "TeamService"},
                                        function(teamService,err) {
                                            if(teamService){
                                                teamService[method](function(result) {
                                                    if(result.status == "success") {
                                                        callback.call(scope);
                                                    } else {
                                                        callback.call(scope,result.error);
                                                    }
                                                }, this.getId(), options.id);
                                            }else{
                                                callback.call(scope,err);
                                            }
                                        },
                                        this
                                        );
                                    },this);
                                },

                                /**
                                *
                                * Add Developer
                                *
                                * @param {Object} options
                                * 
                                * @param {Function} callback The function to be called after adding developer.
                                *
                                * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                * the callback function.
                                */
                                addDeveloper: function(options,callback,scope) {
                                    this.manageDeveloper('addDeveloper',options,callback,scope);
                                },

                                /**
                                *
                                * Remove Developer
                                *
                                * @param {Object} options
                                *
                                * @param {Function} callback The function to be called after removing developer.
                                *
                                * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                * the callback function.
                                */
                                removeDeveloper: function(options,callback,scope) {
                                    this.manageDeveloper('removeDeveloper',options,callback,scope);
                                },

                                /**
                                *
                                * Invite Developer
                                *
                                * @param {Object} options
                                * @param {String} options.username
                                *
                                * @param {Function} callback The function to be called after inviting developer.
                                *
                                * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                * the callback function.
                                */
                                inviteDeveloper: function(options,callback,scope) {
                                    Ext.io.Io.getMessagingProxy(function(messaging){
                                        messaging.getService(
                                        {name: "teammanager"},
                                        function(devService,err) {
                                            if(devService){
                                                devService.inviteDeveloper(function(result) {
                                                    if (result.status == "success") {
                                                        callback.call(scope);
                                                    } else {
                                                        callback.call(scope,result.error);
                                                    }
                                                }, {username : options.username, org : this.getId()});
                                                }else{
                                                    callback.call(scope,err);
                                                }
                                            },
                                            this
                                            );
                                        },this);
                                    }

                                });
                                /**
                                * @private
                                * Version
                                */
                                Ext.define('Ext.io.Version', {
                                    extend: 'Ext.io.Object',

                                    statics: {

                                        /**
                                        * @static
                                        * Get Version
                                        *
                                        * @param {Object} options
                                        * @param {String} options.id
                                        *
                                        * @param {Function} callback
                                        *
                                        * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                        * the callback function.
                                        */
                                        get: function(options,callback,scope) {
                                            this.getObject(options.id, callback, scope);
                                        }
                                    },

                                    /**
                                    * Deploy
                                    *
                                    * @param {Object} options
                                    * @param {Object} options.env
                                    *
                                    * @param {Function} callback
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    */
                                    deploy: function(options,callback,scope) {
                                        Ext.io.Io.getMessagingProxy(function(messaging){
                                            messaging.getService(
                                            {name: "VersionService"},
                                            function(versionService,err) {
                                                if(versionService){
                                                    versionService.deploy(function(result) {
                                                        if(result.status == "success") {
                                                            callback.call(scope);
                                                        } else {
                                                            callback.call(scope,result.error);
                                                        }
                                                    }, this.getId(), options.env);
                                                }else{
                                                    callback.call(scope,err);
                                                }
                                            },
                                            this
                                            );
                                        },this);
                                    },

                                    /**
                                    * Undeploy
                                    *
                                    * @param {Object} options
                                    * @param {Object} options.env
                                    *
                                    * @param {Function} callback
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    */
                                    undeploy: function(options,callback,scope) {
                                        Ext.io.Io.getMessagingProxy(function(messaging){
                                            messaging.getService(
                                            {name: "VersionService"},
                                            function(versionService,err) {
                                                if(versionService){
                                                    versionService.undeploy(function(result) {
                                                        if(result.status == "success") {
                                                            callback.call(scope);
                                                        } else {
                                                            callback.call(scope,result.error);
                                                        }
                                                    }, this.getId(), options.env);
                                                }else{
                                                    callback.call(scope,err);
                                                }
                                            },
                                            this
                                            );
                                        },this);
                                    },

                                    /**
                                    * Get App
                                    *
                                    * @param {Function} callback The function to be called after getting the App object.
                                    * @param {Object} callback.app The {Ext.io.App} associated with this Device if the call succeeded.
                                    * @param {Object} callback.err an error object.
                                    *
                                    * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
                                    * the callback function.
                                    */
                                    getApp: function(callback,scope) {
                                        this.getRelatedObject(Ext.io.App, null, null, callback, scope);
                                    }

                                });
                                /**
                                * @private
                                *
                                */
                                Ext.define('Ext.cf.Utilities', {
                                    requires: ['Ext.cf.util.Logger'],

                                    statics: {

                                        /**
                                        * Delegate
                                        *
                                        * @param {Object} from_instance
                                        * @param {Object} to_instance
                                        * @param {Array} methods
                                        *
                                        */
                                        delegate: function(from_instance, to_instance, methods) {
                                            if (to_instance===undefined) { 
                                                var message= "Error - Tried to delegate '"+methods+"' to undefined instance.";
                                                Ext.cf.util.Logger.error(message);
                                                throw message;
                                            }
                                            methods.forEach(function(method){
                                                var to_method= to_instance[method];
                                                if (to_method===undefined) { 
                                                    message= "Error - Tried to delegate undefined method '"+method+"' to "+to_instance;
                                                    Ext.cf.util.Logger.error(message);
                                                    throw message;
                                                }
                                                from_instance[method]= function() {
                                                    return to_method.apply(to_instance, arguments);
                                                };
                                            });
                                        },

                                        /**
                                        * Check
                                        *
                                        * @param {String} class_name for reporting
                                        * @param {String} method_name for reporting
                                        * @param {String} instance_name for reporting
                                        * @param {Object} instance of the object we are checking
                                        * @param {Array} properties that we expect to find on the instance 
                                        *
                                        */
                                        check: function(class_name, method_name, instance_name, instance, properties) {
                                            if (instance===undefined) {
                                                var message= "Error - "+class_name+"."+method_name+" - "+instance_name+" not provided.";
                                                Ext.cf.util.Logger.error(message);
                                            } else {
                                                properties.forEach(function(property) {
                                                    var value= instance[property];
                                                    if (value===undefined) {
                                                        var message= "Error - "+class_name+"."+method_name+" - "+instance_name+"."+property+" not provided.";
                                                        Ext.cf.util.Logger.error(message);
                                                    }
                                                });
                                            }
                                        },

                                        /**
                                        *
                                        * Wrap a Method
                                        *
                                        * @param {Function} m The method to wrap.
                                        * @param {String} key A flag so that we know when the method has already been wrapped.
                                        * @param {Function} before The function to call before the method.
                                        * @param {Function} after The function to call after the method.
                                        */
                                        wrapMethod: function(m,key,before,after){
                                            if(m[key]){
                                                return m;
                                            }else{
                                                var nm= function(){
                                                    if(before) { before.call(this,m,arguments); };
                                                    m.apply(this,arguments);
                                                    if(after) { after.call(this,m,arguments); };
                                                };
                                                nm[key]= true;
                                                nm.displayName= m.displayName;
                                                return nm;
                                            }
                                        },

                                        /**
                                        *
                                        * Wrap all the Methods of a Class
                                        *
                                        * @param {Object} klass 
                                        * @param {String} key
                                        * @param {Function} f
                                        * @param {Function} before The function to call before the method.
                                        * @param {Function} after The function to call after the method.
                                        */
                                        wrapClass: function(klass,key,before,after) {
                                            for (var name in klass) {
                                                if (klass.hasOwnProperty(name)) {
                                                    var m= klass[name];
                                                    if(m.displayName){ // limit the wrapping to sencha style methods... JCM probably there's a better way. 
                                                        klass[name]= this.wrapMethod(m,key,before,after);
                                                    }
                                                }
                                            }
                                        }

                                    }

                                });


                                /**
                                * 
                                * @private
                                *
                                */
                                Ext.define('Ext.cf.data.Update', {

                                    statics: {

                                        /**
                                        * As string
                                        *
                                        * @param {Object} u
                                        *
                                        */
                                        asString: function(u) {
                                            if(Ext.isArray(u)){
                                                return '['+Ext.Array.map(u,Ext.cf.data.Update.asString).join(', ')+']';
                                            }else if(u instanceof Ext.cf.data.Updates){
                                                return Ext.cf.data.Update.asString(u.updates);
                                            }else{
                                                var p= Ext.isArray(u.p) ? u.p.join() : u.p;
                                                var v= u.v;
                                                if (typeof u.v==='object'){
                                                    v= Ext.encode(u.v);
                                                }
                                                return '('+u.i+' . '+p+' = \''+v+'\' @ '+u.c.asString()+')';
                                            }
                                        }

                                    }

                                });
                                /**
                                * 
                                * @private
                                *
                                * Sync Model
                                *
                                */
                                Ext.define('Ext.cf.data.SyncModel', {   
                                    statics:{
                                        /**
                                        * @param {Array} records
                                        * @return {Boolean}
                                        */
                                        areDecorated: function(records) {
                                            return Ext.Array.every(records,function(record){
                                                return (record.eco!==undefined && record.eco!==null);
                                            });
                                        },

                                        /**
                                        * Test if a record has been deleted (check for is deleted)
                                        *
                                        * @param {Object} record
                                        * @return {Boolean}
                                        */
                                        isDestroyed: function(r) { // test if a record has been deleted
                                            var t= (r||this).data._ts;
                                            return (t!==null && t!==undefined && t!=='');
                                        },

                                        /**
                                        * Test if a record has been deleted (check for is not deleted)
                                        *
                                        * @param {Object} record
                                        * @return {Boolean}
                                        *
                                        */
                                        isNotDestroyed: function(r) { // test if a record has been deleted
                                            var t= (r||this).data._ts;
                                            return (t===null || t===undefined || t==='');
                                        }
                                    }
                                });


                                /**
                                * 
                                * @private
                                *
                                * SyncStore
                                *
                                * It maintains...
                                *
                                *  - a Change Stamp to OID index
                                *
                                */
                                Ext.define('Ext.cf.data.SyncStore', {
                                    requires: [
                                    'Ext.cf.Utilities',
                                    'Ext.cf.ds.CSIV'
                                    ],


                                    /** 
                                    * Async initialize
                                    *
                                    * @param {Object} config
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    asyncInitialize: function(config,callback,scope) {
                                        Ext.cf.Utilities.check('SyncStore', 'initialize', 'config', config, ['databaseName']);
                                        this.logger = Ext.cf.util.Logger;
                                        this.store= config.localStorageProxy || window.localStorage;
                                        this.id= config.databaseName;

                                        // JCM check data version number

                                        var hasRecords= this.getIds().length>0;
                                        this.readConfig('databaseDefinition',function(data) {
                                            if(hasRecords && !data){
                                                this.logger.error('Ext.cf.data.SyncStore.initialize: Tried to use an existing store,',config.databaseName,', as a syncstore.');
                                                callback.call(scope,{r:'error'});
                                            }else{
                                                // ok
                                                this.readConfig('csiv',function(data) {
                                                    this.csiv= data ? Ext.create('Ext.cf.ds.CSIV').decode(data) : undefined;
                                                    if(!this.csiv){
                                                        this.reindex(function(){
                                                            callback.call(scope,{r:'ok'});
                                                        },this);
                                                    }else{
                                                        callback.call(scope,{r:'ok'});
                                                    }
                                                },this);
                                            }
                                        },this);
                                    },

                                    // crud

                                    /** 
                                    * Create
                                    *
                                    * @param {Array} records
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    create: function(records, callback, scope) {
                                        var ids= this.getIds();
                                        records.forEach(function(record){
                                            ids.push(record.getOid());
                                            this.setRecord(record);
                                        },this);
                                        this.setIds(ids);
                                        if(callback){
                                            callback.call(scope);
                                        }
                                    },

                                    /** 
                                    * Read by Oid
                                    *
                                    * @param {Number/String} oid
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    readByOid: function(oid, callback, scope) {
                                        var record= this.getRecord(oid);
                                        callback.call(scope,record);
                                    },

                                    /** 
                                    * Read by Oids
                                    *
                                    * @param {Array} oids
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    readByOids: function(oids, callback, scope) {
                                        var records= [];
                                        var i, l= oids.length;
                                        var f= function(record){ records.push(record); };
                                        for(i=0;i<l;i++){
                                            this.readByOid(oids[i],f,this);
                                        }
                                        callback.call(scope,records);
                                    },

                                    /** 
                                    * Read by CSV
                                    *
                                    * @param {Object} csv
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    readByCSV: function(csv, callback, scope) {
                                        //
                                        // Use the CS index to get a list of records that have changed since csv
                                        //
                                        var oids= this.csiv.oidsFrom(csv);
                                        this.readByOids(oids,callback,scope);
                                    },

                                    /** 
                                    * Read all
                                    *
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    readAll: function(callback, scope){
                                        this.readByOids(this.getIds(),callback,scope);
                                    },

                                    /** 
                                    * Update
                                    *
                                    * @param {Array} records
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    update: function(records, callback, scope) {
                                        records.forEach(function(record){
                                            this.setRecord(record);
                                        },this);
                                        if(callback){
                                            callback.call(scope);
                                        }
                                    },

                                    /** 
                                    * Destroy
                                    *
                                    * @param {Number/String} oid
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    destroy: function(oid, callback, scope) {
                                        if(Ext.isArray(oid)){
                                            var ids= this.getIds();
                                            var i, l= oid.length;
                                            for(i=0;i<l;i++){
                                                var id= oid[i];
                                                Ext.Array.remove(ids, id);
                                                var key = this.getRecordKey(id);
                                                this.store.removeItem(key);
                                            }
                                            this.setIds(ids);
                                            if(callback){
                                                callback.call(scope);
                                            }
                                        }else{
                                            this.destroy([oid],callback,scope);
                                        }
                                    },

                                    /** 
                                    * Clear
                                    *
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    clear: function(callback, scope) {
                                        var ids = this.getIds(), len = ids.length, i;
                                        for (i = 0; i < len; i++) {
                                            var key = this.getRecordKey(ids[i]);
                                            this.store.removeItem(key);
                                        }
                                        this.store.removeItem(this.id);
                                        this.store.removeItem(this.getRecordKey('csiv'));
                                        this.csiv= Ext.create('Ext.cf.ds.CSIV');
                                        callback.call(scope);
                                    },

                                    /** 
                                    * Set Model
                                    *
                                    * @param {Object} userModel
                                    *
                                    */
                                    setModel: function(userModel) {
                                        this.model= userModel;
                                    },

                                    // config

                                    /** 
                                    * Read config
                                    *
                                    * @param {Number/String} oid
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    readConfig: function(oid, callback, scope) {
                                        var item= this.store.getItem(this.getRecordKey(oid));
                                        var data= item ? Ext.decode(item) : {};
                                        callback.call(scope,data);
                                    },

                                    /** 
                                    * Write config
                                    *
                                    * @param {Number/String} oid
                                    * @param {Object} data
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    writeConfig: function(oid, data, callback, scope) {
                                        this.store.setItem(this.getRecordKey(oid),Ext.encode(data));
                                        callback.call(scope,data);
                                    },

                                    /** 
                                    * Remove config
                                    *
                                    * @param {Number/String} oid
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    removeConfig: function(oid, callback, scope) {
                                        this.store.removeItem(this.getRecordKey(oid));
                                        callback.call(scope);
                                    },

                                    // cs to oid index

                                    /** 
                                    * Get CS Index
                                    *
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    getCSIndex: function(callback,scope) {
                                        callback.call(scope,this.csiv);
                                    },

                                    /** 
                                    * Set CS Index
                                    *
                                    * @param {Object} csiv
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    setCSIndex: function(csiv,callback,scope) {
                                        if(csiv){
                                            this.csiv= csiv;
                                            this.writeConfig('csiv',this.csiv.encode(),callback,scope);
                                        }else{
                                            callback.call(scope);
                                        }
                                    },

                                    // change replica number

                                    /** 
                                    * Change replica number
                                    *
                                    * @param {Number} old_replica_number
                                    * @param {Number} new_replica_number
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    changeReplicaNumber: function(old_replica_number,new_replica_number,callback,scope) {
                                        this.readAll(function(records){
                                            var i, l= records.length;
                                            for(i=0;i<l;i++){
                                                var record= records[i];    
                                                var oid= record.getOid();
                                                if (record.changeReplicaNumber(old_replica_number,new_replica_number)) {
                                                    if(record.getOid()!=oid){
                                                        record.phantom= false;
                                                        this.create([record]);
                                                        this.destroy(oid);
                                                    }else{
                                                        this.update([record]);
                                                    }
                                                }
                                            }
                                            this.reindex(callback,scope);            
                                        },this);
                                    },

                                    // reindex

                                    /** 
                                    * Reindex
                                    *
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    reindex: function(callback,scope){
                                        this.csiv= Ext.create('Ext.cf.ds.CSIV');
                                        this.readAll(function(records){
                                            var i, l= records.length;
                                            for(i=0;i<l;i++){
                                                var record= records[i];
                                                var oid= record.getOid();
                                                record.eco.forEachCS(function(cs){
                                                    this.csiv.add(cs,oid);
                                                },this);
                                            }
                                            callback.call(scope);
                                        },this);
                                    },  

                                    /** 
                                    * Get Id's
                                    *
                                    */
                                    getIds: function(){
                                        var ids= [];
                                        var item= this.store.getItem(this.id);
                                        if(item){
                                            ids= item.split(',');
                                        }
                                        //console.log('getIds',ids)
                                        return ids;
                                    },

                                    /** 
                                    * Set Id's
                                    *
                                    * @param {Array} ids
                                    *
                                    */
                                    setIds: function(ids) {
                                        //iPad bug requires that we remove the item before setting it
                                        this.store.removeItem(this.id);
                                        this.store.setItem(this.id, ids.join(','));
                                        //console.log('setIds',ids)
                                    },

                                    /** 
                                    * Get record key
                                    *
                                    * @param {Number/String} id
                                    *
                                    */
                                    getRecordKey: function(id) {
                                        return Ext.String.format("{0}-{1}", this.id, id);
                                    },

                                    /** 
                                    * Get record
                                    *
                                    * @param {Number/String} id
                                    *
                                    */
                                    getRecord: function(id) {
                                        var record;
                                        var key= this.getRecordKey(id);
                                        var item= this.store.getItem(key);
                                        if(item!==null){
                                            var x= Ext.decode(item);
                                            var raw = x.data;
                                            var data= {};
                                            var fields= this.model.getFields().items;
                                            var length= fields.length;
                                            var i = 0, field, name, obj;
                                            for (i = 0; i < length; i++) {
                                                field = fields[i];
                                                name  = field.getName();
                                                if (typeof field.getDecode() == 'function') {
                                                    data[name] = field.getDecode()(raw[name]);
                                                } else {
                                                    if (field.getType().type == 'date') {
                                                        data[name] = new Date(raw[name]);
                                                    } else {
                                                        data[name] = raw[name];
                                                    }
                                                }
                                            }
                                            record= new this.model(data);
                                            record.data._oid= raw._oid;
                                            if(raw._ref!==null && raw._ref!==undefined) { record.data._ref= raw._ref; }
                                            if(raw._ts!==null && raw._ts!==undefined) { record.data._ts= raw._ts; }
                                            record.eco= Ext.create('Ext.cf.ds.ECO',{oid:raw._oid,data:record.data,state:x.state});
                                            Ext.apply(record,Ext.cf.data.ModelWrapper);
                                            //console.log('get',key,item);
                                        }
                                        return record;
                                    },

                                    /** 
                                    * Set record
                                    *
                                    * @param {Object} record
                                    *
                                    */
                                    setRecord: function(record) {
                                        //console.log('set',Ext.encode(record))

                                        var raw = record.eco.data,
                                            data    = {},
                                            fields  = this.model.getFields().items,
                                            length  = fields.length,
                                            i = 0,
                                            field, name, obj, key;

                                        for (; i < length; i++) {
                                            field = fields[i];
                                            name  = field.getName();

                                            if (typeof field.getEncode() == 'function') {
                                                data[name] = field.getEncode()(rawData[name], record);
                                            } else {
                                                if (field.getType().type == 'date') {
                                                    data[name] = raw[name].getTime();
                                                } else {
                                                    data[name] = raw[name];
                                                }
                                            }
                                            if(data[name]===null || data[name]===undefined){
                                                data[name]= field.getDefaultValue();
                                            }
                                        }

                                        data._oid= record.getOid();
                                        if(raw._ref!==null && raw._ref!==undefined) { data._ref= raw._ref; }
                                        if(raw._ts!==null && raw._ts!==undefined) { data._ts= raw._ts; }

                                        //iPad bug requires that we remove the item before setting it
                                        var eco= record.eco;
                                        var oid= record.getOid();
                                        key = this.getRecordKey(oid);
                                        this.store.removeItem(key);
                                        var item= Ext.encode({data:data,state:eco.state});
                                        this.store.setItem(key,item);
                                        //console.log('set',key,item);
                                    }

                                });

                                /**
                                * 
                                * @private
                                *
                                * Database Definition
                                *
                                */
                                Ext.define('Ext.cf.data.DatabaseDefinition', {
                                    extend: 'Object',
                                    requires: ['Ext.cf.Utilities'],

                                    config: {
                                        /**
                                        * @cfg groupId
                                        * @accessor
                                        */
                                        groupId: undefined,
                                        /**
                                        * @cfg userId
                                        * @accessor
                                        */
                                        userId: undefined,
                                        /**
                                        * @cfg databaseName
                                        * @accessor
                                        */
                                        databaseName: undefined,
                                        /**
                                        * @cfg generation
                                        * @accessor
                                        */
                                        generation: undefined, // of the database
                                        /**
                                        * @cfg idProperty
                                        * @accessor
                                        */
                                        idProperty: undefined,
                                        /**
                                        * @cfg version
                                        * The version of the client side storage scheme.
                                        * @accessor
                                        */
                                        version: 2
                                        // JCM include the epoch of the clock here?
                                    },  

                                    /** 
                                    * @private
                                    *
                                    * Constructor
                                    *
                                    * @param {Object} config
                                    *
                                    */
                                    constructor: function(config) {
                                        Ext.cf.Utilities.check('DatabaseDefinition', 'constructor', 'config', config, ['databaseName','generation']);
                                        this.initConfig(config);
                                    },

                                    /** 
                                    * hasOwner
                                    *
                                    * @return {Boolean} True/False
                                    *
                                    */
                                    hasOwner: function() {
                                        return this.getUserId()!==undefined || this.getGroupId()!==undefined;
                                    },

                                });

                                /**
                                * 
                                * @private
                                *
                                * Replica Definition
                                *
                                */
                                Ext.define('Ext.cf.data.ReplicaDefinition', { 
                                    extend: 'Object',
                                    requires: ['Ext.cf.Utilities'],

                                    config: {
                                        /**
                                        * @cfg deviceId
                                        * @accessor
                                        */
                                        deviceId: undefined,
                                        /**
                                        * @cfg replicaNumber
                                        * @accessor
                                        */
                                        replicaNumber: undefined
                                    },

                                    /** 
                                    * Constructor
                                    *
                                    * @param {Object} config
                                    *
                                    */
                                    constructor: function(config) {
                                        Ext.cf.Utilities.check('ReplicaDefinition', 'constructor', 'config', config, ['replicaNumber']);
                                        this.initConfig(config);
                                    },

                                    /** 
                                    * Change replica number
                                    *
                                    * @param {Number} replicaNumber
                                    *
                                    * return {Boolean} True/False
                                    *
                                    */
                                    changeReplicaNumber: function(replicaNumber) {
                                        var changed= (this.getReplicaNumber()!=replicaNumber); 
                                        this.setReplicaNumber(replicaNumber);
                                        return changed;
                                    },

                                    /**
                                    * Return as data
                                    */
                                    as_data: function() {
                                        return {
                                            deviceId: this.getDeviceId(),
                                            replicaNumber: this.getReplicaNumber()
                                        };
                                    }

                                });

                                /**
                                * 
                                * @private
                                *
                                * Transaction
                                *
                                * A Transaction wraps an implementation of the proxy, 
                                * providing for caching of reads, and group commit of writes.
                                */ 
                                Ext.define('Ext.cf.data.Transaction', { 
                                    requires: [
                                    'Ext.cf.ds.LogicalClock',
                                    'Ext.cf.ds.CSV',
                                    'Ext.cf.util.Logger'
                                    ],

                                    /** 
                                    * Constructor
                                    *
                                    * @param {Object} proxy
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    constructor: function(proxy,callback,scope) {
                                        this.proxy= proxy;
                                        this.store= proxy.getStore();
                                        this.generatorChanged= false;
                                        this.originalGenerator= proxy.generator;
                                        this.modifiedGenerator= Ext.create('Ext.cf.ds.LogicalClock',proxy.generator);
                                        this.csvChanged= false;
                                        this.originalCSV= proxy.csv;
                                        this.modifiedCSV= Ext.create('Ext.cf.ds.CSV',proxy.csv); // copy the csv
                                        this.cache= {}; // read cache of records
                                        this.toCreate= []; // records to create
                                        this.toUpdate= []; // records to update
                                        this.toDestroy= []; // records to destroy
                                        this.store.getCSIndex(function(csiv){
                                            this.csivChanged= false;
                                            this.csiv= csiv;
                                            callback.call(scope,this);
                                        },this);
                                    },

                                    /** 
                                    * Generate change stamp
                                    *
                                    * return {Ext.cf.ds.CS}
                                    *
                                    */
                                    generateChangeStamp: function() {
                                        var cs= this.modifiedGenerator.generateChangeStamp();
                                        this.modifiedCSV.addCS(cs);
                                        this.generatorChanged= true;
                                        this.csvChanged= true;
                                        return cs;
                                    },

                                    /** 
                                    * Create
                                    *
                                    * @param {Array} records
                                    *
                                    */
                                    create: function(records) {
                                        this.addToCache(records);
                                        this.addToList(this.toCreate,records);
                                    },

                                    /** 
                                    * Read by oid
                                    *
                                    * @param {Number/String} oid
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    readByOid: function(oid, callback, scope) {
                                        var record= this.cache[oid];
                                        //console.log('readByOid',oid,'=>',record)
                                        if(record){
                                            callback.call(scope,record);
                                        }else{
                                            this.store.readByOid(oid,function(record){
                                                if(record){
                                                    this.addToCache(record);
                                                }
                                                callback.call(scope,record);
                                            },this);
                                        }
                                    },

                                    /** 
                                    * Read cache by oid
                                    *
                                    * @param {String} oid
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    readCacheByOid: function(oid, callback, scope) {
                                        var record= this.cache[oid];
                                        callback.call(scope,record);
                                    },

                                    /** 
                                    * Read by oids
                                    *
                                    * @param {Array} oids
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    readByOids: function(oids, callback, scope) {
                                        //console.log('readByOids',oids)
                                        var records= [];
                                        var readOids= [];
                                        var i, l= oids.length;
                                        for(i=0;i<l;i++){
                                            var oid= oids[i];
                                            var record= this.cache[oid];
                                            if(record){
                                                records.push(record);
                                            }else{
                                                readOids.push(oid);
                                            }
                                        }
                                        this.store.readByOids(readOids,function(records2){
                                            this.addToCache(records2);
                                            records= records.concat(records2);
                                            callback.call(scope,records);
                                        },this);
                                    },

                                    /** 
                                    * Update
                                    *
                                    * @param {Array} records
                                    *
                                    */
                                    update: function(records) {
                                        this.addToCache(records);
                                        this.addToList(this.toUpdate,records);
                                    },

                                    /** 
                                    * Destroy
                                    *
                                    * @param {String} oid
                                    *
                                    */
                                    destroy: function(oid) {
                                        this.toDestroy.push(oid);
                                    },

                                    /** 
                                    * Update CS
                                    *
                                    * @param {Ext.cf.ds.CS} from
                                    * @param {Ext.cf.ds.CS} to
                                    * @param {String} oid
                                    *
                                    */
                                    updateCS: function(from,to,oid) {
                                        if(from && to){
                                            if(!from.equals(to)){
                                                this.csvChanged= this.modifiedCSV.addX(to) || this.csvChanged;
                                                this.csivChanged= true;
                                                //this.csiv.remove(from,oid);
                                                this.csiv.add(to,oid);
                                            }
                                        }else if(from){
                                            //this.csivChanged= true;
                                            //this.csiv.remove(from,oid);
                                        }else if(to){
                                            this.csvChanged= this.modifiedCSV.addX(to) || this.csvChanged;
                                            this.csivChanged= true;
                                            this.csiv.add(to,oid);
                                        }
                                    },

                                    /** 
                                    * Update CSV
                                    *
                                    * @param {Ext.cf.ds.CSV} csv
                                    *
                                    */
                                    updateCSV: function(csv) {
                                        this.csvChanged= this.modifiedCSV.addX(csv) || this.csvChanged;
                                    },

                                    /** 
                                    * Update Replica numbers
                                    *
                                    * @param {Ext.cf.ds.CSV} csv
                                    *
                                    */
                                    updateReplicaNumbers: function(csv) {
                                        this.csvChanged= this.modifiedCSV.addReplicaNumbers(csv) || this.csvChanged;
                                    },

                                    /** 
                                    * Update generator
                                    *
                                    * @param {Ext.cf.ds.CSV} csv
                                    *
                                    */
                                    updateGenerator: function(csv) {
                                        this.generatorChanged= this.originalGenerator.seenCSV(csv);
                                    },

                                    /** 
                                    * Commit
                                    *
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    commit: function(callback, scope) {
                                        //
                                        // Work out which records are to be created or updated.
                                        //
                                        this.toCreate= Ext.Array.unique(this.toCreate);
                                        this.toUpdate= Ext.Array.unique(this.toUpdate);
                                        this.toUpdate= Ext.Array.difference(this.toUpdate,this.toCreate);
                                        var createRecords= this.getRecordsForList(this.toCreate);
                                        var updateRecords= this.getRecordsForList(this.toUpdate);
                                        this.store.create(createRecords,function(){
                                            this.store.update(updateRecords,function(){
                                                this.store.destroy(this.toDestroy,function(){
                                                    this.store.setCSIndex(this.csivChanged ? this.csiv : undefined,function(){
                                                        this.writeConfig_CSV(function(){
                                                            this.writeConfig_Generator(function(){
                                                                callback.call(scope,createRecords,updateRecords);
                                                            },this);
                                                        },this);
                                                    },this);
                                                },this);
                                            },this);
                                        },this);
                                    },

                                    /** 
                                    * Write config generator
                                    *
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    * @private
                                    *
                                    */
                                    writeConfig_Generator: function(callback,scope){
                                        if(this.generatorChanged){
                                            this.originalGenerator.set(this.modifiedGenerator);
                                            this.proxy.writeConfig_Generator(callback,scope);
                                        }else{
                                            callback.call(scope);
                                        }
                                    },

                                    /** 
                                    * Write config csv
                                    *
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    * @private
                                    *
                                    */
                                    writeConfig_CSV: function(callback,scope){
                                        if(this.csvChanged){
                                            this.originalCSV.addCSV(this.modifiedCSV);
                                            this.generatorChanged= this.originalGenerator.seenCSV(this.originalCSV);
                                            this.proxy.writeConfig_CSV(callback,scope);
                                        }else{
                                            callback.call(scope);
                                        }
                                    },

                                    /** 
                                    * Add to cache
                                    *
                                    * @param {Array} records
                                    *
                                    * @private
                                    *
                                    */
                                    addToCache: function(records) {
                                        if(records){
                                            if(Ext.isArray(records)){
                                                var l= records.length;
                                                for(var i=0;i<l;i++){
                                                    var record= records[i];
                                                    this.addToCache(record);
                                                }
                                            }else{
                                                var oid= records.getOid();
                                                //console.log('addToCache',oid,records)
                                                if(oid!==undefined){
                                                    this.cache[oid]= records;
                                                }else{
                                                    Ext.cf.util.Logger.error('Transaction.addToCache: Tried to add a record without an oid.',records);
                                                }
                                            }
                                        }
                                    },

                                    /** 
                                    * Add to list
                                    *
                                    * @param {Array} list
                                    * @param {Array} records
                                    *
                                    * @private
                                    *
                                    */
                                    addToList: function(list,records) {
                                        if(records){
                                            if(Ext.isArray(records)){
                                                var l= records.length;
                                                for(var i=0;i<l;i++){
                                                    var record= records[i];
                                                    var oid= record.getOid();
                                                    list.push(oid);
                                                }
                                            }else{
                                                list.push(records.getOid());
                                            }
                                        }
                                    },

                                    /** 
                                    * Get records for list
                                    *
                                    * @param {Array} list
                                    *
                                    * @private
                                    *
                                    */
                                    getRecordsForList: function(list) {
                                        var records= [];
                                        var l= list.length;
                                        for(var i=0;i<l;i++){
                                            var id= list[i];
                                            records.push(this.cache[id]);
                                        }
                                        return records;
                                    }

                                });




                                /**
                                * 
                                * @private
                                *
                                * Updates
                                *
                                * An ordered list of updates, where an update is an assertion of 
                                * an attribute's value at a point in time, defined by a Change
                                * Stamp.
                                */
                                Ext.define('Ext.cf.data.Updates', {
                                    requires: ['Ext.cf.ds.CS'], 

                                    updates: undefined,

                                    /** 
                                    * Constructor
                                    *
                                    * @param {Array} updates
                                    *
                                    */
                                    constructor: function(x) {
                                        //
                                        // sort the updates into change stamp order,
                                        // as they have to be transmitted this way
                                        //
                                        this.updates= x||[];
                                        this.updates.forEach(function(update) {
                                            if (!(update.c instanceof Ext.cf.ds.CS)) {
                                                update.c= new Ext.cf.ds.CS(update.c);
                                            }
                                        });
                                        this.updates.sort(function(a,b) {return a.c.compare(b.c);});
                                    },

                                    /** 
                                    * Push
                                    *
                                    * @param {Object} update
                                    *
                                    */
                                    push: function(update) {
                                        // assert - update must have a cs greater than the last element
                                        var last= this.updates[this.updates.length];
                                        if (!update.c.greaterThan(last.c)) { throw "Error - Updates - Tried to push updates in wrong order. "+Ext.encode(update)+" <= "+Ext.encode(last); }
                                        this.updates.push(update);
                                    },

                                    /** 
                                    * isEmpty?
                                    *
                                    * @return {Boolean} True/False
                                    *
                                    */
                                    isEmpty: function() {
                                        return this.updates.length<1;
                                    },

                                    /** 
                                    * length
                                    *
                                    * @return {Number} length
                                    *
                                    */
                                    length: function() {
                                        return this.updates.length;
                                    },

                                    /** 
                                    * oids
                                    *
                                    * @return {Array} oids
                                    *
                                    */
                                    oids: function() {

                                        return Ext.Array.unique(Ext.Array.pluck(this.updates,'i'));
                                    },

                                    /** 
                                    * forEach
                                    *
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    forEach: function(callback,scope) {
                                        this.updates.forEach(callback,scope);
                                    },

                                    /**
                                    * Optimization- If a subsequent update has the same Object Identifier
                                    * as the preceeding update then we omit the OID.
                                    */
                                    encode: function() {
                                        // JCM optimize - "" around i and p and cs is not needed
                                        // JCM optimize - diff encode cs 1-123, +1-0, +0-1, 1-136-4, +1-0, ...
                                        var r= [];
                                        var l= this.updates.length;
                                        var prev_i, update, cs;
                                        for(var i=0;i<l;i++) {
                                            update= this.updates[i];
                                            cs= ((update.c instanceof Ext.cf.ds.CS) ? update.c.asString() : update.c);
                                            if (update.i===prev_i) {
                                                r.push([update.p, update.v, cs]);
                                            } else {
                                                r.push([update.i, update.p, update.v, cs]);
                                                prev_i= update.i;
                                            }
                                        }
                                        return r;
                                    },

                                    /** 
                                    * Decode
                                    *
                                    * @param {Array} x
                                    *
                                    */
                                    decode: function(x) {
                                        this.updates= [];
                                        if (x) {
                                            var l= x.length;
                                            var update, prev_i, id, p, v, c;
                                            for(var i=0;i<l;i++) {
                                                update= x[i];
                                                switch(update.length) {
                                                    case 3:
                                                    id= prev_i;
                                                    p= update[0];
                                                    v= update[1];
                                                    c= update[2];
                                                    break;
                                                    case 4:
                                                    id= update[0];
                                                    p= update[1];
                                                    v= update[2];
                                                    c= update[3];
                                                    prev_i= id;
                                                    break;
                                                }
                                                c= ((c instanceof Ext.cf.ds.CS) ? c : new Ext.cf.ds.CS(c));
                                                this.updates.push({i:id,p:p,v:v,c:c});
                                            }
                                        }
                                        return this;
                                    }

                                });




                                /**
                                * 
                                * @private
                                *
                                * Replication Protocol
                                *
                                */
                                Ext.define('Ext.cf.data.Protocol', {
                                    requires: [
                                    'Ext.cf.data.Updates', 
                                    'Ext.cf.data.Transaction',
                                    'Ext.cf.ds.CSV',
                                    'Ext.cf.data.Updates',
                                    'Ext.io.Proxy'
                                    ],

                                    config: {
                                        proxy: undefined,
                                        owner: 'user',
                                        access: 'private',
                                        version: 2,
                                        userId: undefined,
                                        groupId: undefined,
                                        deviceId: undefined
                                    },

                                    /** 
                                    * Constructor
                                    *
                                    * @param {Object} config
                                    *
                                    */
                                    constructor: function(config) {
                                        this.logger = Ext.cf.util.Logger;
                                        this.initConfig(config);
                                    },

                                    /** 
                                    * Sync
                                    *
                                    * @param {Function} callback
                                    * @param {Object} scope
                                    *
                                    */
                                    sync: function(callback,scope) {
                                        var self= this;
                                        var proxy= this.getProxy();
                                        self.logger.debug('Protocol.sync: start');
                                        //
                                        // We delay mapping the owner to an id until the very last moment.
                                        // This allows a sync store to be statically declared, without it
                                        // triggering a call to Ext.io.Io.init 
                                        //
                                        var databaseDefinition= proxy.getDatabaseDefinition();
                                        if(!databaseDefinition.hasOwner()){
                                            this.mapOwnerToId(this.getOwner(),this.getAccess(),databaseDefinition);
                                        }
                                        var replicaDefinition= proxy.getReplicaDefinition();
                                        if(!replicaDefinition.getDeviceId()){
                                            replicaDefinition.setDeviceId(this.config.deviceId||Ext.io.Io.getIdStore().getId('device'));
                                        }
                                        this.sendGetUpdate({},function(r){
                                        //self.logger.debug('Protocol.sync: end',Ext.encode(r));
                                        callback.call(scope,r);
                                    });
                                },

                                /**
                                * @private
                                *
                                * map owner to Id
                                *
                                * @param {String} owner
                                * @param {Object} databaseDefinition
                                *
                                */
                                mapOwnerToId: function(owner,access,databaseDefinition){
                                    if(!owner || owner==='user'){
                                        if(!access || access==='private'){
                                            databaseDefinition.setUserId(this.config.userId || Ext.io.Io.getIdStore().getId('user'));
                                        } else if (access==='public') {
                                            databaseDefinition.setGroupId(this.config.groupId || Ext.io.Io.getIdStore().getId('group'));
                                        } else {
                                            this.logger.error('Ext.cf.data.Protocol: Unknown owner:',owner);
                                        }
                                    } else {
                                        this.logger.error('Ext.cf.data.Protocol: Unknown access:',access);
                                    }
                                },

                                /** 
                                * @private
                                * 
                                * @param {Object} r
                                * @param {Function} callback
                                *
                                */
                                sendGetUpdate: function(r,callback) {
                                    this.logger.debug('Protocol.sendGetUpdate');
                                    var self= this;
                                    Ext.io.Io.getService(
                                    {name: "sync"}, 
                                    function(service,err) {
                                        if(service){
                                            var proxy= this.getProxy();
                                            var message= {
                                                dd: proxy.getDatabaseDefinition().getCurrentConfig(),
                                                rd: proxy.getReplicaDefinition().getCurrentConfig(),
                                                csv: proxy.csv.encode()
                                            };
                                            service.getUpdates(
                                            function(response){
                                                if(!response.r) {
                                                    response= response.value; // JCM the sync server integration tests need this.... some bug in the mock transport that i don't understand
                                                }
                                                self.receiveResponse(response,r,function(r){
                                                    if(response.r==='ok'){
                                                        var updates_csv= Ext.create('Ext.cf.ds.CSV').decode(response.updates_csv);
                                                        var required_csv= Ext.create('Ext.cf.ds.CSV').decode(response.required_csv);
                                                        self.updateLocalState(self.getProxy(),updates_csv,function(){
                                                            var updates= Ext.create('Ext.cf.data.Updates').decode(response.updates);
                                                            r.received= updates.length();
                                                            self.getProxy().putUpdates(updates,updates_csv,function(response){
                                                                self.sendPutUpdate(required_csv,response,callback);
                                                            },this);
                                                        },this);
                                                    }else{
                                                        callback(r);
                                                    }
                                                });
                                            },
                                            message
                                            );
                                        }else{
                                            callback(err);
                                        }
                                    },
                                    this
                                    );
                                },

                                /** 
                                * @private
                                *
                                * Receive response
                                * 
                                * @param {Object} response 
                                * @param {Object} r
                                * @param {Function} callback
                                *
                                */
                                receiveResponse: function(response,r,callback){
                                    this.logger.debug('Protocol.receiveResponse',Ext.encode(response));
                                    var proxy= this.getProxy();
                                    switch(response.r||response.value.r){ // JCM the sync server integration tests need this.... some bug in the mock transport that i don't understand
                                        case 'ok':
                                        callback(response);
                                        break;
                                        case 'set_replica_number':
                                        case 'new_replica_number':
                                        //
                                        // A replica number collision, or re-initialization, has occured. 
                                        // In either case we must change our local replica number.
                                        //
                                        if(r.new_replica_number==response.replicaNumber){
                                            this.logger.error("Protocol.receiveResponse: The server returned the same replica number '",response,"'");
                                            callback.call({r:'error_same_replica_number'});
                                        }else{
                                            r.new_replica_number= response.replicaNumber;
                                            this.logger.info('Protocol.receiveResponse: Change local replica number to',response.replicaNumber);
                                            proxy.setReplicaNumber(response.replicaNumber,function(){
                                                this.sendGetUpdate(r,callback);
                                            },this);
                                        }
                                        break;
                                        case 'new_generation_number':
                                        //
                                        // The database generation has changed. We clear out the database,
                                        // and update the definition. 
                                        //
                                        if (response.generation>proxy.definition.generation) {
                                            r.new_generation_number= response.generation;
                                            proxy.definition.set({generation:response.generation},function(){
                                            proxy.reset(function(){
                                                this.sendGetUpdate(r,callback);
                                            },this);
                                        },this);
                                    } else {
                                        // local is the same, or greater than the server.
                                    }
                                    break;
                                    case 'error':
                                    this.logger.error("Protocol.receiveResponse: The server returned the error '",response.message,"'");
                                    callback(response);
                                    break;
                                    default:
                                    this.logger.error('Protocol.receiveResponse: Received unknown message:',response);
                                    callback(response);
                                }
                            },

                            /** 
                            * @private
                            * 
                            * @param {Ext.cf.ds.CSV} required_csv 
                            * @param {Object} r
                            * @param {Function} callback
                            *
                            */
                            sendPutUpdate: function(required_csv,r,callback) {
                                this.logger.debug('Protocol.sendPutUpdate',required_csv);
                                var proxy= this.getProxy();
                                r.sent= 0;
                                r.r= 'ok';
                                if(!required_csv.isEmpty()){
                                    //
                                    // The required CSV contains only the difference between the local
                                    // CSV and the remote CSV. We combine the local and required CSV to
                                    // get the remote CSV.
                                    //
                                    var remote_csv= Ext.create('Ext.cf.ds.CSV',proxy.csv);
                                    remote_csv.setCSV(required_csv);
                                    proxy.getUpdates(remote_csv,function(updates,local_csv){
                                        if((updates && !updates.isEmpty()) || (local_csv && !local_csv.isEmpty())){
                                            Ext.io.Io.getService(
                                            {name:"sync"}, 
                                            function(service,err) {
                                                if(service){
                                                    r.sent= updates.length();
                                                    var message= {
                                                        dd: proxy.getDatabaseDefinition().getCurrentConfig(),
                                                        rd: proxy.getReplicaDefinition().getCurrentConfig(),
                                                        csv: proxy.csv.encode(),
                                                        updates: Ext.encode(updates.encode())
                                                    };
                                                    service.putUpdates(
                                                    function(r2){
                                                        Ext.apply(r,r2);
                                                        callback(r);
                                                    },
                                                    message
                                                    );
                                                }else{
                                                    callback(err);
                                                }
                                            },
                                            this
                                            );
                                        }else{
                                            this.logger.debug('Protocol.sendPutUpdate: no work');
                                            callback(r);
                                        }
                                    },this);
                                }else{
                                    this.logger.debug('Protocol.sendPutUpdate: no work');
                                    callback(r);
                                }
                            },

                            /** 
                            * @private
                            * 
                            * @param {Object} proxy  
                            * @param {Ext.cf.ds.CSV} csv 
                            * @param {Function} callback
                            * @param {Object} scope
                            *
                            */
                            updateLocalState: function(proxy,csv,callback,scope) {
                                Ext.create('Ext.cf.data.Transaction',proxy,function(t){
                                    //
                                    // The remote CSV describes the state of updated-ness of the
                                    // server this client is talking to. We add any replica numbers
                                    // that are new to us to our local CSV.
                                    //
                                    t.updateReplicaNumbers(csv);
                                    //
                                    // And we update the CS generator with the maximum CS in the
                                    // CSV, so that the local time is bumped forward if one of 
                                    // the other replicas is ahead of us.
                                    //
                                    // We do this ahead of receiving updates to ensure that any
                                    // updates we generate will be ahead of the updates that
                                    // were just received. 
                                    //
                                    t.updateGenerator(csv);
                                    t.commit(callback,scope);
                                },this);
                            }

                        });


                        /**
                        * 
                        * @private
                        *
                        * Model Wrapper
                        *
                        */
                        Ext.cf.data.ModelWrapper= {

                            /**
                            * Get Object Identifier
                            */
                            getOid: function() {
                                return this.eco.getOid();
                            },

                            /**
                            * Get Change Stamp for the path
                            *
                            * @param {String/Array} path
                            *
                            * @return {Ext.cf.ds.CS}
                            *
                            */
                            getCS: function(path) {
                                return this.eco.getCS(path);    
                            },

                            /**
                            * Get the Change Stamp Vector of the Object
                            *
                            * @return {Ext.cf.ds.CSV}
                            */
                            getCSV: function(){
                                return this.eco.getCSV();
                            },

                            /**
                            * Set the Value and Change Stamp
                            *
                            * @param {Ext.cf.data.Transaction} t 
                            * @param {String/Array} path
                            * @param {Array} values
                            * @param {Ext.cf.ds.CS} new_cs
                            *
                            */
                            setValueCS: function(t,path,values,new_cs){
                                return this.eco.setValueCS(t,path,values,new_cs);
                            },

                            /**
                            * Change Replica number
                            *
                            * @param {Number} old_replica_number Old Number
                            * @param {Number} new_replica_number New Number
                            *
                            */
                            changeReplicaNumber: function(old_replica_number,new_replica_number) {
                                return this.eco.changeReplicaNumber(this.getIdProperty(),old_replica_number,new_replica_number);
                            },

                            /**
                            * Set update state
                            *
                            * @param {Ext.cf.data.Transaction} t Transaction
                            *
                            */
                            setUpdateState: function(t) {
                                var changes= this.getChanges();
                                for (var name in changes) {
                                    this.setUpdateStateValue(t,[name],this.modified[name],changes[name]);
                                }
                            },

                            /**
                            * Set update state value
                            *
                            * @param {Ext.cf.data.Transaction} t
                            * @param {String/Array} path
                            * @param {Object} old value
                            * @param {Object} new value
                            *
                            */
                            setUpdateStateValue: function(t,path,before_value,after_value) {
                                //console.log('setUpdateStateValue',path,before_value,after_value)
                                if (this.eco.isComplexValueType(after_value)) {
                                    var added, name2;
                                    if (before_value) {
                                        added= {};
                                        if (this.eco.isComplexValueType(before_value)) {
                                            if (this.eco.valueType(before_value)===this.eco.valueType(after_value)) {
                                                added= Ext.Array.difference(after_value,before_value);
                                                var changed= Ext.Array.intersect(after_value,before_value);
                                                for(name2 in changed) {
                                                    if (changed.hasOwnProperty(name2)) {                            
                                                        if (before_value[name2]!==after_value[name2]) {
                                                            added[name2]= after_value[name2];
                                                        }
                                                    }
                                                }
                                            } else {
                                                added= after_value;
                                                this.eco.setCS(t,path,t.generateChangeStamp()); // value had a different type before, a complex type
                                            }
                                        } else {
                                            added= after_value;
                                            this.eco.setCS(t,path,t.generateChangeStamp()); // value had a different type before, a primitive type
                                        }
                                    } else {
                                        added= after_value;
                                        this.eco.setCS(t,path,t.generateChangeStamp()); // value didn't exist before
                                    }
                                    for(name2 in added) {
                                        if (added.hasOwnProperty(name2)) {
                                            var next_before_value= before_value ? before_value[name2] : undefined;
                                            this.setUpdateStateValue(t,path.concat(name2),next_before_value,after_value[name2]);
                                        }
                                    }
                                } else {
                                    this.eco.setCS(t,path,t.generateChangeStamp()); // value has a primitive type
                                }
                            },

                            /**
                            * Set destroy state
                            *
                            * @param {Ext.cf.data.Transaction} t
                            *
                            */
                            setDestroyState: function(t) {
                                var cs= t.generateChangeStamp();
                                this.eco.setValueCS(t,'_ts',cs.asString(),cs);
                            },

                            /**
                            * Get updates
                            *
                            * @param {Ext.cf.ds.CSV} csv
                            *
                            * @return {Ext.io.data.Updates}
                            *
                            */
                            getUpdates: function(csv) {
                                return this.eco.getUpdates(csv);
                            },

                            /**
                            * Put update
                            *
                            * @param {Ext.cf.data.Transaction} t
                            * @param {Object} update
                            *
                            */
                            putUpdate: function(t,update) {
                                return this.eco.setValueCS(t,update.p,update.v,update.c);
                            }

                        };



                        /** 
                        * @private
                        *
                        */ 
                        Ext.define('Ext.cf.data.SyncProxy', {
                            extend: 'Ext.data.proxy.Proxy',
                            requires: [
                            'Ext.data.proxy.Proxy',
                            'Ext.cf.data.Transaction',
                            'Ext.cf.data.Updates',
                            'Ext.cf.data.DatabaseDefinition',
                            'Ext.cf.data.ReplicaDefinition',
                            'Ext.cf.ds.CS',
                            'Ext.cf.ds.CSV',
                            'Ext.cf.ds.ECO',
                            'Ext.cf.Utilities',
                            'Ext.cf.data.SyncModel',
                            'Ext.cf.data.Update',
                            'Ext.cf.data.ModelWrapper',
                            'Ext.cf.util.Logger'
                            ],

                            config: {
                                store: undefined,
                                databaseDefinition: undefined,
                                replicaDefinition: undefined,
                            },

                            databaseName: undefined,
                            csv: undefined,
                            generator: undefined,
                            userModel: undefined,
                            idProperty: undefined,

                            /** 
                            * ASync Initialize
                            *
                            * @param {Object} config
                            * @param {Function} callback
                            * @param {Object} scope
                            *
                            */
                            asyncInitialize: function(config,callback,scope) {
                                //
                                Ext.cf.Utilities.check('SyncProxy', 'asyncInitialize', 'config', config, ['store','databaseDefinition','replicaDefinition']);
                                //
                                this.databaseName= config.databaseDefinition.databaseName;
                                this.setStore(config.store);
                                this.initConfig(config);
                                this.setDatabaseDefinition(Ext.create('Ext.cf.data.DatabaseDefinition',config.databaseDefinition));
                                this.setReplicaDefinition(Ext.create('Ext.cf.data.ReplicaDefinition',config.replicaDefinition));
                                this.loadConfig(config,function(){
                                    Ext.cf.util.Logger.info("SyncProxy.asyncInitialize: Opened database '"+this.databaseName+"'");
                                    callback.call(scope,{r:'ok'});
                                },this);
                            },

                            /** 
                            * Create
                            *
                            * @param {Object} operation
                            * @param {Function} callback
                            * @param {Object} scope
                            *
                            */
                            create: function(operation, callback, scope) {
                                Ext.create('Ext.cf.data.Transaction',this,function(t){
                                    var records= operation.getRecords();
                                    records.forEach(function(record) {
                                        var cs= t.generateChangeStamp();
                                        var oid= cs.asString();
                                        var eco= record.eco= Ext.create('Ext.cf.ds.ECO',{
                                            oid: oid,
                                            data: Ext.getVersion("extjs") ? record.data : record.getData(),
                                            state: {}
                                        });
                                        Ext.apply(record,Ext.cf.data.ModelWrapper);                
                                        eco.setValueCS(t,'_oid',oid,cs);
                                        eco.forEachValue(function(path,value) {
                                            if (path[0]!=='_oid') {
                                                eco.setCS(t,path,t.generateChangeStamp());
                                            }
                                        },eco);
                                        // the user id is the oid.
                                        record.data[this.idProperty]= record.getOid(); // warning: don't call record.set, it'll cause an update after the add
                                    },this);
                                    t.create(records);
                                    t.commit(function(){
                                        records.forEach(function(record) {
                                            record.needsAdd= false;
                                            record.phantom= false;
                                        },this);
                                        operation.setSuccessful();
                                        operation.setCompleted();
                                        this.doCallback(callback,scope,operation);
                                    },this);
                                },this);
                            },

                            /** 
                            * Read
                            *
                            * @param {Object} operation
                            * @param {Function} callback
                            * @param {Object} scope
                            *
                            */
                            read: function(operation, callback, scope) {

                                function makeResultSet(records) {
                                    records= Ext.Array.filter(records,function(record){
                                        return record!==undefined && Ext.cf.data.SyncModel.isNotDestroyed(record);
                                    },this);
                                    operation.setResultSet(Ext.create('Ext.data.ResultSet', {
                                        records: records,
                                        total  : records.length,
                                        loaded : true
                                    }));
                                    operation.setSuccessful();
                                    operation.setCompleted();
                                    this.doCallback(callback,scope,operation);
                                }

                                if (operation.id!==undefined) {
                                    this.getStore().readByOid(operation.id,function(record) {
                                        makeResultSet.call(this,[record]);
                                    },this);
                                } else if (operation._oid!==undefined) {
                                    this.getStore().readByOid(operation._oid,function(record) {
                                        makeResultSet.call(this,[record]);
                                    },this);
                                } else {
                                    this.getStore().readAll(function(records) {
                                        makeResultSet.call(this,records);
                                    },this);
                                }
                            },

                            /** 
                            * Update
                            *
                            * @param {Object} operation
                            * @param {Function} callback
                            * @param {Object} scope
                            *
                            */
                            update: function(operation, callback, scope) {
                                if(Ext.cf.data.SyncModel.areDecorated(operation.getRecords())){
                                    Ext.create('Ext.cf.data.Transaction',this,function(t){
                                        var records= operation.getRecords();
                                        records.forEach(function(record) {
                                            record.setUpdateState(t);
                                        },this);
                                        t.update(records);
                                        t.commit(function(){
                                            operation.setSuccessful();
                                            operation.setCompleted();
                                            this.doCallback(callback,scope,operation);
                                        },this);
                                    },this);
                                }else{
                                    records.forEach(function(record) {
                                        record.dirty= false; // make sure that we don't re-update the record
                                    },this);
                                    Ext.cf.util.Logger.warn('SyncProxy.update: Tried to update a model that had not been read from the store.');
                                    Ext.cf.util.Logger.warn(Ext.encode(operation.getRecords()));
                                    this.doCallback(callback,scope,operation);
                                }
                            },

                            /** 
                            * Destroy
                            *
                            * @param {Object} operation
                            * @param {Function} callback
                            * @param {Object} scope
                            *
                            */
                            destroy: function(operation, callback, scope) {
                                //Ext.cf.util.Logger.info('SyncProxy.destroy:',operation)
                                if(Ext.cf.data.SyncModel.areDecorated(operation.getRecords())){
                                    Ext.create('Ext.cf.data.Transaction',this,function(t){
                                        var records= operation.getRecords();
                                        records.forEach(function(record) {
                                            record.setDestroyState(t);
                                        },this);
                                        t.update(records);
                                        t.commit(function(){
                                            operation.setSuccessful();
                                            operation.setCompleted();
                                            operation.action= 'destroy';
                                            this.doCallback(callback,scope,operation);
                                        },this);
                                    },this);
                                }else{
                                    Ext.cf.util.Logger.warn('SyncProxy.destroy: Tried to destroy a model that had not been read from the store.');
                                    Ext.cf.util.Logger.warn(Ext.encode(operation.getRecords()));
                                    this.doCallback(callback,scope,operation);
                                }
                            },

                            /** 
                            * Clear
                            *
                            * @param {Function} callback
                            * @param {Object} scope
                            *
                            */
                            clear: function(callback,scope) {
                                var store= this.getStore();
                                store.clear(function(){
                                    store.removeConfig('databaseDefinition',function(){
                                        store.removeConfig('replicaDefinition',function(){
                                            store.removeConfig('csv',function(){
                                                store.removeConfig('generator',callback,scope);
                                            },this);
                                        },this);
                                    },this);
                                },this);
                            },

                            /** 
                            * Reset
                            *
                            * @param {Function} callback
                            * @param {Object} scope
                            *
                            */
                            reset: function(callback,scope) {
                                var store= this.getStore();
                                store.clear(function(){
                                    store.removeConfig('csv',function(){
                                        readConfig_CSV({},callback,scope);
                                    },this);
                                },this);
                            },

                            /** 
                            * Set Model
                            *
                            * @param {Object} userModel
                            * @param {Object} setOnStore
                            *
                            */
                            setModel: function(userModel, setOnStore) {
                                this.userModel= userModel;
                                var extjsVersion = Ext.getVersion("extjs");
                                if(extjsVersion) {
                                    this.idProperty= userModel.prototype.idProperty;
                                }else{
                                    this.idProperty= userModel.getIdProperty();            
                                    userModel.setIdentifier({type:'cs'}); // JCM we're overwriting theirs...
                                }
                                // JCM write the definition?
                                this.getStore().setModel(this.userModel);
                            },

                            /** 
                            * Replica Number
                            *
                            */
                            replicaNumber: function() {
                                return this.generator.r;
                            },

                            /** 
                            * Add Replica numbers
                            *
                            * @param {Object} csv
                            * @param {Function} callback
                            * @param {Object} scope
                            *
                            */
                            addReplicaNumbers: function(csv,callback,scope) {
                                this.csv.addReplicaNumbers(csv);
                                this.writeConfig_CSV(callback,scope);
                            },

                            /** 
                            * Set Replica number
                            *
                            * @param {Number} new_replica_number
                            * @param {Function} callback
                            * @param {Object} scope
                            *
                            */
                            setReplicaNumber: function(new_replica_number,callback,scope) {
                                var old_replica_number= this.replicaNumber();
                                Ext.cf.util.Logger.info('SyncProxy.setReplicaNumber: change from',old_replica_number,'to',new_replica_number);
                                this.getStore().changeReplicaNumber(old_replica_number,new_replica_number,function(){
                                    this.getReplicaDefinition().changeReplicaNumber(new_replica_number);
                                    this.csv.changeReplicaNumber(old_replica_number,new_replica_number);
                                    this.generator.setReplicaNumber(new_replica_number);
                                    this.writeConfig_Replica(function(){
                                        this.writeConfig_Generator(function(){
                                            this.writeConfig_CSV(callback,scope);
                                        },this);
                                    },this);
                                },this);
                            },

                            /** 
                            * Get updates
                            *
                            * @param {Object} csv
                            * @param {Function} callback
                            * @param {Object} scope
                            *
                            */
                            getUpdates: function(csv,callback,scope) {
                                //
                                // The server might know about more replicas than the client,
                                // so we add those unknown replicas to the client's csv, so 
                                // that we will take account of them in the following.
                                //
                                csv.addReplicaNumbers(this.csv);
                                //
                                // Check if we have any updates for the server.
                                // We will do if our CVS dominate their CVS.
                                //
                                var r= this.csv.dominant(csv);
                                if(r.dominant.length===0){
                                    //
                                    // We have no updates for the server.
                                    //
                                    var updates_csv= Ext.create('Ext.cf.ds.CSV');
                                    //
                                    // Check if the server has any updates for us. 
                                    //
                                    var required_csv= Ext.create('Ext.cf.ds.CSV');
                                    var i, l= r.dominated.length;
                                    for(i=0;i<l;i++){
                                        required_csv.addCS(this.csv.get(r.dominated[i]));
                                    }
                                    callback.call(scope,Ext.create('Ext.cf.data.Updates'),updates_csv,required_csv);
                                }else{
                                    if(!csv.isEmpty()){
                                        Ext.cf.util.Logger.info('SyncProxy.getUpdates: Get updates from',csv.asString());
                                        Ext.cf.util.Logger.info('SyncProxy.getUpdates: Dominated Replicas:',Ext.Array.pluck(r.dominated,'r').join(', '));
                                    }
                                    //
                                    // Get a list of updates that have been seen since the point
                                    // described by the csv.
                                    //
                                    var updates= [];
                                    this.getStore().readByCSV(csv, function(records){
                                        var i, l= records.length;
                                        for(i=0;i<l;i++){
                                            updates= updates.concat(records[i].getUpdates(csv));
                                        }
                                        //
                                        // This sequence of updates will bring the client up to the point
                                        // described by the csv received plus the csv here. Note that there
                                        // could be no updates, but that the csv could have still been brought
                                        // forward, so we might need to send the resultant csv, even though
                                        // updates is empty. 
                                        //
                                        var updates_csv= Ext.create('Ext.cf.ds.CSV');
                                        updates_csv.addX(r.dominant); // we only need to send the difference in the csv's
                                        //
                                        // We also compute the csv that will bring the server up to the
                                        // point described by the csv received. The client uses this to
                                        // determine the updates to send to the server.
                                        //
                                        var required_csv= Ext.create('Ext.cf.ds.CSV');
                                        required_csv.addX(r.dominated); // we only need to send the difference in the csv's
                                        //
                                        callback.call(scope,Ext.create('Ext.cf.data.Updates',updates),updates_csv,required_csv);
                                    }, this);
                                }        
                            },

                            /** 
                            * Put updates
                            *
                            * @param {Array} updates
                            * @param {Object} updates_csv
                            * @param {Function} callback
                            * @param {Object} scope
                            *
                            */
                            putUpdates: function(updates,updates_csv,callback,scope) {
                                Ext.create('Ext.cf.data.Transaction',this,function(t){
                                    if(updates.isEmpty()){
                                        //
                                        // Even though updates is empty, the received csv could still be more
                                        // recent than the local csv, so the local csv still needs to be updated.
                                        //
                                        t.updateCSV(updates_csv);
                                        t.commit(function(){
                                            callback.call(scope,{r:'ok'});
                                        },this);
                                    }else{
                                        var computed_csv= Ext.create('Ext.cf.ds.CSV');
                                        var oids= updates.oids();
                                        t.readByOids(oids,function(){ // prefetch
                                            updates.forEach(function(update) {
                                                this.applyUpdate(t,update,function(){},this); // read from memory
                                                computed_csv.addCS(update.c);
                                            },this);
                                            this.putUpdates_done(t,updates,updates_csv,computed_csv,callback,scope);
                                        },this);
                                    }
                                },this);
                            },

                            /** 
                            * Put updates done
                            *
                            * @param {Object} t
                            * @param {Array} updates
                            * @param {Object} updates_csv
                            * @param {Object} computed_csv
                            * @param {Function} callback
                            * @param {Object} scope
                            *
                            */
                            putUpdates_done: function(t,updates,updates_csv,computed_csv,callback,scope) {
                                //
                                // This sequence of updates will bring the client up to the point
                                // described by the csv received plus the csv here. Note that there
                                // could be no updates, but that the csv could have still been brought
                                // forward. 
                                //
                                // We also compute a new csv from all the updates received, just in
                                // case the peer didn't send one, or sent a bad one.
                                //
                                // Make sure to bump forward our clock, just in case one of our peers 
                                // has run ahead.
                                //
                                t.updateCSV(computed_csv);
                                t.updateCSV(updates_csv);
                                t.commit(function(createdRecords,updatedRecords){
                                    // discard the created, then deleted
                                    createdRecords= Ext.Array.filter(createdRecords,Ext.cf.data.SyncModel.isNotDestroyed);
                                    // move the updated, then deleted
                                    var x= Ext.Array.partition(updatedRecords,Ext.cf.data.SyncModel.isDestroyed);
                                    var destroyedRecords= x[0];
                                    updatedRecords= x[1];
                                    callback.call(scope,{
                                        r: 'ok',
                                        created: createdRecords,
                                        updated: updatedRecords,
                                        removed: destroyedRecords
                                    });
                                },this);
                            },

                            /** 
                            * Apply update
                            *
                            * @param {Object} t
                            * @param {Object} update
                            * @param {Function} callback
                            * @param {Object} scope
                            * @param {Object} last_ref
                            *
                            */
                            applyUpdate: function(t,update,callback,scope,last_ref) { // Attribute Value - Conflict Detection and Resolution
                                t.readCacheByOid(update.i,function(record) {
                                    if (record) {
                                        this.applyUpdateToRecord(t,record,update);
                                        callback.call(scope);
                                    } else {
                                        Ext.cf.util.Logger.debug('SyncProxy.applyUpdate:',Ext.cf.data.Update.asString(update),'accepted, creating new record');
                                        this.applyUpdateCreatingNewRecord(t,update);
                                        callback.call(scope);
                                    }
                                },this);
                            },

                            /** 
                            * Apply update - create new record
                            *
                            * @param {Object} t
                            * @param {Object} update
                            *
                            */
                            applyUpdateCreatingNewRecord: function(t,update) {
                                var record;
                                // no record with that oid is in the local store...
                                if (update.p==='_oid') {
                                    // ...which is ok, because the update is intending to create it
                                    record= this.createModelFromOid(t,update.v,update.c);
                                    //console.log('applyUpdate',Ext.encode(record.eco),'( create XXX )');
                                } else {
                                    // ...which is not ok, because given the strict ordering of updates
                                    // by change stamp the update creating the object must be sent first.
                                    // But, let's be forgiving and create the record to receive the update. 
                                    Ext.cf.util.Logger.warn("Update received for unknown record "+update.i,Ext.cf.data.Update.asString(update));
                                    record= this.createModelFromOid(t,update.i,update.i);
                                    record.setValueCS(t,update.p,update.v,update.c);
                                }
                                t.create([record]);
                            },

                            /** 
                            * Create model from Oid
                            *
                            * @param {Object} t
                            * @param {Number/String} oid
                            * @param {Object} cs
                            *
                            * @return {Object} record
                            *
                            */
                            createModelFromOid: function(t,oid,cs) {
                                Ext.cf.util.Logger.info('SyncProxy.createModelFromOid:',oid,cs);
                                var record= new this.userModel({});
                                record.phantom= false; // this prevents the bound Ext.data.Store from re-adding this record
                                var eco= record.eco= Ext.create('Ext.cf.ds.ECO',{
                                    oid: oid,
                                    data: record.data,
                                    state: {}
                                });
                                Ext.apply(record,Ext.cf.data.ModelWrapper);                
                                record.setValueCS(t,'_oid',oid,cs);
                                return record;
                            },

                            /** 
                            * Apply update to record
                            *
                            * @param {Object} t
                            * @param {Object} record
                            * @param {Object} update
                            *
                            * @return {Boolean} True/False => Accepted/Rejected
                            *
                            */
                            applyUpdateToRecord: function(t,record,update) {
                                if (record.putUpdate(t,update)) {
                                    t.update([record]);
                                    Ext.cf.util.Logger.info('SyncProxy.applyUpdateToRecord:',Ext.cf.data.Update.asString(update),'accepted');
                                    return true;
                                } else {
                                    Ext.cf.util.Logger.info('SyncProxy.applyUpdateToRecord:',Ext.cf.data.Update.asString(update),'rejected');
                                    return false;
                                }
                            },

                            // read and write configuration

                            /** 
                            * Load config
                            *
                            * @param {Object} config
                            * @param {Function} callback
                            * @param {Object} scope
                            *
                            */
                            loadConfig: function(config,callback,scope) {
                                this.readConfig_Database(config,function(){
                                    this.readConfig_Replica(config,function(){
                                        this.readConfig_CSV(config,function(){
                                            this.readConfig_Generator(config,function(){
                                                callback.call(scope);
                                            },this);
                                        },this);
                                    },this);
                                },this);
                            },

                            /** 
                            * Read config database
                            *
                            * @param {Object} config
                            * @param {Function} callback
                            * @param {Object} scope
                            *
                            */
                            readConfig_Database: function(config,callback,scope) {
                                this.readConfig(Ext.cf.data.DatabaseDefinition,'databaseDefinition',config.databaseDefinition,{},function(r,definition) {
                                this.setDatabaseDefinition(definition);
                                callback.call(scope,r,definition);
                            },this);
                        },

                        /** 
                        * Read config replica
                        *
                        * @param {Object} config
                        * @param {Function} callback
                        * @param {Object} scope
                        *
                        */
                        readConfig_Replica: function(config,callback,scope) {
                            this.readConfig(Ext.cf.data.ReplicaDefinition,'replicaDefinition',config.replicaDefinition,{},function(r,definition) {
                            this.setReplicaDefinition(definition);
                            callback.call(scope,r,definition);
                        },this);
                    },

                    /** 
                    * Read config generator
                    *
                    * @param {Object} config
                    * @param {Function} callback
                    * @param {Object} scope
                    *
                    */
                    readConfig_Generator: function(config,callback,scope) {
                        this.readConfig(Ext.cf.ds.LogicalClock,'generator',{},{},function(r,generator){
                        this.generator= generator;
                        if(this.generator.r===undefined){
                            this.generator.r= config.replicaDefinition.replicaNumber; 
                        }
                        if(config.clock){
                            this.generator.setClock(config.clock);
                        }
                        callback.call(scope,r,generator);
                    },this); 
                },

                /** 
                * Read config csv
                *
                * @param {Object} config
                * @param {Function} callback
                * @param {Object} scope
                *
                */
                readConfig_CSV: function(config,callback,scope) {
                    this.readConfig(Ext.cf.ds.CSV,'csv',{},{},function(r,csv){
                    this.csv= csv;
                    callback.call(scope,r,csv);
                },this); 
            },

            /** 
            * Write config replica
            *
            * @param {Function} callback
            * @param {Object} scope
            *
            */
            writeConfig_Replica: function(callback,scope) {
                this.writeConfig('replicaDefinition',this.getReplicaDefinition(),callback,scope);
            },

            /** 
            * Write config generator
            *
            * @param {Function} callback
            * @param {Object} scope
            *
            */
            writeConfig_Generator: function(callback,scope) {
                this.writeConfig('generator',this.generator,callback,scope);
            },

            /** 
            * Write config csv
            *
            * @param {Function} callback
            * @param {Object} scope
            *
            */
            writeConfig_CSV: function(callback,scope) {
                this.writeConfig('csv',this.csv,callback,scope);
            },

            /** 
            * Write config
            *
            * @param {Number/String} id
            * @param {Object} object
            * @param {Function} callback
            * @param {Object} scope
            *
            */
            writeConfig: function(id, object, callback, scope) {
                if(object){
                    this.getStore().writeConfig(id,object.as_data(),callback,scope);
                }else{
                    callback.call(scope);
                }
            },

            /** 
            * Read config
            *
            * @param {String} klass
            * @param {Number/String} id
            * @param {Object} default_data
            * @param {Object} overwrite_data
            * @param {Function} callback
            * @param {Object} scope
            *
            */
            readConfig: function(Klass, id, default_data, overwrite_data, callback, scope) {
                this.getStore().readConfig(id,function(data) {
                    var name;
                    var r= (data===undefined) ? 'created' : 'ok';
                    if (default_data!==undefined) {
                        if (data===undefined) {
                            data= default_data;
                        } else {
                            for(name in default_data) {
                                if (data[name]===undefined) {
                                    data[name]= default_data[name];
                                }
                            }
                        }
                    }
                    if (overwrite_data!==undefined) {
                        if (data===undefined) {
                            data= overwrite_data;
                        } else {
                            for(name in overwrite_data) {
                                if (data[name]!==overwrite_data[name]) {
                                    data[name]= overwrite_data[name];
                                }
                            }
                        }
                    }

                    callback.call(scope,r,new Klass(data));
                },this);
            },

            /** 
            * Callback
            *
            * @param {Function} callback
            * @param {Object} scope
            * @param {String} operation
            *
            */
            doCallback: function(callback, scope, operation) {
                if (typeof callback == 'function') {
                    callback.call(scope || this, operation);
                }
            }

        });

        /*
        * @ignore
        * @private
        */
        Ext.define('Ext.data.identifier.CS', {
            alias: 'data.identifier.cs',

            config: {
                model: null
            },

            /**
            * @private
            *
            * Constructor
            *
            * @param {Object} config
            *
            */
            constructor: function(config) {
                this.initConfig(config);
            },

            /**
            * @private
            *
            * Generate
            *
            * @param {Object} record
            *
            */
            generate: function(record) {
                return undefined;
            }
        });

        Ext.Array.partition= function(a,fn,scope) {
            var r1= [], r2= [];
            if (a) {
                var j, l= a.length;
                for(var i= 0;i<l;i++) {
                    j= a[i];
                    if (j!==undefined) {
                        if (fn.call(scope||j,j)) {
                            r1.push(j);
                        } else {
                            r2.push(j);
                        }
                    }
                }
            }
            return [r1,r2];
        };


        /** 
        * @private
        * The proxy is documented in the Ext.io.Store class, as is makes more sense
        * to have that in the docs structure.
        */
        Ext.define('Ext.io.data.Proxy', {
            extend: 'Ext.data.proxy.Client',
            alias: 'proxy.syncstorage',
            requires: [
            'Ext.cf.Utilities',
            'Ext.cf.data.SyncProxy',
            'Ext.cf.data.SyncStore',
            'Ext.cf.data.Protocol'
            ],

            proxyInitialized: false,
            proxyLocked: true,

            config: {
                databaseName: undefined,
                deviceId: undefined,
                owner: null,
                access: null,
                userId: undefined,
                groupId: undefined,
                localSyncProxy: undefined,
                clock: undefined
            },

            /**
            * @private
            *
            * Constructor
            *
            * @param {Object} config
            *
            */
            constructor: function(config) {
                this.logger = Ext.cf.util.Logger;
                Ext.cf.Utilities.check('Ext.io.data.Proxy', 'constructor', 'config', config, ['id']);
                this.setDatabaseName(config.id)
                this.proxyLocked= true;
                this.proxyInitialized= false;
                this.initConfig(config);
                this.callParent([config]);
                //
                // Check the Database Directory
                //   The store might be known about, but was cleared.
                //
                var directory= Ext.io.Io.getStoreDirectory();
                var db= directory.get(this.getDatabaseName(), "syncstore");
                if(db){
                    directory.add(this.getDatabaseName(), "syncstore");
                }
            },

            /**
            * @private
            * Create
            *
            */
            create: function(){
                var a= arguments;
                this.with_proxy(function(remoteProxy){
                    remoteProxy.create.apply(remoteProxy,a);
                },this);
            },

            /**
            * @private
            * Read
            *
            */
            read: function(){
                var a= arguments;
                this.with_proxy(function(remoteProxy){
                    remoteProxy.read.apply(remoteProxy,a);
                },this);
            },

            /**
            * @private
            * Update
            *
            */
            update: function(){
                var a= arguments;
                this.with_proxy(function(remoteProxy){
                    remoteProxy.update.apply(remoteProxy,a);
                },this);
            },

            /**
            * @private
            * Destroy
            *
            */
            destroy: function(){
                var a= arguments;
                this.with_proxy(function(remoteProxy){
                    remoteProxy.destroy.apply(remoteProxy,a);
                },this);
            },

            /**
            * @private
            * Set Model
            *
            */
            setModel: function(){
                var a= arguments;
                this.with_proxy(function(remoteProxy){
                    remoteProxy.setModel.apply(remoteProxy,a);
                },this);
                this.callParent(arguments);
            },

            /**
            * @private
            * Sync
            *
            * @param {Object} store The store this proxy is bound to. The proxy fires events on it to update any bound views.
            * @param {Function} callback
            * @param {Object} scope
            *
            */
            sync: function(store,callback,scope) {

                if(this.proxyLocked){
                    // 
                    // if there are local updates to be applied, then we should queue the call, and call it once the sync in progress has completed.
                    //
                    if(this.storeHasUpdates(store)){
                        // JCM queue the request to sync
                        // JCM do another sync when this one finishes
                        // JCM we only have to queue one..?
                        if(callback) {
                            callback.call(scope,{r:'error',message:'local updates do need to be synched, but a remote sync is currently in progress'});
                        }
                    }else{
                        //
                        // if there are no local updates, then we do nothing, since the sync in progress is already doing the requested sync. 
                        //
                        if(callback) {
                            callback.call(scope,{r:'ok',message:'no local updates to sync, and remote sync is already in progress'});
                        }
                    }
                } else {
                    this.with_proxy(function(remoteProxy){
                        this.proxyLocked= true;
                        try {
                            //
                            // sync the local storage proxy
                            //
                            var changes= store.storeSync();

                            store.removed= []; // clear the list of records to be deleted
                            //
                            // sync the remote storage proxy
                            //
                            this.logger.info('Ext.io.data.Proxy.sync: Start sync of database:',this.getDatabaseName());
                            this.protocol.sync(function(r){
                                if(r.r=='ok'){
                                    this.setDatabaseDefinitionRemote(true); // the server knows about the database now
                                }
                                this.updateStore(store,r.created,r.updated,r.removed);
                                this.proxyLocked= false;
                                this.logger.info('Ext.io.data.Proxy.sync: End sync of database:',this.getDatabaseName());
                                if(callback) {
                                    callback.call(scope,r);
                                }
                            },this);
                        } catch (e) {
                            this.proxyLocked= false;
                            this.logger.error('Ext.io.data.Proxy.sync: Exception thrown during synchronization');
                            this.logger.error(e);
                            this.logger.error(e.stack);
                            throw e;
                        }
                    },this);
                }
            },

            /**
            * @private
            *
            * Check if the store has any pending updates: add, update, delete
            *
            * @param {Object} store
            */
            storeHasUpdates: function(store) {
                var toCreate = store.getNewRecords();
                if(toCreate.length>0) {
                    return true;
                }else{
                    var toUpdate = store.getUpdatedRecords();
                    if(toUpdate.length>0){
                        return true;
                    }else{
                        var toDestroy = store.getRemovedRecords();
                        return (toDestroy.length>0);
                    }
                }
            },

            /**
            * @private
            *
            * Update the store with any created, updated, or deleted records.
            *
            * Fire events so that any bound views will update themselves.
            *
            * @param {Object} store
            * @param {Array} createdRecords
            * @param {Array} updatedRecords
            * @param {Array} removedRecords
            */
            updateStore: function(store,createdRecords,updatedRecords,removedRecords){
                var changed = false;
                if(createdRecords && createdRecords.length>0) {
                    store.data.addAll(createdRecords);
                    store.fireEvent('addrecords', this, createdRecords, 0);
                    changed = true;
                }
                if(updatedRecords && updatedRecords.length>0) {
                    store.data.addAll(updatedRecords);
                    for(var i = 0, l = updatedRecords.length; i < l; i++ ){
                        store.fireEvent('updaterecord', this, updatedRecords[i]);  
                    }
                    changed = true;
                }
                if(removedRecords && removedRecords.length>0) {
                    var l= removedRecords.length;
                    for(var i=0;i<l;i++){
                        var id= removedRecords[i].getId();
                        store.data.removeAt(store.data.findIndexBy(function(i){ // slower, but will match
                            return i.getId()===id;
                        }));
                    }
                    store.fireEvent('removerecords', this, removedRecords);
                    changed = true;
                }
                if(changed) {
                    //
                    // We only want to call refresh if something changed, otherwise sync will cause
                    // UI strangeness as the components refresh for no reason.
                    //
                    store.fireEvent('refresh');
                }
            },

            /**
            * @private
            * Clear
            *
            * The proxy can be reused after it has been cleared.
            *
            */
            clear: function() {
                if(this.proxyInitialized) {
                    this.proxyLocked= true;
                    this.setDatabaseDefinitionLocal(false); // we no longer have a local copy of the data
                    this.remoteProxy.clear(function(){ // JCM why are we clearing the remote... shouldn't it clear the local?
                        delete this.localProxy;
                        delete this.remoteProxy;
                        delete this.protocol;
                        this.proxyInitialized= false;
                        this.proxyLocked= false;
                    },this);
                }
            },

            // private

            /**
            * @private
            *
            * Set DB Definition = Local
            *
            * @param {Boolean/String} flag
            *
            */
            setDatabaseDefinitionLocal: function(flag){
                Ext.io.Io.getStoreDirectory().update(this.getDatabaseName(), "syncstore", {local: flag});
            },

            /**
            * @private
            *
            * Set DB Definition = Remote
            *
            * @param {Boolean/String} flag
            *
            */
            setDatabaseDefinitionRemote: function(flag){
                Ext.io.Io.getStoreDirectory().update(this.getDatabaseName(), "syncstore", {remote: flag});
            },

            /**
            * @private
            *
            * create the local proxy, remote proxy, and protocol
            *
            * @param {Function} callback
            * @param {Object} scope
            *
            */
            with_proxy: function(callback,scope) {
                if(this.proxyInitialized){
                    callback.call(scope,this.remoteProxy);
                }else{
                    this.createLocalProxy(function(localProxy){
                        this.localProxy= localProxy;
                        this.createRemoteProxy(function(remoteProxy){
                            this.remoteProxy= remoteProxy;


                            this.protocol= Ext.create('Ext.cf.data.Protocol',{proxy:this.remoteProxy, owner: this.getOwner(), access: this.getAccess()});
                            Ext.cf.Utilities.delegate(this,this.remoteProxy,['read','update','destroy']);
                            this.setDatabaseDefinitionLocal(true); // we have a local copy of the data now
                            this.proxyLocked= false; // we're open for business
                            this.proxyInitialized= true;
                            callback.call(scope,remoteProxy);
                        },this);
                    },this);
                }
            },

            /**
            * @private
            *
            * create local storage proxy
            *
            * @param {Function} callback
            * @param {Object} scope
            *
            */
            createLocalProxy: function(callback,scope) {
                //
                // Local Storage Proxy
                //
                var syncStoreName= this.getLocalSyncProxy()||'Ext.cf.data.SyncStore';
                var localProxy= Ext.create(syncStoreName);
                localProxy.asyncInitialize(this.getCurrentConfig(),function(r){
                    if(r.r!=='ok'){
                        this.logger.error('Ext.io.data.Proxy: Unable to create local proxy:',syncStoreName,':',Ext.encode(r));
                    }
                    callback.call(scope,localProxy);
                },this);
            },

            /**
            * @private
            *
            * create remote storage proxy
            *
            * @param {Function} callback
            * @param {Object} scope
            *
            */
            createRemoteProxy: function(callback,scope) {
                var databaseDefinition= {
                    databaseName: this.getDatabaseName(),
                    generation: 0
                };
                var config= {
                    databaseDefinition: databaseDefinition,
                    replicaDefinition: {
                        replicaNumber: 0
                    },
                    store: this.localProxy,
                    clock: this.getClock()
                };
                var remoteProxy= Ext.create('Ext.cf.data.SyncProxy');
                remoteProxy.asyncInitialize(config,function(r){
                    if(r.r!=='ok'){
                        this.logger.error('Ext.io.data.Proxy: Unable to create remote proxy:',Ext.encode(r));
                    }
                    callback.call(scope,remoteProxy);
                },this);
            },

        });


        /**
        * @private
        *
        */
        Ext.define('Ext.cf.messaging.Messaging', {
            requires: [
            'Ext.cf.naming.Naming',
            'Ext.cf.messaging.Transport',
            'Ext.cf.messaging.Rpc',
            'Ext.cf.messaging.PubSub',
            'Ext.io.Proxy', 
            'Ext.io.Service',
            'Ext.cf.util.ErrorHelper'],


            /**
            * @private
            *
            */    
            transport: null,

            /**
            * @private
            *
            */
            rpc: null,

            /**
            * @private
            *
            */
            pubsub: null,

            /** 
            * Constructor
            *
            * @param {Object} config
            *
            */
            constructor: function(config) {
                this.initConfig(config);
                /* 
                * Instantiate the naming service proxy.
                */
                this.naming = Ext.create('Ext.io.Naming');
                this.transport = Ext.create('Ext.cf.messaging.Transport', config);
                config.transport= this.transport;
                this.rpc = Ext.create('Ext.cf.messaging.Rpc', config);
                this.pubsub = Ext.create('Ext.cf.messaging.PubSub', config);

                return this;
            },

            /**
            * @private
            *
            */
            proxyCache : {},

            /** 
            * Get service
            *
            * @param {Object} options
            * @param {String} options.name
            * @param {Function} callback
            * @param {Object} scope
            */
            getService: function(options,callback,scope) {
                var self = this;
                if(!options.name || options.name === "") {
                    Ext.cf.util.Logger.error("Service name is missing");
                    var errResponse = Ext.cf.util.ErrorHelper.get('SERVICE_NAME_MISSING');
                    callback.call(scope,undefined,errResponse);
                } else {
                    var service = this.proxyCache[options.name];
                    if(service) {
                        callback.call(scope,service);
                    } else {
                        self.naming.getServiceDescriptor(options.name, function(serviceDescriptor, err) {
                            if(err || typeof(serviceDescriptor) === "undefined" || serviceDescriptor === null) {
                                Ext.cf.util.Logger.error("Unable to load service descriptor for " + options.name);
                                var errResponse = Ext.cf.util.ErrorHelper.get('SERVICE_DESCRIPTOR_LOAD_ERROR', options.name);
                                errResponse.cause = err;
                                callback.call(scope,undefined,errResponse);
                            } else {
                                if(serviceDescriptor.kind == "rpc") {
                                    service = Ext.create('Ext.io.Proxy', {name:options.name, descriptor:serviceDescriptor, rpc:self.rpc});
                                } else {
                                    service = Ext.create('Ext.io.Service', {name:options.name, descriptor:serviceDescriptor, transport:self.transport});
                                }
                                self.proxyCache[options.name] = service;
                                callback.call(scope,service);
                            }
                        });
                    }
                }
            },

            /**
            * @private
            *
            */
            channelCache: {},

            /** 
            * Get channel
            *
            * @param {Object} options
            * @param {Object} options.name
            * @param {Object} options.appId
            * @param {Function} callback
            * @param {Object} scope
            *
            */
            getChannel: function(options,callback,scope) {
                var self = this;

                var errResponse;

                if(!options.name || options.name === "") {
                    errResponse = Ext.cf.util.ErrorHelper.get('CHANNEL_NAME_MISSING');
                    callback.call(scope,undefined,errResponse);
                } else if(!options.appId || options.appId === "") {
                    errResponse = Ext.cf.util.ErrorHelper.get('CHANNEL_APP_ID_MISSING');
                    callback.call(scope,undefined,errResponse);
                } else {
                    var queueName = options.appId + "." + options.name;
                    var channel = this.channelCache[queueName];
                    if(!channel) {
                        self.getService(
                        {name: "AppService"},
                        function(AppService,err) {
                            if(AppService){
                                AppService.getQueue(function(result) {
                                    if(result.status == "success") {
                                        channel = Ext.create('Ext.io.Channel', {id:result.value._key, data:result.value.data, name:options.name, queueName:queueName});
                                        self.channelCache[queueName] = channel;
                                        callback.call(scope,channel);
                                    } else {
                                        callback.call(scope,undefined,result.error);
                                    }
                                }, options.appId, options);
                            }else{
                                callback.call(scope,undefined,err);
                            }
                        },this
                        );
                    } else {
                        callback.call(scope,channel);
                    }
                }
            },

            //options.params.file - it should be a handler for file, for example for client side:
            //document.getElementById("the-file").files[0];
            /** 
            * Send content
            *
            * @param {Object} options
            * @param {String} options.name
            * @param {Function} callback
            * @param {Object} scope
            *
            */
            sendContent: function(options,callback,scope) {
                var self  = this;
                var url   = self.config.url || 'http://msg.sencha.io';
                if(!options.name || options.name === "" || !options.file || !options.ftype) {
                    var errResponse = { code: 'PARAMS_MISSING', message: 'Some of parameters are missing' };
                    callback.call(scope,errResponse);
                } else {
                    var xhr = new XMLHttpRequest();
                    xhr.onreadystatechange = function(){
                        if (xhr.readyState == 4) {
                            var parseResult = function(str) {
                                var res;
                                try {
                                    res = JSON.parse(str);
                                } catch (e) {
                                    return {};
                                }
                                return res;
                            };
                            var result = Ext.merge({status : 'error', error : 'Can not store file'}, parseResult(xhr.responseText));
                            if (result.status == 'success') {
                                callback.call(scope,result.value);
                            } else {
                                var errResponse = { code: 'STORE_ERROR', message: result.error };
                                callback.call(scope,null,errResponse);
                            }
                        }
                    };
                    xhr.open('POST', url+'/contenttransfer/'+Math.random(), true);
                    xhr.setRequestHeader("X-File-Name", encodeURIComponent(options.name));
                    xhr.setRequestHeader("Content-Type", "application/octet-stream; charset=binary");
                    xhr.overrideMimeType('application/octet-stream; charset=x-user-defined-binary');
                    xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
                    xhr.setRequestHeader("Content-Encoding", "binary");
                    xhr.setRequestHeader("File-type", options.ftype);

                    xhr.send(options.file);
                }
            }
        });


        Ext.setVersion('sio', '0.3.4');

        //Figure out where IO is located and add CF to the loader
        //so that the developer doesn't have to manually include something 
        //they should never have to know aobut. 
        (function() {
            var ioPath = Ext.Loader.getPath("Ext.io");
            if(ioPath){
                var cfPath = ioPath.substring(0, ioPath.lastIndexOf("/")) + "/cf";
                Ext.Loader.setPath('Ext.cf',cfPath);    
            }
        })();

        /**
        * @class Ext.io.Io
        * @singleton
        * @aside guide intro
        *
        * Ext.io is the namespace for the Sencha.io SDK. The Ext.io.Io class is a singleton that
        * initializes the Sencha.io client.
        *
        * At the start of your app you should call the Ext.Io.setup method. 
        * Calling Ext.Io.setup is not mandatatory if the app is being served by Sencha.io, as it
        * will provide the app with its configuration information when it is served. But
        * for development purposes, and for app deployment through other services, both
        * the App Id and App Secret should be passed through the Ext.Io.setup method.
        *
        *     Ext.Io.setup({
        *         //logLevel: 'debug',
        *         appId: 'DsmMwW3b0hrUT5SS2n2TYwSR6nY',
        *         appSecret: 'WucvCx3Wv1P3'
        *     })
        *
        */
        Ext.define('Ext.io.Io', {
            requires: (function() {
                var classesToRequire = [
                'Ext.cf.Overrides',
                'Ext.cf.messaging.DeviceAllocator',
                'Ext.cf.messaging.Messaging',
                'Ext.cf.util.Logger',
                'Ext.cf.util.ParamValidator',
                'Ext.io.Group',
                'Ext.io.User',
                'Ext.io.App',
                'Ext.io.Device',
                'Ext.io.Channel',
                'Ext.io.data.Proxy',
                'Ext.cf.naming.IDStore'
                ];



                var extjsVersion = Ext.getVersion("extjs");
                if(!extjsVersion) {
                    classesToRequire.push('Ext.io.data.Directory');
                }

                return classesToRequire;
            })(),

            alternateClassName: "Ext.Io",

            singleton: true,

            config: {
                url: 'http://msg.sencha.io:80'
            },


            /**
            * Setup Ext.io for use.
            *
            *     Ext.setup({
            *         logLevel: 'debug'
            *     })     
            *
            * @param {Object} config
            * @param {String} config.appId
            * @param {String} config.appSecret 
            * @param {String} config.logLevel logging level. Should be one of "none", "debug", "info", "warn" or "error". Defaults to "error".
            *
            * Calling this method is optional. We assume the above defaults otherwise.
            */
            setup: function(config) {

                if(Ext.cf.util.ParamValidator.validateApi([
                { name: "options", type: "object",
                    keys: [
                    { name: "appId", type: 'string' , optional: true },
                    { name: "appSecret", type: 'string', optional: true },
                    { name: "url", type: 'string', optional: true },
                    { name: "logLevel", type: 'string', optional: true }
                    ]
                }
                ], arguments, "Ext.io.Io", "setup")) {

                    Ext.apply(Ext.io.Io.config, config);
                    if (Ext.io.Io.config.logLevel) {
                        Ext.cf.util.Logger.setLevel(Ext.io.Io.config.logLevel);
                    }
                    if(config.trace){
                        for(name in Ext.io){
                            Ext.cf.Utilities.wrapClass(Ext.io[name],'trace',function(m,a){
                                Ext.cf.util.Logger.trace(m.displayName,a);
                            });
                        }
                    }

                }
            },

            callbacks: [], // Nothing much can happen until Ext.io.Io.init completes, so we queue up all the requests until after it has completed

            /**
            * @private
            *
            *  Initialize Sencha.io
            *
            *     Ext.io.Io.init(function(){
            *         // your app code
            *     });
            *
            * @param {Function} callback The function to be called after initializing.
            *
            * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
            * the callback function.
            */
            init: function(callback,scope) {
                var self = this;

                if (Ext.io.Io.config.logLevel) {
                    Ext.cf.util.Logger.setLevel(Ext.io.Io.config.logLevel);
                }

                //
                // We only allow init to be called once.
                //
                if(self.initializing) {
                    if(callback){
                        this.callbacks.push([callback,scope]); // call this callback once initialization is complete
                    }else{
                        Ext.cf.util.Logger.warn("A call to Ext.io.Io.init is already in progress. It's better to always provide a init with a callback, otherwise calls into Ext.io may fail.");
                    }
                    return;
                }
                if(self.initialized) {
                    if(callback){
                        callback.call(scope);
                    }
                    return;
                }
                self.initializing= true;
                if(!callback) {
                    Ext.cf.util.Logger.warn("Ext.io.Io.init can be called without a callback, but calls made into Ext.io before init has completed, may fail.");
                }

                // JCM we need to check if we are online,
                // JCM if not... we will not be able to get all the bits we need
                // JCM and when the device does get online, then the app is not
                // JCM going to be able to communicate... so it should really
                // JCM run through this bootstrapping process again.... 

                this.initDeveloper(function(){
                    this.initApp(function(){
                        this.initDevice(function(){
                            this.initMessaging(function(){
                                this.initGroup(function(){
                                    this.initUser(function() {
                                        self.initialized= true;
                                        self.initializing= false;
                                        if(callback) {
                                            callback.call(scope);  
                                        }
                                        for(var i=0;i<this.callbacks.length;i++){
                                            callback = this.callbacks[i];
                                            callback[0].call(callback[1]);
                                        }
                                    },this)
                                },this)
                            },this)
                        },this)
                    },this)
                },this);
            },

            /**
            * @private
            *
            * @param {Function} callback The function to be called after initializing developer.
            *
            * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
            * the callback function.
            */
            initDeveloper: function(callback,scope) {
                var idstore = Ext.io.Io.getIdStore();
                idstore.stash('developer','id');
                callback.call(scope);
            },

            /**
            * @private
            *
            * Every App has an id
            *
            * @param {Function} callback The function to be called after initializing application.
            *
            * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
            * the callback function.
            */
            initApp: function(callback,scope) {
                var idstore = Ext.io.Io.getIdStore();
                var appId= idstore.stash('app','id',Ext.io.Io.config.appId);
                if (!appId) {
                    Ext.cf.util.Logger.error('Could not find App Id.');
                    Ext.cf.util.Logger.error('The App Id is either provided by senchafy.com when the App is served, or can be passed through Ext.Io.setup({appId:id})');
                }
                callback.call(scope);
            },

            /**
            * @private
            *
            * If a device id and sid were passed through the call to setup, then we use them.
            * Otherwise we check for them in the id store, as they may have been stashed there
            * during a previous app instantiation, or provided they were provided in cookies
            * by the web server. If we do have a device id and sid then we authenticate those
            * with the server, and if don't have them then we register the device using the
            * app id and app secret to get a new id and sid. 
            *
            * @param {Function} callback The function to be called after initializing device.
            *
            * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
            * the callback function.
            */
            initDevice: function(callback, scope) {
                var idstore = Ext.io.Io.getIdStore();
                if(this.config.deviceId) {
                    idstore.setId('device', this.config.deviceId);
                    if(this.config.deviceSid) {
                        idstore.setSid('device', this.config.deviceSid);
                    }
                    Ext.cf.util.Logger.debug("Ext.Io.setup provided the device id",this.config.deviceId);
                    callback.call(scope);
                } else {
                    var deviceSid = idstore.getSid('device');
                    var deviceId = idstore.getId('device');
                    if(deviceSid && deviceId) {
                        this.authenticateDevice(deviceSid, deviceId, callback, scope);
                    } else {
                        this.registerDevice(callback, scope);
                    }
                }
            },

            /**
            * @private
            *
            * initMessaging
            *
            * @param {Function} callback The function to be called after initializing messaging.
            *
            * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
            * the callback function.
            */
            initMessaging: function(callback,scope) {
                var idstore = Ext.io.Io.getIdStore();
                /*
                * Every App has a messaging endpoint URL. 
                * The URL is provided by senchafy.com when the App is served,
                * or is passed through Ext.Io.setup({url:url}), or it defaults
                * to 'http://msg.sencha.io'
                */
                Ext.io.Io.config.url = idstore.stash("msg", "server", Ext.io.Io.config.url);// JCM should check that the url is really a url, and not just a domain name... 
                /* 
                * Instantiate the messaging service proxies.
                */
                this.config.deviceId= idstore.getId('device');
                this.config.deviceSid= idstore.getSid('device');
                Ext.io.Io.messaging = Ext.create('Ext.cf.messaging.Messaging', this.config);
                callback.call(scope);
            },

            /**
            * @private
            *
            * If an App is associated with a Group, then senchafy.com provides the group id.
            *
            * @param {Function} callback The function to be called after initializing group.
            *
            * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
            * the callback function.
            */
            initGroup: function(callback,scope) {
                var idstore = Ext.io.Io.getIdStore();
                if(this.config.groupId) {
                    idstore.setId('group', this.config.groupId);
                    callback.call(scope);
                }else{
                    idstore.stash('group','id');
                    this.config.groupId = idstore.getId('group');
                    if(!this.config.groupId) {
                        Ext.io.App.getCurrent(
                        function(app,err){
                            if(app){
                                app.getGroup(
                                function(group,err){
                                    this.config.groupId= group? group.getId() : null;
                                    idstore.setId('group', this.config.groupId);
                                    callback.call(scope,err);
                                },this
                                );
                            }else{
                                callback.call(scope,err);
                            }
                        },this
                        );
                    }else{
                        callback.call(scope);
                    }
                }
            },

            /**
            * @private
            *
            * 
            * If an App is associated with a Group which is configured for on-the-web user auth
            * then senchafy.com provides the user id.
            *
            *
            * @param {Function} callback The function to be called after initializing user.
            *
            * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
            * the callback function.
            */
            initUser: function(callback,scope) {
                var idstore = Ext.io.Io.getIdStore();
                idstore.stash('user','id');
                callback.call(scope);
            },

            /**
            * @private
            *
            * registerDevice
            *
            * @param {Function} callback The function to be called after registering device.
            *
            * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
            * the callback function.
            */
            registerDevice: function(callback,scope) {
                var self = this;
                var idstore = Ext.io.Io.getIdStore();

                //var appSecret= idstore.stash('app','secret',Ext.io.Io.config.appSecret);
                //if (!appSecret) {
                //    Ext.cf.util.Logger.error('Could not find App Secret.');
                //    Ext.cf.util.Logger.error('The App Secret is either provided by senchafy.com when the App is served, or can be passed through Ext.Io.setup({appId:id,appSecret:secret})');
                //}

                Ext.cf.messaging.DeviceAllocator.register(this.config.url, this.config.appId, function(response) {
                    if(response.status === "success") {
                        Ext.cf.util.Logger.debug("registerDevice", "succeeded", response);
                        idstore.setId("device", response.result.deviceId);
                        idstore.setSid("device", response.result.deviceSid);
                        callback.call(scope);
                    } else {
                        var err = response.error;
                        var errorMessage = "Registering device failed. " + err.code +  ": " + err.message;
                        Ext.cf.util.Logger.error("registerDevice", errorMessage, err);
                        throw errorMessage;
                    }
                });
            },

            /**
            * @private
            *
            * authenticateDevice
            *
            * @param {Function} callback The function to be called after authenticating device.
            *
            * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
            * the callback function.
            */
            authenticateDevice: function(deviceSid, deviceId, callback, scope) {
                var self = this;
                Ext.cf.messaging.DeviceAllocator.authenticate(this.config.url, deviceSid, deviceId, function(response) {
                    if(response.status === "success") {
                        Ext.cf.util.Logger.debug("authenticateDevice", "succeeded", response);
                        callback.call(scope);
                    } else {
                        if(response.error.code === 'NETWORK_ERROR') {
                            var errorMessage = "Authenticate device failed due to network error";
                            Ext.cf.util.Logger.error(errorMessage, response.error);
                            throw errorMessage;
                        } else {
                            Ext.cf.util.Logger.warn("authenticateDevice", "failed, re-registering device", response.error);
                            self.registerDevice(callback,scope);
                        }
                    }
                });
            },

            /**
            * @private
            */
            idStore: undefined,

            /**
            * @private
            */
            getIdStore: function() {
                Ext.io.Io.idStore= Ext.io.Io.idStore || Ext.create('Ext.cf.naming.IDStore')
                return Ext.io.Io.idStore;
            },

            /**
            * @private
            */
            messaging: undefined,

            /**
            * @private
            */
            getMessagingProxy: function(callback,scope) {
                if(Ext.io.Io.messaging){
                    callback.call(scope,Ext.io.Io.messaging);
                }else{
                    Ext.io.Io.init(function(){
                        callback.call(scope,Ext.io.Io.messaging);
                    },this);
                }
            },

            /**
            * @private
            */
            storeDirectory: undefined,

            /**
            * @private
            * The Store Directory contains a list of all known stores,
            * both local and remote.
            */
            getStoreDirectory: function() {
                Ext.io.Io.storeDirectory= Ext.io.Io.storeDirectory || Ext.create('Ext.io.data.Directory', {});
                return Ext.io.Io.storeDirectory;
            },

            /**
            * @private
            * Get a proxy interface for a service.
            *
            * For RPC services, an instance of {@link Ext.io.Proxy} is returned, whereas for
            * async message based services, an instance of {@link Ext.io.Service} is returned.
            *
            * @param {Object} optoins 
            *
            * @param {Function} callback The function to be called after getting service.
            *
            * @param {Object} scope The scope in which to execute the callbacks: The "this" object for
            * the callback function.
            */
            getService: function(options,callback,scope) {
                if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([
                { name: "name", type: 'string' },
                ], arguments, "Ext.io.Io", "getService")) {
                    Ext.io.Io.init(function() {
                        Ext.io.Io.messaging.getService(options,callback,scope);
                    });
                }
            }

        });


        /**
        * Default authentication panel used by Ext.io.Controller when the user needs to login.
        *
        * Subclass or replace this class ot create a custom user login experience. 
        * Ext.io.Controller listens to events generated by this class and will call methods
        * where noted.  To work correctly any replacement or sub-class must provide the same interface.
        *
        */
        if(!Ext.getVersion('extjs')){
            Ext.define("Ext.io.ux.Authenticate", {
                extend: 'Ext.Container',
                requires: ["Ext.MessageBox", "Ext.TitleBar", "Ext.form.Panel", "Ext.form.FieldSet", "Ext.field.Password",  "Ext.field.Email"],




                /**
                * @event loginUser
                * Fired when the user has entered their auth credentials.
                * {Ext.io.Controller} listens for this event and will attempt to login 
                * the user with the passed credentials. 
                * @param {Object} auth Key/values given by the user to authenticate with.
                */

                /**
                * @event registerUser
                * Fired when the user wants to create a new account.
                * {Ext.io.Controller} listens for this event and will attempt 
                * to registers the user with the passed information.
                * @param {Object} auth Key/values given by the user to register with.
                */

                /**
                * @event cancel
                * Fired when the user doesn't want to login.
                * {Ext.io.Controller} listens for this event and will 
                * close the login pannel.
                */


                config: {
                    id: "loginpanel",
                    layout: "fit",
                    fullscreen: true,

                    control: {
                        "button[action=siologin]": {
                            tap: "doAuth"
                        },

                        "button[action=showRegister]": {
                            tap: "showRegister"
                        },

                        "button[action=sioRegister]": {
                            tap: "doRegister"
                        },

                        "button[action=cancellogin]": {
                            tap: "hideLogin"
                        }
                    },


                    items: [
                    {
                        docked: 'top',
                        xtype: 'titlebar',
                        title: 'Login',
                        items: [
                        {
                            text: "cancel",
                            action: "cancellogin"
                        },
                        {
                            text: "register",
                            action: "showRegister",
                            align: 'right'
                        }
                        ]
                    },
                    {
                        xtype: "panel",
                        layout: "fit",
                        items: [
                        {
                            xtype: "formpanel",
                            items: [
                            {
                                xtype: 'fieldset',
                                items: [
                                {
                                    xtype: 'textfield',
                                    placeHolder: "Username",
                                    name: 'username'
                                },
                                {
                                    xtype: 'passwordfield',
                                    placeHolder: "Password",
                                    name: 'password'
                                },
                                {
                                    xtype: 'emailfield',
                                    placeHolder: "Email",
                                    name: 'email',
                                    hidden: true
                                },
                                {
                                    xtype: 'button',
                                    text: 'Login',
                                    action: "siologin"
                                },
                                {
                                    xtype: 'button',
                                    text: 'Register',
                                    action: "sioRegister",
                                    hidden: "true"
                                }
                                ]
                            }
                            ]

                        }

                        ]
                    }
                    ]
                },


                /**
                * Reset the form to its default state.
                */
                resetForm: function() {
                    this.setMasked(false);
                    var form = this.getForm();
                    form.reset();
                    this.getEmailField().hide();
                    this.getRegisterBtn().hide();
                    this.getLoginBtn().show();
                },


                /**
                * @private
                */
                doAuth: function() {
                    this.setMasked({
                        xtype: 'loadmask',
                        message: 'Authorizing',
                        indicator: true
                    });
                    var form = this.getForm();
                    var auth = form.getValues();
                    this.fireEvent("loginUser", auth);
                },


                /**
                * {Ext.io.Controller} will call this method when login fails.
                */
                showLoginErrors: function() {
                    this.setMasked(false);
                    Ext.Msg.alert('Login Error', 'Invalid username or passsword', Ext.emptyFn);
                },


                /**
                * @private
                */
                doRegister: function() {  
                    this.setMasked(  {
                        xtype: 'loadmask',
                        message: 'Creating Account',
                        indicator: true
                    });
                    var form = this.getForm();
                    var auth = form.getValues();
                    this.fireEvent("registerUser", auth);
                },

                /**
                * @private
                */
                showRegister: function() {
                    var email = this.getEmailField();
                    email.show();
                    this.getRegisterBtn().show();
                    this.getLoginBtn().hide();

                },

                /**
                * {Ext.io.Controller} will call this method when registration fails.
                */
                showRegisterErrors: function(errors) {
                    this.setMasked(false);
                    Ext.Msg.alert('Register Error', 'Could not create user', Ext.emptyFn);
                },


                /**
                * @private
                */
                hideLogin: function(){
                    this.fireEvent("cancel");
                },

                /**
                * @private
                */
                getForm: function(){
                    return this.query('.formpanel')[0];
                },

                /**
                * @private
                */
                getEmailField: function(){
                    return this.query('.emailfield')[0];
                },

                /**
                * @private
                */
                getRegisterBtn: function(){
                    return this.query('button[action=sioRegister]')[0];
                },

                /**
                * @private
                */
                getLoginBtn: function(){
                    return this.query('button[action=siologin]')[0];
                }


            });
        }
        /**
        * Default Facebook login panel.  Ext.io.Controller will automatically display this panel if the application is configured to use Facebook as its login type. 
        *
        */
        if (!Ext.getVersion('extjs')) {
            Ext.define("Ext.io.ux.AuthFacebook", {
                extend: 'Ext.Container',
                requires: ["Ext.TitleBar","Ext.form.Panel", "Ext.form.FieldSet", "Ext.field.Password", "Ext.field.Email"],




                /**
                * @event loginUser
                * Fired when the user has entered their auth credentials.
                * {Ext.io.Controller} listens for this event and will attempt to login 
                * the user with the passed credentials. 
                * @param {Object} auth Key/values given by the user to authenticate with.
                */

                /**
                * @event cancel
                * Fired when the user doesn't want to login.
                * {Ext.io.Controller} listens for this event and will 
                * close the login pannel.
                */


                /**
                * @private
                * config
                */
                config: {
                    id: "loginpanel",
                    fullscreen: true,

                    control: {
                        "button[action=cancellogin]": {
                            tap: "hideLogin"
                        }
                    },
                    items: [
                    {
                        docked: 'top',
                        xtype: 'titlebar',
                        title: 'Login',
                        items: [
                        {
                            text: "cancel",
                            action: "cancellogin"
                        }
                        ]
                    },
                    {
                        xtype: "panel",
                        html: "To use this application please sign in with your Facebook account.",
                        padding: "20%",
                        align: "center"
                    },
                    {
                        xtype: "button",
                        text: "Login with Facebook",
                        disabled: true,
                        width: "80%",
                        action: "fblogin",
                        ui: 'action',
                        margin: "20%",
                        align: "center"
                    }
                    ]
                },

                /**
                * Login button tapped
                */
                loginButtonTapped: function(button) {
                    console.log("argum", arguments);
                    button.setDisabled(true);    
                    this.setMasked({
                        xtype: 'loadmask',
                        message: 'Loading Facebook',
                        indicator: true
                    });
                    document.location.href=this.redirectUrl;
                },


                /**
                * Initialize
                */
                initialize: function() {
                    var fbConf = this.config.group.getData().fb;

                    if(!fbConf) {
                        console.error("Facebook not configured for group.", group);
                        allback.call(scope, false);
                    }


                    var facebookAppId = fbConf.appId;

                    this.redirectUrl = "https://m.facebook.com/dialog/oauth?" + Ext.Object.toQueryString({
                        redirect_uri: window.location.protocol + "//" + window.location.host + window.location.pathname,
                        client_id: facebookAppId,
                        response_type: 'token',
                        bustCache: new Date().getTime()
                    });

                    var button = this.query("button[action=fblogin]")[0];

                    if(button) {
                        button.on({
                            tap:  this.loginButtonTapped,
                            scope: this
                        });
                        button.setDisabled(false)  
                    } else {
                        console.error("Could not find a button[action=fblogin] in the AuthFacebook view.  User won't be able to login.");
                    }

                },


                /**
                * Reset the form to its default state.
                */
                resetForm: function() {
                    //NA
                },


                /**
                * {Ext.io.Controller} will call this method when login fails.
                */
                showLoginErrors: function() {
                    //NA //Ext.Msg.alert('Login Error', 'Invalid username or passsword', Ext.emptyFn);
                },


                /**
                * @private
                */
                hideLogin: function() {
                    this.fireEvent("cancel");
                }


            });
        }
        /**
        * @class Ext.io.Controller

        Application controller for Sencha.io.  This controller when added to an application manages the connection to the Sencha.io servers.
        It provides automatic management of user authentication via a login screen that can be customized to meet your application's needs.

        When declaring an application add Ext.io.Controller to the front of your controller list.

        Ext.application({
        controllers: ['Ext.io.Controller', .... ],

        Then add an io configuration block to your applications config:

        config: {
        io: {
        appId: "PdEEnxvKxCOchL45TcAFg3DARgh",
        appSecret: "NiLuNNNPGYZNuLcK"
        }    
        }


        For a full set of options see {Ext.io.Io.setup}

        Authentication
        ====


        By default Ext.io.Controller will attempt to authenticate the user after it connects to the server. 
        - If the user already has a valid session then the "authorized" event will fire with the user object.  
        - If there is not a valid user session then Controller will create a view using the authenticationView as the type. It will then add the view to the viewport and present the user with a login screen.  
        - If the user can enter a valid username and password then the "authenticated" event will fire and the user will be able to access their data. 
        - If the user chooses to register a new account then the "registered" event will fire. 


        Authentication methods
        ---

        Sencha.io currently supports two login methods: Sencha.io account and Facebook. The application developer chooses the authentication for the application
        when configuring the user group of the application. If the Sencha.io account is activated then a default login dialog is presented that allows the user 
        to either login or create a new account.  If Facebook is chosen an the correct Facebook keys are provided then Ext.io.Controller will handle the 
        Facebook authorization sequence.  It will automatically load the Facebook javascript library.



        Authentication on startup
        ---

        If you don't want to attempt to authenticate then you can add an optional flag to the io config of your application:

        config: {
        io: {
        appId: "PdEEnxvKxCOchL45TcAFg3DARgh",
        appSecret: "NiLuNNNPGYZNuLcK",
        authOnStartup: false
        }    
        }

        Manual Login
        ---

        If you don't want to automatically trigger the login panel when your application starts then set manualLogin to true:

        config: {
        io: {
        appId: "PdEEnxvKxCOchL45TcAFg3DARgh",
        appSecret: "NiLuNNNPGYZNuLcK",
        manualLogin: true
        }    
        }

        Later when you are ready to login to the application:

        yourapplication.sio.login();


        setting `manualLogin` to `false` and `authOnStartup` to `true` will let your users who are already authenticated gain access to registered user only features, while not forcing everyone to authenticate before using any feature of the application.


        Logout
        ====

        The application should listen for the logout event fired by the controller.  Upon receiving the logout event the application should clear any local data that it has stored for the user.  This includes clearing the local content of any created syncstores:

        onLogout: function() {
        var store = Ext.getStore('yourstoreId');
        store.getProxy().clear();
        store.load();
        return true;
        },


        Other Controllers
        ====

        For ease of use a reference to this controller is added to the your application. You can reference it from any other controller in your application easily:

        this.getApplication().sio

        Your application's controllers who need access to io's events can add this code to their controller


        init: function() {
        this.getApplication().sio.on({
        authorized: {fn: this.onAuth, scope: this},
        logout: {fn: this.onLogout, scope: this}
        });      
        },

        With this code on init your controller will listen for the authorized and logout events and execute the onAuth and onLogout of your controller respectively. 




        *
        *
        *
        */
        Ext.define('Ext.io.Controller', {

            extend: 'Ext.app.Controller',

            requires: [
            'Ext.io.Io',
            'Ext.io.User',
            "Ext.io.ux.Authenticate",
            "Ext.io.ux.AuthFacebook"
            ],

            /**
            * @event initComplete
            * Fired when .io has made a connection to the sencha.io servers.
            */

            /**
            * @event checkingAuth
            * Fired when {Ext.io.Controller} is attmpeting to authorize the user.
            * either using an existing session or via explicit login
            * @param {Ext.io.User} user The authenticated user.
            */

            /**
            * @event authorized
            * Fired when the user of this application has successfully authenticated
            * either using an existing session or via explicit login
            * @param {Ext.io.User} user The authenticated user.
            */

            /**
            * @event usermessage
            * Fired when the user receives a message.
            * @param {Ext.io.User} sender The user who sent the message
            * @param {Object} the message sent.
            */

            /**
            * @event registered
            * Fired when the user had registered a new account. and is successfully authorized 
            * @param {Ext.io.User} user The authenticated user.
            */

            /**
            *@event nouser
            * Fired when there isn't a valid session after an auth attempt but before the user
            * is presneted with a login screen.
            */


            /**
            *@event logout
            * Fired when the user removes their session after logout is complete.
            */

            config: {

                /**
                * @cfg {String} authenticationView
                * Name of the view to display when authenticating the user. 
                * To provide a custom auth screen see {Ext.io.ux.Authenticate} for required interface.
                * @accessor
                */
                authenticationView: "Ext.io.ux.Authenticate",


                control: {
                    authButton: {
                        tap: "authButtonTap"
                    }

                },

                refs: {
                    authButton: ".sioAuthButton"
                }
            },


            /**
            * @private
            *
            */
            init: function() {

                var conf = this.getApplication().config.io;

                //TODO cleanup with a proper mixin/library function
                conf.authOnStartup = conf.authOnStartup == undefined ? true: conf.authOnStartup;
                conf.manualLogin = conf.manualLogin == undefined ? false: conf.manualLogin;

                //        console.log("IO.init", this, conf);
                var io = this;
                /*
                * add a getter for IO to the application for easy access. 
                */
                this.getApplication().sio = io;

                Ext.Io.setup(conf);

                this.on({
                    checkingAuth: this.updateButtonDisable,
                    authorized: this.updateButtonLogin,
                    registered: this.updateButtonLogin,
                    nouser: this.updateButtonLogout,
                    logout: this.updateButtonLogout,
                    scope: this
                });

                Ext.Io.init(function() {
                    //console.log('launch.authOnStartup', conf.authOnStartup, conf.manualLogin);
                    if (conf.authOnStartup) {
                        io.auth();
                    }

                    io.fireEvent("initComplete");


                });


            },


            /**
            * @private
            * updateButtonDisable
            */
            updateButtonDisable: function() {
                var btn = this.getAuthButton();
                if(btn) {
                    this.getAuthButton().setDisabled(true);
                    this.getAuthButton().setText("---");
                }
                return true;
            },

            /**
            * @private
            * updateButtonLogin
            */
            updateButtonLogin: function() {
                var btn = this.getAuthButton();
                if(btn) {
                    this.getAuthButton().setDisabled(false);
                    this.getAuthButton().setText("Logout");
                }
                return true;
            },


            /**
            * @private
            * updateButtonLogout
            */
            updateButtonLogout: function() {
                var btn = this.getAuthButton();
                if(btn) {
                    this.getAuthButton().setDisabled(false);
                    this.getAuthButton().setText("Login");
                }
                return true;
            },

            /**
            * @private
            * authButtonTap
            */
            authButtonTap: function() {
                this.getUser(function(user,errors) {
                    if (user) {
                        this.logout();
                    } else {
                        this.login();
                    }
                });
            },

            /**
            * @private
            */
            launch: function() {


            },


            /**
            * @private
            */
            auth: function() {
                this.login(!this.getApplication().config.io.manualLogin);
            },

            /**
            * Authenticate the user to the application. 
            *  The user must be a memeber of the application's group.
            *
            * @param {Boolean} showLoginIfNoAuth
            */
            login: function(showLoginIfNoAuth) {

                if (Ext.cf.util.ParamValidator.validateApi([
                {
                    name: "showLoginIfNoAuth",
                    type: "boolean",
                    optional: true
                }
                ], arguments, "Ext.io.Controller", "login")) {
                    this.checkAuth(showLoginIfNoAuth);
                }

            },

            /**
            * @private
            *  checkAuth gets the group's auth method.  IF one exits then it will call
            *  the 3rd party auth first to see if the user is authenticated.  If not 
            *  then show the login.
            *
            *  If we are using the default auth method (sencha.io login) then we can directly
            *  show the login dialog. 
            *
            *  In either case if showLoginIfNoAuth is set to false then we will do auth only.
            *
            * @param {Boolean} showLoginIfNoAuth
            */
            checkAuth: function(showLoginIfNoAuth) {
                this.fireEvent("checkingAuth");


                this.getGroup(function(group) {
                    if (!group) {
                        console.error("Cannot login, application does not have a group.");
                        return;
                    }
                    this.group = group;
                    var method = group.getAuthMethod();

                    var authMethod = this.authMethods[method];
                    this.authMethod = authMethod;

                    //console.log("authMethod", this.authMethod);


                    this.getUser(function(user) {
                        //console.log("authMethod.getUser", sioIsAuth, user);
                        if (authMethod) {
                            this.setAuthenticationView(authMethod.defaultLoginView);
                        }

                        var afterAuthCheck = function(isAuth, auth) {
                            //console.log("authMethod.checkAuth", isAuth, auth, sioIsAuth, user);
                            if (isAuth && user) {
                                //User is both authorized by io and by the external.
                                // user is authorized to use the app.
                                this.onAuth(user);
                            } else if (isAuth && auth) {
                                //User is authneticated with extneral but not with io
                                // attempt to auth after fetching extenal account details.
                                this.authMethod.onAuth(auth, this.onLoginUser, this);
                            } else {
                                this.fireEvent("nouser");
                                //No user or external user so we must login.
                                if (showLoginIfNoAuth !== false) {
                                    this.showLogin();
                                }
                            }

                        };

                        var afterInit = function() {
                            this.authMethod.checkAuth(this.group, afterAuthCheck, this);
                        };

                        if (authMethod) {
                            authMethod.init(afterInit, this)
                        } else if (user) {
                            //we have a user an no external auth so we are done.
                            this.onAuth(user);
                        } else {
                            //No user so we must login.
                            this.fireEvent("nouser");
                            if (showLoginIfNoAuth !== false) {
                                this.showLogin();
                            }
                        }

                    });


                });

            },

            /**
            * @private
            *
            * @param {Object} user object
            */
            onAuth: function(user) {
                this.user = user;

                //listend to user message events, and refire them
                // on the controller. 
                user.on("message", function(sender, message) {
                    var userId = sender.getUserId();
                    this.fireEvent("usermessage", sender, message);
                }, this);

                this.hideLogin();
                this.fireEvent("authorized", user);
            },

            /**
            *@private
            *
            * @param {Boolean} noReset
            */
            showLogin: function(noReset) {
                if (!this.loginPanel) {
                    this.createLogin();
                } else {
                    if(noReset !== true){
                        this.loginPanel.resetForm();  
                    }
                }
                this.previousActiveItem = Ext.Viewport.getActiveItem();
                Ext.Viewport.setActiveItem(this.loginPanel);
            },


            /**
            *@private
            */
            createLogin: function() {
                if (!this.loginPanel) {
                    this.loginPanel = Ext.create(this.getAuthenticationView(), {
                        group: this.group
                    });
                    this.loginPanel.on({
                        loginUser: this.onLoginUser,
                        cancel: this.hideLogin,
                        registerUser: this.registerUser,
                        scope: this
                    });
                    Ext.Viewport.add(this.loginPanel);
                } 
            },


            /**
            * @private
            *
            * @param {Object} auth
            */
            onLoginUser: function(auth) {
                Ext.io.User.authenticate(
                auth,
                function(user,errors) {
                    if (user) {
                        this.onAuth(user);
                    } else {
                        this.showLogin(true); //make sure the login exists before we attempt to show errors.
                        //edge case that hopefuly won't happen in production 
                        this.loginPanel.showLoginErrors();
                    }
                },
                this);
            },


            /**
            * @private
            *
            * @param {Object} reg object
            */
            registerUser: function(reg) {
                if (reg.username.length > 0 && reg.password.length > 0 && reg.email.length > 0) {
                    Ext.io.User.register({
                        username: reg.username,
                        password: reg.password,
                        email: reg.email
                    },
                    function(user, error) {
                        if (user) {
                            this.hideLogin();
                            this.fireEvent("registered", user);
                            this.onAuth(user);
                        } else {
                            this.loginPanel.showRegisterErrors(error);
                        }
                    },
                    this
                    );

                } else {
                    this.loginPanel.showRegisterErrors({error: "missing fields"});
                }

            },

            /**
            * @private
            */
            hideLogin: function() {
                if (this.previousActiveItem) {
                    Ext.Viewport.setActiveItem(this.previousActiveItem);
                    delete this.previousActiveItem;
                }
            },


            /**
            * Removes all local data about the user and disconnects from the io servers if connected.
            */
            logout: function() {
                this.getUser(function(user) {
                    if (user) {
                        user.logout();
                        this.logoutExternal();
                    }
                    this.fireEvent("logout");
                });
            },


            /**
            *@private
            */
            logoutExternal: function() {
                if (this.authMethod && this.authMethod.logout) {
                    this.authMethod.logout();
                }

            },

            /**
            * Get a reference to the current user.
            * @private  
            * @param {Function} callback The function to be called after execution.
            * The callback is passed the following parameters:
            * @param {Boolean} callback.isAuth true if there is a valid user session
            * @param {Object}  callback.user the current user.
            * @param {Object} scope scope to execute callback in.  Defaults to the controller's scope.
            */
            getUser: function(callback, scope) {
                if (!callback) {
                    return;
                }
                scope = scope || this;
                callback = callback || Ext.emptyFn;

                Ext.io.User.getCurrent(function(user, errors) {callback.call(scope, user, errors);});

            },


            /**
            * @private
            * Get a reference to the application's group
            * @param {Function} callback The function to be called after execution.
            * @param {Object} scope scope to execute callback in.  Defaults to the controller's scope.
            */
            getGroup: function(callback, scope) {
                if (!callback) {
                    return;
                }
                scope = scope || this;
                callback = callback || Ext.emptyFn;

                Ext.io.Group.getCurrent(
                function(group, errors) {
                    callback.call(scope,  group, errors);
                }
                );

            },

            /**
            * @private
            * Are we connected to the IO servers?
            */
            isConected: function() {
                //console.log("IO.isConected");
                return true;
            },


            /*
            * @private
            *  authMethods is the glue code for each of the 
            *  3rd party auth services.  This should be factored out
            *  of Controller at some point. 
            */
            authMethods: {

                facebook: {

                    defaultLoginView: "Ext.io.ux.AuthFacebook",

                    initComplete: false,

                    /**
                    * @private
                    * Called once per application load. Bootstraps the FB js code, required dom and events.
                    *  Executes callback in scope when init is finalized. 
                    * @param {Function} callback The function to be called after execution.
                    * @param {Object} scope scope to execute callback in.  Defaults to the controller's scope.
                    */
                    init: function(callback, scope) {

                        //console.log("fb init", this.initComplete);
                        var cb = Ext.bind(callback, scope);
                        if (this.initComplete) {
                            cb();
                        }

                        Ext.DomHelper.insertBefore(document.body.firstChild, '<div id="fb-root" style="display: none;"></div>')

                        window.fbAsyncInit = Ext.bind(function() {
                            this.initComplete = true;
                            cb();
                        },
                        this);

                        (function(d) {
                            var js,
                                id = 'facebook-jssdk';
                            if (d.getElementById(id)) {
                                return;
                            }
                            js = d.createElement('script');
                            js.id = id;
                            js.async = true;
                            js.src = "//connect.facebook.net/en_US/all.js";
                            d.getElementsByTagName('head')[0].appendChild(js);
                        } (document));                                                                              


                    },


                    checkAuth: function(group, callback, scope) {
                        var fbConf = group.getData().fb;

                        if(!fbConf) {
                            console.error("Facebook not configured for group.", group);
                            allback.call(scope, false);
                        }

                        FB.init({
                            appId: fbConf.appId,
                            cookie: true
                        });

                        //  FB.Event.subscribe('auth.logout', Ext.bind(me.onLogout, me));
                        //console.log("onFacebookInit two");
                        FB.getLoginStatus(function(response) {
                            //console.log("getLoginStatus", arguments);
                            clearTimeout(fbLoginTimeout);
                            callback.call(scope, response.status == 'connected', response);
                        });

                        var fbLoginTimeout = setTimeout(function() {

                            Ext.Viewport.setMasked(false);

                            Ext.create('Ext.MessageBox', {
                                title: 'Facebook Error',
                                message: [
                                'Facebook Authentication is not responding. ',
                                'Please check your Facebook app is correctly configured, ',
                                'then check the network log for calls to Facebook for more information.',
                                'Restart the app to try again.'
                                ].join('')
                            }).show();

                        },
                        10000); 

                    },


                    onAuth: function(auth, callback, scope) {
                        var me = this,
                            errTitle;

                        FB.api('/me',
                        function(response) {

                            //console.log("/me", arguments);
                            if (response.error) {
                                FB.logout();

                                errTitle = "Facebook " + response.error.type + " error";
                                Ext.Msg.alert(errTitle, response.error.message,
                                function() {
                                    me.login();
                                });
                            } else {
                                //console.log("onLogin", auth.authResponse, auth, response);
                                var authuser = {
                                    username: response.username,
                                    email: response.email || (response.username + "@facebook.com"),
                                    // remove this onece server validation rules are pushed.
                                    id: response.id,
                                    name: response.name,
                                    auth: {
                                        access_token: auth.authResponse.accessToken
                                    },
                                    info: {
                                        profilelink: response.link,
                                        locale: response.locale
                                    }
                                }
                                //console.log("authuser", authuser);
                                callback.call(scope, authuser);
                            }
                        });
                    },

                    logout: function(callback, scope) {
                        if (FB) {
                            FB.logout();
                        } else {
                            console.error("facebook javascript library not included in page. Could not logout user.");
                        }

                    }
                }

            }

        });



