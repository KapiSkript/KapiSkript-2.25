// ==UserScript==
// @name         Kapiland Marktplatz Firmen-Blocker
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Blockiere Firmen im Marktplatz (UI neben Überschrift platzieren, kompakte Buttons)
// @match        http://*.kapilands.eu/main.php?page=markt*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY = 'kapiland_blocked_firms';

    const getBlockedFirms = () => JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    const saveBlockedFirms = (firms) => localStorage.setItem(STORAGE_KEY, JSON.stringify(firms));
    const addFirmToBlocked = (firm) => {
        const firms = getBlockedFirms();
        if (!firms.includes(firm)) {
            firms.push(firm);
            saveBlockedFirms(firms);
        }
    };
    const removeFirmsFromBlocked = (toRemove) => {
        const updated = getBlockedFirms().filter(f => !toRemove.includes(f));
        saveBlockedFirms(updated);
    };

    const filterMarketTables = () => {
        const blocked = getBlockedFirms();
        const tables = document.querySelectorAll('table');
        for (const table of tables) {
            const rows = Array.from(table.querySelectorAll('tr'));
            if (rows.length < 2) continue;

            const headerCells = Array.from(rows[0].querySelectorAll('th,td'));
            const firmColIndex = headerCells.findIndex(cell => cell.textContent.toLowerCase().includes('firma'));
            if (firmColIndex === -1) continue;

            for (let i = 1; i < rows.length; i++) {
                const cells = rows[i].querySelectorAll('td');
                if (!cells[firmColIndex]) continue;
                const firm = cells[firmColIndex].textContent.trim();
                if (blocked.includes(firm)) rows[i].remove();
            }
        }
    };

    const showBlockedPopup = () => {
        const blocked = getBlockedFirms();
        const popup = document.createElement('div');
        Object.assign(popup.style, {
            position: 'fixed',
            top: '100px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#fff6cc',
            border: '2px solid #663300',
            padding: '10px',
            zIndex: 9999,
            fontSize: '12px'
        });

        popup.innerHTML = `<b>Blockierte Firmen:</b><br>`;
        const form = document.createElement('form');
        blocked.forEach(firm => {
            const label = document.createElement('label');
            label.style.display = 'block';
            const cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.value = firm;
            label.appendChild(cb);
            label.append(` ${firm}`);
            form.appendChild(label);
        });

        const entblockBtn = document.createElement('button');
        entblockBtn.type = 'button';
        entblockBtn.textContent = 'Ausgewählte entblocken';
        entblockBtn.style.cssText = buttonStyle;
        entblockBtn.onclick = () => {
            const toRemove = Array.from(form.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
            removeFirmsFromBlocked(toRemove);
            popup.remove();
            location.reload();
        };

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = 'Schließen';
        closeBtn.style.cssText = buttonStyle;
        closeBtn.onclick = () => popup.remove();

        popup.appendChild(form);
        popup.appendChild(entblockBtn);
        popup.appendChild(closeBtn);
        document.body.appendChild(popup);
    };

    const buttonStyle = `
        background-color: #FFCC33;
        color: #663300;
        border: 1px solid #663300;
        border-radius: 3px;
        padding: 1px 4px;
        font-weight: bold;
        font-size: 11px;
        margin-left: 4px;
        cursor: pointer;
    `;

    const createUI = () => {
        const headerCell = Array.from(document.querySelectorAll('td.white2')).find(td =>
            td.textContent.includes('Marktplatz')
        );
        if (!headerCell) return;

        const container = document.createElement('span');
        container.style.cssText = 'float: right; margin-left: 10px; white-space: nowrap;';

        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Firma im Markt blockieren';
        input.style.width = '160px';
        input.style.marginRight = '6px';
        input.style.fontSize = '11px';

        const blockBtn = document.createElement('button');
        blockBtn.textContent = 'Blockieren';
        blockBtn.style.cssText = buttonStyle;
        blockBtn.onclick = () => {
            if (input.value.trim()) {
                addFirmToBlocked(input.value.trim());
                location.reload();
            }
        };

        const viewBtn = document.createElement('button');
        viewBtn.textContent = 'Blockierte Firmen';
        viewBtn.style.cssText = buttonStyle;
        viewBtn.onclick = showBlockedPopup;

        container.appendChild(input);
        container.appendChild(blockBtn);
        container.appendChild(viewBtn);
        headerCell.appendChild(container);
    };

    createUI();
    filterMarketTables();
})();
