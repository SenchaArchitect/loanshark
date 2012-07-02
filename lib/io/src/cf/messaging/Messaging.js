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

