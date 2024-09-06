document.getElementById('jsonForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const files = document.getElementById('fileInput').files;
    const objectPaths = document.getElementById('objectPaths').value.split('\n').map(path => path.trim());

    if (files.length === 0 || objectPaths.length === 0) {
        alert('Please select files and provide object paths.');
        return;
    }

    const results = [];
    const promises = [];
    const parsedPaths = objectPaths.map(path => {
        const [alias, expression] = path.includes('=') ? path.split('=') : [path, path];
        return { alias: alias.trim(), expression: expression.trim() };
    });

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        const promise = new Promise((resolve, reject) => {
            reader.onload = function(event) {
                try {
                    const json = JSON.parse(event.target.result);

                    if (Array.isArray(json)) {
                        // Handle if JSON is an array
                        json.forEach((item, index) => {
                            const values = parsedPaths.map(({ expression }) => evaluateExpression(item, expression));
                            results.push({ file: `${file.name} [Item ${index + 1}]`, values: values });
                        });
                    } else {
                        // Handle if JSON is a single object
                        const values = parsedPaths.map(({ expression }) => evaluateExpression(json, expression));
                        results.push({ file: file.name, values: values });
                    }

                    resolve();
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = function() {
                reject(reader.error);
            };
        });

        reader.readAsText(file);
        promises.push(promise);
    }

    Promise.all(promises).then(() => {
        displayResults(parsedPaths, results);
    }).catch(error => {
        console.error('Error processing files:', error);
        alert('An error occurred while processing the files.');
    });
});

function getObjectValue(obj, path) {
    return path.split('.').reduce((o, p) => (o ? o[p] : undefined), obj);
}

function evaluateExpression(obj, expression) {
    try {
        // Replace object paths with their values in the expression
        const sanitizedExpression = expression.replace(/([a-zA-Z_][a-zA-Z0-9._]*)/g, match => {
            const value = getObjectValue(obj, match);
            return typeof value === 'string' ? `"${value}"` : value;
        });

        // Evaluate the sanitized expression
        const result = eval(sanitizedExpression);
        
        // Return the value directly if it's a string or another valid type
        return typeof result === 'string' ? result : String(result);
    } catch (error) {
        console.error('Error evaluating expression:', expression, error);
        return 'N/A';
    }
}


function displayResults(parsedPaths, results) {
    const table = document.getElementById('resultTable');
    const thead = table.getElementsByTagName('thead')[0];
    const tbody = table.getElementsByTagName('tbody')[0];
    
    // Clear previous table content
    thead.innerHTML = '';
    tbody.innerHTML = '';

    // Create header row
    const headerRow = document.createElement('tr');
    
    const fileHeader = document.createElement('th');
    fileHeader.textContent = 'File';
    headerRow.appendChild(fileHeader);

    parsedPaths.forEach(({ alias }) => {
        const headerCell = document.createElement('th');
        headerCell.textContent = alias;
        headerRow.appendChild(headerCell);
    });

    thead.appendChild(headerRow);

    // Create rows for each file's values
    results.forEach(result => {
        const row = document.createElement('tr');

        const fileNameCell = document.createElement('td');
        fileNameCell.textContent = result.file;
        row.appendChild(fileNameCell);

        result.values.forEach(value => {
            const valueCell = document.createElement('td');
            valueCell.textContent = value !== undefined ? value : 'N/A';
            row.appendChild(valueCell);
        });

        tbody.appendChild(row);
    });
}
