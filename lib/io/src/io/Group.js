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
