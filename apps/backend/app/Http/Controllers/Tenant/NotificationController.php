<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Tenant\Notification;
use App\Services\NotificationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    protected NotificationService $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    /**
     * Get user & role notifications
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['status' => 'error', 'message' => 'غير مصرح'], 401);
        }

        $subdomain = $request->header('X-Tenant-Subdomain') ?? $request->query('subdomain');
        $role = $user->getRoleForCompany($subdomain) ?? 'data_entry';

        $notifications = $this->notificationService->getUserNotifications($user->id, $role);
        $unreadCount = $notifications->where('is_read', false)->count();

        return response()->json([
            'status' => 'success',
            'unread_count' => $unreadCount,
            'data' => $notifications,
        ]);
    }

    /**
     * Mark a single notification as read
     */
    public function markAsRead(Request $request, int $id): JsonResponse
    {
        $notification = Notification::find($id);
        if (!$notification) {
            return response()->json(['status' => 'error', 'message' => 'الإشعار غير موجود'], 404);
        }

        $notification->update([
            'is_read' => true,
            'read_at' => now(),
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'تم تمييز الإشعار كمقروء',
            'data' => $notification,
        ]);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request): JsonResponse
    {
        $user = $request->user();
        $subdomain = $request->header('X-Tenant-Subdomain') ?? $request->query('subdomain');
        $role = $user->getRoleForCompany($subdomain) ?? 'data_entry';

        Notification::where(function ($q) use ($user, $role) {
            $q->where('user_id', $user->id)
                ->orWhere('role', $role);
        })
            ->where('is_read', false)
            ->update([
                'is_read' => true,
                'read_at' => now(),
            ]);

        return response()->json([
            'status' => 'success',
            'message' => 'تم تمييز جميع الإشعارات كمقروءة',
        ]);
    }
}

