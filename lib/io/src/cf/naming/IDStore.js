/**
 * @private
 *
 */
 Ext.define('Ext.cf.naming.IDStore', {
    requires: [
        'Ext.cf.naming.CookieStore',
        'Ext.cf.naming.LocalStore',
        'Ext.cf.naming.SessionStore'
    ],

    config: {
        cookieStore: null,
        localStore: null,
        sessionStore: null
    },

    /**
     * Constructor
     */
    constructor: function(){
        this.setCookieStore(Ext.create('Ext.cf.naming.CookieStore'));
        this.setLocalStore(Ext.create('Ext.cf.naming.LocalStore'));
        this.setSessionStore(Ext.create('Ext.cf.naming.SessionStore'));
    },

    /**
     * Get the id for the current object of a class.
     *
     * @param {String} klass
     *
     */
    getId: function(klass) {
        var store_key= 'sencha.io.'+klass+'.id';
        return this.getLocalStore().getItem(store_key);
    },

    /**
     * Get the key for the current object of a class.
     *
     * @param {String} klass
     *
     */
    getKey: function(klass) {
        var store_key= 'sencha.io.'+klass+'.key';
        return this.getLocalStore().getItem(store_key);
    },

    /**
     * Get the session id for the current object of a class.
     *
     * @param {String} klass
     *
     */
    getSid: function(klass) {
        var cookie_key = klass+'.sid';
        return this.getCookieStore().getItem(cookie_key);
    },

    /**
     * Set the id for the current object of a class.
     *
     * @param {String} klass
     * @param {Number/String} id
     *
     */
    setId: function(klass,id) {
        var store_key= 'sencha.io.'+klass+'.id';
        return this.getLocalStore().setItem(store_key,id);
    },

    /**
     * Set the key for the current object of a class.
     *
     * @param {String} klass
     * @param {Number/String} key
     *
     */
    setKey: function(klass,key) {
        var store_key= 'sencha.io.'+klass+'.key';
        return this.getLocalStore().setItem(store_key,key);
    },

    /**
     * Set the session id for the current object of a class.
     *
     * @param {String} klass
     * @param {Number/String} sid
     *
     */
    setSid: function(klass,sid) {
        var cookie_key = klass+'.sid';
        return this.getCookieStore().setItem(cookie_key,sid);
    },

    /**
     * Remove
     *
     * @param {String} klass
     * @param {String} thing
     *
     */
    remove: function(klass,thing) {
        var cookie_key = klass+'.'+thing;
        var store_key= 'sencha.io.'+cookie_key;
        this.getCookieStore().removeItem(cookie_key);
        this.getSessionStore().removeItem(cookie_key);
        this.getLocalStore().removeItem(store_key);            
    },

    /**
     * Stash
     *
     * @param {String} klass
     * @param {String} thing
     * @param {String/Number} default_value
     *
     */
    stash: function(klass,thing,default_value) {
        var cookie_key = klass+'.'+thing;
        var store_key= 'sencha.io.'+cookie_key;
        var id_in_cookie = this.getCookieStore().getItem(cookie_key) || default_value;
        var id_in_store = this.getLocalStore().getItem(store_key);
        if (id_in_cookie) {
            if (id_in_store) {
                // it's in the cookie, and in the store...
                if (id_in_cookie!=id_in_store) {
                    // ...but it isn't the same, this shouldn't happen. Fix it.
                    this.getLocalStore().setItem(store_key,id_in_cookie);
                } else {
                    // ...and they are the same.
                }
            } else {
                // it's in the cookie, but not in the store.
                this.getLocalStore().setItem(store_key,id_in_cookie);
            }
        } else {
            
        }
        return id_in_cookie || id_in_store;
    }

});



