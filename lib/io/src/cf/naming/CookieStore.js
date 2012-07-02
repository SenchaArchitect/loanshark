/**
 * @private
 *
 * Cookie class to read a key from cookie
 * https://developer.mozilla.org/en/DOM/document.cookie
 */
Ext.define('Ext.cf.naming.CookieStore', {
    /**
     * Has cookie item?
     *
     * @param {String} sKey
     *
     * @return {Boolean} True/False
     *
     */
    hasItem: function (sKey) {
        return (new RegExp("(?:^|;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(document.cookie);
    },

    /**
     * Get cookie item
     *
     * @param {String} sKey
     *
     * @return {String} Cookie value
     *
     */
    getItem: function (sKey) {
        if (!sKey || !this.hasItem(sKey)) { return null; }
        return unescape(document.cookie.replace(new RegExp("(?:^|.*;\\s*)" + escape(sKey).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"), "$1"));
    },

    /**
     * Set cookie item
     *
     * @param {String} sKey
     * @param {String} sValue
     *
     */
    setItem: function (sKey, sValue) {
        document.cookie= escape(sKey)+'='+escape(sValue) + "; path=/;";

        var count = this.countSubStrings(document.cookie, sKey);
        if(count > 1) {
            Ext.cf.util.Logger.error("Found", count, "cookies with the name", sKey);
        }
    },

    /**
     * @private
     * Count no. of substrings in a string
     *
     * @param {String} string
     * @param {String} substring
     *
     */
    countSubStrings: function(string, substring){
        var n = 0;
        var index = 0;

        while(true) {
            index = string.indexOf(substring, index);
            if(index != -1) {
                n++; 
                index += substring.length;
            } else {
                break;
            }
        }

        return n;
    },

    /**
     * Remove cookie item
     *
     * @param {String} sKey
     * @param {String} domain
     *
     */
    removeItem: function (sKey, domain) {
        domain = domain || window.location.host || '';

        if (!sKey || !this.hasItem(sKey)) { return; }  
        var oExpDate = new Date();  
        oExpDate.setDate(oExpDate.getDate() - 1);  

        // remove cookie without path
        document.cookie = escape(sKey) + "=; expires=" + oExpDate.toGMTString() + ";";  
        
        // remove cookie with path but without domain
        document.cookie = escape(sKey) + "=; expires=" + oExpDate.toGMTString() + "; path=/;";  

        // remove cookie set with path, domain
        document.cookie = escape(sKey) + "=; expires=" + oExpDate.toGMTString() + "; path=/;" + "domain=" + domain + ";";  
        
        var indexOfDot = domain.indexOf(".");
        if(indexOfDot != -1) {
            // remove cookie from base domain too (cleans cross-domain cookies)
            domain = domain.substr(indexOfDot);

            // remove cookie without path
            document.cookie = escape(sKey) + "=; expires=" + oExpDate.toGMTString() + "; " + "domain=" + domain + ";";    

            // remove cookie with path
            document.cookie = escape(sKey) + "=; expires=" + oExpDate.toGMTString() + "; path=/;" + "domain=" + domain + ";";    
        }        
    }
});

