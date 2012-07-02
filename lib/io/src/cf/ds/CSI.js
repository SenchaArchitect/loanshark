/**
 * @private
 *
 * Change Stamp Index
 *
 * Index of a set of Object Identifiers for a single replica, by time, t.
 */
Ext.define('Ext.cf.ds.CSI', {
    
    map: {}, // t => set of oids
    v: [],   // t, in order
    dirty: false, // if v needs rebuild
    
    /** 
     * Constructor
     *
     */
    constructor: function() {
        this.clear();
    },
    
    /** 
     * Clear
     *
     */
    clear: function() {
        this.map= {};
        this.v= [];
        this.dirty= false;
    },
    
    /** 
     * Add
     *
     * @param {String/Number} t
     * @param {String} oid
     *
     */
    add: function(t,oid) {
        var l= this.map[t];
        if(l){
            l[oid]= true;
        }else{
            l= {};
            l[oid]= true;
            this.map[t]= l;
            this.dirty= true;
        }
    },

    /** 
     * Remove
     *
     * @param {String/Number} t
     * @param {String} oid
     *
     */
    remove: function(t,oid) {
        var l= this.map[t];
        if(l){
            delete l[oid];
            this.dirty= true;
        }
    },

    /** 
     * Oids from
     *
     * @param {String/Number} t
     *
     */
    oidsFrom: function(t) {
        var r= [];
        var keys= this.keysFrom(t);
        var l= keys.length;
        for(var i=0;i<l;i++){
            r= r.concat(this.oToA(this.map[keys[i]]));
        }
        return r;
    },
    
    /** 
     * Keys from
     *
     * @param {String/Number} t
     *
     */
    keysFrom: function(t) {
        var r= [];
        var keys= this.keys();
        var l= keys.length;
        for(var i=0;i<l;i++){ // JCM should be a binary search, or reverse iteration
            var j= keys[i];
            if(j>=t){ // '=' because we only index by t, there could be updates with the same t and greater s
                r.push(j);
            }
        }
        return r;
    },
    
    /** 
     * Encode
     *
     */
    encode: function() {
        var r= {};
        for(var i in this.map){
            if (this.map.hasOwnProperty(i) && !this.isEmpty(this.map[i])) {
                r[i]= this.oToA(this.map[i]);
            }
        }
        return r;
    },
    
    /** 
     * Decode
     *
     * @param {Object} v
     *
     */
    decode: function(v) {
        this.clear();
        for(var i in v){
            if (v.hasOwnProperty(i)) {
                var oids= v[i];
                for(var j=0;j<oids.length;j++){
                    this.add(i,oids[j]);
                }
            }
        }
        return this;
    },
    
    /** 
     * Keys
     *
     */
    keys: function() {
        if(this.dirty){
            this.v= [];
            for(var i in this.map){
                if (this.map.hasOwnProperty(i) && !this.isEmpty(this.map[i])) {
                    this.v.push(i);
                }
            }
            this.dirty= false; 
        }
        return this.v;
    },
    
    /** 
     * isEmpty?
     *
     * @param {Object} object
     *
     * @return {Boolean} True/False
     *
     */
    isEmpty: function(o) {
        for(var i in o) {
            return false;
        }
        return true;
    },

    /** 
     * Object to Array
     *
     * @param {Object} object
     *
     * @return {Array}
     *
     * @private
     *
     */ 
    oToA: function(o){
        var r= [];
        if(o){
            for(var i in o){
                if (o.hasOwnProperty(i)) {
                    r.push(i);
                }
            }
        }
        return r;
    },
    
    /** 
     * To stamp
     *
     */
    asString: function(){
        var r= "";
        for(var i in this.map){
            if (this.map.hasOwnProperty(i) && !this.isEmpty(this.map[i])) {
                r= r+i+':'+this.oToA(this.map[i]);
            }
            r= r+", ";
        }
        return r;
    }
    
    
});
