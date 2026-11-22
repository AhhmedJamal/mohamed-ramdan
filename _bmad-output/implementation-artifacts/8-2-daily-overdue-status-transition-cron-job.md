# Story 8.2: Daily Overdue Status Transition Cron Job (UC-66, Section 4.3 & 4.4)

Status: done

## Requirements Covered
- UC-66: Automatic transition of past-due unpaid installments to `overdue` ("متأخرة").
- Automatic transition of active rental contracts with overdue installments to `overdue` ("متأخر").
- Automatic transition of contracts past their end date to `expired` ("منتهي").
- In-App alert dispatched to Branch Manager and General Accountant ("تحول العقد رقم CNT-... إلى متأخر السداد").

## Implementation Summary
- Artisan Command: `UpdateOverdueContractsCommand.php` (`erp:update-overdue-contracts`).
- Service: `NotificationService::notifyContractOverdue`.
- Tests: `CronAndNotificationTest::test_daily_overdue_contracts_transition_cron_job` passing.

