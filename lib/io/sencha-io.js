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
Ext.define("Ext.cf.Overrides",{requires:["Ext.data.Store"]},function(){var d=function(){Ext.data.Store.prototype.storeSync=Ext.data.Store.prototype.sync;Ext.data.Store.override({sync:function(j,i){if(typeof(this.getProxy().sync)==="undefined"){return this.storeSync()}else{return this.getProxy().sync(this,j,i)}}});Ext.io_define=function(i,j){return Ext.define(i,j)}};var g=function(){Ext.io_Observable="Ext.util.Observable";Ext.data.Store.prototype.storeSync=Ext.data.AbstractStore.prototype.sync;Ext.data.Store.override({sync:function(j,i){if(typeof(this.getProxy().sync)==="undefined"){return this.storeSync()}else{return this.getProxy().sync(this,j,i)}}});Ext.io_define=function(i,j){if(j.extend==="Ext.data.Model"&&j.config.identifier==="uuid"){delete j.config.identifier;delete j.requires}Ext.apply(j,j.config);delete j.config;return Ext.define(i,j)};Ext.data.Model.getFields=function(){return this.prototype.fields};Ext.data.Field.override({getName:function(){return this.name},getEncode:function(){return this.encode},getDecode:function(){return this.decode},getType:function(){return this.type}});Ext.data.Operation.override({setResultSet:function(i){this.resultSet=i}});Ext.data.ResultSet.override({getRecords:function(i){return this.records}})};var a="ERROR: The Sencha.io SDK requires either the Sencha Touch SDK or the Sencha Ext JS SDK.";if(typeof Ext==="undefined"){console.log(a);throw a}else{var f=Ext.getVersion("core"),e;if(!f){e=a+" Ext is defined, but getVersion('core') did not return the expected version information.";console.log(e);throw e}else{var c=f.version;var h=Ext.getVersion("touch");var b=Ext.getVersion("extjs");if(h&&b){e="WARNING: Both the Sencha Touch SDK and the Sencha Ext JS SDK have been loaded. This could lead to unpredicatable behaviour.";console.log(e)}if(!h&&!b){e=a+" The Ext Core SDK is on its own is not sufficient.";console.log(e);throw e}if(b){c=b.version;if(c==="4.1.0"){console.log("WARNING: Disabling Sencha.io data stores, since we seem to be running the ExtJS SDK, version",b.version);g()}else{e=a+" Version "+c+" of the Sencha Ext SDK and this version of the Sencha.io SDK are not fully compatible.";console.log(e);throw e}}else{if(h){if(h.major>=2){d()}else{var e=a+" Version "+c+" of the Sencha Touch SDK and this version of the Sencha.io SDK are not fully compatible.";console.log(e)}}else{e=a+" They were here, but now I can't find them.";console.log(e);throw e}}}}});Ext.define("Ext.io.Errors",{statics:{NETWORK_ERROR:{code:"NETWORK_ERROR",message:"The request could not be made due to the network being down",suggest:"Check network connectivity from your device"},UNKNOWN_ERROR:{code:"UNKNOWN_ERROR",message:"Unknown error",kind:"sio",suggest:"Contact sencha.io support with a description of what caused the error"},UNKNOWN_RPC_ERROR:{code:"UNKNOWN_RPC_ERROR",message:"Unknown RPC error",kind:"sio",suggest:"Fix the RPC service to return a valid error object"},PARAM_MISSING:{code:"PARAM_MISSING",message:"Mandatory parameter ':name' is missing",kind:"developer",suggest:"Provide the required parameter during the method call"},PARAMS_LENGTH_MISMATCH:{code:"PARAMS_LENGTH_MISMATCH",message:"The method was passed :actual params instead of the expected :expected",kind:"developer",suggest:"Check the number of parameters you are passing to the method"},PARAM_TYPE_MISMATCH:{code:"PARAM_TYPE_MISMATCH",message:"Parameter ':name' data type mismatch. Expected ':expected', actual ':actual'",kind:"developer",suggest:"Correct the data type of the parameter"},RPC_PARAM_FUNCTION_ERROR:{code:"RPC_PARAM_FUNCTION_ERROR",message:"Parameter number :index (:name) is a function, but only the first parameter must be a function",kind:"developer",suggest:"Ensure that only the first parameter is a function"},RPC_TIMEOUT:{code:"RPC_TIMEOUT",message:"RPC request has timed out as there was no reply from the server",kind:"developer",suggest:"Check if this was caused by network connectivity issues. If not, the service might be down. Also, see documentation for Ext.Io.setup (rpcTimeoutDuration, rpcTimeoutCheckInterval) to configure the timeout check"},AUTH_REQUIRED:{code:"AUTH_REQUIRED",message:"This request requires an authenticated :kind session",kind:"developer",suggest:"Retry the request with a valid session"},CHANNEL_NAME_MISSING:{code:"CHANNEL_NAME_MISSING",message:"Channel name is missing",kind:"developer",suggest:"Provide the channel name"},CHANNEL_APP_ID_MISSING:{code:"CHANNEL_APP_ID_MISSING",message:"Channel appId is missing",kind:"sio",suggest:"Potential bug in the SIO SDK, attempting to get a channel without an appId"},SERVICE_NAME_MISSING:{code:"SERVICE_NAME_MISSING",message:"Service name is missing",kind:"developer",suggest:"Provide the service name"},SERVICE_DESCRIPTOR_LOAD_ERROR:{code:"SERVICE_DESCRIPTOR_LOAD_ERROR",message:"Error loading service descriptor from the server",kind:"developer",suggest:"Service name is most likely misspelt. If not, contact sencha.io support"},MESSAGE_NOT_JSON:{code:"MESSAGE_NOT_JSON",message:"message is not a JSON object",kind:"developer",suggest:"Use a valid JSON object instead of basic data types"}}});Ext.define("Ext.io.Sender",{config:{userId:null,deviceId:null},constructor:function(a){this.initConfig(a)},getUser:function(c,b){if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments,"Ext.io.Sender","getUser")){var a=this.getUserId();if(!a){c.call(b,null)}else{Ext.io.User.get({id:a},c,b)}}},getDevice:function(c,a){if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments,"Ext.io.Sender","getDevice")){var b=this.getDeviceId();if(!b){c.call(a,null)}else{Ext.io.Device.get({id:b},c,a)}}},});Ext.define("Ext.cf.util.Md5",{statics:{hash:function(p,n,m,i){n=n||false;m=m||false;i=i||8;function g(q,t){var s=(q&65535)+(t&65535);var r=(q>>16)+(t>>16)+(s>>16);return(r<<16)|(s&65535)}function l(q,r){return(q<<r)|(q>>>(32-r))}function c(z,v,u,r,y,w){return g(l(g(g(v,z),g(r,w)),y),u)}function h(u,r,z,y,q,w,v){return c((r&z)|((~r)&y),u,r,q,w,v)}function b(u,r,z,y,q,w,v){return c((r&y)|(z&(~y)),u,r,q,w,v)}function j(u,r,z,y,q,w,v){return c(r^z^y,u,r,q,w,v)}function f(u,r,z,y,q,w,v){return c(z^(r|(~y)),u,r,q,w,v)}function e(B,v){B[v>>5]|=128<<((v)%32);B[(((v+64)>>>9)<<4)+14]=v;var A=1732584193;var z=-271733879;var y=-1732584194;var w=271733878;for(var s=0;s<B.length;s+=16){var u=A;var t=z;var r=y;var q=w;A=h(A,z,y,w,B[s+0],7,-680876936);w=h(w,A,z,y,B[s+1],12,-389564586);y=h(y,w,A,z,B[s+2],17,606105819);z=h(z,y,w,A,B[s+3],22,-1044525330);A=h(A,z,y,w,B[s+4],7,-176418897);w=h(w,A,z,y,B[s+5],12,1200080426);y=h(y,w,A,z,B[s+6],17,-1473231341);z=h(z,y,w,A,B[s+7],22,-45705983);A=h(A,z,y,w,B[s+8],7,1770035416);w=h(w,A,z,y,B[s+9],12,-1958414417);y=h(y,w,A,z,B[s+10],17,-42063);z=h(z,y,w,A,B[s+11],22,-1990404162);A=h(A,z,y,w,B[s+12],7,1804603682);w=h(w,A,z,y,B[s+13],12,-40341101);y=h(y,w,A,z,B[s+14],17,-1502002290);z=h(z,y,w,A,B[s+15],22,1236535329);A=b(A,z,y,w,B[s+1],5,-165796510);w=b(w,A,z,y,B[s+6],9,-1069501632);y=b(y,w,A,z,B[s+11],14,643717713);z=b(z,y,w,A,B[s+0],20,-373897302);A=b(A,z,y,w,B[s+5],5,-701558691);w=b(w,A,z,y,B[s+10],9,38016083);y=b(y,w,A,z,B[s+15],14,-660478335);z=b(z,y,w,A,B[s+4],20,-405537848);A=b(A,z,y,w,B[s+9],5,568446438);w=b(w,A,z,y,B[s+14],9,-1019803690);y=b(y,w,A,z,B[s+3],14,-187363961);z=b(z,y,w,A,B[s+8],20,1163531501);A=b(A,z,y,w,B[s+13],5,-1444681467);w=b(w,A,z,y,B[s+2],9,-51403784);y=b(y,w,A,z,B[s+7],14,1735328473);z=b(z,y,w,A,B[s+12],20,-1926607734);A=j(A,z,y,w,B[s+5],4,-378558);w=j(w,A,z,y,B[s+8],11,-2022574463);y=j(y,w,A,z,B[s+11],16,1839030562);z=j(z,y,w,A,B[s+14],23,-35309556);A=j(A,z,y,w,B[s+1],4,-1530992060);w=j(w,A,z,y,B[s+4],11,1272893353);y=j(y,w,A,z,B[s+7],16,-155497632);z=j(z,y,w,A,B[s+10],23,-1094730640);A=j(A,z,y,w,B[s+13],4,681279174);w=j(w,A,z,y,B[s+0],11,-358537222);y=j(y,w,A,z,B[s+3],16,-722521979);z=j(z,y,w,A,B[s+6],23,76029189);A=j(A,z,y,w,B[s+9],4,-640364487);w=j(w,A,z,y,B[s+12],11,-421815835);y=j(y,w,A,z,B[s+15],16,530742520);z=j(z,y,w,A,B[s+2],23,-995338651);A=f(A,z,y,w,B[s+0],6,-198630844);w=f(w,A,z,y,B[s+7],10,1126891415);y=f(y,w,A,z,B[s+14],15,-1416354905);z=f(z,y,w,A,B[s+5],21,-57434055);A=f(A,z,y,w,B[s+12],6,1700485571);w=f(w,A,z,y,B[s+3],10,-1894986606);y=f(y,w,A,z,B[s+10],15,-1051523);z=f(z,y,w,A,B[s+1],21,-2054922799);A=f(A,z,y,w,B[s+8],6,1873313359);w=f(w,A,z,y,B[s+15],10,-30611744);y=f(y,w,A,z,B[s+6],15,-1560198380);z=f(z,y,w,A,B[s+13],21,1309151649);A=f(A,z,y,w,B[s+4],6,-145523070);w=f(w,A,z,y,B[s+11],10,-1120210379);y=f(y,w,A,z,B[s+2],15,718787259);z=f(z,y,w,A,B[s+9],21,-343485551);A=g(A,u);z=g(z,t);y=g(y,r);w=g(w,q)}return[A,z,y,w]}function a(t){var s=[];var q=(1<<i)-1;for(var r=0;r<t.length*i;r+=i){s[r>>5]|=(t.charCodeAt(r/i)&q)<<(r%32)}return s}function d(s){var t="";var q=(1<<i)-1;for(var r=0;r<s.length*32;r+=i){t+=String.fromCharCode((s[r>>5]>>>(r%32))&q)}return t}function o(s){var r=m?"0123456789ABCDEF":"0123456789abcdef";var t="";for(var q=0;q<s.length*4;q++){t+=r.charAt((s[q>>2]>>((q%4)*8+4))&15)+r.charAt((s[q>>2]>>((q%4)*8))&15)}return t}return(n?d(e(a(p),p.length*i)):o(e(a(p),p.length*i)))}}});Ext.define("Ext.cf.util.LoggerConstants",{statics:{NONE:10,ERROR:5,WARNING:4,INFO:3,DEBUG:2,PERF:1,STR_TO_LEVEL:{perf:1,debug:2,info:3,warn:4,error:5,none:10}}});Ext.define("Ext.cf.util.Logger",{statics:{level:Ext.cf.util.LoggerConstants.ERROR,setLevel:function(a){if(Ext.cf.util.LoggerConstants.STR_TO_LEVEL[a]){Ext.cf.util.Logger.level=Ext.cf.util.LoggerConstants.STR_TO_LEVEL[a]}else{Ext.cf.util.Logger.level=Ext.cf.util.LoggerConstants.NONE}},perf:function(){if(Ext.cf.util.Logger.level<=Ext.cf.util.LoggerConstants.PERF){Ext.cf.util.Logger.message("PERF:",arguments)}},debug:function(){if(Ext.cf.util.Logger.level<=Ext.cf.util.LoggerConstants.DEBUG){Ext.cf.util.Logger.message("DEBUG:",arguments)}},info:function(){if(Ext.cf.util.Logger.level<=Ext.cf.util.LoggerConstants.INFO){Ext.cf.util.Logger.message("INFO:",arguments)}},warn:function(){if(Ext.cf.util.Logger.level<=Ext.cf.util.LoggerConstants.WARNING){Ext.cf.util.Logger.message("WARNING:",arguments)}},error:function(){if(Ext.cf.util.Logger.level<=Ext.cf.util.LoggerConstants.ERROR){Ext.cf.util.Logger.message("ERROR:",arguments)}},trace:function(b,h){var d=[];var a=h.length;for(var c=0;c<a;c++){var g=h[c];if(g==global){d.push("global")}else{if(g==Ext.io.Io){d.push("Ext.io.Io")}else{if(typeof g==="function"){d.push("function")}else{try{d.push(JSON.stringify(g))}catch(f){d.push("unknown")}}}}}this.debug("TRACE",b,"(",d.join(", "),")")},message:function(e,d){var c=Array.prototype.slice.call(d);c.unshift(e);if(typeof console!="undefined"){switch(typeof console.log){case"function":console.log.apply(console,c);break;case"object":console.log(c.join(" "));break}}}}});Ext.define("Ext.cf.util.ErrorHelper",{requires:["Ext.cf.util.Logger","Ext.io.Errors"],statics:{isValidError:function(a){if(typeof(a)==="object"&&a!==null&&typeof(a.code)==="string"&&typeof(a.message)==="string"){return true}return false},get:function(c,a,d){var b=Ext.clone(Ext.io.Errors[c]?Ext.io.Errors[c]:Ext.io.Errors.UNKNOWN_ERROR);if(a){b.details=a}for(key in d){if(d.hasOwnProperty(key)){b.message=b.message.replace(":"+key,d[key])}}return b},getUnknownError:function(b){var a=this.get("UNKNOWN_ERROR");a.details=b;return a},decode:function(a){if(a===null||a==="null"||a===""){return null}if(this.isValidError(a)){return a}try{a=Ext.decode(a);if(this.isValidError(a)){return a}else{Ext.cf.util.Logger.debug("Could not decode error:",a);return this.getUnknownError(a)}}catch(b){Ext.cf.util.Logger.debug("Could not decode error:",a);return this.getUnknownError(a)}}}});Ext.define("Ext.cf.util.ParamValidator",{requires:["Ext.cf.util.ErrorHelper","Ext.cf.util.Logger"],statics:{getType:function(a){var b=typeof(a);if(b!=="object"){return b}else{if(a===null){return"null"}if(Object.prototype.toString.call(a)==="[object Array]"){return"array"}return"object"}},validateParam:function(c,j,n,h,g){var p=this.getType(j);if(h&&(p==="function"&&n!==0)){return Ext.cf.util.ErrorHelper.get("RPC_PARAM_FUNCTION_ERROR",null,{name:c.name,index:n+1})}else{var m=c.type.split("|");var b=false;for(var f=0;f<m.length;f++){if((m[f]===p)||(c.optional&&p==="undefined")){b=true;break}}if(!b){return Ext.cf.util.ErrorHelper.get("PARAM_TYPE_MISMATCH",null,{name:(g?(g+"."):"")+c.name,expected:c.type,actual:p})}if(p==="object"&&c.hasOwnProperty("keys")){for(var e=0;e<c.keys.length;e++){var a=c.keys[e];var l=j[a.name];var o=this.getType(l);if(o==="undefined"&&!a.optional){return Ext.cf.util.ErrorHelper.get("PARAM_MISSING",null,{name:(g?(g+"."):"")+c.name+"."+a.name})}var d=this.validateParam(a,l,e,false,(g?(g+"."):"")+c.name);if(d){return d}}}}return null},getMandatoryParamsLength:function(c){var b=0;for(var a=0;a<c.length;a++){if(!c[a].optional){b++}}return b},validateParams:function(f,c,b){if(f.length!==c.length){var d=this.getMandatoryParamsLength(f);if(c.length<=f.length&&c.length>=d){}else{return Ext.cf.util.ErrorHelper.get("PARAMS_LENGTH_MISMATCH",null,{expected:f.length,actual:c.length})}}var a,e;for(a=0;a<f.length;a++){e=this.validateParam(f[a],c[a],a,b);if(e){return e}}return null},getApiSignature:function(d,b,e){var a=d+"#"+b+"(";for(var c=0;c<e.length;c++){a+=e[c].name;if(c!==e.length-1){a+=", "}}a+=")";return a},validateApi:function(f,b,c,a){var d=this.validateParams(f,b,false);if(d){var e=d.code+" "+d.message;if(c&&a){e+=". Expected signature "+this.getApiSignature(c,a,f);e+=". Also see http://docs.sencha.io/"+Ext.getVersion("sio").toString()+"/index.html#!/api/"+c+"-method-"+a}Ext.cf.util.Logger.error(e,d);throw e}return true},validateCallbackScope:function(b,c,a){return Ext.cf.util.ParamValidator.validateApi([{name:"callback",type:"function"},{name:"scope",type:"null|object|function",optional:true}],b,c,a)},validateOptionsCallbackScope:function(e,c,d,a){var b={name:"options",type:"object"};if(e){b.keys=e}return Ext.cf.util.ParamValidator.validateApi([b,{name:"callback",type:"function"},{name:"scope",type:"null|object|function",optional:true}],c,d,a)}}});Ext.define("Ext.cf.util.UuidGenerator",{statics:{generate:function(){return"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g,function(d){var b=Math.random()*16|0,a=d=="x"?b:(b&3|8);return a.toString(16)})}}});Ext.define("Ext.cf.ds.RealClock",{constructor:function(){this.epoch=new Date(2011,0,1)},now:function(){return this.ms_to_s(new Date().getTime()-this.epoch)},ms_to_s:function(a){return Math.floor(a/1000)}});Ext.define("Ext.cf.ds.CS",{r:0,t:0,s:0,constructor:function(a){this.set(a)},set:function(a){if(typeof a==="string"||a instanceof String){this.from_s(a)}else{if(typeof a==="object"){this.r=a.r||0;this.t=a.t||0;this.s=a.s||0}}},changeReplicaNumber:function(a,b){if(this.r==a){this.r=b;return true}return false},greaterThan:function(a){return this.compare(a)>0},lessThan:function(a){return this.compare(a)<0},equals:function(a){return this.compare(a)===0},compare:function(a){var b=this.t-a.t;if(b===0){b=this.s-a.s;if(b===0){b=this.r-a.r}}return b},cs_regex:/(\d+)-(\d+)-?(\d+)?/,from_s:function(b){var a=b.match(this.cs_regex);if(a&&a.length>0){this.r=parseInt(a[1],10);this.t=parseInt(a[2],10);this.s=a[3]?parseInt(a[3],10):0}else{throw"Error - CS - Bad change stamp '"+b+"'."}return this},asString:function(){return this.r+"-"+this.t+(this.s>0?"-"+this.s:"")}});Ext.define("Ext.cf.ds.LogicalClock",{requires:["Ext.cf.ds.RealClock","Ext.cf.ds.CS"],r:undefined,t:undefined,s:undefined,clock:undefined,local_offset:undefined,global_offset:undefined,constructor:function(a){this.set(a)},set:function(a){if(a){this.clock=a.clock||Ext.create("Ext.cf.ds.RealClock");this.r=a.r;this.t=a.t||this.clock.now();this.s=a.s||-1;this.local_offset=a.local_offset||0;this.global_offset=a.global_offset||0}},setClock:function(a){this.clock=a;this.t=this.clock.now();this.s=-1},generateChangeStamp:function(){var a=this.clock.now();this.update_local_offset(a);this.s+=1;if(this.s>255){this.t=a;this.local_offset+=1;this.s=0}return new Ext.cf.ds.CS({r:this.r,t:this.global_time(),s:this.s})},seenCSV:function(a){return this.seenChangeStamp(a.maxChangeStamp())},seenChangeStamp:function(a){var c=false;if(a){var b=this.clock.now();if(b>this.t){c=this.update_local_offset(b)}c=c||this.update_global_offset(a)}return c},setReplicaNumber:function(b){var a=this.r!==b;this.r=b;return a},update_local_offset:function(d){var c=false;var e=d-this.t;if(e>0){var b=this.global_time();this.t=d;if(e>this.local_offset){this.local_offset=0}else{this.local_offset-=e}var a=this.global_time();if(a>b){this.s=-1}c=true}else{if(e<0){this.t=d;this.local_offset+=-e;c=true}}return c},update_global_offset:function(c){var f=false;var d=new Ext.cf.ds.CS({r:this.r,t:this.global_time(),s:this.s+1});var e=d.t;var h=d.s;var a=c.t;var b=c.s;if(a==e&&b>=h){this.s=b;f=true}else{if(a>e){var g=a-e;if(g>0){this.global_offset+=g;this.s=b;f=true}}}return f},global_time:function(){return this.t+this.local_offset+this.global_offset},as_data:function(){return{r:this.r,t:this.t,s:this.s,local_offset:this.local_offset,global_offset:this.global_offset}}});Ext.define("Ext.cf.ds.CSV",{requires:["Ext.cf.ds.CS"],v:undefined,constructor:function(a){this.v={};if(a===undefined){}else{if(a instanceof Ext.cf.ds.CSV){this.addX(a)}else{this.addX(a.v)}}},get:function(a){if(a instanceof Ext.cf.ds.CS){return this.v[a.r]}else{return this.v[a]}},setCS:function(a){this.v[a.r]=Ext.create("Ext.cf.ds.CS",{r:a.r,t:a.t,s:a.s})},setReplicaNumber:function(a){this.addReplicaNumbers([a])},addReplicaNumbers:function(a){var b=[];if(a instanceof Array){if(a[0] instanceof Ext.cf.ds.CS){b=Ext.Array.map(a,function(c){return this.addX(Ext.create("Ext.cf.ds.CS",{r:a.r}))},this)}else{b=Ext.Array.map(a,function(c){return this.addX(Ext.create("Ext.cf.ds.CS",{r:c}))},this)}}else{if(a instanceof Ext.cf.ds.CSV){b=a.collect(function(c){return this.addX(Ext.create("Ext.cf.ds.CS",{r:c.r}))},this)}}return Ext.Array.contains(b,true)},addX:function(a){var c=false;if(a===undefined){}else{if(a instanceof Ext.cf.ds.CSV){c=this.addCSV(a)}else{if(a instanceof Array){var b=Ext.Array.map(a,this.addX,this);c=Ext.Array.contains(b,true)}else{if(a instanceof Ext.cf.ds.CS){c=this.addCS(a)}else{if(typeof a=="string"||a instanceof String){c=this.addX(Ext.create("Ext.cf.ds.CS",a))}}}}}return c},addCS:function(a){var d=false;if(a!==undefined){var c=a.r;var b=this.v[c];if(!b||a.greaterThan(b)){this.v[c]=Ext.create("Ext.cf.ds.CS",{r:a.r,t:a.t,s:a.s});d=true}}return d},addCSV:function(a){var c=false;if(a!==undefined){var b=a.collect(this.addCS,this);c=Ext.Array.contains(b,true)}return c},setCSV:function(a){a.collect(this.setCS,this)},changeReplicaNumber:function(a,c){var b=this.v[a];var d=false;if(b){b.r=c;delete this.v[a];this.v[c]=b;d=true}return d},isEmpty:function(){for(var a in this.v){return false}return true},maxChangeStamp:function(){if(!this.isEmpty()){var b=Ext.create("Ext.cf.ds.CS");for(var a in this.v){b=(this.v[a].greaterThan(b)?this.v[a]:b)}return b}},minChangeStamp:function(){if(!this.isEmpty()){var b;for(var a in this.v){b=(!b||this.v[a].lessThan(b)?this.v[a]:b)}return b}},intersect:function(a){for(var b in a.v){if(this.v[b]!==undefined){this.v[b]=a.v[b]}}},dominates:function(a){return Ext.Array.some(this.compare(a),function(b){return b>0})},dominated:function(a){var c=[];for(var b in this.v){if(this.v[b]!==undefined&&this.compare(this.v[b])>0){c.push(this.v[b])}}return c},dominant:function(a){var c=[];var f=[];for(var d in this.v){var b=this.v[d];if(b!==undefined){var e=a.compare(b);if(e<0){f.push(b)}else{if(e>0){c.push(b)}}}}return{dominant:f,dominated:c}},equals:function(a){return Ext.Array.every(this.compare(a),function(b){return b===0})},compare:function(a){var d,b;if(a instanceof Ext.cf.ds.CS){d=this.get(a);b=a;return[d?d.compare(b):-1]}else{if(a instanceof Ext.cf.ds.CSV){var e=[];for(var c in this.v){d=this.v[c];if(d instanceof Ext.cf.ds.CS){b=a.get(d);e.push(b?d.compare(b):1)}}return e}else{throw"Error - CSV - compare - Unknown type: "+(typeof a)+": "+a}}return[-1]},encode:function(){return this.collect(function(a){return a.asString()}).join(".")},decode:function(a){if(a){this.addX(a.split("."))}return this},asString:function(a){return"CSV: "+this.collect(function(b){return b.asString()}).join(", ")},as_data:function(){return{v:this.collect(function(a){return a.asString()}),id:"csv"}},collect:function(c,b){var d=[];for(var a in this.v){if(this.v.hasOwnProperty(a)){d.push(c.call(b||this,this.v[a]))}}return d}});Ext.define("Ext.cf.ds.CSI",{map:{},v:[],dirty:false,constructor:function(){this.clear()},clear:function(){this.map={};this.v=[];this.dirty=false},add:function(b,c){var a=this.map[b];if(a){a[c]=true}else{a={};a[c]=true;this.map[b]=a;this.dirty=true}},remove:function(b,c){var a=this.map[b];if(a){delete a[c];this.dirty=true}},oidsFrom:function(c){var e=[];var d=this.keysFrom(c);var a=d.length;for(var b=0;b<a;b++){e=e.concat(this.oToA(this.map[d[b]]))}return e},keysFrom:function(d){var f=[];var e=this.keys();var a=e.length;for(var c=0;c<a;c++){var b=e[c];if(b>=d){f.push(b)}}return f},encode:function(){var b={};for(var a in this.map){if(this.map.hasOwnProperty(a)&&!this.isEmpty(this.map[a])){b[a]=this.oToA(this.map[a])}}return b},decode:function(b){this.clear();for(var d in b){if(b.hasOwnProperty(d)){var a=b[d];for(var c=0;c<a.length;c++){this.add(d,a[c])}}}return this},keys:function(){if(this.dirty){this.v=[];for(var a in this.map){if(this.map.hasOwnProperty(a)&&!this.isEmpty(this.map[a])){this.v.push(a)}}this.dirty=false}return this.v},isEmpty:function(b){for(var a in b){return false}return true},oToA:function(c){var b=[];if(c){for(var a in c){if(c.hasOwnProperty(a)){b.push(a)}}}return b},asString:function(){var b="";for(var a in this.map){if(this.map.hasOwnProperty(a)&&!this.isEmpty(this.map[a])){b=b+a+":"+this.oToA(this.map[a])}b=b+", "}return b}});Ext.define("Ext.cf.ds.CSIV",{requires:["Ext.cf.ds.CSI"],v:{},constructor:function(){this.v={}},oidsFrom:function(a){var b=a.collect(function(d){var c=this.v[d.r];if(c){return c.oidsFrom(d.t)}},this);b=Ext.Array.flatten(b);b=Ext.Array.unique(b);b=Ext.Array.clean(b);return b},add:function(b,c){var a=this.v[b.r];if(a===undefined){a=this.v[b.r]=Ext.create("Ext.cf.ds.CSI")}a.add(b.t,c)},addArray:function(c,f){var b=c.length;for(var d=0;d<b;d++){var e=c[d];if(e){this.add(c[d],f)}}},remove:function(b,c){var a=this.v[b.r];if(a){a.remove(b.t,c)}},removeArray:function(c,f){var b=c.length;for(var d=0;d<b;d++){var e=c[d];if(e){this.remove(c[d],f)}}},encode:function(){var b={};for(var a in this.v){if(this.v.hasOwnProperty(a)){b[a]=this.v[a].encode()}}return{r:b}},decode:function(a){this.v={};if(a){for(var b in a.r){if(a.r.hasOwnProperty(b)){this.v[b]=Ext.create("Ext.cf.ds.CSI").decode(a.r[b])}}}return this},asString:function(){var b="";for(var a in this.v){if(this.v.hasOwnProperty(a)){b=b+a+"=>["+this.v[a].asString()+"], "}}return b}});Ext.define("Ext.cf.ds.ECO",{requires:["Ext.cf.ds.CSV","Ext.cf.ds.CS"],constructor:function(a){a=a||{};this.oid=a.oid;this.data=a.data||{};this.state=a.state||{}},setOid:function(a){this.oid=a},getOid:function(){return this.oid},getState:function(){return this.state},get:function(a){return this.getValue(a)},set:function(f,d,c){var e=this.valueToUpdates(f,d);var a=e.length;for(var b=0;b<a;b++){var g=e[b];this.setValueCS(c,g.n,g.v,c.generateChangeStamp())}},applyUpdate:function(a,b){return this.setValueCS(a,b.p,b.v,b.c)},getUpdates:function(a){var b=[];this.forEachValueCS(function(f,c,e){if(e){var d=a.get(e);if(!d||d.lessThan(e)){b.push({i:this.getOid(),p:f.length==1?f[0]:f,v:c.length==1?c[0]:c,c:e})}}},this);return b},getCSV:function(){var a=Ext.create("Ext.cf.ds.CSV");this.forEachCS(function(b){a.addCS(b)},this);return a},getAllCS:function(){var a=[];this.forEachCS(function(b){a.push(new Ext.cf.ds.CS(b))},this);return a},changeReplicaNumber:function(b,a,d){var e=false;this.forEachCS(function(h){var g=h.changeReplicaNumber(a,d);e=e||g;return h},this);if(this.oid){var f=Ext.create("Ext.cf.ds.CS",this.oid);if(f.changeReplicaNumber(a,d)){var c=f.asString();this.data[b]=c;this.oid=f.asString();e=true}}return e},forEachValueCS:function(j,l,e,a,n,h){e=e||this.data;a=a||this.state;n=n||[];h=h||[];for(var b in a){if(a.hasOwnProperty(b)){var c=a[b];var f=e[b];var d=n.concat(b);var i=this.valueType(f);var g;switch(i){case"object":switch(f){case undefined:g=undefined;break;case null:g=null;break;default:g={};break}break;case"array":g=[[]];break;default:g=f}var m=h.concat(g);switch(this.valueType(c)){case"string":j.call(l,d,m,new Ext.cf.ds.CS(c));break;case"array":switch(i){case"undefined":Ext.cf.util.Logger.warn("ECO.forEachValueCS: There was no data for the state at path",d);Ext.cf.util.Logger.warn("ECO.forEachValueCS: ",Ext.encode(this.data));break;case"object":case"array":j.call(l,d,m,new Ext.cf.ds.CS(c[0]));this.forEachValueCS(j,l,f,c[1],d,m);break;default:j.call(l,d,m,new Ext.cf.ds.CS(c[0]));break}break}}}},forEachValue:function(g,b,c,e){c=c||this.data;e=e||[];var f,a;for(f in c){if(c.hasOwnProperty(f)){a=c[f];if(a!==this.state){var d=e.concat(f);g.call(b,d,a);if(this.isComplexValueType(a)){this.forEachValue(g,b,a,d)}}}}},forEachCS:function(f,c,d){d=d||this.state;for(var a in d){if(d.hasOwnProperty(a)){var e=d[a];var b;switch(this.valueType(e)){case"string":b=f.call(c,Ext.create("Ext.cf.ds.CS",e));if(b){d[a]=b.asString()}break;case"array":b=f.call(c,Ext.create("Ext.cf.ds.CS",e[0]));if(b){d[a][0]=b.asString()}this.forEachCS(f,c,e[1]);break}}}},getValueCS:function(h){var f=this.data;var d=this.state;if(Ext.isArray(h)){var a=h.length;var g=a-1;for(var c=0;c<a;c++){var b=h[c];if(c===g){return{v:f?f[b]:f,c:this.extractCS(d,b)}}else{d=this.extractState(d,b);f=f?f[b]:f}}}else{return{v:f[h],c:this.extractCS(d,h)}}},getValue:function(g){var d=this.data;if(Ext.isArray(g)){var a=g.length;var f=a-1;for(var c=0;c<a;c++){var b=g[c];if(c===f){return d[b]}else{d=d[b]}}}else{return this.data[g]}},setValueCS:function(n,p,a,g){var o=this;var b=function(i,z,y,e,l,C){var B=false;if(l!==undefined){z[e]=l;B=true}if(C!==undefined){var A=o.extractCS(y,e);o.assignCS(y,e,C);i.updateCS(A,C,o.getOid());B=true}return B};var f=false;if(!Ext.isArray(p)){p=[p];a=[a]}var w=this.data;var d=this.state;var q=p.length;var s=q-1;for(var r=0;r<q;r++){var x=p[r];var m=a[r];var v=this.extractCS(d,x);var c=w[x];var u=this.valueType(c);var h=this.valueType(m);var j=((u==="object"&&h==="object")||(u==="array"&&h==="array"));if(v){if(g.greaterThan(v)){if(j){m=undefined}if(b(n,w,d,x,m,g)){f=true}}else{if(j){}else{return f}}}else{if(b(n,w,d,x,m,g)){f=true}}if(r!==s){w=w[x];d=this.extractState(d,x,g)}}return f},getCS:function(g){var d=this.state;if(Ext.isArray(g)){var a=g.length;var f=a-1;for(var c=0;c<a;c++){var b=g[c];if(c===f){return this.extractCS(d,b)}else{d=this.extractState(d,b)}}}else{return this.extractCS(d,g)}},setCS:function(j,n,f){var m=this;var h=function(i,l,e,p){var o=m.extractCS(l,e);m.assignCS(l,e,p);i.updateCS(o,p,m.getOid())};var b=this.state;if(Ext.isArray(n)){var c=n.length;var g=c-1;for(var d=0;d<c;d++){var a=n[d];if(d===g){h(j,b,a,f)}else{b=this.extractState(b,a)}}}else{h(j,b,n,f)}},extractState:function(d,a,c){var e=d[a];var b;switch(this.valueType(e)){case"undefined":b={};d[a]=[c,b];d=b;break;case"string":b={};d[a]=[e,b];d=b;break;case"array":d=e[1];break}return d},extractCS:function(c,a){var b;c=c[a];if(c){switch(this.valueType(c)){case"string":b=new Ext.cf.ds.CS(c);break;case"array":b=new Ext.cf.ds.CS(c[0]);break}}return b},assignCS:function(d,b,c){var e=(c instanceof Ext.cf.ds.CS)?c.asString():c;var a=d[b];if(a){switch(this.valueType(a)){case"string":d[b]=e;break;case"array":a[0]=e;break}}else{d[b]=e}},valueType:function(b){var a=typeof b;if(a==="object"&&(b instanceof Array)){a="array"}return a},isComplexValueType:function(a){return(a!==null&&typeof a==="object")},valueToUpdates:function(a,g){if(this.isComplexValueType(g)){var d;switch(this.valueType(g)){case"object":d={};break;case"array":d=[];break}var h={n:[a],v:[d]};var f=[h];for(var j in g){if(g.hasOwnProperty(j)){var b=this.valueToUpdates(j,g[j]);var c=b.length;for(var e=0;e<c;e++){update=b[e];f=f.concat({n:h.n.concat(update.n),v:h.v.concat(update.v)})}}}return f}else{return[{n:a,v:g}]}}});Ext.define("Ext.cf.naming.LocalStore",{getItem:function(b){var a=window.localStorage;if(a){var c=a.getItem(b);if(c==="null"){return null}else{if(c==="undefined"){return undefined}else{return c}}}},setItem:function(b,c){var a=window.localStorage;if(a){a.setItem(b,c)}},removeItem:function(b){var a=window.localStorage;if(a){a.removeItem(b)}}});Ext.define("Ext.cf.naming.SessionStore",{getItem:function(b){var a=window.sessionStorage;if(a){return a.getItem(b)}},setItem:function(b,c){var a=window.sessionStorage;if(a){a.setItem(b,c)}},removeItem:function(b){var a=window.sessionStorage;if(a){a.removeItem(b)}}});Ext.define("Ext.cf.naming.CookieStore",{hasItem:function(a){return(new RegExp("(?:^|;\\s*)"+escape(a).replace(/[\-\.\+\*]/g,"\\$&")+"\\s*\\=")).test(document.cookie)},getItem:function(a){if(!a||!this.hasItem(a)){return null}return unescape(document.cookie.replace(new RegExp("(?:^|.*;\\s*)"+escape(a).replace(/[\-\.\+\*]/g,"\\$&")+"\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"),"$1"))},setItem:function(b,c){document.cookie=escape(b)+"="+escape(c)+"; path=/;";var a=this.countSubStrings(document.cookie,b);if(a>1){Ext.cf.util.Logger.error("Found",a,"cookies with the name",b)}},countSubStrings:function(b,c){var d=0;var a=0;while(true){a=b.indexOf(c,a);if(a!=-1){d++;a+=c.length}else{break}}return d},removeItem:function(c,b){b=b||window.location.host||"";if(!c||!this.hasItem(c)){return}var a=new Date();a.setDate(a.getDate()-1);document.cookie=escape(c)+"=; expires="+a.toGMTString()+";";document.cookie=escape(c)+"=; expires="+a.toGMTString()+"; path=/;";document.cookie=escape(c)+"=; expires="+a.toGMTString()+"; path=/;domain="+b+";";var d=b.indexOf(".");if(d!=-1){b=b.substr(d);document.cookie=escape(c)+"=; expires="+a.toGMTString()+"; domain="+b+";";document.cookie=escape(c)+"=; expires="+a.toGMTString()+"; path=/;domain="+b+";"}}});Ext.define("Ext.cf.naming.IDStore",{requires:["Ext.cf.naming.CookieStore","Ext.cf.naming.LocalStore","Ext.cf.naming.SessionStore"],config:{cookieStore:null,localStore:null,sessionStore:null},constructor:function(){this.setCookieStore(Ext.create("Ext.cf.naming.CookieStore"));this.setLocalStore(Ext.create("Ext.cf.naming.LocalStore"));this.setSessionStore(Ext.create("Ext.cf.naming.SessionStore"))},getId:function(a){var b="sencha.io."+a+".id";return this.getLocalStore().getItem(b)},getKey:function(a){var b="sencha.io."+a+".key";return this.getLocalStore().getItem(b)},getSid:function(a){var b=a+".sid";return this.getCookieStore().getItem(b)},setId:function(a,c){var b="sencha.io."+a+".id";return this.getLocalStore().setItem(b,c)},setKey:function(a,b){var c="sencha.io."+a+".key";return this.getLocalStore().setItem(c,b)},setSid:function(a,b){var c=a+".sid";return this.getCookieStore().setItem(c,b)},remove:function(a,b){var c=a+"."+b;var d="sencha.io."+c;this.getCookieStore().removeItem(c);this.getSessionStore().removeItem(c);this.getLocalStore().removeItem(d)},stash:function(b,d,a){var e=b+"."+d;var g="sencha.io."+e;var c=this.getCookieStore().getItem(e)||a;var f=this.getLocalStore().getItem(g);if(c){if(f){if(c!=f){this.getLocalStore().setItem(g,c)}else{}}else{this.getLocalStore().setItem(g,c)}}else{}return c||f}});Ext.define("Ext.cf.naming.Naming",{alternateClassName:"Ext.io.Naming",getServiceDescriptor:function(b,c,a){if(b=="naming-rpc"){c.call(a,{kind:"rpc",style:["subscriber"],access:["clients","servers"],depends:["messaging","naming"],methods:["getServiceDescriptor","get","find","update","add","destroy","getRelatedObject","getRelatedObjects","findRelatedObjects","getStore","createRelatedObject","setPicture","dropPicture"]})}else{Ext.io.Io.getMessagingProxy(function(d){d.getService({name:"naming-rpc"},function(f,e){if(f){f.getServiceDescriptor(function(g){if(g.status=="success"){c.call(a,g.value)}else{c.call(a,undefined,g.error)}},b)}else{c.call(a,undefined,e)}},this)},this)}}});Ext.require("Ext.cf.Overrides",function(){Ext.io_define("Ext.io.data.DirectoryModel",{extend:"Ext.data.Model",requires:["Ext.data.proxy.LocalStorage","Ext.data.identifier.Uuid"],config:{identifier:"uuid",fields:[{name:"name",type:"string"},{name:"type",type:"string"},{name:"meta",type:"auto"}],proxy:{id:"ext-io-data-directory",type:"localstorage"}}})});Ext.define("Ext.io.data.Directory",{requires:["Ext.data.Store","Ext.io.data.DirectoryModel","Ext.data.Batch"],store:undefined,constructor:function(a){this.store=Ext.create("Ext.data.Store",{model:"Ext.io.data.DirectoryModel",sorters:[{property:"name",direction:"ASC"}],autoLoad:true,autoSync:true})},get:function(b){var a=this.store.find("name",b);if(a==-1){return null}else{return this.store.getAt(a).data}},getAll:function(){var a=this.store.getRange();var c=[];for(var b=0;b<a.length;b++){c[b]=a[b].data}return c},each:function(b,a){this.store.each(function(c){return b.call(a||c.data,c.data)},this)},add:function(a,b,d){var c=Ext.create("Ext.io.data.DirectoryModel",{name:a,type:b,meta:d});this.store.add(c)},update:function(c,d,e){var b=this.store.find("name",c);if(b==-1){this.add(c,d,e)}else{var a=this.store.getAt(b);a.set("type",d);a.set("meta",e);a.save()}},remove:function(b){var a=this.store.find("name",b);if(a!=-1){this.store.removeAt(a)}return a}});Ext.define("Ext.cf.messaging.DeviceAllocator",{requires:["Ext.cf.util.Logger","Ext.cf.util.ErrorHelper"],statics:{register:function(a,b,c){this.callServer(a,"/device/register",{appId:b},c)},authenticate:function(a,b,c,d){this.callServer(a,"/device/authenticate",{deviceSid:b,deviceId:c},d)},callServer:function(a,b,c,d){Ext.Ajax.request({method:"POST",url:a+b,params:{},jsonData:c,scope:this,callback:function(f,g,e){if(e&&e.status===0){d({status:"error",error:Ext.cf.util.ErrorHelper.get("NETWORK_ERROR")})}else{if(g){d(Ext.decode(e.responseText))}else{d({status:"error",error:{code:"API_ERROR",message:"Error during API call"+b+" Status "+e.status}})}}}})}}});Ext.require("Ext.cf.Overrides",function(){Ext.io_define("Ext.cf.messaging.EnvelopeWrapper",{requires:["Ext.data.identifier.Uuid"],extend:"Ext.data.Model",config:{identifier:"uuid",fields:[{name:"e",type:"auto"},{name:"ts",type:"integer"}]}})});Ext.define("Ext.cf.messaging.transports.PollingTransport",{requires:["Ext.cf.util.Logger","Ext.cf.util.ErrorHelper"],mixins:{observable:"Ext.util.Observable"},intervalId:null,config:{url:"http://msg.sencha.io",deviceId:null,deviceSid:null,piggybacking:true,maxEnvelopesPerReceive:10,pollingDuration:5000},constructor:function(a){this.initConfig(a);this.mixins.observable.constructor.call(this);return this},getReceiveInvoker:function(){var a=this;var c=function(e,d){a.responseHandler(e,d)};var b={deviceId:a.config.deviceId,max:a.config.maxEnvelopesPerReceive};if(a.config.deviceSid){b.deviceSid=a.config.deviceSid}a.ajaxRequest("/receive",b,{},c)},start:function(){var a=this;this.intervalId=setInterval(function(){a.getReceiveInvoker()},this.config.pollingDuration);this.checkVersion()},checkVersion:function(){this.ajaxRequest("/version",{},{v:Ext.getVersion("sio").toString()},function(b,a){Ext.cf.util.Logger.debug("checkVersion",b,a);if(b){Ext.cf.util.Logger.error("Error performing client/server compatibility check",b)}else{try{a=Ext.decode(a.responseText);if(a&&a.code==="INCOMPATIBLE_VERSIONS"){Ext.cf.util.Logger.error(a.message);throw a.message}}catch(c){Ext.cf.util.Logger.error("Error decoding version response",a.responseText)}}})},stop:function(){clearInterval(this.intervalId)},responseHandler:function(e,c){var b=this;if(!e){Ext.cf.util.Logger.debug("PollingTransport",this.config.url,"response:",c.responseText);var f=Ext.decode(c.responseText);if(f){var a=f.envelopes;var g=f.hasMore;if(g){setTimeout(function(){b.getReceiveInvoker()},0)}if(a){for(var d=0;d<a.length;d++){this.fireEvent("receive",a[d])}}else{Ext.cf.util.Logger.warn("PollingTransport",this.config.url,"envelopes missing in response",c.status)}}else{Ext.cf.util.Logger.warn("PollingTransport",this.config.url,"response text is null",c.status)}}else{Ext.cf.util.Logger.warn("PollingTransport",this.config.url,"response error:",c)}},send:function(b,c){var a=this;this.ajaxRequest("/send",{max:this.config.maxEnvelopesPerReceive},b,function(e,d,f){c(e,f);if(a.config.piggybacking){a.responseHandler(e,d)}if(e&&d&&d.status===403){a.fireEvent("forbidden",e)}})},subscribe:function(b,c){var a=this;if(a.config.deviceSid){b.deviceSid=a.config.deviceSid}this.ajaxRequest("/subscribe",b,{},c)},unsubscribe:function(b,c){var a=this;if(a.config.deviceSid){b.deviceSid=a.config.deviceSid}this.ajaxRequest("/unsubscribe",b,{},c)},ajaxRequest:function(c,d,b,a){if(!this.config.piggybacking){d.pg=0}Ext.Ajax.request({method:"POST",url:this.config.url+c,params:d,jsonData:b,scope:this,callback:function(f,h,e){if(a){if(e&&e.status===0){a(Ext.cf.util.ErrorHelper.get("NETWORK_ERROR"),null,true)}else{if(h){a(null,e)}else{var g=Ext.cf.util.ErrorHelper.decode(e.responseText);a(g,e,false)}}}}})}});Ext.define("Ext.cf.messaging.transports.SocketIoTransport",{mixins:{observable:"Ext.util.Observable"},config:{url:"http://msg.sencha.io",deviceId:null,deviceSid:null},constructor:function(a){a=a||{};Ext.apply(this,a);this.mixins.observable.constructor.call(this)},start:function(){Ext.cf.util.Logger.debug("connecting to ",this.url);var b=this,a;if(typeof(io)==="undefined"){a="SocketIoTransport needs the socket.io 0.8.7 client library to work, but that library was not found. Please include the library and try again.";Ext.cf.util.Logger.error(a);throw a}if(io.version!=="0.8.7"){a="SocketIoTransport needs socket.io version 0.8.7, but the included version is "+io.version;Ext.cf.util.Logger.error(a);throw a}b.socket=io.connect(b.url);b.socket.on("receive",function(c){b._receive(c)});b.socket.on("connect",function(){Ext.cf.util.Logger.debug("start",b.deviceId,b.deviceSid);var d={deviceId:b.deviceId};if(b.deviceSid){d.deviceSid=b.deviceSid}b.socket.emit("start",d,function(e){if(e){Ext.cf.util.Logger.error(e.message,e)}});var c=b.socket.socket.transport.name;if(c!=="websocket"){Ext.cf.util.Logger.warn("SocketIoTransport: Could not use websockets! Falling back to",c)}b.checkVersion()})},checkVersion:function(){this._emit("version",{v:Ext.getVersion("sio").toString()},function(c,a,b){Ext.cf.util.Logger.debug("checkVersion",c,a,b);if(c){Ext.cf.util.Logger.error("Error performing client/server compatibility check",c)}else{if(b&&b.code==="INCOMPATIBLE_VERSIONS"){Ext.cf.util.Logger.error(b.message);throw b.message}}})},send:function(b,c){var a=this;this._emit("send",b,function(e,d){if(c){c(e)}if(e&&d&&d===403){a.fireEvent("forbidden",e)}})},subscribe:function(a,b){this._emit("subscribe",a,function(d,c){if(b){b(d)}})},unsubscribe:function(a,b){this._emit("unsubscribe",a,function(d,c){if(b){b(d)}})},_emit:function(b,a,c){if(this.socket){this.socket.emit(b,a,c)}},_receive:function(c){if(c.envelope){this.fireEvent("receive",c.envelope)}else{if(c.envelopes&&c.envelopes.length>0){var a=c.envelopes.length;for(var b=0;b<a;b++){this.fireEvent("receive",c.envelopes[b])}}}}});Ext.define("Ext.cf.messaging.Transport",{requires:["Ext.data.proxy.LocalStorage","Ext.cf.messaging.EnvelopeWrapper","Ext.cf.messaging.transports.PollingTransport","Ext.cf.messaging.transports.SocketIoTransport","Ext.cf.util.ErrorHelper"],mixins:{observable:"Ext.util.Observable"},transport:null,listeners:{},undeliveredIncomingStore:null,retryIncomingInProgress:false,undeliveredOutgoingStore:null,retryOutgoingInProgress:false,transportClasses:{polling:"Ext.cf.messaging.transports.PollingTransport",socket:"Ext.cf.messaging.transports.SocketIoTransport"},config:{url:"http://msg.sencha.io",deviceId:"",piggybacking:true,maxEnvelopesPerReceive:10,transportName:"socket",debug:false,undeliveredIncomingRetryInterval:5*1000,undeliveredIncomingExpiryInterval:60*60*24*1000,undeliveredIncomingMaxCount:100,undeliveredOutgoingRetryInterval:5*1000,undeliveredOutgoingExpiryInterval:60*60*24*1000,undeliveredOutgoingMaxCount:100},constructor:function(c){var b=this;this.initConfig(c);Ext.cf.util.Logger.info("Transport type ",this.getTransportName());var a=Ext.io.Io.getStoreDirectory();this.undeliveredIncomingStore=Ext.create("Ext.data.Store",{model:"Ext.cf.messaging.EnvelopeWrapper",proxy:{type:"localstorage",id:"sencha-io-undelivered-incoming-envelopes"},autoLoad:true,autoSync:false});this.undeliveredOutgoingStore=Ext.create("Ext.data.Store",{model:"Ext.cf.messaging.EnvelopeWrapper",proxy:{type:"localstorage",id:"sencha-io-undelivered-outgoing-envelopes"},autoLoad:true,autoSync:false});a.update("sencha-io-undelivered-incoming-envelopes","channel",{direction:"in"});a.update("sencha-io-undelivered-outgoing-envelopes","channel",{direction:"out"});Ext.cf.util.Logger.info("Undelivered incoming retry interval: "+this.getUndeliveredIncomingRetryInterval());setInterval(function(){b.retryUndeliveredIncomingMessages()},this.getUndeliveredIncomingRetryInterval());Ext.cf.util.Logger.info("Undelivered outgoing retry interval: "+this.getUndeliveredOutgoingRetryInterval());setInterval(function(){b.retryUndeliveredOutgoingMessages()},this.getUndeliveredOutgoingRetryInterval());Ext.cf.util.Logger.debug("Transport config",Ext.encode(this.config));this.transport=Ext.create(this.transportClasses[this.getTransportName()],this.config);this.transport.start();this.transport.on("receive",function(d){b.receive(d)});this.setupForbiddenStatusHandler();return this},setupForbiddenStatusHandler:function(){var a=this;this.transport.on("forbidden",function(b){if(b&&b.code==="INVALID_SID"){for(k in b.details){if(b.details[k]==="INVALID"){a.removeSidFromStores(k);a.fireEvent(k+"Invalid")}}}})},removeSidFromStores:function(a){var b=Ext.io.Io.getIdStore();switch(a){case"deviceSid":b.remove("device","sid");break;case"developerSid":b.remove("developer","sid");break;case"userSid":b.remove("user","sid");break;default:Ext.cf.util.warn("Unknown sid, cannot remove: ",a);break}},retryUndeliveredOutgoingMessages:function(){var c=this;if(c.retryOutgoingInProgress){Ext.cf.util.Logger.debug("Another retry (outgoing) already in progress, skipping...");return}var b=this.undeliveredOutgoingStore.getCount();if(b>0){Ext.cf.util.Logger.debug("Transport trying redelivery for outgoing envelopes:",b)}else{return}c.retryOutgoingInProgress=true;try{var d=new Date().getTime();var h=c.getUndeliveredOutgoingExpiryInterval();var a=this.undeliveredOutgoingStore.getAt(0);var g=a.data.e;if((d-a.data.ts)>h){Ext.cf.util.Logger.warn("Buffered outgoing envelope is too old, discarding",a);this.undeliveredOutgoingStore.remove(a);c.undeliveredOutgoingStore.sync();c.retryOutgoingInProgress=false}else{if(window.navigator.onLine){Ext.cf.util.Logger.debug("Transport trying redelivery for outgoing envelope: "+a);c.transport.send(g,function(e,i){if(i){Ext.cf.util.Logger.debug("Redelivery failed for outgoing envelope, keeping it channeld",a,e);c.retryOutgoingInProgress=false}else{Ext.cf.util.Logger.debug("Delivered outgoing envelope on retry",a);c.undeliveredOutgoingStore.remove(a);c.undeliveredOutgoingStore.sync();c.retryOutgoingInProgress=false}})}else{Ext.cf.util.Logger.debug("Browser still offline, not retrying delivery for outgoing envelope",a);c.retryOutgoingInProgress=false}}}catch(f){c.retryOutgoingInProgress=false;Ext.cf.util.Logger.debug("Error during retryUndeliveredOutgoingMessages",f)}},retryUndeliveredIncomingMessages:function(){var b=this;if(b.retryIncomingInProgress){Ext.cf.util.Logger.debug("Another retry (incoming) already in progress, skipping...");return}b.retryIncomingInProgress=true;try{var c=new Date().getTime();var h=b.getUndeliveredIncomingExpiryInterval();var g=this.undeliveredIncomingStore.getRange();if(g.length>0){Ext.cf.util.Logger.debug("Transport trying redelivery for incoming envelopes:",g.length)}for(var d=0;d<g.length;d++){var a=g[d];var f=a.data.e;var e=this.listeners[f.service];if(e){e.listener.call(e.scope,f);Ext.cf.util.Logger.debug("Delivered incoming envelope on retry",a);this.undeliveredIncomingStore.remove(a)}else{if((c-a.data.ts)>h){Ext.cf.util.Logger.warn("Buffered incoming envelope is too old, discarding",a);this.undeliveredIncomingStore.remove(a)}}}}finally{this.undeliveredIncomingStore.sync();b.retryIncomingInProgress=false}},getDeveloperSid:function(){return Ext.io.Io.getIdStore().getSid("developer")},getDeviceSid:function(){return Ext.io.Io.getIdStore().getSid("device")},getUserSid:function(){return Ext.io.Io.getIdStore().getSid("user")},setListener:function(b,c,a){this.listeners[b]={listener:c,scope:a}},removeListener:function(a){delete this.listeners[a]},sendToService:function(c,d,a,b){this.send({service:c,msg:d},a,b)},sendToClient:function(c,d,a,b){if(d&&typeof(d)==="object"){d.to=c;this.send({service:"courier",msg:d},a,b)}else{Ext.cf.util.Logger.error("Message is not a JSON object");a.call(b,Ext.cf.util.ErrorHelper.get("MESSAGE_NOT_JSON",d))}},send:function(g,c,e){var b=this;if(this.getDebug()){g.debug=true}g.from=this.getDeviceId();var f=this.getDeviceSid();if(f){g.deviceSid=f}var a=this.getDeveloperSid();if(a){g.developerSid=a}var d=this.getUserSid();if(d){g.userSid=d}Ext.cf.util.Logger.debug("Transport.send "+JSON.stringify(g));if(window.navigator.onLine){this.transport.send(g,function(h,i){if(c){c.call(e,h);if(h&&i){Ext.cf.util.Logger.warn("Error delivering outgoing envelope",g,h);b.bufferOutgoingEnvelope(g)}}})}else{b.bufferOutgoingEnvelope(g)}},bufferOutgoingEnvelope:function(b){if(this.undeliveredOutgoingStore){if(this.undeliveredOutgoingStore.getCount()<this.getUndeliveredOutgoingMaxCount()){var a=this.undeliveredOutgoingStore.add(Ext.create("Ext.cf.messaging.EnvelopeWrapper",{e:b,ts:(new Date().getTime())}));this.undeliveredOutgoingStore.sync();Ext.cf.util.Logger.debug("Added to outgoing channel, will retry delivery later",a)}else{Ext.cf.util.Logger.warn("Channel full, discarding undeliverable outgoing message!",b)}}},receive:function(c){Ext.cf.util.Logger.debug("Transport.receive "+JSON.stringify(c));if(this.listeners[c.service]){var b=this.listeners[c.service];b.listener.call(b.scope,c)}else{Ext.cf.util.Logger.error("Transport.receive no listener for service '",c.service,"'.",this.listeners);if(this.undeliveredIncomingStore){if(this.undeliveredIncomingStore.getCount()<this.getUndeliveredIncomingMaxCount()){var a=this.undeliveredIncomingStore.add(Ext.create("Ext.cf.messaging.EnvelopeWrapper",{e:c,ts:(new Date().getTime())}));Ext.cf.util.Logger.debug("Added to incoming channel, will retry delivery later",a);this.undeliveredIncomingStore.sync()}else{Ext.cf.util.Logger.warn("Channel full, discarding undeliverable incoming message!",c)}}}},subscribe:function(c,a,b){Ext.cf.util.Logger.debug("Transport.subscribe "+c);var d={deviceId:this.getDeviceId(),service:c};this.transport.subscribe(d,function(e){if(a){a.call(b,e)}})},unsubscribe:function(c,a,b){Ext.cf.util.Logger.debug("Transport.unsubscribe "+c);var d={deviceId:this.getDeviceId(),service:c};this.transport.unsubscribe(d,function(e){if(a){a.call(b,e)}})}});Ext.define("Ext.cf.messaging.Rpc",{requires:["Ext.cf.util.Logger","Ext.cf.util.ErrorHelper"],config:{transport:null,rpcTimeoutDuration:60*1000,rpcTimeoutCheckInterval:5*1000},rpcTimeoutInterval:null,constructor:function(b){var a=this;this.initConfig(b);this.rpcTimeoutInterval=setInterval(function(){a.processRpcTimeouts()},this.getRpcTimeoutCheckInterval());return this},callMap:{},processRpcTimeouts:function(){var a=this;var f=new Date().getTime();var d=this.getRpcTimeoutDuration();var c=[];try{for(var b in this.callMap){var h=this.callMap[b];if(h&&h.requestTime&&((f-h.requestTime)>d)){c.push(b)}}c.forEach(function(e){var j=a.callMap[e];if(j&&j.callback){delete a.callMap[e];Ext.cf.util.Logger.warn("RPC request has timed out as there was no reply from the server. Correlation Id:",e);Ext.cf.util.Logger.warn("See documentation for Ext.io.Io.setup (rpcTimeoutDuration, rpcTimeoutCheckInterval) to configure the timeout check");var i=Ext.cf.util.ErrorHelper.get("RPC_TIMEOUT",e);j.callback({status:"error",error:i})}})}catch(g){Ext.cf.util.Logger.error("Error running RPC timeout checks",g)}},currentCallId:0,generateCallId:function(){return ++this.currentCallId},subscribe:function(a){this.callback(a.msg["corr-id"],a)},dispatch:function(c,d){var a=this;var b=this.generateCallId();c.msg["corr-id"]=b;c.from=this.getTransport().getDeviceId();this.callMap[b]={callback:d,requestTime:(new Date().getTime()),method:c.msg.method};this.getTransport().send(c,function(e){if(e){a.callMap[b].callback({status:"error",error:e});delete a.callMap[b]}},this)},callback:function(a,j){var c=parseInt(a,10);if(!this.callMap[c]){Ext.cf.util.Logger.warn("No callback found for this correspondance id: "+a)}else{var b=this.callMap[c];var e=new Date().getTime();var i=e-b.requestTime;var g=j.debug===true?(j.debugInfo.outTime-j.debugInfo.inTime):"NA";var d=(g==="NA")?"NA":(i-g);var f=j.service+"."+b.method;Ext.cf.util.Logger.perf(a,f,"total time",i,"server time",g,"network time",d);if(j.msg.result.status!=="success"){if(!Ext.cf.util.ErrorHelper.isValidError(j.msg.result.error)){Ext.cf.util.Logger.debug("RPC error is of incorrect format:",j.msg.result.error);var h=Ext.cf.util.ErrorHelper.get("UNKNOWN_RPC_ERROR");h.details=j.msg.result.error;j.msg.result.error=h}}b.callback(j.msg.result);delete this.callMap[c]}},call:function(f,c,b,e,a){var d;this.getTransport().setListener(c,this.subscribe,this);switch(b){case"subscriber":d={service:c,from:this.getTransport().getDeviceId(),msg:{method:e,args:a}};this.dispatch(d,f);break;default:Ext.cf.util.Logger.error(b+" is an invalid RPC style");throw"Invalid RPC style: "+b}}});Ext.define("Ext.cf.messaging.PubSub",{config:{transport:undefined},constructor:function(a){this.initConfig(a);return this},channelCallbackMap:{},handleIncoming:function(d){var a=d.msg.queue;if(a&&this.channelCallbackMap[a]){var c=this.channelCallbackMap[a];var b={deviceId:d.from,userId:d.userId};c.callback.call(c.scope,b,d.msg.data)}else{Ext.cf.util.Logger.warn("PubSub: No callback for channelName "+a)}},publish:function(a,b,d,e,c){this.getTransport().send({service:"client-pubsub",msg:{api:"publish",queue:a,qKey:b,data:d}},e,c)},subscribe:function(b,c,e,d,a){this.getTransport().setListener("client-pubsub",this.handleIncoming,this);this.getTransport().send({service:"client-pubsub",msg:{api:"subscribe",queue:b,qKey:c}},function(f){if(f){if(a){a.call(d,f)}}else{this.channelCallbackMap[b]={callback:e,scope:d};Ext.cf.util.Logger.info("client-pubsub: "+this.getTransport().getDeviceId()+" subscribed to "+b)}},this)},unsubscribe:function(a,b,d,c){delete this.channelCallbackMap[a];this.getTransport().send({service:"client-pubsub",msg:{api:"unsubscribe",queue:a,qKey:b}},function(e){Ext.cf.util.Logger.info("client-pubsub: "+this.getTransport().getDeviceId()+" unsubscribed to "+a);if(d){d.call(c,e)}},this)}});Ext.define("Ext.cf.messaging.AuthStrategies",{requires:["Ext.cf.util.UuidGenerator","Ext.cf.util.Md5"],statics:{nc:0,getRequestCounter:function(){return ++Ext.cf.messaging.AuthStrategies.nc},strategies:{digest:function(c,d,f,b){var e=d.username;var a=d.password;Ext.io.Io.getMessagingProxy(function(g){g.getService({name:"groupmanager"},function(h,i){if(h){h.loginUser(function(s){if(s.status=="success"){var o=s.value.nonce;var j="auth";var n=""+Ext.cf.messaging.AuthStrategies.getRequestCounter();var r=Ext.cf.util.UuidGenerator.generate();var q=Ext.cf.util.Md5.hash(e+":"+c.getId()+":"+a);var l=g.transport.getUrl();var p=Ext.cf.util.Md5.hash("POST:"+l);var m=Ext.cf.util.Md5.hash(q+":"+o+":"+n+":"+r+":"+j+":"+p);h.loginUser(function(t){if(t.status=="success"&&t.value._bucket&&t.value._bucket=="Users"){var u=Ext.create("Ext.io.User",{id:t.value._key,data:t.value.data});f.call(b,u,t.sid)}else{f.call(b,null,null,t.error)}},{groupId:c.getId(),username:e,nonce:o,uri:l,qop:j,nc:n,cnonce:r,response:m,digest:true})}else{f.call(b,null,null,s.error)}},{groupId:c.getId(),digest:true})}else{f.call(b,null,null,i)}},this)},this)},facebook:function(d,e,f,c){var b=function(g){if(g.status=="success"&&g.value._bucket&&g.value._bucket=="Users"){var h=Ext.create("Ext.io.User",{id:g.value._key,data:g.value.data});f.call(c,h,g.sid,null)}else{f.call(c,null,null,g.error)}};var a={groupId:d.getId(),authuser:e};Ext.io.Io.getMessagingProxy(function(g){g.getService({name:"groupmanager"},function(h,i){if(h){h.loginUser(b,a)}else{f.call(c,null,null,i)}},this)},this)}}}});Ext.define("Ext.io.Object",{inheritableStatics:{getObject:function(a,c,b){Ext.io.Io.getMessagingProxy(function(d){d.getService({name:"naming-rpc"},function(g,f){if(g){var e=this;g.get(function(h){if(h.status=="success"){c.call(b,Ext.create(e.$className,{id:h.value._key,data:h.value.data}))}else{c.call(b,undefined,h.error)}},e.$className,a)}else{c.call(b,undefined,f)}},this)},this)},findObjects:function(c,e,b,d,a){Ext.io.Io.getMessagingProxy(function(f){f.getService({name:"naming-rpc"},function(i,h){if(i){var g=this;i.find(function(j){if(j.status=="success"){var m=[];for(var l=0;l<j.value.length;l++){m.push(Ext.create(g.$className,{id:j.value[l]._key,data:j.value[l].data}))}d.call(a,m)}else{d.call(a,undefined,j.error)}},g.$className,c,e,b)}else{d.call(a,undefined,h)}},this)},this)},},config:{id:null,data:null,},constructor:function(a){this.initConfig(a);if(a._key){this.setId(a._key)}},update:function(b,c,a){b=Ext.Object.merge(this.getData(),b);Ext.io.Io.getMessagingProxy(function(d){d.getService({name:"naming-rpc"},function(f,e){if(f){f.update(function(g){if(g.status=="success"){c.call(a)}else{c.call(a,g.error)}},this.$className,this.getId(),b)}else{c.call(a,e)}},this)},this)},destroy:function(b,a){Ext.io.Io.getMessagingProxy(function(c){c.getService({name:"naming-rpc"},function(e,d){if(e){e.destroy(function(f){if(f.status=="success"){b.call(a)}else{b.call(a,f.error)}},this.$className,this.getId())}else{b.call(a,d)}},this)},this)},createRelatedObject:function(e,a,c,d,b){Ext.io.Io.getMessagingProxy(function(f){f.getService({name:"naming-rpc"},function(h,g){if(h){h.createRelatedObject(function(i){if(i.status=="success"){var j=Ext.create(a,{id:i.value._key,data:i.value.data});d.call(b,j)}else{d.call(b,undefined,i.error)}},this.$className,this.getId(),e,c)}else{d.call(b,undefined,g)}},this)},this)},getRelatedObject:function(b,c,a,e,d){Ext.io.Io.getMessagingProxy(function(f){f.getService({name:"naming-rpc"},function(h,g){if(h){h.getRelatedObject(function(i){if(i.status=="success"){var j=null;if(i.value&&i.value!==null){j=Ext.create(b,{id:i.value._key,data:i.value.data})}e.call(d,j)}else{e.call(d,undefined,i.error)}},this.$className,this.getId(),b.$className,c,a)}else{e.call(d,undefined,g)}},this)},this)},getRelatedObjects:function(b,a,d,c){Ext.io.Io.getMessagingProxy(function(e){e.getService({name:"naming-rpc"},function(g,f){if(g){g.getRelatedObjects(function(h){if(h.status=="success"){var l=[];for(var j=0;j<h.value.length;j++){l.push(Ext.create(b,{id:h.value[j]._key,data:h.value[j].data}))}d.call(c,l)}else{d.call(c,undefined,h.error)}},this.$className,this.getId(),b.$className,a)}else{d.call(c,undefined,f)}},this)},this)},findRelatedObjects:function(b,c,a,e,f,d){Ext.io.Io.getMessagingProxy(function(g){g.getService({name:"naming-rpc"},function(i,h){if(i){i.findRelatedObjects(function(j){if(j.status=="success"){var m=[];for(var l=0;l<j.value.length;l++){m.push(Ext.create(b,{id:j.value[l]._key,data:j.value[l].data}))}f.call(d,m)}else{f.call(d,undefined,j.error)}},this.$className,this.getId(),b.$className,c,a,e)}else{f.call(d,undefined,h)}},this)},this)}});Ext.define("Ext.io.WithPicture",{uploadPicture:function(a,d,b){if(typeof a.file!="undefined"){a.file.ftype="icon";Ext.io.Io.getMessagingProxy(function(e){e.sendContent(a.file,function(f,i){if(f){var g=a.file.name.split(".");var h="."+g[g.length-1];this.setPicture(f,h,function(l,j){d.call(b,l,j)},this)}else{d.call(b,undefined,i)}},this)},this)}else{var c={code:"FILE_PARAMS_MISSED",message:"File parameters are missed"};d.call(b,undefined,c)}},setPicture:function(c,b,d,a){this.getServiceName(function(f,e){if(!f){Ext.io.Io.getMessagingProxy(function(g){g.getService({name:e},function(i,h){if(i){i.setPicture(function(j){if(j.status=="success"){d.call(a,j.value)}else{d.call(a,undefined,j.error)}},this.$className,this.getId(),c,b)}else{d.call(a,undefined,h)}},this)},this)}else{d.call(a,undefined,f)}},this)},removePicture:function(b,a){this.getServiceName(function(d,c){if(!d){Ext.io.Io.getMessagingProxy(function(e){e.getService({name:c},function(g,f){if(g){g.removePicture(function(h){if(h.status=="success"){b.call(a)}else{b.call(a,h.error)}},this.$className,this.getId())}else{b.call(a,f)}},this)},this)}else{b.call(a,d)}},this)},getServiceName:function(c,b){var a;switch(this.$className){case"Ext.io.App":a="AppService";break;case"Ext.io.Team":a="TeamService";break}if(a){c.call(b,null,a)}else{c.call(b,{code:"NOT_SUPPORTED",message:"This class of object does not support picture operations"},null)}}});Ext.define("Ext.io.Channel",{extend:"Ext.io.Object",mixins:{observable:"Ext.util.Observable"},statics:{get:function(a,c,b){if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([{name:"name",type:"string"},],arguments,"Ext.io.Channel","get")){Ext.io.Io.getMessagingProxy(function(d){a.appId=Ext.io.Io.getIdStore().getId("app");d.getChannel(a,c,b)},this)}},find:function(a,c,b){if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([{name:"query",type:"string"},],arguments,"Ext.io.Channel","find")){Ext.io.App.getCurrent(function(e,d){if(e){e.findChannels(a,c,b)}else{c.call(b,e,d)}})}},},config:{name:undefined,queueName:undefined,subscribeOnStart:true},constructor:function(a){this.initConfig(a);if(this.getSubscribeOnStart()){this.subscribe()}},publish:function(a,c,b){if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([{name:"message",type:"object|string"},],arguments,"Ext.io.Channel","publish")){Ext.io.Io.getMessagingProxy(function(d){d.pubsub.publish(this.getQueueName(),this.getId(),a.message,c,b)},this)}},subscribe:function(c,b){if(!this.subscribedFn){this.subscribedFn=function a(d,e){var d=Ext.create("Ext.io.Sender",d);this.fireEvent("message",d,e)};Ext.io.Io.getMessagingProxy(function(d){d.pubsub.subscribe(this.getQueueName(),this.getId(),this.subscribedFn,this,Ext.emptyFn)},this)}if(c){this.on("message",c,b)}},unsubscribe:function(b,a){if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments,"Ext.io.Channel","unsubscribe")){Ext.io.Io.getMessagingProxy(function(c){c.pubsub.unsubscribe(this.getQueueName(),this.getId(),b,a)},this)}},});Ext.define("Ext.io.Store",{extend:"Ext.io.Object",statics:{get:function(a,c,b){this.getObjects(a.id,c,scope)}},findReplicas:function(a,c,b){this.findRelatedObjects(Ext.io.Replica,this.getId(),null,a.query,c,b)},});Ext.define("Ext.io.App",{extend:"Ext.io.Object",requires:["Ext.io.Channel"],mixins:{withpicture:"Ext.io.WithPicture"},statics:{getCurrent:function(d,a){if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments,"Ext.io.App","getCurrent")){var c=Ext.io.Io.getIdStore().getId("app");if(!c){var b={code:"NO_APP_ID",message:"App ID not found"};d.call(a,undefined,b)}else{this.getObject(c,d,a)}}},get:function(a,c,b){if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([{name:"id",type:"string|number"},],arguments,"Ext.io.App","get")){this.getObject(a.id,c,b)}}},getGroup:function(b,a){if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments,"Ext.io.App","getGroup")){this.getRelatedObject(Ext.io.Group,null,null,b,a)}},findDevices:function(a,c,b){if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([{name:"query",type:"string"},],arguments,"Ext.io.App","findDevices")){Ext.io.Device.findObjects(a.query,0,1000,c,b)}},getChannel:function(a,c,b){a.appId=this.getId();Ext.io.Io.getMessagingProxy(function(d){d.getChannel(a,c,b)})},findChannels:function(a,c,b){if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([{name:"query",type:"string"},],arguments,"Ext.io.App","findChannels")){this.findRelatedObjects(Ext.io.Channel,this.getId(),null,a.query,c,b)}},createVersion:function(b,e,c){var a=this;if(typeof b.file!="undefined"&&typeof b.data!="undefined"){b.file.ftype="package";Ext.io.Io.getMessagingProxy(function(f){f.sendContent(b.file,function(g,i){if(g){b.data["package"]=g;var h=b.file.name.split(".");b.data.ext="."+h[h.length-1];a.createRelatedObject("createVersion",Ext.io.Version,b.data,e,c)}else{e.call(c,undefined,i)}},this)})}else{var d={code:"FILE_PARAMS_MISSED",message:"File or data parameters are missed"};e.call(c,undefined,d)}},getTeam:function(b,a){this.getRelatedObject(Ext.io.Team,null,null,b,a)},getDeployedVersion:function(b,d,c){var a=(typeof(b.env)!="undefined")?((b.env=="dev")?"dev":"prod"):"prod";this.getRelatedObject(Ext.io.Version,null,a,d,c)},regenerateSecret:function(c,b){var a=this;Ext.io.Io.getMessagingProxy(function(d){d.getService({name:"AppService"},function(e,f){if(e){e.regenerateSecret(function(g){c.call(b,g.value,g.error)},a.getId())}else{c.call(b,undefined,f)}},this)})},});Ext.define("Ext.io.Proxy",{requires:["Ext.cf.util.ParamValidator","Ext.cf.util.ErrorHelper"],config:{name:null,descriptor:null,rpc:null,},constructor:function(a){if(a.descriptor.kind!="rpc"){Ext.cf.util.Logger.error(a.name+" is not a RPC service");throw"Error, proxy does not support non-RPC calls"}this.initConfig(a);this._createMethodProxies();return this},_createMethodProxies:function(){var d=this.getDescriptor();var b=(Object.prototype.toString.call(d.methods)==="[object Array]");if(b){for(var c=0;c<d.methods.length;c++){var a=d.methods[c];this[a]=this._createMethodProxy(a)}}else{for(a in d.methods){this[a]=this._createMethodProxyNew(a,d.methods[a])}}},_createMethodProxyNew:function(c,d){var b=this;var a=d.shift();return function(){var g=Ext.cf.util.ParamValidator.validateParams(d,arguments,true);if(g){b.handleValidationError(g,"Invalid parameters to RPC method",arguments)}else{var g=b.performAuthChecks(a);if(g){b.handleValidationError(g,"Authentication checks failed",arguments)}else{var h=b.getDescriptor();var e=Array.prototype.slice.call(arguments,0);var f=h.style[0];if(h.style.indexOf("subscriber")>0){f="subscriber"}b.getRpc().call(e[0],b.getName(),f,c,e.slice(1))}}}},handleValidationError:function(a,c,b){Ext.cf.util.Logger.error(c,a);if(typeof(b[0])==="function"){b[0].call(null,{status:"error",error:a})}else{throw (a.code+" "+a.message)}},performAuthChecks:function(a){var d=null;var b=Ext.io.Io.getIdStore();var c={developerSid:b.getSid("developer"),userSid:b.getSid("user")};var e=this.getDescriptor();d=this.validateAuthentication(e.authenticate,c);if(!d){d=this.validateAuthentication(a.authenticate,c)}return d},validateAuthentication:function(a,b){var c=null;if(a){if((a==="developer"&&!b.developerSid)||(a==="user"&&!b.userSid)){c=Ext.cf.util.ErrorHelper.get("AUTH_REQUIRED",null,{kind:a})}}return c},_createMethodProxy:function(b){var a=this;return function(){var e=a.getDescriptor();var c=Array.prototype.slice.call(arguments,0);var d=e.style[0];if(e.style.indexOf("subscriber")>0){d="subscriber"}a.getRpc().call(c[0],a.getName(),d,b,c.slice(1))}}});Ext.define("Ext.io.Service",{config:{name:null,descriptor:null,transport:null,},constructor:function(a){this.initConfig(a);return this},send:function(a,c,b){this.getTransport().sendToService(this.getName(),a.message,c,b)},receive:function(b,a){this.getTransport().setListener(this.getName(),function(c){b.call(a,c.from,c.msg)},this)},subscribe:function(c,b){var a=this;a.transport.subscribe(a.getName(),function(d){if(d){callback.call(b,d)}else{a.transport.setListener(a.getName(),function(e){callback.call(b,e.service,e.msg)},a)}},a)},unsubscribe:function(){this.transport.unsubscribe(this.getName(),callback,scope)}});Ext.define("Ext.io.Device",{extend:"Ext.io.Object",mixins:{observable:"Ext.util.Observable"},statics:{find:function(a,c,b){if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([{name:"query",type:"string"},],arguments,"Ext.io.Device","find")){Ext.io.App.getCurrent(function(e,d){if(e){e.findDevices(a,c,b)}else{c.call(b,e,d)}})}},getCurrent:function(e,b){if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments,"Ext.io.Device","getCurrent")){var d=Ext.io.Io.getIdStore().getId("device");if(!d){var c={code:"NO_DEVICE_ID",message:"Device ID not found"};e.call(b,undefined,c)}else{var a=function(f,g){if(f&&f.receive){f.receive()}e.call(b,f,g)};this.getObject(d,a,this)}}},get:function(a,c,b){if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([{name:"id",type:"string|number"},],arguments,"Ext.io.Device","get")){this.getObject(a.id,c,b)}}},getApp:function(b,a){this.getRelatedObject(Ext.io.Version,this.getData().version,null,function(c,d){if(d){b.call(a,undefined,d)}else{c.getRelatedObject(Ext.io.App,null,null,b,a)}},this)},getUser:function(b,a){if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments,"Ext.io.Device","getUser")){this.getRelatedObject(Ext.io.User,null,null,b,a)}},send:function(a,c,b){if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([{name:"message",type:"string|object"}],arguments,"Ext.io.Device","send")){Ext.io.Io.getMessagingProxy(function(d){d.transport.sendToClient(this.getId(),a.message,c,b)},this)}},receive:function(b,a){if(b){this.on("message",b,a)}if(!this.subscribedFn){this.subscribedFn=function(d){var c=Ext.create("Ext.io.Sender",d.from);this.fireEvent("message",c,d.msg)};Ext.io.Io.getMessagingProxy(function(c){c.transport.setListener("courier",this.subscribedFn,this)},this)}},getVersion:function(b,a){this.getRelatedObject(Ext.io.Version,this.getData().version,null,b,a)},});Ext.define("Ext.io.User",{extend:"Ext.io.Object",requires:["Ext.io.Sender","Ext.io.Store"],mixins:{observable:"Ext.util.Observable"},statics:{register:function(a,c,b){if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([{name:"username",type:"string"},{name:"password",type:"string"},{name:"email",type:"string"}],arguments,"Ext.io.User","register")){Ext.io.Group.getCurrent(function(e,d){if(e){e.register(a,c,b)}else{c.call(b,e,d)}})}},authenticate:function(a,c,b){if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope(null,arguments,"Ext.io.User","authenticate")){Ext.io.Group.getCurrent(function(f,e){if(f){var d=function(g,h){if(g){g.receive()}c.call(b,g,h)};f.authenticate(a,d,b)}else{c.call(b,f,e)}})}},find:function(a,c,b){if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([{name:"query",type:"string"}],arguments,"Ext.io.User","find")){Ext.io.Group.getCurrent(function(e,d){if(e){e.findUsers(a,c,b)}else{c.call(b,e,d)}})}},getCurrent:function(f,d){if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments,"Ext.io.User","getCurrent")){var a=Ext.io.Io.getIdStore();var b=a.getId("user");var c=a.getSid("user");if(!b){var e={code:"NO_CURRENT_USER",message:"User ID not found"};f.call(d,undefined,e)}else{if(!c){var e={code:"NO_CURRENT_USER",message:"User not authenticated"};f.call(d,undefined,e)}else{this.getObject(b,function(g,h){if(g){g.receive()}f.call(d,g,h)},this)}}}},get:function(a,c,b){this.getObject(a.id,c,b)}},constructor:function(a){this.initConfig(a);this.userChannelName="Users/"+this.getId()},getDevices:function(b,a){if(Ext.cf.util.ParamValidator.validateCallbackScope(arguments,"Ext.io.User","getDevices")){this.getRelatedObjects(Ext.io.Device,null,b,a)}},getGroup:function(b,a){this.getRelatedObject(Ext.io.Group,this.getData().group,null,b,a)},send:function(a,c,b){if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([{name:"message",type:"string|object"}],arguments,"Ext.io.User","send")){Ext.io.Io.getMessagingProxy(function(d){d.pubsub.publish(this.userChannelName,null,a.message,c,b)},this)}},receive:function(c,b){if(c){this.on("message",c,b)}if(!this.subscribedFn){this.subscribedFn=function a(f,e){var d=Ext.create("Ext.io.Sender",f);this.fireEvent("message",d,e)};Ext.io.Io.getMessagingProxy(function(d){d.pubsub.subscribe(this.userChannelName,null,this.subscribedFn,this,Ext.emptyFn)},this)}},logout:function(){Ext.io.Io.getIdStore().remove("user","sid");Ext.io.Io.getIdStore().remove("user","id")},getStore:function(a,c,b){Ext.io.Io.getMessagingProxy(function(d){d.getService({name:"naming-rpc"},function(f,e){if(f){f.getStore(function(g){if(g.status=="success"){var h=Ext.create("Ext.io.Store",{id:g.value._key,data:g.value.data});c.call(b,h)}else{c.call(b,undefined,g.error)}},this.getId(),a)}else{c.call(b,undefined,e)}},this)},this)},findStores:function(a,c,b){this.findRelatedObjects(Ext.io.Store,this.getId(),null,a.query,c,b)},});Ext.define("Ext.io.Group",{extend:"Ext.io.Object",requires:["Ext.cf.messaging.AuthStrategies"],statics:{getCurrent:function(c,b){var a=Ext.io.Io.getIdStore().getId("group");if(!a){Ext.require("Ext.io.App");Ext.io.App.getCurrent(function(e,d){if(e){e.getGroup(function(g,f){Ext.io.Io.getIdStore().setId("group",g?g.getId():null);c.call(b,g,f)})}else{c.call(b,undefined,d)}})}else{this.getObject(a,c,b)}},get:function(a,c,b){this.getObject(a.id,c,b)}},getApp:function(b,a){Ext.io.App.getCurrent(b,a)},findUsers:function(a,c,b){if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([{name:"query",type:"string"},],arguments,"Ext.io.Group","findUsers")){this.findRelatedObjects(Ext.io.User,null,null,a.query,c,b)}},register:function(a,c,b){Ext.io.Io.getMessagingProxy(function(d){d.getService({name:"groupmanager"},function(e,f){if(e){e.registerUser(function(g){if(g.status=="success"){var h=Ext.create("Ext.io.User",{id:g.value._key,data:g.value.data});Ext.io.Io.getIdStore().setId("user",h.getId());Ext.io.Io.getIdStore().setSid("user",g.sid);c.call(b,h)}else{c.call(b,undefined,g.error)}},{authuser:a,groupId:this.getId()})}else{c.call(b,undefined,f)}},this)},this)},authenticate:function(a,e,c){var b=this.getAuthMethod();var d=Ext.cf.messaging.AuthStrategies.strategies[b];if(d){d(this,a,function(f,h,g){if(f){Ext.io.Io.getIdStore().setId("user",f.getId());Ext.io.Io.getIdStore().setSid("user",h);Ext.io.Io.getIdStore().setId("group",this.getId())}e.call(c,f,g)},this)}else{console.error("Unsupported group registration type: "+b+".  Choose a different type from the developer console.")}},getAuthMethod:function(){var a="digest";if(this.getData().fb&&this.getData().fb.enabled===true){a="facebook"}else{if(this.getData().twitter&&this.getData().twitter.enabled===true){a="twitter"}}return a},findStores:function(a,c,b){this.findRelatedObjects(Ext.io.Store,this.getId(),null,a.query,c,b)},});Ext.define("Ext.io.Developer",{extend:"Ext.io.Object",requires:["Ext.cf.util.Md5","Ext.cf.util.ErrorHelper"],statics:{authenticate:function(b,d,c){var a=this;Ext.io.Io.getService({name:"teammanager"},function(e,f){if(e){e.authenticate(function(g){if(g.status=="success"){var h=Ext.create("Ext.io.Developer",{id:g.value._key,data:g.value.data});Ext.io.Io.getIdStore().setSid("developer",g.session.sid);Ext.io.Io.getIdStore().setId("developer",g.value._key);d.call(c,h)}else{d.call(c,undefined,g.error)}},{username:b.username,password:Ext.cf.util.Md5.hash(b.password),provider:"sencha"})}else{d.call(c,undefined,f)}},this)},getCurrent:function(d,a){var c=Ext.io.Io.getIdStore().getId("developer");if(!c){var b={code:"NOT_LOGGED",message:"Developer is not logged in"};d.call(a,undefined,b)}else{this.getObject(c,d,a)}},get:function(a,c,b){this.getObject(a.id,c,b)}},getTeams:function(b,d,c){var a=(typeof(b.owner)!="undefined")?((b.owner)?"owner":"member"):null;this.getRelatedObjects(Ext.io.Team,a,d,c)},createTeam:function(a,c,b){this.createRelatedObject("createTeam",Ext.io.Team,a,c,b)},logout:function(){Ext.io.Io.getIdStore().remove("developer","sid");Ext.io.Io.getIdStore().remove("developer","id")}});Ext.define("Ext.io.Team",{extend:"Ext.io.Object",mixins:{withpicture:"Ext.io.WithPicture"},statics:{get:function(a,c,b){this.getObject(a.id,c,b)}},createApp:function(a,c,b){this.createRelatedObject("createApp",Ext.io.App,a,c,b)},createGroup:function(a,c,b){this.createRelatedObject("createGroup",Ext.io.Group,a,c,b)},getDevelopers:function(b,d,c){var a=(typeof(b.owner)!="undefined")?((b.owner)?"owner":"member"):"_";this.getRelatedObjects(Ext.io.Developer,a,d,c)},getApps:function(b,a){this.getRelatedObjects(Ext.io.App,null,b,a)},getGroups:function(b,a){this.getRelatedObjects(Ext.io.Group,null,b,a)},manageDeveloper:function(d,a,c,b){Ext.io.Io.getMessagingProxy(function(e){e.getService({name:"TeamService"},function(g,f){if(g){g[d](function(h){if(h.status=="success"){c.call(b)}else{c.call(b,h.error)}},this.getId(),a.id)}else{c.call(b,f)}},this)},this)},addDeveloper:function(a,c,b){this.manageDeveloper("addDeveloper",a,c,b)},removeDeveloper:function(a,c,b){this.manageDeveloper("removeDeveloper",a,c,b)},inviteDeveloper:function(a,c,b){Ext.io.Io.getMessagingProxy(function(d){d.getService({name:"teammanager"},function(e,f){if(e){e.inviteDeveloper(function(g){if(g.status=="success"){c.call(b)}else{c.call(b,g.error)}},{username:a.username,org:this.getId()})}else{c.call(b,f)}},this)},this)}});Ext.define("Ext.io.Version",{extend:"Ext.io.Object",statics:{get:function(a,c,b){this.getObject(a.id,c,b)}},deploy:function(a,c,b){Ext.io.Io.getMessagingProxy(function(d){d.getService({name:"VersionService"},function(e,f){if(e){e.deploy(function(g){if(g.status=="success"){c.call(b)}else{c.call(b,g.error)}},this.getId(),a.env)}else{c.call(b,f)}},this)},this)},undeploy:function(a,c,b){Ext.io.Io.getMessagingProxy(function(d){d.getService({name:"VersionService"},function(e,f){if(e){e.undeploy(function(g){if(g.status=="success"){c.call(b)}else{c.call(b,g.error)}},this.getId(),a.env)}else{c.call(b,f)}},this)},this)},getApp:function(b,a){this.getRelatedObject(Ext.io.App,null,null,b,a)}});Ext.define("Ext.cf.Utilities",{requires:["Ext.cf.util.Logger"],statics:{delegate:function(d,b,a){if(b===undefined){var c="Error - Tried to delegate '"+a+"' to undefined instance.";Ext.cf.util.Logger.error(c);throw c}a.forEach(function(f){var e=b[f];if(e===undefined){c="Error - Tried to delegate undefined method '"+f+"' to "+b;Ext.cf.util.Logger.error(c);throw c}d[f]=function(){return e.apply(b,arguments)}})},check:function(f,c,e,a,b){if(a===undefined){var d="Error - "+f+"."+c+" - "+e+" not provided.";Ext.cf.util.Logger.error(d)}else{b.forEach(function(i){var h=a[i];if(h===undefined){var g="Error - "+f+"."+c+" - "+e+"."+i+" not provided.";Ext.cf.util.Logger.error(g)}})}},wrapMethod:function(b,c,d,e){if(b[c]){return b}else{var a=function(){if(d){d.call(this,b,arguments)}b.apply(this,arguments);if(e){e.call(this,b,arguments)}};a[c]=true;a.displayName=b.displayName;return a}},wrapClass:function(b,d,e,f){for(var c in b){if(b.hasOwnProperty(c)){var a=b[c];if(a.displayName){b[c]=this.wrapMethod(a,d,e,f)}}}}}});Ext.define("Ext.cf.data.Update",{statics:{asString:function(b){if(Ext.isArray(b)){return"["+Ext.Array.map(b,Ext.cf.data.Update.asString).join(", ")+"]"}else{if(b instanceof Ext.cf.data.Updates){return Ext.cf.data.Update.asString(b.updates)}else{var c=Ext.isArray(b.p)?b.p.join():b.p;var a=b.v;if(typeof b.v==="object"){a=Ext.encode(b.v)}return"("+b.i+" . "+c+" = '"+a+"' @ "+b.c.asString()+")"}}}}});Ext.define("Ext.cf.data.SyncModel",{statics:{areDecorated:function(a){return Ext.Array.every(a,function(b){return(b.eco!==undefined&&b.eco!==null)})},isDestroyed:function(b){var a=(b||this).data._ts;return(a!==null&&a!==undefined&&a!=="")},isNotDestroyed:function(b){var a=(b||this).data._ts;return(a===null||a===undefined||a==="")}}});Ext.define("Ext.cf.data.SyncStore",{requires:["Ext.cf.Utilities","Ext.cf.ds.CSIV"],asyncInitialize:function(a,d,b){Ext.cf.Utilities.check("SyncStore","initialize","config",a,["databaseName"]);this.logger=Ext.cf.util.Logger;this.store=a.localStorageProxy||window.localStorage;this.id=a.databaseName;var c=this.getIds().length>0;this.readConfig("databaseDefinition",function(e){if(c&&!e){this.logger.error("Ext.cf.data.SyncStore.initialize: Tried to use an existing store,",a.databaseName,", as a syncstore.");d.call(b,{r:"error"})}else{this.readConfig("csiv",function(f){this.csiv=f?Ext.create("Ext.cf.ds.CSIV").decode(f):undefined;if(!this.csiv){this.reindex(function(){d.call(b,{r:"ok"})},this)}else{d.call(b,{r:"ok"})}},this)}},this)},create:function(a,d,c){var b=this.getIds();a.forEach(function(e){b.push(e.getOid());this.setRecord(e)},this);this.setIds(b);if(d){d.call(c)}},readByOid:function(c,d,b){var a=this.getRecord(c);d.call(b,a)},readByOids:function(c,h,e){var b=[];var d,a=c.length;var g=function(f){b.push(f)};for(d=0;d<a;d++){this.readByOid(c[d],g,this)}h.call(e,b)},readByCSV:function(a,d,c){var b=this.csiv.oidsFrom(a);this.readByOids(b,d,c)},readAll:function(b,a){this.readByOids(this.getIds(),b,a)},update:function(a,c,b){a.forEach(function(d){this.setRecord(d)},this);if(c){c.call(b)}},destroy:function(f,h,e){if(Ext.isArray(f)){var d=this.getIds();var c,a=f.length;for(c=0;c<a;c++){var g=f[c];Ext.Array.remove(d,g);var b=this.getRecordKey(g);this.store.removeItem(b)}this.setIds(d);if(h){h.call(e)}}else{this.destroy([f],h,e)}},clear:function(f,e){var d=this.getIds(),a=d.length,c;for(c=0;c<a;c++){var b=this.getRecordKey(d[c]);this.store.removeItem(b)}this.store.removeItem(this.id);this.store.removeItem(this.getRecordKey("csiv"));this.csiv=Ext.create("Ext.cf.ds.CSIV");f.call(e)},setModel:function(a){this.model=a},readConfig:function(c,e,a){var b=this.store.getItem(this.getRecordKey(c));var d=b?Ext.decode(b):{};e.call(a,d)},writeConfig:function(b,c,d,a){this.store.setItem(this.getRecordKey(b),Ext.encode(c));d.call(a,c)},removeConfig:function(b,c,a){this.store.removeItem(this.getRecordKey(b));c.call(a)},getCSIndex:function(b,a){b.call(a,this.csiv)},setCSIndex:function(b,c,a){if(b){this.csiv=b;this.writeConfig("csiv",this.csiv.encode(),c,a)}else{c.call(a)}},changeReplicaNumber:function(a,c,d,b){this.readAll(function(g){var h,f=g.length;for(h=0;h<f;h++){var e=g[h];var j=e.getOid();if(e.changeReplicaNumber(a,c)){if(e.getOid()!=j){e.phantom=false;this.create([e]);this.destroy(j)}else{this.update([e])}}}this.reindex(d,b)},this)},reindex:function(b,a){this.csiv=Ext.create("Ext.cf.ds.CSIV");this.readAll(function(e){var f,d=e.length;for(f=0;f<d;f++){var c=e[f];var g=c.getOid();c.eco.forEachCS(function(h){this.csiv.add(h,g)},this)}b.call(a)},this)},getIds:function(){var a=[];var b=this.store.getItem(this.id);if(b){a=b.split(",")}return a},setIds:function(a){this.store.removeItem(this.id);this.store.setItem(this.id,a.join(","))},getRecordKey:function(a){return Ext.String.format("{0}-{1}",this.id,a)},getRecord:function(b){var g;var m=this.getRecordKey(b);var o=this.store.getItem(m);if(o!==null){var l=Ext.decode(o);var n=l.data;var f={};var h=this.model.getFields().items;var c=h.length;var e=0,j,a,d;for(e=0;e<c;e++){j=h[e];a=j.getName();if(typeof j.getDecode()=="function"){f[a]=j.getDecode()(n[a])}else{if(j.getType().type=="date"){f[a]=new Date(n[a])}else{f[a]=n[a]}}}g=new this.model(f);g.data._oid=n._oid;if(n._ref!==null&&n._ref!==undefined){g.data._ref=n._ref}if(n._ts!==null&&n._ts!==undefined){g.data._ts=n._ts}g.eco=Ext.create("Ext.cf.ds.ECO",{oid:n._oid,data:g.data,state:l.state});Ext.apply(g,Ext.cf.data.ModelWrapper)}return g},setRecord:function(g){var n=g.eco.data,e={},h=this.model.getFields().items,b=h.length,f=0,l,a,d,m;for(;f<b;f++){l=h[f];a=l.getName();if(typeof l.getEncode()=="function"){e[a]=l.getEncode()(rawData[a],g)}else{if(l.getType().type=="date"){e[a]=n[a].getTime()}else{e[a]=n[a]}}if(e[a]===null||e[a]===undefined){e[a]=l.getDefaultValue()}}e._oid=g.getOid();if(n._ref!==null&&n._ref!==undefined){e._ref=n._ref}if(n._ts!==null&&n._ts!==undefined){e._ts=n._ts}var j=g.eco;var c=g.getOid();m=this.getRecordKey(c);this.store.removeItem(m);var o=Ext.encode({data:e,state:j.state});this.store.setItem(m,o)}});Ext.define("Ext.cf.data.DatabaseDefinition",{extend:"Object",requires:["Ext.cf.Utilities"],config:{groupId:undefined,userId:undefined,databaseName:undefined,generation:undefined,idProperty:undefined,version:2},constructor:function(a){Ext.cf.Utilities.check("DatabaseDefinition","constructor","config",a,["databaseName","generation"]);this.initConfig(a)},hasOwner:function(){return this.getUserId()!==undefined||this.getGroupId()!==undefined},});Ext.define("Ext.cf.data.ReplicaDefinition",{extend:"Object",requires:["Ext.cf.Utilities"],config:{deviceId:undefined,replicaNumber:undefined},constructor:function(a){Ext.cf.Utilities.check("ReplicaDefinition","constructor","config",a,["replicaNumber"]);this.initConfig(a)},changeReplicaNumber:function(b){var a=(this.getReplicaNumber()!=b);this.setReplicaNumber(b);return a},as_data:function(){return{deviceId:this.getDeviceId(),replicaNumber:this.getReplicaNumber()}}});Ext.define("Ext.cf.data.Transaction",{requires:["Ext.cf.ds.LogicalClock","Ext.cf.ds.CSV","Ext.cf.util.Logger"],constructor:function(a,c,b){this.proxy=a;this.store=a.getStore();this.generatorChanged=false;this.originalGenerator=a.generator;this.modifiedGenerator=Ext.create("Ext.cf.ds.LogicalClock",a.generator);this.csvChanged=false;this.originalCSV=a.csv;this.modifiedCSV=Ext.create("Ext.cf.ds.CSV",a.csv);this.cache={};this.toCreate=[];this.toUpdate=[];this.toDestroy=[];this.store.getCSIndex(function(d){this.csivChanged=false;this.csiv=d;c.call(b,this)},this)},generateChangeStamp:function(){var a=this.modifiedGenerator.generateChangeStamp();this.modifiedCSV.addCS(a);this.generatorChanged=true;this.csvChanged=true;return a},create:function(a){this.addToCache(a);this.addToList(this.toCreate,a)},readByOid:function(c,d,b){var a=this.cache[c];if(a){d.call(b,a)}else{this.store.readByOid(c,function(e){if(e){this.addToCache(e)}d.call(b,e)},this)}},readCacheByOid:function(c,d,b){var a=this.cache[c];d.call(b,a)},readByOids:function(a,h,j){var c=[];var g=[];var e,d=a.length;for(e=0;e<d;e++){var b=a[e];var f=this.cache[b];if(f){c.push(f)}else{g.push(b)}}this.store.readByOids(g,function(i){this.addToCache(i);c=c.concat(i);h.call(j,c)},this)},update:function(a){this.addToCache(a);this.addToList(this.toUpdate,a)},destroy:function(a){this.toDestroy.push(a)},updateCS:function(c,b,a){if(c&&b){if(!c.equals(b)){this.csvChanged=this.modifiedCSV.addX(b)||this.csvChanged;this.csivChanged=true;this.csiv.add(b,a)}}else{if(c){}else{if(b){this.csvChanged=this.modifiedCSV.addX(b)||this.csvChanged;this.csivChanged=true;this.csiv.add(b,a)}}}},updateCSV:function(a){this.csvChanged=this.modifiedCSV.addX(a)||this.csvChanged},updateReplicaNumbers:function(a){this.csvChanged=this.modifiedCSV.addReplicaNumbers(a)||this.csvChanged},updateGenerator:function(a){this.generatorChanged=this.originalGenerator.seenCSV(a)},commit:function(d,c){this.toCreate=Ext.Array.unique(this.toCreate);this.toUpdate=Ext.Array.unique(this.toUpdate);this.toUpdate=Ext.Array.difference(this.toUpdate,this.toCreate);var b=this.getRecordsForList(this.toCreate);var a=this.getRecordsForList(this.toUpdate);this.store.create(b,function(){this.store.update(a,function(){this.store.destroy(this.toDestroy,function(){this.store.setCSIndex(this.csivChanged?this.csiv:undefined,function(){this.writeConfig_CSV(function(){this.writeConfig_Generator(function(){d.call(c,b,a)},this)},this)},this)},this)},this)},this)},writeConfig_Generator:function(b,a){if(this.generatorChanged){this.originalGenerator.set(this.modifiedGenerator);this.proxy.writeConfig_Generator(b,a)}else{b.call(a)}},writeConfig_CSV:function(b,a){if(this.csvChanged){this.originalCSV.addCSV(this.modifiedCSV);this.generatorChanged=this.originalGenerator.seenCSV(this.originalCSV);this.proxy.writeConfig_CSV(b,a)}else{b.call(a)}},addToCache:function(c){if(c){if(Ext.isArray(c)){var b=c.length;for(var d=0;d<b;d++){var a=c[d];this.addToCache(a)}}else{var e=c.getOid();if(e!==undefined){this.cache[e]=c}else{Ext.cf.util.Logger.error("Transaction.addToCache: Tried to add a record without an oid.",c)}}}},addToList:function(f,c){if(c){if(Ext.isArray(c)){var b=c.length;for(var d=0;d<b;d++){var a=c[d];var e=a.getOid();f.push(e)}}else{f.push(c.getOid())}}},getRecordsForList:function(d){var b=[];var a=d.length;for(var c=0;c<a;c++){var e=d[c];b.push(this.cache[e])}return b}});Ext.define("Ext.cf.data.Updates",{requires:["Ext.cf.ds.CS"],updates:undefined,constructor:function(a){this.updates=a||[];this.updates.forEach(function(b){if(!(b.c instanceof Ext.cf.ds.CS)){b.c=new Ext.cf.ds.CS(b.c)}});this.updates.sort(function(d,c){return d.c.compare(c.c)})},push:function(b){var a=this.updates[this.updates.length];if(!b.c.greaterThan(a.c)){throw"Error - Updates - Tried to push updates in wrong order. "+Ext.encode(b)+" <= "+Ext.encode(a)}this.updates.push(b)},isEmpty:function(){return this.updates.length<1},length:function(){return this.updates.length},oids:function(){return Ext.Array.unique(Ext.Array.pluck(this.updates,"i"))},forEach:function(b,a){this.updates.forEach(b,a)},encode:function(){var e=[];var a=this.updates.length;var c,f,d;for(var b=0;b<a;b++){f=this.updates[b];d=((f.c instanceof Ext.cf.ds.CS)?f.c.asString():f.c);if(f.i===c){e.push([f.p,f.v,d])}else{e.push([f.i,f.p,f.v,d]);c=f.i}}return e},decode:function(j){this.updates=[];if(j){var e=j.length;var f,d,a,b,m,h;for(var g=0;g<e;g++){f=j[g];switch(f.length){case 3:a=d;b=f[0];m=f[1];h=f[2];break;case 4:a=f[0];b=f[1];m=f[2];h=f[3];d=a;break}h=((h instanceof Ext.cf.ds.CS)?h:new Ext.cf.ds.CS(h));this.updates.push({i:a,p:b,v:m,c:h})}}return this}});Ext.define("Ext.cf.data.Protocol",{requires:["Ext.cf.data.Updates","Ext.cf.data.Transaction","Ext.cf.ds.CSV","Ext.cf.data.Updates","Ext.io.Proxy"],config:{proxy:undefined,owner:"user",access:"private",version:2,userId:undefined,groupId:undefined,deviceId:undefined},constructor:function(a){this.logger=Ext.cf.util.Logger;this.initConfig(a)},sync:function(f,c){var a=this;var b=this.getProxy();a.logger.debug("Protocol.sync: start");var e=b.getDatabaseDefinition();if(!e.hasOwner()){this.mapOwnerToId(this.getOwner(),this.getAccess(),e)}var d=b.getReplicaDefinition();if(!d.getDeviceId()){d.setDeviceId(this.config.deviceId||Ext.io.Io.getIdStore().getId("device"))}this.sendGetUpdate({},function(g){a.logger.debug("Protocol.sync: end",Ext.encode(g));f.call(c,g)})},mapOwnerToId:function(b,a,c){if(!b||b==="user"){if(!a||a==="private"){c.setUserId(this.config.userId||Ext.io.Io.getIdStore().getId("user"))}else{if(a==="public"){c.setGroupId(this.config.groupId||Ext.io.Io.getIdStore().getId("group"))}else{this.logger.error("Ext.cf.data.Protocol: Unknown owner:",b)}}}else{this.logger.error("Ext.cf.data.Protocol: Unknown access:",a)}},sendGetUpdate:function(b,c){this.logger.debug("Protocol.sendGetUpdate");var a=this;Ext.io.Io.getService({name:"sync"},function(d,g){if(d){var e=this.getProxy();var f={dd:e.getDatabaseDefinition().getCurrentConfig(),rd:e.getReplicaDefinition().getCurrentConfig(),csv:e.csv.encode()};d.getUpdates(function(h){if(!h.r){h=h.value}a.receiveResponse(h,b,function(i){if(h.r==="ok"){var l=Ext.create("Ext.cf.ds.CSV").decode(h.updates_csv);var j=Ext.create("Ext.cf.ds.CSV").decode(h.required_csv);a.updateLocalState(a.getProxy(),l,function(){var m=Ext.create("Ext.cf.data.Updates").decode(h.updates);i.received=m.length();a.getProxy().putUpdates(m,l,function(n){a.sendPutUpdate(j,n,c)},this)},this)}else{c(i)}})},f)}else{c(g)}},this)},receiveResponse:function(a,c,d){this.logger.debug("Protocol.receiveResponse",Ext.encode(a));var b=this.getProxy();switch(a.r||a.value.r){case"ok":d(a);break;case"set_replica_number":case"new_replica_number":if(c.new_replica_number==a.replicaNumber){this.logger.error("Protocol.receiveResponse: The server returned the same replica number '",a,"'");d.call({r:"error_same_replica_number"})}else{c.new_replica_number=a.replicaNumber;this.logger.info("Protocol.receiveResponse: Change local replica number to",a.replicaNumber);b.setReplicaNumber(a.replicaNumber,function(){this.sendGetUpdate(c,d)},this)}break;case"new_generation_number":if(a.generation>b.definition.generation){c.new_generation_number=a.generation;b.definition.set({generation:a.generation},function(){b.reset(function(){this.sendGetUpdate(c,d)},this)},this)}else{}break;case"error":this.logger.error("Protocol.receiveResponse: The server returned the error '",a.message,"'");d(a);break;default:this.logger.error("Protocol.receiveResponse: Received unknown message:",a);d(a)}},sendPutUpdate:function(c,b,e){this.logger.debug("Protocol.sendPutUpdate",c);var a=this.getProxy();b.sent=0;b.r="ok";if(!c.isEmpty()){var d=Ext.create("Ext.cf.ds.CSV",a.csv);d.setCSV(c);a.getUpdates(d,function(g,f){if((g&&!g.isEmpty())||(f&&!f.isEmpty())){Ext.io.Io.getService({name:"sync"},function(h,j){if(h){b.sent=g.length();var i={dd:a.getDatabaseDefinition().getCurrentConfig(),rd:a.getReplicaDefinition().getCurrentConfig(),csv:a.csv.encode(),updates:Ext.encode(g.encode())};h.putUpdates(function(l){Ext.apply(b,l);e(b)},i)}else{e(j)}},this)}else{this.logger.debug("Protocol.sendPutUpdate: no work");e(b)}},this)}else{this.logger.debug("Protocol.sendPutUpdate: no work");e(b)}},updateLocalState:function(b,a,d,c){Ext.create("Ext.cf.data.Transaction",b,function(e){e.updateReplicaNumbers(a);e.updateGenerator(a);e.commit(d,c)},this)}});Ext.cf.data.ModelWrapper={getOid:function(){return this.eco.getOid()},getCS:function(a){return this.eco.getCS(a)},getCSV:function(){return this.eco.getCSV()},setValueCS:function(b,d,a,c){return this.eco.setValueCS(b,d,a,c)},changeReplicaNumber:function(a,b){return this.eco.changeReplicaNumber(this.getIdProperty(),a,b)},setUpdateState:function(b){var c=this.getChanges();for(var a in c){this.setUpdateStateValue(b,[a],this.modified[a],c[a])}},setUpdateStateValue:function(c,g,b,f){if(this.eco.isComplexValueType(f)){var d,e;if(b){d={};if(this.eco.isComplexValueType(b)){if(this.eco.valueType(b)===this.eco.valueType(f)){d=Ext.Array.difference(f,b);var h=Ext.Array.intersect(f,b);for(e in h){if(h.hasOwnProperty(e)){if(b[e]!==f[e]){d[e]=f[e]}}}}else{d=f;this.eco.setCS(c,g,c.generateChangeStamp())}}else{d=f;this.eco.setCS(c,g,c.generateChangeStamp())}}else{d=f;this.eco.setCS(c,g,c.generateChangeStamp())}for(e in d){if(d.hasOwnProperty(e)){var a=b?b[e]:undefined;this.setUpdateStateValue(c,g.concat(e),a,f[e])}}}else{this.eco.setCS(c,g,c.generateChangeStamp())}},setDestroyState:function(a){var b=a.generateChangeStamp();this.eco.setValueCS(a,"_ts",b.asString(),b)},getUpdates:function(a){return this.eco.getUpdates(a)},putUpdate:function(a,b){return this.eco.setValueCS(a,b.p,b.v,b.c)}};Ext.define("Ext.cf.data.SyncProxy",{extend:"Ext.data.proxy.Proxy",requires:["Ext.data.proxy.Proxy","Ext.cf.data.Transaction","Ext.cf.data.Updates","Ext.cf.data.DatabaseDefinition","Ext.cf.data.ReplicaDefinition","Ext.cf.ds.CS","Ext.cf.ds.CSV","Ext.cf.ds.ECO","Ext.cf.Utilities","Ext.cf.data.SyncModel","Ext.cf.data.Update","Ext.cf.data.ModelWrapper","Ext.cf.util.Logger"],config:{store:undefined,databaseDefinition:undefined,replicaDefinition:undefined,},databaseName:undefined,csv:undefined,generator:undefined,userModel:undefined,idProperty:undefined,asyncInitialize:function(a,c,b){Ext.cf.Utilities.check("SyncProxy","asyncInitialize","config",a,["store","databaseDefinition","replicaDefinition"]);this.databaseName=a.databaseDefinition.databaseName;this.setStore(a.store);this.initConfig(a);this.setDatabaseDefinition(Ext.create("Ext.cf.data.DatabaseDefinition",a.databaseDefinition));this.setReplicaDefinition(Ext.create("Ext.cf.data.ReplicaDefinition",a.replicaDefinition));this.loadConfig(a,function(){Ext.cf.util.Logger.info("SyncProxy.asyncInitialize: Opened database '"+this.databaseName+"'");c.call(b,{r:"ok"})},this)},create:function(a,c,b){Ext.create("Ext.cf.data.Transaction",this,function(e){var d=a.getRecords();d.forEach(function(g){var h=e.generateChangeStamp();var i=h.asString();var f=g.eco=Ext.create("Ext.cf.ds.ECO",{oid:i,data:Ext.getVersion("extjs")?g.data:g.getData(),state:{}});Ext.apply(g,Ext.cf.data.ModelWrapper);f.setValueCS(e,"_oid",i,h);f.forEachValue(function(l,j){if(l[0]!=="_oid"){f.setCS(e,l,e.generateChangeStamp())}},f);g.data[this.idProperty]=g.getOid()},this);e.create(d);e.commit(function(){d.forEach(function(f){f.needsAdd=false;f.phantom=false},this);a.setSuccessful();a.setCompleted();this.doCallback(c,b,a)},this)},this)},read:function(a,d,c){function b(e){e=Ext.Array.filter(e,function(f){return f!==undefined&&Ext.cf.data.SyncModel.isNotDestroyed(f)},this);a.setResultSet(Ext.create("Ext.data.ResultSet",{records:e,total:e.length,loaded:true}));a.setSuccessful();a.setCompleted();this.doCallback(d,c,a)}if(a.id!==undefined){this.getStore().readByOid(a.id,function(e){b.call(this,[e])},this)}else{if(a._oid!==undefined){this.getStore().readByOid(a._oid,function(e){b.call(this,[e])},this)}else{this.getStore().readAll(function(e){b.call(this,e)},this)}}},update:function(a,c,b){if(Ext.cf.data.SyncModel.areDecorated(a.getRecords())){Ext.create("Ext.cf.data.Transaction",this,function(e){var d=a.getRecords();d.forEach(function(f){f.setUpdateState(e)},this);e.update(d);e.commit(function(){a.setSuccessful();a.setCompleted();this.doCallback(c,b,a)},this)},this)}else{records.forEach(function(d){d.dirty=false},this);Ext.cf.util.Logger.warn("SyncProxy.update: Tried to update a model that had not been read from the store.");Ext.cf.util.Logger.warn(Ext.encode(a.getRecords()));this.doCallback(c,b,a)}},destroy:function(a,c,b){if(Ext.cf.data.SyncModel.areDecorated(a.getRecords())){Ext.create("Ext.cf.data.Transaction",this,function(e){var d=a.getRecords();d.forEach(function(f){f.setDestroyState(e)},this);e.update(d);e.commit(function(){a.setSuccessful();a.setCompleted();a.action="destroy";this.doCallback(c,b,a)},this)},this)}else{Ext.cf.util.Logger.warn("SyncProxy.destroy: Tried to destroy a model that had not been read from the store.");Ext.cf.util.Logger.warn(Ext.encode(a.getRecords()));this.doCallback(c,b,a)}},clear:function(c,b){var a=this.getStore();a.clear(function(){a.removeConfig("databaseDefinition",function(){a.removeConfig("replicaDefinition",function(){a.removeConfig("csv",function(){a.removeConfig("generator",c,b)},this)},this)},this)},this)},reset:function(c,b){var a=this.getStore();a.clear(function(){a.removeConfig("csv",function(){readConfig_CSV({},c,b)},this)},this)},setModel:function(c,b){this.userModel=c;var a=Ext.getVersion("extjs");if(a){this.idProperty=c.prototype.idProperty}else{this.idProperty=c.getIdProperty();c.setIdentifier({type:"cs"})}this.getStore().setModel(this.userModel)},replicaNumber:function(){return this.generator.r},addReplicaNumbers:function(a,c,b){this.csv.addReplicaNumbers(a);this.writeConfig_CSV(c,b)},setReplicaNumber:function(c,d,b){var a=this.replicaNumber();Ext.cf.util.Logger.info("SyncProxy.setReplicaNumber: change from",a,"to",c);this.getStore().changeReplicaNumber(a,c,function(){this.getReplicaDefinition().changeReplicaNumber(c);this.csv.changeReplicaNumber(a,c);this.generator.setReplicaNumber(c);this.writeConfig_Replica(function(){this.writeConfig_Generator(function(){this.writeConfig_CSV(d,b)},this)},this)},this)},getUpdates:function(c,h,j){c.addReplicaNumbers(this.csv);var a=this.csv.dominant(c);if(a.dominant.length===0){var f=Ext.create("Ext.cf.ds.CSV");var e=Ext.create("Ext.cf.ds.CSV");var d,b=a.dominated.length;for(d=0;d<b;d++){e.addCS(this.csv.get(a.dominated[d]))}h.call(j,Ext.create("Ext.cf.data.Updates"),f,e)}else{if(!c.isEmpty()){Ext.cf.util.Logger.info("SyncProxy.getUpdates: Get updates from",c.asString());Ext.cf.util.Logger.info("SyncProxy.getUpdates: Dominated Replicas:",Ext.Array.pluck(a.dominated,"r").join(", "))}var g=[];this.getStore().readByCSV(c,function(n){var o,m=n.length;for(o=0;o<m;o++){g=g.concat(n[o].getUpdates(c))}var q=Ext.create("Ext.cf.ds.CSV");q.addX(a.dominant);var p=Ext.create("Ext.cf.ds.CSV");p.addX(a.dominated);h.call(j,Ext.create("Ext.cf.data.Updates",g),q,p)},this)}},putUpdates:function(b,c,d,a){Ext.create("Ext.cf.data.Transaction",this,function(g){if(b.isEmpty()){g.updateCSV(c);g.commit(function(){d.call(a,{r:"ok"})},this)}else{var f=Ext.create("Ext.cf.ds.CSV");var e=b.oids();g.readByOids(e,function(){b.forEach(function(h){this.applyUpdate(g,h,function(){},this);f.addCS(h.c)},this);this.putUpdates_done(g,b,c,f,d,a)},this)}},this)},putUpdates_done:function(b,d,e,a,f,c){b.updateCSV(a);b.updateCSV(e);b.commit(function(j,i){j=Ext.Array.filter(j,Ext.cf.data.SyncModel.isNotDestroyed);var g=Ext.Array.partition(i,Ext.cf.data.SyncModel.isDestroyed);var h=g[0];i=g[1];f.call(c,{r:"ok",created:j,updated:i,removed:h})},this)},applyUpdate:function(a,e,d,b,c){a.readCacheByOid(e.i,function(f){if(f){this.applyUpdateToRecord(a,f,e);d.call(b)}else{Ext.cf.util.Logger.debug("SyncProxy.applyUpdate:",Ext.cf.data.Update.asString(e),"accepted, creating new record");this.applyUpdateCreatingNewRecord(a,e);d.call(b)}},this)},applyUpdateCreatingNewRecord:function(b,c){var a;if(c.p==="_oid"){a=this.createModelFromOid(b,c.v,c.c)}else{Ext.cf.util.Logger.warn("Update received for unknown record "+c.i,Ext.cf.data.Update.asString(c));a=this.createModelFromOid(b,c.i,c.i);a.setValueCS(b,c.p,c.v,c.c)}b.create([a])},createModelFromOid:function(c,e,d){Ext.cf.util.Logger.info("SyncProxy.createModelFromOid:",e,d);var b=new this.userModel({});b.phantom=false;var a=b.eco=Ext.create("Ext.cf.ds.ECO",{oid:e,data:b.data,state:{}});Ext.apply(b,Ext.cf.data.ModelWrapper);b.setValueCS(c,"_oid",e,d);return b},applyUpdateToRecord:function(b,a,c){if(a.putUpdate(b,c)){b.update([a]);Ext.cf.util.Logger.info("SyncProxy.applyUpdateToRecord:",Ext.cf.data.Update.asString(c),"accepted");return true}else{Ext.cf.util.Logger.info("SyncProxy.applyUpdateToRecord:",Ext.cf.data.Update.asString(c),"rejected");return false}},loadConfig:function(a,c,b){this.readConfig_Database(a,function(){this.readConfig_Replica(a,function(){this.readConfig_CSV(a,function(){this.readConfig_Generator(a,function(){c.call(b)},this)},this)},this)},this)},readConfig_Database:function(a,c,b){this.readConfig(Ext.cf.data.DatabaseDefinition,"databaseDefinition",a.databaseDefinition,{},function(e,d){this.setDatabaseDefinition(d);c.call(b,e,d)},this)},readConfig_Replica:function(a,c,b){this.readConfig(Ext.cf.data.ReplicaDefinition,"replicaDefinition",a.replicaDefinition,{},function(e,d){this.setReplicaDefinition(d);c.call(b,e,d)},this)},readConfig_Generator:function(a,c,b){this.readConfig(Ext.cf.ds.LogicalClock,"generator",{},{},function(d,e){this.generator=e;if(this.generator.r===undefined){this.generator.r=a.replicaDefinition.replicaNumber}if(a.clock){this.generator.setClock(a.clock)}c.call(b,d,e)},this)},readConfig_CSV:function(a,c,b){this.readConfig(Ext.cf.ds.CSV,"csv",{},{},function(e,d){this.csv=d;c.call(b,e,d)},this)},writeConfig_Replica:function(b,a){this.writeConfig("replicaDefinition",this.getReplicaDefinition(),b,a)},writeConfig_Generator:function(b,a){this.writeConfig("generator",this.generator,b,a)},writeConfig_CSV:function(b,a){this.writeConfig("csv",this.csv,b,a)},writeConfig:function(d,a,c,b){if(a){this.getStore().writeConfig(d,a.as_data(),c,b)}else{c.call(b)}},readConfig:function(d,f,b,a,e,c){this.getStore().readConfig(f,function(i){var g;var h=(i===undefined)?"created":"ok";if(b!==undefined){if(i===undefined){i=b}else{for(g in b){if(i[g]===undefined){i[g]=b[g]}}}}if(a!==undefined){if(i===undefined){i=a}else{for(g in a){if(i[g]!==a[g]){i[g]=a[g]}}}}e.call(c,h,new d(i))},this)},doCallback:function(c,b,a){if(typeof c=="function"){c.call(b||this,a)}}});Ext.define("Ext.data.identifier.CS",{alias:"data.identifier.cs",config:{model:null},constructor:function(a){this.initConfig(a)},generate:function(a){return undefined}});Ext.Array.partition=function(d,m,h){var e=[],c=[];if(d){var f,b=d.length;for(var g=0;g<b;g++){f=d[g];if(f!==undefined){if(m.call(h||f,f)){e.push(f)}else{c.push(f)}}}}return[e,c]};Ext.define("Ext.io.data.Proxy",{extend:"Ext.data.proxy.Client",alias:"proxy.syncstorage",requires:["Ext.cf.Utilities","Ext.cf.data.SyncProxy","Ext.cf.data.SyncStore","Ext.cf.data.Protocol"],proxyInitialized:false,proxyLocked:true,config:{databaseName:undefined,deviceId:undefined,owner:null,access:null,userId:undefined,groupId:undefined,localSyncProxy:undefined,clock:undefined},constructor:function(c){this.logger=Ext.cf.util.Logger;Ext.cf.Utilities.check("Ext.io.data.Proxy","constructor","config",c,["id"]);this.setDatabaseName(c.id);this.proxyLocked=true;this.proxyInitialized=false;this.initConfig(c);this.callParent([c]);var a=Ext.io.Io.getStoreDirectory();var b=a.get(this.getDatabaseName(),"syncstore");if(b){a.add(this.getDatabaseName(),"syncstore")}},create:function(){var b=arguments;this.with_proxy(function(a){a.create.apply(a,b)},this)},read:function(){var b=arguments;this.with_proxy(function(a){a.read.apply(a,b)},this)},update:function(){var b=arguments;this.with_proxy(function(a){a.update.apply(a,b)},this)},destroy:function(){var b=arguments;this.with_proxy(function(a){a.destroy.apply(a,b)},this)},setModel:function(){var b=arguments;this.with_proxy(function(a){a.setModel.apply(a,b)},this);this.callParent(arguments)},sync:function(a,c,b){if(this.proxyLocked){if(this.storeHasUpdates(a)){if(c){c.call(b,{r:"error",message:"local updates do need to be synched, but a remote sync is currently in progress"})}}else{if(c){c.call(b,{r:"ok",message:"no local updates to sync, and remote sync is already in progress"})}}}else{this.with_proxy(function(d){this.proxyLocked=true;try{var f=a.storeSync();a.removed=[];this.logger.info("Ext.io.data.Proxy.sync: Start sync of database:",this.getDatabaseName());this.protocol.sync(function(e){if(e.r=="ok"){this.setDatabaseDefinitionRemote(true)}this.updateStore(a,e.created,e.updated,e.removed);this.proxyLocked=false;this.logger.info("Ext.io.data.Proxy.sync: End sync of database:",this.getDatabaseName());if(c){c.call(b,e)}},this)}catch(g){this.proxyLocked=false;this.logger.error("Ext.io.data.Proxy.sync: Exception thrown during synchronization");this.logger.error(g);this.logger.error(g.stack);throw g}},this)}},storeHasUpdates:function(b){var d=b.getNewRecords();if(d.length>0){return true}else{var c=b.getUpdatedRecords();if(c.length>0){return true}else{var a=b.getRemovedRecords();return(a.length>0)}}},updateStore:function(c,f,b,d){var g=false;if(f&&f.length>0){c.data.addAll(f);c.fireEvent("addrecords",this,f,0);g=true}if(b&&b.length>0){c.data.addAll(b);for(var e=0,a=b.length;e<a;e++){c.fireEvent("updaterecord",this,b[e])}g=true}if(d&&d.length>0){var a=d.length;for(var e=0;e<a;e++){var h=d[e].getId();c.data.removeAt(c.data.findIndexBy(function(j){return j.getId()===h}))}c.fireEvent("removerecords",this,d);g=true}if(g){c.fireEvent("refresh")}},clear:function(){if(this.proxyInitialized){this.proxyLocked=true;this.setDatabaseDefinitionLocal(false);this.remoteProxy.clear(function(){delete this.localProxy;delete this.remoteProxy;delete this.protocol;this.proxyInitialized=false;this.proxyLocked=false},this)}},setDatabaseDefinitionLocal:function(a){Ext.io.Io.getStoreDirectory().update(this.getDatabaseName(),"syncstore",{local:a})},setDatabaseDefinitionRemote:function(a){Ext.io.Io.getStoreDirectory().update(this.getDatabaseName(),"syncstore",{remote:a})},with_proxy:function(b,a){if(this.proxyInitialized){b.call(a,this.remoteProxy)}else{this.createLocalProxy(function(c){this.localProxy=c;this.createRemoteProxy(function(d){this.remoteProxy=d;this.protocol=Ext.create("Ext.cf.data.Protocol",{proxy:this.remoteProxy,owner:this.getOwner(),access:this.getAccess()});Ext.cf.Utilities.delegate(this,this.remoteProxy,["read","update","destroy"]);this.setDatabaseDefinitionLocal(true);this.proxyLocked=false;this.proxyInitialized=true;b.call(a,d)},this)},this)}},createLocalProxy:function(d,a){var b=this.getLocalSyncProxy()||"Ext.cf.data.SyncStore";var c=Ext.create(b);c.asyncInitialize(this.getCurrentConfig(),function(e){if(e.r!=="ok"){this.logger.error("Ext.io.data.Proxy: Unable to create local proxy:",b,":",Ext.encode(e))}d.call(a,c)},this)},createRemoteProxy:function(e,c){var d={databaseName:this.getDatabaseName(),generation:0};var b={databaseDefinition:d,replicaDefinition:{replicaNumber:0},store:this.localProxy,clock:this.getClock()};var a=Ext.create("Ext.cf.data.SyncProxy");a.asyncInitialize(b,function(f){if(f.r!=="ok"){this.logger.error("Ext.io.data.Proxy: Unable to create remote proxy:",Ext.encode(f))}e.call(c,a)},this)},});Ext.define("Ext.cf.messaging.Messaging",{requires:["Ext.cf.naming.Naming","Ext.cf.messaging.Transport","Ext.cf.messaging.Rpc","Ext.cf.messaging.PubSub","Ext.io.Proxy","Ext.io.Service","Ext.cf.util.ErrorHelper"],transport:null,rpc:null,pubsub:null,constructor:function(a){this.initConfig(a);this.naming=Ext.create("Ext.io.Naming");this.transport=Ext.create("Ext.cf.messaging.Transport",a);a.transport=this.transport;this.rpc=Ext.create("Ext.cf.messaging.Rpc",a);this.pubsub=Ext.create("Ext.cf.messaging.PubSub",a);return this},proxyCache:{},getService:function(d,f,e){var c=this;if(!d.name||d.name===""){Ext.cf.util.Logger.error("Service name is missing");var b=Ext.cf.util.ErrorHelper.get("SERVICE_NAME_MISSING");f.call(e,undefined,b)}else{var a=this.proxyCache[d.name];if(a){f.call(e,a)}else{c.naming.getServiceDescriptor(d.name,function(h,i){if(i||typeof(h)==="undefined"||h===null){Ext.cf.util.Logger.error("Unable to load service descriptor for "+d.name);var g=Ext.cf.util.ErrorHelper.get("SERVICE_DESCRIPTOR_LOAD_ERROR",d.name);g.cause=i;f.call(e,undefined,g)}else{if(h.kind=="rpc"){a=Ext.create("Ext.io.Proxy",{name:d.name,descriptor:h,rpc:c.rpc})}else{a=Ext.create("Ext.io.Service",{name:d.name,descriptor:h,transport:c.transport})}c.proxyCache[d.name]=a;f.call(e,a)}})}}},channelCache:{},getChannel:function(c,g,d){var b=this;var a;if(!c.name||c.name===""){a=Ext.cf.util.ErrorHelper.get("CHANNEL_NAME_MISSING");g.call(d,undefined,a)}else{if(!c.appId||c.appId===""){a=Ext.cf.util.ErrorHelper.get("CHANNEL_APP_ID_MISSING");g.call(d,undefined,a)}else{var f=c.appId+"."+c.name;var e=this.channelCache[f];if(!e){b.getService({name:"AppService"},function(i,h){if(i){i.getQueue(function(j){if(j.status=="success"){e=Ext.create("Ext.io.Channel",{id:j.value._key,data:j.value.data,name:c.name,queueName:f});b.channelCache[f]=e;g.call(d,e)}else{g.call(d,undefined,j.error)}},c.appId,c)}else{g.call(d,undefined,h)}},this)}else{g.call(d,e)}}}},sendContent:function(d,g,e){var b=this;var c=b.config.url||"http://msg.sencha.io";if(!d.name||d.name===""||!d.file||!d.ftype){var a={code:"PARAMS_MISSING",message:"Some of parameters are missing"};g.call(e,a)}else{var f=new XMLHttpRequest();f.onreadystatechange=function(){if(f.readyState==4){var j=function(n){var l;try{l=JSON.parse(n)}catch(m){return{}}return l};var h=Ext.merge({status:"error",error:"Can not store file"},j(f.responseText));if(h.status=="success"){g.call(e,h.value)}else{var i={code:"STORE_ERROR",message:h.error};g.call(e,null,i)}}};f.open("POST",c+"/contenttransfer/"+Math.random(),true);f.setRequestHeader("X-File-Name",encodeURIComponent(d.name));f.setRequestHeader("Content-Type","application/octet-stream; charset=binary");f.overrideMimeType("application/octet-stream; charset=x-user-defined-binary");f.setRequestHeader("X-Requested-With","XMLHttpRequest");f.setRequestHeader("Content-Encoding","binary");f.setRequestHeader("File-type",d.ftype);f.send(d.file)}}});Ext.setVersion("sio","0.3.4");(function(){var b=Ext.Loader.getPath("Ext.io");if(b){var a=b.substring(0,b.lastIndexOf("/"))+"/cf";Ext.Loader.setPath("Ext.cf",a)}})();Ext.define("Ext.io.Io",{requires:(function(){var b=["Ext.cf.Overrides","Ext.cf.messaging.DeviceAllocator","Ext.cf.messaging.Messaging","Ext.cf.util.Logger","Ext.cf.util.ParamValidator","Ext.io.Group","Ext.io.User","Ext.io.App","Ext.io.Device","Ext.io.Channel","Ext.io.data.Proxy","Ext.cf.naming.IDStore"];var a=Ext.getVersion("extjs");if(!a){b.push("Ext.io.data.Directory")}return b})(),alternateClassName:"Ext.Io",singleton:true,config:{url:"http://msg.sencha.io:80"},setup:function(a){if(Ext.cf.util.ParamValidator.validateApi([{name:"options",type:"object",keys:[{name:"appId",type:"string",optional:true},{name:"appSecret",type:"string",optional:true},{name:"url",type:"string",optional:true},{name:"logLevel",type:"string",optional:true}]}],arguments,"Ext.io.Io","setup")){Ext.apply(Ext.io.Io.config,a);if(Ext.io.Io.config.logLevel){Ext.cf.util.Logger.setLevel(Ext.io.Io.config.logLevel)}if(a.trace){for(name in Ext.io){Ext.cf.Utilities.wrapClass(Ext.io[name],"trace",function(b,c){Ext.cf.util.Logger.trace(b.displayName,c)})}}}},callbacks:[],init:function(c,b){var a=this;if(Ext.io.Io.config.logLevel){Ext.cf.util.Logger.setLevel(Ext.io.Io.config.logLevel)}if(a.initializing){if(c){this.callbacks.push([c,b])}else{Ext.cf.util.Logger.warn("A call to Ext.io.Io.init is already in progress. It's better to always provide a init with a callback, otherwise calls into Ext.io may fail.")}return}if(a.initialized){if(c){c.call(b)}return}a.initializing=true;if(!c){Ext.cf.util.Logger.warn("Ext.io.Io.init can be called without a callback, but calls made into Ext.io before init has completed, may fail.")}this.initDeveloper(function(){this.initApp(function(){this.initDevice(function(){this.initMessaging(function(){this.initGroup(function(){this.initUser(function(){a.initialized=true;a.initializing=false;if(c){c.call(b)}for(var d=0;d<this.callbacks.length;d++){c=this.callbacks[d];c[0].call(c[1])}},this)},this)},this)},this)},this)},this)},initDeveloper:function(c,b){var a=Ext.io.Io.getIdStore();a.stash("developer","id");c.call(b)},initApp:function(d,b){var a=Ext.io.Io.getIdStore();var c=a.stash("app","id",Ext.io.Io.config.appId);if(!c){Ext.cf.util.Logger.error("Could not find App Id.");Ext.cf.util.Logger.error("The App Id is either provided by senchafy.com when the App is served, or can be passed through Ext.Io.setup({appId:id})")}d.call(b)},initDevice:function(e,b){var a=Ext.io.Io.getIdStore();if(this.config.deviceId){a.setId("device",this.config.deviceId);if(this.config.deviceSid){a.setSid("device",this.config.deviceSid)}Ext.cf.util.Logger.debug("Ext.Io.setup provided the device id",this.config.deviceId);e.call(b)}else{var c=a.getSid("device");var d=a.getId("device");if(c&&d){this.authenticateDevice(c,d,e,b)}else{this.registerDevice(e,b)}}},initMessaging:function(c,b){var a=Ext.io.Io.getIdStore();Ext.io.Io.config.url=a.stash("msg","server",Ext.io.Io.config.url);this.config.deviceId=a.getId("device");this.config.deviceSid=a.getSid("device");Ext.io.Io.messaging=Ext.create("Ext.cf.messaging.Messaging",this.config);c.call(b)},initGroup:function(c,b){var a=Ext.io.Io.getIdStore();if(this.config.groupId){a.setId("group",this.config.groupId);c.call(b)}else{a.stash("group","id");this.config.groupId=a.getId("group");if(!this.config.groupId){Ext.io.App.getCurrent(function(e,d){if(e){e.getGroup(function(g,f){this.config.groupId=g?g.getId():null;a.setId("group",this.config.groupId);c.call(b,f)},this)}else{c.call(b,d)}},this)}else{c.call(b)}}},initUser:function(c,b){var a=Ext.io.Io.getIdStore();a.stash("user","id");c.call(b)},registerDevice:function(d,c){var b=this;var a=Ext.io.Io.getIdStore();Ext.cf.messaging.DeviceAllocator.register(this.config.url,this.config.appId,function(e){if(e.status==="success"){Ext.cf.util.Logger.debug("registerDevice","succeeded",e);a.setId("device",e.result.deviceId);a.setSid("device",e.result.deviceSid);d.call(c)}else{var g=e.error;var f="Registering device failed. "+g.code+": "+g.message;Ext.cf.util.Logger.error("registerDevice",f,g);throw f}})},authenticateDevice:function(c,d,e,b){var a=this;Ext.cf.messaging.DeviceAllocator.authenticate(this.config.url,c,d,function(f){if(f.status==="success"){Ext.cf.util.Logger.debug("authenticateDevice","succeeded",f);e.call(b)}else{if(f.error.code==="NETWORK_ERROR"){var g="Authenticate device failed due to network error";Ext.cf.util.Logger.error(g,f.error);throw g}else{Ext.cf.util.Logger.warn("authenticateDevice","failed, re-registering device",f.error);a.registerDevice(e,b)}}})},idStore:undefined,getIdStore:function(){Ext.io.Io.idStore=Ext.io.Io.idStore||Ext.create("Ext.cf.naming.IDStore");return Ext.io.Io.idStore},messaging:undefined,getMessagingProxy:function(b,a){if(Ext.io.Io.messaging){b.call(a,Ext.io.Io.messaging)}else{Ext.io.Io.init(function(){b.call(a,Ext.io.Io.messaging)},this)}},storeDirectory:undefined,getStoreDirectory:function(){Ext.io.Io.storeDirectory=Ext.io.Io.storeDirectory||Ext.create("Ext.io.data.Directory",{});return Ext.io.Io.storeDirectory},getService:function(a,c,b){if(Ext.cf.util.ParamValidator.validateOptionsCallbackScope([{name:"name",type:"string"},],arguments,"Ext.io.Io","getService")){Ext.io.Io.init(function(){Ext.io.Io.messaging.getService(a,c,b)})}}});if(!Ext.getVersion("extjs")){Ext.define("Ext.io.ux.Authenticate",{extend:"Ext.Container",requires:["Ext.MessageBox","Ext.TitleBar","Ext.form.Panel","Ext.form.FieldSet","Ext.field.Password","Ext.field.Email"],config:{id:"loginpanel",layout:"fit",fullscreen:true,control:{"button[action=siologin]":{tap:"doAuth"},"button[action=showRegister]":{tap:"showRegister"},"button[action=sioRegister]":{tap:"doRegister"},"button[action=cancellogin]":{tap:"hideLogin"}},items:[{docked:"top",xtype:"titlebar",title:"Login",items:[{text:"cancel",action:"cancellogin"},{text:"register",action:"showRegister",align:"right"}]},{xtype:"panel",layout:"fit",items:[{xtype:"formpanel",items:[{xtype:"fieldset",items:[{xtype:"textfield",placeHolder:"Username",name:"username"},{xtype:"passwordfield",placeHolder:"Password",name:"password"},{xtype:"emailfield",placeHolder:"Email",name:"email",hidden:true},{xtype:"button",text:"Login",action:"siologin"},{xtype:"button",text:"Register",action:"sioRegister",hidden:"true"}]}]}]}]},resetForm:function(){this.setMasked(false);var a=this.getForm();a.reset();this.getEmailField().hide();this.getRegisterBtn().hide();this.getLoginBtn().show()},doAuth:function(){this.setMasked({xtype:"loadmask",message:"Authorizing",indicator:true});var b=this.getForm();var a=b.getValues();this.fireEvent("loginUser",a)},showLoginErrors:function(){this.setMasked(false);Ext.Msg.alert("Login Error","Invalid username or passsword",Ext.emptyFn)},doRegister:function(){this.setMasked({xtype:"loadmask",message:"Creating Account",indicator:true});var b=this.getForm();var a=b.getValues();this.fireEvent("registerUser",a)},showRegister:function(){var a=this.getEmailField();a.show();this.getRegisterBtn().show();this.getLoginBtn().hide()},showRegisterErrors:function(a){this.setMasked(false);Ext.Msg.alert("Register Error","Could not create user",Ext.emptyFn)},hideLogin:function(){this.fireEvent("cancel")},getForm:function(){return this.query(".formpanel")[0]},getEmailField:function(){return this.query(".emailfield")[0]},getRegisterBtn:function(){return this.query("button[action=sioRegister]")[0]},getLoginBtn:function(){return this.query("button[action=siologin]")[0]}})}if(!Ext.getVersion("extjs")){Ext.define("Ext.io.ux.AuthFacebook",{extend:"Ext.Container",requires:["Ext.TitleBar","Ext.form.Panel","Ext.form.FieldSet","Ext.field.Password","Ext.field.Email"],config:{id:"loginpanel",fullscreen:true,control:{"button[action=cancellogin]":{tap:"hideLogin"}},items:[{docked:"top",xtype:"titlebar",title:"Login",items:[{text:"cancel",action:"cancellogin"}]},{xtype:"panel",html:"To use this application please sign in with your Facebook account.",padding:"20%",align:"center"},{xtype:"button",text:"Login with Facebook",disabled:true,width:"80%",action:"fblogin",ui:"action",margin:"20%",align:"center"}]},loginButtonTapped:function(a){console.log("argum",arguments);a.setDisabled(true);this.setMasked({xtype:"loadmask",message:"Loading Facebook",indicator:true});document.location.href=this.redirectUrl},initialize:function(){var b=this.config.group.getData().fb;if(!b){console.error("Facebook not configured for group.",group);allback.call(scope,false)}var c=b.appId;this.redirectUrl="https://m.facebook.com/dialog/oauth?"+Ext.Object.toQueryString({redirect_uri:window.location.protocol+"//"+window.location.host+window.location.pathname,client_id:c,response_type:"token",bustCache:new Date().getTime()});var a=this.query("button[action=fblogin]")[0];if(a){a.on({tap:this.loginButtonTapped,scope:this});a.setDisabled(false)}else{console.error("Could not find a button[action=fblogin] in the AuthFacebook view.  User won't be able to login.")}},resetForm:function(){},showLoginErrors:function(){},hideLogin:function(){this.fireEvent("cancel")}})}Ext.define("Ext.io.Controller",{extend:"Ext.app.Controller",requires:["Ext.io.Io","Ext.io.User","Ext.io.ux.Authenticate","Ext.io.ux.AuthFacebook"],config:{authenticationView:"Ext.io.ux.Authenticate",control:{authButton:{tap:"authButtonTap"}},refs:{authButton:".sioAuthButton"}},init:function(){var a=this.getApplication().config.io;a.authOnStartup=a.authOnStartup==undefined?true:a.authOnStartup;a.manualLogin=a.manualLogin==undefined?false:a.manualLogin;var b=this;this.getApplication().sio=b;Ext.Io.setup(a);this.on({checkingAuth:this.updateButtonDisable,authorized:this.updateButtonLogin,registered:this.updateButtonLogin,nouser:this.updateButtonLogout,logout:this.updateButtonLogout,scope:this});Ext.Io.init(function(){if(a.authOnStartup){b.auth()}b.fireEvent("initComplete")})},updateButtonDisable:function(){var a=this.getAuthButton();if(a){this.getAuthButton().setDisabled(true);this.getAuthButton().setText("---")}return true},updateButtonLogin:function(){var a=this.getAuthButton();if(a){this.getAuthButton().setDisabled(false);this.getAuthButton().setText("Logout")}return true},updateButtonLogout:function(){var a=this.getAuthButton();if(a){this.getAuthButton().setDisabled(false);this.getAuthButton().setText("Login")}return true},authButtonTap:function(){this.getUser(function(a,b){if(a){this.logout()}else{this.login()}})},launch:function(){},auth:function(){this.login(!this.getApplication().config.io.manualLogin)},login:function(a){if(Ext.cf.util.ParamValidator.validateApi([{name:"showLoginIfNoAuth",type:"boolean",optional:true}],arguments,"Ext.io.Controller","login")){this.checkAuth(a)}},checkAuth:function(a){this.fireEvent("checkingAuth");this.getGroup(function(c){if(!c){console.error("Cannot login, application does not have a group.");return}this.group=c;var d=c.getAuthMethod();var b=this.authMethods[d];this.authMethod=b;this.getUser(function(f){if(b){this.setAuthenticationView(b.defaultLoginView)}var g=function(i,h){if(i&&f){this.onAuth(f)}else{if(i&&h){this.authMethod.onAuth(h,this.onLoginUser,this)}else{this.fireEvent("nouser");if(a!==false){this.showLogin()}}}};var e=function(){this.authMethod.checkAuth(this.group,g,this)};if(b){b.init(e,this)}else{if(f){this.onAuth(f)}else{this.fireEvent("nouser");if(a!==false){this.showLogin()}}}})})},onAuth:function(a){this.user=a;a.on("message",function(c,d){var b=c.getUserId();this.fireEvent("usermessage",c,d)},this);this.hideLogin();this.fireEvent("authorized",a)},showLogin:function(a){if(!this.loginPanel){this.createLogin()}else{if(a!==true){this.loginPanel.resetForm()}}this.previousActiveItem=Ext.Viewport.getActiveItem();Ext.Viewport.setActiveItem(this.loginPanel)},createLogin:function(){if(!this.loginPanel){this.loginPanel=Ext.create(this.getAuthenticationView(),{group:this.group});this.loginPanel.on({loginUser:this.onLoginUser,cancel:this.hideLogin,registerUser:this.registerUser,scope:this});Ext.Viewport.add(this.loginPanel)}},onLoginUser:function(a){Ext.io.User.authenticate(a,function(b,c){if(b){this.onAuth(b)}else{this.showLogin(true);this.loginPanel.showLoginErrors()}},this)},registerUser:function(a){if(a.username.length>0&&a.password.length>0&&a.email.length>0){Ext.io.User.register({username:a.username,password:a.password,email:a.email},function(b,c){if(b){this.hideLogin();this.fireEvent("registered",b);this.onAuth(b)}else{this.loginPanel.showRegisterErrors(c)}},this)}else{this.loginPanel.showRegisterErrors({error:"missing fields"})}},hideLogin:function(){if(this.previousActiveItem){Ext.Viewport.setActiveItem(this.previousActiveItem);delete this.previousActiveItem}},logout:function(){this.getUser(function(a){if(a){a.logout();this.logoutExternal()}this.fireEvent("logout")})},logoutExternal:function(){if(this.authMethod&&this.authMethod.logout){this.authMethod.logout()}},getUser:function(b,a){if(!b){return}a=a||this;b=b||Ext.emptyFn;Ext.io.User.getCurrent(function(c,d){b.call(a,c,d)})},getGroup:function(b,a){if(!b){return}a=a||this;b=b||Ext.emptyFn;Ext.io.Group.getCurrent(function(c,d){b.call(a,c,d)})},isConected:function(){return true},authMethods:{facebook:{defaultLoginView:"Ext.io.ux.AuthFacebook",initComplete:false,init:function(c,b){var a=Ext.bind(c,b);if(this.initComplete){a()}Ext.DomHelper.insertBefore(document.body.firstChild,'<div id="fb-root" style="display: none;"></div>');window.fbAsyncInit=Ext.bind(function(){this.initComplete=true;a()},this);(function(f){var e,g="facebook-jssdk";if(f.getElementById(g)){return}e=f.createElement("script");e.id=g;e.async=true;e.src="//connect.facebook.net/en_US/all.js";f.getElementsByTagName("head")[0].appendChild(e)}(document))},checkAuth:function(d,e,c){var b=d.getData().fb;if(!b){console.error("Facebook not configured for group.",d);allback.call(c,false)}FB.init({appId:b.appId,cookie:true});FB.getLoginStatus(function(f){clearTimeout(a);e.call(c,f.status=="connected",f)});var a=setTimeout(function(){Ext.Viewport.setMasked(false);Ext.create("Ext.MessageBox",{title:"Facebook Error",message:["Facebook Authentication is not responding. ","Please check your Facebook app is correctly configured, ","then check the network log for calls to Facebook for more information.","Restart the app to try again."].join("")}).show()},10000)},onAuth:function(d,e,b){var c=this,a;FB.api("/me",function(f){if(f.error){FB.logout();a="Facebook "+f.error.type+" error";Ext.Msg.alert(a,f.error.message,function(){c.login()})}else{var g={username:f.username,email:f.email||(f.username+"@facebook.com"),id:f.id,name:f.name,auth:{access_token:d.authResponse.accessToken},info:{profilelink:f.link,locale:f.locale}};e.call(b,g)}})},logout:function(b,a){if(FB){FB.logout()}else{console.error("facebook javascript library not included in page. Could not logout user.")}}}}});