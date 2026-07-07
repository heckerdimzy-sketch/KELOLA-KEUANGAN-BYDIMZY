/**
 * ============================================================
 * NeoFinance - Script Utama
 * ============================================================
 * Semua fitur berfungsi 100%
 * Data tersimpan di LocalStorage
 * Format Rupiah pake titik (contoh: Rp 1.000.000)
 * AUTO-FORMAT INPUT: saat ngetik 10000 langsung jadi 10.000
 * ============================================================
 */

let transactions = [];
let targets = [];
let currentEditId = null;
let chartInstances = {};

const $ = (id) => document.getElementById(id);
const DOM = {
    saldoSaatIni: $('saldoSaatIni'),
    totalPemasukan: $('totalPemasukan'),
    totalPengeluaran: $('totalPengeluaran'),
    sisaUang: $('sisaUang'),
    persentasePengeluaran: $('persentasePengeluaran'),
    ringkasanHari: $('ringkasanHari'),
    ringkasanBulan: $('ringkasanBulan'),
    transaksiForm: $('transaksiForm'),
    namaTransaksi: $('namaTransaksi'),
    nominalTransaksi: $('nominalTransaksi'),
    jenisTransaksi: $('jenisTransaksi'),
    kategoriTransaksi: $('kategoriTransaksi'),
    tanggalTransaksi: $('tanggalTransaksi'),
    catatanTransaksi: $('catatanTransaksi'),
    riwayatBody: $('riwayatBody'),
    riwayatJumlah: $('riwayatJumlah'),
    searchRiwayat: $('searchRiwayat'),
    filterKategori: $('filterKategori'),
    filterJenis: $('filterJenis'),
    filterTanggal: $('filterTanggal'),
    sortNominal: $('sortNominal'),
    resetFilter: $('resetFilter'),
    exportJson: $('exportJson'),
    importJson: $('importJson'),
    fileInput: $('fileInput'),
    downloadLaporan: $('downloadLaporan'),
    targetForm: $('targetForm'),
    namaTarget: $('namaTarget'),
    nominalTarget: $('nominalTarget'),
    terkumpulTarget: $('terkumpulTarget'),
    targetList: $('targetList'),
    tabunganTarget: $('tabunganTarget'),
    tabunganBulanan: $('tabunganBulanan'),
    hitungTabungan: $('hitungTabungan'),
    hasilTabungan: $('hasilTabungan'),
    cicilanPokok: $('cicilanPokok'),
    cicilanBunga: $('cicilanBunga'),
    cicilanTenor: $('cicilanTenor'),
    hitungCicilan: $('hitungCicilan'),
    hasilCicilan: $('hasilCicilan'),
    persenNilai: $('persenNilai'),
    persenTotal: $('persenTotal'),
    hitungPersen: $('hitungPersen'),
    hasilPersen: $('hasilPersen'),
    settingTheme: $('settingTheme'),
    settingColor: $('settingColor'),
    hapusSemuaData: $('hapusSemuaData'),
    backupData: $('backupData'),
    restoreData: $('restoreData'),
    restoreInput: $('restoreInput'),
    pageTitle: $('pageTitle'),
    currentDate: $('currentDate'),
    menuToggle: $('menuToggle'),
    sidebar: $('sidebar'),
    toast: $('toast'),
    toggleTheme: $('toggleTheme'),
    statusData: $('statusData'),
};

function formatRupiah(angka) {
    return 'Rp ' + Number(angka).toLocaleString('id-ID');
}

// ============================================================
// AUTO-FORMAT NOMINAL SAAT DIKETIK (LIVE) - REVISI
// ============================================================
function autoFormatNominalInput() {
    const inputs = document.querySelectorAll('input[type="text"]');
    inputs.forEach(input => {
        // Cek apakah input ini untuk nominal (berdasarkan placeholder atau id)
        const isNominal = input.id && (
            input.id.includes('nominal') || 
            input.id.includes('target') || 
            input.id.includes('tabungan') || 
            input.id.includes('cicilan') || 
            input.id.includes('persen') ||
            input.placeholder.includes('Rp') ||
            input.placeholder.match(/[\d\.]+/)
        );
        
        if (!isNominal) return;

        // Saat ngetik, format otomatis
        input.addEventListener('input', function() {
            let raw = this.value.replace(/\./g, '');
            if (raw === '') return;
            let num = parseInt(raw);
            if (!isNaN(num) && num > 0) {
                this.value = num.toLocaleString('id-ID');
            }
        });

        // Saat fokus, tampilkan angka tanpa titik biar gampang diedit
        input.addEventListener('focus', function() {
            let raw = this.value.replace(/\./g, '');
            if (raw !== '' && !isNaN(raw)) {
                this.value = raw;
                this.select();
            }
        });

        // Saat blur, format kembali
        input.addEventListener('blur', function() {
            let raw = this.value.replace(/\./g, '');
            if (raw === '') return;
            let num = parseInt(raw);
            if (!isNaN(num) && num > 0) {
                this.value = num.toLocaleString('id-ID');
            }
        });
    });
}

function today() {
    return new Date().toISOString().split('T')[0];
}

function getDate(dateStr) {
    const d = new Date(dateStr);
    return d.getDate() + ' ' + d.toLocaleString('id-ID', { month: 'short' }) + ' ' + d.getFullYear();
}

function getMonthYear(dateStr) {
    const d = new Date(dateStr);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function showToast(msg, isError = false) {
    DOM.toast.textContent = msg;
    DOM.toast.className = 'toast show' + (isError ? ' error' : '');
    clearTimeout(DOM.toast._timer);
    DOM.toast._timer = setTimeout(() => {
        DOM.toast.classList.remove('show');
    }, 3000);
}

function confirmAction(msg) {
    return confirm(msg);
}

function loadData() {
    try {
        const t = localStorage.getItem('neofinance_transactions');
        transactions = t ? JSON.parse(t) : [];
        const tg = localStorage.getItem('neofinance_targets');
        targets = tg ? JSON.parse(tg) : [];
    } catch (e) {
        transactions = [];
        targets = [];
    }
}

function saveTransactions() {
    localStorage.setItem('neofinance_transactions', JSON.stringify(transactions));
}

function saveTargets() {
    localStorage.setItem('neofinance_targets', JSON.stringify(targets));
}

function saveAll() {
    saveTransactions();
    saveTargets();
}

function getRawNominal(value) {
    return parseInt(value.replace(/\./g, '')) || 0;
}

function updateDashboard() {
    const totalMasuk = transactions
        .filter(t => t.jenis === 'pemasukan')
        .reduce((sum, t) => sum + t.nominal, 0);

    const totalKeluar = transactions
        .filter(t => t.jenis === 'pengeluaran')
        .reduce((sum, t) => sum + t.nominal, 0);

    const saldo = totalMasuk - totalKeluar;

    DOM.saldoSaatIni.textContent = formatRupiah(saldo);
    DOM.totalPemasukan.textContent = formatRupiah(totalMasuk);
    DOM.totalPengeluaran.textContent = formatRupiah(totalKeluar);
    DOM.sisaUang.textContent = formatRupiah(saldo);

    const persen = totalMasuk > 0 ? Math.round((totalKeluar / totalMasuk) * 100) : 0;
    DOM.persentasePengeluaran.textContent = persen + '%';

    const todayStr = today();
    const hariIni = transactions.filter(t => t.tanggal === todayStr);
    const totalHari = hariIni.reduce((sum, t) => sum + (t.jenis === 'pemasukan' ? t.nominal : -t.nominal), 0);
    DOM.ringkasanHari.textContent = formatRupiah(totalHari);

    const bulanIni = getMonthYear(todayStr);
    const bulanData = transactions.filter(t => getMonthYear(t.tanggal) === bulanIni);
    const totalBulan = bulanData.reduce((sum, t) => sum + (t.jenis === 'pemasukan' ? t.nominal : -t.nominal), 0);
    DOM.ringkasanBulan.textContent = formatRupiah(totalBulan);

    updateCharts();
}

function updateCharts() {
    const pengeluaran = transactions.filter(t => t.jenis === 'pengeluaran');
    const catMap = {};
    pengeluaran.forEach(t => {
        catMap[t.kategori] = (catMap[t.kategori] || 0) + t.nominal;
    });
    const labels = Object.keys(catMap);
    const data = Object.values(catMap);

    if (chartInstances.pie) chartInstances.pie.destroy();
    if (labels.length > 0) {
        const ctx = document.getElementById('pieChart').getContext('2d');
        chartInstances.pie = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: ['#2ecc71', '#3498db', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#2c3e50', '#95a5a6', '#34495e'],
                    borderWidth: 2,
                    borderColor: 'var(--bg-card)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true } }
                }
            }
        });
    }

    const bulanMap = {};
    transactions.forEach(t => {
        const key = getMonthYear(t.tanggal);
        if (!bulanMap[key]) bulanMap[key] = { masuk: 0, keluar: 0 };
        if (t.jenis === 'pemasukan') bulanMap[key].masuk += t.nominal;
        else bulanMap[key].keluar += t.nominal;
    });
    const sortedBulan = Object.keys(bulanMap).sort();
    const masukData = sortedBulan.map(b => bulanMap[b].masuk);
    const keluarData = sortedBulan.map(b => bulanMap[b].keluar);

    if (chartInstances.bar) chartInstances.bar.destroy();
    if (sortedBulan.length > 0) {
        const ctx = document.getElementById('barChart').getContext('2d');
        chartInstances.bar = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: sortedBulan,
                datasets: [
                    { label: 'Pemasukan', data: masukData, backgroundColor: '#2ecc71', borderRadius: 4 },
                    { label: 'Pengeluaran', data: keluarData, backgroundColor: '#e74c3c', borderRadius: 4 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true } }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => 'Rp ' + v.toLocaleString('id-ID') } }
                }
            }
        });
    }

    const sortedTx = [...transactions].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    let saldoKum = 0;
    const saldoData = [];
    const tglData = [];
    sortedTx.forEach(t => {
        saldoKum += (t.jenis === 'pemasukan' ? t.nominal : -t.nominal);
        saldoData.push(saldoKum);
        tglData.push(getDate(t.tanggal));
    });

    if (chartInstances.line) chartInstances.line.destroy();
    if (tglData.length > 0) {
        const ctx = document.getElementById('lineChart').getContext('2d');
        chartInstances.line = new Chart(ctx, {
            type: 'line',
            data: {
                labels: tglData,
                datasets: [{
                    label: 'Saldo',
                    data: saldoData,
                    borderColor: '#2ecc71',
                    backgroundColor: 'rgba(46, 204, 113, 0.1)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#2ecc71',
                    borderWidth: 3,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'top', labels: { usePointStyle: true } }
                },
                scales: {
                    y: { beginAtZero: true, ticks: { callback: v => 'Rp ' + v.toLocaleString('id-ID') } }
                }
            }
        });
    }
}

function handleTransaksiSubmit(e) {
    e.preventDefault();

    const nama = DOM.namaTransaksi.value.trim();
    const nominal = getRawNominal(DOM.nominalTransaksi.value);
    const jenis = DOM.jenisTransaksi.value;
    const kategori = DOM.kategoriTransaksi.value;
    const tanggal = DOM.tanggalTransaksi.value;
    const catatan = DOM.catatanTransaksi.value.trim();

    if (!nama || !nominal || nominal <= 0 || !tanggal) {
        showToast('Semua field wajib diisi dengan benar!', true);
        return;
    }

    if (currentEditId) {
        const idx = transactions.findIndex(t => t.id === currentEditId);
        if (idx !== -1) {
            transactions[idx] = { ...transactions[idx], nama, nominal, jenis, kategori, tanggal, catatan };
            showToast('Transaksi berhasil diperbarui!');
        }
        currentEditId = null;
    } else {
        const newTx = { id: generateId(), nama, nominal, jenis, kategori, tanggal, catatan, createdAt: new Date().toISOString() };
        transactions.push(newTx);
        showToast('Transaksi berhasil disimpan!');
    }

    saveTransactions();
    DOM.transaksiForm.reset();
    DOM.tanggalTransaksi.value = today();
    DOM.nominalTransaksi.value = '';
    renderRiwayat();
    updateDashboard();
}

function editTransaksi(id) {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;

    currentEditId = id;
    DOM.namaTransaksi.value = tx.nama;
    DOM.nominalTransaksi.value = tx.nominal.toLocaleString('id-ID');
    DOM.jenisTransaksi.value = tx.jenis;
    DOM.kategoriTransaksi.value = tx.kategori;
    DOM.tanggalTransaksi.value = tx.tanggal;
    DOM.catatanTransaksi.value = tx.catatan || '';

    navigate('transaksi');
    document.getElementById('page-transaksi').scrollIntoView({ behavior: 'smooth' });
}

function hapusTransaksi(id) {
    if (!confirmAction('Yakin mau hapus transaksi ini?')) return;
    transactions = transactions.filter(t => t.id !== id);
    saveTransactions();
    renderRiwayat();
    updateDashboard();
    showToast('Transaksi dihapus!');
}

function renderRiwayat() {
    let data = [...transactions];

    const search = DOM.searchRiwayat.value.toLowerCase();
    if (search) {
        data = data.filter(t => t.nama.toLowerCase().includes(search) || t.catatan.toLowerCase().includes(search));
    }

    const kat = DOM.filterKategori.value;
    if (kat) data = data.filter(t => t.kategori === kat);

    const jns = DOM.filterJenis.value;
    if (jns) data = data.filter(t => t.jenis === jns);

    const tgl = DOM.filterTanggal.value;
    if (tgl) data = data.filter(t => t.tanggal === tgl);

    const sort = DOM.sortNominal.value;
    if (sort === 'terbesar') data.sort((a, b) => b.nominal - a.nominal);
    else if (sort === 'terkecil') data.sort((a, b) => a.nominal - b.nominal);

    DOM.riwayatJumlah.textContent = data.length + ' transaksi';

    if (data.length === 0) {
        DOM.riwayatBody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:var(--text-light);">📭 Belum ada transaksi</td></tr>`;
        return;
    }

    DOM.riwayatBody.innerHTML = data.map((t, i) => `
        <tr>
            <td>${i + 1}</td>
            <td><strong>${t.nama}</strong></td>
            <td><span class="badge ${t.jenis === 'pemasukan' ? 'badge-pemasukan' : 'badge-pengeluaran'}">${t.jenis === 'pemasukan' ? '📈 Pemasukan' : '📉 Pengeluaran'}</span></td>
            <td>${t.kategori}</td>
            <td><strong>${formatRupiah(t.nominal)}</strong></td>
            <td>${getDate(t.tanggal)}</td>
            <td>${t.catatan || '-'}</td>
            <td>
                <button class="btn-edit" onclick="editTransaksi('${t.id}')"><i class="fas fa-edit"></i></button>
                <button class="btn-hapus" onclick="hapusTransaksi('${t.id}')"><i class="fas fa-trash"></i></button>
            </td>
        </tr>
    `).join('');
}

function resetFilters() {
    DOM.searchRiwayat.value = '';
    DOM.filterKategori.value = '';
    DOM.filterJenis.value = '';
    DOM.filterTanggal.value = '';
    DOM.sortNominal.value = '';
    renderRiwayat();
}

function exportJSON() {
    if (transactions.length === 0) {
        showToast('Tidak ada data untuk diexport', true);
        return;
    }
    const blob = new Blob([JSON.stringify(transactions, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transaksi_${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export berhasil!');
}

function importJSON(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (Array.isArray(data)) {
                transactions = data;
                saveTransactions();
                renderRiwayat();
                updateDashboard();
                showToast(`Import ${data.length} transaksi berhasil!`);
            } else {
                showToast('Format file tidak valid!', true);
            }
        } catch (err) {
            showToast('Gagal membaca file!', true);
        }
    };
    reader.readAsText(file);
}

function downloadLaporan() {
    if (transactions.length === 0) {
        showToast('Tidak ada transaksi untuk dilaporkan', true);
        return;
    }
    let txt = '========================================\n';
    txt += '     LAPORAN KEUANGAN NEOFINANCE\n';
    txt += '========================================\n';
    txt += `Tanggal: ${new Date().toLocaleString()}\n`;
    txt += `Total Transaksi: ${transactions.length}\n`;
    txt += '========================================\n\n';

    let totalMasuk = 0, totalKeluar = 0;
    transactions.forEach(t => {
        txt += `${getDate(t.tanggal)} | ${t.nama} | ${t.kategori} | ${t.jenis} | ${formatRupiah(t.nominal)}\n`;
        if (t.jenis === 'pemasukan') totalMasuk += t.nominal;
        else totalKeluar += t.nominal;
    });

    txt += '\n========================================\n';
    txt += `Total Pemasukan : ${formatRupiah(totalMasuk)}\n`;
    txt += `Total Pengeluaran: ${formatRupiah(totalKeluar)}\n`;
    txt += `Saldo Akhir     : ${formatRupiah(totalMasuk - totalKeluar)}\n`;
    txt += '========================================\n';

    const blob = new Blob([txt], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `laporan_${today()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Laporan berhasil diunduh!');
}

function renderTargets() {
    if (targets.length === 0) {
        DOM.targetList.innerHTML = '<div style="text-align:center;padding:30px;color:var(--text-light);">🎯 Belum ada target. Buat target keuanganmu!</div>';
        return;
    }
    DOM.targetList.innerHTML = targets.map((t, i) => {
        const persen = t.nominal > 0 ? Math.min(Math.round((t.terkumpul / t.nominal) * 100), 100) : 0;
        const color = persen >= 100 ? '#2ecc71' : persen >= 50 ? '#f39c12' : '#3498db';
        return `
            <div class="target-item">
                <h4>🎯 ${t.nama}</h4>
                <div class="target-meta">
                    Target: ${formatRupiah(t.nominal)} | Terkumpul: ${formatRupiah(t.terkumpul)}
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width:${persen}%;background:${color};"></div>
                </div>
                <div class="progress-text">${persen}% tercapai</div>
                <div class="target-actions">
                    <button class="btn-add" onclick="tambahTerkumpul(${i})"><i class="fas fa-plus"></i> Tambah</button>
                    <button class="btn-del" onclick="hapusTarget(${i})"><i class="fas fa-trash"></i> Hapus</button>
                </div>
            </div>
        `;
    }).join('');
}

function handleTargetSubmit(e) {
    e.preventDefault();
    const nama = DOM.namaTarget.value.trim();
    const nominal = getRawNominal(DOM.nominalTarget.value);
    const terkumpul = getRawNominal(DOM.terkumpulTarget.value) || 0;

    if (!nama || !nominal || nominal <= 0) {
        showToast('Nama dan nominal target wajib diisi!', true);
        return;
    }

    targets.push({ id: generateId(), nama, nominal, terkumpul });
    saveTargets();
    DOM.targetForm.reset();
    renderTargets();
    showToast('Target berhasil ditambahkan!');
}

function tambahTerkumpul(index) {
    const tambah = prompt('Tambahkan nominal ke target ini (Rp):');
    if (tambah === null) return;
    const val = parseInt(tambah.replace(/\./g, ''));
    if (isNaN(val) || val <= 0) {
        showToast('Nominal tidak valid!', true);
        return;
    }
    targets[index].terkumpul += val;
    saveTargets();
    renderTargets();
    showToast(`Berhasil tambah ${formatRupiah(val)} ke target!`);
}

function hapusTarget(index) {
    if (!confirmAction('Hapus target ini?')) return;
    targets.splice(index, 1);
    saveTargets();
    renderTargets();
    showToast('Target dihapus!');
}

function hitungTabungan() {
    const target = getRawNominal(DOM.tabunganTarget.value);
    const bulanan = getRawNominal(DOM.tabunganBulanan.value);
    if (!target || target <= 0 || !bulanan || bulanan <= 0) {
        DOM.hasilTabungan.textContent = '⚠️ Isi semua field dengan benar!';
        return;
    }
    const bulan = Math.ceil(target / bulanan);
    const tahun = Math.floor(bulan / 12);
    const sisaBulan = bulan % 12;
    DOM.hasilTabungan.textContent = `⏱️ Dibutuhkan ${bulan} bulan (${tahun} tahun ${sisaBulan} bulan) untuk mencapai target ${formatRupiah(target)}.`;
}

function hitungCicilan() {
    const pokok = getRawNominal(DOM.cicilanPokok.value);
    const bunga = parseFloat(DOM.cicilanBunga.value) || 0;
    const tenor = parseInt(DOM.cicilanTenor.value);
    if (!pokok || pokok <= 0 || !tenor || tenor <= 0) {
        DOM.hasilCicilan.textContent = '⚠️ Isi semua field dengan benar!';
        return;
    }
    const bungaBulan = bunga / 100 / 12;
    const angsuran = pokok * bungaBulan * Math.pow(1 + bungaBulan, tenor) / (Math.pow(1 + bungaBulan, tenor) - 1);
    const totalBayar = angsuran * tenor;
    DOM.hasilCicilan.innerHTML = `
        <div>📊 Angsuran/bulan: <strong>${formatRupiah(Math.round(angsuran))}</strong></div>
        <div>💰 Total bayar: <strong>${formatRupiah(Math.round(totalBayar))}</strong></div>
        <div>💸 Bunga total: <strong>${formatRupiah(Math.round(totalBayar - pokok))}</strong></div>
    `;
}

function hitungPersen() {
    const nilai = getRawNominal(DOM.persenNilai.value);
    const total = getRawNominal(DOM.persenTotal.value);
    if (!total || total <= 0) {
        DOM.hasilPersen.textContent = '⚠️ Total harus lebih dari 0!';
        return;
    }
    const persen = ((nilai / total) * 100);
    DOM.hasilPersen.textContent = `📊 ${formatRupiah(nilai)} adalah ${persen.toFixed(2)}% dari ${formatRupiah(total)}`;
}

function toggleTheme() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('neofinance_theme', next);
    const icon = DOM.toggleTheme.querySelector('i');
    icon.className = next === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

function setThemeColor(color) {
    document.documentElement.style.setProperty('--primary', color);
    localStorage.setItem('neofinance_color', color);
    const primaryDark = darkenColor(color, 20);
    document.documentElement.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${color}, ${primaryDark})`);
}

function darkenColor(hex, amount) {
    let r = parseInt(hex.slice(1, 3), 16);
    let g = parseInt(hex.slice(3, 5), 16);
    let b = parseInt(hex.slice(5, 7), 16);
    r = Math.max(0, r - amount);
    g = Math.max(0, g - amount);
    b = Math.max(0, b - amount);
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
}

function hapusSemuaData() {
    if (!confirmAction('Yakin mau hapus SEMUA data? Aksi ini tidak bisa dibatalkan!')) return;
    transactions = [];
    targets = [];
    saveAll();
    renderRiwayat();
    renderTargets();
    updateDashboard();
    showToast('Semua data telah dihapus!');
}

function backupData() {
    const data = { transactions, targets, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_neofinance_${today()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup berhasil!');
}

function restoreData(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = JSON.parse(e.target.result);
            if (data.transactions && data.targets) {
                transactions = data.transactions;
                targets = data.targets;
                saveAll();
                renderRiwayat();
                renderTargets();
                updateDashboard();
                showToast('Restore berhasil!');
            } else {
                showToast('Format file backup tidak valid!', true);
            }
        } catch (err) {
            showToast('Gagal membaca file backup!', true);
        }
    };
    reader.readAsText(file);
}

function navigate(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(n => n.classList.remove('active'));

    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) targetPage.classList.add('active');

    const navLink = document.querySelector(`.nav-link[data-page="${page}"]`);
    if (navLink) navLink.classList.add('active');

    const titles = {
        dashboard: 'Dashboard',
        transaksi: 'Tambah Transaksi',
        riwayat: 'Riwayat Transaksi',
        statistik: 'Statistik',
        target: 'Target Keuangan',
        kalkulator: 'Kalkulator',
        pengaturan: 'Pengaturan'
    };
    DOM.pageTitle.textContent = titles[page] || page;

    DOM.sidebar.classList.remove('open');
}

function init() {
    loadData();

    DOM.tanggalTransaksi.value = today();

    DOM.currentDate.textContent = new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });

    const savedTheme = localStorage.getItem('neofinance_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    DOM.toggleTheme.querySelector('i').className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';

    const savedColor = localStorage.getItem('neofinance_color') || '#2ecc71';
    setThemeColor(savedColor);
    DOM.settingColor.value = savedColor;

    renderRiwayat();
    renderTargets();
    updateDashboard();
    
    // Aktifkan auto-format nominal
    autoFormatNominalInput();

    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigate(link.dataset.page);
        });
    });

    DOM.menuToggle.addEventListener('click', () => {
        DOM.sidebar.classList.toggle('open');
    });

    DOM.transaksiForm.addEventListener('submit', handleTransaksiSubmit);

    DOM.searchRiwayat.addEventListener('input', renderRiwayat);
    DOM.filterKategori.addEventListener('change', renderRiwayat);
    DOM.filterJenis.addEventListener('change', renderRiwayat);
    DOM.filterTanggal.addEventListener('input', renderRiwayat);
    DOM.sortNominal.addEventListener('change', renderRiwayat);
    DOM.resetFilter.addEventListener('click', resetFilters);

    DOM.exportJson.addEventListener('click', exportJSON);
    DOM.importJson.addEventListener('click', () => DOM.fileInput.click());
    DOM.fileInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            importJSON(e.target.files[0]);
            e.target.value = '';
        }
    });
    DOM.downloadLaporan.addEventListener('click', downloadLaporan);

    DOM.targetForm.addEventListener('submit', handleTargetSubmit);

    DOM.hitungTabungan.addEventListener('click', hitungTabungan);
    DOM.hitungCicilan.addEventListener('click', hitungCicilan);
    DOM.hitungPersen.addEventListener('click', hitungPersen);

    DOM.toggleTheme.addEventListener('click', toggleTheme);
    DOM.settingTheme.addEventListener('click', toggleTheme);
    DOM.settingColor.addEventListener('input', (e) => setThemeColor(e.target.value));
    DOM.hapusSemuaData.addEventListener('click', hapusSemuaData);
    DOM.backupData.addEventListener('click', backupData);
    DOM.restoreData.addEventListener('click', () => DOM.restoreInput.click());
    DOM.restoreInput.addEventListener('change', (e) => {
        if (e.target.files.length) {
            restoreData(e.target.files[0]);
            e.target.value = '';
        }
    });

    DOM.statusData.textContent = `📦 ${transactions.length} transaksi, ${targets.length} target tersimpan di LocalStorage`;

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') DOM.sidebar.classList.remove('open');
    });

    console.log('🚀 NeoFinance siap!');
}

document.addEventListener('DOMContentLoaded', init);