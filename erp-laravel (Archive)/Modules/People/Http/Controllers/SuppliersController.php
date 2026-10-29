<?php

namespace Modules\People\Http\Controllers;

use Modules\People\DataTables\SuppliersDataTable;
use Illuminate\Contracts\Support\Renderable;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Gate;
use Modules\People\Entities\Supplier;

class SuppliersController extends Controller
{

    public function index(SuppliersDataTable $dataTable)
    {
        abort_if(Gate::denies('access_suppliers'), 403);

        return $dataTable->render('people::suppliers.index');
    }

    public function apiIndex(Request $request)
    {
        $query = \Modules\People\Entities\Supplier::with(['ppn', 'pph', 'currency'])->orderBy('id', 'desc');

        if ($search = $request->get('search')) {
            $query->where('supplier_name', 'like', "%{$search}%")
                ->orWhere('supplier_code', 'like', "%{$search}%")
                ->orWhere('supplier_email', 'like', "%{$search}%");
        }

        return response()->json($query->paginate(10));
    }


    public function create()
    {
        abort_if(Gate::denies('create_suppliers'), 403);

        $ppns = \Modules\Setting\Entities\Ppn::all();
        $pphs = \Modules\Setting\Entities\Pph::all();
        $currencies = \Modules\Currency\Entities\Currency::all();

        return view('people::suppliers.create', compact('ppns', 'pphs', 'currencies'));
    }


    public function store(Request $request)
    {
        abort_if(Gate::denies('create_suppliers'), 403);

        $request->validate([
            'supplier_name' => 'required|string|max:255',
            'supplier_code' => 'nullable|string|max:255',
            'supplier_phone' => 'required|max:255',
            'supplier_email' => 'required|email|max:255',
            'city' => 'required|string|max:255',
            'region' => 'nullable|string|max:255',
            'country' => 'required|string|max:255',
            'address' => 'required|string|max:500',
            'fax' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'npwp' => 'nullable|string|max:255',
            'ppn_id' => 'nullable|exists:ppns,id',
            'pph_id' => 'nullable|exists:pphs,id',
            'currency_id' => 'nullable|exists:currencies,id',
        ]);

        $supplier = Supplier::create([
            'supplier_name' => $request->supplier_name,
            'supplier_code' => $request->supplier_code,
            'supplier_phone' => $request->supplier_phone,
            'supplier_email' => $request->supplier_email,
            'city' => $request->city,
            'region' => $request->region,
            'country' => $request->country,
            'address' => $request->address,
            'fax' => $request->fax,
            'contact_person' => $request->contact_person,
            'npwp' => $request->npwp,
            'ppn_id' => $request->ppn_id,
            'pph_id' => $request->pph_id,
            'currency_id' => $request->currency_id,
            'is_active' => $request->is_active ?? 1,
        ]);

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Supplier Created!', 'data' => $supplier], 201);
        }

        toast('Supplier Created!', 'success');

        return redirect()->route('suppliers.index');
    }


    public function show(Supplier $supplier)
    {
        abort_if(Gate::denies('show_suppliers'), 403);

        return view('people::suppliers.show', compact('supplier'));
    }


    public function edit(Supplier $supplier)
    {
        abort_if(Gate::denies('edit_suppliers'), 403);

        $ppns = \Modules\Setting\Entities\Ppn::all();
        $pphs = \Modules\Setting\Entities\Pph::all();
        $currencies = \Modules\Currency\Entities\Currency::all();

        return view('people::suppliers.edit', compact('supplier', 'ppns', 'pphs', 'currencies'));
    }


    public function update(Request $request, Supplier $supplier)
    {
        abort_if(Gate::denies('edit_suppliers'), 403);

        $request->validate([
            'supplier_name' => 'required|string|max:255',
            'supplier_code' => 'nullable|string|max:255',
            'supplier_phone' => 'required|max:255',
            'supplier_email' => 'required|email|max:255',
            'city' => 'required|string|max:255',
            'region' => 'nullable|string|max:255',
            'country' => 'required|string|max:255',
            'address' => 'required|string|max:500',
            'fax' => 'nullable|string|max:255',
            'contact_person' => 'nullable|string|max:255',
            'npwp' => 'nullable|string|max:255',
            'ppn_id' => 'nullable|exists:ppns,id',
            'pph_id' => 'nullable|exists:pphs,id',
            'currency_id' => 'nullable|exists:currencies,id',
        ]);

        $supplier->update([
            'supplier_name' => $request->supplier_name,
            'supplier_code' => $request->supplier_code,
            'supplier_phone' => $request->supplier_phone,
            'supplier_email' => $request->supplier_email,
            'city' => $request->city,
            'region' => $request->region,
            'country' => $request->country,
            'address' => $request->address,
            'fax' => $request->fax,
            'contact_person' => $request->contact_person,
            'npwp' => $request->npwp,
            'ppn_id' => $request->ppn_id,
            'pph_id' => $request->pph_id,
            'currency_id' => $request->currency_id,
            'is_active' => $request->is_active ?? 1,
        ]);

        if ($request->wantsJson()) {
            return response()->json(['message' => 'Supplier Updated!', 'data' => $supplier]);
        }

        toast('Supplier Updated!', 'info');

        return redirect()->route('suppliers.index');
    }


    public function destroy(Supplier $supplier)
    {
        abort_if(Gate::denies('delete_suppliers'), 403);

        $supplier->delete();

        if (request()->wantsJson()) {
            return response()->json(['message' => 'Supplier Deleted!']);
        }

        toast('Supplier Deleted!', 'warning');

        return redirect()->route('suppliers.index');
    }
}
