# Story 8.1: Daily Rent Due Reminders Cron Job (7-Day Advance & Due Date) (UC-64, UC-65)

Status: done

## Requirements Covered
- UC-64: Daily 7-day advance rent reminder (`erp:send-rent-reminders`).
- UC-65: Daily due-date rent reminder.
- Multi-company iteration through active tenant databases.
- Prevents duplicate alerts on the same day for the same installment.
- Dispatches SMS alerts to Saudi mobile numbers (`05XXXXXXXX`) and logs dispatches.

## Implementation Summary
- Artisan Command: `SendRentRemindersCommand.php` (`erp:send-rent-reminders`).
- Models: `Installment.php`, `RentalContract.php`, `Tenant.php`, `Notification.php`, `SmsLog.php`.
- Tests: `CronAndNotificationTest::test_daily_rent_reminders_cron_job` passing.

