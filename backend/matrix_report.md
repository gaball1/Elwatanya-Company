# Authorization Matrix & Verification Report

## ✅ Duplicate Check: PASS (0 Duplicates)

## ✅ Naming Consistency Check: PASS (All follow resource.action)

## Authorization Matrix

**project.read**
- SUPER_ADMIN
- PROJECT_MANAGER
- SITE_ENGINEER
- EMPLOYEE

**project.create**
- SUPER_ADMIN
- PROJECT_MANAGER

**project.update**
- SUPER_ADMIN
- PROJECT_MANAGER
- SITE_ENGINEER

**project.delete**
- SUPER_ADMIN
- PROJECT_MANAGER

**project.export**
- SUPER_ADMIN
- PROJECT_MANAGER

**building.read**
- SUPER_ADMIN
- EMPLOYEE

**building.create**
- SUPER_ADMIN

**building.update**
- SUPER_ADMIN

**building.delete**
- SUPER_ADMIN

**building.export**
- SUPER_ADMIN

**employer_boq.read**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE
- SITE_ENGINEER
- SURVEYOR
- EMPLOYEE

**employer_boq.create**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**employer_boq.update**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**employer_boq.delete**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**employer_boq.import**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**employer_boq.export**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**analytical_boq.read**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE
- SITE_ENGINEER
- SURVEYOR
- EMPLOYEE

**analytical_boq.create**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**analytical_boq.update**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**analytical_boq.delete**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**analytical_boq.import**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**analytical_boq.export**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**final_boq.read**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE
- SITE_ENGINEER
- SURVEYOR
- EMPLOYEE

**final_boq.create**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**final_boq.update**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**final_boq.delete**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**final_boq.analyze**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**final_boq.distribute**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**final_boq.sync**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**final_boq.import**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**final_boq.lock**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**final_boq.unlock**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**final_boq.archive**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**final_boq.restore**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**final_boq.export**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**final_boq.component.create**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**final_boq.component.update**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**final_boq.component.delete**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**contractor_boq.read**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE
- SITE_ENGINEER
- SURVEYOR
- SUBCONTRACTOR
- EMPLOYEE

**contractor_boq.create**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**contractor_boq.update**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**contractor_boq.delete**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**contractor_boq.allocate**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**contractor_boq.export**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**extract.read**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE
- SITE_ENGINEER
- SURVEYOR
- ACCOUNTANT
- SUBCONTRACTOR

**extract.create**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE
- SITE_ENGINEER
- SURVEYOR

**extract.update**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE
- SURVEYOR

**extract.delete**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**extract.submit**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE
- SITE_ENGINEER
- SURVEYOR

**extract.approve**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE
- ACCOUNTANT

**extract.reject**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**extract.reopen**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**extract.export**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE

**payment.read**
- SUPER_ADMIN
- PROJECT_MANAGER
- ACCOUNTANT

**payment.create**
- SUPER_ADMIN
- ACCOUNTANT

**payment.update**
- SUPER_ADMIN
- ACCOUNTANT

**payment.approve**
- SUPER_ADMIN
- ACCOUNTANT

**payment.reject**
- SUPER_ADMIN
- ACCOUNTANT

**payment.cancel**
- SUPER_ADMIN
- ACCOUNTANT

**payment.export**
- SUPER_ADMIN
- ACCOUNTANT

**subcontractor.read**
- SUPER_ADMIN

**subcontractor.create**
- SUPER_ADMIN

**subcontractor.update**
- SUPER_ADMIN

**subcontractor.delete**
- SUPER_ADMIN

**subcontractor.export**
- SUPER_ADMIN

**notification.read**
- SUPER_ADMIN

**notification.create**
- SUPER_ADMIN

**notification.send**
- SUPER_ADMIN

**notification.delete**
- SUPER_ADMIN

**audit.read**
- SUPER_ADMIN
- PROJECT_MANAGER

**audit.export**
- SUPER_ADMIN
- PROJECT_MANAGER

**inventory.read**
- SUPER_ADMIN
- STORE_KEEPER
- PROCUREMENT

**inventory.create**
- SUPER_ADMIN
- STORE_KEEPER

**inventory.update**
- SUPER_ADMIN
- STORE_KEEPER

**inventory.export**
- SUPER_ADMIN
- STORE_KEEPER

**supplier.read**
- SUPER_ADMIN
- PROCUREMENT

**supplier.create**
- SUPER_ADMIN
- PROCUREMENT

**supplier.update**
- SUPER_ADMIN
- PROCUREMENT

**supplier.delete**
- SUPER_ADMIN
- PROCUREMENT

**supplier.export**
- SUPER_ADMIN
- PROCUREMENT

**employee.read**
- SUPER_ADMIN
- HR

**employee.create**
- SUPER_ADMIN
- HR

**employee.update**
- SUPER_ADMIN
- HR

**employee.delete**
- SUPER_ADMIN
- HR

**employee.export**
- SUPER_ADMIN
- HR

**attendance.read**
- SUPER_ADMIN
- HR

**attendance.update**
- SUPER_ADMIN
- HR

**attendance.export**
- SUPER_ADMIN
- HR

**report.read**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE
- ACCOUNTANT

**report.export**
- SUPER_ADMIN
- PROJECT_MANAGER
- TECHNICAL_OFFICE
- ACCOUNTANT

**system.manage**
- SUPER_ADMIN

