// ==UserScript==
// @name         Verwaltungsgebäude-Script (final mit Panel & vq-Fix + Ausführen-Button)
// @namespace    http://tampermonkey.net/
// @version      3.8
// @description  Steuerpanel mit Produktauswahl, Qualität, Mengenberechnung, Synchronisation und Ausführen-Button
// @match        http*://*.kapilands.eu/main.php?page=verw*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const mengeFeld = document.querySelector('input[name="vanz"]');
    const produktSelect = document.querySelector('select[name="vprod"]');
    const qualiFeld = document.querySelector('input[name="vqual"]');
    const produktSelectUnten = document.querySelector('select[name="vprod2"]');
    const qualiFeldUnten = document.querySelector('input[name="vq"]');
    const ausfuehrenBtnUnten = document.querySelector('input[name="produzieren"]');

    const gruppen = {};
    const rows = Array.from(document.querySelectorAll('form[name="form1"] table tr')).filter(tr =>
        /\d+m²/.test(tr.textContent) && tr.querySelector('input[type="checkbox"]')
    );

    rows.forEach(tr => {
        const match = tr.innerText.match(/(\d{3,5})m²/);
        if (!match) return;
        const groesse = match[1];
        if (!gruppen[groesse]) gruppen[groesse] = [];
        gruppen[groesse].push(tr);
    });

    const form = document.querySelector('form[name="form1"]');
    const table = form.querySelector('table');
    rows.forEach(tr => tr.remove());

    function ermittleGebaeudeTyp(zeile) {
        const match = zeile.innerText.match(/([A-Za-zäöüÄÖÜß]+)\sA:/);
        return match?.[1]?.trim() || 'Unbekannt';
    }

    const gebaeudeTyp = ermittleGebaeudeTyp(Object.values(gruppen)[0][0]);
    const speicherKey = `kapiland_preset_${gebaeudeTyp}`;

    function ladeProfil(typ, groesse) {
        const key = `kapilands_profil_${typ.toLowerCase()}-${groesse}`;
        const eintrag = localStorage.getItem(key);
        return eintrag ? JSON.parse(eintrag) : null;
    }

    function berechneMengeAusProfil(profil, produkt, stunden) {
        if (!profil || !profil.produktionProStunde) return '';
        const key = Object.keys(profil.produktionProStunde)
            .find(k => produkt.toLowerCase().startsWith(k.toLowerCase()));
        if (!key) return '';
        const rate = parseFloat(profil.produktionProStunde[key].toString().replace(',', '.'));
        if (isNaN(rate)) return '';
        return Math.round(rate * stunden);
    }

    // Panel
    const panel = document.createElement('div');
    panel.style.border = '2px solid #D2B74D';
    panel.style.padding = '10px';
    panel.style.margin = '10px 0';
    panel.style.backgroundColor = '#E7CA56';
    panel.innerHTML = `<h3>Steuerpanel für Gebäudegruppen</h3>`;
    form.prepend(panel);

    // Produkt + Qualität im Panel
    const produktWahlWrapper = document.createElement('div');
    produktWahlWrapper.style.marginBottom = '10px';
    produktWahlWrapper.innerHTML = `
        <label><strong>Produkt wählen:</strong></label>
        <select id="panel-produktwahl" style="margin-right: 20px;"></select>
        <label><strong>Qualität:</strong></label>
        <input type="text" id="panel-qualitaet" style="width: 40px;" />
    `;
    panel.appendChild(produktWahlWrapper);

    const produktDropdown = document.getElementById('panel-produktwahl');
    const qualiInput = document.getElementById('panel-qualitaet');

    Array.from(produktSelect.options).forEach(opt => {
        const neueOption = document.createElement('option');
        neueOption.value = opt.value;
        neueOption.textContent = opt.textContent;
        produktDropdown.appendChild(neueOption);
    });

    const gespeicherte = JSON.parse(localStorage.getItem(speicherKey) || '{}');
    if (gespeicherte.produkt) {
        const passendeOpt = Array.from(produktSelect.options).find(o =>
            o.text.trim().toLowerCase() === gespeicherte.produkt.trim().toLowerCase()
        );
        if (passendeOpt) {
            produktSelect.value = passendeOpt.value;
            produktDropdown.value = passendeOpt.value;
            if (produktSelectUnten) produktSelectUnten.value = passendeOpt.value;
        }
    }
    if (gespeicherte.quali) {
        qualiInput.value = gespeicherte.quali;
        if (qualiFeld) qualiFeld.value = gespeicherte.quali;
        if (qualiFeldUnten) qualiFeldUnten.value = gespeicherte.quali;
    }

    function speichereEinstellung() {
        const selectedText = produktDropdown.options[produktDropdown.selectedIndex].text.trim();
        const quali = qualiInput.value.trim();
        localStorage.setItem(speicherKey, JSON.stringify({ produkt: selectedText, quali: quali }));
    }

    produktDropdown.addEventListener('change', () => {
        const selectedValue = produktDropdown.value;
        produktSelect.value = selectedValue;
        if (produktSelectUnten) produktSelectUnten.value = selectedValue;
        produktSelect.dispatchEvent(new Event('change'));
        speichereEinstellung();

        Object.keys(gruppen).forEach(groesse => {
            const idPrefix = `grp-${groesse}`;
            const dauerFeld = document.getElementById(`${idPrefix}-dauer`);
            if (dauerFeld && /\d{1,3}:\d{2}/.test(dauerFeld.value)) {
                const [hh, mm] = dauerFeld.value.trim().split(":" ).map(Number);
                if (!isNaN(hh) && !isNaN(mm)) {
                    const stunden = hh + mm / 60;
                    const produkt = produktDropdown.options[produktDropdown.selectedIndex].text.trim();
                    const profil = ladeProfil(gebaeudeTyp, groesse);
                    const menge = berechneMengeAusProfil(profil, produkt, stunden);
                    if (menge !== '') mengeFeld.value = menge;
                }
            }
        });
    });

    qualiInput.addEventListener('input', () => {
        if (qualiFeld) qualiFeld.value = qualiInput.value;
        if (qualiFeldUnten) qualiFeldUnten.value = qualiInput.value;
        speichereEinstellung();
    });

    const startBtn = document.createElement('input');
    startBtn.type = 'button';
    startBtn.value = 'ausführen';
    startBtn.className = 'send';
    startBtn.style.marginTop = '10px';
    panel.appendChild(startBtn);

    startBtn.addEventListener('click', () => {
        if (ausfuehrenBtnUnten) ausfuehrenBtnUnten.click();
    });

    Object.keys(gruppen).sort((a, b) => b - a).forEach(groesse => {
        const idPrefix = `grp-${groesse}`;
        const gebaeudeZeilen = gruppen[groesse];

        const header = document.createElement('tr');
        header.innerHTML = `
            <td colspan="5" style="background:#FFCC00;font-weight:bold;">
                ${groesse}m² (${gebaeudeTyp})
                &nbsp;&nbsp;<input type="text" id="${idPrefix}-dauer" placeholder="HH:MM" style="width:60px;">
                &nbsp;&nbsp;<a href="#" id="${idPrefix}-alle">alle</a> |
                <a href="#" id="${idPrefix}-bereit">alle bereiten</a>
            </td>`;
        table.appendChild(header);

        gebaeudeZeilen.forEach(tr => {
            tr.dataset.group = idPrefix;
            table.appendChild(tr);
        });

        const row = document.createElement('div');
        row.style.marginBottom = '8px';
        row.innerHTML = `
            <strong>${groesse}m² (${gebaeudeTyp})</strong> &nbsp;
            <input type="text" id="ctrl-${idPrefix}-dauer" placeholder="HH:MM" style="width:60px;">
            <input type="button" id="ctrl-${idPrefix}-dec" class="send" value="-">
            <input type="button" id="ctrl-${idPrefix}-set-24h" class="send" value="24h">
            <input type="button" id="ctrl-${idPrefix}-inc" class="send" value="+">
            <input type="button" id="ctrl-${idPrefix}-select-all" class="send" value="Alle">
            <input type="button" id="ctrl-${idPrefix}-select-ready" class="send" value="Alle bereiten">
        `;
        panel.appendChild(row);

        setTimeout(() => {
            const dauerFeld = document.getElementById(`${idPrefix}-dauer`);
            const ctrlDauer = document.getElementById(`ctrl-${idPrefix}-dauer`);
            const btn24h = document.getElementById(`ctrl-${idPrefix}-set-24h`);
            const btnInc = document.getElementById(`ctrl-${idPrefix}-inc`);
            const btnDec = document.getElementById(`ctrl-${idPrefix}-dec`);
            const btnAll = document.getElementById(`ctrl-${idPrefix}-select-all`);
            const btnReady = document.getElementById(`ctrl-${idPrefix}-select-ready`);

            let toggleAll = false;
            let toggleReady = false;

            function parseDauer(str) {
                const [h, m] = str.split(":" ).map(Number);
                return isNaN(h) || isNaN(m) ? 0 : h * 60 + m;
            }

            function formatDauer(min) {
                const h = Math.floor(min / 60);
                const m = min % 60;
                return `${h}:${m.toString().padStart(2, '0')}`;
            }

            ctrlDauer.addEventListener('input', () => {
                const [hh, mm] = ctrlDauer.value.trim().split(":" ).map(Number);
                if (hh > 999 || mm > 59 || isNaN(hh) || isNaN(mm)) return;
                const stunden = hh + mm / 60;
                const produkt = produktDropdown.options[produktDropdown.selectedIndex].text.trim();
                const profil = ladeProfil(gebaeudeTyp, groesse);
                const menge = berechneMengeAusProfil(profil, produkt, stunden);
                if (menge !== '') mengeFeld.value = menge;
                dauerFeld.value = ctrlDauer.value;
            });

            btn24h.addEventListener('click', () => {
                ctrlDauer.value = '24:00';
                ctrlDauer.dispatchEvent(new Event('input'));
            });

            btnInc.addEventListener('click', () => {
                let min = parseDauer(ctrlDauer.value || '0:00');
                min += 60;
                ctrlDauer.value = formatDauer(min);
                ctrlDauer.dispatchEvent(new Event('input'));
            });

            btnDec.addEventListener('click', () => {
                let min = parseDauer(ctrlDauer.value || '0:00');
                min = Math.max(0, min - 60);
                ctrlDauer.value = formatDauer(min);
                ctrlDauer.dispatchEvent(new Event('input'));
            });

            btnAll.addEventListener('click', e => {
                e.preventDefault();
                gebaeudeZeilen.forEach(tr => {
                    const cb = tr.querySelector('input[type="checkbox"]');
                    cb.checked = !toggleAll;
                });
                toggleAll = !toggleAll;
            });

            btnReady.addEventListener('click', e => {
                e.preventDefault();
                gebaeudeZeilen.forEach(tr => {
                    const fertig = tr.innerText.toLowerCase().includes("fertig");
                    const cb = tr.querySelector('input[type="checkbox"]');
                    if (fertig) cb.checked = !toggleReady;
                });
                toggleReady = !toggleReady;
            });
        }, 50);
    });
})();
