// ==UserScript==
// @name         Verwaltungsgebäude-Script
// @namespace    http://tampermonkey.net/
// @version      2.17
// @description  Berechnet Produktionsmenge automatisch aus gespeicherten Daten – tolerant gegenüber Produktvarianten
// @match        http://*.kapilands.eu/main.php?page=verw*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const mengeFeld = document.querySelector('input[name="vanz"]');
    const produktSelect = document.querySelector('select[name="vprod"]');
    const qualiFeld = document.querySelector('input[name="vqual"]');

    // Qualität merken und setzen
    const QUALI_KEY = 'kapiland-letzte-qualitaet';
    if (qualiFeld) {
        const gespeicherteQuali = localStorage.getItem(QUALI_KEY);
        if (gespeicherteQuali !== null) qualiFeld.value = gespeicherteQuali;
        qualiFeld.addEventListener('change', () => {
            localStorage.setItem(QUALI_KEY, qualiFeld.value);
        });
    }

    function ermittleGebaeudeTyp(zeile) {
        const match = zeile.innerText.match(/([A-Za-zäöüÄÖÜß]+)\sA:/);
        return match?.[1]?.trim() || 'Unbekannt';
    }

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

    function baueGruppe(groesse, gebaeudeZeilen) {
        const header = document.createElement('tr');
        const idPrefix = `grp-${groesse}`;
        const gebaeudeTyp = ermittleGebaeudeTyp(gebaeudeZeilen[0]);

        header.innerHTML = `
            <td colspan="5" style="background:#FFCC00;font-weight:bold;">
                ${groesse}m² (${gebaeudeTyp || 'Unbekannt'})
                &nbsp;&nbsp;<input type="text" id="${idPrefix}-dauer" placeholder="HH:MM" value="" style="width:60px;">
                &nbsp;&nbsp;
                <a href="#" id="${idPrefix}-alle">alle</a> |
                <a href="#" id="${idPrefix}-bereit">alle bereiten</a>
            </td>`;

        table.appendChild(header);
        gebaeudeZeilen.forEach(tr => {
            tr.dataset.group = idPrefix;
            table.appendChild(tr);
        });

        setTimeout(() => {
            const dauerFeld = document.getElementById(`${idPrefix}-dauer`);
            const alleBtn = document.getElementById(`${idPrefix}-alle`);
            const bereitBtn = document.getElementById(`${idPrefix}-bereit`);

            dauerFeld.addEventListener('input', () => {
                const [hh, mm] = dauerFeld.value.trim().split(":").map(Number);
                if (hh > 999 || mm > 59 || isNaN(hh) || isNaN(mm)) return;
                const stunden = hh + mm / 60;
                const produkt = produktSelect.options[produktSelect.selectedIndex].text.trim();
                const profil = ladeProfil(gebaeudeTyp, groesse);
                const menge = berechneMengeAusProfil(profil, produkt, stunden);
                mengeFeld.value = menge !== '' ? menge : '';
            });

            let lastSelectState = false;
            let lastBereitState = false;

            alleBtn.addEventListener('click', (e) => {
                e.preventDefault();
                gebaeudeZeilen.forEach(tr => {
                    const box = tr.querySelector('input[type="checkbox"]');
                    box.checked = !lastSelectState;
                });
                lastSelectState = !lastSelectState;
            });

            bereitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                gebaeudeZeilen.forEach(tr => {
                    const status = tr.innerText.toLowerCase().includes("fertig");
                    const box = tr.querySelector('input[type="checkbox"]');
                    if (status) box.checked = !lastBereitState;
                });
                lastBereitState = !lastBereitState;
            });
        }, 50);
    }

    Object.keys(gruppen).sort((a, b) => b - a).forEach(groesse => {
        baueGruppe(groesse, gruppen[groesse]);
    });
})();
