@extends('layouts.app')

@section('title', 'Update Supplier')

@section('breadcrumb')
    <ol class="breadcrumb border-0 m-0">
        <li class="breadcrumb-item"><a href="{{ route('home') }}">Home</a></li>
        <li class="breadcrumb-item"><a href="{{ route('suppliers.index') }}">Suppliers</a></li>
        <li class="breadcrumb-item active">Edit</li>
    </ol>
@endsection

@section('content')
    <div class="container-fluid">
        <form action="{{ route('suppliers.update', $supplier) }}" method="POST">
            @csrf
            @method('patch')
            <div class="row">
                <div class="col-lg-12">
                    @include('utils.alerts')
                    <div class="form-group">
                        <button class="btn btn-primary">Update Supplier <i class="bi bi-check"></i></button>
                    </div>
                </div>
                <div class="col-lg-12">
                    <div class="card">
                        <div class="card-body">
                            <div class="form-row">
                                <div class="col-lg-4">
                                    <div class="form-group">
                                        <label for="supplier_name">Supplier Name <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" name="supplier_name" required
                                            value="{{ $supplier->supplier_name }}">
                                    </div>
                                </div>
                                <div class="col-lg-4">
                                    <div class="form-group">
                                        <label for="supplier_code">Supplier Code <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" name="supplier_code" required
                                            value="{{ $supplier->supplier_code }}">
                                    </div>
                                </div>
                                <div class="col-lg-4">
                                    <div class="form-group">
                                        <label for="supplier_email">Email <span class="text-danger">*</span></label>
                                        <input type="email" class="form-control" name="supplier_email" required
                                            value="{{ $supplier->supplier_email }}">
                                    </div>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="col-lg-4">
                                    <div class="form-group">
                                        <label for="supplier_phone">Phone <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" name="supplier_phone" required
                                            value="{{ $supplier->supplier_phone }}">
                                    </div>
                                </div>
                                <div class="col-lg-4">
                                    <div class="form-group">
                                        <label for="fax">Fax</label>
                                        <input type="text" class="form-control" name="fax" value="{{ $supplier->fax }}">
                                    </div>
                                </div>
                                <div class="col-lg-4">
                                    <div class="form-group">
                                        <label for="contact_person">Contact Person</label>
                                        <input type="text" class="form-control" name="contact_person"
                                            value="{{ $supplier->contact_person }}">
                                    </div>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="col-lg-4">
                                    <div class="form-group">
                                        <label for="city">City <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" name="city" required
                                            value="{{ $supplier->city }}">
                                    </div>
                                </div>
                                <div class="col-lg-4">
                                    <div class="form-group">
                                        <label for="region">Region / Wilayah</label>
                                        <input type="text" class="form-control" name="region"
                                            value="{{ $supplier->region }}">
                                    </div>
                                </div>
                                <div class="col-lg-4">
                                    <div class="form-group">
                                        <label for="country">Country <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" name="country" required
                                            value="{{ $supplier->country }}">
                                    </div>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="col-lg-4">
                                    <div class="form-group">
                                        <label for="npwp">NPWP</label>
                                        <input type="text" class="form-control" name="npwp" value="{{ $supplier->npwp }}">
                                    </div>
                                </div>
                                <div class="col-lg-4">
                                    <div class="form-group">
                                        <label for="ppn_id">PPN</label>
                                        <select class="form-control" name="ppn_id">
                                            <option value="">Select PPN</option>
                                            @foreach($ppns as $ppn)
                                                <option value="{{ $ppn->id }}" {{ $supplier->ppn_id == $ppn->id ? 'selected' : '' }}>{{ $ppn->name }} ({{ $ppn->rate }}%)</option>
                                            @endforeach
                                        </select>
                                    </div>
                                </div>
                                <div class="col-lg-4">
                                    <div class="form-group">
                                        <label for="pph_id">PPH</label>
                                        <select class="form-control" name="pph_id">
                                            <option value="">Select PPH</option>
                                            @foreach($pphs as $pph)
                                                <option value="{{ $pph->id }}" {{ $supplier->pph_id == $pph->id ? 'selected' : '' }}>{{ $pph->name }} ({{ $pph->rate }}%)</option>
                                            @endforeach
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="col-lg-4">
                                    <div class="form-group">
                                        <label for="currency_id">Currency</label>
                                        <select class="form-control" name="currency_id">
                                            <option value="">Select Currency</option>
                                            @foreach($currencies as $currency)
                                                <option value="{{ $currency->id }}" {{ $supplier->currency_id == $currency->id ? 'selected' : '' }}>{{ $currency->code }} - {{ $currency->currency_name }}
                                                </option>
                                            @endforeach
                                        </select>
                                    </div>
                                </div>
                                <div class="col-lg-4">
                                    <div class="form-group">
                                        <label for="is_active">Status</label>
                                        <select class="form-control" name="is_active">
                                            <option value="1" {{ $supplier->is_active == 1 ? 'selected' : '' }}>Active
                                            </option>
                                            <option value="0" {{ $supplier->is_active == 0 ? 'selected' : '' }}>Inactive
                                            </option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div class="form-row">
                                <div class="col-lg-12">
                                    <div class="form-group">
                                        <label for="address">Address <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" name="address" required
                                            value="{{ $supplier->address }}">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </form>
    </div>
@endsection