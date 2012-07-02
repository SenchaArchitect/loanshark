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

