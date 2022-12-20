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
        var _aFilters;
        var _sFilterGlobal;

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

                this._tableRendered = "";
                var oTableEventDelegate = {
                    onkeyup: function(oEvent){
                        _this.onKeyUp(oEvent);
                    },

                    onAfterRendering: function(oEvent) {
                        _this.onAfterTableRendering(oEvent);
                    }
                };

                this.byId("ioTab").addEventDelegate(oTableEventDelegate);
                this.byId("stockTab").addEventDelegate(oTableEventDelegate);
                this.byId("matDocTab").addEventDelegate(oTableEventDelegate);

                // Material Document Detail
                this._MatDocDtlDialog = sap.ui.xmlfragment("zuiprdconsump.view.fragments.MatDocDtlDialog", this);
                this._MatDocDtlDialog.setModel(
                    new JSONModel({
                        items: [],
                        rowCount: 0
                    })
                )
                this.getView().addDependent(this._MatDocDtlDialog);

                this.closeLoadingDialog();
            },

            onKeyUp(oEvent) {
                if ((oEvent.key == "ArrowUp" || oEvent.key == "ArrowDown") && oEvent.srcControl.sParentAggregationName == "rows") {
                    var oTable = this.byId(oEvent.srcControl.sId).oParent;

                    var sModel = "";
                    if (oTable.getId().indexOf("ioTab") >= 0) sModel = "io";
                    else if (oTable.getId().indexOf("stockTab") >= 0) sModel = "stock";
                    else if (oTable.getId().indexOf("matDocTab") >= 0) sModel = "matDoc";

                    if (sModel == "io") {
                        var sRowId = this.byId(oEvent.srcControl.sId);
                        var sRowPath = this.byId(oEvent.srcControl.sId).oBindingContexts["io"].sPath;
                        var oRow = this.getView().getModel("io").getProperty(sRowPath);
                        var sIONo = oRow.IONO;
                        var sProcessCd = oRow.PROCESSCD;

                        this.getView().getModel("ui").setProperty("/activeIONo", sIONo);
                        this.getView().getModel("ui").setProperty("/activeProcessCd", sProcessCd);

                        this.getStock();
                        this.getMatDoc();
                    }

                    if (this.byId(oEvent.srcControl.sId).getBindingContext(sModel)) {
                        var sRowPath = this.byId(oEvent.srcControl.sId).getBindingContext(sModel).sPath;

                        oTable.getModel(sModel).getData().results.forEach(row => row.ACTIVE = "");
                        oTable.getModel(sModel).setProperty(sRowPath + "/ACTIVE", "X");

                        oTable.getRows().forEach(row => {
                            if (row.getBindingContext(sModel) && row.getBindingContext(sModel).sPath.replace("/results/", "") === sRowPath.replace("/results/", "")) {
                                row.addStyleClass("activeRow");
                            }
                            else row.removeStyleClass("activeRow")
                        })
                    }
                }
            },

            onAfterTableRendering: function(oEvent) {
                if (this._tableRendered !== "") {
                    this.setActiveRowHighlight(this._tableRendered.replace("Tab", ""));
                    this._tableRendered = "";
                }
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

            onSearch(oEvent) {
                this.showLoadingDialog("Loading...");

                var aFilters = this.getView().byId("sfbPrdCons").getFilters();
                // var sFilterGlobal = "";
                // if (oEvent) sFilterGlobal = oEvent.getSource()._oBasicSearchField.mProperties.value;
                
                _aFilters = aFilters;
                //_sFilterGlobal = sFilterGlobal;
                this.getIO(aFilters);
            },

            getIO(pFilters) {
                _this.showLoadingDialog("Loading...");

                var oModel = this.getOwnerComponent().getModel();

                var sPlantCd = "";
                var sIONo = "";
                var sProcessCd = "";
                var sStyleCd = "";
                var sSeasonCd = "";

                if (pFilters.length > 0 && pFilters[0].aFilters) {
                    pFilters[0].aFilters.forEach(x => {
                        if (Object.keys(x).includes("aFilters")) {
                            x.aFilters.forEach(y => {
                                if (y.sPath.toUpperCase() == "PLANTCD") sPlantCd = y.oValue1;
                                else if (y.sPath.toUpperCase() == "IONO") sIONo = y.oValue1;
                                else if (y.sPath.toUpperCase() == "PROCESSCD") sProcessCd = y.oValue1;
                                else if (y.sPath.toUpperCase() == "STYLECD") sStyleCd = y.oValue1;
                                else if (y.sPath.toUpperCase() == "SEASONCD") sSeasonCd = y.oValue1;
                            });
                        } else {
                            console.log(2)
                            if (x.sPath.toUpperCase() == "PLANTCD") sPlantCd = x.oValue1;
                            else if (x.sPath.toUpperCase() == "IONO") sIONo = x.oValue1;
                            else if (x.sPath.toUpperCase() == "PROCESSCD") sProcessCd = x.oValue1;
                            else if (x.sPath.toUpperCase() == "STYLECD") sStyleCd = x.oValue1;
                            else if (x.sPath.toUpperCase() == "SEASONCD") sSeasonCd = x.oValue1;
                        }
                    });
                } else {
                    var sName = pFilters[0].sPath.toUpperCase();
                    var sValue = pFilters[0].oValue1;
                    if (sName == "PLANTCD") sPlantCd = sValue;
                    else if (sName == "IONO") sIONo = sValue;
                    else if (sName == "PROCESSCD") sProcessCd = sValue;
                    else if (sName == "STYLECD") sStyleCd = sValue;
                    else if (sName == "SEASONCD") sSeasonCd = sValue;
                }

                var sFilter = "PLANTCD eq '" + sPlantCd + "' and IONO eq '" + sIONo + "' and PROCESSCD eq '" + sProcessCd + 
                    "' and STYLECD eq '" + sStyleCd + "' and SEASONCD eq '" + sSeasonCd + "'";

                oModel.read('/IOSet', {
                    urlParameters: {
                        "$filter": sFilter
                    },
                    success: function (data, response) {
                        console.log("IOSet", data)
                        if (data.results.length > 0) {

                            // var aFilterTab = [];
                            // if (oTable.getBinding("rows")) {
                            //     aFilterTab = oTable.getBinding("rows").aFilters;
                            // }

                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                            _this.getView().setModel(oJSONModel, "io");
                            _this._tableRendered = "ioTab";

                            //_this.onFilterBySmart("outDelHdr", pFilters, pFilterGlobal, aFilterTab);

                            _this.setRowReadMode("io");
                        }

                        // oTable.getColumns().forEach((col, idx) => {   
                        //     if (col._oSorter) {
                        //         oTable.sort(col, col.mProperties.sortOrder === "Ascending" ? SortOrder.Ascending : SortOrder.Descending, true);
                        //     }
                        // });

                        var oTable = _this.getView().byId("ioTab");
                        if (oTable.getBinding("rows").aIndices.length > 0) {
                            var aIndices = oTable.getBinding("rows").aIndices;
                            var sIONo = _this.getView().getModel("io").getData().results[aIndices[0]].IONO;
                            var sProcessCd = _this.getView().getModel("io").getData().results[aIndices[0]].PROCESSCD;
                            _this.getView().getModel("ui").setProperty("/activeIONo", sIONo);
                            _this.getView().getModel("ui").setProperty("/activeProcessCd", sProcessCd);
                            
                            _this.getStock();
                            _this.getMatDoc();
                        } else {
                            _this.getView().getModel("ui").setProperty("/activeIONo", "");
                            _this.getView().getModel("ui").setProperty("/activeProcessCd", "");

                            _this.getView().getModel("io").setProperty("/results", []);
                            _this.getView().getModel("stock").setProperty("/results", []);
                            _this.getView().getModel("matDoc").setProperty("/results", []);
                        }

                        _this.closeLoadingDialog();
                    },
                    error: function (err) { 
                        console.log("error", err)
                        _this.closeLoadingDialog();
                    }
                })
            },

            getStock() {
                var sIONo = _this.getView().getModel("ui").getData().activeIONo;
                var sProcessCd = _this.getView().getModel("ui").getData().activeProcessCd;

                var oModel = this.getOwnerComponent().getModel();
                oModel.read('/StockSet', {
                    urlParameters: {
                        "$filter": "IONO eq '" + sIONo + "' and PROCESSCD eq '" + sProcessCd + "'"
                    },
                    success: function (data, response) {
                        console.log("StockSet", data)
                        if (data.results.length > 0) {

                            // var aFilterTab = [];
                            // if (oTable.getBinding("rows")) {
                            //     aFilterTab = oTable.getBinding("rows").aFilters;
                            // }

                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                            _this.getView().setModel(oJSONModel, "stock");
                            _this._tableRendered = "stockTab";

                            _this.setRowReadMode("stock");
                        }
                    },
                    error: function (err) { 
                        console.log("error", err)
                        _this.closeLoadingDialog();
                    }
                })
            },

            getMatDoc() {
                var sIONo = _this.getView().getModel("ui").getData().activeIONo;
                var sProcessCd = _this.getView().getModel("ui").getData().activeProcessCd;

                var oModel = this.getOwnerComponent().getModel();
                oModel.read('/MatDocSet', {
                    urlParameters: {
                        "$filter": "HDRTEXT eq '" + sIONo + " " + sProcessCd + "'"
                    },
                    success: function (data, response) {
                        console.log("MatDocSet", data)
                        if (data.results.length > 0) {

                            // var aFilterTab = [];
                            // if (oTable.getBinding("rows")) {
                            //     aFilterTab = oTable.getBinding("rows").aFilters;
                            // }

                            var oJSONModel = new sap.ui.model.json.JSONModel();
                            oJSONModel.setData(data);
                            _this.getView().setModel(oJSONModel, "matDoc");
                            _this._tableRendered = "matDocTab";

                            _this.setRowReadMode("matDoc");
                        }
                    },
                    error: function (err) { 
                        console.log("error", err)
                        _this.closeLoadingDialog();
                    }
                })
            },

            onRefreshIO() {
                _this.onSearch();
            },

            onPostConsumpStock() {
                var oTable = this.byId("stockTab");
                var aSelIdx = oTable.getSelectedIndices();

                if (aSelIdx.length === 0) {
                    MessageBox.information(_oCaption.INFO_NO_RECORD_SELECT);
                    return;
                }

                var aOrigSelIdx = [];
                aSelIdx.forEach(i => {
                    aOrigSelIdx.push(oTable.getBinding("rows").aIndices[i]);
                })

                var oModelRFC = _this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var oDataIO = _this.getView().getModel("io").getData().results[0];
                var aData = _this.getView().getModel("stock").getData().results;
                var oParam = {};
                var sCurrentDate = sapDateFormat.format(new Date());

                aOrigSelIdx.forEach(i => {
                    var oData = aData[i];

                    oParam["N_GOODSMVT_HEADER"] = [{
                        PstngDate: sCurrentDate,
                        DocDate: sCurrentDate,
                        RefDocNo: "",
                        HeaderTxt: oDataIO.IONO + " " + oDataIO.PROCESSCD
                    }];

                    oParam["N_GOODSMVT_CODE"] = [{
                        GmCode: "03"
                    }];

                    oParam["N_GOODSMVT_PRINT_CTRL"] = [];
                    oParam["N_GOODSMVT_HEADRET"] = [];

                    oParam["N_GOODSMVT_ITEM"] = [{
                        Material: oData.MATNO, 
                        "Plant":oDataIO.PLANTCD, 
                        "StgeLoc": oData.SLOC, 
                        "Batch": oData.BATCH,
                        "MoveType": "251", 
                        "Vendor": oData.VENDORCD, 
                        "EntryQnt": oData.QTY,
                        "EntryUom": oData.UOM
                    }]

                    oParam["N_GOODSMVT_RETURN"] = [];
                    
                    oModelRFC.create("/GoodsMvt_CreateSet", oParam, {
                        method: "POST",
                        success: function(oResult, oResponse) {
                            console.log("GoodsMvt_CreateSet", oResult, oResponse);

                            // if (oResult.EReturnno.length > 0) {
                            //     _this.getView().getModel("ui").setProperty("/activeDlvNo", oResult.EReturnno);
                            //     _oHeader.dlvNo = oResult.EReturnno;
                            //     _this.onAddHeader()
                            // } else {
                            //     var sMessage = oResult.N_GetNumberReturn.results[0].Type + ' - ' + oResult.N_GetNumberReturn.results[0].Message;
                            //     sap.m.MessageBox.error(sMessage);
                            // }
                        },
                        error: function(err) {
                            console.log("GoodsMvt_CreateSet err", err);
                            _this.closeLoadingDialog();
                        }
                    });
                });
            },

            onRefreshStock() {
                _this.getStock();
            },

            onCancelConsumpMatDoc() {
                var oTable = this.byId("matDocTab");
                var aSelIdx = oTable.getSelectedIndices();

                if (aSelIdx.length === 0) {
                    MessageBox.information(_oCaption.INFO_NO_RECORD_SELECT);
                    return;
                }

                var aOrigSelIdx = [];
                aSelIdx.forEach(i => {
                    aOrigSelIdx.push(oTable.getBinding("rows").aIndices[i]);
                })

                var oModelRFC = _this.getOwnerComponent().getModel("ZGW_3DERP_RFC_SRV");
                var aData = _this.getView().getModel("stock").getData().results;
                var oParam = {};

                aOrigSelIdx.forEach(i => {
                    var oData = aData[i];

                    oParam["N_IT_DATA"].push({
                        PostingDate: sapDateFormat.format(new Date(oData.POSTDT)),
                        MatDoc: oData.MATDOC,
                        MatDocYear: oData.MATDOCYEAR
                    })
                });

                oModelRFC.create("/GoodsMvt_CancelSet", oParam, {
                    method: "POST",
                    success: function(oResult, oResponse) {
                        console.log("GoodsMvt_CancelSet", oResult, oResponse);

                        // if (oResult.EReturnno.length > 0) {
                        //     _this.getView().getModel("ui").setProperty("/activeDlvNo", oResult.EReturnno);
                        //     _oHeader.dlvNo = oResult.EReturnno;
                        //     _this.onAddHeader()
                        // } else {
                        //     var sMessage = oResult.N_GetNumberReturn.results[0].Type + ' - ' + oResult.N_GetNumberReturn.results[0].Message;
                        //     sap.m.MessageBox.error(sMessage);
                        // }
                    },
                    error: function(err) {
                        console.log("GoodsMvt_CancelSet err", err);
                        _this.closeLoadingDialog();
                    }
                });
            },

            onDispDtlMatDoc() {
                _this._MatDocDtlDialog.open();
            },

            onMatDocDtlClose() {
                _this._MatDocDtlDialog.close();
            },

            onRefreshMatDoc() {
                _this.getMatDoc();
            },

            onCellClickIO(oEvent) {
                var sIONo = oEvent.getParameters().rowBindingContext.getObject().IONO;
                var sProcessCd = oEvent.getParameters().rowBindingContext.getObject().PROCESSCD;

                _this.getView().getModel("ui").setProperty("/activeIONo", sIONo);
                _this.getView().getModel("ui").setProperty("/activeProcessCd", sProcessCd);

                _this.onCellClick(oEvent);

                // Clear Sort and Filter
                this.clearSortFilter("stockTab");
                this.clearSortFilter("matDocTab");
            },

            clearSortFilter(pTable) {
                var oTable = this.byId(pTable);
                var oColumns = oTable.getColumns();
                for (var i = 0, l = oColumns.length; i < l; i++) {

                    if (oColumns[i].getFiltered()) {
                        oColumns[i].filter("");
                        // oColumns[i].setFilterValue("");;
                        // oColumns[i].setFiltered(false);
                    }

                    if (oColumns[i].getSorted()) {
                        oColumns[i].setSorted(false);
                    }
                }
            },

            setRowReadMode(arg) {
                var oTable = this.byId(arg + "Tab");
                oTable.getColumns().forEach((col, idx) => {                    
                    this._aColumns[arg].filter(item => item.label === col.getLabel().getText())
                        .forEach(ci => {
                            if (ci.type === "STRING" || ci.type === "NUMBER") {
                                col.setTemplate(new sap.m.Text({
                                    text: "{" + arg + ">" + ci.name + "}",
                                    wrapping: false,
                                    tooltip: "{" + arg + ">" + ci.name + "}"
                                }));
                            }
                            else if (ci.type === "BOOLEAN") {
                                col.setTemplate(new sap.m.CheckBox({selected: "{" + arg + ">" + ci.name + "}", editable: false}));
                            }

                            if (ci.required) {
                                col.getLabel().removeStyleClass("requiredField");
                            }
                        })
                })
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

                if (oTable.getId().indexOf("ioTab") >= 0) {
                    sModel = "io";
                }
                else if (oTable.getId().indexOf("stockTab") >= 0) {
                    sModel = "stock";
                }
                else if (oTable.getId().indexOf("matDocTab") >= 0) {
                    sModel = "matDoc";
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

                if (oTable.getId().indexOf("ioTab") >= 0) {
                    sModel = "io";
                }
                else if (oTable.getId().indexOf("stockTab") >= 0) {
                    sModel = "stock";
                }
                else if (oTable.getId().indexOf("matDocTab") >= 0) {
                    sModel = "matDoc";
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
                    var oTable = oEvent.getSource();
                    var sRowPath = oEvent.getParameters().rowBindingContext.sPath;
                    var sModel;

                    if (oTable.getId().indexOf("ioTab") >= 0) {
                        sModel = "io";
                    }
                    else if (oTable.getId().indexOf("stockTab") >= 0) {
                        sModel = "stock";
                    }
                    else if (oTable.getId().indexOf("matDocTab") >= 0) {
                        sModel = "matDoc";
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
                oDDTextParam.push({CODE: "IO"});
                oDDTextParam.push({CODE: "STOCK"});
                oDDTextParam.push({CODE: "MATDOC"});
                oDDTextParam.push({CODE: "POSTCONSUMP"});
                oDDTextParam.push({CODE: "CANCELCONSUMP"});
                oDDTextParam.push({CODE: "DISPDTL"});

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
