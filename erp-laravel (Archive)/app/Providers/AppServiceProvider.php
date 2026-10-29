<?php

namespace App\Providers;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     *
     * @return void
     */
    public function register()
    {
        //
    }

    /**
     * Bootstrap any application services.
     *
     * @return void
     */
    public function boot()
    {
        Model::preventLazyLoading(!app()->isProduction());

        \Illuminate\Database\Eloquent\Relations\Relation::morphMap([
            'Master Budget' => 'Modules\Budget\Entities\MasterBudget',
            'Purchase Request' => 'Modules\Purchase\Entities\Purchase',
            'Over Budget' => 'Modules\Purchase\Entities\Purchase',
            'Target Sales' => 'Modules\TargetSale\Entities\TargetSale',
            'Product Request' => 'Modules\Product\Entities\ProductRequest',
        ]);
    }
}
