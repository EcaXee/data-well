/**
 * ==========================================
 * 1. GENERATE TABULAR (MATRIKS BINARY)
 * ==========================================
 */
function buildTabular() {
    const idCol = document.getElementById('selID').value;
    const itCol = document.getElementById('selItem').value;
    
    // Mengambil daftar item unik dan mengurutkannya
    items = [...new Set(rawData.map(r => String(r[itCol] || "").trim()))].filter(i => i !== "").sort();
    
    // Pemetaan transaksi berdasarkan ID
    let map = {};
    rawData.forEach(r => {
        let tid = String(r[idCol]).trim();
        let item = String(r[itCol]).trim();
        if(!map[tid]) map[tid] = new Set();
        map[tid].add(item);
    });
    
    transactions = Object.keys(map).map(k => ({ id: k, list: Array.from(map[k]) }));
    
    let h = `
    <div class="card fade-in">
        <span class="section-title">Matriks Tabular (Binary) - by Eca Well</span>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>ID Transaksi</th>
                        ${items.map(it => `<th>${it}</th>`).join('')}
                    </tr>
                </thead>
                <tbody>`;
    
    transactions.forEach(tx => {
        h += `<tr><td>${tx.id}</td>`;
        items.forEach(it => {
            let has = tx.list.includes(it);
            h += `<td><span class="${has?'val-1':'val-0'}">${has?'1':'0'}</span></td>`;
        });
        h += `</tr>`;
    });
    
    document.getElementById('resultArea').innerHTML = h + `</tbody></table></div></div>`;
    document.getElementById('processSection').style.display = 'block';
    addLog(`Tabular selesai: ${transactions.length} transaksi unik dideteksi.`);
    
    // Otomatis lanjut ke proses Mining
    startMining();
}

/**
 * ==========================================
 * 2. PROSES MINING APRIORI (SKALA DESIMAL)
 * ==========================================
 */
async function startMining() {
    // Mengambil parameter Support & Confidence dalam skala 0.1 - 1
    const ms = parseFloat(document.getElementById('mSup').value);
    const mc = parseFloat(document.getElementById('mConf').value);
    const res = document.getElementById('resultArea');
    const n = transactions.length;

    addLog(`--- MEMULAI ANALISIS APRIORI BY ECA WELL (N=${n}) ---`);

    res.innerHTML += `
        <div class="summary-box fade-in printable" style="margin-top:30px">
            <div class="summary-item"><span>Total Transaksi (N)</span><b>${n}</b></div>
            <div class="summary-item"><span>Min. Support (Des)</span><b>${ms.toFixed(2)}</b></div>
            <div class="summary-item"><span>Min. Confidence (Des)</span><b>${mc.toFixed(2)}</b></div>
        </div>`;

    let freqSets = {};
    l1Details = {};

    // --- LEVEL 1 (Itemset Tunggal) ---
    addLog("Menghitung L1...");
    let L1 = {};
    items.forEach(it => {
        let match = transactions.filter(t => t.list.includes(it)).map(t => t.id);
        let supportA = match.length / n; // Menghitung support dalam desimal
        
        if (supportA >= ms) { 
            L1[it] = match.length; 
            l1Details[it] = match; 
        }
    });

    if (Object.keys(L1).length === 0) return addLog("Selesai: Tidak ada item yang memenuhi ambang batas Support.");
    freqSets[1] = L1;
    renderL1(L1, n);

    // --- LEVEL 2 DAN SETERUSNYA ---
    
    let k = 1;
    while (true) {
        k++;
        addLog(`Menganalisis Kombinasi L${k}...`);
        let prevKeys = Object.keys(freqSets[k-1]);
        if (prevKeys.length === 0) break;

        let prev = prevKeys.map(s => s.split(", "));
        let candidates = [];
        
        // Generate Kandidat Kombinasi Baru
        for (let i = 0; i < prev.length; i++) {
            for (let j = i + 1; j < prev.length; j++) {
                let comb = Array.from(new Set([...prev[i], ...prev[j]])).sort();
                if (comb.length === k) {
                    let key = comb.join(", ");
                    if (!candidates.includes(key)) candidates.push(key);
                }
            }
        }
        
        if (candidates.length === 0) break;
        
        // Hitung Frekuensi Kandidat
        let curL = {};
        candidates.forEach(c => {
            let arr = c.split(", ");
            let count = transactions.filter(t => arr.every(v => t.list.includes(v))).length;
            let supportK = count / n; // Support kombinasi dalam desimal
            
            if (supportK >= ms) curL[c] = count;
        });
        
        if (Object.keys(curL).length === 0) break;
        freqSets[k] = curL;
        renderGeneric(curL, k, n);
        await new Promise(r => setTimeout(r, 100)); // Delay visual
    }

    addLog("Menghitung Association Rules & Lift Ratio...");
    generateRules(freqSets, mc, n);
    document.getElementById('exportControl').style.display = 'block';
}

/**
 * ==========================================
 * 3. GENERATE RULES & LIFT RATIO
 * ==========================================
 */
function generateRules(all, mc, total) {
    let rulesList = [];
    for (let lv in all) {
        if (lv < 2) continue;
        for (let set in all[lv]) {
            let itemsSet = set.split(", ");
            let countBoth = all[lv][set];

            itemsSet.forEach(consequent => {
                let antecedentArr = itemsSet.filter(i => i !== consequent);
                let antecedentStr = antecedentArr.join(", ");
                let countAnt = all[lv-1][antecedentStr] || all[1][antecedentStr];
                let countCons = all[1][consequent];

                let conf = countBoth / countAnt; // Hasil Confidence dalam desimal
                let supportB = countCons / total;
                let lift = conf / supportB; // Menghitung Lift Ratio

                // Filter berdasarkan ambang batas Confidence desimal
                if (conf >= mc) {
                    rulesList.push({ 
                        antecedentStr, 
                        consequent, 
                        support: (countBoth/total)*100, 
                        conf: conf, 
                        lift 
                    });
                }
            });
        }
    }

    // Urutkan berdasarkan kekuatan hubungan (Lift Ratio)
    rulesList.sort((a,b) => b.lift - a.lift);

    
    let h = `
    <div class="card fade-in printable" id="card-rules" style="border-top:5px solid var(--success)">
        <span class="section-title">Association Rules & Lift Ratio - by Eca Well</span>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th>Aturan (Jika A &rarr; Maka B)</th>
                        <th>Support (%)</th>
                        <th>Confidence (Des)</th>
                        <th>Lift Ratio</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>`;
    
    rulesList.forEach(r => {
        h += `<tr>
                <td style="text-align:left">Jika beli <b>{ ${r.antecedentStr} }</b> &rarr; <b>{ ${r.consequent} }</b></td>
                <td>${r.support.toFixed(2)}%</td>
                <td><b>${r.conf.toFixed(2)}</b></td>
                <td style="font-weight:bold; color:var(--primary)">${r.lift.toFixed(2)}</td>
                <td>${r.lift > 1 ? '<span class="val-1">Kuat</span>' : '<span class="val-0">Lemah</span>'}</td>
              </tr>`;
    });
    document.getElementById('resultArea').innerHTML += h + "</tbody></table></div></div>";
}

/**
 * ==========================================
 * 4. UI HELPERS APRIORI
 * ==========================================
 */
function renderL1(data, total) {
    let h = `
    <div class="card fade-in printable">
        <span class="section-title">Frequent Itemset L1</span>
        <div class="table-container">
            <table>
                <tr><th>Item</th><th>Qty</th><th>Support %</th><th>Aksi</th></tr>`;
    for (let it in data) {
        const safeId = sanitizeId(it);
        h += `<tr>
                <td>{ ${it} }</td>
                <td>${data[it]}</td>
                <td>${((data[it]/total)*100).toFixed(2)}%</td>
                <td>
                    <button onclick="toggleD('${safeId}')" class="btn-primary" style="padding:5px 12px; font-size:0.7rem">Cek Struk</button>
                    <div id="${safeId}" class="detail-box"><b>Ditemukan pada Struk:</b><br>${l1Details[it].join(", ")}</div>
                </td>
              </tr>`;
    }
    document.getElementById('resultArea').innerHTML += h + `</table></div></div>`;
}

function renderGeneric(data, lv, total) {
    let h = `
    <div class="card fade-in printable">
        <span class="section-title">Frequent Itemset L${lv}</span>
        <div class="table-container">
            <table>
                <tr><th>Kombinasi</th><th>Qty</th><th>Support %</th></tr>`;
    for (let k in data) {
        h += `<tr><td>{ ${k} }</td><td>${data[k]}</td><td>${((data[k]/total)*100).toFixed(2)}%</td></tr>`;
    }
    document.getElementById('resultArea').innerHTML += h + `</table></div></div>`;
}

function sanitizeId(name) { return "item-" + String(name).replace(/[^a-z0-9]/gi, '_').toLowerCase(); }
function toggleD(id) { 
    const el = document.getElementById(id); 
    if(el) el.style.display = el.style.display==='block'?'none':'block'; 
}
