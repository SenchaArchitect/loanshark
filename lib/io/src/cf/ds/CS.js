/** 
 * @private
 *
 * Change Stamp
 *
 * It represents a point in 'time' for a single replica.
 * It's used like a timestamp, but has more components than time.
 */
Ext.define('Ext.cf.ds.CS', {

    r: 0, // replica_number
    t: 0, // time, in seconds since the epoch, as defined by the CS Generator 
    s: 0, // sequence number

    /** 
     * Constructor
     *
     * @param {Object} config
     *
     */
    constructor: function(config) {
        this.set(config);
    },
    
    /** 
     * Set
     *
     * @param {String/Object} x
     *
     */
    set: function(x) {
        if (typeof x === 'string' || x instanceof String) {
            this.from_s(x);
        } else if (typeof x === 'object') {
            this.r= x.r||0;
            this.t= x.t||0;
            this.s= x.s||0;
        }
    },

    /** 
     * Change replica number
     *
     * @param {Number} old_replica_number
     * @param {Number} new_replica_number
     *
     */
    changeReplicaNumber: function(old_replica_number,new_replica_number) {
        if (this.r==old_replica_number) {
            this.r= new_replica_number;
            return true;
        }
        return false;
    },

    /** 
     * Greater than
     *
     * @param {Object} x
     *
     */
    greaterThan: function(x) {
        return this.compare(x)>0;
    },
    
    /** 
     * Less than
     *
     * @param {Object} x
     *
     */
    lessThan: function(x) { 
        return this.compare(x)<0; 
    },

    /** 
     * Equals
     *
     * @param {Object} x
     *
     */
    equals: function(x) { 
        return this.compare(x)===0;
    },

    /** 
     * Compare
     *
     * @param {Object} x
     *
     */
    compare: function(x) {
        var r= this.t-x.t;
        if (r===0) {
            r= this.s-x.s;
            if (r===0) {
                r= this.r-x.r;
            }
        }
        return r;
    },
    
    cs_regex: /(\d+)-(\d+)-?(\d+)?/,
    
    /** 
     * From Stamp 
     *
     * @param {String/Number} t
     *
     */
    from_s: function(t) {
        var m= t.match(this.cs_regex);
        if (m && m.length>0) {
            this.r= parseInt(m[1], 10);
            this.t= parseInt(m[2], 10);
            this.s= m[3] ? parseInt(m[3], 10) : 0;
        } else {
            throw "Error - CS - Bad change stamp '"+t+"'.";
        }
        return this;
    },
    
    /** 
     * To stamp
     *
     */
    asString: function() {
        return this.r+"-"+this.t+(this.s>0 ? "-"+this.s : "");      
    }

});
