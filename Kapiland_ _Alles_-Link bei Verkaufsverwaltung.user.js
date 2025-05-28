// ==UserScript==
// @name         Kapiland: "Alles"-Link bei Verkaufsverwaltung
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Fügt einen "Alles"-Link unter jedem Eingabefeld ein, um die gesamte verfügbare Menge automatisch einzutragen
// @author       ChatGPT
// @match        http*://*.kapilands.eu/main.php?page=verw_k*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Alle Reihen mit "Anzahl"-Felder (Input-Felder)
    const inputFields = document.querySelectorAll("input[name='p_anz[]']");
    const tdElements = Array.from(document.querySelectorAll("td.white2"));

    let productRows = [];

    // Finde alle Zeilen mit Produkthinweis (z.B. "4565127 Benzin")
    tdElements.forEach((td, index) => {
        const match = td.textContent.match(/^(\d[\d\.]*)\s+.+/); // z. B. "4565127 Benzin"
        if (match) {
            const stock = parseInt(match[1].replace(/\./g, '')); // Entfernt Tausenderpunkte
            productRows.push({ index, stock });
        }
    });

    inputFields.forEach((input, i) => {
        // Hole passende Produktmenge aus productRows
        const product = productRows[i];
        if (!product) return;

        const link = document.createElement("a");
        link.href = "#";
        link.textContent = "Alles";
        link.style.display = "block";
        link.style.fontSize = "10px";
        link.style.marginTop = "2px";

        link.addEventListener("click", (e) => {
            e.preventDefault();
            input.value = product.stock;
        });

        // Link einfügen
        input.parentElement.appendChild(link);
    });

})();
