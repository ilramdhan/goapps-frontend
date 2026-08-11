// AUTO-GENERATED from the 2026-07-01 RBAC audit (spec Appendix A). 279 permission codes,
// grouped by owning page. Import these constants instead of hardcoding permission strings.
// Regenerate when permissions change; keep in sync with the backend permission catalog.

export const PERMISSIONS = {
  // Employee Level (ADMIN_EMPLOYEE_LEVEL)
  EmployeeLevel: {
    employeelevelApprove: "iam.master.employeelevel.approve",
    employeelevelBypass: "iam.master.employeelevel.bypass",
    employeelevelCreate: "iam.master.employeelevel.create",
    employeelevelDelete: "iam.master.employeelevel.delete",
    employeelevelExport: "iam.master.employeelevel.export",
    employeelevelImport: "iam.master.employeelevel.import",
    employeelevelRelease: "iam.master.employeelevel.release",
    employeelevelSubmit: "iam.master.employeelevel.submit",
    employeelevelUpdate: "iam.master.employeelevel.update",
    employeelevelView: "iam.master.employeelevel.view",
  },
  // User Management (ADMIN_USERS)
  UserManagement: {
    accountCreate: "iam.user.account.create",
    accountDelete: "iam.user.account.delete",
    accountExport: "iam.user.account.export",
    accountImport: "iam.user.account.import",
    accountUpdate: "iam.user.account.update",
    accountView: "iam.user.account.view",
    companymappingAssign: "iam.user.companymapping.assign",
    companymappingRemove: "iam.user.companymapping.remove",
    companymappingView: "iam.user.companymapping.view",
  },
  // Dashboards (BI_VIEWER_LIST)
  Dashboards: {
    dashboardView: "finance.bi.dashboard.view",
  },
  // Dashboard (CI_DASHBOARD)
  Dashboard: {
    dashboardView: "ci.module.dashboard.view",
  },
  // Dashboard (EXSIM_DASHBOARD)
  Dashboard1: {
    dashboardView: "exsim.module.dashboard.view",
  },
  // Costing Process (FINANCE_COSTING)
  CostingProcess: {
    costingCreate: "finance.transaction.costing.create",
    costingUpdate: "finance.transaction.costing.update",
    costingView: "finance.transaction.costing.view",
  },
  // Dashboard (FINANCE_DASHBOARD)
  Dashboard2: {
    dashboardView: "finance.module.dashboard.view",
  },
  // Machine (FINANCE_MACHINE)
  Machine: {
    machineCreate: "finance.yarnmaster.machine.create",
    machineDelete: "finance.yarnmaster.machine.delete",
    machineUpdate: "finance.yarnmaster.machine.update",
    machineView: "finance.yarnmaster.machine.view",
  },
  // Product Requests (FINANCE_PRODUCT_REQUESTS)
  ProductRequests: {
    paramvalueUpdate: "finance.costing.paramvalue.update",
    routeUnlock: "finance.costing.route.unlock",
    requestApprove: "finance.product.request.approve",
    requestAssign: "finance.product.request.assign",
    requestConfirm: "finance.product.request.confirm",
    requestCreate: "finance.product.request.create",
    requestDelete: "finance.product.request.delete",
    requestReject: "finance.product.request.reject",
    requestRelease: "finance.product.request.release",
    requestReopen: "finance.product.request.reopen",
    requestResolve: "finance.product.request.resolve",
    requestReview: "finance.product.request.review",
    requestSubmit: "finance.product.request.submit",
    requestUpdate: "finance.product.request.update",
    requestView: "finance.product.request.view",
    chatDelete: "finance.transaction.chat.delete",
    chatRead: "finance.transaction.chat.read",
    chatSend: "finance.transaction.chat.send",
    costcalcTrigger: "finance.transaction.costcalc.trigger",
    prdrequestCreate: "finance.transaction.prdrequest.create",
    prdrequestDelete: "finance.transaction.prdrequest.delete",
    prdrequestSubmit: "finance.transaction.prdrequest.submit",
    prdrequestUpdate: "finance.transaction.prdrequest.update",
    prdrequestView: "finance.transaction.prdrequest.view",
    workflowApprove: "finance.transaction.workflow.approve",
    workflowReassign: "finance.transaction.workflow.reassign",
    workflowReject: "finance.transaction.workflow.reject",
  },
  // RM Groups (FINANCE_RM_GROUPS)
  RmGroups: {
    groupdetailCreate: "finance.rmpricing.groupdetail.create",
    groupdetailDelete: "finance.rmpricing.groupdetail.delete",
    groupdetailUpdate: "finance.rmpricing.groupdetail.update",
    groupdetailView: "finance.rmpricing.groupdetail.view",
    groupheadCreate: "finance.rmpricing.grouphead.create",
    groupheadDelete: "finance.rmpricing.grouphead.delete",
    groupheadUpdate: "finance.rmpricing.grouphead.update",
    groupheadView: "finance.rmpricing.grouphead.view",
  },
  // Unit of Measure (FINANCE_UOM)
  UnitOfMeasure: {
    uomCreate: "finance.master.uom.create",
    uomDelete: "finance.master.uom.delete",
    uomExport: "finance.master.uom.export",
    uomImport: "finance.master.uom.import",
    uomUpdate: "finance.master.uom.update",
    uomView: "finance.master.uom.view",
  },
  // Dashboard (HR_DASHBOARD)
  Dashboard3: {
    dashboardView: "hr.module.dashboard.view",
  },
  // Dashboard (IT_DASHBOARD)
  Dashboard4: {
    dashboardView: "it.module.dashboard.view",
  },
  // UOM Category (FINANCE_UOM_CATEGORY)
  UomCategory: {
    uomcategoryCreate: "finance.master.uomcategory.create",
    uomcategoryDelete: "finance.master.uomcategory.delete",
    uomcategoryExport: "finance.master.uomcategory.export",
    uomcategoryImport: "finance.master.uomcategory.import",
    uomcategoryUpdate: "finance.master.uomcategory.update",
    uomcategoryView: "finance.master.uomcategory.view",
  },
  // Spin Fixed Cost (FINANCE_SPIN_FIXED_COST)
  SpinFixedCost: {
    spinfixedcostCreate: "finance.master.spinfixedcost.create",
    spinfixedcostDelete: "finance.master.spinfixedcost.delete",
    spinfixedcostUpdate: "finance.master.spinfixedcost.update",
    spinfixedcostView: "finance.master.spinfixedcost.view",
  },
  // RM Category (FINANCE_RM_CATEGORY)
  RmCategory: {
    rmcategoryCreate: "finance.master.rmcategory.create",
    rmcategoryDelete: "finance.master.rmcategory.delete",
    rmcategoryExport: "finance.master.rmcategory.export",
    rmcategoryImport: "finance.master.rmcategory.import",
    rmcategoryUpdate: "finance.master.rmcategory.update",
    rmcategoryView: "finance.master.rmcategory.view",
  },
  // Employee Group (ADMIN_EMPLOYEE_GROUP)
  EmployeeGroup: {
    employeegroupCreate: "iam.master.employeegroup.create",
    employeegroupDelete: "iam.master.employeegroup.delete",
    employeegroupExport: "iam.master.employeegroup.export",
    employeegroupImport: "iam.master.employeegroup.import",
    employeegroupUpdate: "iam.master.employeegroup.update",
    employeegroupView: "iam.master.employeegroup.view",
  },
  // Roles & Permissions (ADMIN_ROLES)
  RolesPermissions: {
    roleCreate: "iam.rbac.role.create",
    roleDelete: "iam.rbac.role.delete",
    roleExport: "iam.rbac.role.export",
    roleImport: "iam.rbac.role.import",
    roleUpdate: "iam.rbac.role.update",
    roleView: "iam.rbac.role.view",
  },
  // Admin Panel (BI_ADMIN)
  AdminPanel: {
    auditView: "finance.bi.audit.view",
    dashboardCreate: "finance.bi.dashboard.create",
    dashboardDelete: "finance.bi.dashboard.delete",
    dashboardUpdate: "finance.bi.dashboard.update",
    datasourceUpdate: "finance.bi.datasource.update",
    datasourceView: "finance.bi.datasource.view",
    jobUpdate: "finance.bi.job.update",
    jobView: "finance.bi.job.view",
  },
  // Finance (FINANCE)
  Finance: {
    rootView: "finance.module.root.view",
  },
  // Intermingling (FINANCE_INTERMINGLING)
  Intermingling: {
    interminglingCreate: "finance.yarnmaster.intermingling.create",
    interminglingDelete: "finance.yarnmaster.intermingling.delete",
    interminglingUpdate: "finance.yarnmaster.intermingling.update",
    interminglingView: "finance.yarnmaster.intermingling.view",
  },
  // Master (FINANCE_MASTER)
  Master: {
    masterView: "finance.module.master.view",
  },
  // Oracle Sync (FINANCE_ORACLE_SYNC)
  OracleSync: {
    oraclesyncCreate: "finance.transaction.oraclesync.create",
    oraclesyncDelete: "finance.transaction.oraclesync.delete",
    oraclesyncView: "finance.transaction.oraclesync.view",
  },
  // Parameter (FINANCE_PARAMETER)
  Parameter: {
    parameterCreate: "finance.master.parameter.create",
    parameterDelete: "finance.master.parameter.delete",
    parameterExport: "finance.master.parameter.export",
    parameterImport: "finance.master.parameter.import",
    parameterUpdate: "finance.master.parameter.update",
    parameterView: "finance.master.parameter.view",
  },
  // Parameters (FINANCE_PARAMETERS)
  Parameters: {
    parametersCreate: "finance.master.parameters.create",
    parametersDelete: "finance.master.parameters.delete",
    parametersUpdate: "finance.master.parameters.update",
    parametersView: "finance.master.parameters.view",
  },
  // Products (FINANCE_PRODUCTS)
  Products: {
    masterCreate: "finance.product.master.create",
    masterDelete: "finance.product.master.delete",
    masterDuplicate: "finance.product.master.duplicate",
    masterUpdate: "finance.product.master.update",
    masterView: "finance.product.master.view",
    cstproductCreate: "finance.transaction.cstproduct.create",
    cstproductDelete: "finance.transaction.cstproduct.delete",
    cstproductDuplicate: "finance.transaction.cstproduct.duplicate",
    cstproductLock: "finance.transaction.cstproduct.lock",
    cstproductUnlock: "finance.transaction.cstproduct.unlock",
    cstproductUnlockoverride: "finance.transaction.cstproduct.unlockoverride",
    cstproductUpdate: "finance.transaction.cstproduct.update",
    cstproductView: "finance.transaction.cstproduct.view",
  },
  // RM Costs (FINANCE_RM_COSTS)
  RmCosts: {
    costRecalculate: "finance.rmpricing.cost.recalculate",
    costView: "finance.rmpricing.cost.view",
  },
  // Product Routes (FINANCE_PRODUCT_ROUTES)
  ProductRoutes: {
    routeCreate: "finance.product.route.create",
    routeUpdate: "finance.product.route.update",
    routeView: "finance.product.route.view",
  },
  // Calc Jobs (FINANCE_CALC_JOBS)
  CalcJobs: {
    caljobCancel: "finance.cost.caljob.cancel",
    caljobTrigger: "finance.cost.caljob.trigger",
    caljobView: "finance.cost.caljob.view",
  },
  // Cost Results (FINANCE_COST_RESULTS)
  CostResults: {
    historyView: "finance.cost.history.view",
    resultApprove: "finance.cost.result.approve",
    resultVerify: "finance.cost.result.verify",
    resultView: "finance.cost.result.view",
  },
  // Permission Management (ADMIN_PERMISSIONS)
  PermissionManagement: {
    permissionCreate: "iam.rbac.permission.create",
    permissionDelete: "iam.rbac.permission.delete",
    permissionExport: "iam.rbac.permission.export",
    permissionImport: "iam.rbac.permission.import",
    permissionUpdate: "iam.rbac.permission.update",
    permissionView: "iam.rbac.permission.view",
  },
  // Calc Schedule (FINANCE_CALC_SCHEDULE)
  CalcSchedule: {
    caljobSchedule: "finance.cost.caljob.schedule",
  },
  // Product Types (FINANCE_PRODUCT_TYPE)
  ProductTypes: {
    producttypeCreate: "finance.master.producttype.create",
    producttypeDelete: "finance.master.producttype.delete",
    producttypeUpdate: "finance.master.producttype.update",
    producttypeView: "finance.master.producttype.view",
  },
  // Menu Management (ADMIN_MENUS)
  MenuManagement: {
    menuCreate: "iam.menu.menu.create",
    menuDelete: "iam.menu.menu.delete",
    menuExport: "iam.menu.menu.export",
    menuImport: "iam.menu.menu.import",
    menuUpdate: "iam.menu.menu.update",
    menuView: "iam.menu.menu.view",
  },
  // Upload Data (BI_UPLOAD)
  UploadData: {
    uploadCreate: "finance.bi.upload.create",
    uploadImport: "finance.bi.upload.import",
  },
  // Formula (FINANCE_FORMULA)
  Formula: {
    formulaCreate: "finance.master.formula.create",
    formulaDelete: "finance.master.formula.delete",
    formulaExport: "finance.master.formula.export",
    formulaImport: "finance.master.formula.import",
    formulaUpdate: "finance.master.formula.update",
    formulaView: "finance.master.formula.view",
  },
  // Item Cons Stock PO (FINANCE_ITEM_CONS_STOCK_PO)
  ItemConsStockPo: {
    itemconsstockpoView: "finance.transaction.itemconsstockpo.view",
  },
  // Product Grade (FINANCE_PRODUCT_GRADE)
  ProductGrade: {
    productgradeCreate: "finance.yarnmaster.productgrade.create",
    productgradeDelete: "finance.yarnmaster.productgrade.delete",
    productgradeUpdate: "finance.yarnmaster.productgrade.update",
    productgradeView: "finance.yarnmaster.productgrade.view",
  },
  // Transaction (FINANCE_TRANSACTION)
  Transaction: {
    transactionView: "finance.module.transaction.view",
  },
  // Ungrouped Items (FINANCE_UNGROUPED_RM)
  UngroupedItems: {
    ungroupedView: "finance.rmpricing.ungrouped.view",
  },
  // IT (IT)
  It: {
    rootView: "it.module.root.view",
  },
  // Delivery Margin (BI_DELIVERY_MARGIN)
  DeliveryMargin: {
    deliverymarginExport: "finance.bi.deliverymargin.export",
    deliverymarginView: "finance.bi.deliverymargin.view",
  },
  // CMS Management (ADMIN_CMS)
  CmsManagement: {
    pageCreate: "iam.cms.page.create",
    pageDelete: "iam.cms.page.delete",
    pageUpdate: "iam.cms.page.update",
    pageView: "iam.cms.page.view",
    sectionCreate: "iam.cms.section.create",
    sectionDelete: "iam.cms.section.delete",
    sectionUpdate: "iam.cms.section.update",
    sectionView: "iam.cms.section.view",
    settingUpdate: "iam.cms.setting.update",
    settingView: "iam.cms.setting.view",
  },
  // MB Head (FINANCE_MB_HEAD)
  MbHead: {
    mbheadCreate: "finance.yarnmaster.mbhead.create",
    mbheadDelete: "finance.yarnmaster.mbhead.delete",
    mbheadUpdate: "finance.yarnmaster.mbhead.update",
    mbheadView: "finance.yarnmaster.mbhead.view",
  },
  // HR (HR)
  Hr: {
    rootView: "hr.module.root.view",
  },
  // ERP Item Master (FINANCE_ERP_ITEM)
  ErpItemMaster: {
    erpitemCreate: "finance.master.erpitem.create",
    erpitemDelete: "finance.master.erpitem.delete",
    erpitemUpdate: "finance.master.erpitem.update",
    erpitemView: "finance.master.erpitem.view",
  },
  // Companies (ADMIN_MASTER_COMPANY)
  Companies: {
    companyCreate: "iam.master.company.create",
    companyDelete: "iam.master.company.delete",
    companyUpdate: "iam.master.company.update",
    companyView: "iam.master.company.view",
    iamorganizationcompanycreate: "iam.organization.company.create",
    iamorganizationcompanydelete: "iam.organization.company.delete",
    companyExport: "iam.organization.company.export",
    companyImport: "iam.organization.company.import",
    iamorganizationcompanyupdate: "iam.organization.company.update",
    iamorganizationcompanyview: "iam.organization.company.view",
  },
  // CI (CI)
  Ci: {
    rootView: "ci.module.root.view",
  },
  // MB Spin (FINANCE_MB_SPIN)
  MbSpin: {
    mbspinCreate: "finance.yarnmaster.mbspin.create",
    mbspinDelete: "finance.yarnmaster.mbspin.delete",
    mbspinUpdate: "finance.yarnmaster.mbspin.update",
    mbspinView: "finance.yarnmaster.mbspin.view",
  },
  // Divisions (ADMIN_MASTER_DIVISION)
  Divisions: {
    divisionCreate: "iam.master.division.create",
    divisionDelete: "iam.master.division.delete",
    divisionUpdate: "iam.master.division.update",
    divisionView: "iam.master.division.view",
    iamorganizationdivisioncreate: "iam.organization.division.create",
    iamorganizationdivisiondelete: "iam.organization.division.delete",
    divisionExport: "iam.organization.division.export",
    divisionImport: "iam.organization.division.import",
    iamorganizationdivisionupdate: "iam.organization.division.update",
    iamorganizationdivisionview: "iam.organization.division.view",
  },
  // Departments (ADMIN_MASTER_DEPARTMENT)
  Departments: {
    departmentCreate: "iam.master.department.create",
    departmentDelete: "iam.master.department.delete",
    departmentUpdate: "iam.master.department.update",
    departmentView: "iam.master.department.view",
    iamorganizationdepartmentcreate: "iam.organization.department.create",
    iamorganizationdepartmentdelete: "iam.organization.department.delete",
    departmentExport: "iam.organization.department.export",
    departmentImport: "iam.organization.department.import",
    iamorganizationdepartmentupdate: "iam.organization.department.update",
    iamorganizationdepartmentview: "iam.organization.department.view",
  },
  // Sections (ADMIN_MASTER_SECTION)
  Sections: {
    sectionCreate: "iam.master.section.create",
    sectionDelete: "iam.master.section.delete",
    sectionUpdate: "iam.master.section.update",
    sectionView: "iam.master.section.view",
    iamorganizationsectioncreate: "iam.organization.section.create",
    iamorganizationsectiondelete: "iam.organization.section.delete",
    sectionExport: "iam.organization.section.export",
    sectionImport: "iam.organization.section.import",
    iamorganizationsectionupdate: "iam.organization.section.update",
    iamorganizationsectionview: "iam.organization.section.view",
  },
  // Company Mappings (ADMIN_MASTER_COMPANY_MAPPING)
  CompanyMappings: {
    companymappingCreate: "iam.master.companymapping.create",
    companymappingDelete: "iam.master.companymapping.delete",
    companymappingUpdate: "iam.master.companymapping.update",
    companymappingView: "iam.master.companymapping.view",
  },
  // Workflow Templates (ADMIN_WORKFLOW_TEMPLATE)
  WorkflowTemplates: {
    workflowtemplateCreate: "iam.master.workflowtemplate.create",
    workflowtemplateDelete: "iam.master.workflowtemplate.delete",
    workflowtemplateUpdate: "iam.master.workflowtemplate.update",
    workflowtemplateView: "iam.master.workflowtemplate.view",
  },
  // Export Import (EXSIM)
  ExportImport: {
    rootView: "exsim.module.root.view",
  },
  // Box/Bobbin Cost (FINANCE_BOX_BOBBIN_COST)
  BoxBobbinCost: {
    boxbobbincostCreate: "finance.yarnmaster.boxbobbincost.create",
    boxbobbincostDelete: "finance.yarnmaster.boxbobbincost.delete",
    boxbobbincostUpdate: "finance.yarnmaster.boxbobbincost.update",
    boxbobbincostView: "finance.yarnmaster.boxbobbincost.view",
  },
  // Fill Config (FINANCE_FILL_CONFIG)
  FillConfig: {
    fillconfigCreate: "finance.costing.fillconfig.create",
    fillconfigDelete: "finance.costing.fillconfig.delete",
    fillconfigUpdate: "finance.costing.fillconfig.update",
    fillconfigView: "finance.costing.fillconfig.view",
  },
  // Fill Tasks (FINANCE_FILL_TASKS)
  FillTasks: {
    assignmentOverride: "finance.costing.assignment.override",
    filltaskApprove: "finance.costing.filltask.approve",
    filltaskCreate: "finance.costing.filltask.create",
    filltaskDelete: "finance.costing.filltask.delete",
    filltaskUpdate: "finance.costing.filltask.update",
    filltaskView: "finance.costing.filltask.view",
  },
  // Lookup Master (FINANCE_LOOKUP_MASTER)
  LookupMaster: {
    lookupmasterCreate: "finance.yarnmaster.lookupmaster.create",
    lookupmasterDelete: "finance.yarnmaster.lookupmaster.delete",
    lookupmasterUpdate: "finance.yarnmaster.lookupmaster.update",
    lookupmasterView: "finance.yarnmaster.lookupmaster.view",
  },
  // GLOBAL (GLOBAL)
  Global: {
    logExport: "iam.audit.log.export",
    logView: "iam.audit.log.view",
    sessionDelete: "iam.session.session.delete",
    sessionView: "iam.session.session.view",
  },
} as const
