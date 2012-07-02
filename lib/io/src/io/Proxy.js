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
