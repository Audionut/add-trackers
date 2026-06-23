// ==UserScript==
// @name         PTP request TiB vote helper
// @namespace    https://github.com/Audionut/add-trackers
// @version      1.0.0
// @description  Add TiB input for request custom votes
// @author       Audionut
// @match        https://passthepopcorn.me/requests.php?action=view&id=*
// @icon         https://passthepopcorn.me/favicon.ico
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const TIB_TO_GIB = 1024;

    const updateVote = (tibValue) => {
        const amountBox = document.getElementById('amount_box');
        const unitSelect = document.getElementById('unit');
        if (!amountBox || !unitSelect) {
            return;
        }

        if (!Number.isInteger(tibValue) || tibValue <= 0) {
            amountBox.value = '';
            return;
        }

        unitSelect.value = 'gb';
        amountBox.value = String(tibValue * TIB_TO_GIB);
        if (typeof window.Calculate === 'function') {
            window.Calculate();
        }
    };

    const insertTibInputRow = () => {
        const votingRow = document.getElementById('voting');
        if (!votingRow || !votingRow.parentNode) {
            return;
        }

        const tibRow = document.createElement('tr');
        tibRow.id = 'tib-vote';

        const labelCell = document.createElement('td');
        labelCell.className = 'label nobr';
        labelCell.textContent = 'Custom vote (TiB)';

        const inputCell = document.createElement('td');
        const tibInput = document.createElement('input');
        tibInput.type = 'number';
        tibInput.min = '1';
        tibInput.step = '1';
        tibInput.placeholder = 'TiB';
        tibInput.title = 'Enter an integer number of TiB';

        tibInput.addEventListener('input', () => {
            const tibValue = Number.parseInt(tibInput.value, 10);
            updateVote(tibValue);
        });

        inputCell.appendChild(tibInput);
        tibRow.appendChild(labelCell);
        tibRow.appendChild(inputCell);

        votingRow.parentNode.insertBefore(tibRow, votingRow.nextSibling);
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', insertTibInputRow);
    } else {
        insertTibInputRow();
    }
})();
