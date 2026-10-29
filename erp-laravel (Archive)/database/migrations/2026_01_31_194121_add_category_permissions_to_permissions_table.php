<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $permissions = [
            'create_categories',
            'edit_categories',
            'delete_categories',
        ];

        foreach ($permissions as $permission) {
            \DB::table('permissions')->insertOrIgnore([
                'name' => $permission,
                'guard_name' => 'web',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        $adminRole = \DB::table('roles')->where('name', 'Admin')->first();
        if ($adminRole) {
            foreach ($permissions as $permission) {
                $perm = \DB::table('permissions')->where('name', $permission)->first();
                if ($perm) {
                    \DB::table('role_has_permissions')->insertOrIgnore([
                        'permission_id' => $perm->id,
                        'role_id' => $adminRole->id,
                    ]);
                }
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $permissions = [
            'create_categories',
            'edit_categories',
            'delete_categories',
        ];

        \DB::table('permissions')->whereIn('name', $permissions)->delete();
    }
};
