/**
 * ==========================================
 * 1. CORE LOGIC: START K-MEANS
 * ==========================================
 */
function startKMeans() {
    const k = parseInt(document.getElementById('kmeansK').value);
    const cols = lastCols; 

    if (cols.length === 0) return alert("Pilih minimal satu atribut fitur di Langkah 02!");

    // Ambil Data X-Uji dari input yang sudah ada di bagian Parameter (Langkah 03)
    let testPoint = {};
    document.querySelectorAll('.main-xuji-input').forEach(inp => {
        testPoint[inp.dataset.col] = Number(inp.value) || 0;
    });

    // Inisialisasi Centroid Awal (Mengambil k baris pertama)
    let centroids = rawData.slice(0, k).map(row => {
        let c = {};
        cols.forEach(col => c[col] = Number(row[col]) || 0);
        return c;
    });

    let clusters = [];
    let historyTable = [];
    let iteration = 0;
    let isChanged = true;

    while (isChanged && iteration < 15) {
        clusters = Array.from({ length: k }, () => []);
        historyTable = [];

        // LANGKAH 1: Pengelompokan (Assignment)
        rawData.forEach((row, idx) => {
            let dists = centroids.map(c => calculateEuclidean(row, c, cols));
            let closest = dists.indexOf(Math.min(...dists));
            
            let entry = { 
                ...row, 
                _dists: dists, 
                _cluster: closest + 1, 
                _rowNum: idx + 1 
            };
            
            clusters[closest].push(entry);
            historyTable.push(entry);
        });

        // LANGKAH 2: Pembaruan Pusat Cluster (Update Centroid)
        let newCentroids = clusters.map((cluster, i) => {
            if (cluster.length === 0) return centroids[i];
            let mean = {};
            cols.forEach(col => {
                let total = cluster.reduce((sum, r) => sum + (Number(r[col]) || 0), 0);
                mean[col] = total / cluster.length;
            });
            return mean;
        });

        isChanged = JSON.stringify(centroids) !== JSON.stringify(newCentroids);
        centroids = newCentroids;
        iteration++;
    }

    // Hitung Jarak X-Uji ke Centroid Akhir secara otomatis
    let xujiDists = centroids.map(c => calculateEuclidean(testPoint, c, cols));
    let xujiCluster = xujiDists.indexOf(Math.min(...xujiDists)) + 1;

    addLog(`K-Means Selesai: Konvergen dalam ${iteration} iterasi.`);
    renderKMeansDetailed(historyTable, clusters, cols, centroids, testPoint, xujiDists, xujiCluster);
}

/**
 * ==========================================
 * 2. RENDERING HASIL (STEP-BY-STEP)
 * ==========================================
 */
function renderKMeansDetailed(history, clusters, cols, centroids, testPoint, xujiDists, xujiCluster) {
    let res = document.getElementById('resultArea');
    
    // LANGKAH 01: TABEL JARAK DATA TRAINING
        let h = `
    <div class="card fade-in printable">
        <div class="step-num">01</div>
        <span class="section-title">Tabel Hasil Pengelompokan Data Training</span>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID / Hari</th>
                        ${cols.map(c => `<th>${c}</th>`).join('')}
                        ${centroids.map((_, i) => `<th style="background:#f0f4ff">Jarak ke C${i+1}</th>`).join('')}
                        <th style="background:var(--primary); color:white">Cluster</th>
                    </tr>
                </thead>
                <tbody>
                    ${history.map(row => `
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

    // LANGKAH 02: PUSAT CLUSTER AKHIR (CENTROID)
    h += `
    <div class="card fade-in printable">
        <div class="step-num">02</div>
        <span class="section-title">Pusat Cluster Akhir (Centroid)</span>
        <div class="grid">
            ${clusters.map((c, i) => `
                <div style="border:1px solid var(--border); padding:20px; border-radius:15px; background:white">
                    <h4 style="color:var(--primary); margin:0 0 10px 0">Centroid C${i+1}</h4>
                    <p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:10px">Total Anggota: <b>${c.length}</b></p>
                    <table style="font-size:0.8rem; width:100%; border:none">
                        ${cols.map(col => `
                            <tr>
                                <td style="text-align:left; border:none; padding:2px">${col}</td>
                                <td style="text-align:right; border:none; padding:2px"><b>${centroids[i][col].toFixed(2)}</b></td>
                            </tr>
                        `).join('')}
                    </table>
                </div>
            `).join('')}
        </div>
    </div>`;

    // LANGKAH 03: HASIL ANALISIS X-UJI (LANGSUNG TAMPIL)
        h += `
    <div class="card fade-in printable" style="border-top: 5px solid var(--primary)">
        <div class="step-num">03</div>
        <span class="section-title">Hasil Analisis Data Baru (X-Uji)</span>
        <div class="table-container" style="background:var(--primary-light); padding:10px; border-radius:12px;">
            <table style="margin:0; background:white;">
                <thead>
                    <tr>
                        ${cols.map(c => `<th>${c}</th>`).join('')}
                        ${centroids.map((_, i) => `<th style="background:#f0f4ff">Jarak ke C${i+1}</th>`).join('')}
                        <th style="background:var(--primary); color:white">Kesimpulan</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        ${cols.map(c => `<td>${testPoint[c]}</td>`).join('')}
                        ${xujiDists.map(d => `<td style="font-weight:bold">${d.toFixed(2)}</td>`).join('')}
                        <td style="font-size:1.1rem; font-weight:800; color:var(--primary)">Cluster ${xujiCluster}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <p style="margin-top:12px; font-size:0.85rem; color:var(--text-muted); text-align:center;">
            Berdasarkan input Anda, data baru dialokasikan ke <b>Cluster ${xujiCluster}</b> karena memiliki jarak terkecil ke centroid.
        </p>
    </div>`;

    res.innerHTML = h;
    document.getElementById('exportControl').style.display = 'block';
}