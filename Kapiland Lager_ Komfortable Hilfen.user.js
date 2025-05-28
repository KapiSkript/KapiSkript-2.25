// ==UserScript==
// @name         Kapiland Lager: Komfortable Hilfen
// @namespace    http://tampermonkey.net/
// @version      1.6
// @description  Fügt "Alles"-Links und Berechnungen für Warenwert, Gewinn, Umsatz und ggf. Gebühren hinzu
// @match        http*://*.kapilands.eu/main.php?page=lager*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function formatCurrency(value) {
        return value.toLocaleString('de-DE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function parsePrice(text) {
        return parseFloat(text.replace(',', '.').replace('¢', '').trim());
    }

    const rows = document.querySelectorAll("input[name='p_anz[]']");
    let gesamtWarenwert = 0;

    rows.forEach((input) => {
        const row = input.closest("tr");
        const amountCell = row.cells[0];
        const priceCell = row.cells[3];
        const amount = parseInt(amountCell.innerText.replace(/\./g, ''), 10);
        const price = parsePrice(priceCell.innerText);
        gesamtWarenwert += amount * price;

        // Alles-Link
        const allesLink = document.createElement('a');
        allesLink.href = '#';
        allesLink.textContent = 'Alles';
        allesLink.style.marginLeft = '5px';
        allesLink.addEventListener('click', (e) => {
            e.preventDefault();
            input.value = (parseInt(input.value) === amount) ? 0 : amount;
            updateSummary();
        });
        input.parentElement.appendChild(allesLink);
    });

    // Zeile unterhalb der Tabelle für Warenwert
    const valueRow = document.createElement('div');
    valueRow.style.marginTop = '10px';
    valueRow.style.fontWeight = 'bold';
    valueRow.textContent = `Gesamtwarenwert auf dieser Seite: ${formatCurrency(gesamtWarenwert)} ¢`;

    const lagerTabelle = document.querySelector("form table");
    if (lagerTabelle && lagerTabelle.parentElement) {
        lagerTabelle.parentElement.appendChild(valueRow);
    }

    // Zusammenfassungen unterhalb der Preisfelder
    const wbetInput = document.querySelector("input[name='wbet']");
    const contractInput = document.querySelector("input[name='vbet']");

    const summaryBox = document.createElement('div');
    summaryBox.style.marginTop = '10px';
    summaryBox.style.fontWeight = 'bold';

    function updateSummary() {
        const sellPrice = parseFloat(wbetInput?.value.replace(',', '.') || '0');
        const contractPrice = parseFloat(contractInput?.value.replace(',', '.') || '0');

        let selectedTotal = 0;
        let selectedValue = 0;

        rows.forEach((input) => {
            const amount = parseInt(input.value.replace(/\./g, ''), 10) || 0;
            const row = input.closest("tr");
            const priceCell = row.cells[3];
            const buyPrice = parsePrice(priceCell.innerText);
            selectedTotal += amount;
            selectedValue += amount * buyPrice;
        });

        const isContractActive = document.activeElement === contractInput;
        const activePrice = isContractActive ? contractPrice : sellPrice;

        const umsatz = selectedTotal * activePrice;
        const gebuehr = isContractActive ? 0 : selectedValue * 0.10;
        const gewinn = umsatz - gebuehr;

        summaryBox.innerHTML = `
            Gewinn: <span id="gewinn">${formatCurrency(gewinn)}</span> ¢ |
            Umsatz: <span id="umsatz">${formatCurrency(umsatz)}</span> ¢${
            isContractActive
                ? ''
                : ` | Gebühren (10 %): <span id="gebuehren">${formatCurrency(gebuehr)}</span> ¢`
        }`;
    }

    // Listener
    wbetInput?.addEventListener('input', updateSummary);
    contractInput?.addEventListener('input', updateSummary);
    rows.forEach(input => input.addEventListener('input', updateSummary));

    // Anhängen unterhalb beider Boxen
    const sendButton = document.querySelector("input[type='submit'][value*='versenden']");
    if (sendButton && sendButton.parentElement) {
        sendButton.parentElement.appendChild(summaryBox);
    }
})();
