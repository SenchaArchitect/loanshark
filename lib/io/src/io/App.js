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

