sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    'sap/ui/model/Sorter',
    "sap/ui/Device",
    "sap/ui/table/library",
    "sap/m/TablePersoController",
    'sap/m/MessageToast',
	'sap/m/SearchField'
],
    /**
     * @param {typeof sap.ui.core.mvc.Controller} Controller
     */
     function (Controller, JSONModel, MessageBox, Filter, FilterOperator, Sorter, Device, library, TablePersoController, MessageToast, SearchField) {
        "use strict";

        var _this;
        var _oCaption = {};

        // shortcut for sap.ui.table.SortOrder
        var SortOrder = library.SortOrder;
        var dateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "MM/dd/yyyy" });
        var sapDateFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd" });
        var sapDateTimeFormat = sap.ui.core.format.DateFormat.getDateInstance({pattern : "yyyy-MM-dd HH24:MI:SS" });
        var sapTimeFormat = sap.ui.core.format.DateFormat.getTimeInstance({pattern: "KK:mm:ss a"}); //sap.ui.core.format.DateFormat.getDateInstance({pattern : "PThh'H'mm'M'ss'S'"});

        return Controller.extend("zuiprdconsump.controller.Main", {
            onInit: function () {
                _this = this;
                _this.showLoadingDialog("Loading...");

                this._aColumns = {};
                
                this.getView().setModel(new JSONModel({
                    activeSbu: "VER"
                }), "ui");

                this.initializeComponent();
            },

            initializeComponent() {
                this.getCaption();
                this.getColumns();

                var oModel = this.getOwnerComponent().getModel("ZVB_3DERP_PRDCONS_FILTER_CDS");
                var oSmartFilter = this.getView().byId("sfbPrdCons");
                oSmartFilter.setModel(oModel);
                oSmartFilter.addStyleClass("hide");

                this.closeLoadingDialog();
            },

            getColumns: async function() {
                var oModelColumns = new JSONModel();
                var sPath = jQuery.sap.getModulePath("zuiprdconsump", "/model/columns.json")
                await oModelColumns.loadData(sPath);

                var oColumns = oModelColumns.getData();
                var oModel = this.getOwnerComponent().getModel();

                oModel.metadataLoaded().then(() => {
                    this.getDynamicColumns(oColumns, "PRDCONSUMPIOMOD", "ZDV_PRDCON_IO");
                    
                    setTimeout(() => {
                        this.getDynamicColumns(oColumns, "PRDCONSUMPSTOCKMOD", "ZDV_PRDCON_STOCK");
                    }, 100);

                    setTimeout(() => {
                        this.getDynamicColumns(oColumns, "PRDCONSUMPMATDOCMOD", "ZDV_PRDCON_MTDOC");
                    }, 100);
                })
            },

            getDynamicColumns(arg1, arg2, arg3) {
                var oColumns = arg1;
                var modCode = arg2;
                var tabName = arg3;

                var oJSONColumnsModel = new JSONModel();
                var vSBU = this.getView().getModel("ui").getData().activeSbu;

                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                oModel.setHeaders({
                    sbu: vSBU,
                    type: modCode,
                    tabname: tabName
                });
                
                oModel.read("/ColumnsSet", {
                    success: function (oData, oResponse) {
                        oJSONColumnsModel.setData(oData);

                        if (oData.results.length > 0) {
                            if (modCode === 'PRDCONSUMPIOMOD') {
                                var aColumns = _this.setTableColumns(oColumns["io"], oData.results);                          
                                _this._aColumns["io"] = aColumns["columns"];
                                _this.addColumns(_this.byId("ioTab"), aColumns["columns"], "io");
                            }
                            else if (modCode === 'PRDCONSUMPSTOCKMOD') {
                                var aColumns = _this.setTableColumns(oColumns["stock"], oData.results);                         
                                _this._aColumns["stock"] = aColumns["columns"];
                                _this.addColumns(_this.byId("stockTab"), aColumns["columns"], "stock");
                            }
                            else if (modCode === 'PRDCONSUMPMATDOCMOD') {
                                var aColumns = _this.setTableColumns(oColumns["matDoc"], oData.results);                         
                                _this._aColumns["matDoc"] = aColumns["columns"];
                                _this.addColumns(_this.byId("matDocTab"), aColumns["columns"], "matDoc");
                            }
                        }
                    },
                    error: function (err) {
                        _this.closeLoadingDialog();
                    }
                });
            },

            setTableColumns: function(arg1, arg2) {
                var oColumn = (arg1 ? arg1 : []);
                var oMetadata = arg2;
                
                var aColumns = [];

                oMetadata.forEach((prop, idx) => {
                    var vCreatable = prop.Creatable;
                    var vUpdatable = prop.Editable;
                    var vSortable = true;
                    var vSorted = prop.Sorted;
                    var vSortOrder = prop.SortOrder;
                    var vFilterable = true;
                    var vName = prop.ColumnLabel;
                    var oColumnLocalProp = oColumn.filter(col => col.name.toUpperCase() === prop.ColumnName);
                    var vShowable = true;
                    var vOrder = prop.Order;

                    //columns
                    aColumns.push({
                        name: prop.ColumnName, 
                        label: vName, 
                        position: +vOrder,
                        type: prop.DataType,
                        creatable: vCreatable,
                        updatable: vUpdatable,
                        sortable: vSortable,
                        filterable: vFilterable,
                        visible: prop.Visible,
                        required: prop.Mandatory,
                        width: prop.ColumnWidth + 'px',
                        sortIndicator: vSortOrder === '' ? "None" : vSortOrder,
                        hideOnChange: false,
                        valueHelp: oColumnLocalProp.length === 0 ? {"show": false} : oColumnLocalProp[0].valueHelp,
                        showable: vShowable,
                        key: prop.Key === '' ? false : true,
                        maxLength: prop.Length,
                        precision: prop.Decimal,
                        scale: prop.Scale !== undefined ? prop.Scale : null
                    })
                })

                aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));
                var aColumnProp = aColumns.filter(item => item.showable === true);

                return { columns: aColumns };
            },

            addColumns(table, columns, model) {
                var aColumns = columns.filter(item => item.showable === true)
                aColumns.sort((a,b) => (a.position > b.position ? 1 : -1));

                aColumns.forEach(col => {
                    // console.log(col)
                    if (col.type === "STRING" || col.type === "DATETIME") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.Text({text: "{" + model + ">" + col.name + "}"}),
                            visible: col.visible
                        }));
                    }
                    else if (col.type === "NUMBER") {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "End",
                            sortProperty: col.name,
                            filterProperty: col.name,
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.Text({text: "{" + model + ">" + col.name + "}"}),
                            visible: col.visible
                        }));
                    }
                    else if (col.type === "BOOLEAN" ) {
                        table.addColumn(new sap.ui.table.Column({
                            id: model + "Col" + col.name,
                            width: col.width,
                            hAlign: "Center",
                            sortProperty: col.name,
                            filterProperty: col.name,                            
                            label: new sap.m.Text({text: col.label}),
                            template: new sap.m.CheckBox({selected: "{" + model + ">" + col.name + "}", editable: false}),
                            visible: col.visible
                        }));
                    }
                })
            },

            onSearchIO(oEvent) {
                var oSmartFilter = _this.getView().byId("sfbPrdCons");
                oSmartFilter.showFilterDialog();
            },

            showLoadingDialog(arg) {
                if (!_this._LoadingDialog) {
                    _this._LoadingDialog = sap.ui.xmlfragment("zuiprdconsump.view.fragments.LoadingDialog", _this);
                    _this.getView().addDependent(_this._LoadingDialog);
                } 
                
                _this._LoadingDialog.setTitle(arg);
                _this._LoadingDialog.open();
            },

            closeLoadingDialog() {
                _this._LoadingDialog.close();
            },

            formatTime(pTime) {
                var time = pTime.split(':');
                let now = new Date();
                return (new Date(now.getFullYear(), now.getMonth(), now.getDate(), ...time)).toLocaleTimeString();
            },

            onFirstVisibleRowChanged: function (oEvent) {
                var oTable = oEvent.getSource();
                var sModel;

                if (oTable.getId().indexOf("outDelHdrTab") >= 0) {
                    sModel = "outDelHdr";
                }
                else if (oTable.getId().indexOf("outDelDtlTab") >= 0) {
                    sModel = "outDelDtl";
                }
                console.log("onFirstVisibleRowChanged", sModel)

                setTimeout(() => {
                    var oData = oTable.getModel(sModel).getData().results;
                    var iStartIndex = oTable.getBinding("rows").iLastStartIndex;
                    var iLength = oTable.getBinding("rows").iLastLength + iStartIndex;

                    if (oTable.getBinding("rows").aIndices.length > 0) {
                        for (var i = iStartIndex; i < iLength; i++) {
                            var iDataIndex = oTable.getBinding("rows").aIndices.filter((fItem, fIndex) => fIndex === i);

                            if (oData[iDataIndex].ACTIVE === "X") oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].addStyleClass("activeRow");
                            else oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].removeStyleClass("activeRow");
                        }
                    }
                    else {
                        for (var i = iStartIndex; i < iLength; i++) {
                            if (oData[i].ACTIVE === "X") oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].addStyleClass("activeRow");
                            else oTable.getRows()[iStartIndex === 0 ? i : i - iStartIndex].removeStyleClass("activeRow");
                        }
                    }
                }, 1);
            },

            onColumnUpdated: function (oEvent) {
                var oTable = oEvent.getSource();
                var sModel;

                if (oTable.getId().indexOf("outDelHdrTab") >= 0) {
                    sModel = "outDelHdr";
                }
                else if (oTable.getId().indexOf("outDelDtlTab") >= 0) {
                    sModel = "outDelDtl";
                }

                this.setActiveRowHighlight(sModel);
            },

            setActiveRowHighlight(arg) {
                var oTable = this.byId(arg + "Tab");

                setTimeout(() => {
                    var iActiveRowIndex = oTable.getModel(arg).getData().results.findIndex(item => item.ACTIVE === "X");
                    oTable.getRows().forEach((row, idx) => {
                        if (row.getBindingContext(arg) && +row.getBindingContext(arg).sPath.replace("/results/", "") === iActiveRowIndex) {
                            row.addStyleClass("activeRow");
                        }
                        else {
                            row.removeStyleClass("activeRow");
                        }
                    })
                }, 2);
            },

            onCellClick: function(oEvent) {
                if (oEvent.getParameters().rowBindingContext) {
                    var oTable = oEvent.getSource(); //this.byId("ioMatListTab");
                    var sRowPath = oEvent.getParameters().rowBindingContext.sPath;
                    var sModel;

                    if (oTable.getId().indexOf("outDelHdrTab") >= 0) {
                        sModel = "outDelHdr";
                    }
                    else if (oTable.getId().indexOf("outDelDtlTab") >= 0) {
                        sModel = "outDelDtl";
                    }

                    oTable.getModel(sModel).getData().results.forEach(row => row.ACTIVE = "");
                    oTable.getModel(sModel).setProperty(sRowPath + "/ACTIVE", "X");

                    oTable.getRows().forEach(row => {
                        if (row.getBindingContext(sModel) && row.getBindingContext(sModel).sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                            row.addStyleClass("activeRow");
                        }
                        else row.removeStyleClass("activeRow");
                    })
                }
            },

            getCaption() {
                var oJSONModel = new JSONModel();
                var oDDTextParam = [];
                var oDDTextResult = {};
                var oModel = this.getOwnerComponent().getModel("ZGW_3DERP_COMMON_SRV");
                
                // Smart Filter
                oDDTextParam.push({CODE: "PLANTCD"});
                oDDTextParam.push({CODE: "IONO"});
                oDDTextParam.push({CODE: "PROCESSCD"});
                oDDTextParam.push({CODE: "STYLENO"});
                oDDTextParam.push({CODE: "SEASON"});

                // Label
                oDDTextParam.push({CODE: "DLVDTL"});

                // MessageBox
                oDDTextParam.push({CODE: "INFO_NO_SELECTED"});
                // oDDTextParam.push({CODE: "CONFIRM_DISREGARD_CHANGE"});
                // oDDTextParam.push({CODE: "INFO_INVALID_SAVE"});
                // oDDTextParam.push({CODE: "WARN_NO_DATA_MODIFIED"});
                // oDDTextParam.push({CODE: "INFO_SEL_ONE_COL"});
                // oDDTextParam.push({CODE: "INFO_LAYOUT_SAVE"});
                // oDDTextParam.push({CODE: "INFO_CREATE_DATA_NOT_ALLOW"});
                // oDDTextParam.push({CODE: "INFO_NO_RECORD_SELECT"});
                // oDDTextParam.push({CODE: "INFO_NO_DELETE_MODIFIED"});
                // oDDTextParam.push({CODE: "INFO_USE_GMC_REQ"});
                // oDDTextParam.push({CODE: "INFO_ALREADY_EXIST"});
                // oDDTextParam.push({CODE: "INFO_PROCEED_DELETE"});
                
                oModel.create("/CaptionMsgSet", { CaptionMsgItems: oDDTextParam  }, {
                    method: "POST",
                    success: function(oData, oResponse) {
                        // console.log(oData.CaptionMsgItems.results)
                        oData.CaptionMsgItems.results.forEach(item => {
                            oDDTextResult[item.CODE] = item.TEXT;
                        })

                        oJSONModel.setData(oDDTextResult);
                        _this.getView().setModel(oJSONModel, "ddtext");

                        _oCaption = _this.getView().getModel("ddtext").getData();
                    },
                    error: function(err) {
                        sap.m.MessageBox.error(err);
                        _this.closeLoadingDialog();
                    }
                });
            }
        });
    });
