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
