/**
 * @class Ext.io.Controller

 Application controller for Sencha.io.  This controller when added to an application manages the connection to the Sencha.io servers.
 It provides automatic management of user authentication via a login screen that can be customized to meet your application's needs.

 When declaring an application add Ext.io.Controller to the front of your controller list.

      Ext.application({
      controllers: ['Ext.io.Controller', .... ],

 Then add an io configuration block to your applications config:

         config: {
          io: {
              appId: "PdEEnxvKxCOchL45TcAFg3DARgh",
              appSecret: "NiLuNNNPGYZNuLcK"
          }    
         }


 For a full set of options see {Ext.io.Io.setup}

Authentication
====
 

 By default Ext.io.Controller will attempt to authenticate the user after it connects to the server. 
 - If the user already has a valid session then the "authorized" event will fire with the user object.  
 - If there is not a valid user session then Controller will create a view using the authenticationView as the type. It will then add the view to the viewport and present the user with a login screen.  
 - If the user can enter a valid username and password then the "authenticated" event will fire and the user will be able to access their data. 
 - If the user chooses to register a new account then the "registered" event will fire. 


 Authentication methods
 ---

 Sencha.io currently supports two login methods: Sencha.io account and Facebook. The application developer chooses the authentication for the application
 when configuring the user group of the application. If the Sencha.io account is activated then a default login dialog is presented that allows the user 
 to either login or create a new account.  If Facebook is chosen an the correct Facebook keys are provided then Ext.io.Controller will handle the 
 Facebook authorization sequence.  It will automatically load the Facebook javascript library.



 Authentication on startup
 ---

 If you don't want to attempt to authenticate then you can add an optional flag to the io config of your application:

         config: {
              io: {
                      appId: "PdEEnxvKxCOchL45TcAFg3DARgh",
                      appSecret: "NiLuNNNPGYZNuLcK",
                      authOnStartup: false
              }    
         }

 Manual Login
 ---

 If you don't want to automatically trigger the login panel when your application starts then set manualLogin to true:

         config: {
              io: {
                      appId: "PdEEnxvKxCOchL45TcAFg3DARgh",
                      appSecret: "NiLuNNNPGYZNuLcK",
                      manualLogin: true
              }    
         }

 Later when you are ready to login to the application:

     yourapplication.sio.login();


 setting `manualLogin` to `false` and `authOnStartup` to `true` will let your users who are already authenticated gain access to registered user only features, while not forcing everyone to authenticate before using any feature of the application.


Logout
====

 The application should listen for the logout event fired by the controller.  Upon receiving the logout event the application should clear any local data that it has stored for the user.  This includes clearing the local content of any created syncstores:

     onLogout: function() {
         var store = Ext.getStore('yourstoreId');
         store.getProxy().clear();
         store.load();
         return true;
     },


Other Controllers
====

 For ease of use a reference to this controller is added to the your application. You can reference it from any other controller in your application easily:

      this.getApplication().sio

 Your application's controllers who need access to io's events can add this code to their controller


     init: function() {
         this.getApplication().sio.on({
             authorized: {fn: this.onAuth, scope: this},
             logout: {fn: this.onLogout, scope: this}
         });      
     },

 With this code on init your controller will listen for the authorized and logout events and execute the onAuth and onLogout of your controller respectively. 




 *
 *
 *
 */
Ext.define('Ext.io.Controller', {

    extend: 'Ext.app.Controller',

    requires: [
    'Ext.io.Io',
    'Ext.io.User',
    'Ext.io.data.Proxy',
    "Ext.io.ux.Authenticate",
    "Ext.io.ux.AuthFacebook"
    ],

        /**
        * @event initComplete
        * Fired when .io has made a connection to the sencha.io servers.
        */
        
         /**
        * @event checkingAuth
        * Fired when {Ext.io.Controller} is attmpeting to authorize the user.
        * either using an existing session or via explicit login
        * @param {Ext.io.User} user The authenticated user.
        */
    
        /**
        * @event authorized
        * Fired when the user of this application has successfully authenticated
        * either using an existing session or via explicit login
        * @param {Ext.io.User} user The authenticated user.
        */

        /**
         * @event usermessage
         * Fired when the user receives a message.
         * @param {Ext.io.User} sender The user who sent the message
         * @param {Object} the message sent.
         */

        /**
         * @event registered
         * Fired when the user had registered a new account. and is successfully authorized 
         * @param {Ext.io.User} user The authenticated user.
         */

        /**
         *@event nouser
         * Fired when there isn't a valid session after an auth attempt but before the user
         * is presneted with a login screen.
         */


        /**
         *@event logout
         * Fired when the user removes their session after logout is complete.
         */

        config: {

            /**
             * @cfg {String} authenticationView
             * Name of the view to display when authenticating the user. 
             * To provide a custom auth screen see {Ext.io.ux.Authenticate} for required interface.
             * @accessor
             */
            authenticationView: "Ext.io.ux.Authenticate",


            control: {
                authButton: {
                    tap: "authButtonTap"
                }

            },

            refs: {
                authButton: ".sioAuthButton"
            }
        },


        /**
         * @private
         *
         */
        init: function() {

            var conf = this.getApplication().config.io;

            //TODO cleanup with a proper mixin/library function
            conf.authOnStartup = conf.authOnStartup == undefined ? true: conf.authOnStartup;
            conf.manualLogin = conf.manualLogin == undefined ? false: conf.manualLogin;

            //        console.log("IO.init", this, conf);
            var io = this;
            /*
            * add a getter for IO to the application for easy access. 
            */
            this.getApplication().sio = io;

            Ext.Io.setup(conf);

            this.on({
                checkingAuth: this.updateButtonDisable,
                authorized: this.updateButtonLogin,
                registered: this.updateButtonLogin,
                nouser: this.updateButtonLogout,
                logout: this.updateButtonLogout,
                scope: this
            });

            Ext.Io.init(function() {
                //console.log('launch.authOnStartup', conf.authOnStartup, conf.manualLogin);
                if (conf.authOnStartup) {
                    io.auth();
                }
                
                io.fireEvent("initComplete");
                    
                    
            });


        },


        /**
         * @private
         * updateButtonDisable
         */
        updateButtonDisable: function() {
            var btn = this.getAuthButton();
            if(btn) {
                this.getAuthButton().setDisabled(true);
                this.getAuthButton().setText("---");
            }
            return true;
        },

        /**
         * @private
         * updateButtonLogin
         */
        updateButtonLogin: function() {
            var btn = this.getAuthButton();
            if(btn) {
                this.getAuthButton().setDisabled(false);
                this.getAuthButton().setText("Logout");
            }
            return true;
        },


        /**
         * @private
         * updateButtonLogout
         */
        updateButtonLogout: function() {
            var btn = this.getAuthButton();
            if(btn) {
                this.getAuthButton().setDisabled(false);
                this.getAuthButton().setText("Login");
            }
            return true;
        },

        /**
         * @private
         * authButtonTap
         */
        authButtonTap: function() {
            this.getUser(function(user,errors) {
                if (user) {
                    this.logout();
                } else {
                    this.login();
                }
            });
        },

        /**
         * @private
         */
        launch: function() {
             

        },


        /**
        * @private
        */
        auth: function() {
            this.login(!this.getApplication().config.io.manualLogin);
        },

        /**
         * Authenticate the user to the application. 
         *  The user must be a memeber of the application's group.
         *
         * @param {Boolean} showLoginIfNoAuth
         */
        login: function(showLoginIfNoAuth) {

            if (Ext.cf.util.ParamValidator.validateApi([
            {
                name: "showLoginIfNoAuth",
                type: "boolean",
                optional: true
            }
            ], arguments, "Ext.io.Controller", "login")) {
                this.checkAuth(showLoginIfNoAuth);
            }

        },

        /**
         * @private
         *  checkAuth gets the group's auth method.  IF one exits then it will call
         *  the 3rd party auth first to see if the user is authenticated.  If not 
         *  then show the login.
         *
         *  If we are using the default auth method (sencha.io login) then we can directly
         *  show the login dialog. 
         *
         *  In either case if showLoginIfNoAuth is set to false then we will do auth only.
         *
         * @param {Boolean} showLoginIfNoAuth
         */
        checkAuth: function(showLoginIfNoAuth) {
            this.fireEvent("checkingAuth");


            this.getGroup(function(group) {
                if (!group) {
                    console.error("Cannot login, application does not have a group.");
                    return;
                }
                this.group = group;
                var method = group.getAuthMethod();

                var authMethod = this.authMethods[method];
                this.authMethod = authMethod;

                //console.log("authMethod", this.authMethod);


                this.getUser(function(user) {
                    //console.log("authMethod.getUser", sioIsAuth, user);
                    if (authMethod) {
                        this.setAuthenticationView(authMethod.defaultLoginView);
                    }

                    var afterAuthCheck = function(isAuth, auth) {
                        //console.log("authMethod.checkAuth", isAuth, auth, sioIsAuth, user);
                        if (isAuth && user) {
                            //User is both authorized by io and by the external.
                            // user is authorized to use the app.
                            this.onAuth(user);
                        } else if (isAuth && auth) {
                            //User is authneticated with extneral but not with io
                            // attempt to auth after fetching extenal account details.
                            this.authMethod.onAuth(auth, this.onLoginUser, this);
                        } else {
                            this.fireEvent("nouser");
                            //No user or external user so we must login.
                            if (showLoginIfNoAuth !== false) {
                                this.showLogin();
                            }
                        }

                    };

                    var afterInit = function() {
                        this.authMethod.checkAuth(this.group, afterAuthCheck, this);
                    };

                    if (authMethod) {
                        authMethod.init(afterInit, this)
                    } else if (user) {
                        //we have a user an no external auth so we are done.
                        this.onAuth(user);
                    } else {
                        //No user so we must login.
                        this.fireEvent("nouser");
                        if (showLoginIfNoAuth !== false) {
                            this.showLogin();
                        }
                    }

                });


            });

        },

        /**
        * @private
        *
        * @param {Object} user object
        */
        onAuth: function(user) {
            this.user = user;
            
            //listend to user message events, and refire them
            // on the controller. 
            user.on("message", function(sender, message) {
                var userId = sender.getUserId();
                this.fireEvent("usermessage", sender, message);
            }, this);
        
            this.hideLogin();
        
            this.fireEvent("authorized", user);

        },

        /**
        *@private
        *
        * @param {Boolean} noReset
        */
        showLogin: function(noReset) {
            if (!this.loginPanel) {
                this.createLogin();
            } else {
                if(noReset !== true){
                    this.loginPanel.resetForm();  
                }
            }
            this.previousActiveItem = Ext.Viewport.getActiveItem();
            Ext.Viewport.setActiveItem(this.loginPanel);
        },
        
        
        /**
        *@private
        */
         createLogin: function() {
            if (!this.loginPanel) {
                this.loginPanel = Ext.create(this.getAuthenticationView(), {
                    group: this.group
                });
                this.loginPanel.on({
                    loginUser: this.onLoginUser,
                    cancel: this.hideLogin,
                    registerUser: this.registerUser,
                    scope: this
                });
                Ext.Viewport.add(this.loginPanel);
            } 
        },


        /**
         * @private
         *
         * @param {Object} auth
         */
        onLoginUser: function(auth) {
            Ext.io.User.authenticate(
                auth,
                function(user,errors) {
                    if (user) {
                        this.onAuth(user);
                    } else {
                        this.showLogin(true); //make sure the login exists before we attempt to show errors.
                        //edge case that hopefuly won't happen in production 
                        this.loginPanel.showLoginErrors();
                    }
                },
            this);
        },


        /**
         * @private
         *
         * @param {Object} reg object
         */
        registerUser: function(reg) {
            if (reg.username.length > 0 && reg.password.length > 0 && reg.email.length > 0) {
                Ext.io.User.register({
                    username: reg.username,
                    password: reg.password,
                    email: reg.email
                },
                function(user, error) {
                        if (user) {
                        this.hideLogin();
                        this.fireEvent("registered", user);
                        this.onAuth(user);
                    } else {
                        this.loginPanel.showRegisterErrors(error);
                    }
                },
                this
                );
         
            } else {
                //TODO error handling.
            }

        },

        /**
         * @private
         */
        hideLogin: function() {
            if (this.previousActiveItem) {
                Ext.Viewport.setActiveItem(this.previousActiveItem);
                delete this.previousActiveItem;
            }
        },


        /**
        * Removes all local data about the user and disconnects from the io servers if connected.
        */
        logout: function() {
            this.getUser(function(user) {
                if (user) {
                    user.logout();
                    this.logoutExternal();
                }
                this.fireEvent("logout");
            });
        },


        /**
        *@private
        */
        logoutExternal: function() {
            if (this.authMethod && this.authMethod.logout) {
                this.authMethod.logout();
            }

        },

        /**
        * Get a reference to the current user.
        * @private  
        * @param {Function} callback The function to be called after execution.
        * The callback is passed the following parameters:
        * @param {Boolean} callback.isAuth true if there is a valid user session
        * @param {Object}  callback.user the current user.
        * @param {Object} scope scope to execute callback in.  Defaults to the controller's scope.
        */
        getUser: function(callback, scope) {
            if (!callback) {
                return;
            }
            scope = scope || this;
            callback = callback || Ext.emptyFn;

            Ext.io.User.getCurrent(function(user, errors) {callback.call(scope, user, errors);});

        },


        /**
        * @private
        * Get a reference to the application's group
        * @param {Function} callback The function to be called after execution.
        * @param {Object} scope scope to execute callback in.  Defaults to the controller's scope.
        */
        getGroup: function(callback, scope) {
            if (!callback) {
                return;
            }
            scope = scope || this;
            callback = callback || Ext.emptyFn;

            Ext.io.Group.getCurrent(
                function(group, errors) {
                    callback.call(scope,  group, errors);
                }
            );

        },

        /**
        * @private
        * Are we connected to the IO servers?
        */
        isConected: function() {
            //console.log("IO.isConected");
            return true;
        },


        /*
        * @private
        *  authMethods is the glue code for each of the 
        *  3rd party auth services.  This should be factored out
        *  of Controller at some point. 
        */
        authMethods: {

            facebook: {

                defaultLoginView: "Ext.io.ux.AuthFacebook",

                initComplete: false,

                /**
                * @private
                * Called once per application load. Bootstraps the FB js code, required dom and events.
                *  Executes callback in scope when init is finalized. 
                * @param {Function} callback The function to be called after execution.
                * @param {Object} scope scope to execute callback in.  Defaults to the controller's scope.
                */
                init: function(callback, scope) {

                    //console.log("fb init", this.initComplete);
                    var cb = Ext.bind(callback, scope);
                    if (this.initComplete) {
                        cb();
                    }

                    Ext.DomHelper.insertBefore(document.body.firstChild, '<div id="fb-root" style="display: none;"></div>')

                    window.fbAsyncInit = Ext.bind(function() {
                        this.initComplete = true;
                        cb();
                    },
                    this);

                    (function(d) {
                        var js,
                        id = 'facebook-jssdk';
                        if (d.getElementById(id)) {
                            return;
                        }
                        js = d.createElement('script');
                        js.id = id;
                        js.async = true;
                        js.src = "//connect.facebook.net/en_US/all.js";
                        d.getElementsByTagName('head')[0].appendChild(js);
                    } (document));                                                                              


                },


                checkAuth: function(group, callback, scope) {
                    var fbConf = group.getData().fb;
                    
                    if(!fbConf) {
                        console.error("Facebook not configured for group.", group);
                        allback.call(scope, false);
                    }
                    
                    FB.init({
                        appId: fbConf.appId,
                        cookie: true
                    });

                    //  FB.Event.subscribe('auth.logout', Ext.bind(me.onLogout, me));
                    //console.log("onFacebookInit two");
                    FB.getLoginStatus(function(response) {
                        //console.log("getLoginStatus", arguments);
                        clearTimeout(fbLoginTimeout);
                        callback.call(scope, response.status == 'connected', response);
                    });

                    var fbLoginTimeout = setTimeout(function() {

                        Ext.Viewport.setMasked(false);

                        Ext.create('Ext.MessageBox', {
                            title: 'Facebook Error',
                            message: [
                            'Facebook Authentication is not responding. ',
                            'Please check your Facebook app is correctly configured, ',
                            'then check the network log for calls to Facebook for more information.',
                            'Restart the app to try again.'
                            ].join('')
                        }).show();

                    },
                    10000); 

                },


                onAuth: function(auth, callback, scope) {
                    var me = this,
                    errTitle;

                    FB.api('/me',
                    function(response) {

                        //console.log("/me", arguments);
                        if (response.error) {
                            FB.logout();

                            errTitle = "Facebook " + response.error.type + " error";
                            Ext.Msg.alert(errTitle, response.error.message,
                            function() {
                                me.login();
                            });
                        } else {
                            //console.log("onLogin", auth.authResponse, auth, response);
                            var authuser = {
                                username: response.username,
                                email: response.email || (response.username + "@facebook.com"),
                                // remove this onece server validation rules are pushed.
                                id: response.id,
                                name: response.name,
                                auth: {
                                    access_token: auth.authResponse.accessToken
                                },
                                info: {
                                    profilelink: response.link,
                                    locale: response.locale
                                }
                            }
                            //console.log("authuser", authuser);
                            callback.call(scope, authuser);
                        }
                    });
                },

                logout: function(callback, scope) {
                    if (FB) {
                        FB.logout();
                    } else {
                        console.error("facebook javascript library not included in page. Could not logout user.");
                    }

                }
            }

        }

});