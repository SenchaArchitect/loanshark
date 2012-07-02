/**
* Default Facebook login panel.  Ext.io.Controller will automatically display this panel if the application is configured to use Facebook as its login type. 
*
*/
if (!Ext.getVersion('extjs')) {
    Ext.define("Ext.io.ux.AuthFacebook", {
        extend: 'Ext.Container',
        requires: ["Ext.TitleBar","Ext.form.Panel", "Ext.form.FieldSet", "Ext.field.Password", "Ext.field.Email"],




   /**
     * @event loginUser
     * Fired when the user has entered their auth credentials.
     * {Ext.io.Controller} listens for this event and will attempt to login 
     * the user with the passed credentials. 
     * @param {Object} auth Key/values given by the user to authenticate with.
     */

    /**
      * @event cancel
      * Fired when the user doesn't want to login.
      * {Ext.io.Controller} listens for this event and will 
      * close the login pannel.
      */


        /**
        * @private
        * config
        */
        config: {
            id: "loginpanel",
            fullscreen: true,
           
            control: {
                "button[action=cancellogin]": {
                    tap: "hideLogin"
                }
            },
            items: [
                {
                    docked: 'top',
                    xtype: 'titlebar',
                    title: 'Login',
                    items: [
                    {
                        text: "cancel",
                        action: "cancellogin"
                    }
                    ]
                },
                {
                  xtype: "panel",
                  html: "To use this application please sign in with your Facebook account.",
                  padding: "20%",
                  align: "center"
                },
                {
                  xtype: "button",
                  text: "Login with Facebook",
                  disabled: true,
                  width: "80%",
                  action: "fblogin",
                  ui: 'action',
                  margin: "20%",
                  align: "center"
                }
            ]
        },
        
        /**
        * Login button tapped
        */
        loginButtonTapped: function(button) {
          console.log("argum", arguments);
          button.setDisabled(true);    
          document.location.href=this.redirectUrl;
        },


        /**
        * Initialize
        */
        initialize: function() {

              var fbConf = this.group.getData().fb;
              
              if(!fbConf) {
                console.error("Facebook not configured for group.", group);
                allback.call(scope, false);
              }
            
            
            var facebookAppId = fbConf.appId;

            this.redirectUrl = "https://m.facebook.com/dialog/oauth?" + Ext.Object.toQueryString({
                redirect_uri: window.location.protocol + "//" + window.location.host + window.location.pathname,
                client_id: facebookAppId,
                response_type: 'token',
                bustCache: new Date().getTime()
            });
            
            var button = this.query("button[action=fblogin]")[0];
            
            if(button) {
              button.on({
                tap:  this.loginButtonTapped,
                scope: this
              });
              button.setDisabled(false)  
            } else {
              console.error("Could not find a button[action=fblogin] in the AuthFacebook view.  User won't be able to login.");
            }
            
        },


        /**
        * Reset the form to its default state.
        */
        resetForm: function() {
        //NA
        },


        /**
        * {Ext.io.Controller} will call this method when login fails.
        */
        showLoginErrors: function() {
            //NA //Ext.Msg.alert('Login Error', 'Invalid username or passsword', Ext.emptyFn);
        },


        /**
        * @private
        */
        hideLogin: function() {
            this.fireEvent("cancel");
        }


    });
}