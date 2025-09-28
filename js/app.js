let pyodide = null;
let pythonChartScript = '';
let currentScreenedList = [];
let currentSort = { key: 'ticker', direction: 'asc' };

const runButton = document.getElementById('run-screener');
const runButtonText = document.getElementById('run-screener-text');
const exportButton = document.getElementById('export-csv');
const loader = document.getElementById('loader');
const initialMessage = document.getElementById('initial-message');
const resultsOutput = document.getElementById('results-output');
const resultsSummary = document.getElementById('results-summary');
const resultsTableBody = document.getElementById('results-table-body');
const sortableHeaders = document.querySelectorAll('.sortable-header');
const sectorSelectBox = document.getElementById('sector-select-box');
const sectorSelectText = document.getElementById('sector-select-text');
const sectorCheckboxesContainer = document.getElementById('sector-checkboxes');
const chartContainer = document.getElementById('chart-container');
const chartMetricSelect = document.getElementById('chart-metric');
const pythonChartContainer = document.getElementById('python-chart-container');

async function generatePythonChart() {
    if (!pyodide || currentScreenedList.length === 0 || !pythonChartScript) {
        chartContainer.classList.add('hidden');
        return;
    }

    chartContainer.classList.remove('hidden');
    pythonChartContainer.innerHTML = `<div class="loader ease-linear rounded-full border-4 border-t-4 border-gray-600 h-12 w-12"></div>`;

    const metric = chartMetricSelect.value;
    const selectedSectors = Array.from(document.querySelectorAll('.sector-checkbox:checked')).map(cb => cb.value);

    pyodide.globals.set("screened_data_json", JSON.stringify(currentScreenedList));
    pyodide.globals.set("full_data_json", JSON.stringify(FTSE250_DATA));
    pyodide.globals.set("metric", metric);
    pyodide.globals.set("selected_sectors", selectedSectors);

    try {

        let base64Image = await pyodide.runPythonAsync(pythonChartScript);
        pythonChartContainer.innerHTML = `<img src="data:image/png;base64,${base64Image}" class="w-full h-full object-contain" alt="Matplotlib chart" />`;
    } catch (error) {
        console.error("Python chart generation failed:", error);
        pythonChartContainer.innerHTML = `<p class="text-red-400">Error generating chart.</p>`;
    }
}


function updateSectorSelectBoxText() {
    const selectedSectors = Array.from(document.querySelectorAll('.sector-checkbox:checked')).map(cb => cb.value);
    if (selectedSectors.length === 0) {
        sectorSelectText.textContent = 'Select sectors...';
    } else if (selectedSectors.length <= 2) {
        sectorSelectText.textContent = selectedSectors.join(', ');
    } else {
        sectorSelectText.textContent = `${selectedSectors.length} sectors selected`;
    }
}

function setupSectorFilter() {
    const sectors = [...new Set(FTSE250_DATA.map(stock => stock.sector))].sort();
    sectors.forEach(sector => {
        const label = document.createElement('label');
        label.innerHTML = `<input type="checkbox" class="sector-checkbox" value="${sector}" /> ${sector}`;
        sectorCheckboxesContainer.appendChild(label);
    });
}

function updateSortIcons() {
    sortableHeaders.forEach(header => {
        const iconContainer = header.querySelector('span:last-child');
        const key = header.getAttribute('data-sort-key');
        if (key === currentSort.key) {
            iconContainer.innerHTML = currentSort.direction === 'asc' ? '▲' : '▼';
        } else {
            iconContainer.innerHTML = '';
        }
    });
}

function sortAndDisplayResults() {
    const key = currentSort.key;
    const direction = currentSort.direction;
    const sortedList = [...currentScreenedList].sort((a, b) => {
        if (typeof a[key] === 'string') {
            return direction === 'asc' ? a[key].localeCompare(b[key]) : b[key].localeCompare(a[key]);
        } else {
            return direction === 'asc' ? a[key] - b[key] : b[key] - a[key];
        }
    });
    displayResults(sortedList);
    updateSortIcons();
    generatePythonChart();
}

function displayResults(stockList) {
    resultsSummary.textContent = stockList.length > 0 
        ? `Found ${stockList.length} stocks that meet your criteria:`
        : "No stocks from the full FTSE 250 list currently meet the specified criteria.";
    
    const tableRowsHTML = stockList.map(stock => `
        <tr class="table-row-hover">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">${stock.ticker}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300">${stock.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right">${Number(stock.pe).toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right">${Number(stock.pb).toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right">${Number(stock.de).toFixed(2)}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-300 text-right">${Number(stock.roe).toFixed(2)}</td>
        </tr>
    `).join('');
    
    resultsTableBody.innerHTML = tableRowsHTML;
}

function exportToCsv() {
    if (currentScreenedList.length === 0) return;
    const headers = ['Ticker', 'Company Name', 'P/E Ratio', 'P/B Ratio', 'Debt/Equity (%)', 'ROE (%)', 'Sector'];
    const csvRows = [headers.join(',')];
    currentScreenedList.forEach(stock => {
        const row = [stock.ticker, `"${stock.name}"`, stock.pe.toFixed(2), stock.pb.toFixed(2), stock.de.toFixed(2), stock.roe.toFixed(2), stock.sector];
        csvRows.push(row.join(','));
    });
    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'ftse250_screener_results.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function runScreener() {
    loader.classList.remove('hidden');
    initialMessage.classList.add('hidden');
    resultsOutput.classList.add('hidden');
    exportButton.classList.add('hidden');
    chartContainer.classList.add('hidden');

    const maxPe = parseFloat(document.getElementById('pe-ratio').value);
    const maxPb = parseFloat(document.getElementById('pb-ratio').value);
    const maxDe = parseFloat(document.getElementById('de-ratio').value);
    const minRoe = parseFloat(document.getElementById('roe').value);
    const selectedSectors = Array.from(document.querySelectorAll('.sector-checkbox:checked')).map(cb => cb.value);

    setTimeout(() => {
        currentScreenedList = FTSE250_DATA.filter(stock => {
            const sectorMatch = selectedSectors.length === 0 || selectedSectors.includes(stock.sector);
            return stock.pe < maxPe && stock.pb < maxPb && stock.de < maxDe && stock.roe > minRoe && sectorMatch;
        });
        
        currentSort = { key: 'ticker', direction: 'asc' };
        sortAndDisplayResults();
        
        loader.classList.add('hidden');
        resultsOutput.classList.remove('hidden');
        
        if (currentScreenedList.length > 0) {
            exportButton.classList.remove('hidden');
        }
    }, 500);
}

function handleSortClick(event) {
    const newKey = event.currentTarget.getAttribute('data-sort-key');
    if (currentSort.key === newKey) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.key = newKey;
        currentSort.direction = 'asc';
    }
    sortAndDisplayResults();
}


async function main() {
    try {

        const response = await fetch('python/chart.py');
        pythonChartScript = await response.text();


        pyodide = await loadPyodide();
        await pyodide.loadPackage(["pandas", "matplotlib"]);

        runButtonText.textContent = 'Run Screener';
        runButton.disabled = false;
        console.log("Pyodide and packages loaded.");
    } catch (error) {
        console.error("Initialization failed:", error);
        runButtonText.textContent = 'Initialization Failed';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    main(); 
    setupSectorFilter();

    runButton.addEventListener('click', runScreener);
    exportButton.addEventListener('click', exportToCsv);
    chartMetricSelect.addEventListener('change', generatePythonChart);
    
    sortableHeaders.forEach(header => header.addEventListener('click', handleSortClick));

    sectorSelectBox.addEventListener('click', () => sectorCheckboxesContainer.classList.toggle('hidden'));
    
    sectorCheckboxesContainer.addEventListener('change', updateSectorSelectBoxText);

    document.addEventListener('click', (event) => {
        if (!sectorSelectBox.contains(event.target) && !sectorCheckboxesContainer.contains(event.target)) {
            sectorCheckboxesContainer.classList.add('hidden');
        }
    });
});

