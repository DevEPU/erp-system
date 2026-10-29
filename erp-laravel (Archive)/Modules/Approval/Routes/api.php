<?php

use Illuminate\Support\Facades\Route;
use Modules\Approval\Http\Controllers\ApprovalTypesController;
use Modules\Approval\Http\Controllers\ApprovalRulesController;
use Modules\Approval\Http\Controllers\ApprovalRuleUsersController;

/*
|--------------------------------------------------------------------------
| API Routes for Approval Module
|--------------------------------------------------------------------------
|
| Semua route di sini otomatis masuk ke group "api" middleware,
| sesuai dengan setting RouteServiceProvider modul.
|
*/

Route::prefix('approvals')->group(function () {
    Route::get('/pending-counts', ['\Modules\Approval\Http\Controllers\ApprovalRequestController', 'pendingCounts']);

    Route::middleware('auth:api')->group(function () {
        // Approval Types
        Route::apiResource('types', '\Modules\Approval\Http\Controllers\ApprovalTypesController');

        // Approval Rules
        Route::apiResource('rules', '\Modules\Approval\Http\Controllers\ApprovalRulesController');

        // Approval Rule Users
        Route::apiResource('rule-users', '\Modules\Approval\Http\Controllers\ApprovalRuleUsersController');
    });
});
