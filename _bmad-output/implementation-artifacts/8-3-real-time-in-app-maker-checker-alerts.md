# Story 8.3: Real-Time In-App Maker-Checker Alerts (UC-67, UC-68)

Status: done

## Requirements Covered
- UC-67: Instant In-App notification to General Accountant when Data Entry submits draft vouchers or billings.
- UC-68: Instant In-App notification to Data Entry when General Accountant rejects a voucher with mandatory reason ($\ge 10$ characters).
- Interactive notification center dropdown in header with unread badge counter, mark as read, and mark all as read actions.

## Implementation Summary
- Backend:
  - Model: `Notification.php`.
  - Migration: `2026_01_01_000014_create_notifications_and_sms_logs_table.php`.
  - Service: `NotificationService.php`.
  - Controller: `NotificationController.php` (`index`, `markAsRead`, `markAllAsRead`).
  - Triggers in `VoucherController::storeReceipt`, `storeDisbursement`, `reject`.
- Frontend:
  - Interactive Bell and notification drawer in `AppLayout.jsx`.
- Tests: `CronAndNotificationTest::test_in_app_notifications_lifecycle_and_api` passing.

