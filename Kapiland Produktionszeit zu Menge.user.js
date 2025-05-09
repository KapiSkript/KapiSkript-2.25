// ==UserScript==
// @name         Kapiland Produktionszeit zu Menge
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Berechne Produktionsmenge aus Zeitangabe in HH:MM
// @match        http://*.kapilands.eu/main.php?page=roh&art=*
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

        // Erstelle ein Container-Element für Zeitfeld und Slider
        const container = document.createElement("div");
        container.style.display = "flex";
        container.style.flexDirection = "column";
        container.style.alignItems = "flex-start";
        container.style.gap = "4px";
        container.style.marginTop = "4px";

        // Zeitfeld hinzufügen
        container.appendChild(timeInput);

        // Erstelle Slider + Label
        const sliderContainer = document.createElement("div");
        sliderContainer.style.display = "flex";
        sliderContainer.style.alignItems = "center";
        sliderContainer.style.gap = "4px";

        const slider = document.createElement("input");
        slider.type = "range";
        slider.style.width = "120px";
        slider.style.height = "6px";
        slider.style.appearance = "none";
        slider.style.background = "#ccc";
        slider.style.borderRadius = "4px";
        slider.style.outline = "none";
        slider.style.padding = "0";
        slider.style.margin = "0";
        slider.style.cursor = "pointer";
        slider.min = "0";
        slider.max = "24";
        slider.step = "1";
        slider.value = "0";

        const sliderLabel = document.createElement("span");
        sliderLabel.textContent = "0h";
        sliderLabel.style.fontSize = "11px";
        sliderLabel.style.minWidth = "30px";

        slider.addEventListener("input", () => {
            const h = parseInt(slider.value);
            sliderLabel.textContent = h + "h";
            const total = Math.floor(ratePerHour * h);
            input.value = total;
            timeInput.value = h + ":00";
        });

        sliderContainer.appendChild(slider);
        sliderContainer.appendChild(sliderLabel);
        container.appendChild(sliderContainer);

        // Füge das komplette Element unter das Eingabefeld ein
        input.parentElement.appendChild(container);
        input.parentElement.appendChild(timeInput);
    });
})();
