Ext.setVersion('sio', '0.3.3');
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

