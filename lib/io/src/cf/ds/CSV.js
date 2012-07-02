/**
 * @private
 *
 * Change Stamp Vector
 *
 * Represents a global point in 'time'.
 */
Ext.define('Ext.cf.ds.CSV', {
    requires: ['Ext.cf.ds.CS'],

    v: undefined, // change stamps, replica number => change stamp

    /** 
     * Constructor
     *
     * @param {Object} config
     *
     */
    constructor: function(config) {
        this.v= {};
        if (config===undefined){
        }else if (config instanceof Ext.cf.ds.CSV) {
            this.addX(config);
        }else{
            this.addX(config.v);
        }
    },
    
    /** 
     * Get
     *
     * @param {Ext.cf.ds.CS/Number} x
     *
     */
    get: function(x) {
        if (x instanceof Ext.cf.ds.CS) {
            return this.v[x.r];
        }else{
            return this.v[x];
        }
    },

    /** 
     * SetCS
     *
     * @param {Ext.cf.ds.CS} x
     *
     */
    setCS: function(x) {
        this.v[x.r]= Ext.create('Ext.cf.ds.CS',{r:x.r,t:x.t,s:x.s});
    },
    
    /** 
     * Set replica number
     *
     * @param {Number} replica_number
     *
     */
    setReplicaNumber: function(replica_number) {
        this.addReplicaNumbers([replica_number]);
    },
    
    /** 
     * Add replica numbers
     *
     * @param {Array/Object} x
     *
     */
    addReplicaNumbers: function(x) {
        var t= [];
        if (x instanceof Array) {
            if(x[0] instanceof Ext.cf.ds.CS){
                t= Ext.Array.map(x,function(r){return this.addX(Ext.create('Ext.cf.ds.CS',{r:x.r}));},this);
            }else{
                t= Ext.Array.map(x,function(r){return this.addX(Ext.create('Ext.cf.ds.CS',{r:r}));},this);
            }
        } else if (x instanceof Ext.cf.ds.CSV) {
            t= x.collect(function(cs){return this.addX(Ext.create('Ext.cf.ds.CS',{r:cs.r}));},this);
        }
        return Ext.Array.contains(t,true);
    },

    /** 
     * Add X
     *
     * @param {Ext.cf.ds.CSV/Ext.cf.ds.CS/Array/String} x
     *
     */
    addX: function(x) { // CSV, CS, '1-2-3', [x]
        var changed= false;
        if (x===undefined){
        } else if (x instanceof Ext.cf.ds.CSV) {
            changed= this.addCSV(x);
        } else if (x instanceof Array) {
            var t= Ext.Array.map(x,this.addX,this);
            changed= Ext.Array.contains(t,true);
        } else if (x instanceof Ext.cf.ds.CS) {
            changed= this.addCS(x);
        } else if (typeof x == 'string' || x instanceof String) {
            changed= this.addX(Ext.create('Ext.cf.ds.CS',x));
        }
        return changed;
    },

    /** 
     * Add CS
     *
     * @param {Ext.cf.ds.CS} x
     *
     */
    addCS: function(x) {
        var changed= false;
        if (x!==undefined){
            var r= x.r;
            var t= this.v[r];
            if (!t || x.greaterThan(t)) {
                this.v[r]= Ext.create('Ext.cf.ds.CS',{r:x.r,t:x.t,s:x.s});
                changed= true;
            }
        }
        return changed;
    },

    /** 
     * Add CSV
     *
     * @param {Ext.cf.ds.CSV} x
     *
     */
    addCSV: function(x) {
        var changed= false;
        if (x!==undefined){
            var t= x.collect(this.addCS,this);
            changed= Ext.Array.contains(t,true);
        }
        return changed;
    },

    /** 
     * Set CSV
     *
     * @param {Ext.cf.ds.CSV} x
     *
     */
    setCSV: function(x) {
        x.collect(this.setCS,this);
    },

    /** 
     * Change replica number
     *
     * @param {Number} old_replica_number
     * @param {Number} new_replica_number
     *
     */
    changeReplicaNumber: function(old_replica_number,new_replica_number) {
        var t= this.v[old_replica_number];
        var changed= false;
        if (t) {
            t.r= new_replica_number;
            delete this.v[old_replica_number];
            this.v[new_replica_number]= t;
            changed= true;
        }
        return changed;
    },

    /** 
     * isEmpty?
     *
     * @return {Boolean} True/False
     *
     */
    isEmpty: function() {
        for(var i in this.v) {
            return false;
        }
        return true;
    },
        
    /** 
     * Max change stamp
     *
     * @return {Ext.cf.ds.CS} Changestamp
     *
     */
    maxChangeStamp: function() {
        if (!this.isEmpty()) {
            var r= Ext.create('Ext.cf.ds.CS');
            for (var i in this.v) {
                r = (this.v[i].greaterThan(r) ? this.v[i] : r);
            }
            return r;
        }
    },

    /** 
     * Min change stamp
     *
     * @return {Ext.cf.ds.CS} Changestamp
     *
     */
    minChangeStamp: function() {
        if (!this.isEmpty()) {
            var r;
            for (var i in this.v) {
                r = (!r || this.v[i].lessThan(r) ? this.v[i] : r);
            }
            return r;
        }
    },
    
    /** 
     * Intersect
     *
     * @param {Ext.cf.ds.CSV} x
     *
     */
    intersect: function(x) {
        for (var i in x.v) {
            if (this.v[i]!==undefined) {
                this.v[i]=x.v[i];
            }
        }
    },

    /** 
     * Dominates
     *
     * @param {Ext.cf.ds.CSV} x
     *
     * @return {Boolean} true if this csv dominates x
     *
     */
    dominates: function(x) { // true if this csv dominates x
        return Ext.Array.some(this.compare(x),function(i){ return i>0; });
    },
    
    /** 
     * Dominated
     *
     * @param {Ext.cf.ds.CSV} x
     *
     * @return {Array} returns a list of the dominated cs in x
     *
     */
    dominated: function(x) { // returns a list of the dominated cs in x
        var r = [];
        for (var i in this.v) {
            if(this.v[i]!==undefined && this.compare(this.v[i])>0) {
                r.push(this.v[i]);
            }
        }
        return r;
    },

    /** 
     * Dominant
     *
     * @param {Ext.cf.ds.CSV} x
     *
     * @return {Object} dominant and dominated arrays
     *
     */
    dominant: function(x) { // this dominates over that
        var dominated= [];
        var dominant= []; 
        for (var i in this.v) {
            var v= this.v[i];
            if (v!==undefined){
                var r= x.compare(v);
                if(r<0) {
                    dominant.push(v);
                }else if(r>0){
                    dominated.push(v);
                }
            }
        }
        return {dominant:dominant,dominated:dominated};
    },
    
    /** 
     * Equals
     *
     * @param {Ext.cf.ds.CSV} x
     *
     * @return {Boolean} True/False
     *
     */
    equals: function(x) {
        return Ext.Array.every(this.compare(x),function(i){ return i===0; });
    },
    
    /** 
     * Compare
     *
     * @param {Ext.cf.ds.CSV} x
     *
     */
    compare: function(x) {
        var cs, cs2;
        if (x instanceof Ext.cf.ds.CS) {
            cs= this.get(x);
            cs2= x;
            return [cs ? cs.compare(cs2) : -1];
        } else if (x instanceof Ext.cf.ds.CSV) {        
            var r= [];
            for(var i in this.v) {
                cs= this.v[i];
                if (cs instanceof Ext.cf.ds.CS) {
                    cs2= x.get(cs);
                    r.push(cs2 ? cs.compare(cs2) : 1);
                }
            }
            return r;
        } else {
            throw "Error - CSV - compare - Unknown type: "+(typeof x)+": "+x;
        }
        return [-1];
    },
    
    /** 
     * Encode
     *
     */
    encode: function() { // for the wire
        return this.collect(function(cs){
            // JCM can we safely ignore replicas with CS of 0... except for the highest known replica number...
            return cs.asString();
        }).join('.');
    },
    
    /** 
     * Decode
     *
     * @param {Object} x
     *
     */
    decode: function(x) { // from the wire
        if(x){
            this.addX(x.split('.'));
        }
        return this;
    },
    
    /** 
     * To Stamp
     *
     * @param {Object} indent
     *
     * @return {String}
     *
     */
    asString: function(indent) {
        return "CSV: "+this.collect(function(cs){return cs.asString();}).join(', ');
    },

    /** 
     * As data
     *
     * @return {Object} 
     *
     */
    as_data: function() { // for the disk
        return {
            v: this.collect(function(cs){return cs.asString();}),
            id: 'csv'
        };
    },

    // private

    /** 
     * Collect
     *
     * @param {Function} fn
     * @param {Object} scope
     *
     * @return {Array}
     *
     * @private
     *
     */
    collect: function(fn,scope) {
        var r= [];
        for(var i in this.v){
            if(this.v.hasOwnProperty(i)){
                r.push(fn.call(scope||this,this.v[i]));
            }
        }
        return r;
    }
        
});