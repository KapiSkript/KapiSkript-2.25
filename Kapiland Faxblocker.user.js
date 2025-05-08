// ==UserScript==
// @name         Kapiland Faxblocker
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Blockiert Faxe bestimmter Firmen und zeigt ein Eingabefeld im linken Menü unterhalb der Spielstatistik an
// @author       Du
// @match        *://s1.kapilands.eu/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const blockedCompaniesKey = 'blockedCompaniesKapiland';

    // Eingabefeld nicht erneut einfügen
    if (document.getElementById('firmaBlockInput')) return;

    const spielerdatenZelle = Array.from(document.querySelectorAll('td.white'))
        .find(el => el.innerText.includes('Coins:'));

    if (spielerdatenZelle) {
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = 'Firma blockieren...';
        input.id = 'firmaBlockInput';
        input.style.marginTop = '10px';
        input.style.width = '130px';

        const button = document.createElement('button');
        button.textContent = 'Blockierte Firmen';
        button.style.marginLeft = '5px';

        // Einfügen ins Menü
        const wrapper = document.createElement('div');
        wrapper.style.marginTop = '10px';
        wrapper.appendChild(input);
        wrapper.appendChild(button);
        spielerdatenZelle.appendChild(wrapper);

        // Speichern blockierter Firmen
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const name = input.value.trim();
                if (name) {
                    let list = JSON.parse(localStorage.getItem(blockedCompaniesKey) || '[]');
                    if (!list.includes(name)) {
                        list.push(name);
                        localStorage.setItem(blockedCompaniesKey, JSON.stringify(list));
                        alert(`Firma "${name}" blockiert.`);
                        location.reload();
                    }
                    input.value = '';
                }
            }
        });

        // Liste anzeigen
        button.addEventListener('click', function() {
            const list = JSON.parse(localStorage.getItem(blockedCompaniesKey) || '[]');
            const toUnblock = prompt(`Blockierte Firmen:\n${list.join('\n')}\n\nName eingeben, um zu ENTblockieren:`);

            if (toUnblock && list.includes(toUnblock)) {
                const updated = list.filter(name => name !== toUnblock);
                localStorage.setItem(blockedCompaniesKey, JSON.stringify(updated));
                alert(`Firma "${toUnblock}" wurde freigegeben.`);
                location.reload();
            }
        });
    }

    // Faxe ausblenden
    const faxzeilen = Array.from(document.querySelectorAll('td.white, td.white2'));
    const blocked = JSON.parse(localStorage.getItem(blockedCompaniesKey) || '[]');

    faxzeilen.forEach(el => {
        const nameLink = el.querySelector('a[href*="ename="]');
        if (nameLink) {
            const name = nameLink.textContent.trim();
            if (blocked.includes(name)) {
                el.style.display = 'none';
            }
        }
    });
})();
