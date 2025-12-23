/**
 * 01. GENERATE TABULAR (MATRIKS 1/0)
 */
function buildTabular() {
    const idCol = document.getElementById('selID').value;
    const itCol = document.getElementById('selItem').value;
    
    // Ambil daftar item unik
    items = [...new Set(rawData.map(r => String(r[itCol] || "").trim()))].filter(i => i !== "").sort();
    
    let map = {};
    rawData.forEach(r => {
        let tid = String(r[idCol]).trim();
        let item = String(r[itCol]).trim();
        if(!map[tid]) map[tid] = new Set();
        map[tid].add(item);
    });
    
    transactions = Object.keys(map).map(k => ({ id: k, list: Array.from(map[k]) }));
    
    let h = `<h3>Matriks Tabular (Binary)</h3><div class="table-container"><table><thead><tr><th>ID Transaksi</th>`;
    items.forEach(it => h += `<th>${it}</th>`);
    h += `</tr></thead><tbody>`;
    
    transactions.forEach(tx => {
        h += `<tr><td>${tx.id}</td>`;
        items.forEach(it => {
            let has = tx.list.includes(it);
            h += `<td><span class="${has?'val-1':'val-0'}">${has?'1':'0'}</span></td>`;
        });
        h += `</tr>`;
    });
    
    document.getElementById('resultArea').innerHTML = h + `</tbody></table></div>`;
    document.getElementById('processSection').style.display = 'block';
    addLog(`Tabular selesai: ${transactions.length} transaksi unik.`);
    
    // Otomatis lanjut ke Mining
    startMining();
}

/**
 * 02. PROSES MINING APRIORI
 */

async function startMining() {
    const ms = parseInt(document.getElementById('mSup').value);
    const mc = parseInt(document.getElementById('mConf').value) / 100;
    const res = document.getElementById('resultArea');
    const n = transactions.length;

    addLog(`--- MEMULAI ANALISIS APRIORI (N=${n}) ---`);

    res.innerHTML += `
        <div class="summary-box fade-in printable" style="margin-top:30px">
            <div class="summary-item"><span>Total Transaksi (N)</span><b>${n}</b></div>
            <div class="summary-item"><span>Min. Support (Qty)</span><b>${ms}</b></div>
            <div class="summary-item"><span>Min. Confidence</span><b>${mc*100}%</b></div>
        </div>`;

    let freqSets = {};
    l1Details = {};

    // LEVEL 1
    addLog("Menghitung L1...");
    let L1 = {};
    items.forEach(it => {
        let match = transactions.filter(t => t.list.includes(it)).map(t => t.id);
        if (match.length >= ms) { L1[it] = match.length; l1Details[it] = match; }
    });
    if (Object.keys(L1).length === 0) return addLog("Selesai: Tidak ada item memenuhi Support.");
    freqSets[1] = L1;
    renderL1(L1, n);

    // LEVEL 2+
    let k = 1;
    while (true) {
        k++;
        addLog(`Menganalisis Level L${k}...`);
        let prev = Object.keys(freqSets[k-1]).map(s => s.split(", "));
        let candidates = [];
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
        let curL = {};
        candidates.forEach(c => {
            let arr = c.split(", ");
            let count = transactions.filter(t => arr.every(v => t.list.includes(v))).length;
            if (count >= ms) curL[c] = count;
        });
        if (Object.keys(curL).length === 0) break;
        freqSets[k] = curL;
        renderGeneric(curL, k, n);
        await new Promise(r => setTimeout(r, 100));
    }

    addLog("Menghitung Association Rules & Lift Ratio...");
    generateRules(freqSets, mc, n);
    document.getElementById('exportControl').style.display = 'block';
}

/**
 * 03. GENERATE RULES & LIFT RATIO
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

                let conf = countBoth / countAnt;
                let supportB = countCons / total;
                let lift = conf / supportB;

                if (conf >= mc) {
                    rulesList.push({ antecedentStr, consequent, support: (countBoth/total)*100, conf: conf*100, lift });
                }
            });
        }
    }

    rulesList.sort((a,b) => b.lift - a.lift);

    let h = `<div class="card fade-in printable" id="card-rules" style="border-top:5px solid var(--success)">
        <span class="section-title">Association Rules & Lift Ratio</span>
        <div class="table-container"><table><thead><tr><th>Pola (Jika A → Maka B)</th><th>Support</th><th>Confidence</th><th>Lift Ratio</th></tr></thead><tbody>`;
    
    rulesList.forEach(r => {
        h += `<tr><td style="text-align:left">Jika beli <b>{ ${r.antecedentStr} }</b> &rarr; <b>{ ${r.consequent} }</b></td>
              <td>${r.support.toFixed(1)}%</td><td><b>${r.conf.toFixed(1)}%</b></td>
              <td style="color:${r.lift > 1 ? 'var(--success)' : 'var(--accent)'}; font-weight:bold">${r.lift.toFixed(2)}</td></tr>`;
    });
    document.getElementById('resultArea').innerHTML += h + "</tbody></table></div></div>";
}

/**
 * 04. UI HELPERS APRIORI
 */
function renderL1(data, total) {
    let h = `<div class="card fade-in printable" id="card-L1">
        <span class="section-title">Frequent Itemset L1</span>
        <div class="table-container"><table><tr><th>Item</th><th>Qty</th><th>Support %</th><th>Aksi</th></tr>`;
    for (let it in data) {
        const safeId = sanitizeId(it);
        h += `<tr><td>{ ${it} }</td><td>${data[it]}</td><td>${((data[it]/total)*100).toFixed(1)}%</td>
              <td><button onclick="toggleD('${safeId}')" class="btn-primary" style="padding:5px 12px; font-size:0.7rem">Cek Struk</button>
              <div id="${safeId}" class="detail-box"><b>ID Struk:</b><br>${l1Details[it].join(", ")}</div></td></tr>`;
    }
    document.getElementById('resultArea').innerHTML += h + `</table></div></div>`;
}

function renderGeneric(data, lv, total) {
    let h = `<div class="card fade-in printable">
        <span class="section-title">Frequent Itemset L${lv}</span>
        <div class="table-container"><table><tr><th>Kombinasi</th><th>Qty</th><th>Support %</th></tr>`;
    for (let k in data) h += `<tr><td>{ ${k} }</td><td>${data[k]}</td><td>${((data[k]/total)*100).toFixed(1)}%</td></tr>`;
    document.getElementById('resultArea').innerHTML += h + `</table></div></div>`;
}

function sanitizeId(name) { return "item-" + String(name).replace(/[^a-z0-9]/gi, '_').toLowerCase(); }
function toggleD(id) { const el = document.getElementById(id); if(el) el.style.display = el.style.display==='block'?'none':'block'; }
