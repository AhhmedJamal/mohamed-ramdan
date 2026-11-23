<?php

namespace Database\Seeders;

use App\Models\Central\Company;
use App\Models\Central\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class CentralSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Create Super Admin
        $superAdmin = User::where('mobile', '0500000001')
            ->orWhere('email', 'admin@mohamedramdan.com')
            ->orWhere('email', 'admin@mohamedramadan.com')
            ->first();

        if (!$superAdmin) {
            $superAdmin = User::create([
                'email' => 'admin@mohamedramdan.com',
                'name' => 'محمد رمضان (الأدمن العام)',
                'mobile' => '0500000001',
                'password' => Hash::make('Password@123'),
                'status' => 'active',
            ]);
        } else {
            $superAdmin->update([
                'password' => Hash::make('Password@123'),
                'status' => 'active',
            ]);
        }

        // Also seed admin@mohamedramadan.com
        $ramadanAdmin = User::where('email', 'admin@mohamedramadan.com')->first();
        if (!$ramadanAdmin) {
            $ramadanAdmin = User::create([
                'email' => 'admin@mohamedramadan.com',
                'name' => 'محمد رمضان (الأدمن العام)',
                'mobile' => '0500000009',
                'password' => Hash::make('Password@123'),
                'status' => 'active',
            ]);
        } else {
            $ramadanAdmin->update([
                'password' => Hash::make('Password@123'),
                'status' => 'active',
            ]);
        }

        // Also seed admin@ehkam.com for demo convenience
        $ehkamAdmin = User::where('email', 'admin@ehkam.com')->first();
        if (!$ehkamAdmin) {
            $ehkamAdmin = User::create([
                'email' => 'admin@ehkam.com',
                'name' => 'محمد رمضان (الأدمن العام)',
                'mobile' => '0500000000',
                'password' => Hash::make('Password@123'),
                'status' => 'active',
            ]);
        } else {
            $ehkamAdmin->update([
                'password' => Hash::make('Password@123'),
                'status' => 'active',
            ]);
        }

        // 2. Create 3 Distinct Group Companies (Portfolio Scope per SRS Section 1.3)
        $companiesData = [
            [
                'name' => 'مجموعة رمضان للاستثمار العقاري',
                'trade_activity' => 'استثمارات عقارية وإدارة أملاك',
                'address' => 'طريق الملك فهد، الرياض',
                'country' => 'السعودية',
                'city' => 'الرياض',
                'tax_number' => '300000000100003',
                'subdomain' => 'comp1',
                'db_name' => 'tenant_comp1_db',
                'status' => 'active',
            ],
            [
                'name' => 'شركة رمضان للمقاولات العامة',
                'trade_activity' => 'مشاريع المقاولات والإنشاءات',
                'address' => 'حي الصحافة، الرياض',
                'country' => 'السعودية',
                'city' => 'الرياض',
                'tax_number' => '300000000200003',
                'subdomain' => 'comp2',
                'db_name' => 'tenant_comp2_db',
                'status' => 'active',
            ],
            [
                'name' => 'مؤسسة رمضان للعمليات التجارية',
                'trade_activity' => 'تجارة وتوزيع ومواد بناء',
                'address' => 'حي الملز، الرياض',
                'country' => 'السعودية',
                'city' => 'الرياض',
                'tax_number' => '300000000300003',
                'subdomain' => 'comp3',
                'db_name' => 'tenant_comp3_db',
                'status' => 'active',
            ],
        ];

        $companies = [];
        foreach ($companiesData as $compData) {
            $company = Company::firstOrCreate(
                ['subdomain' => $compData['subdomain']],
                array_merge($compData, ['uuid' => (string) Str::uuid()])
            );
            $companies[$compData['subdomain']] = $company;

            // Attach super admin to company
            $company->users()->syncWithoutDetaching([
                $superAdmin->id => [
                    'role' => 'super_admin',
                    'is_primary_manager' => false,
                ],
                $ehkamAdmin->id => [
                    'role' => 'super_admin',
                    'is_primary_manager' => false,
                ],
                $ramadanAdmin->id => [
                    'role' => 'super_admin',
                    'is_primary_manager' => false,
                ],
            ]);
        }

        // 3. Create Branch Manager for Company 1
        $manager = User::where('mobile', '0500000002')
            ->orWhere('email', 'manager@comp1.com')
            ->first();

        if (!$manager) {
            $manager = User::create([
                'email' => 'manager@comp1.com',
                'name' => 'أحمد السعدي (مدير فرع العقارات)',
                'mobile' => '0500000002',
                'password' => Hash::make('Password@123'),
                'status' => 'active',
            ]);
        }
        $companies['comp1']->users()->syncWithoutDetaching([
            $manager->id => [
                'role' => 'branch_manager',
                'is_primary_manager' => true,
            ]
        ]);

        // 4. Create General Accountant for Company 1
        $accountant = User::where('mobile', '0500000003')
            ->orWhere('email', 'accountant@comp1.com')
            ->first();

        if (!$accountant) {
            $accountant = User::create([
                'email' => 'accountant@comp1.com',
                'name' => 'سامي يوسف (المحاسب العام)',
                'mobile' => '0500000003',
                'password' => Hash::make('Password@123'),
                'status' => 'active',
            ]);
        }
        $companies['comp1']->users()->syncWithoutDetaching([
            $accountant->id => [
                'role' => 'general_accountant',
                'is_primary_manager' => false,
            ]
        ]);

        // 5. Create Data Entry for Company 1
        $dataEntry = User::where('mobile', '0500000004')
            ->orWhere('email', 'dataentry@comp1.com')
            ->first();

        if (!$dataEntry) {
            $dataEntry = User::create([
                'email' => 'dataentry@comp1.com',
                'name' => 'خالد النجار (مدخل البيانات)',
                'mobile' => '0500000004',
                'password' => Hash::make('Password@123'),
                'status' => 'active',
            ]);
        }
        $companies['comp1']->users()->syncWithoutDetaching([
            $dataEntry->id => [
                'role' => 'data_entry',
                'is_primary_manager' => false,
            ]
        ]);
    }
}
