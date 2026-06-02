// Fetch wrapper that injects JWT from localStorage and handles errors
const API_BASE = process.env.NEXT_PUBLIC_API_URL || '';

// ── Error message mapping: backend → user-friendly Indonesian ──────────────
const errorMap: Record<string, string> = {
  // Attendance (clock-in / clock-out)
  'employee not found for this user':
    'Akun Anda belum terdaftar sebagai karyawan di sistem. Silakan hubungi admin HR.',
  'employee is not active':
    'Status karyawan Anda tidak aktif. Hubungi admin HR untuk informasi lebih lanjut.',
  'already clocked in today':
    'Anda sudah melakukan absen masuk hari ini. Tidak bisa absen masuk dua kali.',
  'already clocked out today':
    'Anda sudah melakukan absen pulang hari ini.',
  'no clock-in record found for today':
    'Belum ada catatan absen masuk hari ini. Silakan absen masuk terlebih dahulu.',
  'employee not found':
    'Data karyawan tidak ditemukan di sistem.',

  // Overtime
  'can only approve pending requests':
    'Pengajuan ini sudah pernah diproses (disetujui/ditolak). Hanya pengajuan tertunda yang bisa disetujui.',
  'can only reject pending requests':
    'Pengajuan ini sudah pernah diproses. Hanya pengajuan tertunda yang bisa ditolak.',
  'can only cancel pending requests':
    'Pengajuan ini sudah diproses dan tidak bisa dibatalkan lagi.',
  'failed to list overtime':
    'Gagal memuat data lembur. Silakan coba lagi.',
  'failed to list pending overtime':
    'Gagal memuat data lembur yang tertunda.',
  'overtime request not found':
    'Pengajuan lembur tidak ditemukan.',

  // Attendance corrections
  'attendance record not found':
    'Data absensi tidak ditemukan.',
  'attendance record does not belong to this employee':
    'Data absensi ini bukan milik Anda.',
  'requested_clock_in is required for clock_in correction':
    'Jam masuk baru harus diisi untuk koreksi absen masuk.',
  'requested_clock_out is required for clock_out correction':
    'Jam pulang baru harus diisi untuk koreksi absen pulang.',
  'requested_clock_in is required for both correction':
    'Jam masuk baru harus diisi untuk koreksi absen.',
  'requested_clock_out is required for both correction':
    'Jam pulang baru harus diisi untuk koreksi absen.',
  'employee has not clocked out yet':
    'Karyawan ini belum melakukan absen pulang, sehingga belum bisa dikoreksi.',
  'correction is not in pending status':
    'Koreksi ini sudah diproses sebelumnya.',
  'reject_reason is required':
    'Alasan penolakan harus diisi.',
  'failed to list pending corrections':
    'Gagal memuat daftar koreksi yang tertunda.',
  'failed to list corrections':
    'Gagal memuat daftar koreksi.',

  // Employees
  'employee code already exists in this tenant':
    'Kode karyawan sudah digunakan. Gunakan kode yang berbeda.',
  'employee_code is required':
    'Kode karyawan wajib diisi.',
  'first_name is required':
    'Nama depan wajib diisi.',
  'email is required':
    'Email wajib diisi.',
  'employment_status is required':
    'Status kepegawaian wajib dipilih.',
  'employment_type is required':
    'Jenis kepegawaian wajib dipilih.',
  'join_date is required':
    'Tanggal masuk wajib diisi.',
  'position not found':
    'Posisi/jabatan yang dipilih tidak ditemukan.',
  'invalid employment status':
    'Status kepegawaian tidak valid.',
  'failed to change status':
    'Gagal mengubah status karyawan.',
  'failed to delete employee':
    'Gagal menghapus data karyawan.',

  // Tenants
  'slug already exists':
    'Slug tenant sudah digunakan.',
  'tenant not found':
    'Tenant tidak ditemukan.',
  'months must be between 1 and 36':
    'Perpanjangan minimal 1 bulan dan maksimal 36 bulan.',

  // Shift
  'shift not found':
    'Shift tidak ditemukan.',
  'failed to delete shift':
    'Gagal menghapus shift.',

  // Departments
  'department code already exists in this tenant':
    'Kode departemen sudah ada di tenant ini.',
  'parent department not found':
    'Departemen induk tidak ditemukan.',
  'department not found':
    'Departemen tidak ditemukan.',
  'failed to delete department':
    'Gagal menghapus departemen.',

  // Reimbursement
  'reimbursement type code already exists':
    'Kode tipe reimbursemen sudah ada.',
  'reimbursement type not found':
    'Tipe reimbursemen tidak ditemukan.',
  'reimbursement type does not belong to this tenant':
    'Tipe reimbursemen bukan milik tenant Anda.',
  'failed to list reimbursement types':
    'Gagal memuat tipe reimbursemen.',
  'failed to delete reimbursement type':
    'Gagal menghapus tipe reimbursemen.',

  // Assets
  'asset is already assigned to another employee':
    'Aset sudah ditugaskan ke karyawan lain.',
  'asset already returned':
    'Aset ini sudah dikembalikan sebelumnya.',
  'date_from and date_to are required':
    'Tanggal mulai dan tanggal akhir wajib diisi.',

  // Auth
  'invalid credentials':
    'Email atau password salah. Silakan coba lagi.',
  'email already registered':
    'Email ini sudah terdaftar. Gunakan email lain atau login.',
  'invalid tenant_code: tenant not found':
    'Kode tenant tidak valid. Periksa kembali kode perusahaan Anda.',
  'invalid or expired token':
    'Sesi Anda telah berakhir. Silakan login kembali.',
  'token is required':
    'Token diperlukan. Silakan login kembali.',
  'invalid refresh token':
    'Token sesi tidak valid. Silakan login kembali.',
  'refresh token mismatch':
    'Sesi Anda tidak valid. Silakan login kembali.',
};

/** Translate a backend error message into a user-friendly Indonesian message */
function translateError(message: string): string {
  // Try exact match first
  if (errorMap[message]) return errorMap[message];

  // Partial matches for dynamic messages (e.g. clock-in/clock-out window messages)
  if (message.startsWith('clock-in not yet open'))
    return 'Belum waktunya absen masuk. Periksa jadwal shift Anda.';
  if (message.startsWith('clock-out window has passed'))
    return 'Waktu absen pulang sudah lewat. Hubungi admin HR jika perlu koreksi.';
  if (message.startsWith('validation:'))
    return message.replace(/^validation:\s*/, 'Data tidak valid: ').replace(/;/g, '\n• ');

  // Fallback for unmapped messages
  return message;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res: Response;
  try {
    // Add timeout signal to detect hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
    const fetchOpts = { ...options, headers, signal: controller.signal } as RequestInit;
    res = await fetch(`${API_BASE}${path}`, fetchOpts);
    clearTimeout(timeoutId);
  } catch (err: any) {
    let msg: string;
    if (err?.name === 'AbortError') {
      msg = 'Server tidak merespon dalam 30 detik. Silakan coba lagi.';
    } else if (err instanceof TypeError) {
      msg = `Tidak dapat terhubung ke server (${API_BASE || 'domain yang sama'}). Mungkin port diblokir atau server sedang down.`;
    } else {
      msg = err?.message || 'Terjadi kesalahan jaringan yang tidak dikenal.';
    }
    throw new Error(msg);
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error(`Server mengembalikan respons tidak terduga (${res.status}).`);
  }

  if (!data.success) {
    const msg = translateError(data.message || `Request gagal (${res.status})`);
    if (data.error_code === 3201 || data.error_code === 3202) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      if (typeof window !== 'undefined') window.location.href = '/login';
    }
    throw new Error(msg);
  }
  return data.data;
}

export const api = {
  get<T>(path: string) {
    return request<T>(path);
  },
  post<T>(path: string, body?: unknown) {
    return request<T>(path, { method: 'POST', body: JSON.stringify(body) });
  },
  put<T>(path: string, body?: unknown) {
    return request<T>(path, { method: 'PUT', body: JSON.stringify(body) });
  },
  del<T>(path: string) {
    return request<T>(path, { method: 'DELETE' });
  },
};
