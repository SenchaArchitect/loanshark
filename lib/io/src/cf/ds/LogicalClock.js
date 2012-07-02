/**
 * @private
 *
 * Logical Clock
 *
 * Generates Change Stamps.
 * It is Monotonic.
 * It never goes backwards.
 *
 */
Ext.define('Ext.cf.ds.LogicalClock', {
    requires: [
        'Ext.cf.ds.RealClock',
        'Ext.cf.ds.CS'
    ],

    r: undefined, // replica_number
    t: undefined, // time, in seconds since epoch
    s: undefined, // sequence number
    
    clock: undefined, // a real clock, it provides the time
    local_offset: undefined,
    global_offset: undefined,
    
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
     * @param {Object} data
     *
     */
    set: function(data) {
        if(data){
            this.clock= data.clock || Ext.create('Ext.cf.ds.RealClock');
            this.r= data.r;
            this.t= data.t || this.clock.now();
            this.s= data.s || -1; // so that the next tick gets us to 0
            this.local_offset= data.local_offset || 0;
            this.global_offset= data.global_offset || 0;
        }
    },

    /** 
     * Set clock
     *
     * @param {Object} clock
     *
     */
    setClock: function(clock) {
        this.clock= clock;
        this.t= this.clock.now();
        this.s= -1; // so that the next tick gets us to 0
    },
    
    /** 
     * Generate change stamp
     *
     */
    generateChangeStamp: function() { // the next change stamp
        var current_time= this.clock.now();
        this.update_local_offset(current_time);
        this.s+= 1;
        if (this.s>255) { // JCM This is totally arbitrary, and it's hard coded too....
            this.t= current_time;
            this.local_offset+= 1;
            this.s= 0;
        }
        return new Ext.cf.ds.CS({r:this.r,t:this.global_time(),s:this.s});
    },

    /** 
     * Seen CSV
     *
     * @param {Ext.cf.ds.CSV} csv
     *
     */
    seenCSV: function(csv) { // a change stamp vector we just received
        return this.seenChangeStamp(csv.maxChangeStamp());
    },

    /** 
     * Seen change stamp
     *
     * @param {Ext.cf.ds.CS} cs
     *
     */
    seenChangeStamp: function(cs) { // a change stamp we just received
        var changed= false;
        if(cs){
            var current_time= this.clock.now();
            if (current_time>this.t) {
                changed= this.update_local_offset(current_time);
            }
            changed= changed||this.update_global_offset(cs);
        }
        return changed;
    },
  
    /** 
     * Set replica number
     *
     * @param {Number} replica_number
     *
     */
    setReplicaNumber: function(replica_number) {
        var changed= this.r!==replica_number;
        this.r= replica_number;
        return changed;
    },

    /** 
     * Update local offset
     *
     * @param {Number} current_time
     *
     * @private
     *
     */
    update_local_offset: function(current_time) {
        var changed= false;
        var delta= current_time-this.t;
        if (delta>0) { // local clock moved forwards
            var local_time= this.global_time();
            this.t= current_time;
            if (delta>this.local_offset) {
                this.local_offset= 0;
            } else {
                this.local_offset-= delta;
            }
            var local_time_after= this.global_time();
            if (local_time_after>local_time) {
                this.s= -1;
            }
            changed= true;
        } else if (delta<0) { // local clock moved backwards
            // JCM if delta is too big, then complain
            this.t= current_time;
            this.local_offset+= -delta;
            changed= true;
        }
        return changed;
    },

    /** 
     * Update global offset
     *
     * @param {Ext.cf.ds.CS} remote_cs
     *
     * @private
     *
     */
    update_global_offset: function(remote_cs) {
        var changed= false;
        var local_cs= new Ext.cf.ds.CS({r:this.r,t:this.global_time(),s:this.s+1});
        var local_t= local_cs.t;
        var local_s= local_cs.s;
        var remote_t= remote_cs.t;
        var remote_s= remote_cs.s;
        if (remote_t==local_t && remote_s>=local_s) {
            this.s= remote_s;
            changed= true;
        } else if (remote_t>local_t) {
            var delta= remote_t-local_t;
            if (delta>0) { // remote clock moved forwards
                // JCM guard against moving too far forward
                this.global_offset+= delta;
                this.s= remote_s;
                changed= true;
            }
        }
        return changed; 
    },

    /** 
     * Global time
     *
     * @private
     *
     */
    global_time: function() {
        return this.t+this.local_offset+this.global_offset;
    },
    
    /** 
     * As data
     *
     * @return {Object}
     *
     */
    as_data: function() {
        return {
            r: this.r,
            t: this.t,
            s: this.s,
            local_offset: this.local_offset,
            global_offset: this.global_offset
        };
    }
    
});
