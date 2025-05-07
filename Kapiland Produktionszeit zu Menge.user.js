// ==UserScript==
// @name         Kapiland Produktionszeit zu Menge
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Berechne Produktionsmenge aus Zeitangabe in HH:MM
// @match        http://s1.kapilands.eu/main.php?page=roh&art=*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Hilfsfunktion zur Umwandlung HH:MM in Stunden
    function parseTimeToHours(timeStr) {
        const [hh, mm] = timeStr.split(':').map(part => parseInt(part, 10));
        if (isNaN(hh) || isNaN(mm)) return 0;
        return hh + mm / 60;
    }

    // Durchlaufe alle Auftragsreihen
    const productRows = document.querySelectorAll("form table tr");
    productRows.forEach(row => {
        const label = row.querySelector("td.white2, td.white");
        const input = row.querySelector("input[name='a_bestellen[]']");
        if (!label || !input) return;

        // Finde die Produktionsrate pro Stunde aus dem Text
        const match = label.innerText.match(/Pro Std\. ([\d.,]+)/);
        if (!match) return;
        const ratePerHour = parseFloat(match[1].replace(',', '.'));

        // Erstelle HH:MM Eingabefeld
        const timeInput = document.createElement("input");
        timeInput.type = "text";
        timeInput.size = 5;
        timeInput.placeholder = "HH:MM";
        timeInput.style.marginLeft = "5px";

        // Wenn Eingabe erfolgt, berechne Stückzahl
        timeInput.addEventListener("input", () => {
            const hours = parseTimeToHours(timeInput.value.trim());
            if (!isNaN(hours) && ratePerHour > 0) {
                const total = Math.floor(ratePerHour * hours);
                input.value = total;
            }
        });

        // Füge das Zeitfeld in dieselbe Zelle wie das Stückzahlfeld ein
        input.parentElement.appendChild(timeInput);
    });
})();
