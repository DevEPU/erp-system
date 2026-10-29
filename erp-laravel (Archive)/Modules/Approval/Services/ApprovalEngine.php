<?php

namespace Modules\Approval\Services;

use Modules\Approval\Entities\ApprovalRequest;
use Modules\Approval\Entities\ApprovalRule;
use Modules\Approval\Entities\ApprovalRuleLevel;
use Modules\Approval\Entities\ApprovalRuleUser;
use Illuminate\Support\Facades\DB;

class ApprovalEngine
{
    /**
     * Membuat Approval Request baru berdasarkan Approval Type dan Rule yang berlaku.
     */
    public function createRequest($modelClass, $modelId, $approvalTypesId, $amount, $requestedBy)
    {
        return DB::transaction(function () use ($modelClass, $modelId, $approvalTypesId, $amount, $requestedBy) {

            // ---TEMUKAN ATURAN (RULE) YANG AKTIF ---
            $activeRule = ApprovalRule::where('approval_types_id', $approvalTypesId)
                ->where('is_active', true)
                ->first();

            if (!$activeRule) {
                return $this->createAutoApprovedRequest($modelClass, $modelId, $approvalTypesId, $amount, $requestedBy);
            }

            // Cari SEMUA level yang amount_limit >= amount (kandidat level)
            $candidateLevels = ApprovalRuleLevel::where('approval_rules_id', $activeRule->id)
                ->where('amount_limit', '>=', $amount)
                ->orderBy('level', 'asc')
                ->get();

            if ($candidateLevels->isEmpty()) {
                throw new \Exception("Jumlah amount (" . number_format($amount) . ") melebihi batas (Limit) yang diatur dalam Approval Rule aktif. Silahkan hubungi administrator.");
            }

            $startingLevel = null;
            $requesterRule = null;

            // Cari Level Pertama dimana requester terdaftar (Starting Level)
            foreach ($candidateLevels as $level) {
                $rule = ApprovalRuleUser::where('approval_rule_levels_id', $level->id)
                    ->where('role', 'requester')
                    ->where('user_id', $requestedBy)
                    ->first();
                if ($rule) {
                    $startingLevel = $level;
                    $requesterRule = $rule;
                    break; // Ketemu level start yang valid
                }
            }

            // Jika tidak ketemu di level manapun
            if (!$startingLevel) {
                throw new \Exception("Alur approval tidak ditemukan untuk requester ini (User ID: $requestedBy). Pastikan user terdaftar sebagai 'Requester' di rule approval yang aktif.");
            }

            $targetSequence = $requesterRule->sequence;

            // Cari Approver HANYA di level yang sama dengan Starting Level
            // Kita tidak boleh loncat level untuk mencari approver
            $approvers = ApprovalRuleUser::where('approval_rule_levels_id', $startingLevel->id)
                ->where('role', 'approver')
                ->where('sequence', $targetSequence)
                ->get();

            // Jika tidak ada approver di level ini
            if ($approvers->isEmpty()) {
                throw new \Exception("Tidak ada approver yang ditemukan untuk Sequence {$targetSequence} di Level {$startingLevel->level}. Silahkan Cek Konfigurasi Approval.");
            }

            $currentLevel = $startingLevel->level;
            $finalApprovers = $approvers;

            $approvalRequest = ApprovalRequest::create([
                'approval_types_id' => $approvalTypesId,
                'approval_rules_id' => $activeRule->id,
                'requestable_type' => $modelClass,
                'requestable_id' => $modelId,
                'created_by' => $requestedBy,
                'amount' => $amount,
                'status' => 'pending',
                'current_level' => $currentLevel,
            ]);

            foreach ($finalApprovers as $approver) {
                $approvalRequest->logs()->create([
                    'level' => $currentLevel,
                    'user_id' => $approver->user_id,
                    'action' => 'assigned',
                ]);
            }

            return $approvalRequest;
        });
    }

    /**
     * Memperbarui Approval Request yang ada (Restart flow).
     */
    public function refreshRequest($approvalRequest, $amount, $requestedBy)
    {
        return DB::transaction(function () use ($approvalRequest, $amount, $requestedBy) {

            // Hapus log lama
            $approvalRequest->logs()->delete();

            $approvalTypesId = $approvalRequest->approval_types_id;

            // ---TEMUKAN ATURAN (RULE) YANG AKTIF ---
            $activeRule = ApprovalRule::where('approval_types_id', $approvalTypesId)
                ->where('is_active', true)
                ->first();

            if (!$activeRule) {
                $approvalRequest->update([
                    'approval_rules_id' => null,
                    'amount' => $amount,
                    'status' => 'approved',
                    'current_level' => 0,
                ]);
                $this->syncStatusToSource($approvalRequest);
                return $approvalRequest;
            }

            // Cari SEMUA level yang amount_limit >= amount (kandidat level)
            $candidateLevels = ApprovalRuleLevel::where('approval_rules_id', $activeRule->id)
                ->where('amount_limit', '>=', $amount)
                ->orderBy('level', 'asc')
                ->get();

            if ($candidateLevels->isEmpty()) {
                throw new \Exception("Jumlah amount (" . number_format($amount) . ") melebihi batas (Limit) yang diatur dalam Approval Rule aktif. Silahkan hubungi administrator.");
            }

            $startingLevel = null;
            $requesterRule = null;

            foreach ($candidateLevels as $level) {
                $rule = ApprovalRuleUser::where('approval_rule_levels_id', $level->id)
                    ->where('role', 'requester')
                    ->where('user_id', $requestedBy)
                    ->first();
                if ($rule) {
                    $startingLevel = $level;
                    $requesterRule = $rule;
                    break;
                }
            }

            if (!$startingLevel) {
                throw new \Exception("Alur approval tidak ditemukan untuk requester ini (User ID: $requestedBy). Pastikan user terdaftar sebagai 'Requester' di rule approval yang aktif.");
            }

            $targetSequence = $requesterRule->sequence;
            $approvers = ApprovalRuleUser::where('approval_rule_levels_id', $startingLevel->id)
                ->where('role', 'approver')
                ->where('sequence', $targetSequence)
                ->get();

            if ($approvers->isEmpty()) {
                throw new \Exception("Tidak ada approver yang ditemukan untuk Sequence {$targetSequence} di Level {$startingLevel->level}. Silahkan Cek Konfigurasi Approval.");
            }

            $currentLevel = $startingLevel->level;

            $approvalRequest->update([
                'approval_rules_id' => $activeRule->id,
                'amount' => $amount,
                'status' => 'pending',
                'current_level' => $currentLevel,
                'created_by' => $requestedBy,
            ]);

            foreach ($approvers as $approver) {
                $approvalRequest->logs()->create([
                    'level' => $currentLevel,
                    'user_id' => $approver->user_id,
                    'action' => 'assigned',
                ]);
            }

            return $approvalRequest;
        });
    }

    /**
     * Helper method untuk membuat request yang langsung disetujui.
     */
    private function createAutoApprovedRequest($modelClass, $modelId, $approvalTypesId, $amount, $requestedBy, $ruleId = null)
    {
        $approvalRequest = ApprovalRequest::create([
            'approval_types_id' => $approvalTypesId,
            'approval_rules_id' => $ruleId, // Bisa null jika tidak ada rule aktif
            'requestable_type' => $modelClass,
            'requestable_id' => $modelId,
            'created_by' => $requestedBy,
            'amount' => $amount,
            'status' => 'approved', // Langsung approved
            'current_level' => 0, // Level 0 menandakan tidak ada proses approval
        ]);

        // Langsung sinkronkan status 'Approved' ke model aslinya (MasterBudget)
        $this->syncStatusToSource($approvalRequest);

        return $approvalRequest;
    }

    /**
     * Proses approval atau reject.
     */
    public function process($approvalRequest, $userId, $action, $note = null)
    {
        return DB::transaction(function () use ($approvalRequest, $userId, $action, $note) {
            $log = $approvalRequest->logs()
                ->where('user_id', $userId) // ✅ DIPERBAIKI
                ->where('level', $approvalRequest->current_level)
                ->where('action', 'assigned') // Hanya bisa proses yang masih 'assigned'
                ->first();

            if (!$log) {
                throw new \Exception('You are not authorized to process this request at the current level or it has been processed.');
            }

            $log->update([
                'action' => $action, // 'approved' atau 'rejected'
                'comment' => $note,
            ]);

            if ($action === 'rejected') {
                $approvalRequest->update(['status' => 'rejected']);
                $this->syncStatusToSource($approvalRequest);
                return $approvalRequest;
            }

            // Cek apakah masih ada approver lain yang belum approve di level ini
            $pendingCount = $approvalRequest->logs()
                ->where('level', $approvalRequest->current_level)
                ->where('action', 'assigned')
                ->count();

            // Jika semua sudah approve di level ini
            if ($pendingCount == 0) {

                // Mulai pencarian level berikutnya
                $nextLevelNumber = $approvalRequest->current_level + 1;
                $foundNextLevel = false;

                // Ambil semua level di atas level sekarang
                $higherLevels = ApprovalRuleLevel::where('approval_rules_id', $approvalRequest->approval_rules_id)
                    ->where('level', '>=', $nextLevelNumber)
                    ->orderBy('level', 'asc')
                    ->get();

                foreach ($higherLevels as $nextLevelData) {
                    // 1. Cek apakah USER (Requester) terdaftar di level KANDIDAT ini?
                    // Kita cari spesifik di level ini.
                    $requesterAtThisLevel = $nextLevelData->users()
                        ->where('role', 'requester')
                        ->where('user_id', $approvalRequest->created_by)
                        ->first();

                    if (!$requesterAtThisLevel) {
                        // User tidak main di level ini -> Skip
                        continue;
                    }

                    // 2. Ambil Sequence dari Requester DI LEVEL INI
                    $targetSequence = $requesterAtThisLevel->sequence;

                    // 3. Cari Approver di level ini yang sequence-nya SAMA
                    $nextApprovers = $nextLevelData->users()
                        ->where('role', 'approver')
                        ->where('sequence', $targetSequence)
                        ->get();

                    if ($nextApprovers->isNotEmpty()) {
                        // Kita temukan level berikutnya yang valid!
                        foreach ($nextApprovers as $nextUser) {
                            $approvalRequest->logs()->create([
                                'level' => $nextLevelData->level,
                                'user_id' => $nextUser->user_id,
                                'action' => 'assigned',
                            ]);
                        }
                        $approvalRequest->update(['current_level' => $nextLevelData->level]);
                        $foundNextLevel = true;
                        break; // Stop loop, kita sudah assign ke level ini
                    }
                    // Jika approver kosong? Berarti konfigurasi salah (ada requester tapi ga ada approver).
                    // Opsional: throw error, atau skip. Saat ini kita skip (continue looping).
                }

                if (!$foundNextLevel) {
                    // Jika sampai habis level tidak ada yang assign -> Approved
                    $approvalRequest->update(['status' => 'approved']);
                    $this->syncStatusToSource($approvalRequest);
                }
            }

            return $approvalRequest;
        });
    }

    /**
     * Sinkronkan status Approval ke model sumber (misal MasterBudget).
     * Model sumber wajib punya kolom "status".
     */
    protected function syncStatusToSource(ApprovalRequest $approvalRequest)
    {
        $model = $approvalRequest->requestable;
        if (!$model)
            return;

        $status = match ($approvalRequest->status) {
            'approved' => 'Approved',
            'rejected' => 'Rejected',
            default => 'Pending',
        };

        $model->update(['status' => $status]);
    }

    /**
     * Approve cepat (untuk admin override).
     */
    // public function approve(ApprovalRequest $request, $user)
    // {
    //     $request->update(['status' => 'approved']);
    //     $this->syncStatusToSource($request);
    // }

    public function forceApprove(ApprovalRequest $request, int $userId, string $note = 'Force Approved by Admin')
    {
        // Catat log bahwa admin melakukan override
        $request->logs()->create([
            'level' => $request->current_level ?? 0,
            'user_id' => $userId,
            'action' => 'approved',
            'comment' => $note,
        ]);

        // Update status utama
        $request->update(['status' => 'approved']);
        $this->syncStatusToSource($request);
    }
}
