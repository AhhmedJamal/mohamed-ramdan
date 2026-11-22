# Story 8.4: SMS Gateway & SMTP External Integration Adapters (UC-69, UC-70, NFR-004)

Status: done

## Requirements Covered
- UC-69: SMS Gateway Adapter.
  - Validates Saudi mobile numbers (`^05\d{8}$`).
  - Dispatches SMS and records audit logs in `sms_logs` with recipient, status (`sent`/`failed`), error message, and timestamp.
- UC-70: SMTP Email server adapter.
- Non-functional requirement NFR-004: Reliable asynchronous notification pipeline with error capture.

## Implementation Summary
- Backend:
  - Service: `SmsGatewayService.php`.
  - Model: `SmsLog.php`.
  - Configuration: `config/mail.php` with SMTP mail driver.
- Tests: `CronAndNotificationTest::test_sms_gateway_service_validation` passing.

