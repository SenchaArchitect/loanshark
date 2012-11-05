/*
 * File: app/view/ContactDetail.js
 *
 * This file was generated by Sencha Architect version 2.1.0.
 * http://www.sencha.com/products/architect/
 *
 * This file requires use of the Sencha Touch 2.1.x library, under independent license.
 * License of Sencha Architect does not include license for Sencha Touch 2.1.x. For more
 * details see http://www.sencha.com/license or contact license@sencha.com.
 *
 * This file will be auto-generated each and everytime you save your project.
 *
 * Do NOT hand edit this file.
 */

Ext.define('Payback.view.ContactDetail', {
    extend: 'Ext.form.Panel',
    alias: 'widget.ContactDetail',

    config: {
        padding: '0 0 12px 0',
        autoDestroy: false,
        layout: {
            type: 'vbox'
        },
        items: [
            {
                xtype: 'titlebar',
                docked: 'top',
                ui: 'light',
                title: 'Prey Details',
                items: [
                    {
                        xtype: 'button',
                        cls: 'my-buttons',
                        id: 'cancelContact',
                        iconCls: 'icon-back',
                        iconMask: true,
                        text: 'Cancel'
                    }
                ]
            },
            {
                xtype: 'toolbar',
                docked: 'bottom',
                items: [
                    {
                        xtype: 'spacer'
                    },
                    {
                        xtype: 'button',
                        cls: 'my-buttons',
                        id: 'saveContact',
                        iconCls: 'icon-save',
                        iconMask: true,
                        text: 'save'
                    }
                ]
            },
            {
                xtype: 'container',
                margin: '0 0 10px 0',
                items: [
                    {
                        xtype: 'label',
                        height: 100,
                        id: 'contactHeaderLabel',
                        style: 'font-weight: bold;text-align: center; font-size: 75px;background-color: #FE8A28; color: white;'
                    },
                    {
                        xtype: 'button',
                        cls: 'my-buttons',
                        id: 'addDebt',
                        margin: '10px 10px 5px 10px',
                        style: 'border-radius: 0; color: black;',
                        ui: 'gray-light-button',
                        text: 'New Loan'
                    },
                    {
                        xtype: 'fieldset',
                        items: [
                            {
                                xtype: 'textfield',
                                label: 'Name',
                                labelAlign: 'top',
                                name: 'name'
                            },
                            {
                                xtype: 'emailfield',
                                label: 'Email',
                                labelAlign: 'top',
                                name: 'email'
                            },
                            {
                                xtype: 'textfield',
                                label: 'Phone',
                                labelAlign: 'top',
                                name: 'phone'
                            }
                        ]
                    }
                ]
            },
            {
                xtype: 'container',
                items: [
                    {
                        xtype: 'label',
                        html: 'Loan History',
                        id: 'loanHistoryLabel',
                        margin: '0 12px',
                        padding: '0 0 8px 8px',
                        style: 'font-size: .8em; font-weight: bold;color: gray;border-bottom: 2px solid #333;'
                    },
                    {
                        xtype: 'dataview',
                        baseCls: 'x-list',
                        cls: [
                            'x-list-normal'
                        ],
                        id: 'myDebtDataView',
                        padding: '0 22px',
                        defaultType: 'myDebtListItem',
                        scrollable: false,
                        store: 'Debts',
                        useComponents: true,
                        disableSelection: true
                    }
                ]
            }
        ],
        listeners: [
            {
                fn: 'onFormpanelShow',
                event: 'show'
            }
        ]
    },

    onFormpanelShow: function(component, options) {

        //refresh Debt dataview
        this.down('dataview').refresh();

        //remove person label in debt dataview when viewed from contact detail
        Ext.select('.x-form .debt-person-label').setStyle({display:'none'});
    }

});