/**
 * ==========================================
 * 1. CORE LOGIC: START K-MEANS (ALL ITERATIONS)
 * ==========================================
 */
function startKMeans() {
    const k = parseInt(document.getElementById('kmeansK').value);
    const cols = lastCols; 

    if (cols.length === 0) return alert("Pilih minimal satu atribut fitur di Langkah 02!");

    // Ambil Data X-Uji dari input utama (Langkah 03)
    let testPoint = {};
    document.querySelectorAll('.main-xuji-input').forEach(inp => {
        testPoint[inp.dataset.col] = Number(inp.value) || 0;
    });

    // Inisialisasi Centroid Awal (Mengambil k baris pertama dari dataset)
    let centroids = rawData.slice(0, k).map(row => {
        let c = {};
        cols.forEach(col => c[col] = Number(row[col]) || 0);
        return c;
    });

    let allIterations = []; // Tempat menyimpan data setiap looping
    let iteration = 0;
    let isChanged = true;

    while (isChanged && iteration < 15) {
        iteration++;
        let currentIterationData = {
            num: iteration,
            history: [],
            centroids: JSON.parse(JSON.stringify(centroids)), // Salin centroid saat ini
            clusters: Array.from({ length: k }, () => [])
        };

        // LANGKAH 1: Pengelompokan (Assignment) berdasarkan Jarak Terdekat
        rawData.forEach((row, idx) => {
            let dists = centroids.map(c => calculateEuclidean(row, c, cols));
            let closest = dists.indexOf(Math.min(...dists));
            
            let entry = { 
                ...row, 
                _dists: dists, 
                _cluster: closest + 1, 
                _rowNum: idx + 1 
            };
            
            currentIterationData.clusters[closest].push(entry);
            currentIterationData.history.push(entry);
        });

        // LANGKAH 2: Pembaruan Pusat Cluster (Update Centroid untuk iterasi berikutnya)
        let newCentroids = currentIterationData.clusters.map((cluster, i) => {
            if (cluster.length === 0) return centroids[i];
            let mean = {};
            cols.forEach(col => {
                let total = cluster.reduce((sum, r) => sum + (Number(r[col]) || 0), 0);
                mean[col] = total / cluster.length;
            });
            return mean;
        });

        allIterations.push(currentIterationData);

        // Cek Konvergensi: Jika centroid tidak berubah, looping berhenti
        isChanged = JSON.stringify(centroids) !== JSON.stringify(newCentroids);
        centroids = newCentroids;
    }

    // Simpan centroid akhir untuk perhitungan X-Uji
    const finalCentroids = centroids;
    let xujiDists = finalCentroids.map(c => calculateEuclidean(testPoint, c, cols));
    let xujiCluster = xujiDists.indexOf(Math.min(...xujiDists)) + 1;

    addLog(`K-Means Selesai: Berhasil mencapai titik stabil dalam ${iteration} iterasi.`);
    renderKMeansLooping(allIterations, cols, testPoint, xujiDists, xujiCluster);
}

/**
 * ==========================================
 * 2. RENDERING HASIL LOOPING (ITERASI 1 - AKHIR)
 * ==========================================
 */
function renderKMeansLooping(iterations, cols, testPoint, xujiDists, xujiCluster) {
    let res = document.getElementById('resultArea');
    let h = "";

    // Tampilkan setiap iterasi satu per satu
    iterations.forEach((it) => {
        h += `
        <div class="card fade-in printable">
            <div class="step-num">${it.num < 10 ? '0' + it.num : it.num}</div>
            <span class="section-title">Hasil Iterasi Ke-${it.num} - by Eca Well</span>
            
            <div class="grid" style="margin-bottom: 20px;">
                ${it.centroids.map((c, i) => `
                    <div style="border:1px solid var(--border); padding:15px; border-radius:12px; background:#f8fafc">
                        <h4 style="color:var(--primary); margin:0 0 5px 0">Pusat Cluster C${i+1}</h4>
                        <table style="font-size:0.75rem; width:100%; border:none">
                            ${cols.map(col => `
                                <tr>
                                    <td style="text-align:left; border:none; padding:2px">${col}</td>
                                    <td style="text-align:right; border:none; padding:2px"><b>${c[col].toFixed(2)}</b></td>
                                </tr>
                            `).join('')}
                        </table>
                    </div>
                `).join('')}
            </div>

            <div class="table-container">
                <table>
                    <thead>
                        <tr style="background:#f1f5f9">
                            <th>ID / Hari</th>
                            ${cols.map(c => `<th>${c}</th>`).join('')}
                            ${it.centroids.map((_, i) => `<th style="background:#f0f4ff">Jarak ke C${i+1}</th>`).join('')}
                            <th style="background:var(--primary); color:white">Cluster</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${it.history.map(row => `
                            <tr>
                                <td><b>${row.Hari || row._rowNum}</b></td>
                                ${cols.map(c => `<td>${row[c]}</td>`).join('')}
                                ${row._dists.map(d => `<td>${d.toFixed(2)}</td>`).join('')}
                                <td style="font-weight:bold; color:var(--primary)">C${row._cluster}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
    });

    // LANGKAH AKHIR: ANALISIS X-UJI (PREDIKSI)
    h += `
    <div class="card fade-in printable" style="border-top: 5px solid var(--success)">
        <div class="step-num">FIN</div>
        <span class="section-title">Hasil Analisis Data Baru (X-Uji)</span>
        <div class="table-container" style="background:var(--primary-light); padding:10px; border-radius:12px;">
            <table style="margin:0; background:white;">
                <thead>
                    <tr style="background:#f1f5f9">
                        ${cols.map(c => `<th>${c}</th>`).join('')}
                        ${iterations[0].centroids.map((_, i) => `<th style="background:#f0f4ff">Jarak ke C${i+1}</th>`).join('')}
                        <th style="background:var(--primary); color:white">Kesimpulan</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        ${cols.map(c => `<td>${testPoint[c]}</td>`).join('')}
                        ${xujiDists.map(d => `<td>${d.toFixed(2)}</td>`).join('')}
                        <td style="font-size:1.1rem; font-weight:800; color:var(--primary)">Cluster ${xujiCluster}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p style="margin-top:12px; font-size:0.85rem; color:var(--text-muted); text-align:center;">
            Proses looping berhenti di iterasi ke-${iterations.length}. Berdasarkan centroid akhir, data baru masuk ke <b>Cluster ${xujiCluster}</b>.
        </p>
    </div>`;

    res.innerHTML = h;
    document.getElementById('exportControl').style.display = 'block';
}
