/**
 * @private
 *
 * Change Stamp Index Vector
 * 
 * In index for a set of Object Identifiers for all replicas, by Change Stamp.
 */
Ext.define('Ext.cf.ds.CSIV', {
    requires: ['Ext.cf.ds.CSI'],

    v: {}, // r => Change Stamp Index
    
    /** 
     * Constructor
     *
     */
    constructor: function() {
        this.v= {};
    },
    
    /** 
     * Oids from
     *
     * @param {Ext.cf.ds.CSV} csv
     *
     */
    oidsFrom: function(csv) {
        var r= csv.collect(function(cs){
            var csi= this.v[cs.r];
            if(csi){
                return csi.oidsFrom(cs.t);
            }
        },this);
        r= Ext.Array.flatten(r);
        r= Ext.Array.unique(r);
        r= Ext.Array.clean(r);
        return r;
    },
    
    /** 
     * Add
     *
     * @param {Ext.cf.ds.CS} cs
     * @param {String} oid
     *
     */
    add: function(cs,oid) {
        var csi= this.v[cs.r];
        if(csi===undefined){
            csi= this.v[cs.r]= Ext.create('Ext.cf.ds.CSI');
        }
        csi.add(cs.t,oid);
    },

    /** 
     * Add Array
     *
     * @param {Array} a
     * @param {String} oid
     *
     */
    addArray: function(a,oid) {
        var l= a.length;
        for(var i=0;i<l;i++){
            var cs= a[i];
            if(cs){
                this.add(a[i],oid);
            }
        }
    },

    /** 
     * Remove
     *
     * @param {Ext.cf.ds.CS} cs
     * @param {String} oid
     *
     */
    remove: function(cs,oid) {
        var csi= this.v[cs.r];
        if(csi){
            csi.remove(cs.t,oid);
        }
    },  

    /** 
     * Remove array
     *
     * @param {Array} a
     * @param {String} oid
     *
     */
    removeArray: function(a,oid) {
        var l= a.length;
        for(var i=0;i<l;i++){
            var cs= a[i];
            if(cs){
                this.remove(a[i],oid);
            }
        }
    },

    /** 
     * Encode
     *
     */
    encode: function() {
        var r= {};
        for(var i in this.v){
            if (this.v.hasOwnProperty(i)) {
                r[i]= this.v[i].encode();
            }
        }
        return {r:r};
    },
        
    /** 
     * Decode
     *
     * @param {Object} v
     *
     */
    decode: function(v) {
        this.v= {};
        if(v){
            for(var i in v.r){
                if (v.r.hasOwnProperty(i)) {
                    this.v[i]= Ext.create('Ext.cf.ds.CSI').decode(v.r[i]);
                }
            }       
        }
        return this;
    },
    
    /** 
     * To stamp
     *
     */
    asString: function() {
        var r= "";
        for(var i in this.v){
            if (this.v.hasOwnProperty(i)) {
                r= r+i+"=>["+this.v[i].asString()+"], ";
            }
        }
        return r;
    }
            
});
