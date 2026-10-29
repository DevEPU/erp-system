<?php
namespace Modules\Approval\Http\Controllers;

use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use Modules\Approval\Entities\ApprovalRequest;
use Modules\Approval\Services\ApprovalEngine;
use Illuminate\Support\Facades\Auth;

class ApprovalRequestController extends Controller
{
    protected $engine;

    public function __construct(ApprovalEngine $engine)
    {
        $this->engine = $engine;
    }

    public function index()
    {
        $list = ApprovalRequest::with(['type', 'rule'])->latest()->paginate(20);
        return view('approval::requests.index', compact('list'));
    }

    public function show($id)
    {
        $req = ApprovalRequest::with(['type', 'rule.levels.users.user', 'logs'])->findOrFail($id);
        $approverIds = $this->engine->getApproversForRequest($req);
        return view('approval::requests.show', compact('req', 'approverIds'));
    }

    public function store(Request $request)
    {
        $request->validate([
            'requestable_type' => 'required|string',
            'requestable_id' => 'required|integer',
            'approval_types_id' => 'required|exists:approval_types,id',
            'amount' => 'required|numeric|min:0',
        ]);

        $req = $this->engine->createRequest(
            $request->requestable_type,
            $request->requestable_id,
            $request->approval_type_id,
            $request->amount,
            Auth::id()
        );

        return redirect()
            ->route('approval_requests.show', $req->id)
            ->with('success', 'Approval request created successfully.');
    }

    public function approve(Request $request, $id)
    {
        $req = ApprovalRequest::findOrFail($id);
        $this->engine->approve($req, Auth::id(), $request->comment ?? null);

        return back()->with('success', 'Approval approved successfully.');
    }

    public function reject(Request $request, $id)
    {
        $req = ApprovalRequest::findOrFail($id);
        $this->engine->reject($req, Auth::id(), $request->comment ?? null);

        return back()->with('success', 'Approval rejected successfully.');
    }

    public function pendingCounts(Request $request)
    {
        $userId = Auth::id() ?: $request->query('user_id');

        if (!$userId) {
            return response()->json([]);
        }


        // Count pending requests where the current user is an assigned approver
        // This relies on ApprovalRequestLog having 'assigned' status for the user at the current level

        $logs = \Modules\Approval\Entities\ApprovalRequestLog::where('user_id', $userId)
            ->where('action', 'assigned')
            ->whereHas('approvalRequest', function ($q) {
                $q->where('status', 'pending')
                    ->whereColumn('approval_request_logs.level', 'approval_requests.current_level');
            })
            ->with('approvalRequest.type')
            ->get();

        $counts = [
            'Master Budget' => 0,
            'Purchase Request' => 0,
            'Target Sales' => 0,
            'Product Request' => 0,
            'Over Budget' => 0,
            'Total' => 0
        ];

        foreach ($logs as $log) {
            $requestCode = $log->approvalRequest->type->approval_code ?? '';

            if ($requestCode === 'Budget') {
                $counts['Master Budget']++;
            } elseif ($requestCode === 'PR') {
                $counts['Purchase Request']++;
            } elseif ($requestCode === 'Sales') {
                $counts['Target Sales']++;
            } elseif ($requestCode === 'Product') {
                $counts['Product Request']++;
            } elseif ($requestCode === 'OB') {
                $counts['Over Budget']++;
            }
            $counts['Total']++;
        }

        return response()->json($counts);

    }
}
