<?php

namespace App\Console\Commands;

use App\Models\Central\Company;
use App\Services\TenantManager;
use Database\Seeders\CentralSeeder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use PDO;

class InitMySQLCommand extends Command
{
    protected $signature = 'app:init-mysql 
                            {--host= : MySQL Host (defaults to env)} 
                            {--port= : MySQL Port (defaults to env)} 
                            {--username= : MySQL Username (defaults to env)} 
                            {--password= : MySQL Password (defaults to env)}';

    protected $description = 'Initialize and provision Mohamed Ramadan Group MySQL databases (Central + Multi-Tenant Isolation)';

    public function handle(TenantManager $tenantManager): int
    {
        $host = $this->option('host') ?? config('database.connections.central.host', '127.0.0.1');
        $port = $this->option('port') ?? config('database.connections.central.port', '3306');
        $username = $this->option('username') ?? config('database.connections.central.username', 'root');
        $password = $this->option('password') ?? config('database.connections.central.password', '');
        $centralDb = config('database.connections.central.database', 'mohamed_ramdan_central');

        $this->info("=== تهيئة وإعداد قواعد بيانات MySQL لنظام مجموعة محمد رمضان ===");
        $this->info("Host: {$host}:{$port} | User: {$username}");

        // 1. Test PDO connection to MySQL server
        try {
            $pdo = new PDO("mysql:host={$host};port={$port}", $username, $password, [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            ]);
            $this->info("✔ تم الاتصال بنجاح بخادم MySQL.");
        } catch (\PDOException $e) {
            $this->error("✖ فشل الاتصال بخادم MySQL: " . $e->getMessage());
            $this->warn("يرجى التأكد من تشغيل خادم MySQL على المنفذ {$port} وصحة اسم المستخدم وكلمة المرور في ملف .env");
            return self::FAILURE;
        }

        // 2. Create Central Database
        $this->info("جاري إنشاء قاعدة البيانات المركزية ({$centralDb})...");
        $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$centralDb}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");
        $this->info("✔ تم إنشاء / التحقق من وجود قاعدة البيانات المركزية بنجاح.");

        // Reconnect central
        Config::set('database.connections.central.host', $host);
        Config::set('database.connections.central.port', $port);
        Config::set('database.connections.central.username', $username);
        Config::set('database.connections.central.password', $password);
        Config::set('database.connections.central.database', $centralDb);
        DB::purge('central');
        DB::reconnect('central');

        // 3. Migrate Central Schema
        $this->info("جاري ترحيل جداول النظام المركزي (Central Migrations)...");
        Artisan::call('migrate', [
            '--database' => 'central',
            '--path' => 'database/migrations/central',
            '--force' => true,
        ]);
        $this->line(Artisan::output());

        // 4. Seed Central Data (Companies & Users)
        $this->info("جاري تهيئة الشركات وحسابات المستخدمين المعتمدة (Central Seeder)...");
        $seeder = new CentralSeeder();
        $seeder->run();
        $this->info("✔ تم تأسيس بيانات الشركات والأدوار الـ 6.");

        // 5. Migrate and Seed all Tenant Databases
        $companies = Company::where('status', 'active')->get();
        $this->info("جاري تأسيس قواعد بيانات الشركات المستقلة المعزولة (" . $companies->count() . " شركات)...");

        foreach ($companies as $comp) {
            $this->info(">> تأسيس قاعدة بيانات الشركة: {$comp->name} ({$comp->db_name})...");
            $pdo->exec("CREATE DATABASE IF NOT EXISTS `{$comp->db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;");

            $tenantManager->provisionTenantDatabase($comp);
            $this->info("✔ تم ترحيل وتهيئة شجرة الحسابات للشركة {$comp->name}.");
        }

        $this->newLine();
        $this->info("==================================================================");
        $this->info(" تم تحويل وتهيئة النظام بنجاح ليعمل على قواعد بيانات MySQL بالكامل!");
        $this->info("==================================================================");

        return self::SUCCESS;
    }
}

