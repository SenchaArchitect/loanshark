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