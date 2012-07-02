/**
 * 
 * @private
 *
 * Updates
 *
 * An ordered list of updates, where an update is an assertion of 
 * an attribute's value at a point in time, defined by a Change
 * Stamp.
 */
Ext.define('Ext.cf.data.Updates', {
    requires: ['Ext.cf.ds.CS'], 

    updates: undefined,
    
    /** 
     * Constructor
     *
     * @param {Array} updates
     *
     */
    constructor: function(x) {
        //
        // sort the updates into change stamp order,
        // as they have to be transmitted this way
        //
        this.updates= x||[];
        this.updates.forEach(function(update) {
            if (!(update.c instanceof Ext.cf.ds.CS)) {
                update.c= new Ext.cf.ds.CS(update.c);
            }
        });
        this.updates.sort(function(a,b) {return a.c.compare(b.c);});
    },
    
    /** 
     * Push
     *
     * @param {Object} update
     *
     */
    push: function(update) {
        // assert - update must have a cs greater than the last element
        var last= this.updates[this.updates.length];
        if (!update.c.greaterThan(last.c)) { throw "Error - Updates - Tried to push updates in wrong order. "+Ext.encode(update)+" <= "+Ext.encode(last); }
        this.updates.push(update);
    },
    
    /** 
     * isEmpty?
     *
     * @return {Boolean} True/False
     *
     */
    isEmpty: function() {
        return this.updates.length<1;
    },
    
    /** 
     * length
     *
     * @return {Number} length
     *
     */
    length: function() {
        return this.updates.length;
    },

    /** 
     * oids
     *
     * @return {Array} oids
     *
     */
    oids: function() {

        return Ext.Array.unique(Ext.Array.pluck(this.updates,'i'));
    },

    /** 
     * forEach
     *
     * @param {Function} callback
     * @param {Object} scope
     *
     */
    forEach: function(callback,scope) {
        this.updates.forEach(callback,scope);
    },

    /**
     * Optimization- If a subsequent update has the same Object Identifier
     * as the preceeding update then we omit the OID.
     */
    encode: function() {
        // JCM optimize - "" around i and p and cs is not needed
        // JCM optimize - diff encode cs 1-123, +1-0, +0-1, 1-136-4, +1-0, ...
        var r= [];
        var l= this.updates.length;
        var prev_i, update, cs;
        for(var i=0;i<l;i++) {
            update= this.updates[i];
            cs= ((update.c instanceof Ext.cf.ds.CS) ? update.c.asString() : update.c);
            if (update.i===prev_i) {
                r.push([update.p, update.v, cs]);
            } else {
                r.push([update.i, update.p, update.v, cs]);
                prev_i= update.i;
            }
        }
        return r;
    },
        
    /** 
     * Decode
     *
     * @param {Array} x
     *
     */
    decode: function(x) {
        this.updates= [];
        if (x) {
            var l= x.length;
            var update, prev_i, id, p, v, c;
            for(var i=0;i<l;i++) {
                update= x[i];
                switch(update.length) {
                    case 3:
                        id= prev_i;
                        p= update[0];
                        v= update[1];
                        c= update[2];
                        break;
                    case 4:
                        id= update[0];
                        p= update[1];
                        v= update[2];
                        c= update[3];
                        prev_i= id;
                        break;
                }
                c= ((c instanceof Ext.cf.ds.CS) ? c : new Ext.cf.ds.CS(c));
                this.updates.push({i:id,p:p,v:v,c:c});
            }
        }
        return this;
    }
    
});

  
  
