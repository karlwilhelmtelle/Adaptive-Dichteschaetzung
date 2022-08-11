function export_csv(arrayHeader, arrayData, delimiter, fileName) {
    let header = arrayHeader.join(delimiter) + '\n';
    let csv = header;
    arrayData.forEach( obj => {
        let row = [];
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                row.push(obj[key]);
            }
        }
        csv += row.join(delimiter)+"\n";
    });

    let csvData = new Blob([csv], { type: 'text/csv' });  
    let csvUrl = URL.createObjectURL(csvData);

    let hiddenElement = document.createElement('a');
    hiddenElement.href = csvUrl;
    hiddenElement.target = '_blank';
    hiddenElement.download = fileName + '.csv';
    hiddenElement.click();
}

var improvedCount = [];
var firstDataIndex = 4;

function csvLog(key, value) {
    if (key in csvDataObject) {
        csvDataObject[key].push(value);
    } else {
        csvDataObject[key] = [value];
    }
    csvHeader.push(key);
    csvDataPart.push(value);
}

function logCsvDataObject(csvDataObject) {
    for (var i = 0; i < csvHeader.length; i++) {
        var key = csvHeader[i];
        if (key in csvDataObject) {
            var values = csvDataObject[key];
            var arrow = "";
            if (i >= firstDataIndex && (typeof values[0]) == "number") {
                var quotient = values[1] / values[0];
                if (quotient >= 1.01) {
                    arrow = "↑"
                } else {
                    if (quotient <= 0.99) {
                        arrow = "↓";
                    } else {
                        arrow = "=";
                    }
                    if (typeof improvedCount[i] === 'undefined') {
                        improvedCount[i] = 0;
                    }
                    improvedCount[i]++;
                }
            }
            console.log(key, values[0], values[1], arrow);
        }
    }
    console.log("\n");
}

function logImprovedCount() {
    for (var i = firstDataIndex; i < csvHeader.length; i++) {
        var key = csvHeader[i];
        console.log(key + " improved", improvedCount[i] || 0, "times");
    }
}