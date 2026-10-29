<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| is assigned the "api" middleware group. Enjoy building your API!
|
*/

// Product API Routes
// Get form data (categories, units)
Route::get('/products/form-data', 'ProductController@getFormData');

// Get product stats recap
Route::get('/products/stats', 'ProductController@apiStats');

// List all products
Route::get('/products', 'ProductController@apiIndex');

// Create product
Route::post('/products', 'ProductController@apiStore');

// Update product
Route::put('/products/{id}', 'ProductController@apiUpdate');

// Delete product
Route::delete('/products/{id}', 'ProductController@apiDestroy');

// Product Requests API Routes
Route::get('/product-requests/form-data', 'ProductRequestController@getVerificationData');
Route::get('/product-requests/stats', 'ProductRequestController@apiStats');
Route::get('/product-requests', 'ProductRequestController@index');
Route::post('/product-requests', 'ProductRequestController@store');
Route::put('/product-requests/{id}', 'ProductRequestController@update');
Route::delete('/product-requests/{id}', 'ProductRequestController@destroy');
Route::put('/product-requests/{id}/verify', 'ProductRequestController@verify');
Route::post('/product-requests/{id}/input', 'ProductRequestController@inputToProduct');
