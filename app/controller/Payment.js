/*
 * File: app/controller/Payment.js
 *
 * This file was generated by Sencha Architect version 2.0.0.
 * http://www.sencha.com/products/architect/
 *
 * This file requires use of the Sencha Touch 2.0.x library, under independent license.
 * License of Sencha Architect does not include license for Sencha Touch 2.0.x. For more
 * details see http://www.sencha.com/license or contact license@sencha.com.
 *
 * This file will be auto-generated each and everytime you save your project.
 *
 * Do NOT hand edit this file.
 */

Ext.define('Payback.controller.Payment', {
    extend: 'Ext.app.Controller',

    config: {
        stores: [
            'PaymentStore'
        ],

        refs: {
            PaymentDetail: {
                selector: 'PaymentDetail',
                xtype: 'PaymentDetail',
                autoCreate: true
            },
            DebtDetail: {
                selector: 'DebtDetail',
                xtype: 'DebtDetail',
                autoCreate: true
            },
            myPaymentDataView: '#myPaymentDataView',
            debtHeaderLabel: '#debtHeaderLabel'
        },

        control: {
            "#addPayment": {
                tap: 'onAddPaymentTap'
            },
            "#savePayment": {
                tap: 'onSavePaymentTap'
            },
            "#cancelPayment": {
                tap: 'onCancelButtonTap'
            },
            "#myPaymentDataView": {
                itemswipe: 'onDataviewItemSwipe',
                itemtap: 'onDataviewItemTap'
            }
        }
    },

    onAddPaymentTap: function(button, e, options) {

        var form = this.getPaymentDetail();

        form.reset(); //clears form
        form.setRecord(null); //clears record from form

        //sets date field to today
        form.down('datepickerfield').setValue(new Date());

        form.setValues({debt_id:this.getDebtDetail().getRecord().get('id')});

        //set active item
        Ext.Viewport.setActiveItem(form);
    },

    onSavePaymentTap: function(button, e, options) {
        var form = this.getPaymentDetail(),
            record = form.getRecord(),
            values = form.getValues(),
            debt = this.getDebtDetail().getRecord();

        values.amount = (values.amount)?values.amount.toFixed(2):0;

        if(record) { //if editing record
            record.set(values);
            record.save();
        } else { //if new record
            var payment = debt.payments().add(values)[0];
            debt.payments().sync();
            payment.getDebt(); //bug in framework(reported as TOUCH-3073), associates payment with debt 

            //bug in framework(reported as TOUCH-3105), debt_id is not correctly set in filter, work around is to delete the store and reassociate
            delete debt.paymentsStore; 
            debt.payments();
        }

        //update the debt balance on new payments
        debt.set('balance',0); // calls convert field on debt
        debt.getPerson().calcBalance(); //calc balance of updated payments and debt in person

        //loads data from localStorage
        Ext.getStore('Payments').load();

        //update people store and summary
        Ext.getStore('People').load(function(){
            this.getApplication().getController('Summary').updateSummary();
        },
        this);

        //update debt balance label
        var balance = debt.get('balance');
        var str = ((balance<0)?'-':'')+'$' + Math.abs(balance).toFixed(2);
        this.getDebtHeaderLabel().setHtml(str);

        //set active item
        Ext.Viewport.setActiveItem(this.getDebtDetail());

    },

    onCancelButtonTap: function(button, e, options) {
        this.getPaymentDetail().reset(); //clears form

        //set active item
        Ext.Viewport.setActiveItem(this.getDebtDetail());
    },

    onDataviewItemSwipe: function(dataview, index, target, record, e, options) {
        var deleteButtons = dataview.query('button');

        //hide other buttons0
        for (var i=0; i < deleteButtons.length; i++) {
            deleteButtons[i].hide();
        }

        var labels = Ext.select(target.getObservableId() +' .money-label');
        labels.hide();

        //show current button
        target.query('button')[0].show();

        //hides delete button if anywhere else is tapped
        Ext.Viewport.element.on({tap:function(){
            target.query('button')[0].hide();
            labels.show();
        }, single:true});
    },

    onDataviewItemTap: function(dataview, index, target, record, e, options) {

        var form = this.getPaymentDetail();

        form.setRecord(record); //set form record

        //set active item
        Ext.Viewport.setActiveItem(form);
    }

});