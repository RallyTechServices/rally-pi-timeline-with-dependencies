Ext.define('Rally.technicalservices.dialog.TaskDialog',{
    extend: 'Rally.ui.dialog.Dialog',
    alias:  'widget.tstaskdialog',
    config: {
        /*
         * @cfg {Model} 
         * 
         * The task record shown on the timeline
         */
        artifact: null,
        percentDoneName: 'PercentDoneByStoryCount'
    },
    items: { 
        xtype:'panel',
        border:false,
        items: [
            {
                xtype:'container',
                itemId:'form_box',
                layout:'fit',
                width: 300
            }
        ]
    },
    cls: 'percentDonePopover',
    
    constructor: function(config) {
        this.mergeConfig(config);

        this.callParent([this.config]);
    },

    initComponent: function() {
        this.callParent(arguments);
        this.addEvents(
                /**
                 * @event updateClicked
                 * Fires when if the update button is clicked
                 * @param {Rally.technicalservices.dialog.TaskDialog} this
                 * @param {Rally.domain.WsapiModel} record
                 * @param {String} planned_start_date (in ISO)
                 * @param {String} planned_end_date (in ISO)
                 */
                'updateClicked'
        );

        this.addCls('chooserDialog');

        this._buildForm();
        this._buildButtons();
    },
    _buildForm: function() {
        if ( this.artifact ) { 
            this.planned_start_date = this.artifact.get('PlannedStartDate');
            this.planned_end_date = this.artifact.get('PlannedEndDate');
            this.last_update_date = this.artifact.get('LastUpdateDate');
            
            this.down('panel').add({
                xtype:'container',
                html: 'Last changed ' + Rally.util.DateTime.getDifference(new Date(), this.last_update_date,'day') + ' days ago'
            });
            
            this.down('panel').add({
                xtype:'container',
                cls: 'popover percentDonePopover',
                html: this._buildPopoverContent(this.artifact.getData())
            });
            
            var container = this.down('panel').add({
            	xtype:'container',
            	layout: { type: 'hbox' }
            });
            
            
            container.add({
                xtype:'rallydatefield',
                value: this.planned_start_date,
                fieldLabel: 'Planned Start Date',
                labelAlign: 'top',
                margin: 5,
                listeners: {
                    scope: this,
                    change: function(db, new_value) {
                        this.planned_start_date = new_value;
                    }
                }
            });
            
            container.add({
                xtype:'rallydatefield',
                value: this.planned_end_date,
                fieldLabel: 'Planned End Date',
                labelAlign: 'top',
                margin: 5,
                listeners: {
                    scope: this,
                    change: function(db, new_value) {
                        this.planned_end_date = new_value;
                    }
                }
            });
        } else {
            this.down('panel').add({
                xtype:'container',
                html: 'Artifact not supplied'
            });
        }
        
    },
    _buildButtons: function() {
        this.down('panel').addDocked({
            xtype: 'toolbar',
            dock: 'bottom',
            padding: '0 0 10 0',
            layout: {
                type: 'hbox',
                pack: 'center'
            },
            ui: 'footer',
            items: [
                {
                    xtype: 'rallybutton',
                    text: 'Update',
                    scope: this,
                    userAction: 'clicked done in dialog',
                    handler: function() {
                        if ( this.planned_start_date > this.planned_end_date ) {
                            alert("The planned end date must be after the planned start date" );
                        } else {
                            this.fireEvent('updateClicked', this, this.artifact, this.planned_start_date, this.planned_end_date);
                            this.close();
                        }
                    }
                },
                {
                    xtype: 'rallybutton',
                    text: 'Cancel',
                    cls: 'secondary small',
                    handler: this.close,
                    scope: this,
                    ui: 'link'
                }
            ]
        });
    },
    // Stolen from original popover
    _buildPopoverContent: function(percentDoneData) {
        var html = '';

        html += this.getStatusTpl().apply(percentDoneData);
        html += '<div class="percentDoneContainer">';

        html += this.getAcceptedTpl().apply(percentDoneData);

        if (!Ext.isEmpty(percentDoneData.ActualEndDate)) {
            html += this.getActualEndDateTpl().apply(percentDoneData);
        }

        //ajax request
//        if(this._shouldShowReleaseSection(percentDoneData)) {
//            html += this.getReleaseTpl().apply(percentDoneData);
//        }

//        if (this._shouldShowNotes(percentDoneData)) {
//            html += this.getNotesTpl().apply(percentDoneData);
//        }

        html += '</div>';

        return html;
    },
    getStatusTpl: function() {
        var me = this;

        return Ext.create('Ext.XTemplate',
            '<h2>{[this.calculateStatus(values)]}</h2>', {
            calculateStatus: function(recordData) {
                var health = Rally.util.HealthColorCalculator.calculateHealthColorForPortfolioItemData(recordData, me.percentDoneName);
                return health.label;
            }
        });
    },
    getAcceptedTpl: function() {
        return Ext.create('Ext.XTemplate',
            '<div class="percentDoneLine">',
                '{[this.renderPercentDoneByStoryPlanEstimate(values)]}',
                '<div class="percentDoneText">{AcceptedLeafStoryPlanEstimateTotal} of {LeafStoryPlanEstimateTotal} Points Accepted</div>',
            '</div>',
            '<div class="percentDoneLine">',
                '{[this.renderPercentDoneByStoryCount(values)]}',
                '<div class="percentDoneText">{AcceptedLeafStoryCount} of {LeafStoryCount} User Stories Accepted</div>',
            '</div>',
            '<tpl if="UnEstimatedLeafStoryCount &gt; 0">',
                '<div class="dangerNotification percentDoneLine">',
                    'Missing Estimates: ',
                    '<div><b>{UnEstimatedLeafStoryCount} User Stor{[values.UnEstimatedLeafStoryCount == 1? "y" : "ies"]}</b></div>',
                '</div>',
            '</tpl>',
            '<tpl if="!PlannedEndDate && !ActualEndDate">',
                '<div class="dangerNotification percentDoneLine">Missing Planned End Date</div>',
            '</tpl>', {
            renderPercentDoneByStoryPlanEstimate: function(recordData) {
                return Ext.create('Rally.ui.renderer.template.progressbar.PortfolioItemPercentDoneTemplate', {
                    percentDoneName: 'PercentDoneByStoryPlanEstimate',
                    height: '15px',
                    width: '50px',
                    isClickable: false
                }).apply(recordData);
            },
            renderPercentDoneByStoryCount: function(recordData) {
                return Ext.create('Rally.ui.renderer.template.progressbar.PortfolioItemPercentDoneTemplate', {
                    percentDoneName: 'PercentDoneByStoryCount',
                    height: '15px',
                    width: '50px',
                    isClickable: false
                }).apply(recordData);
            }
        });
    },

    getActualEndDateTpl: function() {
        var getDateFn = Ext.bind(this._getDate,this);
        return Ext.create('Ext.XTemplate',
            '<hr/>',
            '<h3>ACTUAL END DATE</h3>',
            '<div class="actualEndDateInfo percentDoneLine">',
                '{[this.formatDate(values.ActualEndDate)]}',
                '<tpl if="PlannedEndDate">',
                    ' ({[this.getEstimateMessage(values)]})',
                '</tpl></div>', {
            getEstimateMessage: function(values) {
                var message;

                var actualEnd = getDateFn(values.ActualEndDate);
                var plannedEnd = getDateFn(values.PlannedEndDate);

                var diff = Rally.util.DateTime.getDifference(plannedEnd, actualEnd, 'day');
                if (diff === 0) {
                    message = 'on time';
                } else if (diff > 0) {
                    message = diff + ' day' + (diff === 1 ? '' : 's') + ' early';
                } else {
                    diff = Math.abs(diff);
                    message = diff + ' day' + (diff === 1 ? '' : 's') + ' late';
                }

                return message;
            },
            formatDate: Ext.bind(this._formatDate,this)
        });
    },

    getNotesTpl: function() {
        return Ext.create('Ext.XTemplate',
            '<hr/>',
            '<h3>NOTES</h3>',
            '<div class="percentDoneLine">{Notes}</div>');
    },

    _getDate: function(dateString){
        return Ext.Date.parse(dateString,'c') || new Date(Date.parse(dateString));
    },

    _formatDate: function(dateString) {
        var date = this._getDate(dateString);
        return Rally.util.DateTime.formatWithDefault(date);
    }
});