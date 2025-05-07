// ==UserScript==
// @name         Kapiland Menge berechnen (mit Formel für mehrere Produkte)
// @namespace    http://tampermonkey.net/
// @version      2.12.0
// @description  Berechnet Produktionsmenge automatisch für Produkte in Bergwerk, Plantage, Fabrik und Schreinerei und merkt sich die zuletzt eingestellte Qualität
// @author       ChatGPT
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
        if (gespeicherteQuali !== null) {
            qualiFeld.value = gespeicherteQuali;
        }
        qualiFeld.addEventListener('change', () => {
            localStorage.setItem(QUALI_KEY, qualiFeld.value);
        });
    }

    function ermittleGebaeudeTyp(zeile) {
        const match = zeile.innerText.match(/([A-Za-zäöüÄÖÜß]+)\sA:/);
        if (match && match[1]) {
            return match[1].trim();
        }
        return 'Unbekannt';
    }

    const gruppen = {};
    const rows = Array.from(document.querySelectorAll('form[name="form1"] table tr')).filter(tr => {
        return /\d+m²/.test(tr.textContent) && tr.querySelector('input[type="checkbox"]');
    });

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

    function berechneMenge(groesse, stunden, typ, produkt) {
        const arbeiter = parseInt(groesse, 10) / 10;
        let rate = 0;

        if (typ === 'Bergwerk') {
            switch (produkt) {
                case 'Gold':
                    rate = 0.0007119 * Math.pow(arbeiter, 2) - 1.2555 * arbeiter + 3147.73;
                    break;
                case 'Silber':
                    rate = 0.000796 * Math.pow(arbeiter, 2) - 0.1073 * arbeiter + 1071.4;
                    break;
                case 'Steine':
                    rate = 0.0031 * Math.pow(arbeiter, 2) + 0.5699 * arbeiter;
                    break;
                case 'Diamanten':
                    rate = 0.000379 * Math.pow(arbeiter, 2) + 0.7747 * arbeiter;
                    break;
                case 'Eisenerz':
                case 'Kohle':
                case 'Mineralien':
                case 'Quarz':
                    rate = 0.0031 * Math.pow(arbeiter, 2) + 0.5699 * arbeiter;
                    break;
                default:
                    mengeFeld.value = '';
                    return;
            }
        } else if (typ === 'Plantage') {
            switch (produkt) {
                case 'Getreide':
                    rate = 0.0036 * Math.pow(arbeiter, 2) + 1.4761 * arbeiter;
                    break;
                case 'Baumwolle':
                case 'Kartoffeln':
                    rate = 0.0502 * arbeiter + 1428;
                    break;
                case 'Holz':
                    rate = 0.000367 * Math.pow(arbeiter, 2) + 0.5739 * arbeiter;
                    break;
                case 'Kaffebohnen':
                case 'Kakao':
                    rate = 0.000604 * Math.pow(arbeiter, 2) + 0.8536 * arbeiter;
                    break;
                case 'Saatgut':
                    rate = 0.009585 * Math.pow(arbeiter, 2) + 2.6566 * arbeiter;
                    break;
                case 'Zuckerrohr':
                case 'Kautschuk':
                    rate = 0.00086 * Math.pow(arbeiter, 2) + 1.4317 * arbeiter;
                    break;
                default:
                    mengeFeld.value = '';
                    return;
            }
        } else if (typ === 'Fabrik') {
            switch (produkt) {
                case 'Benzin':
                    rate = 0.000845 * Math.pow(arbeiter, 2) - 0.252 * arbeiter + 6341.2;
                    break;
                case 'Chemikalien':
                    rate = 0.001126 * Math.pow(arbeiter, 2) - 0.9152 * arbeiter + 3089.8;
                    break;
                case 'Gläser':
                    rate = 0.000279 * Math.pow(arbeiter, 2) + 0.1364 * arbeiter + 614.9;
                    break;
                case 'Plastik':
                    rate = 0.0003 * Math.pow(arbeiter, 2) + 0.081 * arbeiter + 529.3;
                    break;
                case 'Silizium':
                    rate = 0.000378 * Math.pow(arbeiter, 2) + 0.038 * arbeiter + 777.7;
                    break;
                case 'Stahl':
                    rate = 0.000193 * Math.pow(arbeiter, 2) + 0.0437 * arbeiter + 388.1;
                    break;
                default:
                    mengeFeld.value = '';
                    return;
            }
        } else if (typ === 'Schreinerei') {
            switch (produkt) {
                case 'Betten':
                case 'Tische':
                    rate = 0.000195 * Math.pow(arbeiter, 2) + 0.121 * arbeiter + 123;
                    break;
                case 'Schränke':
                    rate = 0.000162 * Math.pow(arbeiter, 2) + 0.089 * arbeiter + 140;
                    break;
                case 'Stühle':
                    rate = 0.000249 * Math.pow(arbeiter, 2) + 0.177 * arbeiter + 201;
                    break;
                default:
                    mengeFeld.value = '';
                    return;
            }
        } else {
            mengeFeld.value = '';
            return;
        }

        const menge = Math.floor(rate * stunden);
        mengeFeld.value = menge;
    }

    function baueGruppe(groesse, gebaeudeZeilen) {
        const header = document.createElement('tr');
        const idPrefix = `grp-${groesse}`;
        const gebaeudeTyp = ermittleGebaeudeTyp(gebaeudeZeilen[0]);

        header.innerHTML = `
            <td colspan="5" style="background:#FFCC00;font-weight:bold;">
                ${groesse}m² (${gebaeudeTyp || 'Unbekannt'})
                &nbsp;&nbsp;HH:MM
                <input type="text" id="${idPrefix}-dauer" value="00:00" style="width:60px;">
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
                const [hh, mm] = dauerFeld.value.trim().split(":" ).map(Number);
                if (hh > 999 || mm > 59 || isNaN(hh) || isNaN(mm)) return;
                const stunden = hh + mm / 60;
                const produkt = produktSelect.options[produktSelect.selectedIndex].text.trim();
                berechneMenge(groesse, stunden, gebaeudeTyp, produkt);
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
