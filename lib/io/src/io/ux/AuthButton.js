/**
*  
A simple user state button that allows the user to login or out of the application
Works with Ext.io.Controller to automatically display either Login (of the user is not authenticated), Logout (if the user is authenticated)
The button will be disabled with a loading indicator while the application is attempting to login the user.

AuthButton extends Button so any valid Ext.Button config can be passed to customize the buttons appearance:

    {
        xtype: 'titlebar',
        docked: 'top',
        title: 'To Do',
        items: [ {
              xtype: "sioAuthButton",
              align: "right"
          }]
    },



*/
if (!Ext.getVersion('extjs')) {
    Ext.define('Ext.io.ux.AuthButton', {
        extend: 'Ext.Button',
        xtype: "sioAuthButton",

        requires: [
        "Ext.Button"
        ],

        config: {
            text: "Login"
        }
    });
}