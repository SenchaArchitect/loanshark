/**
 * @private
 *
 */
Ext.define('Ext.cf.naming.SessionStore', {
    /**
    * Get item
    *
    * @param {String/Number} key
    *
    */
    getItem: function(key) {
        var store= window.sessionStorage;
        if (store) {
            return store.getItem(key);
        }
    },

    /**
    * Set item
    *
    * @param {String/Number} key
    * @param {String/Number} value
    *
    */
    setItem: function(key,value) {
        var store= window.sessionStorage;
        if (store) {
            store.setItem(key,value);
        }
    },

    /**
    * Remove item
    *
    * @param {String/Number} key
    *
    */
    removeItem: function(key) {
        var store= window.sessionStorage;
        if (store) {
            store.removeItem(key);
        }
    }
});