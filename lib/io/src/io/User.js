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
