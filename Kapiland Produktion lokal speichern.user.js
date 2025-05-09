// ==UserScript==
// @name         Kapiland Produktion lokal speichern
// @namespace    http://tampermonkey.net/
// @version      3.12
// @description  Speichert Produktionsdaten, Voraussetzung für das Verwaltungsgebäude-Script!
// @match        http://*.kapilands.eu/main.php?page=roh*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const blacklist = ['hilfe', 'gebäude', 'premium'];

    function findeGebaeudeGroesse() {
        const match = document.body.innerText.match(/Gebäude:\s+(\d{3,5})\s*m²/);
        return match ? `${match[1]} m²` : null;
    }

    function findeGebaeudeTyp() {
        const el = [...document.querySelectorAll('b')].find(b =>
            b.innerText.toLowerCase().includes('plantage') ||
            b.innerText.toLowerCase().includes('viehzucht') ||
            b.innerText.toLowerCase().includes('obstplantage') ||
            b.innerText.toLowerCase().includes('autofabrik') ||
            b.innerText.toLowerCase().includes('textilfabrik') ||
            b.innerText.toLowerCase().includes('chemiefabrik') ||
            b.innerText.toLowerCase().includes('getränkefabrik') ||
            b.innerText.toLowerCase().includes('schmuckfabrik') ||
            b.innerText.toLowerCase().includes('lebensmittelfabrik') ||
            b.innerText.toLowerCase().includes('spielzeugfabrik') ||
            b.innerText.toLowerCase().includes('elektrofabrik') ||
            b.innerText.toLowerCase().includes('fernsehsender') ||
            b.innerText.toLowerCase().includes('eismanufaktur') ||
            b.innerText.toLowerCase().includes('fleischerei') ||
            b.innerText.toLowerCase().includes('fabrik') ||
            b.innerText.toLowerCase().includes('kraftwerk') ||
            b.innerText.toLowerCase().includes('quelle') ||
            b.innerText.toLowerCase().includes('bergwerk') ||
            b.innerText.toLowerCase().includes('schreinerei')
        );
        if (!el) return 'Unbekannt';

        const txt = el.innerText.toLowerCase();
        if (txt.includes('autofabrik')) return 'Autofabrik';
        if (txt.includes('textilfabrik')) return 'Textilfabrik';
        if (txt.includes('chemiefabrik')) return 'Chemiefabrik';
        if (txt.includes('getränkefabrik')) return 'Getränkefabrik';
        if (txt.includes('schmuckfabrik')) return 'Schmuckfabrik';
        if (txt.includes('spielzeugfabrik')) return 'Spielzeugfabrik';
        if (txt.includes('lebensmittelfabrik')) return 'Lebensmittelfabrik';
        if (txt.includes('elektrofabrik')) return 'Elektrofabrik';
        if (txt.includes('fernsehsender')) return 'Fernsehsender';
        if (txt.includes('eismanufaktur')) return 'Eismanufaktur';
        if (txt.includes('fleischerei')) return 'Fleischerei';
        if (txt.includes('plantage') && !txt.includes('obst')) return 'Plantage';
        if (txt.includes('obstplantage')) return 'Obstplantage';
        if (txt.includes('viehzucht')) return 'Viehzucht';
        if (txt.includes('kraftwerk')) return 'Kraftwerk';
        if (txt.includes('quelle')) return 'Quelle';
        if (txt.includes('bergwerk')) return 'Bergwerk';
        if (txt.includes('schreinerei')) return 'Schreinerei';
        if (txt === 'fabrik' || (txt.includes('fabrik') && !txt.match(/auto|textil|chemie|getränke|schmuck|spielzeug|lebensmittel|elektro|eis|fleisch/))) return 'Fabrik';
        return 'Unbekannt';
    }

    function findeProduktdaten() {
        const result = {};

        const produktionstabelle = [...document.querySelectorAll('table')]
            .find(t => t.innerText.includes("Produktionszeit") && t.innerText.includes("Pro Std"));

        if (!produktionstabelle) return result;

        const bolds = [...produktionstabelle.querySelectorAll('b')];
        for (const b of bolds) {
            const name = b.textContent.trim();
            if (!name || blacklist.some(w => name.toLowerCase().includes(w))) continue;

            const container = b.closest('td') || b.parentElement;
            if (!container) continue;

            const text = container.innerText;
            const match = text.match(/Pro Std\.?\s*([0-9.,]+)/);
            if (!match) continue;

            const rate = parseFloat(match[1].replace(',', '.'));
            if (!isNaN(rate)) {
                result[name] = rate;
            }
        }

        const spezial = produktionstabelle.innerText.match(/Pro Std\.?\s*([0-9.,]+)/);
        if (spezial) {
            const nameCell = produktionstabelle.querySelector('td');
            const produktname = nameCell?.innerText?.trim();
            const rate = parseFloat(spezial[1].replace(',', '.'));
            if (produktname && !isNaN(rate)) {
                result[produktname] = rate;
            }
        }

        return result;
    }

    function zeigeVorschauUndSpeichere() {
        const typ = findeGebaeudeTyp();
        const groesse = findeGebaeudeGroesse();
        const daten = findeProduktdaten();

        if (!typ || typ === 'Unbekannt' || !groesse || Object.keys(daten).length === 0) {
            alert("❌ Keine gültigen Daten gefunden.");
            return;
        }

        const key = `kapilands_profil_${typ.toLowerCase()}-${groesse.replace(/\s*m²/, '')}`;
        const text = Object.entries(daten)
            .map(([name, val]) => `📦 ${name} → ${val.toLocaleString('de-DE')} / Std.`)
            .join('\n');

        const msg = `✅ Gefundene Daten für:\n\n🏭 ${typ} – ${groesse}\n\n${text}\n\nSpeichern?`;
        if (!confirm(msg)) return;

        const profil = {
            gebaeudeGroesse: groesse,
            gebaeudeTyp: typ,
            produktionProStunde: daten,
            timestamp: new Date().toISOString()
        };

        const keyTyp = `kapilands_produktionsdaten_${typ.toLowerCase()}`;
        localStorage.setItem(key, JSON.stringify(profil));
        localStorage.setItem(keyTyp, JSON.stringify(profil));
        alert(`✅ Gespeichert unter: ${key}`);
    }

    // Nur auf Produktionsseiten und wenn Titel vorhanden
    const gebaeudeTitel = [...document.querySelectorAll('td.white2 b')]
        .find(b => /^[A-Za-zäöüÄÖÜß\s]+ [A-Za-zäöüÄÖÜß]+:\d+$/.test(b.innerText));

    if (gebaeudeTitel) {
        const btn = document.createElement('button');
        btn.textContent = 'Produktionsdaten speichern';

        // Stil im Kapiland-Look
        btn.style.marginLeft = '8px';
        btn.style.padding = '2px 10px';
        btn.style.fontSize = '11px';
        btn.style.fontFamily = 'Verdana, sans-serif';
        btn.style.color = '#000';
        btn.style.backgroundColor = '#d7d7d7';
        btn.style.border = '1px solid #888';
        btn.style.borderRadius = '2px';
        btn.style.boxShadow = '1px 1px 2px #aaa';
        btn.style.cursor = 'pointer';

        // Hover-Effekt
        btn.onmouseenter = () => btn.style.backgroundColor = '#c0c0c0';
        btn.onmouseleave = () => btn.style.backgroundColor = '#d7d7d7';

        btn.onclick = zeigeVorschauUndSpeichere;
        gebaeudeTitel.parentElement.appendChild(btn);
    }
})();
