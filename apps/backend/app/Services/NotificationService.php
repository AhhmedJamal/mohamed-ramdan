<?php

namespace App\Services;

use App\Models\Tenant\Notification;
use Illuminate\Database\Eloquent\Collection;

class NotificationService
{
    /**
     * Create an in-app notification
     */
    public function notify(
        string $type,
        string $title,
        string $message,
        ?string $role = null,
        ?int $userId = null,
        ?array $data = null
    ): Notification {
        return Notification::create([
            'user_id' => $userId,
            'role' => $role,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'data' => $data,
            'is_read' => false,
        ]);
    }

    /**
     * UC-67: Notify General Accountant of newly submitted draft vouchers/billings
     */
    public function notifyAccountantOfDraftVoucher(string $voucherNumber, float $amount, string $createdBy): Notification
    {
        return $this->notify(
            'draft_voucher_created',
            'سند جديد بانتظار الاعتماد',
            "قام {$createdBy} بإدخال سند مسودة جديد برقم {$voucherNumber} ومبلغ " . number_format($amount, 2) . " ر.س بانتظار اعتمادك",
            'general_accountant',
            null,
            ['voucher_number' => $voucherNumber, 'amount' => $amount]
        );
    }

    /**
     * UC-68: Notify Data Entry when a voucher is rejected with mandatory reason
     */
    public function notifyDataEntryOfRejection(int $dataEntryUserId, string $voucherNumber, string $rejectionReason): Notification
    {
        return $this->notify(
            'voucher_rejected',
            'تم رفض مسودة السند وإعادتها للتصحيح',
            "تم رفض السند رقم {$voucherNumber} من قبل المحاسب العام. سبب الرفض: {$rejectionReason}",
            'data_entry',
            $dataEntryUserId,
            ['voucher_number' => $voucherNumber, 'rejection_reason' => $rejectionReason]
        );
    }

    /**
     * UC-66: Notify Branch Manager & Accountant of contract turning overdue
     */
    public function notifyContractOverdue(string $contractNumber, string $tenantName, float $overdueAmount): void
    {
        $message = "تحول العقد رقم {$contractNumber} للمستأجر {$tenantName} إلى حالة 'متأخر السداد' لوجود دفعة متأخرة بمبلغ " . number_format($overdueAmount, 2) . " ر.س";

        $this->notify('contract_overdue', 'تنبيه: عقد متأخر السداد', $message, 'branch_manager', null, [
            'contract_number' => $contractNumber,
            'tenant_name' => $tenantName,
            'overdue_amount' => $overdueAmount,
        ]);

        $this->notify('contract_overdue', 'تنبيه: عقد متأخر السداد', $message, 'general_accountant', null, [
            'contract_number' => $contractNumber,
            'tenant_name' => $tenantName,
            'overdue_amount' => $overdueAmount,
        ]);
    }

    /**
     * Get user notifications
     */
    public function getUserNotifications(int $userId, string $role): Collection
    {
        return Notification::where(function ($q) use ($userId, $role) {
            $q->where('user_id', $userId)
                ->orWhere('role', $role);
        })
            ->orderBy('id', 'desc')
            ->limit(50)
            ->get();
    }
}

