// ==UserScript==
// @name         Kapiland Markt: Automatischer Klick auf Preis-Sortierung
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Klickt automatisch auf den "Preis"-Link im Marktplatz zur Sortierung nach Preis
// @match        http://s1.kapilands.eu/main.php?page=markt*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    window.addEventListener('load', function () {
        const links = document.querySelectorAll('a');
        for (const link of links) {
            if (link.textContent.trim() === 'Preis') {
                link.click();
                break;
            }
        }
    });
})();
